"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { buildBackgroundCss } from "@/lib/background";

interface BigQuestionBubbleProps {
  /** Frågan/texten som ska typas fram. */
  question: string;
  /** Liten label ovanför bubblan, t.ex. "Joel" eller "§ Krok". */
  sender?: string;
  /** Avatar-emoji/initial bredvid bubblan. Default: utelämnas. */
  avatar?: string;
  /** ms per tecken vid typing. Default 35. */
  typingSpeed?: number;
  /** ms innan typing börjar. Default 400. */
  delay?: number;
  /** Storlek på texten. Default lg. */
  size?: "md" | "lg" | "xl";
  /** På vilken sida bubble-svansen ska sitta. Default left. */
  tail?: "left" | "right" | "none";
  /** Bakgrund — CSS-värde eller bildsökväg. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

const SIZES: Record<NonNullable<BigQuestionBubbleProps["size"]>, string> = {
  md: "clamp(2rem, 5vw, 4rem)",
  lg: "clamp(2.75rem, 7vw, 6rem)",
  xl: "clamp(3.5rem, 9vw, 8rem)",
};

/**
 * Stor centrerad chattbubbla där frågan typas fram tecken för tecken.
 * Tänkt för krok-moment: "Vad tänker ni när jag säger AI?"
 *
 * Hela skärmen, bubblan dominerar, allt annat tonas ner.
 *
 * Användning:
 * ```mdx
 * <BigQuestionBubble
 *   sender="Joel"
 *   question="Vad tänker ni när jag säger AI?"
 *   typingSpeed={40}
 *   size="xl"
 * />
 * ```
 */
export function BigQuestionBubble({
  question,
  sender,
  avatar,
  typingSpeed = 35,
  delay = 400,
  size = "lg",
  tail = "left",
  background,
  overlay,
  overlayMode = "dark",
}: BigQuestionBubbleProps) {
  const [shown, setShown] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setShown(0);
    setShowCursor(true);
    let interval: ReturnType<typeof setInterval> | null = null;
    let cursorTimer: ReturnType<typeof setTimeout> | null = null;
    const startTimer = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= question.length) {
          if (interval) clearInterval(interval);
          interval = null;
          cursorTimer = setTimeout(() => setShowCursor(false), 1200);
        }
      }, typingSpeed);
    }, delay);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (cursorTimer) clearTimeout(cursorTimer);
    };
  }, [question, typingSpeed, delay]);

  const text = question.slice(0, shown);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-12"
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative flex w-full max-w-[88%] flex-col gap-5"
      >
        {sender ? (
          <div
            className="flex items-center gap-3 pl-2 text-xs uppercase"
            style={{
              color: "var(--text-muted)",
              letterSpacing: "0.3em",
            }}
          >
            {avatar ? (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-base"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                }}
                aria-hidden
              >
                {avatar}
              </span>
            ) : null}
            <span>{sender}</span>
          </div>
        ) : null}

        <div
          className="relative px-10 py-12 md:px-16 md:py-16"
          style={{
            background: "var(--bg-surface)",
            border: `var(--border-width) solid var(--accent-dim)`,
            borderRadius: "calc(var(--radius) * 2.5)",
            boxShadow: "0 30px 80px -30px var(--accent-glow)",
          }}
        >
          <span
            className="block"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: SIZES[size],
              lineHeight: 1.12,
              letterSpacing: "var(--heading-tracking)",
              textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
              color: "var(--text)",
            }}
          >
            {text}
            {showCursor ? (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "0.08em",
                  height: "0.95em",
                  marginLeft: "0.05em",
                  background: "var(--accent)",
                  verticalAlign: "text-bottom",
                  animation: "bqb-blink 0.9s steps(1) infinite",
                }}
              />
            ) : null}
          </span>

          {tail !== "none" ? (
            <span
              aria-hidden
              className="absolute"
              style={{
                bottom: "-18px",
                [tail]: "48px",
                width: 0,
                height: 0,
                borderLeft: tail === "left" ? "0" : "22px solid transparent",
                borderRight: tail === "right" ? "0" : "22px solid transparent",
                borderTop: `28px solid var(--bg-surface)`,
                filter: "drop-shadow(0 1px 0 var(--accent-dim))",
              }}
            />
          ) : null}
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes bqb-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
