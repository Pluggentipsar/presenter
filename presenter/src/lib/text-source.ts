/**
 * Varifrån kommer en text på sliden?
 *
 * Joel (23 september 2026): i R-läget gick vissa texter att ändra direkt i
 * sliden, andra bara i fältpanelen — standard borde vara i själva sliden. Knappt
 * var femte slide hade ingen text som gick att klicka på, och på de vanligaste
 * mallarna (HookStatement, RevealList, StatsTriptych, ChatPreview …) stod
 * huvudtexten mellan taggarna utan handtag.
 *
 * I stället för att bygga handtag i hundratals mallar letar editorn upp texten
 * i slidens källa: en prop, en post i en lista-prop, eller en rad eller en del
 * av en rad mellan taggarna. Det man klickar på blir det man redigerar.
 *
 * Jämförelsen är förlåtande på det mallarna brukar göra med texten: markdown-
 * tecken (`**fet**`) syns inte på sliden, versaler kan vara CSS eller kod,
 * ord kan vara uppdelade i egna element utan mellanslag (ord-för-ord-animation).
 *
 * Ren TypeScript: används av slide-editorn.
 */

import type { ParsedComponent, PropValue } from "./mdx-parser";
import { parsePropPath, removeAtPath, setAtPath } from "./prop-path.ts";

export interface TextHit {
  kind: "prop" | "content";
  /** Propens namn eller sökväg (`title`, `tiers[0].name`). Bara för kind "prop". */
  path?: string;
  /** Tecken [start, end) i slidens innehåll. Bara för kind "content". */
  start?: number;
  end?: number;
  /** Källtexten som ska redigeras — som den står i filen, med markdown. */
  raw: string;
  /** Kort beskrivning av var texten står, för redigeringsrutan. */
  label: string;
  /**
   * Vad träffen omfattar: en prop, allt innehåll, en rad, en del av en rad
   * ("värde · etikett"), en punkt i en del ("a; b; c") eller en bit text.
   */
  scope: TextScope;
  /** Hur säker träffen är: 3 = hela texten, 2 = hela texten utan mellanslag, 1 = en bit av en längre text. */
  quality: 1 | 2 | 3;
}

export type TextScope = "prop" | "all" | "line" | "field" | "item" | "part";

/** Egenskaper som aldrig är synlig text på sliden. */
const NOT_TEXT = new Set(["slideId", "akt", "syfte", "tid", "claude", "mall", "cutSkip", "stegAv", "hoppaSteg"]);

/* ── Normalisering ──────────────────────────────────────────────────────── */

const MARKERS = new Set(["*", "_", "`", "~"]);

interface Normalized {
  /** Den normaliserade texten: gemener, utan markdown-tecken, enkla mellanslag. */
  text: string;
  /** För varje tecken i `text`: dess position i originalet. */
  map: number[];
}

/**
 * Gemener, markdown-tecken bort, alla blanksteg till ett mellanslag, trimmat.
 * `map` pekar tillbaka in i originalet, så att en träff går att översätta
 * till en bit av källtexten.
 */
export function normalizeWithMap(raw: string): Normalized {
  let text = "";
  const map: number[] = [];
  let pendingSpace = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (MARKERS.has(ch)) continue;
    if (/\s/.test(ch) || ch === " ") {
      if (text.length > 0 && pendingSpace < 0) pendingSpace = i;
      continue;
    }
    if (pendingSpace >= 0) {
      text += " ";
      map.push(pendingSpace);
      pendingSpace = -1;
    }
    const lower = ch.toLocaleLowerCase("sv");
    for (const part of lower) {
      text += part;
      map.push(i);
    }
  }
  return { text, map };
}

export function normalizeText(raw: string): string {
  return normalizeWithMap(raw).text;
}

/** Utan några mellanslag alls — för mallar som delar upp orden i egna element. */
export function compactText(raw: string): string {
  return normalizeText(raw).replace(/ /g, "");
}

/* ── Källorna i en slide ────────────────────────────────────────────────── */

