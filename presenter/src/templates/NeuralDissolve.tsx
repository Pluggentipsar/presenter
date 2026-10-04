"use client";

import { useEffect, useRef } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * NeuralDissolve — cinematisk sektionsdivider för "avmystifiera AI / under
 * huven". Titeln renderas som luminösa partiklar ovanpå ett pulserande
 * neuralt nätverk (feedforward-lager med signal-pulser). Staged reveal:
 *
 *   Steg 0  Titeln materialiseras; nätverket glöder svagt bakom.
 *   Steg 1  (klick) Titeln LÖSES UPP — partiklarna exploderar utåt och
 *           bleknar medan nätverket surgar fram. Undertiteln tonar in.
 *   Steg 2  (klick) Nätverket LÖSES UPP — noderna driver isär och bleknar.
 *           Kvar: undertiteln. Demystifierat, redo för mekaniken.
 *
 * Mörk självständig bakgrund (divider-inversion) — byggd för online/skärm,
 * inte svag projektor. Allt ritas additivt ("lighter") på mörk botten =
 * neon-glöd utan dyr shadowBlur per partikel.
 */

interface NeuralDissolveProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Neon-accent för nätverket (ljus, syns på mörk botten). */
  accent?: string;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  dx: number;
  dy: number;
}

interface Node {
  x: number;
  y: number;
  ddx: number;
  ddy: number;
}

