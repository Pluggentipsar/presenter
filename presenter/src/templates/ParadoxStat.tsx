"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * ParadoxStat — paradox-driven slide där en setup-mening landar först,
 * sen en bryggord ("Ändå...", "Men..."), sen en MASSIV siffra som räknas
 * upp, sen kontext-caption, sen källa.
 *
 * Numret är visuellt hjärtat — alla andra element är dimmade/sekundära.
 * Räkneverket startar efter setup + bridge har landat.
 *
 * MDX-format:
 * ```mdx
 * <ParadoxStat
 *   chapter="§ Antropomorfism"
 *   setup="Det sitter inte en **människa** på andra sidan."
 *   bridge="Ändå..."
 *   value="14"
 *   suffix="%"
 *   caption="av Gen Z litar mer på AI än på **mänskliga experter**."
 *   source="faktabaari.fi"
 *   accent= "var(--accent)"
 *   background="..."
 * />
 * ```
 */

interface ParadoxStatProps {
  chapter?: string;
  /** Första mening — den dimmade kontextualiseringen. **bold** = accent. */
  setup?: string;
  /** Bryggord, t.ex. "Ändå..." eller "Men...". Italic, accent. */
  bridge?: string;
  /** Siffran att räkna upp till. Sträng eller nummer. */
  value: string | number;
  /** Suffix, t.ex. "%", " miljoner". */
  suffix?: string;
  /** Prefix, t.ex. "$", "+". */
  prefix?: string;
  /** Decimaler. */
  decimals?: number | string;
  /** Animations-tid för räkneverket. Default 2.0s. */
  duration?: number | string;
  /** Caption under siffran. **bold** = accent. */
  caption?: string;
  /** Källa längst ner (UPPERCASE mono). */
  source?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.78. */
  overlay?: number | string;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function ParadoxStat({
  chapter,
  setup,
  bridge,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 2.0,
  caption,
  source,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
}: ParadoxStatProps) {
  const targetValue = typeof value === "string" ? parseFloat(value) : value;
  const decimalsNum =
    typeof decimals === "string" ? parseInt(decimals, 10) : decimals;
  const durationNum =
    typeof duration === "string" ? parseFloat(duration) : duration;
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(targetValue)) return;
    // Räkneverket startar efter setup + bridge har landat
    const startMs = performance.now();
    const delayMs = 2200;
    const totalMs = durationNum * 1000;
    let raf = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const elapsed = now - startMs - delayMs;
      if (elapsed < 0) {
        setDisplayValue(0);
      } else if (elapsed >= totalMs) {
        setDisplayValue(targetValue);
        return;
      } else {
        const progress = elapsed / totalMs;
        setDisplayValue(targetValue * easeOut(progress));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, durationNum]);

  const formatted = displayValue.toLocaleString("sv-SE", {
    minimumFractionDigits: decimalsNum,
    maximumFractionDigits: decimalsNum,
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Subtil pulserande accent-halo bakom siffran. Klassen ambient-accent
          låter tysta teman (kobolt: rent papper) släcka lagret. */}
      <motion.div
        aria-hidden
        className="ambient-accent"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.5, scale: [0.95, 1.08, 0.95] }}
        transition={{
          opacity: { duration: 1.4, delay: 2.4 },
          scale: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3.0,
          },
        }}
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "75vmin",
          height: "60vmin",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${withAlpha(accent, 0.19)} 0%, transparent 60%)`,
          filter: "blur(50px)",
          zIndex: 1,
        }}
      />

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 6rem)",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.6rem, 1.4vh, 1rem)",
          zIndex: 2,
        }}
      >
        {/* Setup-mening — först, dimmad */}
        {setup ? (
          <motion.div
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 0.85, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.0, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "var(--room-body, clamp(1.3rem, 2.1vw, 2rem))",
              lineHeight: 1.35,
              letterSpacing: "-0.005em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "26em",
              margin: 0,
            }}
          >
            {renderInline(setup, accent)}
          </motion.div>
        ) : null}

        {/* Bridge-ord (Ändå...) */}
        {bridge ? (
          <motion.div data-stat-bridge
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.65, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--room-body, clamp(1.1rem, 1.8vw, 1.7rem))",
              color: `var(--room-stat-bridge, ${accent})`,
              letterSpacing: "0.02em",
              textShadow: `0 0 24px ${withAlpha(accent, 0.33)}`,
              marginTop: "clamp(0.4rem, 1vh, 0.8rem)",
              marginBottom: "clamp(0.4rem, 1vh, 0.8rem)",
            }}
          >
            {bridge}
          </motion.div>
        ) : null}

        {/* MASSIVA siffran */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, filter: "blur(24px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 2.0,
            ease: [0.22, 1.05, 0.36, 1],
          }}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            lineHeight: 0.85,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            color: accent,
            textShadow: `0 0 80px ${withAlpha(accent, 0.47)}, 0 0 160px ${withAlpha(accent, 0.2)}`,
            margin: "clamp(0.4rem, 1vh, 0.8rem) 0",
          }}
        >
          {prefix ? (
            <span
              style={{
                fontSize: "clamp(2rem, 5vw, 4.5rem)",
                color: "var(--text-muted)",
                marginRight: "0.2em",
              }}
            >
              {prefix}
            </span>
          ) : null}
          <span
            style={{
              fontSize: "clamp(6rem, 18vw, 17rem)",
            }}
          >
            {formatted}
          </span>
          {suffix ? (
            <span
              style={{
                fontSize: "clamp(3rem, 8vw, 7rem)",
                color: accent,
                marginLeft: "0.06em",
              }}
            >
              {suffix}
            </span>
          ) : null}
        </motion.div>

        {/* Caption */}
        {caption ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 4.4 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "var(--room-body, clamp(1.2rem, 1.9vw, 1.85rem))",
              lineHeight: 1.35,
              letterSpacing: "-0.005em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "26em",
              margin: 0,
            }}
          >
            {renderInline(caption, accent)}
          </motion.div>
        ) : null}

        {/* Källa */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 0.7, delay: 5.2 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.85rem))",
              letterSpacing: "var(--room-source-spacing, 0.28em)",
              maxWidth: "90vw",
              textAlign: "center",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
            }}
          >
            {source}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
