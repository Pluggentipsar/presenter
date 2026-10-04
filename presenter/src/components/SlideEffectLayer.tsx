"use client";

/**
 * SlideEffectLayer — diskret animerad bakgrunds-effekt per slide.
 *
 * Ligger som ett absolut-positionerat lager mellan ev. slide-bakgrund
 * (z-0) och slide-content (z-10). Pointer-events:none så det aldrig
 * stör interaktion. Respekterar prefers-reduced-motion.
 *
 * 5 effekter att välja på — alla rör sig synligt men diskret nog att
 * inte konkurrera med innehållet:
 *  - dots     — pulserande pricknät som driver uppåt
 *  - flow     — drivande gradient-blobs i lava-lampa-stil
 *  - aurora   — norrsken-band som vågar vertikalt
 *  - grain    — animerad film-grain + drift
 *  - stardust — diagonalt rinnande stjärnstoff
 *
 * Färg kan väljas per slide via M-menyn. Default är temats accent-färg
 * (utläses från CSS-variabeln --accent vid mount).
 */

import { useEffect, useRef } from "react";

export type SlideEffect =
  | "dots"
  | "flow"
  | "aurora"
  | "grain"
  | "stardust"
  | "mesh"
  | "constellation"
  | "ribbon";

export const SLIDE_EFFECT_OPTIONS: Array<{
  id: SlideEffect;
  label: string;
  hint: string;
}> = [
  { id: "dots", label: "Pricknät", hint: "Pulserande dots — kontemplativt" },
  { id: "flow", label: "Flöde", hint: "Drivande färgblobs — mjukt" },
  { id: "aurora", label: "Norrsken", hint: "Vågande band — dramatiskt" },
  { id: "grain", label: "Korn", hint: "Filmkorn-noise — taktilt" },
  { id: "stardust", label: "Stjärnstoft", hint: "Diagonalt regn — avslut" },
  { id: "mesh", label: "Mesh", hint: "Kromatisk gradient-blandning — premium" },
  { id: "constellation", label: "Konstellation", hint: "Punkter + linjer — AI-feel" },
  { id: "ribbon", label: "Band", hint: "Silkesvågande färgband — elegant" },
];

/**
 * Färg-presets som visas i M-menyn. "auto" = använd temats --accent.
 */
export const SLIDE_EFFECT_COLOR_PRESETS: Array<{
  id: string;
  label: string;
  hex: string | null;
}> = [
  { id: "auto", label: "Tema", hex: null },
  { id: "rosa", label: "Rosa", hex: "#EF4F8F" },
  { id: "cyan", label: "Cyan", hex: "#22D3EE" },
  { id: "gron", label: "Grön", hex: "#22C55E" },
  { id: "guld", label: "Guld", hex: "#FFEA00" },
  { id: "lila", label: "Lila", hex: "#A855F7" },
  { id: "vit", label: "Vit", hex: "#F5F0E6" },
];

interface SlideEffectLayerProps {
  effect: SlideEffect;
  /** Hex-färg (#RRGGBB). Om utelämnad används temats --accent. */
  color?: string;
  /** Sänk intensiteten (t.ex. när M-menyn är öppen). Default 1. */
  intensity?: number;
  /** Användarvald opacity-multiplier 0.2-1.5. Default 1. */
  opacity?: number;
  /** Användarvald speed-multiplier 0.3-2.5. Default 1. */
  speed?: number;
}

