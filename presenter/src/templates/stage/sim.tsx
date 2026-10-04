"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useSceneReview } from "@/lib/share/scene-review";

/**
 * Simuleringar i tiopotenserna (visualiseringsprovet 1 oktober 2026). System som rör sig på
 * riktigt i en canvas över världen, i scenens koordinater (1600 × 900).
 *
 * Kontraktet:
 * - En värld är deterministisk (fröat slumptal), så samma läge ger samma bild.
 * - Stilla läge (bakåt, R, reducerad rörelse) och en dold sida ritar lägets färdiga bild direkt ur en
 *   uppvärmd värld. Framåt fortsätter världen där den var och tar emot lägets händelse.
 * - Färgerna läses ur scenens roller (--ai, --human, --alert, --ink …), så T fungerar.
 */

export const STAGE_W = 1600;
export const STAGE_H = 900;

export type Palette = {
  ai: string; human: string; alert: string; ink: string; muted: string; accent: string; bg: string;
  /** Mörk grund: ljus blandas additivt (sken). På ljus grund (T) ritas färgen vanligt. */
  dark: boolean;
};

export interface SimWorld {
  /** Nytt läge. instant: gå direkt till lägets färdiga bild (stilla, dold sida, första bilden). */
  setStep(step: number, instant: boolean): void;
  /** Flytta världen dt sekunder framåt. */
  tick(dt: number): void;
  /**
   * Rita i scenens koordinater. live: världen rör sig. full: canvasen är tom (ny storlek eller
   * nytt läge), så en värld som bygger sin bild över tid ska rita hela bilden.
   */
  draw(ctx: CanvasRenderingContext2D, palette: Palette, frame: { live: boolean; full: boolean }): void;
}

/** Fröat slumptal (mulberry32), så att samma värld blir likadan varje gång. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x: number) => { const v = clamp(x); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

let probe: CanvasRenderingContext2D | null = null;
/** En CSS-färg som canvasen förstår (#rrggbb eller rgba); okända värden ger reserven. */
function canvasColor(value: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  probe ??= document.createElement("canvas").getContext("2d");
  if (!probe) return fallback;
  probe.fillStyle = fallback;
  const base = String(probe.fillStyle);
  if (!value) return base;
  probe.fillStyle = value;
  return String(probe.fillStyle) || base;
}

/** Relativ luminans (0–1) ur canvasens färgformat. */
function luminance(color: string): number {
  const hex = color.startsWith("#") && color.length === 7 ? parseInt(color.slice(1), 16) : null;
  const m = hex === null ? color.match(/rgba?\(([^)]+)\)/) : null;
  const [r, g, b] = hex !== null ? [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] : m ? m[1].split(",").map(part => parseFloat(part)) : [0, 0, 0];
  const lin = (v: number) => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
}

export function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const role = (name: string, fallback: string) => canvasColor(css.getPropertyValue(name).trim(), fallback);
  const bg = role("--bg", "#05070a");
  return {
    ai: role("--ai", "#6ad4ff"), human: role("--human", "#ffb547"), alert: role("--alert", "#ff5a5f"),
    ink: role("--ink", "#f3efe7"), muted: role("--muted", "#a6abb5"), accent: role("--accent", "#ffe0a3"), bg,
    dark: luminance(bg) < .3,
  };
}

/** Samma färg med annan täckning. Tar canvasens egna format (#rrggbb, rgb, rgba). */
export function rgba(color: string, a: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color;
  const [r, g, b] = m[1].split(",").map(part => parseFloat(part));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/** Om sidan syns. Startar som synlig (samma som serverns rendering) och uppdateras sedan. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

/**
 * Adressens fält för granskning: granskningsvyns ram (?direkt=1) ska få lägets färdiga bild, så att
 * bilderna blir desamma varje gång, och ?simtid=2.5 ritar ett förlopp vid en viss sekund. Delas med
 * räknarna i formerna (forms.tsx), se lib/share/scene-review.ts.
 */
const useReviewParams = useSceneReview;

/**
 * Om förlopp ska spela: inte stilla, sidan syns och det är inte granskningsvyns ram. För inträden som
 * spelas med CSS (till exempel dragningskraften på affischväggen), där slutbilden är att inget syns.
 */
export function useMotionLive(still: boolean): boolean {
  const visible = usePageVisible();
  const review = useReviewParams();
  // ?simtid tvingar fram förloppet också med dold flik, för att kunna granska det.
  return !still && ((visible && !review.frame) || review.simtid !== null);
}

/**
 * Sekunder sedan läget började, för förlopp som räknas fram ur tiden (duken). Stilla läge och
 * en dold sida ger Infinity, alltså lägets färdiga bild. Klockan stannar vid until.
 */
export function useStepClock(step: number, still: boolean, until = 12): number {
  const visible = usePageVisible();
  const live = !still && visible;
  const [clock, setClock] = useState({ step, t: 0 });
  const review = useReviewParams();
  const running = live && !review.frame;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = Math.min(until, (now - start) / 1000);
      setClock({ step, t });
      if (t < until) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, step, until]);
  if (review.simtid !== null && !still) return review.simtid;
  if (!running) return Infinity;
  return clock.step === step ? clock.t : 0;
}

/**
 * Canvasen för en värld. create anropas för en ny värld; ge komponenten en key som byts när
 * världens fält ändras (antal, text), så att den byggs om. active: false stänger av slingan,
 * till exempel när lagret är dolt i ett annat steg.
 */
export function SimCanvas({ create, step, still, active = true, className, style }: {
  create: () => SimWorld; step: number; still: boolean; active?: boolean; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<SimWorld | null>(null);
  const last = useRef<{ step: number; live: boolean } | null>(null);
  const palette = useRef<{ value: Palette; frames: number } | null>(null);
  const visible = usePageVisible();
  const review = useReviewParams();
  const live = !still && visible && active && !review.frame;

  const paint = useCallback((isLive: boolean, forceFull = false) => {
    const canvas = ref.current, current = world.current;
    if (!canvas || !current) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * dpr)), h = Math.max(2, Math.round(rect.height * dpr));
    let full = forceFull;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; full = true; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!palette.current || palette.current.frames++ > 30) palette.current = { value: readPalette(canvas), frames: 0 };
    ctx.setTransform(w / STAGE_W, 0, 0, h / STAGE_H, 0, 0);
    current.draw(ctx, palette.current.value, { live: isLive, full });
  }, []);

  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { step, live };
    let full = false;
    if (review.simtid !== null && !still && active) {
      // Granskning av förlopp: lägets händelse från föregående läge, och sedan simtid sekunder framåt.
      world.current = create();
      if (step > 0) { world.current.setStep(step - 1, true); world.current.setStep(step, false); }
      else world.current.setStep(step, true);
      for (let i = 0; i < review.simtid * 60; i++) world.current.tick(1 / 60);
      palette.current = null;
      paint(true, true);
      return;
    }
    if (!world.current || !live) {
      world.current = create();
      world.current.setStep(step, true);
      full = true;
    } else if (prev && prev.step !== step) {
      world.current.setStep(step, false);
    }
    palette.current = null;
    paint(live, full);
  }, [step, live, create, paint, review.simtid, still, active]);

  useEffect(() => {
    if (!live) return;
    let frame = 0;
    let then = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.05, Math.max(0, (now - then) / 1000));
      then = now;
      world.current?.tick(dt);
      paint(true);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [live, paint]);

  useEffect(() => {
    const onResize = () => paint(live, true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [live, paint]);

  return <canvas ref={ref} className={className} style={style} aria-hidden="true" />;
}
