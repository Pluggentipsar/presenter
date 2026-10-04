"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { FormProps } from "./forms";
import { seeded, useTone } from "./kit";
import { EXPONENT, SKALA_LEVELS, placeLevels } from "./skala";
import { clamp, ease, readPalette, rgba, smooth, useStepClock, type Palette } from "./sim";
import b from "./bryggfilm.module.css";
import st from "./stage.module.css";

/**
 * Bryggfilmen (3 oktober 2026). Joel: ”tre fyra bryggor som är liksom som en film … som funkar som
 * övergångar mellan sektioner. De ska vara sinnessjukt snygga, kanske 15–20 s långa, och jag kan prata
 * under tiden.” Formen brygga spelar en sådan film när fältet film är satt.
 *
 * Filmen har fem rörelser:
 * 1. Ett litet fönster med Eames-hörn spricker upp till hela bilden, ur portalens ruta.
 * 2. Kameran flyger genom tiopotenserna: fartstrimmor, ramen runt nästa nivå och skalmätaren som räkneverk.
 * 3. Nästa dels motiv (fältet film): nio, tre, pixlar eller vecka.
 * 4. Världen dras ihop till portalen igen. Nästa slide öppnas ur den (inkomst="portal").
 * 5. Delens namn reser sig bokstav för bokstav, en hårlinje leder till portalen och färdkartan löper
 *    fram till nästa del. Sedan står bilden kvar så länge Joel pratar.
 *
 * Allt räknas fram ur tiden, så varje bildruta blir densamma varje gång. Stilla lägen (bakåt, R,
 * granskningen, reducerad rörelse) visar slutbilden, ?simtid=8 sekund 8, och med ?filmfangst=1 spelar
 * scripts/film-fanga.mjs in filmen bildruta för bildruta.
 *
 * Motiven (texterna i filmText, skilj med |):
 * - nio: dyket från planeten ned under bildpunkterna och tillbaka. Exemplen fylls i en liggare när
 *   kameran passerar deras tiopotens (filmNivaer).
 * - tre: tre saker på samma bord. Kameran söker upp dem en i taget och märker dem 01–03
 *   (filmPunkter: x,y|x,y|x,y i scenens pixlar; filmText ger valfria namn bredvid numren).
 * - pixlar: rubriken byggs av skärmens bildpunkter. AI-pekarna (alla namn utom det sista) ritar, och
 *   människan (det sista namnet) tar markeringen.
 * - vecka: skolan i tidsförlopp, fem skoldagar med molnskuggor och en klocka (filmDagar).
 * - ja: bara resan.
 */

const W = 1600, H = 900;
/** Portalen: samma ruta som nästa slides inträde (skala.module.css, .portalIn). */
const PORTAL = { x: 1014, y: 356, w: 192, h: 108 };
const PORTAL_MID = { x: PORTAL.x + PORTAL.w / 2, y: PORTAL.y + PORTAL.h / 2 };
const MAX_P = SKALA_LEVELS[0].p;
const MIN_P = SKALA_LEVELS[SKALA_LEVELS.length - 1].p;

type Motif = "nio" | "tre" | "pixlar" | "vecka" | "ja";
const MOTIFS: readonly string[] = ["nio", "tre", "pixlar", "vecka", "ja"];
interface Plan {
  /** Filmens längd i sekunder. Därefter står slutbilden. */
  length: number;
  /** När världen börjar dras ihop till portalen. */
  collapse: number;
  /** Resan genom tiopotenserna (start, slut). */
  zoom: [number, number];
}
const PLANS: Record<Motif, Plan> = {
  nio: { length: 17, collapse: 12.2, zoom: [1.2, 12] },
  tre: { length: 15.5, collapse: 10.6, zoom: [1.2, 4.6] },
  pixlar: { length: 16.5, collapse: 11.4, zoom: [1.2, 3.8] },
  vecka: { length: 17.5, collapse: 12.6, zoom: [1.2, 6.6] },
  ja: { length: 11, collapse: 6.8, zoom: [1.2, 6] },
};
/** nio: dyket till bildpunkterna, djupet under dem (där bara mätaren går vidare) och vägen tillbaka. */
const NIO = { dive: [1.2, 7.4], deep: [7.4, 9], back: [9.6, 12] } as const;
/** tre: kameran söker upp ett märke i taget och drar sig sedan tillbaka till hela bordet. */
const TRE = { first: 4.9, every: 1.4, move: .7, back: [9.1, 9.7], push: 1.32, pull: .35 } as const;
const TRE_POINTS: [number, number][] = [[1417, 633], [833, 175], [808, 567]];
/** pixlar: gittret, agenternas ritande och människans markering. */
const PIX = { grid: [3.6, 4.6], draw: [5, 9.4], enter: [9.6, 10.05], drag: [10.05, 10.75] } as const;
/** vecka: tidsförloppet (en skoldag per sekund) och skoldagen på klockan. */
const VECKA = { lapse: [7.2, 12.2], open: 8 * 60, close: 16 * 60 } as const;

/* ── tiden ─────────────────────────────────────────────────────────────── */

const seg = (t: number, a: number, z: number) => clamp((t - a) / (z - a));
const outExpo = (x: number) => { const v = clamp(x); return v >= 1 ? 1 : 1 - 2 ** (-10 * v); };
/** Jämn fart genom tiopotenserna, som i Eames film, med mjuk start och landning. */
const cruise = (x: number, a = .2) => {
  const v = clamp(x), k = 1 / (2 * a * (1 - a));
  return v < a ? v * v * k : v > 1 - a ? 1 - (1 - v) ** 2 * k : (v - a / 2) / (1 - a);
};
const frac = (x: number) => x - Math.floor(x);
const pad = (n: number) => String(n).padStart(2, "0");
const list = (value: string) => value.split("|").map(part => part.trim()).filter(Boolean);
const exponentOf = (value: string, fallback: number) => {
  const n = Math.round(Number(value.replace("−", "-")));
  return Number.isFinite(n) && value.trim() !== "" ? n : fallback;
};
const pointsOf = (value: string): [number, number][] => list(value).map(pair => pair.split(",").map(Number) as [number, number])
  .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