export function SlideEffectLayer({
  effect,
  color,
  intensity = 1,
  opacity = 1,
  speed = 1,
}: SlideEffectLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const colorRef = useRef<RGB>({ r: 245, g: 240, b: 230 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Beräkna färg-RGB. Om ingen explicit color, läs --accent från
    // computed-style på document.documentElement (temats accent-färg).
    colorRef.current = resolveColor(color);

    // Reduced-motion check
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      drawStaticFallback(ctx, canvas, effect, colorRef.current);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initState(state, effect, width, height);
    };

    const state: EffectState = {
      kind: effect,
      t: 0,
      lastTime: performance.now(),
      dots: [],
      blobs: [],
      stars: [],
      grains: [],
      mesh: [],
      constPoints: [],
      ribbons: [],
    };

    initState(state, effect, 0, 0);
    resize();
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
      const dt = Math.min((now - state.lastTime) / 1000, 0.05);
      state.lastTime = now;
      // Speed-multiplier skalar tids-delta → all sin/cos/translation-rörelse
      // skalas proportionellt. 0.5 = halvfart, 2.0 = dubbel fart.
      state.t += dt * speedRef.current;
      // Effektiv intensitet = M-meny-dim × användarens opacity-val
      const effectiveIntensity = intensityRef.current * opacityRef.current;
      ctx.clearRect(0, 0, width, height);
      drawFrame(
        ctx,
        state,
        width,
        height,
        effectiveIntensity,
        colorRef.current,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [effect, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

// ============================================================================
// COLOR HELPERS
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

function resolveColor(input?: string): RGB {
  if (input) {
    const parsed = hexToRgb(input);
    if (parsed) return parsed;
  }
  // Default: läs CSS-variabeln --accent från :root
  if (typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    if (v) {
      const parsed = hexToRgb(v) ?? cssColorToRgb(v);
      if (parsed) return parsed;
    }
  }
  return { r: 245, g: 240, b: 230 }; // mjuk ljus-creme som fallback
}

function hexToRgb(hex: string): RGB | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function cssColorToRgb(css: string): RGB | null {
  // rgb(r, g, b) eller rgb(r g b) eller rgba(...)
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(css);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}

// HSL-rotation runt en grundfärg så multi-blob/aurora-effekter har
// kromatisk variation utan att tappa anknytning till basfärgen.
function rotateHue(c: RGB, deg: number): RGB {
  const { h, s, l } = rgbToHsl(c);
  return hslToRgb({ h: (h + deg + 360) % 360, s, l });
}

interface HSL {
  h: number;
  s: number;
  l: number;
}
function rgbToHsl(c: RGB): HSL {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h, s, l };
}
function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ============================================================================
// EFFECT STATE & RENDERING
// ============================================================================

interface Dot {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}
interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hueOffset: number;
}
interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}
interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface MeshCenter {
  baseX: number;
  baseY: number;
  ox: number;
  oy: number;
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
  hueOffset: number;
  r: number;
}

interface ConstPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface RibbonLayer {
  amp: number;
  freq: number;
  speed: number;
  thickness: number;
  yBase: number;
  hueOffset: number;
  alpha: number;
}

interface EffectState {
  kind: SlideEffect;
  t: number;
  lastTime: number;
  dots: Dot[];
  blobs: Blob[];
  stars: Star[];
  grains: Grain[];
  mesh: MeshCenter[];
  constPoints: ConstPoint[];
  ribbons: RibbonLayer[];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function initState(
  state: EffectState,
  effect: SlideEffect,
  w: number,
  h: number,
): void {
  state.dots = [];
  state.blobs = [];
  state.stars = [];
  state.grains = [];
  state.mesh = [];
  state.constPoints = [];
  state.ribbons = [];
  if (effect === "dots") {
    const count = Math.max(50, Math.round((w * h) / 16000));
    for (let i = 0; i < count; i++) {
      state.dots.push({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(1.2, 3),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.8, 1.8),
      });
    }
  } else if (effect === "flow") {
    const count = 5;
    for (let i = 0; i < count; i++) {
      state.blobs.push({
        x: rand(0, w || 1280),
        y: rand(0, h || 720),
        vx: rand(-40, 40),
        vy: rand(-30, 30),
        r: rand(240, 420),
        hueOffset: rand(-50, 50),
      });
    }
  } else if (effect === "grain") {
    // Drifting blobbar av "stoft" — ger känsla av film-grain som "andas"
    const count = Math.max(80, Math.round((w * h) / 12000));
    for (let i = 0; i < count; i++) {
      state.grains.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-8, 8),
        vy: rand(-8, 8),
        life: rand(0, 3),
        maxLife: rand(2, 4.5),
      });
    }
  } else if (effect === "mesh") {
    // 5 färgcentra placerade i ett grid med slumpvis-offset, varje
    // rör sig långsamt enligt egen sinusfrekvens. Färgerna skiftar i
    // HSL-rymden runt grundfärgen. Mer kromatiskt än "flow" eftersom
    // gradient-radien är större och centra:n är fler.
    const ww = w || 1280;
    const hh = h || 720;
    for (let i = 0; i < 5; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      state.mesh.push({
        baseX: (col + 0.5) * (ww / 3) + rand(-ww * 0.1, ww * 0.1),
        baseY: (row + 0.5) * (hh / 2) + rand(-hh * 0.1, hh * 0.1),
        ox: rand(80, 180),
        oy: rand(60, 140),
        freqX: rand(0.15, 0.35),
        freqY: rand(0.12, 0.28),
        phaseX: rand(0, Math.PI * 2),
        phaseY: rand(0, Math.PI * 2),
        hueOffset: i * 50 + rand(-20, 20),
        r: rand(ww * 0.35, ww * 0.55),
      });
    }
  } else if (effect === "constellation") {
    // Punkter i en löst spridd graf som rör sig långsamt. Linjer ritas
    // dynamiskt mellan närbeliggande punkter med opacity baserad på
    // avstånd. Den AI-/data-grafiska estetiken folk associerar med
    // "neuralt nätverk" eller "interaktiv visualisering".
    const ww = w || 1280;
    const hh = h || 720;
    const count = Math.max(30, Math.round((ww * hh) / 22000));
    for (let i = 0; i < count; i++) {
      state.constPoints.push({
        x: rand(0, ww),
        y: rand(0, hh),
        vx: rand(-25, 25),
        vy: rand(-25, 25),
      });
    }
  } else if (effect === "ribbon") {
    // Tre band med olika frekvens, amplitud och färg-skift. Det
    // bakersta är subtilast och tjockast, det främsta tunnast och
    // mest synligt — ger parallax-djup som ett ridå-skikt.
    const hh = h || 720;
    state.ribbons.push({
      amp: hh * 0.18,
      freq: 0.0025,
      speed: 0.4,
      thickness: hh * 0.22,
      yBase: hh * 0.55,
      hueOffset: -30,
      alpha: 0.16,
    });
    state.ribbons.push({
      amp: hh * 0.14,
      freq: 0.0034,
      speed: 0.6,
      thickness: hh * 0.13,
      yBase: hh * 0.45,
      hueOffset: 0,
      alpha: 0.22,
    });
    state.ribbons.push({
      amp: hh * 0.1,
      freq: 0.0045,
      speed: 0.85,
      thickness: hh * 0.07,
      yBase: hh * 0.5,
      hueOffset: 35,
      alpha: 0.32,
    });
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  intensity: number,
  color: RGB,
): void {
  const dimmer = Math.max(0.15, Math.min(1, intensity));
  switch (state.kind) {
    case "dots":
      drawDots(ctx, state, w, h, dimmer, color);
      break;
    case "flow":
      drawFlow(ctx, state, w, h, dimmer, color);
      break;
    case "aurora":
      drawAurora(ctx, state, w, h, dimmer, color);
      break;
    case "grain":
      drawGrain(ctx, state, w, h, dimmer, color);
      break;
    case "stardust":
      drawStardust(ctx, state, w, h, dimmer, color);
      break;
    case "mesh":
      drawMesh(ctx, state, w, h, dimmer, color);
      break;
    case "constellation":
      drawConstellation(ctx, state, w, h, dimmer, color);
      break;
    case "ribbon":
      drawRibbon(ctx, state, w, h, dimmer, color);
      break;
  }
}

