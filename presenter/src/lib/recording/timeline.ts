import { isFreeLayout, slideKey, type BoxSize, type ExportSettings, type FreeRect, type RecordingManifest } from "./types";

/**
 * Tidslinjen som kapitel och bildlägen (2 oktober 2026). Delas av exporten (kapitlen i filmen och
 * kapitel.txt) och inspelningssidan (kapitellistan). Tider i sekunder i mediets tid.
 */

export interface Chapter {
  start: number;
  end: number;
  index: number;
  slideId?: string;
  title: string;
  /** Om någon del av kapitlet står i helbild (filmdeckens bildläge `full`). */
  full: boolean;
}

/**
 * Ett kapitel per slide: en ny slide börjar ett nytt kapitel. Namnet är titeln som spelaren loggade,
 * annars deckets eget namn för sliden (titles, slideId → namn), annars slidens nummer.
 */
export function chaptersOf(manifest: RecordingManifest, titles: Record<string, string> = {}): Chapter[] {
  const end = (manifest.durationMs ?? 0) / 1000;
  const out: Chapter[] = [];
  for (const event of manifest.timeline) {
    if (event.type !== "position" || event.index === undefined) continue;
    const last = out[out.length - 1];
    if (last && last.index === event.index) {
      if (event.layout === "full") last.full = true;
      continue;
    }
    const title = (event.title ?? "").replace(/\s+/g, " ").trim().slice(0, 90) || (event.slideId && titles[event.slideId]) || `Slide ${event.index + 1}`;
    out.push({ start: event.t / 1000, end, index: event.index, slideId: event.slideId, title, full: event.layout === "full" });
  }
  for (let i = 0; i < out.length - 1; i++) out[i].end = out[i + 1].start;
  return out.filter(chapter => chapter.end > chapter.start);
}

/** Där Joel står i filmen under ett tidsavsnitt: stor i ytan, liten i hörnet, i rutan eller inte alls. */
export interface PersonSegment {
  start: number;
  end: number;
  mode: "dold" | "horn" | "yta" | "ruta" | "fri";
  size: BoxSize;
  /** Den fria placeringen (läget fri). */
  rect?: FreeRect;
}

/**
 * Var Joel står, avsnitt för avsnitt, enligt filmens regel och undantagen per slide. Regeln: i
 * bildläget frilagd följer placeringen decket (talare → stor i ytan, horn → liten i hörnet, full →
 * dold) eller håller honom i hörnet utom vid helbild; i bildläget ruta syns rutan. Ett undantag
 * för en slide gäller alla dess klicksteg. En fri placering gäller bara bildläget den gjordes för;
 * i ett annat bildläge följer sliden filmens regel.
 */
export function personSegments(manifest: RecordingManifest, settings: Pick<ExportSettings, "layout" | "placement" | "size" | "perSlide">): PersonSegment[] {
  const end = (manifest.durationMs ?? 0) / 1000;
  const positions = manifest.timeline.filter(event => event.type === "position");
  const out: PersonSegment[] = [];
  positions.forEach((event, i) => {
    const start = i === 0 ? 0 : event.t / 1000;
    const stop = i + 1 < positions.length ? positions[i + 1].t / 1000 : end;
    if (stop - start <= 0) return;
    const choice = settings.perSlide?.[slideKey(event)];
    const size = choice?.size ?? settings.size;
    let mode: PersonSegment["mode"];
    const rect = choice?.mode === "fri" && isFreeLayout(settings.layout) ? choice.rects?.[settings.layout] : undefined;
    if (rect) mode = "fri";
    else if (settings.layout === "ruta") mode = choice?.mode === "dold" ? "dold" : "ruta";
    else if (choice?.mode === "dold" || choice?.mode === "horn" || choice?.mode === "yta") mode = choice.mode;
    else if (event.layout === "full") mode = "dold";
    else mode = settings.placement === "corner" || event.layout === "horn" ? "horn" : "yta";
    const last = out[out.length - 1];
    const sameRect = (a?: FreeRect, b?: FreeRect) => (!a && !b) || Boolean(a && b && a.x === b.x && a.y === b.y && a.w === b.w);
    if (last && last.mode === mode && last.size === size && sameRect(last.rect, rect) && Math.abs(last.end - start) < 0.001) last.end = stop;
    else out.push({ start, end: stop, mode, size, ...(rect ? { rect } : {}) });
  });
  return out.filter(segment => segment.end - segment.start > 0.05);
}

/** 0:07, 12:34 eller 1:02:03. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, rest = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(rest).padStart(2, "0")}`;
}
