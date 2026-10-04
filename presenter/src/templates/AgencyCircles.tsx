"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AgencyCircles — agens på tre nivåer, som koncentriska ringar.
 *
 * Jag i mitten, Vi runt omkring, Samhället ytterst. Ringarna tänds inifrån
 * och ut, och varje nivås fråga står bredvid sin ring.
 *
 * Formen bär argumentet: nivåerna ligger inte bredvid varandra som tre
 * jämbördiga alternativ, de omsluter varandra. Den som inte har agens över
 * sitt eget användande har den inte i klassrummet heller.
 *
 * Här får etik, makt, bias och demokrati plats utan att bli egna kapitel.
 *
 * ```mdx
 * <AgencyCircles kicker="§ 4 · Agens på tre nivåer">
 * - Jag · När, hur och varför använder jag AI?
 * - Vi · Vilka regler vill vi ha i klassen, familjen och samhället?
 * - Samhället · Vem bygger systemen, vem tjänar på dem och vem får bestämma?
 * </AgencyCircles>
 * ```
 *
 * Per rad: `Nivå · Frågan`. Innersta först.
 */

interface AgencyCirclesProps {
  chapter?: string;
  kicker?: string;
  /** Slutrad — landar när alla ringar tänts. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Level {
  name: string;
  question: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Radie i procent per nivå — innersta först. */
const RADII = [17, 30, 43];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseLevels(children: ReactNode): Level[] {
  const out: Level[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: parts[0].trim(),
      question: parts.slice(1).join(" · ").trim(),
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out.slice(0, 3);
}

export function AgencyCircles({
  chapter,
  kicker,
  bottomLine,
  children,
}: AgencyCirclesProps) {
  const levels = useMemo(() => parseLevels(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(levels.length + (bottomLine ? 1 : 0));
  const landed = Boolean(bottomLine) && step >= levels.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 34% 50%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 5,
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

      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "0.95fr 1.05fr",
          gap: "clamp(1.2rem, 3vw, 3rem)",
          alignItems: "center",
          padding:
            "clamp(4.5rem, 9vh, 6.5rem) clamp(2.2rem, 4.5vw, 4.5rem) clamp(2.2rem, 4.5vh, 4rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Ringarna ————— */}
        <div style={{ position: "relative", aspectRatio: "1 / 1", maxHeight: "62vh", margin: "0 auto", width: "100%" }}>
          <svg
            viewBox="0 0 100 100"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* Ytterst först i DOM så innersta ritas överst */}
            {[...levels].map((_, idx) => {
              const i = levels.length - 1 - idx;
              const lit = step >= i;
              const r = RADII[i] ?? 20;
              return (
                <g key={i}>
                  <motion.circle
                    cx={50}
                    cy={50}
                    r={r}
                    fill={
                      lit
                        ? `color-mix(in srgb, var(--accent) ${8 - i * 2}%, transparent)`
                        : "transparent"
                    }
                    stroke="var(--accent)"
                    strokeWidth={i === 0 ? 1.4 : 1}
                    initial={false}
                    animate={{
                      opacity: lit ? (i === step ? 1 : 0.55) : 0.12,
                      scale: lit ? 1 : 0.9,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.75, ease: EASE }}
                    style={{ transformOrigin: "50% 50%" }}
                  />
                </g>
              );
            })}

            {/* Nivåetiketterna, placerade på sin egen ring */}
            {levels.map((level, i) => {
              const lit = step >= i;
              const r = RADII[i] ?? 20;
              return (
                <motion.text
                  key={`t-${i}`}
                  x={50}
                  y={50 - r + (i === 0 ? 2 : 4.5)}
                  textAnchor="middle"
                  initial={false}
                  animate={{ opacity: lit ? 1 : 0.15 }}
                  transition={{ duration: reduceMotion ? 0 : 0.6 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: i === 0 ? "7px" : "5.2px",
                    letterSpacing: "-0.02em",
                    fill: i === step ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {level.name}
                </motion.text>
              );
            })}
          </svg>
        </div>

        {/* ————— Frågorna ————— */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.9rem, 2.2vh, 1.6rem)",
          }}
        >
          {levels.map((level, i) => {
            const lit = step >= i;
            const isCurrent = step === i;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: lit ? (isCurrent || landed ? 1 : 0.45) : 0.14,
                  x: lit ? 0 : 14,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
                style={{
                  paddingLeft: "clamp(0.9rem, 1.6vw, 1.4rem)",
                  borderLeft: `3px solid ${
                    isCurrent
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--text) 14%, transparent)"
                  }`,
                  transition: reduceMotion ? "none" : "border-color 0.5s",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.58rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginBottom: "0.3rem",
                  }}
                >
                  {level.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "clamp(1rem, 1.6vw, 1.55rem)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.015em",
                    color: "var(--text)",
                  }}
                >
                  {level.question}
                </div>
              </motion.div>
            );
          })}

          {bottomLine ? (
            <motion.div
              initial={false}
              animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
              style={{
                marginTop: "clamp(0.4rem, 1vh, 0.7rem)",
                paddingTop: "clamp(0.7rem, 1.5vh, 1.1rem)",
                borderTop: "2px solid var(--accent)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.25vw, 1.25rem)",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="bottomLine" value={bottomLine}>
                {bottomLine}
              </EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
