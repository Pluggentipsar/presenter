"use client";

import { motion } from "framer-motion";

interface LayeredScrollProps {
  /** Highlight-ordet som rullar horisontellt, tex "Lärande" */
  text: string;
  /** Bakgrundsbild (URL). Alternativ till bgColor. */
  bgImage?: string;
  /** Bakgrundsfärg om ingen bild. Default: accent-dim / mjuk terrakotta. */
  bgColor?: string;
  /** PNG med transparent bakgrund som placeras centrerat framför texten */
  foregroundImage?: string;
  /** Alt-text på foregroundImage (tillgänglighet) */
  foregroundAlt?: string;
  /** Hur stor foreground-bilden är, som andel av slide-höjden (0-1). Default 0.75 */
  foregroundHeightRatio?: number | string;
  /** Textfärg. Default: djup charcoal #1a1a1a för läsbarhet mot varma bakgrunder */
  textColor?: string;
  /** Rullnings-riktning. Default "left". */
  direction?: "left" | "right";
  /** Sekunder per text-instans att passera skärmen. Default 22s (lugnt). */
  secondsPerInstance?: number | string;
  /** Andel av slide-höjden som texten tar (0-1). Default 0.55 */
  heightRatio?: number | string;
  /** Font-style. Default "italic" (matchar referensen). */
  fontStyle?: "italic" | "normal";
  /** Font-family override. Default tema-display-font. */
  fontFamily?: string;
  /** Stäng av loopen */
  loop?: boolean;
}

/**
 * LayeredScroll — tre lager:
 *   1. bakgrund (bild eller färg)
 *   2. highlight-ord som rullar horisontellt
 *   3. transparent PNG-objekt centrerat framför texten
 *
 * Tänkt för slides där ett ord bär hela beskedet (t.ex. "Lärande", "William")
 * innan en uppföljande slide som fördjupar. Objektbilden är valfri — utan
 * den blir det en enklare "stort rullande ord"-slide.
 *
 * <LayeredScroll
 *   text="Lärande"
 *   bgImage="/bakgrunder/terracotta.jpg"
 *   foregroundImage="/overvuxet/bocker.png"
 * />
 */
export function LayeredScroll({
  text,
  bgImage,
  bgColor,
  foregroundImage,
  foregroundAlt,
  foregroundHeightRatio = 0.75,
  textColor = "#1a1a1a",
  direction = "left",
  secondsPerInstance = 22,
  heightRatio = 0.55,
  fontStyle = "italic",
  fontFamily,
  loop = true,
}: LayeredScrollProps) {
  const REPEAT_COUNT = 4;
  const spiNum =
    typeof secondsPerInstance === "string" ? parseFloat(secondsPerInstance) : secondsPerInstance;
  const totalDuration = spiNum * REPEAT_COUNT;

  const heightNum =
    typeof heightRatio === "string" ? parseFloat(heightRatio) : heightRatio;
  const fontSize = `${heightNum * 100}vh`;

  const fgHeightNum =
    typeof foregroundHeightRatio === "string"
      ? parseFloat(foregroundHeightRatio)
      : foregroundHeightRatio;
  const fgHeight = `${fgHeightNum * 100}vh`;

  const repeatedText = ` ${text} `.repeat(REPEAT_COUNT);
  const fromX = direction === "left" ? "0%" : "-50%";
  const toX = direction === "left" ? "-50%" : "0%";

  const bgStyle: React.CSSProperties = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: bgColor ?? "var(--accent-dim, #d4a585)",
      };

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={bgStyle}
    >
      {/* Lager 2 — rullande text */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center whitespace-nowrap"
        style={{
          fontFamily: fontFamily ?? "var(--font-display)",
          fontSize,
          fontWeight: 900,
          fontStyle,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: textColor,
        }}
        initial={{ x: fromX }}
        animate={{ x: toX }}
        transition={{
          duration: totalDuration,
          ease: "linear",
          repeat: loop ? Infinity : 0,
        }}
        aria-hidden
      >
        <span>{repeatedText}</span>
        <span>{repeatedText}</span>
      </motion.div>

      {/* Lager 3 — foreground-objekt */}
      {foregroundImage && (
        <img
          src={foregroundImage}
          alt={foregroundAlt ?? ""}
          className="relative z-10 max-w-[80%] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.18)]"
          style={{ height: fgHeight, width: "auto" }}
        />
      )}

      {/* Screen-reader-tillgängligt ord (dolt visuellt, uppläst av sr) */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
