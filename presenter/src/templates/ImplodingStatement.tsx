"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";

/**
 * ImplodingStatement — text som upplöses i partiklar framför publiken.
 *
 * Två faser:
 * 1. Texten växer in tecken-för-tecken (stagger), står kvar och läses.
 * 2. Efter `pauseBefore` ms (default 3500): varje tecken splittras till
 *    egen motion-span och flyger ut med random x/y/rotation + scale 0 +
 *    blur + fade. Texten upplöses i partiklar.
 *
 * Stega manuellt med space/pil-höger för att trigga implosionen tidigare.
 *
 * Animationen *är* budskapet — använd när ordet "implodera/kollapsa/
 * upplösas/försvinna" är centralt och sliden ska göra det den säger.
 *
 * MDX-format — paragrafer blir separata textlinjer. `**fet**` ger accent.
 *
 * ```mdx
 * <ImplodingStatement chapter="§ Klimax">
 * Det är **hela skolan** som står på spel —
 *
 * och den håller på att **implodera** framför våra ögon.
 * </ImplodingStatement>
 * ```
 */

interface ImplodingStatementProps {
  kicker?: string;
  chapter?: string;
  /** ms innan auto-implosion startar. Default 3500. */
  pauseBefore?: number;
  /** Auto-trigga implosion utan stegning. Default TRUE. */
  autoImplode?: boolean;
  /** Färg på accent-ord (de mellan **). */
  accent?: string;
  children?: ReactNode;
}

interface CharSpec {
  char: string;
  isAccent: boolean;
  // Stabil random per tecken — beräknas en gång
  spreadX: number;
  spreadY: number;
  rotate: number;
  scatterDelay: number;
}

// Enkel deterministisk pseudo-random — så att animationen är samma
// mellan renders (annars hoppar partiklarna runt vid varje update).
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function extractLines(children: ReactNode): string[] {
  const lines: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (typeof child === "string") {
        const trimmed = child.trim();
        if (trimmed) lines.push(trimmed);
        return;
      }
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      const type = el.type;
      if (typeof type === "string" && type === "p") {
        let text = "";
        Children.forEach(el.props.children, (c) => {
          if (typeof c === "string") text += c;
          else if (isValidElement(c)) {
            const inner = c as ReactElement<{ children?: ReactNode }>;
            const innerType = inner.type;
            if (typeof innerType === "string" && innerType === "strong") {
              const innerText = Children.toArray(inner.props.children)
                .filter((x): x is string => typeof x === "string")
                .join("");
              text += `**${innerText}**`;
            } else if (inner.props.children) {
              Children.forEach(inner.props.children, (cc) => {
                if (typeof cc === "string") text += cc;
              });
            }
          }
        });
        const trimmed = text.trim();
        if (trimmed) lines.push(trimmed);
      } else if (el.props.children) {
        walk(el.props.children);
      }
    });
  };
  walk(children);
  return lines;
}

// Splitta en line med **bold**-markörer till tecken-array med isAccent-flagga
function lineToChars(line: string, lineIdx: number): CharSpec[] {
  const result: CharSpec[] = [];
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  let charSeedOffset = 0;
  for (const part of parts) {
    if (!part) continue;
    const isAccent = part.startsWith("**") && part.endsWith("**");
    const text = isAccent ? part.slice(2, -2) : part;
    for (const char of Array.from(text)) {
      const seed = lineIdx * 1000 + charSeedOffset;
      result.push({
        char,
        isAccent,
        spreadX: (seededRandom(seed) - 0.5) * 700,
        spreadY: (seededRandom(seed + 1) - 0.5) * 500,
        rotate: (seededRandom(seed + 2) - 0.5) * 540,
        scatterDelay: seededRandom(seed + 3) * 0.45,
      });
      charSeedOffset++;
    }
  }
  return result;
}

export function ImplodingStatement({
  kicker,
  chapter,
  pauseBefore = 3500,
  autoImplode = true,
  accent = "var(--accent-alert)",
  children,
}: ImplodingStatementProps) {
  const lines = extractLines(children);
  const slideStep = useSlideSteps(2);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const reducedMotion = useReducedMotion();

  // Auto-implosion efter pauseBefore (timer börjar vid mount).
  useEffect(() => {
    if (!autoImplode) return;
    const timer = setTimeout(() => setAutoTriggered(true), pauseBefore);
    return () => clearTimeout(timer);
  }, [autoImplode, pauseBefore]);

  // Imploded när antingen användaren stegar eller auto-trigger gått.
  const imploded = slideStep >= 1 || autoTriggered;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--bg-surface) 80%, #000) 0%, var(--bg) 80%)",
      }}
    >
      {/* Mörk vinjett */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />

      {kicker ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: imploded ? 0.35 : 1 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 600,
            zIndex: 5,
          }}
        >
          {kicker}
        </motion.div>
      ) : null}

      {chapter ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: imploded ? 0.35 : 1 }}
          transition={{ duration: 0.8 }}
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

      {/* Textcontainern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.8rem, 2vh, 1.6rem)",
          padding: "clamp(2rem, 6vw, 6rem)",
          textAlign: "center",
          zIndex: 4,
        }}
      >
        {lines.map((line, lineIdx) => {
          const chars = lineToChars(line, lineIdx);
          const baseInDelay = 0.4 + lineIdx * 0.6;
          return (
            <div
              key={lineIdx}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(2rem, 5vw, 4.6rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                maxWidth: "18em",
                whiteSpace: "pre-wrap",
              }}
            >
              {chars.map((spec, ci) => {
                if (reducedMotion) {
                  return (
                    <motion.span
                      key={ci}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: imploded ? 0 : 1 }}
                      transition={{ duration: 0.6, delay: baseInDelay }}
                      style={{
                        display: "inline-block",
                        whiteSpace: "pre",
                        color: spec.isAccent ? accent : "var(--text)",
                        fontWeight: spec.isAccent ? 600 : 500,
                      }}
                    >
                      {spec.char}
                    </motion.span>
                  );
                }
                return (
                  <motion.span
                    key={ci}
                    initial={{ opacity: 0, y: 18 }}
                    animate={
                      imploded
                        ? {
                            opacity: 0,
                            x: spec.spreadX,
                            y: spec.spreadY,
                            rotate: spec.rotate,
                            scale: 0,
                            filter: "blur(8px)",
                          }
                        : { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }
                    }
                    transition={
                      imploded
                        ? {
                            duration: 1.8,
                            delay: spec.scatterDelay,
                            ease: [0.5, 0, 0.75, 0],
                          }
                        : {
                            duration: 0.7,
                            delay: baseInDelay + ci * 0.018,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                    style={{
                      display: "inline-block",
                      whiteSpace: "pre",
                      color: spec.isAccent ? accent : "var(--text)",
                      fontWeight: spec.isAccent ? 600 : 500,
                      transformOrigin: "center center",
                      // willChange för smidigare animation av många tecken
                      willChange: "transform, opacity, filter",
                    }}
                  >
                    {spec.char}
                  </motion.span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
