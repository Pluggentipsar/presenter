"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";

interface StatCompareProps {
  /** Första värdet (tex 3 eller "3") */
  from: number | string;
  /** Första suffix (tex "%") */
  fromSuffix?: string;
  /** Första prefix (tex "kr") */
  fromPrefix?: string;
  /** Etikett för första (tex "2022") */
  fromLabel?: string;
  /** Andra värdet (tex 68 eller "68") */
  to: number | string;
  /** Andra suffix */
  toSuffix?: string;
  /** Andra prefix */
  toPrefix?: string;
  /** Etikett för andra (tex "2025") */
  toLabel?: string;
  /** Övergripande rubrik över hela slide */
  title?: string;
  /** Caption under siffrorna - sätter statistiken i kontext */
  caption?: string;
  /** Animationstid i sekunder. Default 1.8 */
  duration?: number | string;
  /** Hur siffran ska visas */
  decimals?: number | string;
}

/**
 * Två siffror i relation - bra för att visa förändring, gap eller
 * jämförelse. Första siffran räknas upp, sen pilen animeras in, sen
 * andra siffran räknas upp.
 *
 * <StatCompare
 *   title="Elevernas AI-användning"
 *   from={3} fromSuffix="%" fromLabel="2022"
 *   to={68} toSuffix="%" toLabel="2025"
 *   caption="Andel gymnasieelever som använder AI veckovis"
 * />
 */
export function StatCompare({
  from,
  fromSuffix = "",
  fromPrefix = "",
  fromLabel,
  to,
  toSuffix = "",
  toPrefix = "",
  toLabel,
  title,
  caption,
  duration = 1.8,
  decimals = 0,
}: StatCompareProps) {
  const fromNum = typeof from === "string" ? parseFloat(from) : from;
  const toNum = typeof to === "string" ? parseFloat(to) : to;
  const durationNum = typeof duration === "string" ? parseFloat(duration) : duration;
  const decimalsNum = typeof decimals === "string" ? parseInt(decimals, 10) : decimals;
  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-12"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="text-[clamp(1.5rem,3vw,2.25rem)] leading-tight text-text-muted"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        <div className="flex items-center justify-center gap-6 md:gap-12">
          <AnimatedStat
            value={fromNum}
            prefix={fromPrefix}
            suffix={fromSuffix}
            label={fromLabel}
            duration={durationNum}
            delay={0.2}
            decimals={decimalsNum}
            muted
          />

          <motion.div
            className="flex flex-col items-center gap-1 text-accent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: durationNum * 0.5 }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 md:h-14 md:w-14"
              style={{ filter: "drop-shadow(0 0 16px var(--accent-glow))" }}
            >
              <motion.path
                d="M5 12h14M12 5l7 7-7 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: durationNum * 0.5 }}
              />
            </svg>
          </motion.div>

          <AnimatedStat
            value={toNum}
            prefix={toPrefix}
            suffix={toSuffix}
            label={toLabel}
            duration={durationNum}
            delay={durationNum * 0.5 + 0.5}
            decimals={decimalsNum}
          />
        </div>

        {caption && (
          <motion.p
            className="mx-auto max-w-3xl text-center text-[clamp(1rem,1.8vw,1.375rem)] leading-snug text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: durationNum + 0.4 }}
          >
            <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
          </motion.p>
        )}
      </div>
    </div>
  );
}

interface AnimatedStatProps {
  value: number;
  prefix: string;
  suffix: string;
  label?: string;
  duration: number;
  delay: number;
  decimals: number;
  muted?: boolean;
}

function AnimatedStat({
  value,
  prefix,
  suffix,
  label,
  duration,
  delay,
  decimals,
  muted = false,
}: AnimatedStatProps) {
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    let cancelled = false;
    const startMs = performance.now();
    const delayMs = delay * 1000;
    const totalMs = duration * 1000;
    const tickMs = 1000 / 60;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startMs - delayMs;
      if (elapsed < 0) {
        timer = setTimeout(tick, tickMs);
        return;
      }
      if (elapsed >= totalMs) {
        setDisplay(value.toFixed(decimals));
        return;
      }
      const progress = elapsed / totalMs;
      setDisplay((value * easeOut(progress)).toFixed(decimals));
      timer = setTimeout(tick, tickMs);
    };

    timer = setTimeout(tick, tickMs);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [value, duration, delay, decimals]);

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div
        className={`text-[clamp(4rem,10vw,8.5rem)] leading-none tabular-nums ${
          muted ? "text-text-muted" : "text-accent"
        }`}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          textShadow: muted ? "none" : "0 0 32px var(--accent-glow)",
        }}
      >
        {prefix}
        {display}
        {suffix}
      </div>
      {label && (
        <div className="text-xs uppercase tracking-[0.3em] text-text-muted md:text-sm">
          {label}
        </div>
      )}
    </motion.div>
  );
}
