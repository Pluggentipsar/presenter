"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BoundaryQuestions — tre frågor som bildar en skyddande ram runt chatten.
 *
 * Chatten ligger i mitten, dämpad. Runt den ritas en ram — och ramen växer
 * exakt i takt med att frågorna landar: en tredjedel per fråga. När den
 * tredje frågan står är ramen sluten och glöder.
 *
 * Det är ingen metafor som behöver förklaras. Publiken ser att frågorna ÄR
 * skyddet, och att skyddet är ofullständigt tills alla tre ställts.
 *
 * ```mdx
 * <BoundaryQuestions
 *   kicker="§ 3 · Före ett personligt samtal"
 *   userMessage="Jag vet inte vem jag ska prata med om det här."
 *   aiMessage="Du kan alltid prata med mig. Jag finns här dygnet runt."
 *   bottomLine="Din fråga innehåller ofta **mer information än du tror**."
 * >
 * - Skulle personen jag berättar om vilja att jag delar detta?
 * - Behöver jag råd, eller behöver jag en människa?
 * - Hjälper AI mig att agera, eller hjälper den mig att undvika?
 * </BoundaryQuestions>
 * ```
 */

interface BoundaryQuestionsProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Elevens replik i chatten som ramas in. */
  userMessage?: string;
  /** AI:ns svar i chatten som ramas in. */
  aiMessage?: string;
  /** Etikett vid elevbubblan. */
  userLabel?: string;
  /** Etikett vid AI-bubblan. */
  aiLabel?: string;
  /** Slutrad — landar när ramen är sluten. */
  bottomLine?: string;
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

function parseQuestions(children: ReactNode): string[] {
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
  return out.slice(0, 3);
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

function QuestionCard({
  index,
  text,
  shown,
  reduceMotion,
  align,
}: {
  index: number;
  text: string;
  shown: boolean;
  reduceMotion: boolean;
  align: "center" | "left" | "right";
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: shown ? 1 : 0.15, y: shown ? 0 : 10 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems:
          align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start",
        gap: "clamp(0.3rem, 0.8vh, 0.5rem)",
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.66rem, 0.95vw, 0.95rem)",
          letterSpacing: "0.3em",
          fontWeight: 700,
          color: "var(--accent)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(1.1rem, 1.85vw, 1.85rem)",
          lineHeight: 1.35,
          letterSpacing: "-0.01em",
          color: "var(--text)",
          // Kortare radlängd när graden går upp — 17em blev för breda rader
          // i sidokolumnerna vid den nya storleken.
          maxWidth: "15em",
        }}
      >
        {renderInline(text)}
      </span>
    </motion.div>
  );
}

export function BoundaryQuestions({
  chapter,
  kicker,
  userMessage,
  aiMessage,
  userLabel = "Eleven",
  aiLabel = "AI:n",
  bottomLine,
  children,
}: BoundaryQuestionsProps) {
  const questions = useMemo(() => parseQuestions(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(questions.length + (bottomLine ? 1 : 0));
  const answered = Math.min(step + 1, questions.length);
  const closed = answered >= questions.length;
  const landed = Boolean(bottomLine) && step >= questions.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1rem, 2.6vh, 1.9rem)",
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

        {/* Fråga 1 — ovanför ramen */}
        {questions[0] ? (
          <QuestionCard
            index={0}
            text={questions[0]}
            shown={step >= 0}
            reduceMotion={reduceMotion}
            align="center"
          />
        ) : null}

        {/* ————— Frågorna 2 och 3 flankerar den inramade chatten ————— */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr minmax(0, 1.5fr) 1fr",
            gap: "clamp(0.9rem, 2.2vw, 2.2rem)",
            alignItems: "center",
          }}
        >
          {questions[1] ? (
            <QuestionCard
              index={1}
              text={questions[1]}
              shown={step >= 1}
              reduceMotion={reduceMotion}
              align="right"
            />
          ) : (
            <div />
          )}

          {/* Chatten som ramas in */}
          <div style={{ position: "relative", padding: "clamp(0.9rem, 2vw, 1.7rem)" }}>
            {/* Ramen — växer en tredjedel per fråga */}
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              <motion.rect
                x={1}
                y={1}
                width={98}
                height={98}
                rx={3}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{
                  pathLength:
                    questions.length > 0 ? answered / questions.length : 1,
                  opacity: closed ? 1 : 0.65,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
                style={{
                  filter: closed
                    ? "drop-shadow(0 0 10px var(--accent-glow))"
                    : "none",
                }}
              />
            </svg>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.55rem, 1.3vh, 0.9rem)",
                opacity: 0.75,
              }}
            >
              {userMessage ? (
                <div
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "92%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.58rem, 0.82vw, 0.82rem)",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {userLabel}
                  </span>
                  <span
                    style={{
                      padding: "clamp(0.6rem, 1.15vw, 0.95rem) clamp(0.85rem, 1.5vw, 1.3rem)",
                      background: "color-mix(in srgb, var(--text) 8%, transparent)",
                      borderRadius: "var(--radius)",
                      borderTopRightRadius: "0.15rem",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.92rem, 1.32vw, 1.3rem)",
                      lineHeight: 1.4,
                      color: "var(--text)",
                    }}
                  >
                    {userMessage}
                  </span>
                </div>
              ) : null}

              {aiMessage ? (
                <div
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "92%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.58rem, 0.82vw, 0.82rem)",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {aiLabel}
                  </span>
                  <span
                    style={{
                      padding: "clamp(0.6rem, 1.15vw, 0.95rem) clamp(0.85rem, 1.5vw, 1.3rem)",
                      background: "var(--bg-elevated)",
                      border:
                        "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
                      borderRadius: "var(--radius)",
                      borderTopLeftRadius: "0.15rem",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(0.92rem, 1.32vw, 1.3rem)",
                      lineHeight: 1.4,
                      color: "var(--text)",
                    }}
                  >
                    {aiMessage}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {questions[2] ? (
            <QuestionCard
              index={2}
              text={questions[2]}
              shown={step >= 2}
              reduceMotion={reduceMotion}
              align="left"
            />
          ) : (
            <div />
          )}
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.2rem, 1.9vw, 1.95rem)",
              lineHeight: 1.35,
              color: "var(--text)",
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
