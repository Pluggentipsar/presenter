"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * StudentQuiz ★ — quizet eleven byggde, körbart på duken.
 *
 * Poängen med sliden är inte quizet. Poängen är att eleven skrev
 * frågorna OCH bestämde rätt svar — och att den delen är repetitionen.
 * AI:n gjorde bara formen. Därför visar sliden prompten först och
 * artefakten sedan: publiken ska se hur lite AI:n egentligen bidrog med.
 *
 * Rummet får klicka. Det är avsiktligt — Joel kan låta salen ropa svaret
 * och sedan trycka, och då upptäcker de själva att frågorna är svårare
 * att FORMULERA än att svara på.
 *
 * Knappar är inte INPUT, så piltangenterna fortsätter bläddra slides
 * även mitt i quizet. Man kan alltså klicka sig igenom och gå vidare
 * utan att först klicka bort fokus.
 *
 * MDX-format, en rad per fråga:
 * `- FRÅGA :: alternativ | rätt alternativ* | alternativ :: förklaring`
 *
 * ```mdx
 * <StudentQuiz
 *   tag="§ Eleven som skapare"
 *   title="Elevens eget quiz — på tio minuter"
 *   prompt="Gör ett quiz av mina tio frågor om demokratins vakter."
 * >
 * - Vad är mediernas uppgift? :: Stötta regeringen | Granska makten* | Sälja annonser :: Granskande journalistik kallas den tredje statsmakten.
 * </StudentQuiz>
 * ```
 */

interface StudentQuizProps {
  tag?: string;
  title?: string;
  /** Vem som skrev prompten. */
  promptBy?: string;
  /** Elevens prompt. Visas på steg 0. */
  prompt?: string;
  widgetName?: string;
  /** Raden under quizet. Stödjer **fet**. */
  footnote?: string;
  accent?: string;
  /** En rad per fråga, se format ovan. */
  children?: ReactNode;
}

interface Question {
  q: string;
  options: string[];
  correct: number;
  why?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
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
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const raw = extractText(el.props.children).trim();
        const [q, opts, why] = raw.split("::").map((s) => s.trim());
        if (!q || !opts) return;
        const parts = opts.split("|").map((s) => s.trim()).filter(Boolean);
        // Stjärnan markerar rätt svar och strippas innan visning. Saknas den
        // hoppas frågan över — hellre en fråga färre än en fråga utan facit.
        const correct = parts.findIndex((p) => p.endsWith("*"));
        if (correct < 0) return;
        out.push({ q, options: parts.map((p) => p.replace(/\*$/, "").trim()), correct, why });
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out;
}

export function StudentQuiz({
  tag,
  title,
  promptBy = "Elev",
  prompt,
  widgetName = "Copilot",
  footnote,
  accent = "var(--accent)",
  children,
}: StudentQuizProps) {
  const step = useSlideSteps(2);
  const built = step >= 1;
  const questions = useMemo(() => parseQuestions(children), [children]);
  const [picked, setPicked] = useState<Record<number, number>>({});

  const answered = Object.keys(picked).length;
  const score = Object.entries(picked).filter(([qi, oi]) => questions[Number(qi)]?.correct === oi).length;

  const muted = "var(--text-muted)";
  const ok = accent;
  const bad = "var(--accent-alert, #E63946)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {tag ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.4vh, 2.8rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="tag" value={tag}>
            {tag}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(1.8rem, 3.6vh, 3rem) clamp(2.4rem, 5vw, 5rem)",
          paddingTop: "clamp(3.6rem, 7vh, 5rem)",
          gap: "clamp(0.7rem, 1.6vh, 1.2rem)",
          zIndex: 2,
          minHeight: 0,
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.3rem, 2.4vw, 2.1rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title} multiline block>
              {inlineMarkdown(title)}
            </EditableText>
          </div>
        ) : null}

        {/* Steg 0 · prompten */}
        {prompt ? (
          <motion.div
            animate={{ opacity: built ? 0.42 : 1 }}
            transition={{ duration: 0.6 }}
            style={{
              border: "1px solid rgba(128,128,128,0.26)",
              borderRadius: "var(--radius, 0.6rem)",
              background: "var(--bg-surface)",
              padding: "clamp(0.7rem, 1.5vh, 1.1rem) clamp(0.9rem, 1.8vw, 1.4rem)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.58rem, 0.72vw, 0.75rem)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.4rem",
              }}
            >
              <span>{promptBy}</span>
              <span style={{ color: muted }}>→ {widgetName}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)",
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              <EditableText path="prompt" value={prompt} multiline block>
                {inlineMarkdown(prompt)}
              </EditableText>
            </div>
          </motion.div>
        ) : null}

        {/* Steg 1 · quizet */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={built ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: built ? "flex" : "none",
            flexDirection: "column",
            gap: "clamp(0.4rem, 1vh, 0.8rem)",
            border: `1px solid ${accent}`,
            borderRadius: "var(--radius, 0.6rem)",
            background: "var(--bg-surface)",
            padding: "clamp(0.8rem, 1.8vh, 1.3rem) clamp(1rem, 2vw, 1.6rem)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.58rem, 0.72vw, 0.75rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: muted,
              flexShrink: 0,
            }}
          >
            <span>Demokratins vakter · {questions.length} frågor</span>
            <span style={{ color: answered ? accent : muted, fontSize: "1.2em" }}>
              {score} / {questions.length} rätt
            </span>
          </div>

          {questions.map((q, qi) => {
            const pick = picked[qi];
            const done = pick !== undefined;
            return (
              <div key={qi} style={{ flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(0.8rem, 1.15vw, 1.05rem)",
                    lineHeight: 1.25,
                    color: "var(--text)",
                    marginBottom: "0.3rem",
                  }}
                >
                  <span style={{ color: muted, fontFamily: "var(--font-mono)", marginRight: "0.5rem" }}>
                    {String(qi + 1).padStart(2, "0")}
                  </span>
                  {q.q}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {q.options.map((o, oi) => {
                    const isRight = oi === q.correct;
                    const chosen = pick === oi;
                    const color = done ? (isRight ? ok : chosen ? bad : muted) : "var(--text)";
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setPicked((p) => (p[qi] !== undefined ? p : { ...p, [qi]: oi }))}
                        style={{
                          padding: "0.3rem 0.7rem",
                          borderRadius: 999,
                          border: `1px solid ${done && (isRight || chosen) ? color : "rgba(128,128,128,0.3)"}`,
                          background: done && isRight ? "var(--accent-dim, transparent)" : "transparent",
                          fontFamily: "var(--font-sans)",
                          fontSize: "clamp(0.72rem, 1vw, 0.92rem)",
                          color,
                          cursor: done ? "default" : "pointer",
                          opacity: done && !isRight && !chosen ? 0.45 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {done && isRight ? "✓ " : done && chosen ? "✕ " : ""}
                        {o}
                      </button>
                    );
                  })}
                </div>
                {done && q.why ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.35 }}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.6rem, 0.78vw, 0.78rem)",
                      lineHeight: 1.45,
                      color: muted,
                      marginTop: "0.25rem",
                    }}
                  >
                    {q.why}
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </motion.div>

        {footnote ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={built ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.1em",
              color: muted,
              flexShrink: 0,
            }}
          >
            <EditableText path="footnote" value={footnote}>
              {inlineMarkdown(footnote)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
