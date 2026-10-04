"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * Denials — spektakulär lista av negationer. Varje fras revealas BIG,
 * får sedan en strikethrough-animering, och ord-färgen mattas. Avslutas
 * med en valfri konklusion ("vad det ÄR").
 *
 * MDX-format:
 * ```mdx
 * <Denials
 *   prefix="AI är inte:"
 *   conclusion="Det är något helt annat."
 *   accent= "var(--accent)"
 * >
 * - ett orakel
 * - neutralt
 * - sanningssägande
 * - google
 * </Denials>
 * ```
 */

interface DenialsProps {
  /** Liten intro-text uppe (t.ex. "AI är inte:"). */
  prefix?: string;
  /** Slutsats/konklusion längst ner (t.ex. "Det är något helt annat."). */
  conclusion?: string;
  /** Chapter-tagg uppe till höger. */
  chapter?: string;
  /** Bakgrund. */
  background?: string;
  /** Mörk overlay (0-1). Default 0.65. */
  overlay?: number;
  /** Accentfärg på strikethrough + accent-ord. */
  accent?: string;
  /** ms mellan varje frasens reveal. Default 1100. */
  beat?: number | string;
  /** ms efter reveal innan strikethrough slår till. Default 700. */
  strikeDelay?: number | string;
  /** MDX-lista — varje item blir en frase som strykes. */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseDenials(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (raw) out.push(raw);
    });
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) {
    return "var(--slide-base, var(--bg))";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function Denials({
  prefix,
  conclusion,
  chapter,
  background,
  overlay = 0.65,
  accent = "var(--accent)",
  beat = 1100,
  strikeDelay = 700,
  children,
}: DenialsProps) {
  const denials = parseDenials(children);
  const beatNum = typeof beat === "string" ? parseInt(beat, 10) : beat;
  const strikeDelayNum =
    typeof strikeDelay === "string" ? parseInt(strikeDelay, 10) : strikeDelay;

  const beatSec = beatNum / 1000;
  const strikeDelaySec = strikeDelayNum / 1000;

  // Konklusionens delay = efter alla denials revealats + sträckts
  const conclusionDelay = 0.5 + denials.length * beatSec + strikeDelaySec + 0.4;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.4rem, 0.8vh, 0.8rem)",
          padding: "clamp(4rem, 10vh, 8rem) clamp(3rem, 6vw, 6rem)",
          zIndex: 2,
        }}
      >
        {/* Prefix */}
        {prefix ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.4rem, 2.2vw, 2.4rem)",
              fontWeight: 400,
              color: "var(--text-muted)",
              letterSpacing: "-0.01em",
              marginBottom: "clamp(1rem, 2vh, 2rem)",
            }}
          >
            {prefix}
          </motion.div>
        ) : null}

        {/* Denials — varje frase får sin egen rad */}
        {denials.map((text, i) => (
          <DenialLine
            key={i}
            text={text}
            index={i}
            beatSec={beatSec}
            strikeDelaySec={strikeDelaySec}
            accent={accent}
          />
        ))}

        {/* Conclusion */}
        {conclusion ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: conclusionDelay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              marginTop: "clamp(1.5rem, 3vh, 3rem)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.4rem, 2.2vw, 2.4rem)",
              fontWeight: 600,
              color: accent,
              letterSpacing: "-0.01em",
              textAlign: "center",
              textShadow: `0 0 30px ${withAlpha(accent, 0.33)}`,
            }}
          >
            {conclusion}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// DenialLine — en frase som revealas och stryks
// ============================================================================

interface DenialLineProps {
  text: string;
  index: number;
  beatSec: number;
  strikeDelaySec: number;
  accent: string;
}

function DenialLine({
  text,
  index,
  beatSec,
  strikeDelaySec,
  accent,
}: DenialLineProps) {
  const revealDelay = 0.4 + index * beatSec;
  const strikeStart = revealDelay + strikeDelaySec;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.08, y: 14 }}
        animate={{
          opacity: [0, 1, 1, 0.42],
          scale: [1.08, 1, 1, 1],
          y: [14, 0, 0, 0],
        }}
        transition={{
          duration: strikeDelaySec + 0.8,
          delay: revealDelay,
          times: [0, 0.18, 0.55, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(2.6rem, 5.5vw, 5.5rem)",
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          color: "var(--text)",
          textAlign: "center",
        }}
      >
        {text}
      </motion.div>
      {/* Strikethrough-linje */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          delay: strikeStart,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: "-8%",
          right: "-8%",
          height: "clamp(3px, 0.4vw, 5px)",
          background: accent,
          boxShadow: `0 0 18px ${withAlpha(accent, 0.67)}`,
          transformOrigin: "left",
          borderRadius: "2px",
          zIndex: 2,
        }}
      />
    </div>
  );
}
