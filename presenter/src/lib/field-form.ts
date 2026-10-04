/**
 * Fältformulärets indelning — vad slide-editorns flik "Fält" visar, och var.
 *
 * Ett schema listar mallens egna fält. Men en slide bär mer än så: Joels
 * planering (`syfte`, `tid`, `claude`), sin identitet (`slideId`) och ibland
 * egenskaper som schemat inte känner till (ett `ticker` som en agent lagt dit,
 * ett markords opacitet). Förut visades bara schemats fält — resten var osynligt
 * i editorn, och för mallar utan schema hamnade `slideId` bland de redigerbara
 * fälten.
 *
 * Indelningen här:
 *   main      mallens vanliga fält, i schemats ordning
 *   advanced  fält märkta `advanced` — finjustering, hopfälld
 *   planning  syfte · tid · till Claude — finns på VARJE slide
 *   extra     egenskaper som står på sliden men saknas i schemat — hopfälld,
 *             så att inget som står i filen är osynligt i editorn
 *
 * Ren modul (inga importer utom typer) så att den kan testas i Node.
 */

import type { FieldSchema, TemplateSchema } from "./template-schemas";

/** Identitet och aktgräns. Redigeras aldrig som fält: slideId är ankaret för
 *  lästext, miniatyrer och delningar; `akt` sköts i översikten. */
export const HIDDEN_PROPS = new Set(["slideId", "akt", "stegAv", "hoppaSteg"]);

/** Egenskaper som designfliken redan har riktiga reglage för. */
export const DESIGN_TAB_PROPS = new Set([
  "background",
  "backgroundBlur",
  "backgroundPoster",
  "overlay",
  "overlayMode",
  "mark",
  "markHidden",
  "markAlign",
  "symbolHidden",
  "figureHidden",
]);

export const PLANNING_FIELDS: FieldSchema[] = [
  {
    name: "syfte",
    label: "Syfte — vad sliden gör i bågen",
    type: "text",
    placeholder: "Varför finns den här sliden?",
  },
  { name: "tid", label: "Uppskattad tid", type: "text", placeholder: "t.ex. 2 min" },
  {
    name: "claude",
    label: "Till Claude/Codex",
    type: "multiline",
    placeholder: "Vad ska göras med sliden nästa byggpass?",
    hint: "Följer med sliden tills instruktionen är utförd. Syns aldrig för publiken.",
  },
];

const PLANNING_NAMES = new Set(PLANNING_FIELDS.map((field) => field.name));

/** Svenska namn på lagren som vilken mall som helst kan bära (withSlideBg). */
export const UNIVERSAL_PROP_LABELS: Record<string, string> = {
  register: "Register (färgläge)",
  tone: "Ton",
  cutSkip: "Hoppas över i versionerna",
  markOpacity: "Markord · opacitet",
  markTone: "Markord · färg",
  markLang: "Markord · språk",
  markStyle: "Markord · stil",
  markScale: "Markord · skala",
  symbol: "Symbol",
  symbolAlign: "Symbol · placering",
  symbolSize: "Symbol · storlek",
  symbolTone: "Symbol · färg",
  symbolOpacity: "Symbol · opacitet",
  symbolX: "Symbol · x",
  symbolY: "Symbol · y",
  figure: "Figur",
  figureAlign: "Figur · placering",
  figureSize: "Figur · storlek",
  figureFront: "Figur · framför texten",
  figureBleed: "Figur · utfall",
  figureOpacity: "Figur · opacitet",
  figureRotate: "Figur · rotation",
  figureX: "Figur · x",
  figureY: "Figur · y",
  ticker: "Löpande textrad",
  tickerAlign: "Löpande textrad · placering",
  tape: "Tejpremsa",
  tapeAlign: "Tejpremsa · placering",
  tapeTone: "Tejpremsa · färg",
  strip: "Färgremsa",
  stripAlign: "Färgremsa · sida",
  disc: "Skiva",
  discSize: "Skiva · storlek",
  discX: "Skiva · x",
  discY: "Skiva · y",
  halftone: "Raster",
};

export interface FieldFormLayout {
  main: FieldSchema[];
  advanced: FieldSchema[];
  planning: FieldSchema[];
  /** Namn på egenskaper som står på sliden men som schemat inte listar. */
  extra: string[];
}

/**
 * Dela upp ett schema och en slides egenskaper i formulärets avdelningar.
 *
 * `isFallback` = schemat är härlett ur slidens egenskaper (mallen saknar eget
 * schema). Då finns per definition inga "extra" — men identitet, planering och
 * designflikens egenskaper ska ändå bort ur huvudlistan.
 */
