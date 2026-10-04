"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface AlgorithmCascadeProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  payoff?: string;
  accent?: string;
  typingSpeed?: number;
  termGap?: number;
  doneOpacity?: number;
  background?: string;
  columns?: number;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseTerms(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) out.push(text);
        }
      });
    } else if (t === "li") {
      const text = extractText(el.props.children).trim();
      if (text) out.push(text);
    }
  });
  return out;
}

export function AlgorithmCascade({
  chapter,
  title,
  subtitle,
  payoff,
  accent = "var(--accent)",
  typingSpeed = 28,
  termGap = 140,
  doneOpacity = 0.32,
  background,
  columns = 3,
  children,
}: AlgorithmCascadeProps) {
  const terms = parseTerms(children);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTyped, setCurrentTyped] = useState(0);
  const finished = terms.length > 0 && currentIndex >= terms.length;

  useEffect(() => {
    if (finished) return;
    const term = terms[currentIndex];
    if (!term) return;
    if (currentTyped < term.length) {
      const t = setTimeout(() => setCurrentTyped((n) => n + 1), typingSpeed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setCurrentTyped(0);
    }, termGap);
    return () => clearTimeout(t);
  }, [currentIndex, currentTyped, terms, finished, typingSpeed, termGap]);

  const hasImageBg =
    !!background &&
    (background.startsWith("/") || background.startsWith("http"));

  const bg = background
    ? hasImageBg
      ? `linear-gradient(rgba(10,9,8,0.7), rgba(10,9,8,0.85)), url('${background}') center/cover no-repeat`
      : background
    : "var(--slide-base, var(--bg))";

  // When a photo with a dark scrim is the backdrop, text must stay fixed-light
  // for legibility regardless of theme. Otherwise follow the theme tokens.
  const textColor = hasImageBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasImageBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 55%, ${withAlpha(accent, 0.07)}, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "clamp(2.5rem, 4vw, 4rem) clamp(3rem, 6vw, 6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.4rem, 2.5vh, 2rem)",
          zIndex: 2,
        }}
      >
        {chapter ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: mutedColor,
            }}
          >
            {chapter}
          </div>
        ) : null}

        {title || subtitle ? (
          <div style={{ maxWidth: "44em" }}>
            {title ? (
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 3.4vw, 3.2rem)",
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  color: textColor,
                  margin: 0,
                }}
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                  lineHeight: 1.45,
                  color: mutedColor,
                  margin: "0.6rem 0 0 0",
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: "clamp(0.55rem, 1vh, 0.95rem) clamp(1.5rem, 2.5vw, 2.5rem)",
            alignContent: "start",
            minHeight: 0,
          }}
        >
          {terms.map((term, i) => {
            const isCurrent = i === currentIndex && !finished;
            const isDone = i < currentIndex;
            const isFuture = i > currentIndex;
            const opacity = isFuture ? 0 : isDone ? doneOpacity : 1;
            const displayed = isCurrent ? term.substring(0, currentTyped) : term;
            const hiddenTail = isCurrent ? term.substring(currentTyped) : "";

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(1rem, 1.35vw, 1.45rem)",
                  lineHeight: 1.3,
                  color: textColor,
                  letterSpacing: "-0.005em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayed}
                {isCurrent && currentTyped < term.length ? (
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: "0.55ch",
                      marginLeft: "0.05ch",
                      color: accent,
                      animation:
                        "algo-cascade-blink 1s steps(1) infinite",
                    }}
                  >
                    ▍
                  </span>
                ) : null}
                {hiddenTail ? (
                  <span style={{ visibility: "hidden" }}>{hiddenTail}</span>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {payoff ? (
          <motion.div
            initial={false}
            animate={{
              opacity: finished ? 1 : 0,
              y: finished ? 0 : 10,
            }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
              delay: finished ? 0.3 : 0,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.25rem, 1.7vw, 1.9rem)",
              fontWeight: 500,
              lineHeight: 1.3,
              color: textColor,
              letterSpacing: "-0.015em",
              maxWidth: "44em",
            }}
          >
            {payoff}
          </motion.div>
        ) : null}
      </div>

      <style>{`
        @keyframes algo-cascade-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
