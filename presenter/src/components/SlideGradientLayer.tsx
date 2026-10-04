"use client";

/**
 * SlideGradientLayer — heltäckande gradient-bakgrund per slide.
 *
 * Ligger längst bak i SlideViewer (z-index -1) — bakom slide-innehållet
 * och bakom ev. SlideEffectLayer, ovanpå temats bg. Renderar fyra uttryck:
 *
 *  - linear (statisk)   — mjuk diagonal övergång
 *  - linear (animerad)  — gradienten gungar långsamt via transform
 *  - mesh (statisk)     — färgblobbar som smälter ihop (CSS radial-gradients)
 *  - mesh (animerad)    — blobbarna driver fritt → levande aurora
 *
 * Respekterar prefers-reduced-motion (faller tillbaka till statisk).
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { GradientConfig } from "@/lib/gradient-presets";
import {
  buildLinearGradientCss,
  buildMeshGradientCss,
  meshBaseColor,
} from "@/lib/gradient-presets";

export function SlideGradientLayer({ config }: { config: GradientConfig }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const animate = config.animated && !reduceMotion;

  if (config.style === "mesh") {
    return animate ? (
      <AnimatedMesh colors={config.colors} />
    ) : (
      <StaticLayer css={buildMeshGradientCss(config.colors)} />
    );
  }

  return animate ? (
    <AnimatedLinear colors={config.colors} angle={config.angle} />
  ) : (
    <StaticLayer css={buildLinearGradientCss(config.colors, config.angle)} />
  );
}

/* ── Statiskt lager ───────────────────────────────────────────────────── */

function StaticLayer({ css }: { css: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: css,
      }}
    />
  );
}

/* ── Animerad linjär — oversized gradient som gungar via transform ────── */

function AnimatedLinear({
  colors,
  angle,
}: {
  colors: string[];
  angle: number;
}) {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <motion.div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
          background: buildLinearGradientCss(colors, angle),
          willChange: "transform",
        }}
        animate={{
          x: ["-6%", "6%", "-6%"],
          y: ["4%", "-5%", "4%"],
          rotate: [-3.5, 3.5, -3.5],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/* ── Animerad mesh — drivande, suddiga färgblobbar ───────────────────── */

interface BlobDef {
  /** Hem-position i procent av lagret. */
  cx: number;
  cy: number;
  /** Diameter i vw. */
  size: number;
  /** Index i färgpaletten. */
  ci: number;
  /** Drift-amplitud i procent av blobens egen storlek. */
  dx: number;
  dy: number;
  /** Animations-längd (s) — alla olika så rörelsen aldrig synkar. */
  dur: number;
}

const MESH_BLOBS: BlobDef[] = [
  { cx: 18, cy: 22, size: 62, ci: 0, dx: 16, dy: 12, dur: 19 },
  { cx: 84, cy: 16, size: 54, ci: 1, dx: -14, dy: 16, dur: 23 },
  { cx: 74, cy: 82, size: 66, ci: 2, dx: -18, dy: -12, dur: 21 },
  { cx: 24, cy: 86, size: 50, ci: 1, dx: 14, dy: -16, dur: 27 },
  { cx: 52, cy: 48, size: 58, ci: 0, dx: 12, dy: 14, dur: 17 },
  { cx: 92, cy: 58, size: 44, ci: 2, dx: -12, dy: -14, dur: 25 },
];

function AnimatedMesh({ colors }: { colors: string[] }) {
  const base = meshBaseColor(colors);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: base,
        // Begränsa screen-blend till detta lager
        isolation: "isolate",
      }}
    >
      {MESH_BLOBS.map((b, i) => {
        const color = colors[b.ci % colors.length];
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: `${b.cx}%`,
              top: `${b.cy}%`,
              width: `${b.size}vw`,
              height: `${b.size}vw`,
              marginLeft: `-${b.size / 2}vw`,
              marginTop: `-${b.size / 2}vw`,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color} 0%, transparent 72%)`,
              filter: "blur(34px)",
              mixBlendMode: "screen",
              willChange: "transform",
            }}
            animate={{
              x: [`-${b.dx}%`, `${b.dx}%`, `-${b.dx}%`],
              y: [`${b.dy}%`, `-${b.dy}%`, `${b.dy}%`],
              scale: [1, 1.18, 1],
            }}
            transition={{
              duration: b.dur,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
