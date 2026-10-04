"use client";

import { createContext } from "react";

/**
 * Vätterresan · världen som ligger kvar mellan slides.
 *
 * I ett deck där någon slide har `resa=` ritar spelaren sjön en gång, utanför
 * slidebytet (se world.tsx och SlideViewer). Scenerna ritar då ingen egen sjö
 * utan rapporterar bara var horisonten och ljuset ska stå, vilken tid på dygnet
 * det är och om vattnet får röra sig. Världen glider dit; förgrunden reser.
 *
 * Utanför presentationsvyn (R, miniatyrer, /scen, delningsvyn) finns ingen
 * värld, och varje scen ritar sin sjö själv som förut.
 */

export type WorldState = {
  /** Horisontens höjd som andel av 900 px. */
  horizon: number;
  /** Ljusets läge längs horisonten i px av 1600. */
  lightX: number;
  /** tone="dag": samma sjö i dagsljus. */
  day: boolean;
  /** Gryningen (dygn=): 0 natt, 0,6 gryning, 1 morgon. Himlen ljusnar långsamt dit. */
  dawn: number;
  /** Vattnet rör sig (vilolägen). Vid läsning står det stilla. */
  flow: boolean;
  /** Bakåt, R och reducerad rörelse: världen hoppar direkt till läget. */
  instant: boolean;
  /** Räknas upp när ett nytt kapitel reser in (resa="in"); ljuset sväller en gång. */
  pulse: number;
  /**
   * Tiopotenserna (fältet skala, skala.tsx): kamerans exponent, bildytan är 10^n
   * meter bred. NaN tills en scen med skala har rapporterat; sjön bryr sig inte.
   */
  skala: number;
  /** Slöjan över skalvärlden (fältet vy): 0 bilden syns helt, 1 bara temats grund. */
  veil: number;
  /** Platsen i skalmätaren (fältet plats); tomt = nivåns egen etikett. */
  skalaLabel: string;
  /** Skalmätaren: liten i hörnet, eller stor som kapitelrubrik (formen zoom). */
  hud: "liten" | "stor";
  /** Kameran inom en nivå (fältet kamera, skala.tsx): tomt, nara, fjarran eller horisont. */
  kamera: string;
  /** Fältet filmfarg på en slide (#rrggbb): ljuset byter färg där. Tomt = deckets filmfarg. */
  film: string;
};

export type WorldStore = {
  get: () => WorldState;
  /** Scenen rapporterar sitt läge; det senaste vinner. */
  report: (part: Partial<WorldState>) => void;
  /** Ett nytt kapitel: horisontens ljus sväller kort. */
  pulse: () => void;
  subscribe: (listener: () => void) => () => void;
  /** Har någon scen visats än? Den första sliden reser inte in. */
  shown: () => boolean;
};

export const WORLD_START: WorldState = { horizon: .72, lightX: 1312, day: false, dawn: 0, flow: false, instant: true, pulse: 0, skala: Number.NaN, veil: .5, skalaLabel: "", hud: "liten", kamera: "", film: "" };

/** Tid på dygnet per steg (fältet dygn, med komma per steg): natt, gryning eller morgon. */
export const DAWN: Record<string, number> = { natt: 0, gryning: .6, morgon: 1 };
export function dawnFor(value: string, step: number): number {
  const parts = value.split(",").map(part => part.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return 0;
  return DAWN[parts[Math.min(step, parts.length - 1)]] ?? 0;
}

export function createWorldStore(): WorldStore {
  let state = WORLD_START;
  let reports = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    shown: () => reports > 0,
    report(part) {
      reports++;
      const next = { ...state, ...part };
      // Object.is: skalan börjar som NaN, som annars aldrig vore lika med sig själv.
      if ((Object.keys(next) as (keyof WorldState)[]).every(key => Object.is(next[key], state[key]))) return;
      state = next;
      listeners.forEach(listener => listener());
    },
    pulse() {
      state = { ...state, pulse: state.pulse + 1 };
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** Finns bara i presentationsvyn för ett deck med Vätterresan. */
export const WorldContext = createContext<WorldStore | null>(null);

/**
 * Riktningar för resan till en slide (propen `resa` på Stage; tomt = ner).
 * in = nytt kapitel, in mot ljuset. ner = nästa tanke. upp = en återkomst.
 * ut = helheten. stilla = en fråga eller skylt som bara kommer. hoger/vanster
 * drar text genom talarens yta och används bara mellan två helbilder.
 */
export const TRAVEL_MOVES = ["ner", "upp", "in", "ut", "hoger", "vanster", "stilla"] as const;
export type TravelMove = typeof TRAVEL_MOVES[number];
export const isTravelMove = (value: unknown): value is TravelMove => typeof value === "string" && (TRAVEL_MOVES as readonly string[]).includes(value);
