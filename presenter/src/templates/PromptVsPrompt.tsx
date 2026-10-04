"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { EditableText } from "@/lib/inline-edit";

interface PromptVsPromptProps {
  eyebrow?: string;
  title?: string;
  /** Visas centrerat under jämförelsen, revealas via space efter båda prompts */
  bottomLine?: string;

  /** Vänster sida — typiskt "fel" eller varnings-vägen */
  leftLabel?: string;
  leftPrompt?: string;
  /** Pil-tag under vänster prompt, t.ex. "→ AI ger svaret. Du lär dig inget." */
  leftEffect?: string;

  /** Höger sida — typiskt den önskade vägen */
  rightLabel?: string;
  rightPrompt?: string;
  rightEffect?: string;

  /** Typewriter-hastighet i ms per tecken */
  typingSpeed?: number;
  /** Sekunder mellan vänster färdig → höger börjar */
  rightDelay?: number;

  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
}

/**
 * Två prompts sida-vid-sida som RAM för en live-demo. Text-fokuserad
 * (ingen bild- eller video-yta) — tänkt för scenarier där föreläsaren
 * själv kör båda prompterna live på sin dator och eleverna behöver
 * kunna läsa formuleringarna.
 *
 * Steg 1 — bara titlar/labels syns
 * Steg 2 — vänster prompt typas in
 * Steg 3 — höger prompt typas in
 * Steg 4 — bottom-line revealas
 *
 * Visuella effekter (chunky offset-skuggor, kontrastfärger på labels)
 * styrs av temat. Vänster label är intentionellt utan accent (neutral
 * varning), höger får accent-färg (positiv).
 */