/** Förändring per sekund, för fartstrimmorna. */
const rate = (f: (t: number) => number, t: number) => (f(t + .02) - f(t - .02)) / .04;

/**
 * Inspelningen (scripts/film-fanga.mjs): med ?filmfangst=1 sätter skriptet tiden med händelsen filmtid
 * och läser filmens längd i window.__filmLangd.
 */
function useCaptureTime(length: number): number | null {
  const [time, setTime] = useState<number | null>(null);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("filmfangst")) return;
    const on = (event: Event) => setTime(Number((event as CustomEvent<number>).detail));
    window.addEventListener("filmtid", on);
    Object.assign(window, { __filmRedo: true, __filmLangd: length });
    return () => window.removeEventListener("filmtid", on);
  }, [length]);
  return time;
}

interface Camera { z: number; hud: number; back: boolean }

/** Var kameran är: z för bilderna (−2 till 7), hud för skalmätaren (som kan gå djupare än bilderna). */
function cameraAt(t: number, motif: Motif, plan: Plan, from: number, end: number, deepest: number): Camera {
  if (motif === "nio") {
    if (t >= NIO.back[0]) {
      const hud = deepest + (end - deepest) * ease(seg(t, NIO.back[0], NIO.back[1]));
      return { z: clamp(hud, MIN_P, MAX_P), hud, back: true };
    }
    if (t >= NIO.deep[0]) return { z: MIN_P, hud: MIN_P + (deepest - MIN_P) * ease(seg(t, NIO.deep[0], NIO.deep[1])), back: false };
    const z = from + (MIN_P - from) * cruise(seg(t, NIO.dive[0], NIO.dive[1]));
    return { z, hud: z, back: false };
  }
  const z = from + (end - from) * ease(seg(t, plan.zoom[0], plan.zoom[1]));
  return { z, hud: z, back: false };
}

/* ── tre: kameran inom bordet ─────────────────────────────────────────── */

type Pose = { s: number; x: number; y: number };
const IDENTITY: Pose = { s: 1, x: 0, y: 0 };
const mix = (a: Pose, c: Pose, k: number): Pose => ({ s: a.s + (c.s - a.s) * k, x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k });
/** Närbilden på ett märke: lite större, märket en bit mot mitten, och bilden täcker alltid hela ytan. */
function poseFor([px, py]: [number, number]): Pose {
  const s = TRE.push;
  const sx = px + (W / 2 - px) * TRE.pull, sy = py + (H / 2 - py) * TRE.pull;
  return { s, x: clamp(sx - px * s, W - W * s, 0), y: clamp(sy - py * s, H - H * s, 0) };
}
function treCamera(t: number, points: [number, number][]) {
  const poses = points.map(poseFor);
  let pose = IDENTITY;
  let spot = points[0] ?? [W / 2, H / 2];
  points.forEach((point, i) => {
    const at = TRE.first + i * TRE.every;
    if (t < at) return;
    const k = ease(seg(t, at, at + TRE.move));
    const prev = i === 0 ? null : points[i - 1];
    pose = mix(i === 0 ? IDENTITY : poses[i - 1], poses[i], k);
    spot = prev ? [prev[0] + (point[0] - prev[0]) * k, prev[1] + (point[1] - prev[1]) * k] : point;
  });
  if (poses.length && t >= TRE.back[0]) pose = mix(poses[poses.length - 1], IDENTITY, ease(seg(t, TRE.back[0], TRE.back[1])));
  const on = smooth(TRE.first, TRE.first + .5, t) * (1 - smooth(TRE.back[0], TRE.back[1], t));
  return { pose, spot: [spot[0] * pose.s + pose.x, spot[1] * pose.s + pose.y] as [number, number], on };
}

/* ── canvasen ──────────────────────────────────────────────────────────── */

