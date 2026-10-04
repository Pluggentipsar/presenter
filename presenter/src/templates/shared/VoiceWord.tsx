"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInlineEdit } from "@/lib/inline-edit";

/** #rrggbb eller rgb()/rgba() + alfa som rgba(); andra färgformat faller tillbaka på bärnsten. */
function rgba(color: string, alpha: number): string {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha * (rgb[4] === undefined ? 1 : Number(rgb[4]))})`;
  const srgb = color.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/);
  if (srgb) return `rgba(${[1, 2, 3].map((i) => Math.round(Number(srgb[i]) * 255)).join(",")},${alpha * (srgb[4] === undefined ? 1 : Number(srgb[4]))})`;
  const hex = color.replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(full)) return `rgba(255,181,71,${alpha})`;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Ett ord som byggs av ljudstaplar när aktivt tema har signaturen "voice"
 * (rost): bokstäverna växer ur en platt vågform, som när tal blir skrift.
 * Utan signaturen visas barnen som vanlig text, så T-växling och redigering
 * fungerar som förut. Texten ligger alltid kvar i DOM:en (genomskinlig när
 * staplarna ritas) för skärmläsare och inline-redigering.
 */
/** `color="current"` ritar staplarna i elementets egen textfärg, för svaga bakgrundsord; standard är temats bärnsten. */
export function VoiceWord({ text, children, color = "accent" }: { text: string; children: ReactNode; color?: "accent" | "current" }) {
  const host = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [signature, setSignature] = useState(false);
  // I R-editorn visas vanlig text, så att ordet går att redigera direkt.
  const { editMode } = useInlineEdit();
  const voice = signature && !editMode;

  // Temat kan bytas med T utan ny rendering, så signaturen läses av med jämna mellanrum.
  useEffect(() => {
    const read = () => {
      const el = host.current;
      if (el) setSignature(getComputedStyle(el).getPropertyValue("--signature").trim() === "voice");
    };
    read();
    const timer = window.setInterval(read, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = host.current, cv = canvas.current;
    if (!voice || !el || !cv) return;
    let frame = 0, cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = async () => {
      const style = getComputedStyle(el);
      await document.fonts.ready;
      if (cancelled) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const tail = Math.round(w * .55);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = (w + tail) * dpr; cv.height = h * dpr;
      cv.style.width = `${w + tail}px`; cv.style.height = `${h}px`;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      // Ordet ritas osynligt för att få bokstävernas form kolumn för kolumn.
      const off = document.createElement("canvas");
      off.width = cv.width; off.height = cv.height;
      const o = off.getContext("2d")!;
      o.scale(dpr, dpr);
      o.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      o.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
      o.textBaseline = "alphabetic";
      const m = o.measureText(text);
      const baseline = (h + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      o.fillText(text, 0, baseline);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const cy = h / 2, step = Math.max(5, Math.round(parseFloat(style.fontSize) / 42));
      const own = getComputedStyle(el.parentElement ?? el).color;
      const bright = color === "current" ? own : style.getPropertyValue("--accent-bright").trim() || "#ffb547";
      const warm = color === "current" ? own : style.getPropertyValue("--accent").trim() || "#ffb547";
      const columns: { x: number; segs: [number, number][] }[] = [];
      for (let x = 1; x < w + tail; x += step) {
        const segs: [number, number][] = [];
        let inside = false, y0 = 0;
        for (let y = 0; y < h; y++) {
          const a = x < w + 2 && data[((y * dpr) | 0) * off.width * 4 + ((x * dpr) | 0) * 4 + 3] > 60;
          if (a && !inside) { inside = true; y0 = y; }
          if (!a && inside) { inside = false; segs.push([y0, y]); }
        }
        if (inside) segs.push([y0, h]);
        columns.push({ x, segs });
      }
      const wave = (x: number) => Math.abs(Math.sin(x * .031) * .55 + Math.sin(x * .079 + 1.3) * .3 + Math.sin(x * .17 + .4) * .15);
      const paint = (p: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w + tail, h);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, bright); grad.addColorStop(1, warm);
        for (const { x, segs } of columns) {
          const bw = Math.max(2, step * .5);
          if (segs.length) {
            ctx.fillStyle = grad;
            for (const [a, b] of segs) {
              const top = cy + (a - cy) * p, bottom = cy + (b - cy) * p;
              ctx.beginPath(); ctx.roundRect(x - bw / 2, top, bw, Math.max(2, bottom - top), bw / 2); ctx.fill();
            }
          } else {
            const fade = x < w ? 1 : Math.max(0, 1 - (x - w) / tail);
            const amp = (2 + wave(x) * h * .09) * (x < w ? 1 : fade);
            ctx.fillStyle = rgba(warm, .28 + .3 * fade);
            ctx.beginPath(); ctx.roundRect(x - bw / 2, cy - amp, bw, amp * 2, bw / 2); ctx.fill();
          }
        }
      };
      if (reduced) { paint(1); return; }
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 1100);
        paint(.04 + .96 * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && !cancelled) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    void draw();
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [voice, text, color]);

  return <span ref={host} style={{ position: "relative", display: "inline-block", color: voice ? "transparent" : undefined }}>
    {children}
    {voice && <canvas ref={canvas} aria-hidden style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />}
  </span>;
}