export function layoutFieldForm(
  schema: Pick<TemplateSchema, "fields">,
  props: Record<string, unknown>,
  isFallback: boolean,
): FieldFormLayout {
  const main: FieldSchema[] = [];
  const advanced: FieldSchema[] = [];
  const listed = new Set<string>();
  const planningInSchema = new Set<string>();

  for (const field of schema.fields) {
    listed.add(field.name);
    if (HIDDEN_PROPS.has(field.name)) continue;
    if (PLANNING_NAMES.has(field.name)) {
      // Utkast listar själv syfte och tid: låt dem stå där mallen vill ha dem.
      if (!isFallback) {
        planningInSchema.add(field.name);
        main.push(field);
      }
      continue;
    }
    if (isFallback && DESIGN_TAB_PROPS.has(field.name)) continue;
    if (field.advanced) advanced.push(field);
    else main.push(field);
  }

  const planning = PLANNING_FIELDS.filter((field) => !planningInSchema.has(field.name));

  const extra: string[] = [];
  if (!isFallback) {
    for (const name of Object.keys(props)) {
      if (listed.has(name)) continue;
      if (HIDDEN_PROPS.has(name) || PLANNING_NAMES.has(name) || DESIGN_TAB_PROPS.has(name)) continue;
      extra.push(name);
    }
  }

  return { main, advanced, planning, extra };
}

/**
 * Ska ett tömt fält tas bort ur filen i stället för att sparas som `namn=""`?
 *
 * Ja för frivilliga fält utan standardvärde: `kicker=""` är skräp. Nej när
 * fältet är obligatoriskt eller har ett standardvärde — då betyder tomt något
 * eget (PromptWindows `label=""` döljer etiketten), och ett borttaget värde
 * skulle dessutom få formuläret att visa standardvärdet igen mitt i raderingen.
 *
 * Finjusteringsfält (`advanced`) med `default` är ett eget fall: deras default
 * är mallens eget standardvärde, så ett värde som är lika med det tas bort.
 */
export function clearsProp(
  field: Pick<FieldSchema, "required" | "default" | "advanced">,
  value: unknown,
): boolean {
  // Finjustering som ställs tillbaka till mallens eget standardvärde behöver inte stå i filen.
  if (field.advanced && field.default !== undefined) return value === field.default || value === "";
  if (value !== "" && value !== null && value !== undefined) return false;
  if (field.required) return false;
  return field.default === undefined;
}

/** Hur många av fälten som har ett värde på sliden — för "2 av 6 ifyllda". */
export function countFilled(fields: FieldSchema[], props: Record<string, unknown>): number {
  let filled = 0;
  for (const field of fields) {
    const value = props[field.name];
    if (value === undefined || value === null || value === "") continue;
    filled++;
  }
  return filled;
}

const STANDARD_CONTENT = "\n- Ny punkt\n- Ännu en punkt\n";
const TIMELINE_CONTENT = '\n  <TimelineEvent date="2026" title="Händelse">\n    Beskrivning\n  </TimelineEvent>\n';
const COMPARISON_CONTENT =
  '\n  <ComparisonColumn title="Vänster">\n  - Punkt\n  </ComparisonColumn>\n  <ComparisonColumn title="Höger">\n  - Punkt\n  </ComparisonColumn>\n';

/**
 * Egenskaper och innehåll för en NY slide av en mall ("Lägg till tom" i galleriet).
 *
 * Obligatoriska fält får en platshållartext så att sliden går att se direkt,
 * `default` skrivs in — utom för finjustering, där default bara är vad formuläret
 * visar — och innehållet börjar i mallens eget format (`defaultContent`).
 * slideId sätts av anroparen.
 */
export function buildDefaultSlide(schema: TemplateSchema): {
  props: Record<string, string | number | boolean | null>;
  content: string | null;
} {
  const props: Record<string, string | number | boolean | null> = {};
  for (const field of schema.fields) {
    if (field.default !== undefined && !field.advanced) {
      props[field.name] = field.default;
    } else if (field.required) {
      // Placeholder-text så fältet syns tydligt
      if (field.type === "text" || field.type === "multiline") {
        props[field.name] = field.placeholder ?? `Ny ${field.label.toLowerCase()}`;
      } else if (field.type === "number") {
        props[field.name] = 0;
      } else if (field.type === "boolean") {
        props[field.name] = false;
      } else if (field.type === "select" && field.options?.[0]) {
        props[field.name] = field.options[0];
      } else {
        props[field.name] = "";
      }
    }
  }

  let content: string | null = null;
  if (schema.hasContent) content = schema.defaultContent ?? STANDARD_CONTENT;
  else if (schema.childrenType === "TimelineEvent") content = TIMELINE_CONTENT;
  else if (schema.childrenType === "ComparisonColumn") content = COMPARISON_CONTENT;

  return { props, content };
}
