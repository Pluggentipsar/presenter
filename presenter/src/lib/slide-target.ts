"use client";

import { createContext } from "react";

/** Vart spelaren är på väg: målslidens index, scenkod och riktning.
 *
 * Finns bara i presentationsvyn (SlideViewer), så att en scen kan skilja en
 * levande övergång från editor, miniatyrer och delningsvyn. Providern ligger
 * ovanför AnimatePresence, så även den utgående sliden ser det nya målet
 * under sin utgång och kan börja röra sig mot det.
 *
 * `travel`: decket reser mellan scenerna (AI och du i Solkraft, se
 * elever-solkraft/lecture-journey.ts). Andra deck som lånar samma scener
 * behåller sina egna övergångar. `jump`: spelaren hoppade (menyn, L, J) i
 * stället för att gå framåt eller bakåt. */
export type SlideTarget = { index: number; scene?: string; direction: number; travel?: boolean; jump?: boolean;
  /** Vätterresan: målslidens riktning ur närmaste `resa=` bakåt (templates/stage/world.tsx). */
  move?: string };

export const SlideTargetContext = createContext<SlideTarget | null>(null);
