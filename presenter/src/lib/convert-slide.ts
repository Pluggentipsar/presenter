import type { ParsedComponent, PropValue } from "./mdx-parser";

/**
 * Byt mall på en slide — från utkast till riktig mall, eller från en mall till
 * en annan — utan att tappa det som hör till TANKEN bakom sliden.
 *
 * Arbetsgången i Presenter är att skriva föreläsningen som `<Utkast>`-rader
 * (syfte, orden som ska stå på sliden, manus) och sedan ge varje rad en form.
 * Förut var det steget en agents jobb. Här görs det för hand: man väljer en
 * mall i galleriet, och den här funktionen sätter ihop den nya sliden.
 *
 * FÖLJER MED från den gamla sliden:
 *  - `slideId` — sliden är densamma: lästextens ankare, miniatyrer och
 *    delningar pekar på id:t.
 *  - planeringsfälten `syfte`, `tid`, `akt` och `claude`.
 *  - manus (`<Notes>`), kommentarer före sliden (aktrubriker) och överlägg.
 *  - ORDEN: utkastets text hamnar i den nya mallens huvudfält.
 *
 * FÖLJER INTE MED som props: utkastets `visuell`, `kalla`, `media` och `mall`.
 * En vanlig mall läser dem inte, och som okända props skulle de hamna i den
 * publika sidans källkod. De skrivs i stället in sist i manuset, så att inget
 * går förlorat.
 *
 * Modulen är ren och testas med `npm run test:bytmall`.
 */

/** Planeringsfält som gäller för alla slides och rensas ur publika byggen. */
const KEPT_PROPS = ["syfte", "tid", "akt", "claude"] as const;

/** Utkastets egna fält, med rubriken de får i manuset. */
const DRAFT_FIELDS: [string, string][] = [
  ["visuell", "Visuell idé"],
  ["kalla", "Källa"],
  ["media", "Media"],
];

/** Props som brukar bära slidens huvudtext, i den ordning de prövas. */
export const TEXT_PROPS = ["title", "heading", "headline", "text", "statement", "quote", "question", "claim"] as const;

function text(value: PropValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Innehåller children egna komponenter (TimelineEvent, ComparisonColumn …)? */
function hasNestedComponents(content: string | null): boolean {
  return Boolean(content && /<[A-Z][A-Za-z0-9]*[\s/>]/.test(content));
}

/** Är innehållet en markdownlista — formen hos mallar som läser "- rad · etikett"? */
export function isListShaped(content: string | null | undefined): boolean {
  return Boolean(content && /^\s*[-*]\s+\S/m.test(content));
}

/** Orden som står på sliden: children om det är ren text, annars första textfältet. */
export function mainTextOf(slide: ParsedComponent): string {
  if (slide.content && !hasNestedComponents(slide.content)) {
    const body = slide.content.trim();
    if (body) return body;
  }
  for (const key of TEXT_PROPS) {
    const value = text(slide.props[key]);
    if (value) return value;
  }
  return "";
}

/** Var den nya mallen tar emot huvudtexten: "content", ett propnamn eller null. */
export function mainTextSlot(slide: ParsedComponent): "content" | (typeof TEXT_PROPS)[number] | null {
  if (slide.content !== null && !hasNestedComponents(slide.content)) return "content";
  for (const key of TEXT_PROPS) if (key in slide.props) return key;
  return null;
}

export interface ConvertResult {
  slide: ParsedComponent;
  /** Vart orden tog vägen — visas som besked efter bytet. */
  textWent: "content" | "prop" | "notes" | "nowhere";
  /**
   * Kommer orden att SYNAS? "list-expected": mallen läser sitt innehåll som en
   * lista (StatsTriptych, RevealList, LivePoll …) men orden är löpande text. De
   * ligger då i innehållsfältet, där de ska skrivas om rad för rad — och tills
   * dess visar sliden dem inte. Exemplets rader lämnas INTE kvar: siffror ur en
   * annan föreläsning ska inte kunna följa med av misstag.
   */
  wordsFit: "ok" | "list-expected";
}

/**
 * @param source  sliden som byter mall
 * @param target  den valda mallen, ifylld som exemplet eller med standardvärden
 */
export function convertSlide(source: ParsedComponent, target: ParsedComponent): ConvertResult {
  const props: Record<string, PropValue> = { ...target.props };

  // Identiteten och planeringen hör till sliden, inte till mallen.
  if (source.props.slideId !== undefined) props.slideId = source.props.slideId;
  for (const key of KEPT_PROPS) {
    if (text(source.props[key])) props[key] = source.props[key];
    else delete props[key];
  }

  // Orden.
  const words = mainTextOf(source);
  const slot = mainTextSlot(target);
  let content = target.content;
  let textWent: ConvertResult["textWent"] = "nowhere";
  let wordsFit: ConvertResult["wordsFit"] = "ok";
  const noteParts: string[] = [];
  if (words) {
    if (slot === "content") {
      content = `\n${words}\n`;
      textWent = "content";
      if (isListShaped(target.content) && !isListShaped(words)) wordsFit = "list-expected";
    } else if (slot) {
      // Ett prop är en rad: radbrytningar blir mellanslag.
      props[slot] = words.replace(/\s*\n\s*/g, " ");
      textWent = "prop";
    } else {
      noteParts.push(`TEXTEN FRÅN UTKASTET:\n${words}`);
      textWent = "notes";
    }
  }

  // Utkastets övriga fält sparas i manuset.
  if (source.tag === "Utkast") {
    const kept = DRAFT_FIELDS.map(([key, label]) => (text(source.props[key]) ? `${label}: ${text(source.props[key])}` : "")).filter(Boolean);
    if (kept.length > 0) noteParts.push(`FRÅN UTKASTET:\n${kept.join("\n")}`);
  }

  const notes = [source.notes?.trim() ?? "", ...noteParts].filter(Boolean).join("\n\n");

  const slide: ParsedComponent = {
    tag: target.tag,
    props,
    content,
    children: target.children,
  };
  if (notes) slide.notes = notes;
  if (source.overlays?.length) slide.overlays = source.overlays;
  if (source.leadingRaw) slide.leadingRaw = source.leadingRaw;
  return { slide, textWent, wordsFit };
}

/** Mallen utkastet pekar ut i sitt `mall`-fält ("HookStatement", inte "NY: …"). */
export function plannedTemplate(slide: ParsedComponent): string | null {
  const planned = text(slide.props.mall);
  return /^[A-Z][A-Za-z0-9]*$/.test(planned) ? planned : null;
}
