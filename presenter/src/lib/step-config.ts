/**
 * Klickstegen på en enskild slide — utan att röra mallen.
 *
 * Joel (23 september 2026): hur tar man bort klicksteg manuellt? Mallarna
 * bestämmer själva hur många lägen en slide har (en punkt per klick, prompten
 * före svaret …). Två props på sliden ändrar det i efterhand, för vilken mall
 * som helst:
 *
 *   stegAv            sliden visas färdig direkt — inga klick alls
 *   hoppaSteg="3,4"   de lägena hoppas över (numrerade som editorns "Steg x/y",
 *                     där steg 1 är utgångsläget)
 *
 * Mallen registrerar sina lägen som förut; stegkontexten (lib/slide-steps.tsx)
 * visar bara de lägen som är kvar och låter clickern gå mellan dem. Ett
 * överhoppat läge slås ihop med nästa: det som skulle ha kommit på det klicket
 * kommer tillsammans med nästa. Hoppas det sista läget över kommer dess innehåll
 * aldrig. Minst ett läge finns alltid kvar.
 *
 * Ren TypeScript: används av spelaren, publikvyn och slide-editorn och testas i
 * scripts/step-config.test.ts.
 */

export interface StepConfig {
  /** Bara slutläget: sliden visas färdig, inga klick. */
  final?: boolean;
  /** Lägen som hoppas över, 1-baserade (steg 1 = utgångsläget). */
  skip?: number[];
}

/** Läs sliden props. Utan några av dem: undefined, och stegen är som förut. */
export function parseStepConfig(props: Record<string, unknown> | undefined | null): StepConfig | undefined {
  if (!props) return undefined;
  const final = props.stegAv === true || props.stegAv === "true";
  const skip = parseSkipList(props.hoppaSteg);
  if (!final && skip.length === 0) return undefined;
  return final ? { final: true } : { skip };
}

export function parseSkipList(raw: unknown): number[] {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
  const steps = text
    .split(/[\s,;]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n >= 1);
  return [...new Set(steps)].sort((a, b) => a - b);
}

export function formatSkipList(skip: number[]): string {
  return [...new Set(skip)].filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b).join(",");
}

/**
 * Lägena som visas, som mallens egna index (0-baserade). Aldrig tom när mallen
 * har lägen: hoppas allt över visas slutläget.
 */
export function keptSteps(total: number, config?: StepConfig): number[] {
  if (total <= 0) return [];
  const all = Array.from({ length: total }, (_, i) => i);
  if (!config) return all;
  if (config.final) return [total - 1];
  const skipped = new Set((config.skip ?? []).map((n) => n - 1));
  const kept = all.filter((i) => !skipped.has(i));
  return kept.length > 0 ? kept : [total - 1];
}

/** Närmaste läge som visas: det här eller nästa, annars det sista som finns. */
export function snapStep(step: number, kept: number[]): number {
  if (kept.length === 0) return step;
  for (const k of kept) if (k >= step) return k;
  return kept[kept.length - 1];
}

/**
 * Första läget innan mallen hunnit säga hur många den har — så att en slide
 * där steg 1 hoppas över inte visar det ens en bildruta.
 */
export function firstStepBeforeCount(config?: StepConfig): number {
  if (!config || config.final) return 0;
  const skipped = new Set(config.skip ?? []);
  let step = 1;
  while (skipped.has(step)) step++;
  return step - 1;
}

/** Slå av eller på ett läge (1-baserat) i listan över överhoppade. */
export function toggleSkip(skip: number[], step: number): number[] {
  return skip.includes(step) ? skip.filter((n) => n !== step) : [...skip, step].sort((a, b) => a - b);
}
