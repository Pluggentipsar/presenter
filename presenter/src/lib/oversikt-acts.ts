import type { ParsedComponent, ParsedPresentation } from "./mdx-parser";

/**
 * Akter i översikten — var de kommer ifrån och vad som händer med dem när
 * slides flyttas.
 *
 * En akt börjar vid en slide. Gränsen kan ägas av fyra saker, i den här
 * ordningen:
 *
 *  1. `akt="…"` på sliden — översiktens egen markering.
 *  2. En avdelarslide (`SectionDivider` m.fl.) — gränsen ÄR sliden.
 *  3. En aktkommentar före sliden: `{/* ═══ AKT 2 · … ═══ *\/}`.
 *  4. Lästextens kapitel — bara ett FÖRSLAG, och bara när decket saknar 1–3.
 *
 * Ett förslag blir deckets eget i samma stund som man ändrar i strukturen:
 * då skrivs alla föreslagna gränser in som `akt`-markeringar först. Annars
 * skulle elva akter försvinna när man döper om den tolfte.
 *
 * Markeringar och kommentarer hör till AKTEN, inte till sliden de råkar sitta
 * på. Flyttar man aktens första slide stannar gränsen kvar och nästa slide
 * tar över den. Avdelare är egna rader och flyttas som vilken slide som helst.
 *
 * Modulen är ren (inga React- eller Next-beroenden) och testas med
 * `node scripts/oversikt-acts.test.ts`.
 */

export const DIVIDER_TAGS = new Set(["SectionDivider", "PosterDivider", "LiquidDivider", "PopDivider"]);

export type ActSource = "markering" | "avdelare" | "kommentar" | "lästext" | "ingen";

export interface Act {
  /** Index för aktens första slide. */
  start: number;
  title: string;
  source: ActSource;
}

export interface SuggestedAct {
  slideId: string;
  title: string;
}

const ACT_COMMENT = /\{\/\*[\s═=─—-]*((?:AKT|DEL|KAPITEL|BLOCK|PASS)\s[^*\n]*?)[\s═=─—-]*\*\/\}/i;

function aktProp(slide: ParsedComponent | undefined): string {
  const value = slide?.props.akt;
  return typeof value === "string" ? value.trim() : "";
}

/** `{/* ═══ AKT 1 · FRIKTIONEN (~24 min) ═══ *\/}` → "Akt 1 · friktionen". */
export function actFromComment(leadingRaw: string | undefined): string | null {
  if (!leadingRaw) return null;
  const match = ACT_COMMENT.exec(leadingRaw);
  if (!match) return null;
  const label = match[1].replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : null;
}

function isDivider(slide: ParsedComponent | undefined): boolean {
  return DIVIDER_TAGS.has(slide?.tag ?? "");
}

function startsAct(slide: ParsedComponent | undefined): boolean {
  return Boolean(slide) && (Boolean(aktProp(slide)) || isDivider(slide) || Boolean(actFromComment(slide?.leadingRaw)));
}

export function deckHasOwnActs(slides: ParsedComponent[]): boolean {
  return slides.some((slide) => startsAct(slide));
}

export function deriveActs(
  slides: ParsedComponent[],
  options: {
    slideIds: string[];
    /** Rubrik per slide, används som namn på avdelarakter. */
    headings: string[];
    suggested: SuggestedAct[];
  },
): { acts: Act[]; suggestedOnly: boolean } {
  const own = deckHasOwnActs(slides);
  const bySlideId = new Map(options.suggested.map((s) => [s.slideId, s.title]));
  const acts: Act[] = [];
  slides.forEach((slide, index) => {
    const marked = aktProp(slide);
    if (marked) {
      acts.push({ start: index, title: marked, source: "markering" });
    } else if (isDivider(slide)) {
      acts.push({ start: index, title: options.headings[index] || "Akt", source: "avdelare" });
    } else {
      const comment = actFromComment(slide.leadingRaw);
      if (comment) acts.push({ start: index, title: comment, source: "kommentar" });
      else if (!own) {
        const chapter = bySlideId.get(options.slideIds[index] ?? "");
        if (chapter) acts.push({ start: index, title: chapter, source: "lästext" });
      }
    }
  });
  const suggestedOnly = !own && acts.length > 0;
  if (acts.length === 0 || acts[0].start > 0) {
    acts.unshift({ start: 0, title: acts.length ? "Inledning" : "Hela föreläsningen", source: "ingen" });
  }
  return { acts, suggestedOnly };
}