// ----- DOTS -----------------------------------------------------------------
function drawDots(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.dots.length === 0 && w > 0 && h > 0) {
    initState(state, "dots", w, h);
  }
  for (const d of state.dots) {
    // Drift uppåt + lätt sidleds-svaj
    d.y -= d.speed * 0.5;
    d.x += Math.sin(state.t * d.speed + d.phase) * 0.15;
    if (d.y < -10) {
      d.y = h + 10;
      d.x = rand(0, w);
    }
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(state.t * d.speed * 2 + d.phase));
    const alpha = 0.55 * pulse * dim;
    ctx.fillStyle = rgba(color, alpha);
    ctx.shadowBlur = 10;
    ctx.shadowColor = rgba(color, 0.6);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ----- FLOW (gradient-blobs) ------------------------------------------------
function drawFlow(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.blobs.length === 0 && w > 0 && h > 0) {
    initState(state, "flow", w, h);
  }
  const dt = 1 / 60;
  for (const b of state.blobs) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -b.r * 0.5 || b.x > w + b.r * 0.5) b.vx *= -1;
    if (b.y < -b.r * 0.5 || b.y > h + b.r * 0.5) b.vy *= -1;
    b.hueOffset = ((b.hueOffset + 15 * dt) % 360);

    // Variera färgen runt grundfärgen för att få lava-lampa-kromatik
    const blobColor = rotateHue(color, b.hueOffset);
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, rgba(blobColor, 0.32 * dim));
    grad.addColorStop(0.55, rgba(blobColor, 0.1 * dim));
    grad.addColorStop(1, rgba(blobColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
}

// ----- AURORA ---------------------------------------------------------------
function drawAurora(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  const t = state.t;
  const bands = [
    { y: h * 0.22, amp: h * 0.1, freq: 0.0038, speed: 0.7, hueShift: 0, alpha: 0.28 },
    { y: h * 0.42, amp: h * 0.14, freq: 0.0032, speed: 1.0, hueShift: 60, alpha: 0.22 },
    { y: h * 0.62, amp: h * 0.12, freq: 0.0046, speed: 0.85, hueShift: -45, alpha: 0.18 },
  ];

  for (const band of bands) {
    const bandColor = rotateHue(color, band.hueShift);
    ctx.beginPath();
    const startY = band.y + Math.sin(t * band.speed) * band.amp * 0.3;
    ctx.moveTo(0, startY);
    for (let x = 0; x <= w; x += 10) {
      const y =
        band.y +
        Math.sin(x * band.freq + t * band.speed) * band.amp +
        Math.sin(x * band.freq * 2 + t * band.speed * 1.6) * band.amp * 0.45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, band.y - band.amp, 0, band.y + h);
    grad.addColorStop(0, rgba(bandColor, band.alpha * dim));
    grad.addColorStop(1, rgba(bandColor, 0));
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ----- GRAIN ----------------------------------------------------------------
function drawGrain(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.grains.length === 0 && w > 0 && h > 0) {
    initState(state, "grain", w, h);
  }
  const dt = 1 / 60;
  for (const g of state.grains) {
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.life += dt;
    if (
      g.life > g.maxLife ||
      g.x < -5 ||
      g.x > w + 5 ||
      g.y < -5 ||
      g.y > h + 5
    ) {
      g.x = rand(0, w);
      g.y = rand(0, h);
      g.vx = rand(-8, 8);
      g.vy = rand(-8, 8);
      g.life = 0;
      g.maxLife = rand(2, 4.5);
    }
    const lifeRatio = g.life / g.maxLife;
    const fade =
      lifeRatio < 0.2
        ? lifeRatio / 0.2
        : lifeRatio > 0.8
          ? (1 - lifeRatio) / 0.2
          : 1;
    const alpha = 0.18 * fade * dim;
    ctx.fillStyle = rgba(color, alpha);
    ctx.fillRect(g.x, g.y, 1.5, 1.5);
  }
  // Plus en gles slumpvis noise-stänk per frame för extra "grain"-känsla
  ctx.fillStyle = rgba(color, 0.04 * dim);
  const density = Math.round((w * h) / 4500);
  for (let i = 0; i < density; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
}

// ----- STARDUST -------------------------------------------------------------
function drawStardust(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  // Tätare spawn för synligare regn
  const spawnChance = w > 0 ? 0.75 : 0;
  if (Math.random() < spawnChance) {
    state.stars.push({
      x: rand(-50, w + 50),
      y: -20,
      vx: rand(30, 90),
      vy: rand(80, 180),
      life: 0,
      maxLife: rand(1.4, 2.8),
    });
  }
  const dt = 1 / 60;
  for (let i = state.stars.length - 1; i >= 0; i--) {
    const s = state.stars[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life += dt;
    if (s.life > s.maxLife || s.y > h + 50 || s.x > w + 50) {
      state.stars.splice(i, 1);
      continue;
    }
    const lifeRatio = 1 - s.life / s.maxLife;
    const fade = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
    const alpha = 0.7 * fade * dim;
    const len = 12;
    const angle = Math.atan2(s.vy, s.vx);
    const tailX = s.x - Math.cos(angle) * len;
    const tailY = s.y - Math.sin(angle) * len;
    const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(1, rgba(color, alpha));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
}

// ----- MESH (kromatisk gradient-mesh) ---------------------------------------
function drawMesh(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.mesh.length === 0 && w > 0 && h > 0) {
    initState(state, "mesh", w, h);
  }
  // Använd "lighter" blend så färger adderar sig vackert istället för
  // att tona ner varandra. Ger den karakteristiska "neon-mesh"-känslan.
  const prevBlend = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";

  for (const m of state.mesh) {
    const cx = m.baseX + Math.sin(state.t * m.freqX + m.phaseX) * m.ox;
    const cy = m.baseY + Math.cos(state.t * m.freqY + m.phaseY) * m.oy;
    // Färgskift över tid + per-centra offset → kromatisk variation
    const hueShift = m.hueOffset + state.t * 12;
    const c1 = rotateHue(color, hueShift);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, m.r);
    grad.addColorStop(0, rgba(c1, 0.42 * dim));
    grad.addColorStop(0.45, rgba(c1, 0.16 * dim));
    grad.addColorStop(1, rgba(c1, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - m.r, cy - m.r, m.r * 2, m.r * 2);
  }
  ctx.globalCompositeOperation = prevBlend;
}

// ----- CONSTELLATION (punkter + dynamiska linjer) --------------------------
function drawConstellation(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.constPoints.length === 0 && w > 0 && h > 0) {
    initState(state, "constellation", w, h);
  }
  const dt = 1 / 60;
  // Avståndströskeln för linjer — skala med viewport-bredd så
  // konstellationen ser konsekvent ut i olika fönsterstorlekar.
  const threshold = Math.max(120, Math.min(w, h) * 0.18);

  // Uppdatera positioner + wrap vid kanter
  for (const p of state.constPoints) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < -10) p.x = w + 10;
    else if (p.x > w + 10) p.x = -10;
    if (p.y < -10) p.y = h + 10;
    else if (p.y > h + 10) p.y = -10;
  }

  // Rita linjer mellan närbeliggande punkter (O(n²) men n är ~30-60 så OK).
  // Linjernas opacity faller av med avstånd → "magnetfält"-känsla.
  const pts = state.constPoints;
  ctx.lineCap = "round";
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > threshold) continue;
      const t = 1 - dist / threshold;
      const alpha = 0.35 * t * t * dim;
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = 0.7 + t * 0.6;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }
  }

  // Rita punkterna ovanpå linjerna
  ctx.shadowBlur = 8;
  ctx.shadowColor = rgba(color, 0.6);
  for (const p of pts) {
    const pulse = 0.7 + 0.3 * Math.sin(state.t * 2 + p.x * 0.01);
    ctx.fillStyle = rgba(color, 0.85 * pulse * dim);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ----- RIBBON (parallax-band med silke-feel) -------------------------------
function drawRibbon(
  ctx: CanvasRenderingContext2D,
  state: EffectState,
  w: number,
  h: number,
  dim: number,
  color: RGB,
): void {
  if (state.ribbons.length === 0 && h > 0) {
    initState(state, "ribbon", w, h);
  }
  const t = state.t;

  for (const r of state.ribbons) {
    const bandColor = rotateHue(color, r.hueOffset);
    // Bygg band-path: överkant och underkant följer två sinus-vågor
    // med liten fas-skillnad → bandet "tjocknar" och "tunnar" längs sin
    // längd som silke i vinden.
    ctx.beginPath();
    const step = 8;
    // Överkant (vänster → höger)
    for (let x = 0; x <= w; x += step) {
      const yMid =
        r.yBase +
        Math.sin(x * r.freq + t * r.speed) * r.amp +
        Math.sin(x * r.freq * 2.3 + t * r.speed * 1.5) * r.amp * 0.35;
      const thickHere =
        r.thickness *
        (0.7 + 0.3 * Math.sin(x * r.freq * 1.4 + t * r.speed * 0.8));
      if (x === 0) ctx.moveTo(x, yMid - thickHere / 2);
      else ctx.lineTo(x, yMid - thickHere / 2);
    }
    // Underkant (höger → vänster)
    for (let x = w; x >= 0; x -= step) {
      const yMid =
        r.yBase +
        Math.sin(x * r.freq + t * r.speed) * r.amp +
        Math.sin(x * r.freq * 2.3 + t * r.speed * 1.5) * r.amp * 0.35;
      const thickHere =
        r.thickness *
        (0.7 + 0.3 * Math.sin(x * r.freq * 1.4 + t * r.speed * 0.8));
      ctx.lineTo(x, yMid + thickHere / 2);
    }
    ctx.closePath();

    // Gradient över bandet — ger silke/oljig-yt-känsla
    const grad = ctx.createLinearGradient(0, r.yBase - r.thickness, 0, r.yBase + r.thickness);
    grad.addColorStop(0, rgba(bandColor, 0));
    grad.addColorStop(0.5, rgba(bandColor, r.alpha * dim));
    grad.addColorStop(1, rgba(bandColor, 0));
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ----- STATIC FALLBACK för reduced-motion ----------------------------------
function drawStaticFallback(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  effect: SlideEffect,
  color: RGB,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  if (effect === "dots") {
    ctx.fillStyle = rgba(color, 0.25);
    for (let i = 0; i < 40; i++) {
      const x = ((i * 73) % w) | 0;
      const y = ((i * 137) % h) | 0;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effect === "flow" || effect === "aurora") {
    const c2 = rotateHue(color, 60);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, rgba(color, 0.12));
    grad.addColorStop(1, rgba(c2, 0.08));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (effect === "stardust") {
    ctx.strokeStyle = rgba(color, 0.35);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 25; i++) {
      const x = ((i * 89) % w) | 0;
      const y = ((i * 53) % h) | 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14, y + 14);
      ctx.stroke();
    }
  } else if (effect === "mesh") {
    // Statisk mesh-gradient
    const positions = [
      { x: w * 0.25, y: h * 0.3, hue: 0 },
      { x: w * 0.7, y: h * 0.25, hue: 60 },
      { x: w * 0.5, y: h * 0.7, hue: 120 },
      { x: w * 0.85, y: h * 0.75, hue: -45 },
    ];
    const prevBlend = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const p of positions) {
      const c = rotateHue(color, p.hue);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * 0.4);
      grad.addColorStop(0, rgba(c, 0.35));
      grad.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = prevBlend;
  } else if (effect === "constellation") {
    // Spritt nätverk av punkter + valda linjer
    const seedPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 25; i++) {
      seedPts.push({ x: ((i * 73) % w) | 0, y: ((i * 137) % h) | 0 });
    }
    ctx.strokeStyle = rgba(color, 0.18);
    ctx.lineWidth = 0.6;
    for (let i = 0; i < seedPts.length; i++) {
      for (let j = i + 1; j < seedPts.length; j++) {
        const dx = seedPts[i].x - seedPts[j].x;
        const dy = seedPts[i].y - seedPts[j].y;
        if (dx * dx + dy * dy < 22000) {
          ctx.beginPath();
          ctx.moveTo(seedPts[i].x, seedPts[i].y);
          ctx.lineTo(seedPts[j].x, seedPts[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = rgba(color, 0.7);
    for (const p of seedPts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effect === "ribbon") {
    // Tre statiska bands
    const c1 = rotateHue(color, -30);
    const c2 = color;
    const c3 = rotateHue(color, 35);
    [c1, c2, c3].forEach((c, idx) => {
      const yMid = h * 0.45 + idx * h * 0.08;
      const grad = ctx.createLinearGradient(0, yMid - h * 0.15, 0, yMid + h * 0.15);
      grad.addColorStop(0, rgba(c, 0));
      grad.addColorStop(0.5, rgba(c, 0.22 - idx * 0.04));
      grad.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, yMid - h * 0.15, w, h * 0.3);
    });
  } else {
    ctx.fillStyle = rgba(color, 0.08);
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(((i * 137) % w) | 0, ((i * 79) % h) | 0, 1.5, 1.5);
    }
  }
}