function FilmCanvas({ time, paint, className }: { time: number; paint: (ctx: CanvasRenderingContext2D, palette: Palette) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // Upplösningen följer scenens storlek på skärmen, inte fönstrets skala när världen dras ihop.
    const stage = canvas.closest<HTMLElement>("[data-motif]") ?? canvas;
    const scale = clamp((stage.getBoundingClientRect().width / W || 1) * (window.devicePixelRatio || 1), 1, 2);
    const width = Math.round(W * scale);
    if (canvas.width !== width) {
      canvas.width = width;
      canvas.height = Math.round(H * scale);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    paint(ctx, readPalette(canvas));
  }, [time, paint]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

const RAYS = Array.from({ length: 170 }, (_, i) => ({
  a: seeded(i + 11) * Math.PI * 2, p: seeded(i + 211), len: .4 + seeded(i + 97) * .9, w: .6 + seeded(i + 53) * 1.6, hue: seeded(i + 401),
}));

/** Fartstrimmorna: ljus som strömmar ut från fokus (travel växer) eller in mot det (travel minskar). */
function paintStreaks(ctx: CanvasRenderingContext2D, palette: Palette, travel: number, power: number, focus: { x: number; y: number }) {
  if (power < .02) return;
  ctx.save();
  ctx.globalCompositeOperation = palette.dark ? "lighter" : "source-over";
  ctx.lineCap = "round";
  for (const ray of RAYS) {
    const q = frac(ray.p + travel * .55);
    const r = 24 + q ** 1.7 * 1250;
    const tail = Math.min(460, (30 + 260 * power) * ray.len * (.25 + q));
    const alpha = q * (1 - q) * 4 * power * .55;
    if (alpha < .01) continue;
    const cos = Math.cos(ray.a), sin = Math.sin(ray.a);
    const color = ray.hue > .88 ? palette.ai : ray.hue > .82 ? palette.human : palette.ink;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = ray.w * (.6 + q);
    ctx.beginPath();
    ctx.moveTo(focus.x + cos * Math.max(0, r - tail), focus.y + sin * Math.max(0, r - tail));
    ctx.lineTo(focus.x + cos * r, focus.y + sin * r);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ramen runt nästa nivå medan kameran åker, som i filmen: hårlinje, Eames-hörn och tiopotensen bredvid. */
function paintNextFrame(ctx: CanvasRenderingContext2D, palette: Palette, place: { level: { p: number }; r: number; x: number; y: number }, alpha: number, mono: string) {
  if (alpha < .01) return;
  const x = place.x * W, y = place.y * H, w = place.r * W, h = place.r * H;
  const c = 14, o = 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = rgba(palette.ink, .6);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [cx, cy, dx, dy] of [[x - o, y - o, 1, 1], [x + w + o, y - o, -1, 1], [x - o, y + h + o, 1, -1], [x + w + o, y + h + o, -1, -1]]) {
    ctx.moveTo(cx, cy + dy * c);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * c, cy);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(palette.ink, .88);
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 17px ${mono}`;
  const lx = x + w + 14, ly = y + 15;
  ctx.fillText("10", lx, ly);
  const ten = ctx.measureText("10").width;
  ctx.font = `500 11px ${mono}`;
  const exponent = EXPONENT(place.level.p);
  ctx.fillText(exponent, lx + ten + 1, ly - 7);
  const sup = ctx.measureText(exponent).width;
  ctx.font = `500 17px ${mono}`;
  ctx.fillText(" m", lx + ten + sup + 2, ly);
  ctx.restore();
}

/** Under bildpunkterna (nio): ett gitter av atomer som zoomar i oktaver, så att dyket fortsätter. */
function paintLattice(ctx: CanvasRenderingContext2D, palette: Palette, hud: number, amount: number) {
  if (amount < .01) return;
  const f = frac(-hud * 1.15);
  ctx.save();
  ctx.globalCompositeOperation = palette.dark ? "lighter" : "source-over";
  for (let k = 0; k < 4; k++) {
    const octave = k + f;
    const spacing = 22 * 2 ** octave;
    const weight = Math.sin(Math.PI * clamp(octave / 4)) ** 1.5 * amount;
    if (weight < .01) continue;
    const radius = .9 + octave * .55;
    ctx.fillStyle = rgba(k % 2 ? palette.ai : palette.ink, .62 * weight);
    const rows = Math.ceil(H / (spacing * .866)) + 2;
    const cols = Math.ceil(W / spacing) + 2;
    const ox = (W / 2) % spacing, oy = (H / 2) % (spacing * .866);
    for (let row = -1; row < rows; row++) {
      const y = oy + row * spacing * .866;
      const shift = row % 2 ? spacing / 2 : 0;
      for (let col = -1; col < cols; col++) {
        const x = ox + col * spacing + shift;
        ctx.globalAlpha = clamp(1.2 - Math.hypot(x - W / 2, y - H / 2) / 900);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/* ── pixlar: rubriken av bildpunkter ──────────────────────────────────── */

const CELL = 20, COLS = W / CELL, ROWS = H / CELL;
interface PixelPlan {
  /** Varje agents rutor i den ordning agenten tänder dem. */
  bands: { col: number; row: number }[][];
  /** Rubrikens ruta i scenens pixlar: x0, y0, x1, y1. */
  box: [number, number, number, number] | null;
}
const pixelPlans = new Map<string, PixelPlan>();

/**
 * Rubriken i bildpunkter: texten ritas fyra gånger finare på en osynlig canvas, och en ruta tänds när
 * texten täcker den till mer än 42 procent. Två rader om det ger större bokstäver.
 */
function pixelPlanOf(text: string, font: string, agents: number): PixelPlan {
  const key = `${agents}|${font}|${text}`;
  const cached = pixelPlans.get(key);
  if (cached) return cached;
  const S = 4;
  const canvas = document.createElement("canvas");
  canvas.width = COLS * S;
  canvas.height = ROWS * S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const lit = new Array<boolean>(COLS * ROWS).fill(false);
  if (ctx) {
    const words = text.split(/\s+/).filter(Boolean);
    const layouts = [[text]];
    for (let cut = 1; cut < words.length; cut++) layouts.push([words.slice(0, cut).join(" "), words.slice(cut).join(" ")]);
    const maxW = (COLS - 10) * S, maxH = (ROWS - 12) * S;
    let best = { lines: [text], size: 0 };
    for (const lines of layouts) {
      let size = 120;
      ctx.font = `800 ${size}px ${font}`;
      const widest = () => Math.max(...lines.map(line => ctx.measureText(line).width));
      while (size > 12 && (widest() > maxW || size * .98 * lines.length > maxH)) ctx.font = `800 ${--size}px ${font}`;
      if (size > best.size) best = { lines, size };
    }
    ctx.font = `800 ${best.size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    const lead = best.size * .98;
    best.lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (best.lines.length - 1) / 2) * lead));
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let sum = 0;
        for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) sum += data[((row * S + dy) * canvas.width + col * S + dx) * 4 + 3];
        lit[row * COLS + col] = sum / (S * S * 255) > .42;
      }
    }
  }
  let minCol = COLS, maxCol = -1, minRow = ROWS, maxRow = -1;
  lit.forEach((on, i) => {
    if (!on) return;
    const col = i % COLS, row = Math.floor(i / COLS);
    minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col);
    minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row);
  });
  const bands: PixelPlan["bands"] = Array.from({ length: Math.max(1, agents) }, () => []);
  const span = Math.max(1, maxCol - minCol + 1);
  // Varje agent tar ett band av rubriken och fyller det kolumn för kolumn, uppifrån och ned.
  for (let col = minCol; col <= maxCol; col++) {
    const band = bands[Math.min(bands.length - 1, Math.floor(((col - minCol) / span) * bands.length))];
    for (let row = 0; row < ROWS; row++) if (lit[row * COLS + col]) band.push({ col, row });
  }
  const plan: PixelPlan = { bands, box: maxCol < 0 ? null : [minCol * CELL - 16, minRow * CELL - 16, (maxCol + 1) * CELL + 16, (maxRow + 1) * CELL + 16] };
  // Typsnittet kan laddas efter första bilden; spara planen först när det finns på riktigt.
  if (document.fonts?.status === "loaded") pixelPlans.set(key, plan);
  return plan;
}

