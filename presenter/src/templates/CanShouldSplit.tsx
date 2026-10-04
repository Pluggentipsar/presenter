"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * CanShouldSplit — kan, bör, och vem som bestämmer.
 *
 * Två halvor skilda av en linje. Vänster är teknisk möjlighet, höger är
 * etiskt val. På sista klicket **öppnar linjen sig** till en egen mittspalt
 * med den tredje frågan — den som avgör de två andra. Halvorna får ge plats.
 *
 * Rörelsen är argumentet: frågan om vem som bestämmer finns inte vid sidan
 * om de två andra, den tränger sig in mellan dem.
 *
 * ```mdx
 * <CanShouldSplit
 *   kicker="§ 4 · Kan och bör"
 *   leftQuestion="Vad **kan** AI göra?"
 *   leftNote="En teknisk fråga. Svaret ändras varje termin."
 *   rightQuestion="Vad **bör** AI göra?"
 *   rightNote="En etisk fråga. Svaret ändras inte lika fort."
 *   centerQuestion="Vem bestämmer?"
 *   centerNote="Den enda frågan som avgör de andra två."
 * />
 * ```
 */

interface CanShouldSplitProps {
  chapter?: string;
  kicker?: string;
  /** Vänstra frågan — den tekniska. */
  leftQuestion?: string;
  /** Liten rad under vänstra frågan. */
  leftNote?: string;
  /** Högra frågan — den etiska. */
  rightQuestion?: string;
  /** Liten rad under högra frågan. */
  rightNote?: string;
  /** Tredje frågan som tränger sig in i mitten på sista klicket. */
  centerQuestion?: string;
  /** Liten rad under mittfrågan. */
  centerNote?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 800 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function Half({
  question,
  note,
  shown,
  reduceMotion,
  path,
}: {
  question?: string;
  note?: string;
  shown: boolean;
  reduceMotion: boolean;
  path: string;
}) {
  if (!question) return <div />;
  return (
    <motion.div
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 16 }}
      transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(0.5rem, 1.2vh, 0.9rem)",
        textAlign: "center",
        padding: "clamp(0.8rem, 2vw, 1.8rem)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(1.3rem, 2.4vw, 2.35rem)",
          lineHeight: 1.2,
          letterSpacing: "-0.025em",
          color: "var(--text)",
        }}
      >
        <EditableText path={path} value={question}>
          {renderInline(question)}
        </EditableText>
      </div>
      {note ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.82rem, 1.1vw, 1.05rem)",
            lineHeight: 1.4,
            color: "var(--text-muted)",
            maxWidth: "16em",
          }}
        >
          {note}
        </div>
      ) : null}
    </motion.div>
  );
}

export function CanShouldSplit({
  chapter,
  kicker,
  leftQuestion,
  leftNote,
  rightQuestion,
  rightNote,
  centerQuestion,
  centerNote,
}: CanShouldSplitProps) {
  const reduceMotion = useReducedMotion() ?? false;

  // 0: vänster · 1: höger · 2: mitten tränger sig in
  const step = useSlideSteps(centerQuestion ? 3 : 2);
  const rightOut = step >= 1;
  const opened = Boolean(centerQuestion) && step >= 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              marginBottom: "clamp(1.5rem, 4vh, 3rem)",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ————— Halvorna, med mittspalten som öppnar sig ————— */}
        <motion.div
          initial={false}
          animate={{
            gridTemplateColumns: opened ? "1fr 1.15fr 1fr" : "1fr 0fr 1fr",
          }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0fr 1fr",
            alignItems: "stretch",
            minHeight: "clamp(12rem, 38vh, 22rem)",
          }}
        >
          <Half
            question={leftQuestion}
            note={leftNote}
            shown
            reduceMotion={reduceMotion}
            path="leftQuestion"
          />

          {/* Mitten — linjen som blir en spalt */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Skiljelinjen */}
            <motion.span
              aria-hidden
              initial={false}
              animate={{ opacity: opened ? 0 : rightOut ? 1 : 0.35 }}
              transition={{ duration: reduceMotion ? 0 : 0.6 }}
              style={{
                position: "absolute",
                top: "6%",
                bottom: "6%",
                width: "2px",
                background: "var(--accent)",
                boxShadow: "0 0 18px var(--accent-glow)",
              }}
            />

            {centerQuestion ? (
              <motion.div
                initial={false}
                animate={{ opacity: opened ? 1 : 0, scale: opened ? 1 : 0.85 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.7,
                  delay: reduceMotion || !opened ? 0 : 0.35,
                  ease: EASE,
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.5rem, 1.2vh, 0.9rem)",
                  textAlign: "center",
                  padding: "clamp(0.8rem, 1.8vw, 1.6rem)",
                  background: "var(--bg-elevated)",
                  border: "1.5px solid var(--accent)",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 22px 55px -30px var(--accent-glow)",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(1.15rem, 2.1vw, 2.05rem)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.025em",
                    color: "var(--accent)",
                  }}
                >
                  <EditableText path="centerQuestion" value={centerQuestion}>
                    {centerQuestion}
                  </EditableText>
                </div>
                {centerNote ? (
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.75rem, 1vw, 0.95rem)",
                      color: "var(--text-muted)",
                      whiteSpace: "normal",
                      maxWidth: "13em",
                    }}
                  >
                    {centerNote}
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </div>

          <Half
            question={rightQuestion}
            note={rightNote}
            shown={rightOut}
            reduceMotion={reduceMotion}
            path="rightQuestion"
          />
        </motion.div>
      </div>
    </div>
  );
}
