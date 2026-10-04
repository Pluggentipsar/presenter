"use client";

/**
 * Introt till varje film (30 september 2026): omslaget och presentationen.
 *
 * omslag        Titeln och filmens frågor stiger som ljuspunkter ur ljuset på
 *               vattnet, i filmens färg (--film), och speglas i sjön. Lånat ur
 *               omslaget i AI och du (elever-solkraft/IntroScenes.tsx), här med
 *               Vätterns ljus som källa. Med `speaker` finns ett andra läge:
 *               punkterna sjunker tillbaka i ljuset och titelkortet kommer fram.
 * presentation  Joel presenterar sig: namn och roller till vänster, filmen
 *               pausad till höger. Nästa klick startar filmen och förstorar den.
 *               Samma film och upplägg som i tidigare föreläsningar.
 */

import { useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { SlideTargetContext } from "@/lib/slide-target";
import { useInlineEdit } from "@/lib/inline-edit";
import { RichLines, SeriesLights, seriesOf } from "./kit";
import { Title, type FormProps } from "./forms";
import s from "./stage.module.css";
import x from "./intro.module.css";

const noSubscribe = () => () => {};
/** Titeln utan mjuka radmarkeringar (~): punkterna ritar orden, inte färgerna. */
const plain = (text: string) => text.split("\n").map(line => line.replace(/^~\s?/, "")).join("\n");

/* ------------------------------------------------------------- omslaget */

export function Omslag(props: FormProps) {
  const { t, edit, step, still, horizonY, lightX } = props;
  const card = step >= 1;
  // Punkterna rör sig bara i presentationsvyn: inte i R, miniatyrer, granskningen eller vid reducerad rörelse.
  const live = Boolean(useContext(SlideTargetContext));
  const reduce = useReducedMotion() ?? false;
  const { editMode } = useInlineEdit();
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [ready, setReady] = useState(false);
  const animate = mounted && live && !reduce && !editMode && !still;
  const titleKey = t("title") ? "title" : "filmTitle";
  const shapes = [plain(t(titleKey)), t("q1"), t("q2"), t("q3")].filter(Boolean);
  const series = seriesOf(t);
  // Titelkortet i andra läget ritar inte egna ljus: seriens ljus ligger kvar på vattnet genom båda lägena.
  const cardT = (key: string) => (key === "film" || key === "films" || key === "next" ? "" : t(key));
  return <>
    {animate && <LightField shapes={shapes} horizonY={horizonY} lightX={lightX} sink={card} onReady={() => setReady(true)} />}
    <div className={x.cover} data-card={card} data-live={animate && ready} aria-hidden={card} style={{ "--hy": `${horizonY}px` } as CSSProperties}>
      <p className={x.coverKicker}>{edit("series")}{t("filmLabel") && <span className={s.kickerRule} />}{edit("filmLabel")}</p>
      <h2 className={x.coverTitle} data-size={plain(t(titleKey)).length > 46 ? "m" : "l"}>{edit(titleKey, <RichLines text={t(titleKey)} />)}</h2>
      {shapes.length > 1 && <ul className={x.srOnly}>{shapes.slice(1).map((q, i) => <li key={i}>{q}</li>)}</ul>}
    </div>
    {card && <div className={x.card}><Title {...props} t={cardT} /></div>}
    {series.films > 0 && <SeriesLights film={series.film} films={series.films} horizonY={horizonY} still={still} />}
  </>;
}

type Point = { x: number; y: number };
// Tätare än omslaget i AI och du (3 400 punkter på 1280 × 720): titlarna här är långa frågor på tre rader.
const W = 1600, H = 900, N = 7000;

/** Punkter där texten täcker ytan. Radbryter vid \n och när raden blir för bred. */
function sampleText(text: string, family: string, weight: string, size: number, maxWidth: number, centerY: number, tracking: number): Point[] {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  let fs = size;
  const setFont = () => {
    g.font = `${weight} ${fs}px ${family}`;
    if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(tracking * fs).toFixed(1)}px`;
  };
  const wrap = (para: string, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && g.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  // Balanserade rader som den stilla titeln (text-wrap: balance): den smalaste bredd som ger lika många rader.
  const layout = () => {
    setFont();
    return text.split("\n").flatMap(para => {
      const count = wrap(para, maxWidth).length;
      if (count < 2) return wrap(para, maxWidth);
      let lo = maxWidth * .4, hi = maxWidth;
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (wrap(para, mid).length > count) lo = mid; else hi = mid; }
      return wrap(para, hi);
    });
  };
  let lines = layout();
  while ((lines.length > 3 || lines.some(line => g.measureText(line).width > maxWidth)) && fs > 40) { fs *= .92; lines = layout(); }
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  const lineHeight = fs * 1.04;
  const top = centerY - (lines.length - 1) * lineHeight / 2;
  lines.forEach((line, i) => g.fillText(line, W / 2, top + i * lineHeight));
  const data = g.getImageData(0, 0, W, H).data;
  let points: Point[] = [];
  // Glesare raster tills punkterna ryms bland partiklarna, så att bokstäverna blir hela. Varannan rad
  // förskjuten och ett litet slumpavstånd: ljuspunkter i stället för en ljusskylts raka kolumner.
  for (let grid = 3.5; grid < 12; grid += .5) {
    points = [];
    for (let row = 0, y = 0; y < H; row++, y += grid * .87) {
      for (let px = row % 2 ? grid / 2 : 0; px < W; px += grid) {
        if (data[((y | 0) * W + (px | 0)) * 4 + 3] > 140) points.push({ x: px + (Math.random() - .5) * grid * .3, y: y + (Math.random() - .5) * grid * .3 });
      }
    }
    if (points.length <= N * .96) break;
  }
  for (let i = points.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [points[i], points[j]] = [points[j], points[i]]; }
  return points;
}

type RGB = [number, number, number];
const hex = (value: string): RGB | null => {
  const m = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const rgb = ([r, g, b]: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
const mix = (a: RGB, b: RGB, p: number) => rgb([a[0] * p + b[0] * (1 - p), a[1] * p + b[1] * (1 - p), a[2] * p + b[2] * (1 - p)]);
const WHITE: RGB = [255, 255, 255];

/** Samma blandningar som horisontens ljus i stage.module.css, så att punkterna har ljusets färg. */
function palette(el: HTMLElement) {
  const css = getComputedStyle(el);
  const v = (name: string) => hex(css.getPropertyValue(name));
  const light = el.closest("[data-tone]")?.getAttribute("data-tone") === "light";
  const film = v("--film");
  const accent = v("--accent") ?? [229, 246, 248];
  const bright = v("--accent-bright") ?? [0, 101, 158];
  const second = v("--accent-secondary") ?? [8, 124, 140];
  if (light) {
    const base = film ?? bright;
    return { main: rgb(base), soft: mix(base, [0, 0, 0], .72), spark: rgb(second), glow: mix(base, WHITE, .5), blend: "source-over" as GlobalCompositeOperation };
  }
  if (film) return { main: mix(film, WHITE, .58), soft: mix(film, WHITE, .16), spark: rgb(film), glow: mix(film, WHITE, .4), blend: "lighter" as GlobalCompositeOperation };
  return { main: mix(accent, bright, .64), soft: mix(accent, WHITE, .76), spark: rgb(second), glow: mix(accent, bright, .5), blend: "lighter" as GlobalCompositeOperation };
}

const PLAN = [0, 1, 0, 2, 0, 3];
const RISE = 2.1, FALL = 1.7, SINK = 1.8;

/**
 * Ljuspunkterna. De ligger först i ljuset på vattnet, stiger och samlas till
 * titeln (närmast ljuset först), glittrar, faller tillbaka i ljuset och stiger
 * igen till nästa fråga. Allt ovanför horisonten speglas svagt i sjön. Med
 * `sink` sjunker punkterna i ljuset och tonar bort, och loopen stannar.
 */
function LightField({ shapes, horizonY, lightX, sink, onReady }: { shapes: string[]; horizonY: number; lightX: number; sink: boolean; onReady: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sinkRef = useRef(sink);
  const lightRef = useRef(lightX);
  useEffect(() => { sinkRef.current = sink; }, [sink]);
  useEffect(() => { lightRef.current = lightX; }, [lightX]);
  const key = `${shapes.join("\u0001")}|${Math.round(horizonY)}`;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let scale = 1, raf = 0, stopped = false;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      scale = Math.min(2, Math.max(.75, box.width / W * (window.devicePixelRatio || 1)));
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const hy = horizonY;
    const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const tx = new Float32Array(N), ty = new Float32Array(N), delay = new Float32Array(N), phase = new Float32Array(N), spread = new Float32Array(N);
    const has = new Uint8Array(N), tone = new Uint8Array(N);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    for (let i = 0; i < N; i++) {
      spread[i] = gauss() * 70;
      px[i] = lightRef.current + spread[i]; py[i] = hy + 4 + Math.abs(gauss()) * 10;
      phase[i] = Math.random() * Math.PI * 2;
      tone[i] = Math.random() < .09 ? 2 : 0;
    }

    let forms: Point[][] = [];
    let segment = -1, segStart = performance.now() / 1000, state: "rise" | "hold" | "fall" = "fall";
    let sinkStart = 0;
    let colors = palette(canvas);
    // Orden ritas i temats rubriktypsnitt. Byter T tema under loopen ritas de om till nästa varv.
    let sampled = "";
    const sample = () => {
      const styles = getComputedStyle(canvas);
      const family = styles.getPropertyValue("--font-display").trim() || "sans-serif";
      const weight = styles.getPropertyValue("--heading-weight").trim() || "800";
      if (`${weight} ${family}` === sampled) return;
      sampled = `${weight} ${family}`;
      const fonts = document.fonts?.load ? document.fonts.load(`${weight} 120px ${family}`).catch(() => []) : Promise.resolve([]);
      fonts.then(() => {
        if (stopped) return;
        // Samma storlek, spärrning och mitt som den stilla titeln (intro.module.css: .coverTitle), så att
        // punkterna står där texten stod och aldrig når upp till överraden.
        const title = canvas.parentElement?.querySelector("h2");
        const size = title ? parseFloat(getComputedStyle(title).fontSize) || 108 : 108;
        const tracking = title ? parseFloat(getComputedStyle(title).letterSpacing) / size || -.035 : -.035;
        const centerY = hy * .5;
        const next = shapes.map((text, i) => i === 0 ? sampleText(text, family, weight, size, 1320, centerY, tracking) : sampleText(text, family, weight, 92, 1300, centerY, tracking * .8));
        if (!next[0]?.length) return;
        forms = next;
        if (segment < 0) { segment = 0; segStart = performance.now() / 1000; state = "rise"; assign(); }
      });
    };
    sample();
    // Den stilla titeln tonar bort först när punkterna har ritat sin första bildruta. Står
    // bildrutorna still (en dold flik) ligger den stilla titeln kvar i stället för en tom sjö.
    let announced = false;

    const formOf = (seg: number) => {
      const plan = PLAN.filter(n => n < forms.length);
      return plan[seg % plan.length] ?? 0;
    };
    const holdOf = (seg: number) => formOf(seg) === 0 ? 4.8 : 3.6;
    const assign = () => {
      const points = forms[formOf(segment)] ?? [];
      const count = Math.min(N, points.length);
      const lx = lightRef.current;
      for (let i = 0; i < N; i++) {
        if (i < count) {
          const p = points[points.length > N ? Math.floor(i * points.length / N) : i];
          tx[i] = p.x; ty[i] = p.y; has[i] = 1;
          // Närmast ljuset stiger först, sedan breder titeln ut sig åt sidorna.
          delay[i] = .85 * Math.abs(p.x - lx) / W + Math.random() * .22;
        } else has[i] = 0;
      }
      colors = palette(canvas);
    };

    const groups = Array.from({ length: 5 }, () => new Int32Array(N));
    const counts = new Int32Array(5);
    const mirror = new Int32Array(N);
    let last = performance.now() / 1000;
    const frame = () => {
      if (stopped) return;
      const now = performance.now() / 1000;
      const dt = Math.min(1 / 30, now - last);
      last = now;
      const t = now - segStart;
      const lx = lightRef.current;
      if (sinkRef.current && !sinkStart) sinkStart = now;
      if (!sinkRef.current) sinkStart = 0;
      const sinking = sinkStart > 0;
      if (segment >= 0 && !sinking) {
        if (state === "rise" && t > RISE) state = "hold";
        else if (state === "hold" && t > RISE + holdOf(segment)) state = "fall";
        else if (state === "fall" && t > RISE + holdOf(segment) + FALL) { segment++; segStart = now; state = "rise"; sample(); assign(); }
      }
      const falling = sinking || state === "fall" || segment < 0;
      const sweep = state === "hold" && !sinking ? -260 + (t - RISE) / holdOf(segment) * (W + 520) : -9999;
      counts.fill(0);
      let mirrors = 0;
      const pullDamp = Math.exp(-7 * dt), fallDamp = Math.exp(-2.4 * dt), dustDamp = Math.exp(-1.2 * dt);
      for (let i = 0; i < N; i++) {
        const X = px[i], Y = py[i];
        const pulled = !falling && has[i] === 1 && t > delay[i];
        if (pulled) {
          const jx = state === "hold" ? Math.sin(now * 1.9 + phase[i]) * .7 : 0;
          const jy = state === "hold" ? Math.cos(now * 1.6 + phase[i]) * .7 : 0;
          vx[i] += (tx[i] + jx - X) * 26 * dt; vy[i] += (ty[i] + jy - Y) * 26 * dt;
          vx[i] *= pullDamp; vy[i] *= pullDamp;
        } else if (falling || has[i] === 1) {
          // Tillbaka i ljuset: en virvel som lägger sig som ett glitter på vattnet under ljuset.
          const gx = lx + spread[i] * (sinking ? .6 : 1), gy = hy + 5 + Math.abs(spread[i]) * .05;
          const dx = gx - X, dy = gy - Y;
          vx[i] += (dx * 2.1 - dy * .9) * dt * 2.2; vy[i] += (dy * 2.6 + dx * .35) * dt * 2.2;
          vx[i] *= fallDamp; vy[i] *= fallDamp;
        } else {
          // Lösa punkter som inte behövs i ordet: ljusstoft som svävar över vattnet.
          const fx = Math.sin(Y * .006 + now * .33) + Math.cos((X + Y) * .002 - now * .21);
          const fy = Math.cos(X * .005 - now * .27);
          vx[i] += (fx * 20 + (lx - X) * .015) * dt; vy[i] += (fy * 12 + (hy - 70 - Y) * .12) * dt;
          vx[i] *= dustDamp; vy[i] *= dustDamp;
        }
        px[i] = X + vx[i] * dt; py[i] = Y + vy[i] * dt;
        // 0 ordet, 1 frågorna, 2 gnista, 3 svepets glans, 4 stoft
        const group = pulled ? (Math.abs(px[i] - sweep) < 50 ? 3 : formOf(segment) === 0 ? 0 : 1) : tone[i] === 2 ? 2 : 4;
        groups[group][counts[group]++] = i;
        if (py[i] < hy - 2 && (pulled || group === 2)) mirror[mirrors++] = i;
      }
      const fade = sinking ? Math.max(0, 1 - (now - sinkStart) / SINK) : 1;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = colors.blend;
      const draw = (group: number, color: string, alpha: number, size: number) => {
        ctx.fillStyle = color; ctx.globalAlpha = alpha * fade; ctx.beginPath();
        const list = groups[group], half = size / 2;
        for (let k = 0; k < counts[group]; k++) { const i = list[k]; ctx.rect(px[i] - half, py[i] - half, size, size); }
        ctx.fill();
      };
      // Spegelbilden i sjön: samma punkter, hoptryckta under horisonten, svagt krusade och bleknande
      // med djupet, så att den slutar ovanför textningsmarginalen (y 765). Fyra band med stigande genomskinlighet.
      ctx.fillStyle = colors.glow;
      for (let band = 0; band < 4; band++) {
        ctx.globalAlpha = .17 * (1 - band / 4) * fade; ctx.beginPath();
        for (let k = 0; k < mirrors; k++) {
          const i = mirror[k];
          const depth = (hy - py[i]) * .26;
          if (depth > 112 || Math.min(3, Math.floor(depth / 28)) !== band) continue;
          const my = hy + depth;
          ctx.rect(px[i] + Math.sin(my * .09 + now * 2.2) * 2.4 - 1.4, my - 1, 2.8, 2);
        }
        ctx.fill();
      }
      draw(0, colors.glow, .08, 10); draw(3, colors.soft, .14, 12);
      draw(4, colors.main, .34, 1.8); draw(2, colors.spark, .95, 2.8);
      draw(0, colors.main, 1, 3.4); draw(1, colors.soft, .95, 2.9); draw(3, colors.soft, 1, 3.8);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      if (!announced && segment >= 0) { announced = true; onReady(); }
      if (sinking && fade <= 0) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} className={x.field} aria-hidden="true" />;
}

/* -------------------------------------------------------- presentationen */

/** Joel presenterar sig. Två lägen: filmen pausad bredvid namnet, sedan stor och igång. Bakåt pausar. */
export function Presentation({ t, edit, step, still }: FormProps) {
  const playing = step >= 1;
  const roles = ["role1", "role2", "role3"].filter(key => t(key));
  return <div className={x.pres} data-playing={playing} data-still={still}>
    <div className={x.presCopy}>
      {t("kicker") && <p className={x.presKicker}>{edit("kicker")}</p>}
      <h2 className={x.presName}>{edit("name")}</h2>
      {roles.length > 0 && <ul className={x.presRoles}>{roles.map(key => <li key={key}>{edit(key)}</li>)}</ul>}
      {t("contact") && <p className={x.presContact}>{edit("contact")}</p>}
    </div>
    {t("media1") && <div className={x.presScreen}>
      <PresentationFilm src={t("media1")} poster={t("poster")} alt={t("alt1") || `Film där ${t("name")} presenterar sig`} playing={playing && !still} />
      <span className={x.presPlay} aria-hidden="true" />
    </div>}
  </div>;
}

function PresentationFilm({ src, poster, alt, playing }: { src: string; poster: string; alt: string; playing: boolean }) {
  const film = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const player = film.current;
    if (!player) return;
    if (playing) { player.currentTime = 0; void player.play().catch(() => {}); }
    else player.pause();
  }, [playing]);
  return <video ref={film} src={src} poster={poster || undefined} playsInline preload="metadata" aria-label={alt} />;
}