export function actIndexOf(acts: Act[], slideIndex: number): number {
  let current = 0;
  acts.forEach((act, i) => {
    if (act.start <= slideIndex) current = i;
  });
  return current;
}

// ── Ändringar ──────────────────────────────────────────────────────────────

function withAkt(slide: ParsedComponent, title: string): ParsedComponent {
  const props = { ...slide.props };
  if (title.trim()) props.akt = title.trim();
  else delete props.akt;
  return { ...slide, props };
}

/** Skriver in föreslagna akter som deckets egna markeringar. */
export function materializeActs(parsed: ParsedPresentation, acts: Act[]): ParsedPresentation {
  const slides = parsed.slides.slice();
  let changed = false;
  for (const act of acts) {
    if (act.source !== "lästext" || !slides[act.start]) continue;
    slides[act.start] = withAkt(slides[act.start], act.title);
    changed = true;
  }
  return changed ? { ...parsed, slides } : parsed;
}

/**
 * Döper en akt, börjar en ny akt vid `index`, eller — med tomt namn — tar bort
 * markeringen så att akten går ihop med den föregående.
 */
export function setActTitle(parsed: ParsedPresentation, acts: Act[], index: number, title: string): ParsedPresentation {
  const base = materializeActs(parsed, acts);
  const slide = base.slides[index];
  if (!slide) return base;
  if (aktProp(slide) === title.trim()) return base;
  const slides = base.slides.slice();
  slides[index] = withAkt(slide, title);
  return { ...base, slides };
}

interface Boundary {
  kind: "markering" | "kommentar";
  /** Sliden utan sin aktgräns. */
  bare: ParsedComponent;
  /** Sätter samma gräns på en annan slide. */
  give: (to: ParsedComponent) => ParsedComponent;
}

/** Aktgränsen som sitter PÅ en vanlig slide (markering eller kommentar). */
function boundaryOn(slide: ParsedComponent | undefined): Boundary | null {
  if (!slide || isDivider(slide)) return null;
  const marked = aktProp(slide);
  if (marked) {
    return { kind: "markering", bare: withAkt(slide, ""), give: (to) => withAkt(to, marked) };
  }
  const match = slide.leadingRaw ? ACT_COMMENT.exec(slide.leadingRaw) : null;
  if (!match || !slide.leadingRaw) return null;
  const comment = match[0];
  const rest = (slide.leadingRaw.slice(0, match.index) + slide.leadingRaw.slice(match.index + comment.length))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const bare: ParsedComponent = { ...slide };
  if (rest) bare.leadingRaw = rest;
  else delete bare.leadingRaw;
  return {
    kind: "kommentar",
    bare,
    give: (to) => ({ ...to, leadingRaw: to.leadingRaw ? `${comment}\n\n${to.leadingRaw}` : comment }),
  };
}

export type RelocateResult =
  | { ok: true; parsed: ParsedPresentation; order: number[]; newIndex: number }
  | { ok: false; reason: "samma plats" | "ensam i kommentarsakt" | "utanför" };

/**
 * Flyttar sliden på `from` till luckan `gap` (0…n, "före slide gap" i den
 * ursprungliga numreringen). `joinNext` avgör vad som händer när luckan ligger
 * precis på en aktgräns: sant = sliden blir den aktens första, falskt = den
 * blir den föregående aktens sista.
 *
 * Returnerar slides där aktgränserna redan är omflyttade, plus den nya
 * ordningen (order[nyPos] = gammaltIndex). Själva omordningen görs av
 * `reorderDeck`, som också håller frontmatterns positioner i synk.
 */
