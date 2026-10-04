"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * Scenrutans fält för granskning i adressen (/<slug>/scen):
 *
 * - `?direkt=1` (frame): granskningsvyns ram och mellanlägena. Förlopp som drivs av tiden i stället
 *   för av CSS (canvasvärldar, räknare) ska visa lägets färdiga bild, så att bilderna blir desamma
 *   varje gång och inte fångas mitt i en uppräkning.
 * - `?simtid=2.5`: rita förloppet så som det ser ut 2,5 sekunder in i läget (scripts/mellanlagen.mjs).
 *
 * Spelaren och delningssidorna har inga sådana fält, så där ändrar det här ingenting. Se docs/GRANSKA.md.
 */
export function useSceneReview(): { frame: boolean; simtid: number | null } {
  const search = useSyncExternalStore(subscribeNever, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const simtid = Number(params.get("simtid"));
  return { frame: params.get("direkt") === "1", simtid: Number.isFinite(simtid) && simtid > 0 ? simtid : null };
}
