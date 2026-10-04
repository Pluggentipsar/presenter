"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

interface TonalityQuestionProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor central fråga. */
  question: string;
  /**
   * Eventuell uppföljande tagline efter paus.
   * T.ex. "Vi har börjat säga att AI är ett verktyg..."
   */
  followUp?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

/**
 * TonalityQuestion — Stor central provocerande fråga som hängs i tystnad.
 *
 * Designat för slide 7 (meta-frågan) — där Joel ställer en konkret
 * mänsklig fråga som tvingar publiken att tänka efter ett par sekunder
 * innan han fortsätter.
 *
 * Frågan fade:ar in stort och centrerat. Efter en längre paus dyker en
 * mindre uppföljande tagline upp under — som *inte* svarar på frågan
 * utan vänder på den.
 */
export function TonalityQuestion({
  kicker,
  chapter,
  question,
  followUp,
  background,
  overlay,
  overlayMode = "dark",
}: TonalityQuestionProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Stort frågetecken bakom — bok-känsla */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.07, scale: 1 }}
        transition={{ duration: 2.0, delay: 0.5, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "5%",
          right: "8%",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "clamp(22rem, 42vw, 55rem)",
          lineHeight: 0.8,
          color: "var(--accent)",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        ?
      </motion.div>

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 7vw, 8rem)",
          gap: "clamp(2rem, 5vh, 4rem)",
          zIndex: 2,
        }}
      >
        {/* Frågan */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2.2rem, 4.5vw, 4rem)",
            lineHeight: 1.2,
            letterSpacing: "-0.025em",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "22em",
          }}
        >
          <EditableText path="question" value={question}>
            {question}
          </EditableText>
        </motion.div>

        {/* Uppföljande tagline — efter lång paus */}
        {followUp ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 3.0, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 1.7vw, 1.6rem)",
              lineHeight: 1.4,
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "28em",
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="followUp" value={followUp}>
              {followUp}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
