"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";

interface PromptSide {
  prompt: string;
  src?: string;
  label: string;
  emoji?: string;
  /** CSS object-position på bilden, t.ex. "center top" för att lyfta toppen. */
  objectPosition?: string;
}

interface PromptCompareProps {
  title?: string;
  bottomLine?: string;
  /** Komplett left-objekt (avancerad användning). Vinner över flat-prop:arna. */
  left?: PromptSide;
  /** Komplett right-objekt. */
  right?: PromptSide;
  // Flat MDX-vänliga shortcuts. MDX-parsern hanterar inte
  // object-literal-prop:ar bra, så använd dessa istället.
  leftPrompt?: string;
  leftSrc?: string;
  leftLabel?: string;
  leftEmoji?: string;
  /** CSS object-position på vänster bild, t.ex. "center top" för ansikte. */
  leftObjectPosition?: string;
  rightPrompt?: string;
  rightSrc?: string;
  rightLabel?: string;
  rightEmoji?: string;
  rightObjectPosition?: string;
  typingSpeed?: number;
  /** Fördröjning innan höger sida börjar (sekunder). Default 0.6. */
  rightDelay?: number;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
}

const DEFAULT_LEFT: PromptSide = {
  label: "Enkel prompt",
  prompt: "Skapa en superhjälte",
  emoji: "🦸",
};

const DEFAULT_RIGHT: PromptSide = {
  label: "Utbyggd prompt",
  prompt:
    "Skapa en orange katt klädd som superhjälte, med blå mantel och gröna ögon, som flyger över staden i solnedgången.",
  emoji: "🐱",
};

/**
 * Sida-vid-sida-jämförelse mellan en kort och en utbyggd prompt.
 *
 * Visuella effekter (offset-skuggor, chunky borders, riso-noise) styrs
 * av temat. På memphis_riso får cards pink/blå offset-skuggor; på andra
 * teman faller dekorationen bort till neutral drop-shadow.
 */
