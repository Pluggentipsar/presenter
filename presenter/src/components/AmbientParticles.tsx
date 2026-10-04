"use client";

import { useEffect, useRef } from "react";

interface AmbientParticlesProps {
  /** Antal partiklar. Default 160. */
  count?: number;
  /** Partikelstorlek i px. Default 2.4. */
  size?: number;
  /** Max-opacity per partikel (0–1). Default 0.6. */
  opacity?: number;
  /** Driftshastighet (max px/frame i DPR-space). Default 1.6. */
  speed?: number;
  /** Färg. Default läser --accent från tema. */
  color?: string;
}

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Individuell opacity-faktor så de blinkar svagt olika */
  a: number;
  ap: number; // opacity-phase för pulsering
}

/**
 * Mycket diskret drivande partikel-layer. Tänkt som ambient bakgrund
 * för textslides — täcks automatiskt av slides med egna fullbilds-bakgrunder
 * (VideoBackground, HeroImage etc.) eftersom canvasen ligger bakom slide-
 * innehållet men ovanpå body.
 *
 * Medvetet lätt: glest antal partiklar, långsamt drift, svag opacity.
 */
export function AmbientParticles({
  count = 160,
  size = 2.4,
  opacity = 0.6,
  speed = 1.6,
  color,
}: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();

    const resolvedColor =
      color ??
      (getComputedStyle(canvas).getPropertyValue("--accent").trim() ||
        "#b4763a");

    dotsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2 * speed * dpr,
      vy: (Math.random() - 0.5) * 2 * speed * dpr,
      a: 0.4 + Math.random() * 0.6,
      ap: Math.random() * Math.PI * 2,
    }));

    const onResize = () => {
      const oldW = canvas.width;
      const oldH = canvas.height;
      resize();
      const scaleX = canvas.width / (oldW || 1);
      const scaleY = canvas.height / (oldH || 1);
      for (const d of dotsRef.current) {
        d.x *= scaleX;
        d.y *= scaleY;
      }
    };
    window.addEventListener("resize", onResize);

    // Throttla till ~30 fps. Driften är långsam → omärkbart, men halverar den
    // löpande kostnaden (särskilt när glas-blur suddar om canvasen ovanpå).
    const FRAME_MS = 1000 / 30;
    let lastFrame = 0;
    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = resolvedColor;

      for (const d of dotsRef.current) {
        d.x += d.vx;
        d.y += d.vy;

        // Wrap runt kanterna
        if (d.x < 0) d.x = canvas.width;
        else if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        else if (d.y > canvas.height) d.y = 0;

        // Svag pulsering
        d.ap += 0.008;
        const pulse = 0.7 + Math.sin(d.ap) * 0.3;
        ctx.globalAlpha = opacity * d.a * pulse;

        ctx.beginPath();
        ctx.arc(d.x, d.y, size * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [count, size, opacity, speed, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ display: "block" }}
    />
  );
}
