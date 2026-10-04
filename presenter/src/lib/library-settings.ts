/**
 * Startsidans egna inställningar: kort eller lista, sortering och om
 * sidofältets tagglista är utfälld. Sparas i webbläsaren.
 *
 * Samma mönster som oversikt-settings.ts: en liten extern butik som läses med
 * useSyncExternalStore. Servern och hydreringen ser alltid standardvärdena,
 * sedan tar de sparade över — ingen hydreringskrock, ingen setState i effekt.
 */

const STORAGE_KEY = "bibliotek:vy";

export type LibraryView = "cards" | "list";
export type LibrarySort = "changed" | "date" | "title";

export interface LibrarySettings {
  view: LibraryView;
  sort: LibrarySort;
  /** Omslagsbilder på korten. Av = snabbare på en långsam dator. */
  covers: boolean;
}

export const LIBRARY_DEFAULTS: LibrarySettings = { view: "cards", sort: "changed", covers: true };

let cache: LibrarySettings | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Partial<LibrarySettings> {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const out: Partial<LibrarySettings> = {};
  if (value.view === "cards" || value.view === "list") out.view = value.view;
  if (value.sort === "changed" || value.sort === "date" || value.sort === "title") out.sort = value.sort;
  if (typeof value.covers === "boolean") out.covers = value.covers;
  return out;
}

export function getLibrarySettings(): LibrarySettings {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...LIBRARY_DEFAULTS, ...sanitize(JSON.parse(raw)) } : LIBRARY_DEFAULTS;
  } catch {
    cache = LIBRARY_DEFAULTS;
  }
  return cache;
}

export function getServerLibrarySettings(): LibrarySettings {
  return LIBRARY_DEFAULTS;
}

export function subscribeLibrarySettings(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function updateLibrarySettings(patch: Partial<LibrarySettings>): void {
  cache = { ...getLibrarySettings(), ...sanitize({ ...getLibrarySettings(), ...patch }) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Privat läge eller full lagring: inställningen gäller ändå för besöket.
  }
  listeners.forEach((listener) => listener());
}