export function PromptCompare({
  title = "Samma AI. Olika ord.",
  bottomLine = "Mer ord = mer kontroll. Det heter PROMPT.",
  left,
  right,
  leftPrompt,
  leftSrc,
  leftLabel,
  leftEmoji,
  leftObjectPosition,
  rightPrompt,
  rightSrc,
  rightLabel,
  rightEmoji,
  rightObjectPosition,
  typingSpeed = 32,
  rightDelay = 0.6,
  background,
  overlay,
  overlayMode = "light",
}: PromptCompareProps) {
  const reduce = useReducedMotion();
  const [leftTyped, setLeftTyped] = useState("");
  const [rightTyped, setRightTyped] = useState("");

  // Bygg left/right från explicit objekt, sen flat-prop:ar, sen defaults
  const leftSide: PromptSide = left ?? {
    label: leftLabel ?? DEFAULT_LEFT.label,
    prompt: leftPrompt ?? DEFAULT_LEFT.prompt,
    src: leftSrc,
    emoji: leftEmoji ?? DEFAULT_LEFT.emoji,
    objectPosition: leftObjectPosition,
  };
  const rightSide: PromptSide = right ?? {
    label: rightLabel ?? DEFAULT_RIGHT.label,
    prompt: rightPrompt ?? DEFAULT_RIGHT.prompt,
    src: rightSrc,
    emoji: rightEmoji ?? DEFAULT_RIGHT.emoji,
    objectPosition: rightObjectPosition,
  };

  useEffect(() => {
    if (reduce) {
      setLeftTyped(leftSide.prompt);
      return;
    }
    setLeftTyped("");
    let i = 0;
    const t = setInterval(() => {
      if (i >= leftSide.prompt.length) {
        clearInterval(t);
        return;
      }
      i++;
      setLeftTyped(leftSide.prompt.slice(0, i));
    }, typingSpeed);
    return () => clearInterval(t);
  }, [leftSide.prompt, typingSpeed, reduce]);

  const leftDoneAt = (leftSide.prompt.length * typingSpeed) / 1000;
  const rightStartAt = leftDoneAt + rightDelay;

  useEffect(() => {
    if (reduce) {
      setRightTyped(rightSide.prompt);
      return;
    }
    setRightTyped("");
    const startTimer = setTimeout(() => {
      let i = 0;
      const t = setInterval(() => {
        if (i >= rightSide.prompt.length) {
          clearInterval(t);
          return;
        }
        i++;
        setRightTyped(rightSide.prompt.slice(0, i));
      }, typingSpeed);
      return () => clearInterval(t);
    }, rightStartAt * 1000);
    return () => clearTimeout(startTimer);
  }, [rightSide.prompt, typingSpeed, rightStartAt, reduce]);

  const rightDoneAt = rightStartAt + (rightSide.prompt.length * typingSpeed) / 1000;

  const leftWords = leftSide.prompt.trim().split(/\s+/).filter(Boolean).length;
  const rightWords = rightSide.prompt.trim().split(/\s+/).filter(Boolean).length;

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="compare" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-6 text-center leading-[0.92] tracking-tight lg:mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: "var(--heading-weight)" as unknown as number,
            fontSize: "clamp(2.5rem, 6vw, 6rem)",
            color: "var(--text)",
            textShadow: "var(--title-shadow, none)",
          }}
        >
          {title}
        </motion.h1>

        <div className="grid flex-1 grid-cols-2 gap-8 lg:gap-12">
          <PromptColumn
            side={leftSide}
            typed={leftTyped}
            words={leftWords}
            startDelay={0.3}
            promptDoneAt={leftDoneAt}
            shadowVar="--card-shadow"
            shadowAltVar="--card-shadow-alt"
            reduce={!!reduce}
          />
          <PromptColumn
            side={rightSide}
            typed={rightTyped}
            words={rightWords}
            startDelay={rightStartAt}
            promptDoneAt={rightDoneAt}
            shadowVar="--card-shadow-alt"
            shadowAltVar="--card-shadow"
            reduce={!!reduce}
          />
        </div>

        {bottomLine && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: rightDoneAt + 0.6,
              ease: "easeOut",
            }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-6 py-3"
              style={{
                fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)",
                fontWeight: 600,
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PromptColumn({
  side,
  typed,
  words,
  startDelay,
  promptDoneAt,
  shadowVar,
  shadowAltVar,
  reduce,
}: {
  side: PromptSide;
  typed: string;
  words: number;
  startDelay: number;
  promptDoneAt: number;
  /** CSS-variabel för promptlådans skugga (--card-shadow eller --card-shadow-alt). */
  shadowVar: string;
  /** CSS-variabel för bildens skugga (alternerande färg). */
  shadowAltVar: string;
  reduce: boolean;
}) {
  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : startDelay - 0.2 }}
        className="mb-3 inline-flex items-center self-start gap-3"
      >
        <span
          style={{
            background: "var(--accent)",
            color: "var(--bg-surface)",
            padding: "0.4rem 0.9rem",
            borderRadius: "999px",
            fontSize: "clamp(0.75rem, 1vw, 1.05rem)",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            boxShadow: "var(--card-shadow, none)",
          }}
        >
          {side.label}
        </span>
        <span
          className="font-mono"
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
          }}
        >
          {words} ord
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.55,
          delay: reduce ? 0 : startDelay - 0.05,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="relative mb-5"
        style={{
          background: "var(--bg-surface)",
          border: "var(--card-border, 1px solid var(--text-muted))",
          borderRadius: "var(--radius)",
          padding: "clamp(1rem, 1.6vw, 1.5rem)",
          boxShadow: `var(${shadowVar}, 0 4px 16px rgba(0,0,0,0.08))`,
          minHeight: "clamp(5.5rem, 9vw, 8rem)",
          fontSize: "clamp(0.95rem, 1.45vw, 1.45rem)",
          fontWeight: 500,
          lineHeight: 1.4,
          color: "var(--text)",
        }}
      >
        <span>&quot;{typed}</span>
        {!reduce && typed.length < side.prompt.length && (
          <motion.span
            className="ml-[2px] inline-block"
            style={{
              width: "0.5em",
              height: "1em",
              background: "var(--text)",
              verticalAlign: "text-bottom",
            }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
        {typed.length >= side.prompt.length && <span>&quot;</span>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{
          duration: 0.7,
          delay: reduce ? 0 : promptDoneAt + 0.2,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="relative aspect-[4/3] overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "var(--card-border, 1px solid var(--text-muted))",
          borderRadius: "var(--radius)",
          boxShadow: `var(${shadowAltVar}, 0 4px 16px rgba(0,0,0,0.08))`,
        }}
      >
        {side.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={side.src}
            alt={side.label}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: side.objectPosition ?? "center" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none"
              style={{
                fontSize: "clamp(3rem, 6vw, 5.5rem)",
                fontFamily: 'var(--font-display)',
              }}
            >
              {side.emoji ?? "🖼️"}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default PromptCompare;