export function relocateSlide(
  parsed: ParsedPresentation,
  acts: Act[],
  from: number,
  gap: number,
  joinNext: boolean,
): RelocateResult {
  const base = materializeActs(parsed, acts);
  const count = base.slides.length;
  if (from < 0 || from >= count || gap < 0 || gap > count) return { ok: false, reason: "utanför" };

  const slides = base.slides.slice();
  const samePosition = gap === from || gap === from + 1;
  const own = boundaryOn(slides[from]);
  // Gränsen som sliden ska ta över, avläst INNAN något flyttas.
  const target = joinNext && gap < count && gap !== from ? boundaryOn(slides[gap]) : null;

  let actEnd = from + 1;
  while (actEnd < count && !startsAct(slides[actEnd])) actEnd++;
  const alone = actEnd - from < 2;

  // Står sliden kvar på samma plats händer något bara om den byter akt:
  // uppåt ur sin egen (den bar gränsen) eller nedåt in i nästa.
  const leavesUpward = samePosition && gap === from && !joinNext && Boolean(own) && from > 0;
  const entersNext = samePosition && gap === from + 1 && Boolean(target);
  if (samePosition && !leavesUpward && !entersNext) return { ok: false, reason: "samma plats" };

  // 1. Sliden lämnar en akt som den själv bär gränsen för. Gränsen stannar
  //    hos nästa slide i akten. Är sliden ensam i akten upphör akten — men en
  //    kommentar i källfilen raderas aldrig härifrån.
  if (own) {
    if (!alone) {
      slides[from] = own.bare;
      slides[from + 1] = own.give(slides[from + 1]);
    } else if (own.kind === "markering") {
      slides[from] = own.bare;
    } else {
      return { ok: false, reason: "ensam i kommentarsakt" };
    }
  }

  // 2. Sliden landar först i en akt vars gräns sitter på en vanlig slide.
  if (target) {
    slides[gap] = target.bare;
    slides[from] = target.give(slides[from]);
  }

  const order = slides.map((_, i) => i).filter((i) => i !== from);
  const newIndex = gap > from ? gap - 1 : gap;
  order.splice(newIndex, 0, from);
  return { ok: true, parsed: { ...base, slides }, order, newIndex };
}

/**
 * Ett steg upp eller ner, så som det ser ut i listan: över en aktgräns byter
 * sliden akt innan den byter plats. `skip` pekar ut rader som inte visas
 * (dolda slides när de är bortfiltrerade) — dem hoppar flytten över.
 */
export function stepSlide(
  parsed: ParsedPresentation,
  acts: Act[],
  from: number,
  direction: -1 | 1,
  skip: (index: number) => boolean = () => false,
): RelocateResult {
  const base = materializeActs(parsed, acts);
  const slides = base.slides;
  let neighbour = from + direction;
  while (neighbour >= 0 && neighbour < slides.length && skip(neighbour)) neighbour += direction;
  if (neighbour < 0 || neighbour >= slides.length) return { ok: false, reason: "utanför" };

  if (direction === 1) {
    // Nästa rad börjar en ny akt på en vanlig slide → gå in i den akten först.
    if (boundaryOn(slides[neighbour])) return relocateSlide(base, [], from, neighbour, true);
    return relocateSlide(base, [], from, neighbour + 1, false);
  }
  // Uppåt: bär sliden själv aktens gräns lämnar den akten och blir den
  // föregående aktens sista, utan att byta plats.
  if (boundaryOn(slides[from])) {
    const left = relocateSlide(base, [], from, from, false);
    if (left.ok || left.reason !== "ensam i kommentarsakt") return left;
    return { ok: false, reason: "ensam i kommentarsakt" };
  }
  return relocateSlide(base, [], from, neighbour, Boolean(boundaryOn(slides[neighbour])));
}

/** Tar bort en slide men låter en `akt`-markering stanna kvar hos akten. */
export function handOverActBeforeDelete(parsed: ParsedPresentation, acts: Act[], index: number): ParsedPresentation {
  // Ett föreslaget kapitel hänger på slidens id och skulle försvinna med den.
  const startsSuggested = acts.some((act) => act.start === index && act.source === "lästext");
  const base = startsSuggested ? materializeActs(parsed, acts) : parsed;
  const slide = base.slides[index];
  const next = base.slides[index + 1];
  const marked = aktProp(slide);
  if (!marked || !next || startsAct(next)) return base;
  const slides = base.slides.slice();
  slides[index + 1] = withAkt(next, marked);
  return { ...base, slides };
}
