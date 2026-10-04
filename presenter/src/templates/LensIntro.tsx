"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * LensIntro — typografisk inledning för en lins-sektion.
 *
 * Designad för att återanvändas för alla 5 linser i akt 2. Stort lins-namn
 * dominerar visuellt, med ett dekorativt index-nummer som vakt i bakgrunden.
 * Tagline ramar linsen som ett *sätt att tänka* — inte ett svar.
 *
 * Animation:
 *   1. Index-nummer (stort, halvgenomskinligt) fader in i bakgrunden
 *   2. Hårkorsmarkör + chapter-rad
 *   3. Lins-namn skrivs upp
 *   4. Subtitle (frågan) glider in
 *   5. Tagline fader in sist
 */

interface LensIntroProps {
  /** Linsens nummer (t.ex. "01"). */
  number?: string;
  /** Totalt antal linser (t.ex. "05"). */
  total?: string;
  /** Linsens namn (t.ex. "Affordans"). */
  name: string;
  /** Underrubrik som ramar linsen som fråga (t.ex. "Vad inbjuder tekniken till?"). */
  subtitle?: string;
  /** Tagline som påminner om att det är en LINS — inte ett svar. */
  tagline?: string;
  chapter?: string;
  background?: string;
  overlay?: number;
  accent?: string;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function LensIntro({
  number = "01",
  total = "05",
  name,
  subtitle,
  tagline,
  chapter,
  background,
  overlay = 0.7,
  accent = "var(--accent)",
}: LensIntroProps) {
  const resolvedChapter = chapter ?? `§ Lins ${number} / ${total}`;

  // När en foto-/URL-bakgrund anges läggs en mörk scrim ovanpå för läsbarhet,
  // så texten måste vara fast ljus oavsett tema. Utan foto-bakgrund följer
  // ytan temat (var(--bg)) och texten ska följa temat (var(--text)).
  const hasPhotoBg = Boolean(background && (background.startsWith("/") || background.startsWith("http")));
  const textPrimary = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const numberColor = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textShadow = hasPhotoBg ? "0 8px 50px rgba(0,0,0,0.6)" : "none";
  const subtitleShadow = hasPhotoBg ? "0 4px 20px rgba(0,0,0,0.4)" : "none";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Stort dekorativt nummer i bakgrunden */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.07, scale: 1 }}
        transition={{ duration: 1.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "50%",
          left: "62%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(28rem, 65vw, 80rem)",
          color: numberColor,
          letterSpacing: "-0.08em",
          lineHeight: 0.85,
          userSelect: "none",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 0,
        }}
      >
        {number}
      </motion.div>

      {/* Chapter — uppe till höger */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{
          position: "absolute",
          top: "clamp(2rem, 4vh, 3.5rem)",
          right: "clamp(2rem, 4vw, 3.5rem)",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: textMuted,
          zIndex: 5,
        }}
      >
        <EditableText path="chapter" value={resolvedChapter}>
          {resolvedChapter}
        </EditableText>
      </motion.div>

      {/* Hårkorsmarkör — uppe till vänster */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex h-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          justifyContent: "center",
          gap: "clamp(1.4rem, 2.5vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Index-tagg ovanför namnet */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.85rem, 1.1vw, 1.15rem)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: accent,
          }}
        >
          Lins {number} / {total}
        </motion.div>

        {/* Lins-namn — huvuddrabbning */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(4.5rem, 11vw, 12rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: textPrimary,
            margin: 0,
            textShadow,
          }}
        >
          <EditableText path="name" value={name}>
            {name}
          </EditableText>
        </motion.h1>

        {/* Subtitle — frågan som linsen ställer */}
        {subtitle ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.5rem, 2.6vw, 2.8rem)",
              lineHeight: 1.15,
              color: textPrimary,
              maxWidth: "26em",
              textShadow: subtitleShadow,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Tagline — påminner om att det är en LINS */}
        {tagline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2.2 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)",
              color: textMuted,
              maxWidth: "34em",
              lineHeight: 1.45,
              marginTop: "clamp(0.5rem, 1vh, 1rem)",
              borderLeft: `2px solid ${withAlpha(accent, 0.4)}`,
              paddingLeft: "1rem",
            }}
          >
            <EditableText path="tagline" value={tagline}>
              {tagline}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
