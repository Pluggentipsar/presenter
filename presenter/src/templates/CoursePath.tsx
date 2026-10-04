"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CoursePath — föreläsningen som ett litet kursupplägg.
 *
 * Fyra undervisningstillfällen längs en stig som ritas ut framåt. Varje
 * station har en fråga som rubrik — inte ett ämne — och en färdig aktivitet
 * under. Stationerna är formulerade som elevfrågor därför att det är så
 * lektionerna faktiskt börjar.
 *
 * Poängen med bilden: föreläsningen behöver inte bli ett enstaka temapass.
 *
 * ```mdx
 * <CoursePath
 *   kicker="§ Final · Ett möjligt miniprogram"
 *   bottomLine="Fyra lektioner. Alla finns färdiga på webbsidan."
 * >
 * - Hur kan AI låta så mänsklig? · Chattdetektiverna
 * - När hjälper AI mig att lära? · Brain dump före AI
 * </CoursePath>
 * ```
 *
 * Per rad: `Frågan · Aktiviteten`.
 */

interface CoursePathProps {
  chapter?: string;
  kicker?: string;
  /** Etikett ovanför aktivitetsnamnet. */
  activityLabel?: string;
  /** Slutrad — landar när alla stationer står. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Stop {
  question: string;
  activity: string;
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

function parseStops(children: ReactNode): Stop[] {
  const out: Stop[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      question: parts[0].trim(),
      activity: parts.slice(1).join(" · ").trim(),
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

export function CoursePath({
  chapter,
  kicker,
  activityLabel = "Färdig aktivitet",
  bottomLine,
  children,
}: CoursePathProps) {
  const stops = useMemo(() => parseStops(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(stops.length + (bottomLine ? 1 : 0));
  const reached = Math.min(step + 1, stops.length);
  const landed = Boolean(bottomLine) && step >= stops.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 40%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.4rem, 3.5vh, 2.6rem)",
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

        {/* ————— Stigen ————— */}
        <div style={{ position: "relative", paddingTop: "clamp(0.8rem, 2vh, 1.4rem)" }}>
          {/* Linjen som ritas framåt */}
          <div
            style={{
              position: "absolute",
              top: "clamp(1.6rem, 3.6vh, 2.4rem)",
              left: "6%",
              right: "6%",
              height: "2px",
              background: "color-mix(in srgb, var(--text) 12%, transparent)",
            }}
          >
            <motion.span
              initial={false}
              animate={{
                scaleX: stops.length > 0 ? reached / stops.length : 0,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--accent)",
                transformOrigin: "left",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(stops.length, 1)}, 1fr)`,
              gap: "clamp(0.6rem, 1.6vw, 1.5rem)",
              alignItems: "start",
            }}
          >
            {stops.map((stop, i) => {
              const shown = i < reached;
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0.18, y: shown ? 0 : 10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "clamp(0.5rem, 1.2vh, 0.85rem)",
                    textAlign: "center",
                  }}
                >
                  {/* Stationens nummer på linjen */}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "clamp(1.7rem, 2.6vw, 2.4rem)",
                      height: "clamp(1.7rem, 2.6vw, 2.4rem)",
                      borderRadius: "50%",
                      background: shown ? "var(--accent)" : "var(--bg)",
                      border: `1.5px solid ${
                        shown
                          ? "var(--accent)"
                          : "color-mix(in srgb, var(--text) 20%, transparent)"
                      }`,
                      color: shown ? "var(--bg)" : "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.62rem, 0.85vw, 0.85rem)",
                      fontWeight: 700,
                      boxShadow: shown ? "0 0 20px var(--accent-glow)" : "none",
                      transition: reduceMotion
                        ? "none"
                        : "background 0.5s, border-color 0.5s, color 0.5s",
                    }}
                  >
                    {i + 1}
                  </span>

                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(0.88rem, 1.25vw, 1.2rem)",
                      lineHeight: 1.3,
                      letterSpacing: "-0.015em",
                      color: "var(--text)",
                    }}
                  >
                    {stop.question}
                  </div>

                  {stop.activity ? (
                    <div
                      style={{
                        marginTop: "auto",
                        padding:
                          "clamp(0.45rem, 1vh, 0.7rem) clamp(0.55rem, 1.1vw, 0.9rem)",
                        borderRadius: "var(--radius)",
                        border:
                          "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
                        background:
                          "color-mix(in srgb, var(--accent) 7%, transparent)",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.48rem, 0.66vw, 0.66rem)",
                          letterSpacing: "0.24em",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {activityLabel}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "clamp(0.75rem, 1vw, 0.98rem)",
                          lineHeight: 1.25,
                          color: "var(--accent)",
                        }}
                      >
                        {stop.activity}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              paddingTop: "clamp(0.7rem, 1.6vh, 1.2rem)",
              borderTop: "2px solid var(--accent)",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
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
