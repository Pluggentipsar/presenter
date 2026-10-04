"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { Ornament } from "../components/Ornament";
import { EditableText } from "@/lib/inline-edit";

interface StatCounterProps {
  value: number | string;
  suffix?: string;
  prefix?: string;
  label?: string;
  source?: string;
  decimals?: number | string;
  duration?: number | string;
}

/**
 * Animerad siffra som räknar upp från 0 till värdet.
 * Användbar för statistik: "75%", "77%", "750 miljoner", etc.
 */
export function StatCounter({
  value,
  suffix = "",
  prefix = "",
  label,
  source,
  decimals = 0,
  duration = 1.6,
}: StatCounterProps) {
  const targetValue = typeof value === "string" ? parseFloat(value) : value;
  const decimalsNum = typeof decimals === "string" ? parseInt(decimals, 10) : decimals;
  const durationNum = typeof duration === "string" ? parseFloat(duration) : duration;

  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, targetValue, {
      duration: durationNum,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [targetValue, durationNum, motionValue]);

  const formatted = displayValue.toLocaleString("sv-SE", {
    minimumFractionDigits: decimalsNum,
    maximumFractionDigits: decimalsNum,
  });

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col items-start gap-6"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <Ornament size="4rem" />
        <div
          className="flex items-baseline leading-none"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
            textTransform: "var(--heading-case)" as "normal" | "uppercase",
          }}
        >
          {prefix && (
            <span className="mr-2 text-[clamp(2rem,5vw,3.5rem)] text-text-muted">{prefix}</span>
          )}
          <span
            className="text-[clamp(5rem,15vw,12rem)]"
            style={{
              color: "var(--accent)",
              textShadow: "0 0 40px var(--accent-glow)",
            }}
          >
            {formatted}
          </span>
          {suffix && (
            <span className="ml-2 text-[clamp(3rem,8vw,6rem)] font-semibold text-text">
              {suffix}
            </span>
          )}
        </div>
        {label && (
          <motion.p
            className="max-w-2xl text-[clamp(1.25rem,2.5vw,1.875rem)] leading-snug text-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <EditableText path="label" value={label ?? ""}>{label}</EditableText>
          </motion.p>
        )}
        {source && (
          <motion.p
            className="text-xs uppercase tracking-[0.2em] text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            {source}
          </motion.p>
        )}
      </div>
    </div>
  );
}
