"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ThreeQuestionsProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  bottomLine?: string;
  /**
   * Markdown-lista. Format per item:
   * `- Fråga · Förklaring · Konkret exempel`
   * `- ★ Fråga · ...` markerar den centrala (accent + glow + utökad).
   */
  children?: ReactNode;
}

interface QuestionItem {
  question: string;
  hint: string;
  example: string;
  starred: boolean;
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

function parseItems(children: ReactNode): QuestionItem[] {
  const out: QuestionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const starred = raw.startsWith("★");
      const clean = raw.replace(/^★\s*/, "");
      const parts = clean.split(/\s*·\s*/);
      out.push({
        question: parts[0] ?? "",
        hint: parts[1] ?? "",
        example: parts.slice(2).join(" · "),
        starred,
      });
    });
  });
  return out;
}

/**
 * Tre frågor som vecklar ut sig med konkreta exempel. Varje kort har stort
 * nummer, fråga, hint och en accent-tonad exempel-ruta som glider in när
 * resten av kortet landat. Den ★-markerade frågan får alert-accent + extra
 * tyngd.
 */
export function ThreeQuestions({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  children,
}: ThreeQuestionsProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";
  const step = useSlideSteps(items.length);
  const visibleCount = Math.min(step + 1, items.length);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.4vh, 2.2rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Title-block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "44em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.2vw, 1.22rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.75rem 0 0 0",
                maxWidth: "40em",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* Question cards */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(1rem, 1.8vw, 1.7rem)",
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          {items.map((item, i) => {
            const isVisible = i < visibleCount;
            const cardDelay = 0;
            const exampleDelay = 0.6;
            return (
              <motion.div
                key={i}
                data-card=""
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={
                  isVisible
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0.18, y: 0, scale: 0.96 }
                }
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 26,
                  delay: cardDelay,
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "clamp(1.4rem, 2vw, 2rem)",
                  borderRadius: "1.4rem",
                  background: item.starred
                    ? `linear-gradient(160deg, ${withAlpha("var(--accent)", 0.22)} 0%, ${withAlpha("var(--accent)", 0.04)} 100%)`
                    : "var(--bg-elevated)",
                  border: item.starred
                    ? `1.5px solid ${withAlpha("var(--accent)", 0.55)}`
                    : "1px solid rgba(127,127,127,0.18)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: item.starred
                    ? `0 24px 60px -18px var(--accent-glow, rgba(0,0,0,0.4)), inset 0 1px 0 ${withAlpha("var(--accent)", 0.4)}`
                    : "0 14px 36px -14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                  gap: "clamp(0.9rem, 1.4vh, 1.3rem)",
                }}
              >
                {/* Number badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.7rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(3.4rem, 6vw, 5.4rem)",
                      fontWeight: 200,
                      lineHeight: 0.85,
                      letterSpacing: "-0.06em",
                      color: item.starred ? accent : "var(--text-muted)",
                      opacity: item.starred ? 1 : 0.55,
                      textShadow: item.starred
                        ? `0 0 28px ${withAlpha("var(--accent)", 0.45)}`
                        : undefined,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.starred ? (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: accent,
                        fontWeight: 600,
                      }}
                    >
                      ★ Den viktigaste
                    </span>
                  ) : null}
                </div>

                {/* Question */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.35rem, 1.85vw, 1.85rem)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.18,
                    color: "var(--text)",
                  }}
                >
                  {item.question}
                </div>

                {/* Hint */}
                {item.hint ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.92rem, 1.05vw, 1.06rem)",
                      lineHeight: 1.5,
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    {item.hint}
                  </p>
                ) : null}

                {/* Spacer to push example to bottom */}
                <div style={{ flex: 1 }} />

                {/* Example bubble — reveals after card */}
                {item.example ? (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.95 }}
                    animate={
                      isVisible
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 14, scale: 0.95 }
                    }
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 24,
                      delay: isVisible ? exampleDelay : 0,
                    }}
                    style={{
                      padding: "clamp(0.7rem, 1.1vw, 1rem) clamp(0.9rem, 1.2vw, 1.1rem)",
                      borderRadius: "var(--radius, 0.85rem)",
                      background: "var(--bg-surface)",
                      borderLeft: `3px solid ${item.starred ? accent : "rgba(127,127,127,0.35)"}`,
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.82rem, 0.95vw, 0.96rem)",
                      lineHeight: 1.5,
                      color: "var(--text)",
                      fontStyle: "italic",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        fontStyle: "normal",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Exempel
                    </span>
                    {item.example}
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.6 }}
            style={{
              borderTop: "1px solid rgba(127,127,127,0.18)",
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.35rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "62em",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
