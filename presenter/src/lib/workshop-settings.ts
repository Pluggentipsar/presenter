/**
 * Verkstadens form: ljus (standard) eller mörk.
 *
 * Storyboard, manus och slide-editor är byggda mörka. Den ljusa formen läggs på
 * med klassen `.verkstad` (se globals.css), som vänder färgvariablerna utan att
 * röra komponenterna — därför går det också att slå av den. Översikten,
 * biblioteket och komponentgalleriet är alltid ljusa.
 *
 * Samma mönster som oversikt-settings.ts: en liten extern butik som läses med
 * useSyncExternalStore. Servern och hydreringen ser standardvärdet, sedan tar
 * det sparade över.
 */

const STORAGE_KEY = "verkstad:form";

export type WorkshopForm = "ljus" | "mork";

let cache: WorkshopForm | null = null;
const listeners = new Set<() => void>();

export function getWorkshopForm(): WorkshopForm {
  if (cache) return cache;
  try {
    cache = window.localStorage.getItem(STORAGE_KEY) === "mork" ? "mork" : "ljus";
  } catch {
    cache = "ljus";
  }
  return cache;
}

export function getServerWorkshopForm(): WorkshopForm {
  return "ljus";
}

export function subscribeWorkshopForm(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setWorkshopForm(form: WorkshopForm): void {
  cache = form;
  try {
    window.localStorage.setItem(STORAGE_KEY, form);
  } catch {
    // Privat läge eller full lagring: valet gäller ändå för besöket.
  }
  listeners.forEach((listener) => listener());
}

// ── Appmenyn (sidomenyn) ────────────────────────────────────────────────────
//
// Samma mönster: ihopfälld (bara ikoner) eller utfälld (med etiketter), sparat
// mellan besök. Servern och hydreringen ser ihopfälld.

const RAIL_KEY = "verkstad:meny";

export type RailState = "ihopfalld" | "utfalld";

let railCache: RailState | null = null;
const railListeners = new Set<() => void>();

export function getRailState(): RailState {
  if (railCache) return railCache;
  try {
    railCache = window.localStorage.getItem(RAIL_KEY) === "utfalld" ? "utfalld" : "ihopfalld";
  } catch {
    railCache = "ihopfalld";
  }
  return railCache;
}

export function getServerRailState(): RailState {
  return "ihopfalld";
}

export function subscribeRailState(onChange: () => void): () => void {
  railListeners.add(onChange);
  return () => railListeners.delete(onChange);
}

export function setRailState(state: RailState): void {
  railCache = state;
  try {
    window.localStorage.setItem(RAIL_KEY, state);
  } catch {
    // Privat läge eller full lagring: valet gäller ändå för besöket.
  }
  railListeners.forEach((listener) => listener());
}
