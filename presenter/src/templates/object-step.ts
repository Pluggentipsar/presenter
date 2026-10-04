"use client";

import { useSlideSteps } from "@/lib/slide-steps";
import { stepRange } from "@/lib/objects";

/**
 * Objekt på klicksteg — PowerPoints "visa vid klick", men med spelarens
 * stegsystem och clickern.
 *
 *   step={2}    objektet syns efter två klick (0 eller inget = från början)
 *   until={4}   objektet försvinner vid det fjärde klicket
 *
 * Stegsystemet tar max av allt som registrerar steg på sliden, så ett objekt
 * med step={2} ger sliden minst tre lägen även om mallen själv saknar steg.
 * Returnerar om objektet ska synas i det aktuella läget.
 */
export function useObjectStep(step: number | string | undefined, until: number | string | undefined): boolean {
  const { from, to } = stepRange(step, until);
  const needed = to !== null ? Math.max(from, to) + 1 : from > 0 ? from + 1 : 0;
  const current = useSlideSteps(needed);
  return current >= from && (to === null || current < to);
}