interface Candidate {
  kind: "prop" | "content";
  path?: string;
  start?: number;
  end?: number;
  raw: string;
  label: string;
  scope: TextScope;
}

function propCandidates(props: Record<string, PropValue>): Candidate[] {
  const out: Candidate[] = [];
  const walk = (value: unknown, path: string, depth: number) => {
    if (typeof value === "string") {
      if (value.trim()) out.push({ kind: "prop", path, raw: value, label: path, scope: "prop" });
      return;
    }
    if (depth >= 4 || value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`, depth + 1));
      return;
    }
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (/^[A-Za-z0-9_$-]+$/.test(key)) walk(inner, `${path}.${key}`, depth + 1);
    }
  };
  for (const [name, value] of Object.entries(props)) {
    if (NOT_TEXT.has(name)) continue;
    // Sträng-props som ser ut som en lista i JS-form ("[{…}]") är inte text.
    if (typeof value === "string" && /^\s*[[{`]/.test(value) && /[\]}`]\s*$/.test(value)) continue;
    walk(value, name, 0);
  }
  return out;
}

const LIST_MARKER = /^(\s*(?:[-*+]|\d+[.)]|#{1,6})\s+|\s*>\s?)/;
const FIELD_SEPARATOR = /\s+·\s+|\s+\|\s+/g;

function contentCandidates(content: string): Candidate[] {
  const out: Candidate[] = [];
  if (!content.trim()) return out;
  const firstChar = content.search(/\S/);
  const lastChar = content.search(/\s*$/);
  out.push({ kind: "content", start: firstChar, end: lastChar, raw: content.slice(firstChar, lastChar), label: "Texten", scope: "all" });

  let offset = 0;
  let lineNumber = 0;
  for (const line of content.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    const body = line.replace(/\r$/, "");
    if (!body.trim()) continue;
    lineNumber++;
    const marker = LIST_MARKER.exec(body);
    const bodyStart = lineStart + (marker ? marker[0].length : body.search(/\S/));
    const bodyEnd = lineStart + body.replace(/\s+$/, "").length;
    if (bodyEnd <= bodyStart) continue;
    const bodyText = content.slice(bodyStart, bodyEnd);
    out.push({ kind: "content", start: bodyStart, end: bodyEnd, raw: bodyText, label: `Rad ${lineNumber}`, scope: "line" });

    // Delar av raden: "värde · etikett · förklaring".
    FIELD_SEPARATOR.lastIndex = 0;
    const parts: Array<{ start: number; end: number }> = [];
    let cursor = 0;
    for (let m = FIELD_SEPARATOR.exec(bodyText); m; m = FIELD_SEPARATOR.exec(bodyText)) {
      parts.push({ start: cursor, end: m.index });
      cursor = m.index + m[0].length;
    }
    if (parts.length > 0) {
      parts.push({ start: cursor, end: bodyText.length });
      parts.forEach((part, i) => {
        const raw = bodyText.slice(part.start, part.end);
        if (!raw.trim()) return;
        const start = bodyStart + part.start;
        out.push({ kind: "content", start, end: bodyStart + part.end, raw, label: `Rad ${lineNumber} · del ${i + 1}`, scope: "field" });
        // Punkter inom en del: "Inloggad med jobbkonto; Avtal med Microsoft; …".
        const items = raw.split(/;\s+/);
        if (items.length < 2) return;
        let at = 0;
        items.forEach((item, j) => {
          const offset = raw.indexOf(item, at);
          at = offset + item.length;
          if (!item.trim()) return;
          out.push({ kind: "content", start: start + offset, end: start + offset + item.length, raw: item, label: `Rad ${lineNumber} · del ${i + 1} · punkt ${j + 1}`, scope: "item" });
        });
      });
    }
  }
  return out;
}

/* ── Sökningen ──────────────────────────────────────────────────────────── */

type SourceSlide = Pick<ParsedComponent, "props" | "content">;

/**
 * Alla ställen i sliden där den visade texten står, bästa träffen först.
 * Tom lista: texten hör till mallen (en fast etikett, en räknare …).
 */
export function findTextSources(slide: SourceSlide, rendered: string): TextHit[] {
  const wanted = normalizeText(rendered);
  if (!wanted) return [];
  const wantedCompact = wanted.replace(/ /g, "");
  const candidates = [...propCandidates(slide.props ?? {}), ...contentCandidates(slide.content ?? "")];
  const hits: TextHit[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeWithMap(candidate.raw);
    if (normalized.text === wanted) {
      hits.push({ ...candidate, quality: 3 });
    } else if (wantedCompact.length >= 2 && normalized.text.replace(/ /g, "") === wantedCompact) {
      hits.push({ ...candidate, quality: 2 });
    }
  }
  if (hits.length > 0) return rank(hits);

  // En bit av en längre text: bara om biten är entydig i sin källa och inte
  // för kort för att betyda något (en ensam bokstav, ett skiljetecken).
  if (wanted.length < 3) return [];
  for (const candidate of candidates) {
    if (candidate.scope === "all" && candidates.some((c) => c.kind === "content" && c !== candidate)) continue;
    const normalized = normalizeWithMap(candidate.raw);
    const at = normalized.text.indexOf(wanted);
    if (at < 0 || normalized.text.indexOf(wanted, at + 1) >= 0) continue;
    const rawStart = normalized.map[at];
    const rawEnd = normalized.map[at + wanted.length - 1] + 1;
    if (candidate.kind === "prop") {
      // En bit av en prop redigeras som hela propen — det är den som har ett fält.
      hits.push({ ...candidate, quality: 1 });
    } else {
      const base = candidate.start ?? 0;
      hits.push({
        kind: "content",
        start: base + rawStart,
        end: base + rawEnd,
        raw: candidate.raw.slice(rawStart, rawEnd),
        label: `${candidate.label} (en del)`,
        scope: "part",
        quality: 1,
      });
    }
  }
  return rank(hits);
}

function rank(hits: TextHit[]): TextHit[] {
  // Bäst först: säkrast träff, sedan det mest avgränsade stället (en prop före
  // en rad, en rad före hela innehållet).
  const order: Record<TextScope, number> = { prop: 0, item: 1, field: 2, part: 2, line: 3, all: 4 };
  const specificity = (hit: TextHit) => order[hit.scope];
  const seen = new Set<string>();
  return hits
    .slice()
    .sort((a, b) => b.quality - a.quality || specificity(a) - specificity(b))
    .filter((hit) => {
      const key = hit.kind === "prop" ? `p:${hit.path}` : `c:${hit.start}-${hit.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/* ── Ändringen ──────────────────────────────────────────────────────────── */

const WRAPPERS = ["**", "__", "*", "_"] as const;

/**
 * Behåll markdown runt en text när den nya texten skrivs utan: mallen visade
 * "Pre-training", filen säger "**Pre-training**" — ändras ordet ska det
 * fortfarande vara fetstilt.
 */
export function keepWrapping(raw: string, next: string): string {
  for (const marker of WRAPPERS) {
    if (raw.length > marker.length * 2 && raw.startsWith(marker) && raw.endsWith(marker) && !next.startsWith(marker) && next.trim()) {
      return `${marker}${next}${marker}`;
    }
  }
  return next;
}

export interface TextEdit {
  /** Nya props (hela värdet för den prop som ändrats), eller null. */
  props: Record<string, PropValue> | null;
  /** Nytt innehåll mellan taggarna, eller null. */
  content: string | null;
}

/**
 * Räkna ut ändringen. En rad som töms tas bort helt, med sitt listtecken — så
 * försvinner en punkt ur en lista (och dess klicksteg) när man suddar ut den.
 * Returnerar null om träffen inte längre stämmer med sliden.
 */
export function applyTextEdit(slide: SourceSlide, hit: TextHit, next: string): TextEdit | null {
  if (hit.kind === "prop" && hit.path) {
    const segments = parsePropPath(hit.path);
    if (!segments) return null;
    const name = segments[0] as string;
    if (segments.length === 1) return { props: { [name]: next }, content: null };
    const updated = setAtPath(slide.props[name], segments.slice(1), next);
    if (updated === undefined) return null;
    return { props: { [name]: updated as PropValue }, content: null };
  }
  const content = slide.content ?? "";
  const start = hit.start ?? -1;
  const end = hit.end ?? -1;
  if (start < 0 || end < start || content.slice(start, end) !== hit.raw) return null;
  if (!next.trim() && hit.scope === "line") return { props: null, content: withoutLine(content, start, end) };
  return { props: null, content: content.slice(0, start) + next + content.slice(end) };
}

/** Raden som [start, end) ligger på, bort helt — med listtecken och radbrytning. */
function withoutLine(content: string, start: number, end: number): string {
  const lineStart = content.lastIndexOf("\n", start - 1) + 1;
  const newline = content.indexOf("\n", end);
  const lineEnd = newline < 0 ? content.length : newline + 1;
  const removed = content.slice(0, lineStart) + content.slice(lineEnd);
  return newline < 0 ? removed.replace(/\n$/, "") : removed;
}

/**
 * "Ta bort" i redigeringsrutan: delen försvinner från sliden. En prop töms (en
 * tömd prop gömmer sin del i mallarna, medan en borttagen kan ge tillbaka
 * mallens standardtext), en post i en lista-prop tas bort ur listan, en rad
 * tas bort helt, en punkt tas bort med sitt semikolon. En del av en rad
 * ("värde · etikett") töms men avgränsarna står kvar, så att mallen läser
 * resten av raden som förut. Ångra finns i editorn.
 */
export function removeTextHit(slide: SourceSlide, hit: TextHit): TextEdit | null {
  if (hit.kind === "prop" && hit.path) {
    const segments = parsePropPath(hit.path);
    if (!segments) return null;
    const name = segments[0] as string;
    if (segments.length === 1) return { props: { [name]: "" }, content: null };
    // En text i en listpost (`tiers[1].name`) tar bort hela posten, inte bara
    // fältet: det är punkten på sliden man klickade på.
    let lastIndex = -1;
    segments.forEach((segment, i) => {
      if (typeof segment === "number") lastIndex = i;
    });
    const target = lastIndex > 0 ? segments.slice(1, lastIndex + 1) : segments.slice(1);
    const updated = removeAtPath(slide.props[name], target);
    if (updated === undefined) return null;
    return { props: { [name]: updated as PropValue }, content: null };
  }
  const content = slide.content ?? "";
  const start = hit.start ?? -1;
  const end = hit.end ?? -1;
  if (start < 0 || end < start || content.slice(start, end) !== hit.raw) return null;
  switch (hit.scope) {
    case "all":
      return { props: null, content: "" };
    case "line":
      return { props: null, content: withoutLine(content, start, end) };
    case "item": {
      // Semikolonet efter punkten, eller före om den var sist i sin del.
      const after = /^;\s+/.exec(content.slice(end));
      if (after) return { props: null, content: content.slice(0, start) + content.slice(end + after[0].length) };
      const before = /;\s+$/.exec(content.slice(0, start));
      if (before) return { props: null, content: content.slice(0, start - before[0].length) + content.slice(end) };
      return { props: null, content: content.slice(0, start) + content.slice(end) };
    }
    case "part": {
      // Inga dubbla mellanslag och ingen tom fetstil (****) kvar där biten satt.
      let left = content.slice(0, start);
      let right = content.slice(end);
      for (const marker of WRAPPERS) {
        if (left.endsWith(marker) && right.startsWith(marker)) {
          left = left.slice(0, -marker.length);
          right = right.slice(marker.length);
          break;
        }
      }
      left = left.replace(/[ \t]+$/, "");
      right = right.replace(/^[ \t]+/, "");
      const joiner = left && right && !/\n$/.test(left) && !/^[\n.,;:!?)]/.test(right) ? " " : "";
      return { props: null, content: left + joiner + right };
    }
    default:
      return { props: null, content: content.slice(0, start) + content.slice(end) };
  }
}
