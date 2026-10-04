/**
 * Joels egna inställningar i studions översikt: hur breda miniatyrerna är, om
 * bilderna visas och om dolda slides är med. Sparas i webbläsaren och gäller
 * alla föreläsningar.
 *
 * Samma mönster som share/reader-settings.ts: en liten extern butik som läses
 * med useSyncExternalStore. Servern och hydreringen ser alltid standardvärdena,
 * sedan tar de sparade över — ingen hydreringskrock, ingen setState i effekt.
 */

const STORAGE_KEY = "studio:oversikt";

export interface OversiktSettings {
  /** Miniatyrens bredd i pixlar. Linjen mellan bild och text drar i den här. */
  thumb: number;
  /** "Med bilder" (sant) eller "Bara tråden". */
  images: boolean;
  /** Visas dolda slides i listan? */
  showHidden: boolean;
}

export const THUMB_MIN = 72;
/** Miniatyrerna fångas i 640 × 360. Större än så blir de bara suddigare. */
export const THUMB_MAX = 640;
export const THUMB_DEFAULT = 116;
/** Från den här bredden får texten radbrytas och ligga i överkant, som ett kort. */
export const THUMB_LARGE = 220;
export const THUMB_STEP = 48;

export const OVERSIKT_DEFAULTS: OversiktSettings = { thumb: THUMB_DEFAULT, images: true, showHidden: true };

let cache: OversiktSettings | null = null;
const listeners = new Set<() => void>();

export function clampThumb(value: number): number {
  return Math.round(Math.max(THUMB_MIN, Math.min(THUMB_MAX, value)));
}

function sanitize(raw: unknown): Partial<OversiktSettings> {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const out: Partial<OversiktSettings> = {};
  if (typeof value.thumb === "number" && Number.isFinite(value.thumb)) out.thumb = clampThumb(value.thumb);
  if (typeof value.images === "boolean") out.images = value.images;
  if (typeof value.showHidden === "boolean") out.showHidden = value.showHidden;
  return out;
}

export function getOversiktSettings(): OversiktSettings {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...OVERSIKT_DEFAULTS, ...sanitize(JSON.parse(raw)) } : OVERSIKT_DEFAULTS;
  } catch {
    cache = OVERSIKT_DEFAULTS;
  }
  return cache;
}

export function getServerOversiktSettings(): OversiktSettings {
  return OVERSIKT_DEFAULTS;
}

export function subscribeOversiktSettings(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function updateOversiktSettings(patch: Partial<OversiktSettings>): void {
  cache = { ...getOversiktSettings(), ...sanitize({ ...getOversiktSettings(), ...patch }) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Privat läge eller full lagring: inställningen gäller ändå för besöket.
  }
  listeners.forEach((listener) => listener());
}
