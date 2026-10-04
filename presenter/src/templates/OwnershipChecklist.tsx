"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * OwnershipChecklist — frågorna att gå igenom innan ditt namn står under.
 *
 * Varje fråga bockas av i tur och ordning: bocken ritas ut som en linje,
 * inte som en ikon som poppar in. På sista steget dyker signaturraden upp
 * under listan — den är hela poängen med bilden och det som gör den till
 * något annat än en checklista. Frågorna leder fram till en underskrift.
 *
 * Sista frågan får stjärna med `★` först på raden och behåller full vikt
 * även när de andra tonats ned.
 *
 * ```mdx
 * <OwnershipChecklist
 *   kicker="§ 2 · Ägarskapet"
 *   title="Innan ditt namn står under:"
 *   signatureLabel="ditt namn"
 * >
 * - Har jag förstått allt?
 * - Kan jag förklara det?
 * - ★ Är detta fortfarande mitt?
 * </OwnershipChecklist>
 * ```
 */

interface OwnershipChecklistProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Rubriken över frågorna. */
  title?: string;
  /** Texten under signaturlinjen. */
  signatureLabel?: string;
  /** Valfri slutrad under signaturen. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Question {
  text: string;
  starred: boolean;
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

function parseQuestions(children: ReactNode): Question[] {
  const out: Question[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    let raw = extractText(li.props.children).trim();
    if (!raw) return;
    const starred = raw.startsWith("★");
    if (starred) raw = raw.replace(/^★\s*/, "");
    out.push({ text: raw, starred });
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

export function OwnershipChecklist({
  chapter,
  kicker,
  title,
  signatureLabel = "ditt namn",
  bottomLine,
  children,
}: OwnershipChecklistProps) {
  const questions = useMemo(() => parseQuestions(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  // Ett steg per fråga, plus signaturen.
  const step = useSlideSteps(questions.length + 1);
  const signed = step >= questions.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 30% 12%, var(--bg-surface) 0%, var(--bg) 70%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2.5rem, 5vw, 5rem)",
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
              marginBottom: "clamp(1rem, 2.5vh, 1.8rem)",
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

        {title ? (
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.1 }}
            style={{
              margin: 0,
              marginBottom: "clamp(1.2rem, 3vh, 2.2rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.5rem, 2.5vw, 2.4rem)",
              letterSpacing: "-0.025em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* ————— Frågorna ————— */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1.5vh, 1.1rem)",
          }}
        >
          {questions.map((q, i) => {
            const checked = step >= i;
            const isCurrent = !signed && step === i;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: checked ? (signed || isCurrent || q.starred ? 1 : 0.5) : 0.16,
                  x: 0,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(0.8rem, 1.6vw, 1.3rem)",
                }}
              >
                {/* Rutan med bocken som ritas ut */}
                <span
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    width: "clamp(1.4rem, 2vw, 1.9rem)",
                    height: "clamp(1.4rem, 2vw, 1.9rem)",
                    borderRadius: "0.28rem",
                    border: `1.5px solid ${
                      checked
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--text) 22%, transparent)"
                    }`,
                    background: checked
                      ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                      : "transparent",
                    transition: reduceMotion
                      ? "none"
                      : "border-color 0.45s, background 0.45s",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                  >
                    <motion.path
                      d="M6 12.5 L10.2 16.5 L18 8"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.45,
                        ease: EASE,
                      }}
                    />
                  </svg>
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: q.starred ? 700 : 500,
                    fontSize: "clamp(1.05rem, 1.75vw, 1.7rem)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.015em",
                    color: q.starred && checked ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {renderInline(q.text)}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ————— Signaturen ————— */}
        <motion.div
          initial={false}
          animate={{ opacity: signed ? 1 : 0, y: signed ? 0 : 14 }}
          transition={{
            duration: reduceMotion ? 0 : 0.8,
            delay: reduceMotion || !signed ? 0 : 0.2,
            ease: EASE,
          }}
          style={{
            marginTop: "clamp(1.6rem, 4vh, 2.8rem)",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            maxWidth: "22rem",
          }}
        >
          <motion.span
            aria-hidden
            initial={false}
            animate={{ scaleX: signed ? 1 : 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.9,
              delay: reduceMotion || !signed ? 0 : 0.3,
              ease: EASE,
            }}
            style={{
              display: "block",
              height: "2px",
              background: "var(--accent)",
              transformOrigin: "left",
              boxShadow: "0 0 16px var(--accent-glow)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="signatureLabel" value={signatureLabel}>
              {signatureLabel}
            </EditableText>
          </span>
        </motion.div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: signed ? 1 : 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion || !signed ? 0 : 0.5,
            }}
            style={{
              marginTop: "clamp(1rem, 2.5vh, 1.6rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.25vw, 1.25rem)",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {renderInline(bottomLine)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
