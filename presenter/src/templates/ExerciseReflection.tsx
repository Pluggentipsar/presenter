"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ExerciseReflectionProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor rubrik. */
  title?: string;
  /** Underrubrik. */
  subtitle?: string;
  /**
   * Markdown-lista med diskussionsfrågor.
   * Sista raden får visuell vikt (klimax-frågan).
   */
  children?: ReactNode;
  /** Footer-text under frågorna. */
  footer?: string;
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseQuestions(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (raw) out.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

/**
 * ExerciseReflection — Slide C i klassrumsövningen.
 *
 * Diskussionsfrågor i bok-uppslag-stil. Sista frågan får extra typografisk
 * vikt — det är klimax-frågan ("Vilka svar hjälpte dig faktiskt framåt,
 * och vilka bara höll kvar dig?").
 */
export function ExerciseReflection({
  kicker,
  chapter,
  title = "Reflektera tillsammans.",
  subtitle,
  children,
  footer,
}: ExerciseReflectionProps) {
  const questions = parseQuestions(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            textAlign: "center",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>

        {/* Subtitle */}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.35vw, 1.25rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "32em",
              margin: 0,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}

        {/* Frågor */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.9rem, 1.8vh, 1.6rem)",
            width: "100%",
            maxWidth: "min(48rem, 100%)",
            marginTop: "clamp(0.5rem, 1.5vh, 1.5rem)",
            alignItems: "flex-start",
          }}
        >
          {questions.map((q, i) => (
            <QuestionRow
              key={i}
              text={q}
              index={i}
              delay={0.8 + i * 0.35}
              isClimax={i === questions.length - 1}
            />
          ))}
        </div>

        {/* Footer */}
        {footer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.8 + questions.length * 0.35 + 0.4,
            }}
            style={{
              marginTop: "clamp(1rem, 2vh, 1.8rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "40em",
            }}
          >
            <EditableText path="footer" value={footer}>
              {footer}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function QuestionRow({
  text,
  index,
  delay,
  isClimax,
}: {
  text: string;
  index: number;
  delay: number;
  isClimax: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "clamp(0.9rem, 1.6vw, 1.4rem)",
        alignItems: "baseline",
        paddingBottom: isClimax ? "clamp(0.5rem, 1vh, 1rem)" : 0,
        borderBottom: isClimax
          ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)"
          : "none",
        width: "100%",
      }}
    >
      {/* Numrering */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: isClimax
            ? "clamp(0.95rem, 1.2vw, 1.15rem)"
            : "clamp(0.85rem, 1.05vw, 1rem)",
          letterSpacing: "0.18em",
          color: "var(--accent)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          paddingTop: "0.15em",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Fråga */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: isClimax ? "normal" : "italic",
          fontWeight: isClimax ? 500 : 400,
          fontSize: isClimax
            ? "clamp(1.4rem, 2.1vw, 1.85rem)"
            : "clamp(1.15rem, 1.6vw, 1.45rem)",
          lineHeight: 1.35,
          color: isClimax ? "var(--text)" : "var(--text-muted)",
          letterSpacing: "-0.005em",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}
