/**
 * Läsarens egna inställningar i läsläget: mittlinjens läge, textstorlek,
 * "bara text" och fokustoning. Sparas i webbläsaren och gäller alla delade
 * föreläsningar.
 *
 * Samma mönster som manus-layers.ts: en liten extern butik som läses med
 * useSyncExternalStore. Servern och hydreringen ser alltid standardvärdena,
 * sedan tar de sparade över — ingen hydreringskrock, ingen setState i effekt.
 */

const STORAGE_KEY = "delning:las";

export interface ReaderSettings {
  /** Slidens andel av bredden i procent (dator). */
  split: number;
  /** Multiplikator för brödtextens storlek. */
  scale: number;
  /** "split" = bild + text, "text" = bara text. */
  layout: "split" | "text";
  /** Tona ner text som inte hör till aktuell slide. */
  focus: boolean;
}

export const SPLIT_MIN = 32;
export const SPLIT_MAX = 76;
export const SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.5, 1.75] as const;

export const READER_DEFAULTS: ReaderSettings = { split: 61, scale: 1, layout: "split", focus: true };

let cache: ReaderSettings | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Partial<ReaderSettings> {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const out: Partial<ReaderSettings> = {};
  if (typeof value.split === "number" && Number.isFinite(value.split))
    out.split = Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, value.split));
  if (typeof value.scale === "number" && (SCALE_STEPS as readonly number[]).includes(value.scale))
    out.scale = value.scale;
  if (value.layout === "split" || value.layout === "text") out.layout = value.layout;
  if (typeof value.focus === "boolean") out.focus = value.focus;
  return out;
}

export function getReaderSettings(): ReaderSettings {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...READER_DEFAULTS, ...sanitize(JSON.parse(raw)) } : READER_DEFAULTS;
  } catch {
    cache = READER_DEFAULTS;
  }
  return cache;
}

export function getServerReaderSettings(): ReaderSettings {
  return READER_DEFAULTS;
}

export function subscribeReaderSettings(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function updateReaderSettings(patch: Partial<ReaderSettings>): void {
  cache = { ...getReaderSettings(), ...sanitize({ ...getReaderSettings(), ...patch }) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Privat läge eller full lagring: inställningen gäller ändå för besöket.
  }
  listeners.forEach((listener) => listener());
}

export function stepReaderScale(direction: 1 | -1): void {
  const current = getReaderSettings().scale;
  const index = SCALE_STEPS.findIndex((step) => step === current);
  const next = SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, (index < 0 ? 1 : index) + direction))];
  updateReaderSettings({ scale: next });
}