const BG = "#080a11";
const BG_TRAIL = "rgba(8, 10, 17, 0.34)";
const FONT = '"SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif';

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [94, 230, 168];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Dela titeln i upp till två balanserade rader. */
function wrapTitle(title: string): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2 && title.length <= 16) return [title];
  const total = title.length;
  let best = 1;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].length + 1;
    const diff = Math.abs(acc - total / 2);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i + 1;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function NeuralDissolve({
  chapter = "01",
  title = "Vi behöver avmystifiera AI",
  subtitle = "Under huven — på åtta minuter",
  accent = "#5EE6A8",
}: NeuralDissolveProps) {
  const step = useSlideSteps(3);
  const stepRef = useRef(step);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [ar, ag, ab] = hexToRgb(accent);
    const acc = (a: number) => `rgba(${ar},${ag},${ab},${a})`;

    let raf = 0;
    let particles: Particle[] = [];
    let nodes: Node[] = [];
    let edges: [number, number][] = [];
    let pulses: { e: number; t: number; spd: number }[] = [];
    let W = 0,
      H = 0,
      dpr = 1,
      cx = 0,
      cy = 0;

    let dissolve = 0; // titel-upplösning 0..1
    let netAlpha = 0; // nätverkets styrka 0..1
    let netDrift = 0; // nätverkets isärdrift 0..1

    const buildNet = () => {
      const layersX = [0.13, 0.31, 0.5, 0.69, 0.87];
      const perLayer = [4, 6, 7, 6, 3];
      nodes = [];
      const layerIdx: number[][] = [];
      layersX.forEach((lx, li) => {
        const cnt = perLayer[li];
        const idxs: number[] = [];
        for (let k = 0; k < cnt; k++) {
          const y =
            cy +
            (k - (cnt - 1) / 2) * ((H * 0.66) / Math.max(1, cnt)) +
            (Math.random() - 0.5) * H * 0.05;
          const x = W * lx + (Math.random() - 0.5) * W * 0.02;
          const ang = Math.atan2(y - cy, x - cx);
          nodes.push({
            x,
            y,
            ddx: Math.cos(ang) * W * 0.22,
            ddy: Math.sin(ang) * H * 0.22,
          });
          idxs.push(nodes.length - 1);
        }
        layerIdx.push(idxs);
      });
      edges = [];
      for (let li = 0; li < layerIdx.length - 1; li++) {
        for (const a of layerIdx[li])
          for (const b of layerIdx[li + 1]) edges.push([a, b]);
      }
      pulses = [];
    };

    const buildText = () => {
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const octx = off.getContext("2d");
      if (!octx) return;
      const lines = wrapTitle(title);
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      let fontSize = Math.min(H * 0.17, W * 0.13);
      const widest = () => {
        octx.font = `700 ${fontSize}px ${FONT}`;
        return Math.max(...lines.map((l) => octx.measureText(l).width));
      };
      while (widest() > W * 0.8 && fontSize > 12) fontSize *= 0.94;
      octx.font = `700 ${fontSize}px ${FONT}`;
      octx.fillStyle = "#fff";
      const lineH = fontSize * 1.12;
      const totalH = lineH * lines.length;
      lines.forEach((l, i) =>
        octx.fillText(l, cx, cy - totalH / 2 + lineH * (i + 0.5)),
      );

      const data = octx.getImageData(0, 0, W, H).data;
      const gap = Math.max(3, Math.round(4.5 * dpr));
      const pts: Particle[] = [];
      for (let y = 0; y < H; y += gap) {
        for (let x = 0; x < W; x += gap) {
          if (data[(y * W + x) * 4 + 3] > 130) {
            const ang =
              Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 1.1;
            const spd = 40 + Math.random() * 120;
            pts.push({
              x: cx + (Math.random() - 0.5) * W * 0.6,
              y: cy + (Math.random() - 0.5) * H * 0.6,
              tx: x,
              ty: y,
              vx: 0,
              vy: 0,
              dx: Math.cos(ang) * spd,
              dy: Math.sin(ang) * spd,
            });
          }
        }
      }
      // Ta ned partikelmängden för prestanda (jämn gallring)
      const cap = 3400;
      if (pts.length > cap) {
        const stride = pts.length / cap;
        const kept: Particle[] = [];
        for (let i = 0; i < cap; i++) kept.push(pts[Math.floor(i * stride)]);
        particles = kept;
      } else {
        particles = pts;
      }
    };

    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, canvas.offsetWidth * dpr);
      canvas.height = Math.max(1, canvas.offsetHeight * dpr);
      W = canvas.width;
      H = canvas.height;
      cx = W / 2;
      cy = H / 2;
      buildNet();
      buildText();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
    };

    setup();
    const onResize = () => setup();
    window.addEventListener("resize", onResize);

    const loop = () => {
      const s = stepRef.current;
      dissolve += ((s >= 1 ? 1 : 0) - dissolve) * 0.05;
      netAlpha += ((s === 0 ? 0.4 : s === 1 ? 1 : 0) - netAlpha) * 0.05;
      netDrift += ((s >= 2 ? 1 : 0) - netDrift) * 0.035;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = BG_TRAIL;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // --- Nätverk ---
      if (netAlpha > 0.02) {
        ctx.lineWidth = Math.max(1, dpr);
        for (const [i, j] of edges) {
          const a = nodes[i];
          const b = nodes[j];
          ctx.strokeStyle = acc(0.09 * netAlpha);
          ctx.beginPath();
          ctx.moveTo(a.x + a.ddx * netDrift, a.y + a.ddy * netDrift);
          ctx.lineTo(b.x + b.ddx * netDrift, b.y + b.ddy * netDrift);
          ctx.stroke();
        }
        // pulser
        if (netAlpha > 0.5 && pulses.length < 26 && Math.random() < 0.5) {
          pulses.push({
            e: (Math.random() * edges.length) | 0,
            t: 0,
            spd: 0.008 + Math.random() * 0.02,
          });
        }
        pulses = pulses.filter((p) => (p.t += p.spd) < 1);
        for (const p of pulses) {
          const [i, j] = edges[p.e];
          const a = nodes[i];
          const b = nodes[j];
          const ax = a.x + a.ddx * netDrift;
          const ay = a.y + a.ddy * netDrift;
          const bx = b.x + b.ddx * netDrift;
          const by = b.y + b.ddy * netDrift;
          const px = ax + (bx - ax) * p.t;
          const py = ay + (by - ay) * p.t;
          ctx.fillStyle = acc(0.9 * netAlpha);
          ctx.beginPath();
          ctx.arc(px, py, 2.4 * dpr, 0, 6.2832);
          ctx.fill();
        }
        // noder
        for (const n of nodes) {
          const x = n.x + n.ddx * netDrift;
          const y = n.y + n.ddy * netDrift;
          ctx.fillStyle = acc(0.7 * netAlpha);
          ctx.beginPath();
          ctx.arc(x, y, 3.4 * dpr, 0, 6.2832);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${0.85 * netAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5 * dpr, 0, 6.2832);
          ctx.fill();
        }
      }

      // --- Titel-partiklar ---
      const alpha = Math.max(0, 1 - dissolve * 1.12);
      if (alpha > 0.01) {
        const size = Math.max(1, 1.15 * dpr);
        ctx.fillStyle = `rgba(233,255,244,${alpha})`;
        for (const p of particles) {
          const k = 0.02 * (1 - dissolve);
          p.vx += (p.tx - p.x) * k + p.dx * 0.05 * dissolve;
          p.vy += (p.ty - p.y) * k + p.dy * 0.05 * dissolve;
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.x += p.vx;
          p.y += p.vy;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, 6.2832);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [title, accent]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: BG }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />

      {/* Kapitel-markör */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.8rem, 4vh, 3rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: "rgba(233,255,244,0.5)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Undertitel — tonar in när titeln lösts upp (steg ≥ 1) */}
      {subtitle ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          <div
            style={{
              marginTop: "clamp(5rem, 12vh, 9rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2.1vw, 1.9rem)",
              letterSpacing: "-0.01em",
              color: "rgba(233,255,244,0.9)",
              textShadow: "0 2px 30px rgba(94,230,168,0.35)",
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.9s ease, transform 0.9s ease",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </div>
        </div>
      ) : null}
    </div>
  );
}
