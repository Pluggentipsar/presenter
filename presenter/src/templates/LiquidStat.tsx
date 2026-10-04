"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import {
  AmbientBackdrop,
  glassCardStyle,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";

interface LiquidStatProps {
  /** Siffran att räkna upp till. */
  value: number | string;
  /** Suffix, t.ex. " %", " miljoner". */
  suffix?: string;
  /** Prefix, t.ex. "$", "+". */
  prefix?: string;
  /** Liten kicker uppe till vänster (uppercase mono). */
  eyebrow?: string;
  /** Liten chapter uppe till höger. */
  chapter?: string;
  /** Kontext OVANFÖR siffran (typ "Mer än"). */
  contextAbove?: string;
  /** Huvudbudskapet UNDER siffran. */
  contextBelow?: string;
  /** Källa (visas litet längst ned). */
  source?: string;
  /** Animationstid i sekunder. Default 1.8. */
  duration?: number | string;
  /** Decimaler. */
  decimals?: number | string;
  /** Färg på siffran. Default accent. */
  color?: string;
  /** Bakgrundsbild att refraktera mot. */
  background?: string;
  /** Sekundär ambient-accent. */
  accent2?: string;
  /** Visa fyllnadsbar bakom siffran från 0 till value%. Default true om value <= 100. */
  fillBar?: boolean;
  /** Bryt suffix till egen rad under siffran (för långa ord). */
  wrapSuffix?: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function LiquidStat({
  value,
  suffix = "",
  prefix = "",
  eyebrow,
  chapter,
  contextAbove,
  contextBelow,
  source,
  duration = 1.8,
  decimals = 0,
  color,
  background,
  accent2,
  fillBar,
  wrapSuffix = false,
}: LiquidStatProps) {
  const targetValue = Number(value);
  const decimalsNum =
    typeof decimals === "string" ? parseInt(decimals, 10) : decimals;
  const durationNum =
    typeof duration === "string" ? parseFloat(duration) : duration;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(targetValue)) return;
    let raf = 0;
    const start = performance.now();
    const totalMs = durationNum * 1000;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= totalMs) {
        setDisplayValue(targetValue);
        return;
      }
      const progress = elapsed / totalMs;
      setDisplayValue(targetValue * easeOut(progress));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, durationNum]);

  const formatted = displayValue.toLocaleString("sv-SE", {
    minimumFractionDigits: decimalsNum,
    maximumFractionDigits: decimalsNum,
  });

  const numColor = color ?? "var(--accent)";
  const showFillBar =
    fillBar ?? (Number.isFinite(targetValue) && targetValue <= 100);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.5rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(2rem, 4vh, 3rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2.5rem, 4vw, 4rem)",
            right: "clamp(2.5rem, 4vw, 4rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            zIndex: 3,
            gap: "2rem",
          }}
        >
          {eyebrow ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              {eyebrow}
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Glass stat card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
            mass: 0.9,
          }}
          style={{
            ...glassCardStyle({
              radius: "1.75rem",
              blur: 32,
              padding: "clamp(2.5rem, 4vw, 4rem)",
            }),
            position: "relative",
            maxWidth: "min(72rem, 92%)",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.2rem, 2vh, 1.8rem)",
          }}
        >
          <SpecularHighlight intensity={0.16} />

          {/* Fyllnadsbar bakom siffran */}
          {showFillBar ? (
            <>
              <motion.div
                aria-hidden
                initial={{ width: "0%" }}
                animate={{ width: `${targetValue}%` }}
                transition={{
                  duration: durationNum,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${withAlpha(numColor, 0.24)} 0%, ${withAlpha(numColor, 0.08)} 65%, transparent 100%)`,
                  pointerEvents: "none",
                  zIndex: 0,
                  borderRadius: "inherit",
                }}
              />
              <motion.div
                aria-hidden
                initial={{ left: "0%", opacity: 0 }}
                animate={{
                  left: `${targetValue}%`,
                  opacity: [0, 1, 1],
                }}
                transition={{
                  duration: durationNum,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.15, 1],
                }}
                style={{
                  position: "absolute",
                  top: "12%",
                  bottom: "12%",
                  width: "2px",
                  background: numColor,
                  boxShadow: `0 0 32px ${withAlpha(numColor, 0.7)}, 0 0 10px ${numColor}`,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            </>
          ) : null}

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1rem, 1.8vh, 1.5rem)",
            }}
          >
            {contextAbove ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                  margin: 0,
                  maxWidth: "44rem",
                }}
              >
                {contextAbove}
              </motion.p>
            ) : null}

            <div
              style={{
                display: wrapSuffix ? "flex" : "flex",
                flexDirection: wrapSuffix ? "column" : "row",
                alignItems: wrapSuffix ? "flex-start" : "baseline",
                gap: wrapSuffix ? "0.4rem" : "0.3rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.3rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  letterSpacing: "-0.045em",
                  lineHeight: 0.88,
                }}
              >
                {prefix ? (
                  <span
                    style={{
                      fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {prefix}
                  </span>
                ) : null}
                <motion.span
                  initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    fontSize: "clamp(7rem, 22vw, 18rem)",
                    color: numColor,
                    textShadow: `0 0 72px ${withAlpha(numColor, 0.5)}, 0 0 24px ${withAlpha(numColor, 0.3)}`,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatted}
                </motion.span>
                {suffix && !wrapSuffix ? (
                  <span
                    style={{
                      fontSize: "clamp(3rem, 9vw, 7rem)",
                      color: "var(--text)",
                      fontWeight: 500,
                      marginLeft: "0.3rem",
                    }}
                  >
                    {suffix}
                  </span>
                ) : null}
              </div>
              {suffix && wrapSuffix ? (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  style={{
                    fontSize: "clamp(2.4rem, 6vw, 5rem)",
                    color: "var(--text)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    letterSpacing: "-0.025em",
                    marginTop: "0.2em",
                  }}
                >
                  {suffix.trim()}
                </motion.span>
              ) : null}
            </div>

            {contextBelow ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.4rem, 2.3vw, 2.2rem)",
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                  lineHeight: 1.3,
                  margin: 0,
                  maxWidth: "48rem",
                }}
              >
                {contextBelow}
              </motion.p>
            ) : null}
          </div>
        </motion.div>

        {/* Source nederst */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{
              position: "absolute",
              bottom: "clamp(2rem, 4vh, 3rem)",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textAlign: "center",
              zIndex: 3,
            }}
          >
            {source}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
