"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MissingRung — den saknade pinnen på karriärstegen.
 *
 * Stegen byggs HEL först. Publiken hinner se den som den alltid sett ut.
 * Först därefter löses det nedersta steget upp — och figuren som stod på
 * marken sträcker sig uppåt utan att nå. Räckvidden ritas som en streckad
 * båge som slutar i tomma luften.
 *
 * Att visa stegen komplett innan pinnen försvinner är hela dramaturgin.
 * En stege som saknar ett steg från början är bara en trasig stege; en
 * stege där steget FÖRSVINNER är en förändring som händer nu.
 *
 * ```mdx
 * <MissingRung
 *   kicker="§ 4 · Den saknade pinnen"
 *   statement="AI behöver inte ta bort hela yrket för att förändra **vägen in**."
 *   subline="Vad händer med nybörjaren när nybörjaruppgifterna automatiseras?"
 * >
 * - Juniorroll
 * - Medarbetare
 * - Senior
 * - Ledande
 * </MissingRung>
 * ```
 *
 * Första raden är den pinne som försvinner.
 */

interface MissingRungProps {
  chapter?: string;
  kicker?: string;
  /** Påståendet. `**fet**` blir accent. */
  statement?: string;
  /** Frågan som landar sist. */
  subline?: string;
  /** Etikett vid figuren nere vid stegen. */
  climberLabel?: string;
  children?: ReactNode;
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

function parseRungs(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
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

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
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

export function MissingRung({
  chapter,
  kicker,
  statement,
  subline,
  climberLabel = "Nybörjaren",
  children,
}: MissingRungProps) {
  const rungs = useMemo(() => parseRungs(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  // 0: hel stege · 1: nedersta pinnen löses upp · 2: räckvidden som inte når
  const step = useSlideSteps(3);
  const gone = step >= 1;
  const reaching = step >= 2;

  const count = Math.max(rungs.length, 2);
  // Nedersta pinnen ligger lägst, den översta högst.
  const rungY = (i: number) => 88 - (i * 72) / (count - 1);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 35% 30%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: "clamp(1.5rem, 3.5vw, 3.5rem)",
          alignItems: "center",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Vänster: texten ————— */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.9rem, 2.2vh, 1.6rem)" }}>
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

          {statement ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.4rem, 2.5vw, 2.4rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
                color: "var(--text)",
              }}
            >
              <EditableText path="statement" value={statement}>
                {renderInline(statement)}
              </EditableText>
            </motion.div>
          ) : null}

          {subline ? (
            <motion.div
              initial={false}
              animate={{ opacity: reaching ? 1 : 0, y: reaching ? 0 : 10 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
              style={{
                paddingTop: "clamp(0.7rem, 1.5vh, 1.1rem)",
                borderTop: "2px solid var(--accent)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.35vw, 1.35rem)",
                lineHeight: 1.4,
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="subline" value={subline}>
                {subline}
              </EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* ————— Höger: stegen ————— */}
        <div style={{ position: "relative", height: "min(70vh, 30rem)" }}>
          {chapter ? (
            <span
              style={{
                position: "absolute",
                top: "-1.6rem",
                right: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "color-mix(in srgb, var(--text) 45%, transparent)",
              }}
            >
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            </span>
          ) : null}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* Stegens vangstycken */}
            {[32, 68].map((x) => (
              <motion.line
                key={x}
                x1={x}
                y1={92}
                x2={x}
                y2={12}
                stroke="color-mix(in srgb, var(--text) 30%, transparent)"
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduceMotion ? 0 : 1.1, ease: EASE }}
              />
            ))}

            {/* Pinnarna */}
            {rungs.map((_, i) => {
              const y = rungY(i);
              const isBottom = i === 0;
              const dissolved = isBottom && gone;
              return (
                <motion.line
                  key={i}
                  x1={32}
                  y1={y}
                  x2={68}
                  y2={y}
                  stroke={dissolved ? "var(--accent)" : "var(--text)"}
                  strokeWidth={dissolved ? 1.6 : 2.4}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={dissolved ? "3 4" : undefined}
                  initial={reduceMotion ? false : { opacity: 0, pathLength: 0 }}
                  animate={{
                    opacity: dissolved ? 0.32 : 1,
                    pathLength: 1,
                  }}
                  transition={{
                    opacity: { duration: reduceMotion ? 0 : 0.9, ease: EASE },
                    pathLength: {
                      duration: reduceMotion ? 0 : 0.6,
                      delay: reduceMotion ? 0 : 0.4 + i * 0.14,
                      ease: EASE,
                    },
                  }}
                />
              );
            })}

            {/* Räckvidden som inte når — slutar i tomma luften */}
            <motion.path
              d={`M 50 94 Q 46 ${rungY(0) - 2} 50 ${rungY(1) + 5}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.4}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
              initial={false}
              animate={{ pathLength: reaching ? 1 : 0, opacity: reaching ? 0.85 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
            />
          </svg>

          {/* Pinnarnas etiketter */}
          {rungs.map((label, i) => {
            const isBottom = i === 0;
            const dissolved = isBottom && gone;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: dissolved ? 0.4 : 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.5 + i * 0.14,
                  ease: EASE,
                }}
                style={{
                  position: "absolute",
                  left: "72%",
                  top: `${rungY(i)}%`,
                  transform: "translateY(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: dissolved ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: dissolved ? 700 : 500,
                  textDecoration: dissolved ? "line-through" : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </motion.div>
            );
          })}

          {/* Figuren på marken */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, delay: 0.9 }}
            style={{
              position: "absolute",
              left: "50%",
              top: "96%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <motion.span
              aria-hidden
              initial={{ y: 0 }}
              animate={
                reduceMotion || !reaching
                  ? undefined
                  : { y: [0, -4, 0] }
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "0.7rem",
                height: "0.7rem",
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 18px var(--accent-glow)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {climberLabel}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