let subpixelTile: HTMLCanvasElement | null = null;
/** En bildpunkt i närbild: tre delpunkter, röd, grön och blå, som på skärmens yta. */
function tileOf(): HTMLCanvasElement {
  if (subpixelTile) return subpixelTile;
  const tile = document.createElement("canvas");
  tile.width = CELL * 2;
  tile.height = CELL * 2;
  const ctx = tile.getContext("2d");
  if (ctx) {
    ctx.scale(2, 2);
    for (const [color, x] of [["#ff5a4d", 4], ["#4dff8a", 8.5], ["#4d9bff", 13]] as const) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 5, 3, CELL - 10);
    }
  }
  subpixelTile = tile;
  return tile;
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string, text: string, alpha: number, font: string) {
  if (alpha < .01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = text;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 26);
  ctx.lineTo(7, 20);
  ctx.lineTo(12, 30);
  ctx.lineTo(16.5, 28);
  ctx.lineTo(11.5, 18);
  ctx.lineTo(20.5, 18);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  if (name) {
    ctx.font = `600 16px ${font}`;
    ctx.textBaseline = "middle";
    const w = ctx.measureText(name).width + 18;
    ctx.fillRect(16, 30, w, 28);
    ctx.fillStyle = text;
    ctx.fillText(name, 25, 44.5);
  }
  ctx.restore();
}

function paintPixels(ctx: CanvasRenderingContext2D, palette: Palette, t: number, plan: PixelPlan, agents: string[], human: string, mono: string, fade: number) {
  const grid = smooth(PIX.grid[0], PIX.grid[1], t) * fade;
  if (grid < .01) return;
  ctx.save();
  // Skärmens yta: delpunkterna och ett svagt svep när bilden uppdateras.
  const pattern = ctx.createPattern(tileOf(), "repeat");
  if (pattern) {
    pattern.setTransform(new DOMMatrix().scale(.5));
    ctx.globalAlpha = (palette.dark ? .2 : .14) * grid;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }
  const sweep = ((t - PIX.grid[0]) * 260) % (H + 400) - 200;
  const band = ctx.createLinearGradient(0, sweep - 160, 0, sweep + 160);
  band.addColorStop(0, rgba(palette.ink, 0));
  band.addColorStop(.5, rgba(palette.ink, .07));
  band.addColorStop(1, rgba(palette.ink, 0));
  ctx.globalAlpha = grid;
  ctx.fillStyle = band;
  ctx.fillRect(0, sweep - 160, W, 320);

  // Agenterna tänder sina rutor, och pekaren står där agenten ritar.
  const [d0, d1] = PIX.draw;
  const cursors: { x: number; y: number; on: number; name: string }[] = [];
  plan.bands.forEach((cells, agent) => {
    if (!cells.length) return;
    const start = d0 + agent * .22, end = d1 - (plan.bands.length - 1 - agent) * .12;
    const progress = seg(t, start, end);
    const count = Math.floor(progress * cells.length);
    for (let i = 0; i < count; i++) {
      const cell = cells[i];
      const x = cell.col * CELL, y = cell.row * CELL;
      ctx.globalAlpha = grid;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
      const lit = start + (i / cells.length) * (end - start);
      const glow = clamp(1 - (t - lit) / .55);
      if (glow > .02) {
        ctx.globalAlpha = grid * glow;
        ctx.fillStyle = palette.ai;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }
    }
    const head = cells[Math.max(0, Math.min(cells.length - 1, count - 1))];
    const enter = smooth(start - .45, start, t);
    cursors.push({
      x: (head.col + .5) * CELL, y: (head.row + .5) * CELL - (count ? 0 : 160 * (1 - enter)),
      on: enter * (1 - smooth(end + .15, end + .7, t)) * fade, name: agents[agent] ?? "AI",
    });
  });
  ctx.globalAlpha = 1;
  for (const cursor of cursors) drawCursor(ctx, cursor.x, cursor.y, cursor.name, palette.ai, palette.bg, cursor.on, mono);

  // Människan drar en markering runt hela rubriken: in mot övre vänstra hörnet, sedan ett drag.
  if (plan.box) {
    const [x0, y0, x1, y1] = plan.box;
    const enter = ease(seg(t, PIX.enter[0], PIX.enter[1]));
    const drag = ease(seg(t, PIX.drag[0], PIX.drag[1]));
    const on = smooth(PIX.enter[0] - .1, PIX.enter[0] + .2, t) * fade;
    if (on > .01) {
      const cx = drag > 0 ? x0 + (x1 - x0) * drag : x0 - 260 * (1 - enter);
      const cy = drag > 0 ? y0 + (y1 - y0) * drag : y0 + 220 * (1 - enter);
      if (drag > 0) {
        ctx.globalAlpha = on;
        ctx.fillStyle = rgba(palette.human, .08);
        ctx.fillRect(x0, y0, cx - x0, cy - y0);
        ctx.strokeStyle = palette.human;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0, y0, cx - x0, cy - y0);
        const handles = smooth(PIX.drag[1] - .05, PIX.drag[1] + .2, t);
        if (handles > .01) {
          ctx.globalAlpha = on * handles;
          ctx.fillStyle = palette.bg;
          for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]]) {
            ctx.fillRect(hx - 6, hy - 6, 12, 12);
            ctx.strokeRect(hx - 6, hy - 6, 12, 12);
          }
        }
      }
      drawCursor(ctx, cx, cy, human, palette.human, palette.bg, on, mono);
    }
  }
  ctx.restore();
}

