"use client";

import { motion } from "framer-motion";
import { withAlpha } from "@/lib/gradient-presets";
import {
  AmbientBackdrop,
  glassCardStyle,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";

interface LiquidDividerProps {
  /** Aktnummer, t.ex. "01", "02" eller "I", "II". */
  number?: string;
  /** Akt-titel. */
  title: string;
  /** Underrubrik / akt-tagline. */
  subtitle?: string;
  /** Förväntad tid. */
  duration?: string;
  /** Bakgrundsbild att refraktera mot. */
  background?: string;
  /** Sekundär ambient-accent. */
  accent2?: string;
}

/**
 * LiquidDivider — premium akt-transition i nattglas-stil.
 *
 * Stor number-display i frosted glass-card till vänster, akt-titel + subtitle
 * till höger, en refracting accent-linje som tecknas in mellan dem. Ambient
 * orbs i bakgrunden. Spring-physics entrance.
 *
 * För andra teman: använd vanlig SectionDivider istället.
 */
export function LiquidDivider({
  number,
  title,
  subtitle,
  duration,
  background,
  accent2,
}: LiquidDividerProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop
        background={background}
        accent2={accent2}
        overlay={0.7}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(3rem, 5vw, 5rem)",
          display: "grid",
          gridTemplateColumns: number ? "auto minmax(0, 1fr)" : "1fr",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "center",
        }}
      >
        {/* Number-card */}
        {number ? (
          <motion.div
            initial={{ opacity: 0, x: -24, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 28,
              mass: 1,
            }}
            style={{
              ...glassCardStyle({
                radius: "1.5rem",
                blur: 28,
                padding: "clamp(2rem, 3vw, 3rem) clamp(2.5rem, 4vw, 4rem)",
              }),
              position: "relative",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(5rem, 12vw, 10rem)",
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: "var(--accent)",
              textShadow: "0 0 60px var(--accent-glow), 0 0 24px rgba(122,168,255,0.35)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <SpecularHighlight intensity={0.22} />
            <span style={{ position: "relative", zIndex: 2 }}>{number}</span>
          </motion.div>
        ) : null}

        {/* Title-block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.2rem, 2.5vh, 2rem)",
            maxWidth: "44em",
          }}
        >
          {/* Refracting accent-line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              duration: 1.0,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              height: "1.5px",
              width: "6rem",
              background: "linear-gradient(90deg, var(--accent) 0%, transparent 100%)",
              boxShadow: "0 0 20px var(--accent-glow)",
              transformOrigin: "left",
              borderRadius: "999px",
            }}
          />

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 7vw, 6rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </motion.h1>

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.2rem, 1.6vw, 1.6rem)",
                lineHeight: 1.45,
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "38em",
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}

          {duration ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  display: "inline-block",
                  width: "0.4rem",
                  height: "0.4rem",
                  borderRadius: "50%",
                  background: withAlpha("var(--accent)", 0.9),
                  boxShadow: "0 0 10px var(--accent-glow)",
                }}
              />
              {duration}
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
