"use client";

import { motion } from "framer-motion";

interface GiantScrollProps {
  text: string;
  /** Riktning: "left" = rullar från höger mot vänster (default) */
  direction?: "left" | "right";
  /** Sekunder per text-instans att passera skärmen. Default 30s (meditativt tempo). */
  secondsPerInstance?: number | string;
  /** Andel av skärmhöjden texten tar (0-1) */
  heightRatio?: number | string;
  /** Repetera för oändlig loop */
  loop?: boolean;
  /** Färg - default är accent */
  color?: string;
  /** Outline istället för fylld text */
  outline?: boolean;
  /**
   * Legacy prop - hastighet i sekunder för en full loop.
   * Använd secondsPerInstance istället.
   * @deprecated
   */
  duration?: number | string;
}

/**
 * Gigantisk text som rullar över skärmen.
 * 2/3 av skärmhöjden som default. Oändlig loop.
 *
 * Hastighet: `secondsPerInstance` styr hur långsamt texten rör sig.
 * Default 15s = en text-instans passerar skärmen på 15 sekunder (lugnt tempo).
 *
 * Användning:
 * <GiantScroll text="AI förändrar allt" />
 * <GiantScroll text="LÄRANDE" outline heightRatio="0.85" secondsPerInstance="20" />
 */
export function GiantScroll({
  text,
  direction = "left",
  secondsPerInstance = 30,
  heightRatio = 0.66,
  loop = true,
  color,
  outline = false,
  duration: legacyDuration,
}: GiantScrollProps) {
  // Antal instanser vi repeterar (tillräckligt för att fylla skärmen med marginal)
  const REPEAT_COUNT = 4;
  const spiNum = typeof secondsPerInstance === "string" ? parseFloat(secondsPerInstance) : secondsPerInstance;

  // Legacy duration-stöd: om användaren satt duration, tolka som total-loop-tid
  // och räkna om till per-instans (gammal logik hade 20 instanser per loop; ny har REPEAT_COUNT)
  const durationNum = legacyDuration
    ? (typeof legacyDuration === "string" ? parseFloat(legacyDuration) : legacyDuration)
    : spiNum * REPEAT_COUNT;

  const heightNum = typeof heightRatio === "string" ? parseFloat(heightRatio) : heightRatio;
  const fontSize = `${heightNum * 100}vh`;

  // Repetera texten - tillräckligt för att fylla skärmen, men inte så mycket att det blir panik
  const repeatedText = ` ${text} `.repeat(REPEAT_COUNT);

  const fromX = direction === "left" ? "0%" : "-50%";
  const toX = direction === "left" ? "-50%" : "0%";

  const textStyle: React.CSSProperties = outline
    ? {
        color: "transparent",
        WebkitTextStroke: `2px ${color ?? "var(--accent)"}`,
      }
    : {
        color: color ?? "var(--accent)",
      };

  return (
    <div
      className="relative flex h-full w-full items-center overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <motion.div
        className="flex whitespace-nowrap"
        style={{
          fontFamily: "var(--font-display)",
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          ...textStyle,
        }}
        initial={{ x: fromX }}
        animate={{ x: toX }}
        transition={{
          duration: durationNum,
          ease: "linear",
          repeat: loop ? Infinity : 0,
        }}
      >
        <span>{repeatedText}</span>
        <span>{repeatedText}</span>
      </motion.div>
    </div>
  );
}
