"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";

interface ParticleFieldProps {
  /** Antal partiklar */
  count?: number | string;
  /** Formations-sekvens: kommaseparerad lista av formations att cykla igenom */
  formations?: string;
  /** Partikelfärg - default accent */
  color?: string;
  /** Partikelstorlek */
  size?: number | string;
  children?: ReactNode;
}

type Formation = "circle" | "square" | "cross" | "heart" | "scatter" | "wave" | "spiral" | "text-A" | "text-I";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  originalX: number;
  originalY: number;
}

/**
 * Canvas-baserat partikelsystem. Partiklar formar olika mönster
 * och kan morfa mellan dem steg-för-steg.
 *
 * Användning:
 * <ParticleField count="800" formations="scatter, circle, square, scatter">
 *   # Text framför partiklarna
 * </ParticleField>
 *
 * Steg-för-steg (space) går igenom formationerna.
 */
export function ParticleField({
  count = 600,
  formations: formationsProp = "scatter, circle, scatter",
  color,
  size = 2.5,
  children,
}: ParticleFieldProps) {
  const countNum = typeof count === "string" ? parseInt(count, 10) : count;
  const sizeNum = typeof size === "string" ? parseFloat(size) : size;

  const formations = formationsProp
    .split(",")
    .map((s) => s.trim() as Formation)
    .filter(Boolean);

  const activeStep = useSlideSteps(formations.length);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  // Initiera partiklar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();

    // Initiera på scatter
    const w = canvas.width;
    const h = canvas.height;
    particlesRef.current = Array.from({ length: countNum }, () => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        x,
        y,
        targetX: x,
        targetY: y,
        vx: 0,
        vy: 0,
        originalX: x,
        originalY: y,
      };
    });

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [countNum]);

  // Uppdatera mål-positioner baserat på aktuell formation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const formation = formations[activeStep] ?? "scatter";
    const targets = computeFormation(formation, countNum, canvas.width, canvas.height);

    particlesRef.current.forEach((p, i) => {
      p.targetX = targets[i].x;
      p.targetY = targets[i].y;
    });
  }, [activeStep, formations, countNum]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Läs accent-färg från CSS
    const cssAccent = getComputedStyle(canvas).getPropertyValue("--accent").trim();
    const resolvedColor = color ?? (cssAccent || "#06b6d4");

    const loop = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.25)"; // svag trail-effekt
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = resolvedColor;

      for (const p of particlesRef.current) {
        // Spring toward target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.vx += dx * 0.02;
        p.vy += dy * 0.02;
        p.vx *= 0.88;
        p.vy *= 0.88;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, sizeNum * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [color, sizeNum]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />
      {children && (
        <div className="slide-prose absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          <div className="flex max-w-4xl flex-col gap-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// Beräkna mål-positioner för en formation
function computeFormation(
  formation: Formation,
  count: number,
  w: number,
  h: number
): { x: number; y: number }[] {
  const cx = w / 2;
  const cy = h / 2;

  switch (formation) {
    case "circle": {
      const r = Math.min(w, h) * 0.35;
      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        // Fyll cirkeln, inte bara omkretsen
        const dist = r * Math.sqrt(Math.random());
        return {
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
        };
      });
    }
    case "square": {
      const s = Math.min(w, h) * 0.6;
      return Array.from({ length: count }, () => ({
        x: cx + (Math.random() - 0.5) * s,
        y: cy + (Math.random() - 0.5) * s,
      }));
    }
    case "cross": {
      const s = Math.min(w, h) * 0.6;
      const thickness = s * 0.15;
      return Array.from({ length: count }, () => {
        const isHorizontal = Math.random() > 0.5;
        if (isHorizontal) {
          return {
            x: cx + (Math.random() - 0.5) * s,
            y: cy + (Math.random() - 0.5) * thickness,
          };
        }
        return {
          x: cx + (Math.random() - 0.5) * thickness,
          y: cy + (Math.random() - 0.5) * s,
        };
      });
    }
    case "heart": {
      return Array.from({ length: count }, () => {
        const t = Math.random() * Math.PI * 2;
        const scale = Math.min(w, h) * 0.018 * (0.6 + Math.random() * 0.4);
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );
        return { x: cx + hx * scale, y: cy + hy * scale };
      });
    }
    case "wave": {
      return Array.from({ length: count }, (_, i) => {
        const x = (i / count) * w;
        const amp = h * 0.15;
        const freq = (i / count) * Math.PI * 6;
        return {
          x,
          y: cy + Math.sin(freq) * amp + (Math.random() - 0.5) * 20,
        };
      });
    }
    case "spiral": {
      const maxR = Math.min(w, h) * 0.4;
      return Array.from({ length: count }, (_, i) => {
        const t = i / count;
        const angle = t * Math.PI * 10;
        const r = t * maxR;
        return {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        };
      });
    }
    case "scatter":
    default:
      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
      }));
  }
}
