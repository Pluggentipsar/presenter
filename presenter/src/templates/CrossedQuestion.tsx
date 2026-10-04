"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

interface CrossedQuestionProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Den stora frågan som ska "krossas". */
  question: string;
  /** Korrigerande text under (default: "Fel fråga."). */
  correction?: string;
  /**
   * Den nya frågan/observation som ersätter (frivillig).
   * T.ex. "Frågan är: hur funkar det?"
   */
  newQuestion?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

/**
 * CrossedQuestion — Stor fråga med ett diagonalt rött streck över.
 * Under: "Fel fråga." och eventuellt en korrigerande ny fråga.
 *
 * Designat för pivot-momentet — där publiken förväntar sig ett svar
 * på en fråga, men föreläsaren vänder bordet: frågan är fel.
 *
 * Animation:
 *   1. Frågan fade:ar in
 *   2. Diagonalt rött streck dras över (1 sek)
 *   3. "Fel fråga" + ny fråga dyker upp
 */
export function CrossedQuestion({
  kicker,
  chapter,
  question,
  correction = "Fel fråga.",
  newQuestion,
  background,
  overlay,
  overlayMode = "dark",
}: CrossedQuestionProps) {
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

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 7vw, 8rem)",
          gap: "clamp(1.5rem, 3.5vh, 3rem)",
          zIndex: 2,
        }}
      >
        {/* Frågan med kryssning */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "16em",
              padding: "0.5em 0.8em",
              opacity: 0.85,
            }}
          >
            <EditableText path="question" value={question}>
              {question}
            </EditableText>
          </motion.div>

          {/* Diagonalt rött streck — SVG */}
          <motion.svg
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 1.4 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible",
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.9,
                delay: 1.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              x1="2"
              y1="92"
              x2="98"
              y2="8"
              stroke="var(--accent-alert)"
              strokeWidth="2.2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </motion.svg>
        </div>

        {/* "Fel fråga." */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 2.4 }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.4rem, 2.4vw, 2.2rem)",
            color: "var(--accent-alert)",
            textAlign: "center",
          }}
        >
          <EditableText path="correction" value={correction}>
            {correction}
          </EditableText>
        </motion.div>

        {/* Ev. ny fråga */}
        {newQuestion ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 3.0 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(1.3rem, 2.1vw, 1.9rem)",
              lineHeight: 1.3,
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "26em",
              fontStyle: "italic",
            }}
          >
            <EditableText path="newQuestion" value={newQuestion}>
              {newQuestion}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
