"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Question {
  question: string;
  hint?: string;
}

interface HandoffQuestionsProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Slutreplik underst — den landande poängen. */
  payoff?: string;
  /**
   * Frågor via markdown-lista. Format: `- Fråga · Hint`
   * Pipe-separator också OK.
   */
  children?: ReactNode;
}

function extractTextHQ(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextHQ).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractTextHQ(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseQuestions(children: ReactNode): Question[] {
  const out: Question[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractTextHQ(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (!text) return;
          const parts = text.split(/\s*·\s*/);
          out.push({
            question: parts[0] ?? "",
            hint: parts.slice(1).join(" · ") || undefined,
          });
        }
      });
    }
  });
  return out;
}

/**
 * Stora numrerade frågor — Apple-keynote-stil hand-off till workshop/hackaton.
 * Premiär: en keynote 2026-05-27.
 *
 * Användning:
 * ```mdx
 * <HandoffQuestions
 *   kicker="§ Hand-off"
 *   title="Tre frågor som följer er in"
 *   questions={[
 *     { question: "Vilken berättelse bär du in i designen?", hint: "..." },
 *     ...
 *   ]}
 *   payoff="Skriv ner dem. Eller fota sliden."
 * />
 * ```
 */
export function HandoffQuestions({
  kicker,
  title,
  subtitle,
  payoff,
  children,
}: HandoffQuestionsProps) {
  const accent = "var(--accent)";
  const questions = parseQuestions(children);

  const renderRich = (text: string): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <span
            key={i}
            style={{
              color: accent,
              textShadow: `0 0 22px ${withAlpha(accent, 0.4)}`,
            }}
          >
            {m[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      {/* Subtle vertical accent line vänster */}
      <motion.div
        aria-hidden
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: "absolute",
          top: "12%",
          bottom: "12%",
          left: "clamp(2.5rem, 4vw, 4rem)",
          width: "2px",
          background: `linear-gradient(180deg, transparent 0%, ${withAlpha(
            "var(--accent)",
            0.55,
          )} 25%, ${withAlpha("var(--accent)", 0.55)} 75%, transparent 100%)`,
          boxShadow: `0 0 16px ${withAlpha("var(--accent)", 0.4)}`,
          transformOrigin: "top",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding:
            "clamp(2.5rem, 4vh, 4rem) clamp(2.5rem, 4vw, 4rem) clamp(2.5rem, 4vh, 4rem) clamp(4.5rem, 6vw, 6.5rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.4vh, 2rem)",
        }}
      >
        {/* Kicker */}
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 500,
            }}
          >
            <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
          </motion.div>
        ) : null}

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 3.8vw, 3.4rem)",
              fontWeight: 500,
              letterSpacing: "-0.028em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{renderRich(title)}</EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.7rem 0 0 0",
                maxWidth: "44em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Questions */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.2rem, 2.2vh, 1.8rem)",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.55 + i * 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "clamp(1.2rem, 2vw, 2rem)",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.4rem, 4vw, 4rem)",
                  fontWeight: 200,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  color: accent,
                  textShadow: `0 0 28px ${withAlpha("var(--accent)", 0.4)}`,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: "2em",
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  paddingTop: "0.4rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.4rem, 2.1vw, 2rem)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    lineHeight: 1.25,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  {renderRich(q.question)}
                </div>
                {q.hint ? (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.92rem, 1.1vw, 1.1rem)",
                      lineHeight: 1.5,
                      color: "var(--text-muted)",
                      maxWidth: "42em",
                    }}
                  >
                    {renderRich(q.hint)}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payoff */}
        {payoff ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.55 + questions.length * 0.35 + 0.2,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.4vw, 1.45rem)",
              color: "var(--text)",
              letterSpacing: "-0.015em",
              lineHeight: 1.4,
              maxWidth: "44em",
              paddingTop: "clamp(0.8rem, 1.4vh, 1.2rem)",
              borderTop: `1px solid ${withAlpha("var(--accent)", 0.2)}`,
            }}
          >
            <EditableText path="payoff" value={payoff ?? ""}>{renderRich(payoff)}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
