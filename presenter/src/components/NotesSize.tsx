"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Manusets textstorlek (Joel 1 oktober 2026: förstora texten i presentatörsläget).
 * Stegen är i px. Storleken sparas i webbläsaren eller appen per vy, så att
 * presentatörsfönstret och N-rutan kan ha olika storlek. + och − stegar, 0
 * återställer.
 *
 * Samma mönster som workshop-settings.ts: en liten extern butik som läses med
 * useSyncExternalStore. Servern och hydreringen ser standardstorleken, sedan tar
 * den sparade över.
 */
const SIZES = [16, 18, 20, 23, 26, 30, 34, 40, 46, 54, 62];

type View = "presenter" | "overlay";
const DEFAULTS: Record<View, number> = { presenter: 20, overlay: 18 };
const cache: Partial<Record<View, number>> = {};
const listeners = new Set<() => void>();
const storageKey = (view: View) => `presenter:manus-storlek:${view}`;

function readSize(view: View): number {
  const cached = cache[view];
  if (cached !== undefined) return cached;
  let size = DEFAULTS[view];
  try {
    const saved = Number(window.localStorage.getItem(storageKey(view)));
    if (SIZES.includes(saved)) size = saved;
  } catch {
    // Privat läge eller blockerad lagring: standardstorleken gäller.
  }
  cache[view] = size;
  return size;
}

function writeSize(view: View, size: number): void {
  cache[view] = size;
  try {
    window.localStorage.setItem(storageKey(view), String(size));
  } catch {
    // Storleken gäller ändå i det här fönstret.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export type NotesSize = { size: number; step: (direction: 1 | -1 | 0) => void };

export function useNotesSize(view: View): NotesSize {
  const size = useSyncExternalStore(subscribe, () => readSize(view), () => DEFAULTS[view]);
  const step = useCallback((direction: 1 | -1 | 0) => {
    const fallback = DEFAULTS[view];
    const at = SIZES.indexOf(size);
    const from = at < 0 ? SIZES.indexOf(fallback) : at;
    writeSize(view, direction === 0 ? fallback : SIZES[Math.min(SIZES.length - 1, Math.max(0, from + direction))]);
  }, [size, view]);
  return { size, step };
}

/** + och − (utan Ctrl, så att webbläsarens zoom fungerar som vanligt) och 0 för att återställa. */
export function notesSizeKey(e: KeyboardEvent, notes: NotesSize): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const direction = e.key === "+" || e.key === "=" ? 1 : e.key === "-" || e.key === "_" ? -1 : e.key === "0" ? 0 : null;
  if (direction === null) return false;
  e.preventDefault();
  notes.step(direction);
  return true;
}

export function NotesSizeControl({ notes }: { notes: NotesSize }) {
  const button = "rounded-md border border-white/10 px-2 py-0.5 font-semibold normal-case tracking-normal text-text-muted transition-colors hover:border-accent hover:text-accent";
  return (
    <span className="flex items-center gap-1.5">
      <button type="button" onClick={() => notes.step(-1)} className={button} title="Mindre text (−)" aria-label="Mindre manustext">A−</button>
      <span className="w-12 text-center normal-case tracking-normal tabular-nums">{notes.size} px</span>
      <button type="button" onClick={() => notes.step(1)} className={button} title="Större text (+)" aria-label="Större manustext">A+</button>
    </span>
  );
}
