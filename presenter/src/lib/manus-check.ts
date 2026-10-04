/**
 * Läsning av talmanuset (<Notes>) för kontrollerna: vad Joel säger, var han
 * klickar och vad lägesbeskrivningen påstår. Används av granskningsvyn
 * (/[slug]/granska) och av skripten taltid.mjs, klick-manus.mjs och
 * kallalder.mjs (via scripts/lib/deck.mjs), så att alla räknar likadant.
 *
 * Konventionerna kommer ur en filmserie (30 september 2026):
 *   REGI: …             anvisning till Joel, sägs inte
 *   Scen 4 · … Sju lägen: …   lägesbeskrivning först i Notes, sägs inte
 *   [Klick]             ett klick; [Klick, prompt] och [Klick: svaret] är märkta klick
 *   [Klicka fram …]     flera klick utan angivet antal
 *   [Låt prompten läsas.], [Paus]   anvisningar i talet, gör tystnaden avsiktlig
 */

export const paragraphs = (notes: string): string[] =>
  notes.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** REGI-stycken är anvisningar till Joel och sägs inte. */
export const isRegi = (par: string): boolean => /^REGI\b/i.test(par);

const NUMBER_WORDS = "Ett|Två|Tre|Fyra|Fem|Sex|Sju|Åtta|Nio|Tio|Elva|Tolv|Tretton|Fjorton|Femton|\\d+";
const STAGE_NOTE = new RegExp(`^(Scen \\d+\\b|(${NUMBER_WORDS}) lägen?\\b|Kort slutskylt\\b)`, "i");
const WORD_VALUES: Record<string, number> = {
  ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10, elva: 11, tolv: 12, tretton: 13, fjorton: 14, femton: 15,
};

/** Lägesbeskrivningen först i Notes (”Scen 4 · … Sju lägen: …”) är regi, inte tal. */
export const isStageNote = (par: string): boolean => STAGE_NOTE.test(par);

export const wordCount = (text: string): number =>
  (text.match(/\S+/g) ?? []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Det Joel säger: utan REGI, lägesbeskrivningar och anvisningar i hakparentes. */
export function spoken(notes: string): string {
  return paragraphs(notes)
    .filter((p) => !isRegi(p) && !isStageNote(p))
    .map((p) => p.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Antalet lägen som lägesbeskrivningen påstår (”Sju lägen: …”), annars null. */
export function statedSteps(notes: string): number | null {
  for (const par of paragraphs(notes).filter(isStageNote)) {
    const m = par.match(new RegExp(`\\b(${NUMBER_WORDS}) lägen?\\b`, "i"));
    if (m) return /^\d+$/.test(m[1]) ? Number(m[1]) : WORD_VALUES[m[1].toLowerCase()] ?? null;
  }
  return null;
}

export interface ClickMarks {
  /** Räknade klick. */
  exact: number;
  /** ”[Klicka fram …]”: flera klick utan angivet antal. */
  open: boolean;
  /** Omärkta klick direkt efter ett annat omärkt klick, utan tal eller anvisning emellan. */
  silent: number;
}

/**
 * Klickmarkeringarna i talet. `[Klick]`, `[Klick.]`, `[Klick, prompt]` och
 * `[Klick: …]` räknas som ett klick var (plus varje ”nästa klick” inuti).
 * En anvisning (`[Låt prompten läsas.]`, `[Paus]`) eller en märkt klickning
 * visar att tystnaden mellan två klick är avsiktlig.
 */
export function clickMarkers(notes: string): ClickMarks {
  let exact = 0;
  let open = false;
  let silent = 0;
  let last = "";
  for (const par of paragraphs(notes).filter((p) => !isRegi(p))) {
    for (const part of par.split(/(\[[^\]]*\])/)) {
      const marker = part.match(/^\[(Klick|Klicka)\b([^\]]*)\]$/i);
      if (marker) {
        if (/^klicka$/i.test(marker[1])) { open = true; last = "märkt"; continue; }
        const label = marker[2].replace(/^[\s.,:]+/, "");
        const extra = (label.match(/nästa klick/gi) ?? []).length;
        for (let k = 0; k <= extra; k++) {
          if (!label && last === "klick") silent++;
          last = label ? "märkt" : "klick";
          exact++;
        }
      } else if (/^\[.*\p{L}.*\]$/u.test(part) || wordCount(part) > 0) {
        last = "tal";
      }
    }
  }
  return { exact, open, silent };
}
