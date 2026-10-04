"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * QuoteReturn — rösterna kommer tillbaka och får sina namn.
 *
 * Citaten som öppnade föreläsningen ligger framme igen, dämpade. Vid varje
 * klick lyser ett av dem upp och **får sin roll stämplad** — den roll som
 * publiken nu har verktyg att genomskåda. Det som var fyra lösa
 * ungdomsröster visar sig ha varit fyra kapitel.
 *
 * Säcken knyts utan att någon behöver säga "som ni minns från början".
 *
 * ```mdx
 * <QuoteReturn kicker="§ Final · Tillbaka på bussen">
 * - Det finns ju typ ingen fråga man inte kan få svar på. · Oraklet
 * - …glömde ta bort alla emojisarna. · Tjänaren
 * </QuoteReturn>
 * ```
 *
 * Per rad: `Citatet · Rollen`.
 */

interface QuoteReturnProps {
  chapter?: string;
  kicker?: string;
  /** Slutrad — landar när alla röster fått sin roll. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Voice {
  quote: string;
  role: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

function parseVoices(children: ReactNode): Voice[] {
  const out: Voice[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      quote: parts[0].trim(),
      role: parts.slice(1).join(" · ").trim(),
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
  return out;
}

export function QuoteReturn({
  chapter,
  kicker,
  bottomLine,
  children,
}: QuoteReturnProps) {
  const voices = useMemo(() => parseVoices(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(voices.length + (bottomLine ? 1 : 0));
  const landed = Boolean(bottomLine) && step >= voices.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 20%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.2rem, 3vh, 2.2rem)",
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

        {/* ————— Rösterna ————— */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "clamp(0.8rem, 2vw, 1.6rem)",
          }}
        >
          {voices.map((voice, i) => {
            const named = step >= i;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: named ? 1 : 0.32, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.65,
                  delay: reduceMotion ? 0 : i * 0.08,
                  ease: EASE,
                }}
                style={{
                  position: "relative",
                  padding: "clamp(1rem, 2vw, 1.6rem)",
                  background: "var(--bg-elevated)",
                  border: `1px solid ${
                    named
                      ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                      : "color-mix(in srgb, var(--text) 10%, transparent)"
                  }`,
                  borderRadius: "var(--radius)",
                  boxShadow: named
                    ? "0 20px 50px -34px var(--accent-glow)"
                    : "none",
                  transition: reduceMotion
                    ? "none"
                    : "border-color 0.6s, box-shadow 0.6s",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(0.88rem, 1.25vw, 1.2rem)",
                    lineHeight: 1.45,
                    color: "var(--text)",
                  }}
                >
                  {`”${voice.quote}”`}
                </div>

                {/* Rollen som stämplas på */}
                {voice.role ? (
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: named ? 1 : 0,
                      scale: named ? 1 : 1.3,
                    }}
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: reduceMotion || !named ? 0 : 0.2,
                      duration: reduceMotion ? 0 : undefined,
                    }}
                    style={{
                      marginTop: "clamp(0.6rem, 1.4vh, 1rem)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5em",
                      padding: "0.28em 0.85em",
                      borderRadius: "999px",
                      border: "1.5px solid var(--accent)",
                      background:
                        "color-mix(in srgb, var(--accent) 12%, transparent)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.58rem, 0.78vw, 0.78rem)",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {voice.role}
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: EASE }}
            style={{
              paddingTop: "clamp(0.7rem, 1.6vh, 1.2rem)",
              borderTop: "2px solid var(--accent)",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
              lineHeight: 1.35,
              color: "var(--text)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {bottomLine}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