export function PromptVsPrompt({
  eyebrow,
  title = "Två sätt att fråga AI om läxan.",
  bottomLine,
  leftLabel = "Lös åt mig",
  leftPrompt = "Här är min läxa. Lös den.",
  leftEffect = "AI ger svaret. Du lär dig inget.",
  rightLabel = "Lär mig",
  rightPrompt = "Här är min läxa. Förhör mig steg för steg — men ge mig inte svaret rakt ut. Hjälp mig komma fram själv.",
  rightEffect = "AI guidar dig. Du lär dig.",
  typingSpeed = 28,
  rightDelay = 0.5,
  background,
  overlay,
  overlayMode = "light",
}: PromptVsPromptProps) {
  const reduce = useReducedMotion();
  const totalSteps = bottomLine ? 4 : 3;
  const step = useSlideSteps(totalSteps);

  // Step 0 = bara titel + labels. Step 1 = vänster typar. Step 2 = höger typar. Step 3 = bottom.
  const showLeft = step >= 1;
  const showRight = step >= 2;
  const showBottom = step >= 3 && !!bottomLine;

  const [leftTyped, setLeftTyped] = useState("");
  const [rightTyped, setRightTyped] = useState("");

  useEffect(() => {
    if (!showLeft) {
      setLeftTyped("");
      return;
    }
    if (reduce) {
      setLeftTyped(leftPrompt);
      return;
    }
    setLeftTyped("");
    let i = 0;
    const t = setInterval(() => {
      if (i >= leftPrompt.length) {
        clearInterval(t);
        return;
      }
      i++;
      setLeftTyped(leftPrompt.slice(0, i));
    }, typingSpeed);
    return () => clearInterval(t);
  }, [showLeft, leftPrompt, typingSpeed, reduce]);

  useEffect(() => {
    if (!showRight) {
      setRightTyped("");
      return;
    }
    if (reduce) {
      setRightTyped(rightPrompt);
      return;
    }
    setRightTyped("");
    const startTimer = setTimeout(() => {
      let i = 0;
      const t = setInterval(() => {
        if (i >= rightPrompt.length) {
          clearInterval(t);
          return;
        }
        i++;
        setRightTyped(rightPrompt.slice(0, i));
      }, typingSpeed);
      return () => clearInterval(t);
    }, rightDelay * 1000);
    return () => clearTimeout(startTimer);
  }, [showRight, rightPrompt, typingSpeed, rightDelay, reduce]);

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="compare" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12">
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-8 text-center leading-[0.92] tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            fontSize: "clamp(2.4rem, 5.4vw, 5.4rem)",
            color: "var(--text)",
            textShadow: "var(--title-shadow, none)",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>{title}</EditableText>
        </motion.h1>

        <div className="grid flex-1 grid-cols-2 gap-8 lg:gap-12 mt-6">
          <PromptColumn
            label={leftLabel}
            typed={leftTyped}
            full={leftPrompt}
            effect={leftEffect}
            shadowVar="--card-shadow"
            labelTone="neutral"
            tilt={reduce ? 0 : -1.2}
            visible={showLeft}
            done={leftTyped.length >= leftPrompt.length}
            reduce={!!reduce}
          />
          <PromptColumn
            label={rightLabel}
            typed={rightTyped}
            full={rightPrompt}
            effect={rightEffect}
            shadowVar="--card-shadow-alt"
            labelTone="accent"
            tilt={reduce ? 0 : 1.4}
            visible={showRight}
            done={rightTyped.length >= rightPrompt.length}
            reduce={!!reduce}
          />
        </div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: showBottom ? 1 : 0,
              y: showBottom ? 0 : 14,
              scale: showBottom ? 1 : 0.94,
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-8 py-3 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.2rem, 2.0vw, 2.0rem)",
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function PromptColumn({
  label,
  typed,
  full,
  effect,
  shadowVar,
  labelTone,
  tilt,
  visible,
  done,
  reduce,
}: {
  label: string;
  typed: string;
  full: string;
  effect?: string;
  shadowVar: string;
  labelTone: "neutral" | "accent";
  tilt: number;
  visible: boolean;
  done: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: visible ? 1 : 0.25,
        y: visible ? 0 : 12,
        scale: visible ? 1 : 0.96,
      }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col"
    >
      {/* Label-pill */}
      <div className="mb-3 inline-flex items-center self-start">
        <span
          style={{
            background:
              labelTone === "accent" ? "var(--accent)" : "var(--bg-surface)",
            color:
              labelTone === "accent" ? "var(--bg-surface)" : "var(--text)",
            padding: "0.5rem 1.1rem",
            borderRadius: "999px",
            border: "var(--card-border, 3px solid #1A1A1A)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.95rem, 1.4vw, 1.4rem)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            letterSpacing: "0.02em",
            boxShadow: `var(${shadowVar}, 0 4px 12px rgba(0,0,0,0.12))`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Prompt-bubbla */}
      <motion.div
        initial={false}
        animate={{ rotate: visible ? tilt : tilt - 3 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative"
        style={{
          background: "var(--bg-surface)",
          border: "var(--card-border, 3px solid #1A1A1A)",
          borderRadius: "var(--radius)",
          padding: "clamp(1.1rem, 1.8vw, 1.8rem) clamp(1.3rem, 2vw, 2rem)",
          boxShadow: `var(${shadowVar}, 0 6px 18px rgba(0,0,0,0.1))`,
          minHeight: "clamp(8rem, 14vw, 14rem)",
          fontSize: "clamp(1.05rem, 1.55vw, 1.55rem)",
          fontWeight: 500,
          lineHeight: 1.4,
          color: "var(--text)",
        }}
      >
        <span style={{ fontFamily: "var(--font-body)" }}>
          &ldquo;{typed}
        </span>
        {!reduce && !done && visible && (
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
        {done && <span>&rdquo;</span>}
      </motion.div>

      {/* Effect-tag */}
      {effect ? (
        <motion.div
          initial={false}
          animate={{
            opacity: done ? 1 : 0,
            y: done ? 0 : 8,
          }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mt-4 self-start"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
            fontWeight: 600,
            color: "var(--text)",
            display: "inline-flex",
            alignItems: "baseline",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              color:
                labelTone === "accent" ? "var(--accent)" : "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            →
          </span>
          <span>{effect}</span>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export default PromptVsPrompt;