/* ── vecka: tidsförloppet ─────────────────────────────────────────────── */

const CLOUDS = Array.from({ length: 8 }, (_, i) => ({
  x: seeded(i + 601) * (W + 900), y: seeded(i + 613) * (H + 500), rx: 260 + seeded(i + 627) * 260, ry: 150 + seeded(i + 641) * 140,
  v: 380 + seeded(i + 653) * 240, a: .46 + seeded(i + 667) * .22,
}));

/** Molnskuggor som drar över skolgården, fort som i ett tidsförlopp. */
function paintClouds(ctx: CanvasRenderingContext2D, palette: Palette, t: number, on: number) {
  if (on < .01) return;
  const dt = t - VECKA.lapse[0] + 3;
  const shade = palette.dark ? palette.bg : palette.ink;
  const depth = palette.dark ? 1 : .5;
  for (const cloud of CLOUDS) {
    const x = ((cloud.x + dt * cloud.v) % (W + 900)) - 450;
    const y = ((cloud.y + dt * cloud.v * .24) % (H + 500)) - 250;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, cloud.ry);
    g.addColorStop(0, rgba(shade, cloud.a * on * depth));
    g.addColorStop(.55, rgba(shade, cloud.a * .6 * on * depth));
    g.addColorStop(1, rgba(shade, 0));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(cloud.rx / cloud.ry, 1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, cloud.ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Var i veckan tidsförloppet är: dag (0–4), andel av skoldagen och hela veckan som tal (0–5). */
function weekAt(t: number, days: number) {
  const p = seg(t, VECKA.lapse[0], VECKA.lapse[1]) * days;
  const day = Math.min(days - 1, Math.floor(p));
  return { p, day, u: clamp(p - day) };
}

/* ── formen ────────────────────────────────────────────────────────────── */

export function BryggFilm({ t, edit, step, still }: FormProps) {
  const chosen = t("film").trim().toLowerCase();
  const motif = (MOTIFS.includes(chosen) ? chosen : "ja") as Motif;
  const plan = PLANS[motif];
  const from = clamp(exponentOf(t("fran"), MAX_P), MIN_P, MAX_P);
  const to = clamp(exponentOf(t("till"), from), MIN_P, MAX_P);
  const portalP = clamp(exponentOf(t("portal"), to), MIN_P, MAX_P);
  const texts = list(t("filmText"));
  const stops = list(t("filmNivaer")).map(value => exponentOf(value, NaN));
  const deepest = motif === "nio" ? Math.min(MIN_P, ...stops.filter(Number.isFinite)) : MIN_P;
  const points = pointsOf(t("filmPunkter")).length ? pointsOf(t("filmPunkter")) : TRE_POINTS;
  const days = list(t("filmDagar")).length ? list(t("filmDagar")) : ["Mån", "Tis", "Ons", "Tor", "Fre"];

  const clock = useStepClock(step, still, plan.length + .5);
  const captured = useCaptureTime(plan.length);
  const time = captured ?? (Number.isFinite(clock) ? Math.min(clock, plan.length) : plan.length);
  const done = time >= plan.length;
  const root = useRef<HTMLDivElement>(null);
  const tone = useTone(root);
  const [fonts, setFonts] = useState({ display: "sans-serif", mono: "monospace" });

  // Bilderna laddas i förväg, och typsnitten läses ur temat (canvasen ritar med dem, också efter T).
  useEffect(() => {
    SKALA_LEVELS.forEach(level => { const img = new Image(); img.src = level.src; });
    const read = () => {
      const css = root.current ? getComputedStyle(root.current) : null;
      const display = css?.getPropertyValue("--font-display").trim() || "sans-serif";
      const mono = css?.getPropertyValue("--font-label").trim() || css?.getPropertyValue("--font-mono").trim() || "monospace";
      setFonts(prev => (prev.display === display && prev.mono === mono ? prev : { display, mono }));
    };
    const frame = requestAnimationFrame(read);
    const observer = new MutationObserver(read);
    for (let node = root.current?.parentElement ?? null; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const at = (s: number) => cameraAt(s, motif, plan, from, portalP, deepest);
  const camera = at(time);
  const speed = rate(s => at(s).hud, time);
  const levels = placeLevels(camera.z);
  const inner = levels[1] && levels[1].r < 1 ? levels[1] : null;
  const focus = inner ? { x: (inner.x + inner.r / 2) * W, y: (inner.y + inner.r / 2) * H } : { x: W / 2, y: H / 2 };

  // Fönstret: öppnas från portalen och dras ihop till den igen.
  const opening = (s: number) => outExpo(seg(s, .3, 1.7));
  const closing = (s: number) => ease(seg(s, plan.collapse, plan.collapse + 1.5));
  const open = opening(time), close = closing(time);
  const span = open * (1 - close);
  const scale = PORTAL.w / W + (1 - PORTAL.w / W) * span;
  const wx = PORTAL.x * (1 - span), wy = PORTAL.y * (1 - span);
  const framed = 1 - smooth(.86, .985, span);
  // Motivets lager tonar bort innan världen dras ihop, så att portalen visar nästa slides bild.
  const motifOut = 1 - smooth(plan.collapse - .3, plan.collapse + .5, time);

  const tre = motif === "tre" ? treCamera(time, points) : null;
  // Tidsförloppet får en långsam kameraåkning in mot skolan, som en motorstyrd kamera.
  const push = motif === "vecka" ? .08 * ease(seg(time, VECKA.lapse[0] - .4, VECKA.lapse[1])) * (1 - ease(seg(time, plan.collapse, plan.collapse + 1.2))) : 0;
  const pose = tre?.pose ?? (push > 0 ? { s: 1 + push, x: -W / 2 * push, y: -H / 2 * push } : IDENTITY);
  const veil = motif === "nio" ? smooth(MIN_P, MIN_P - .9, camera.hud) * .92
    : motif === "pixlar" ? .62 * smooth(PIX.grid[0], PIX.grid[1], time) * (1 - smooth(plan.collapse + .1, plan.collapse + .9, time))
    : 0;
  const lattice = motif === "nio" ? smooth(MIN_P - .1, MIN_P - .8, camera.hud) * (1 - smooth(9.7, 10.3, time)) : 0;
  const week = weekAt(time, days.length);
  const lapseOn = motif === "vecka" ? smooth(VECKA.lapse[0] - .5, VECKA.lapse[0], time) * motifOut : 0;

  const travel = motif === "nio" ? MAX_P - camera.hud : from - camera.hud;
  const fx = (ctx: CanvasRenderingContext2D, palette: Palette) => {
    paintLattice(ctx, palette, camera.hud, lattice);
    // Ut ur portalen när fönstret öppnas, genom världen under resan, in i portalen när den stängs.
    paintStreaks(ctx, palette, open * 2.2, clamp(rate(opening, time) * .22), PORTAL_MID);
    // Över fotografierna räcker zoomen själv; i mörkret under bildpunkterna tar strimmorna över.
    paintStreaks(ctx, palette, travel, clamp(Math.abs(speed) / 1.6) * (.38 + .62 * clamp(veil / .8)), focus);
    paintStreaks(ctx, palette, -close * 2.4, clamp(rate(closing, time) * .45), PORTAL_MID);
    if (inner) paintNextFrame(ctx, palette, inner, smooth(.1, .15, inner.r) * (1 - smooth(.45, .72, inner.r)) * clamp(Math.abs(speed) * 2), fonts.mono);
  };
  const pixelTitle = t("title").replace(/\n~?/g, " ").trim();
  const pixels = (ctx: CanvasRenderingContext2D, palette: Palette) => {
    const agents = texts.length > 1 ? texts.slice(0, -1) : Array.from({ length: 6 }, () => "AI");
    paintPixels(ctx, palette, time, pixelPlanOf(pixelTitle, fonts.display, agents.length), agents, texts.length > 1 ? texts[texts.length - 1] : "Du", fonts.mono, motifOut);
  };
  const clouds = (ctx: CanvasRenderingContext2D, palette: Palette) => paintClouds(ctx, palette, time, lapseOn);

  // Skalmätaren under resan, och rubriken efter.
  const hudOff = Math.min(plan.zoom[1] + .4, plan.collapse);
  const hudOn = smooth(.7, 1.3, time) * (1 - smooth(hudOff, hudOff + .6, time));
  const clockOn = motif === "vecka" ? smooth(VECKA.lapse[0] - .3, VECKA.lapse[0] + .2, time) * (1 - smooth(plan.collapse - .3, plan.collapse + .4, time)) : 0;
  const ledgerOn = smooth(.9, 1.5, time) * (1 - smooth(plan.collapse - .5, plan.collapse + .2, time));
  // Rubriken reser sig när världen nästan har dragits ihop, så att den inte krockar med fönstret.
  const T0 = plan.collapse + .9;
  const place = t("plats") || (motif === "nio" ? "" : SKALA_LEVELS.find(level => level.p === portalP)?.label ?? "");
  const hudRange: [number, number] = motif === "nio" ? [from, deepest] : [from, portalP];
  const kicker = t("kicker");
  const typed = Math.round(seg(time, .15, .15 + kicker.length * .045) * kicker.length);
  const caret = time < 1.8 && Math.floor(time * 3) % 2 === 0;

  return <div ref={root} className={b.film} data-tone={tone} data-still={still} data-done={done} data-motif={motif} role="img" aria-label={[kicker, t("title")].filter(Boolean).join(": ")}>
    <div className={b.world} style={{ transform: `translate(${wx.toFixed(2)}px, ${wy.toFixed(2)}px) scale(${scale.toFixed(5)})` }} aria-hidden="true">
      <div className={b.space} />
      <div className={b.cam} data-drift={done && !still && captured === null} style={pose === IDENTITY ? undefined : { transform: `translate(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px) scale(${pose.s.toFixed(4)})` }}>
        {levels.map(({ level, r, x, y }, i) => {
          const isInner = i > 0 && r < 1;
          const opacity = isInner ? smooth(.1, .34, r) : 1;
          const feather = isInner ? 12 * (1 - smooth(.62, 1, r)) : 0;
          return <div key={level.p} className={b.level} data-inner={isInner}
            style={{ transform: `translate(${(x * W).toFixed(2)}px, ${(y * H).toFixed(2)}px) scale(${r.toFixed(5)})`, opacity, "--feather": `${feather.toFixed(2)}%` } as CSSProperties}>
            <img src={level.src} alt="" draggable={false} decoding="async" />
          </div>;
        })}
        {tre && <Marks time={time} points={points} labels={texts} fade={motifOut} />}
      </div>
      <div className={b.veil} style={{ opacity: veil }} />
      {tre && <div className={b.spot} style={{ opacity: tre.on * motifOut, "--sx": `${tre.spot[0].toFixed(1)}px`, "--sy": `${tre.spot[1].toFixed(1)}px` } as CSSProperties} />}
      {motif === "pixlar" && <FilmCanvas className={b.canvas} time={time} paint={pixels} />}
      {motif === "vecka" && <>
        <FilmCanvas className={b.canvas} time={time} paint={clouds} />
        <div className={b.sun} data-side="ost" style={{ opacity: lapseOn * (1 - smooth(0, .5, week.u)) }} />
        <div className={b.sun} data-side="vast" style={{ opacity: lapseOn * smooth(.5, 1, week.u) }} />
        <div className={b.dusk} style={{ opacity: lapseOn * .55 * Math.max(week.day > 0 ? 1 - smooth(0, .12, week.u) : 0, week.day < days.length - 1 ? smooth(.88, 1, week.u) : 0) }} />
      </>}
    </div>
    {framed > .01 && <div className={b.frame} style={{ left: wx, top: wy, width: W * scale, height: H * scale, opacity: framed }} aria-hidden="true"><i /><i /><i /><i /></div>}
    <FilmCanvas className={b.canvas} time={time} paint={fx} />
    {/* Mörkare ytor bakom texterna, så att de syns mot ljusa nivåer (bordet, taken). */}
    <div className={b.scrimKicker} style={{ opacity: span }} aria-hidden="true" />
    <div className={b.scrimHud} style={{ opacity: Math.max(hudOn, clockOn) }} aria-hidden="true" />
    {motif === "nio" && <div className={b.scrimLedger} style={{ opacity: ledgerOn }} aria-hidden="true" />}
    {motif !== "nio" && <Passing camera={camera} from={from} to={portalP} time={time} plan={plan} />}
    {motif === "nio" && <Ledger texts={texts} stops={stops} camera={camera} on={ledgerOn} />}
    <div className={st.grain} aria-hidden="true" />
    <div className={b.vignette} aria-hidden="true" />

    <Odometer hud={camera.hud} on={hudOn} range={hudRange} />
    {motif === "vecka" && <Clock days={days} week={week} on={clockOn} />}

    <div className={b.lockup}>
      {kicker && <p className={b.kicker}>{still || typed >= kicker.length ? edit("kicker") : <>{kicker.slice(0, typed)}<i className={b.caret} data-on={caret} /></>}</p>}
      {t("title") && <h2 className={b.title}>{edit("title", <Letters text={t("title")} time={time} at={T0} emphasis={t("emphasis")} />)}</h2>}
      <i className={b.rule} style={{ transform: `scaleX(${outExpo(seg(time, T0 + .5, T0 + 1.6)).toFixed(4)})` }} aria-hidden="true" />
      <p className={b.hud} style={{ opacity: smooth(T0 + .8, T0 + 1.4, time), transform: `translateY(${(14 * (1 - outExpo(seg(time, T0 + .8, T0 + 1.6)))).toFixed(2)}px)` }}
        aria-label={`10 upphöjt till ${hudRange[0]} meter till 10 upphöjt till ${hudRange[1]} meter${place ? `, ${place}` : ""}`}>
        <span>10<sup>{EXPONENT(hudRange[0])}</sup> m</span><i aria-hidden="true">→</i><span>10<sup>{EXPONENT(hudRange[1])}</sup> m</span>
        {place && <em>{t("plats") ? edit("plats") : place}</em>}
      </p>
    </div>
    <Route t={t} time={time} at={plan.collapse + 1.6} />
  </div>;
}

/** Rubrikens ord, med varje teckens plats i hela rubriken, så att bokstäverna kan resa sig en i taget. */
function lettersOf(text: string) {
  let index = 0;
  return text.split("\n").map(raw => raw.replace(/^~/, "").split(/(\s+)/).filter(Boolean).map(word => {
    const space = /^\s+$/.test(word);
    const start = index;
    index += space ? 1 : [...word].length;
    return { word, start, space };
  }));
}

/** Rubriken bokstav för bokstav: varje tecken reser sig ur en mask, en aning efter det förra. */
function Letters({ text, time, at, emphasis }: { text: string; time: number; at: number; emphasis: string }) {
  const marked = new Set(emphasis.split("|").map(word => word.trim().toLowerCase()).filter(Boolean));
  return <>{lettersOf(text).map((words, row) => <span key={row} className={b.line}>
    {words.map(({ word, start, space }, w) => space ? <span key={w}> </span>
      : <span key={w} className={b.word} data-mark={marked.has(word.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()) || undefined}>{[...word].map((char, c) => {
        const begin = at + (start + c) * .035;
        return <span key={c} className={b.char} style={{ transform: `translateY(${((1 - outExpo(seg(time, begin, begin + .8))) * 112).toFixed(2)}%)` }}>{char}</span>;
      })}</span>)}
  </span>)}</>;
}

/** Skalmätaren som räkneverk: exponenten rullar fram, och bandet under löper med som en skärpeskala. */
function Odometer({ hud, on, range }: { hud: number; on: number; range: [number, number] }) {
  if (on < .01) return null;
  const top = Math.max(range[0], range[1]) + 1;
  const bottom = Math.min(range[0], range[1]) - 1;
  const values: number[] = [];
  for (let n = top; n >= bottom; n--) values.push(n);
  // Räkneverket står still på varje tiopotens och rullar snabbt till nästa när kameran är mitt emellan.
  const floor = Math.floor(hud), snap = smooth(.35, .65, hud - floor);
  const shown = floor + snap;
  const width = EXPONENT(floor).length + (EXPONENT(floor + 1).length - EXPONENT(floor).length) * snap;
  return <div className={b.odometer} style={{ opacity: on }} aria-hidden="true">
    <p className={b.power}>
      <span>10</span>
      <span className={b.roll} style={{ width: `${width.toFixed(3)}ch` }}><span style={{ transform: `translateY(${(-(top - shown) * 64).toFixed(2)}px)` }}>{values.map(n => <b key={n}>{EXPONENT(n)}</b>)}</span></span>
      <small>m</small>
    </p>
    <div className={b.tape}>
      <div style={{ transform: `translateX(${(-(top - hud) * 64).toFixed(2)}px)` }}>
        {values.map(n => <i key={n} style={{ left: (top - n) * 64 }}><span>10<sup>{EXPONENT(n)}</sup></span></i>)}
      </div>
      <b />
    </div>
  </div>;
}

/** Klockan i tidsförloppet (vecka), på skalmätarens plats: skoldagen rullar och veckan fylls. */
function Clock({ days, week, on }: { days: string[]; week: { p: number; day: number; u: number }; on: number }) {
  if (on < .01) return null;
  const minutes = VECKA.open + (VECKA.close - VECKA.open) * week.u;
  return <div className={b.clock} style={{ opacity: on }} aria-hidden="true">
    <p className={b.time}>{pad(Math.floor(minutes / 60))}<i>:</i>{pad(Math.floor(minutes % 60))}</p>
    <ol className={b.days}>
      {days.map((day, i) => <li key={i} data-state={i < week.day ? "done" : i === week.day ? "now" : "next"}>{day}</li>)}
      <i style={{ transform: `scaleX(${(week.p / days.length).toFixed(4)})` }} />
    </ol>
  </div>;
}

/** Nivåernas namn som passerar kameran: växer förbi när kameran åker in, krymper bort när den åker ut. */
function Passing({ camera, from, to, time, plan }: { camera: Camera; from: number; to: number; time: number; plan: Plan }) {
  const out = to > from;
  const after = 1 - smooth(plan.zoom[1] - .1, plan.zoom[1] + .6, time);
  if (after < .01) return null;
  const shown = SKALA_LEVELS.filter(level => level.label && (out ? level.p > from && level.p <= to : level.p < from && level.p >= to));
  return <div className={b.passing} aria-hidden="true">{shown.map(level => {
    const d = out ? camera.z - level.p : level.p - camera.z;
    const opacity = smooth(-.55, -.15, d) * (1 - smooth(.05, .42, d)) * after;
    if (opacity < .01) return null;
    const grow = out ? 1.7 * 10 ** (-d * .8) : .7 * 10 ** (d * .9);
    return <p key={level.p} style={{ opacity, transform: `translate(-50%, -50%) scale(${grow.toFixed(4)})`, filter: `blur(${Math.max(0, Math.abs(d) * 9 - 1).toFixed(2)}px)` }}>{level.label}</p>;
  })}</div>;
}

/** Liggaren (nio): tiopotenserna står tryckta, och exemplen skrivs in när kameran passerar dem. */
function Ledger({ texts, stops, camera, on }: { texts: string[]; stops: number[]; camera: Camera; on: number }) {
  const rows = texts.map((text, i) => ({ text, p: stops[i] })).filter(row => Number.isFinite(row.p));
  if (!rows.length || on < .01) return null;
  const nearest = rows.reduce((best, row) => (Math.abs(row.p - camera.hud) < Math.abs(best.p - camera.hud) ? row : best), rows[0]);
  return <ol className={b.ledger} style={{ opacity: on }} aria-hidden="true">
    {rows.map(row => {
      const write = camera.back ? 1 : smooth(row.p + .45, row.p - .05, camera.hud);
      const current = row === nearest && Math.abs(row.p - camera.hud) < .7;
      return <li key={row.text} data-current={current || undefined}>
        <span>10<sup>{EXPONENT(row.p)}</sup></span><em style={{ clipPath: `inset(-10% ${((1 - write) * 100).toFixed(2)}% -10% 0)` }}>{row.text}</em>
      </li>;
    })}
  </ol>;
}

/** Märkena på bordet (tre): ett hårkors som ritas runt saken, med nummer och valfritt namn. */
function Marks({ time, points, labels, fade }: { time: number; points: [number, number][]; labels: string[]; fade: number }) {
  return <svg className={b.marks} viewBox={`0 0 ${W} ${H}`} style={{ opacity: fade }} aria-hidden="true">
    {points.map(([x, y], i) => {
      const at = TRE.first + i * TRE.every + .3;
      const draw = outExpo(seg(time, at, at + .9));
      const on = smooth(at - .05, at + .2, time);
      if (on < .01) return null;
      return <g key={i} transform={`translate(${x} ${y})`} style={{ opacity: on }}>
        <circle r="34" pathLength={1} transform="rotate(-90)" style={{ strokeDashoffset: 1 - draw }} />
        {[0, 90, 180, 270].map(angle => <line key={angle} x1="22" x2={(22 + 30 * draw).toFixed(2)} y1="0" y2="0" transform={`rotate(${angle})`} />)}
        <text x="50" y="-36" style={{ opacity: smooth(at + .2, at + .5, time) }}>{pad(i + 1)}</text>
        {labels[i] && <text x="50" y="-4" data-label style={{ opacity: smooth(at + .35, at + .7, time) }}>{labels[i]}</text>}
      </g>;
    })}
  </svg>;
}

/** Färdkartan: föreläsningens delar, de klara ifyllda och ljuset som löper till nästa. */
function Route({ t, time, at }: { t: FormProps["t"]; time: number; at: number }) {
  const parts = list(t("delar"));
  if (parts.length < 2) return null;
  const exponents = t("nivaer").split("|").map(value => exponentOf(value, NaN));
  const current = Math.max(1, Math.min(parts.length, Math.round(Number(t("del"))) || 1));
  const run = ease(seg(time, at + .9, at + 1.9));
  const position = current > 1 ? (current - 2 + run) / (parts.length - 1) : 0;
  return <ol className={b.route} style={{ opacity: smooth(at - .1, at + .3, time) }} aria-label={`Del ${current} av ${parts.length}`}>
    <i className={b.routeBase} style={{ transform: `scaleX(${outExpo(seg(time, at, at + 1)).toFixed(4)})` }} />
    <i className={b.routeDone} style={{ width: `${(position * 100).toFixed(3)}%` }} />
    {parts.map((part, i) => {
      const state = i < current - 1 ? "done" : i === current - 1 ? "next" : "future";
      const pop = outExpo(seg(time, at + .15 + i * .09, at + .75 + i * .09));
      return <li key={i} data-state={state} data-arrived={(state === "next" && run >= 1) || undefined} style={{ left: `${(i / (parts.length - 1)) * 100}%`, opacity: pop }}>
        {Number.isFinite(exponents[i]) && <small>10<sup>{EXPONENT(exponents[i])}</sup></small>}
        <i style={{ transform: `scale(${pop.toFixed(4)})` }} />
        <span>{part}</span>
      </li>;
    })}
    {current > 1 && <b className={b.runner} style={{ left: `${(position * 100).toFixed(3)}%`, opacity: run > 0 && run < 1 ? 1 : 0 }} />}
  </ol>;
}
