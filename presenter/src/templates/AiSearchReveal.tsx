"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";

/**
 * AiSearchReveal — en AI-söksida (DuckDuckGo-stil) där svaret typas fram
 * i sin helhet, med pulserande käll-chip.
 *
 * Poängen: den lilla källänken är det som stänger av vår granskning.
 * Därför är chipet det enda som pulserar — det ska DRA blicken.
 *
 * Klick-steg (useSlideSteps):
 * - Steg 0: bara sökfältet. Query typas fram automatiskt (~40 ms/tecken).
 * - Steg 1: AI-svarspanelen expanderar (spring), svaret typas fram
 *   (typeSpeed ms/tecken, `\n` = radbrytning). När svaret är klart
 *   spring-poppar citation-chipet in och pulserar oändligt subtilt.
 *
 * Tema-symmetrisk: enbart tokens (--bg, --bg-surface, --bg-elevated,
 * --text, --text-muted, --accent, --accent-glow) + color-mix. Fungerar
 * ljust (dagsljus) och mörkt. Respekterar prefers-reduced-motion
 * (allt visas direkt, ingen puls).
 *
 * ```mdx
 * <AiSearchReveal
 *   kicker="Fallet"
 *   chapter="§ Akt 2 · Källkritik"
 *   query="did trump have rabies"
 *   answer="Ja — enligt flera källor behandlades Donald Trump för rabies 2019.\nBehandlingen skedde i tysthet på Walter Reed-sjukhuset."
 *   citation="whitehouse.gov"
 *   citationNote="Länken fanns. Sidan sa något helt annat."
 * />
 * ```
 */

interface AiSearchRevealProps {
  /** Mono-etikett uppe till vänster (accent). */
  kicker?: string;
  /** Mono-etikett uppe till höger (muted). */
  chapter?: string;
  /** Sökmotorns namn i sökfältets högerkant. */
  engine?: string;
  /** Etikett i svarspanelens huvud. */
  tagline?: string;
  /** Sökfrågan som typas fram i sökfältet (steg 0). */
  query: string;
  /** AI-svaret som typas fram i panelen (steg 1). `\n` = radbrytning. */
  answer: string;
  /** Käll-chip som poppar in när svaret typats klart. */
  citation?: string;
  /** Muted not under chipet. */
  citationNote?: string;
  /** Ms per tecken för svaret. */
  typeSpeed?: number;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const QUERY_SPEED = 40;

/** MDX-attribut ger literala `\n` (två tecken) — gör dem till riktiga radbrytningar. */
function toLines(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function MagnifierIcon() {
  return (
    <svg
      width="1.1em"
      height="1.1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.2" y2="16.2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="0.95em"
      height="0.95em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function AiSearchReveal({
  kicker,
  chapter,
  engine = "DuckDuckGo",
  tagline = "AI-genererat svar",
  query,
  answer,
  citation,
  citationNote,
  typeSpeed = 16,
}: AiSearchRevealProps) {
  const reduce = useReducedMotion();
  const step = useSlideSteps(2);
  const revealed = step >= 1;

  const queryText = useMemo(() => toLines(query), [query]);
  const answerText = useMemo(() => toLines(answer), [answer]);

  const [typedQuery, setTypedQuery] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");

  // Steg 0: typa fram sökfrågan automatiskt.
  useEffect(() => {
    if (reduce) {
      setTypedQuery(queryText);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let c = 0;
    const tick = () => {
      if (cancelled) return;
      c += 1;
      setTypedQuery(queryText.slice(0, c));
      if (c < queryText.length) timer = setTimeout(tick, QUERY_SPEED);
    };
    timer = setTimeout(tick, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [queryText, reduce]);

  // Steg 1: typa fram svaret.
  useEffect(() => {
    if (!revealed) {
      setTypedAnswer("");
      return;
    }
    if (reduce) {
      setTypedAnswer(answerText);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let c = 0;
    const tick = () => {
      if (cancelled) return;
      c += 1;
      setTypedAnswer(answerText.slice(0, c));
      if (c < answerText.length) timer = setTimeout(tick, typeSpeed);
    };
    timer = setTimeout(tick, 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [revealed, answerText, typeSpeed, reduce]);

  const answerDone =
    revealed && answerText.length > 0 && typedAnswer.length >= answerText.length;

  const monoLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
    letterSpacing: "0.32em",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 75%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            ...monoLabel,
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            color: "var(--accent)",
            zIndex: 3,
          }}
        >
          {kicker}
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            ...monoLabel,
            fontWeight: 400,
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Centrerad sökpanel */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(2rem, 4vw, 4rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1.1rem, 2.2vh, 1.7rem)",
          zIndex: 2,
        }}
      >
        {/* Sökfält */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          style={{
            width: "min(880px, 100%)",
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.7rem, 1vw, 1rem)",
            padding:
              "clamp(0.85rem, 1.3vh, 1.15rem) clamp(1.2rem, 1.8vw, 1.7rem)",
            borderRadius: "999px",
            background: "var(--bg-elevated)",
            border: "1px solid color-mix(in srgb, var(--text) 14%, transparent)",
            boxShadow:
              "0 12px 32px -18px color-mix(in srgb, var(--text) 35%, transparent)",
          }}
        >
          <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
            <MagnifierIcon />
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.4vw, 1.3rem)",
              lineHeight: 1.3,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {typedQuery}
            {!reduce && !revealed ? (
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.55,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1.05em",
                  marginLeft: "2px",
                  verticalAlign: "text-bottom",
                  background: "var(--accent)",
                }}
              />
            ) : null}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.8vw, 0.78rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {engine}
          </span>
        </motion.div>

        {/* AI-svarspanel */}
        <AnimatePresence>
          {revealed ? (
            <motion.div
              key="answer-panel"
              initial={reduce ? false : { opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 14, scale: 0.98 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 240, damping: 26 }
              }
              style={{
                width: "min(880px, 100%)",
                background: "var(--bg-surface)",
                border:
                  "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
                borderRadius: "var(--radius)",
                padding:
                  "clamp(1.2rem, 2vh, 1.7rem) clamp(1.4rem, 2.2vw, 2rem)",
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.8rem, 1.5vh, 1.1rem)",
                boxShadow:
                  "0 20px 48px -24px color-mix(in srgb, var(--text) 30%, transparent)",
              }}
            >
              {/* Gnist-ikon + tagline */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                }}
              >
                <span
                  style={{
                    color: "var(--accent)",
                    display: "inline-flex",
                    fontSize: "0.95rem",
                  }}
                >
                  <SparkIcon />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.8vw, 0.78rem)",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  {tagline}
                </span>
              </div>

              {/* Svaret, typas fram */}
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1rem, 1.35vw, 1.25rem)",
                  lineHeight: 1.55,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  minHeight: "1.55em",
                }}
              >
                {typedAnswer}
                {!reduce && !answerDone ? (
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0] }}
                    transition={{
                      duration: 0.55,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    style={{
                      display: "inline-block",
                      width: "0.45ch",
                      height: "1em",
                      marginLeft: "1px",
                      verticalAlign: "text-bottom",
                      background: "var(--accent)",
                    }}
                  />
                ) : null}
              </div>

              {/* Citation-chip + not — poppar in när svaret är klart */}
              <AnimatePresence>
                {answerDone && citation ? (
                  <motion.div
                    key="citation"
                    initial={reduce ? false : { opacity: 0, scale: 0.55, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 380,
                            damping: 18,
                            delay: 0.35,
                          }
                    }
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.55rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        position: "relative",
                        display: "inline-flex",
                      }}
                    >
                      {/* Glow-lager bakom chipet (opacity-puls, tema-säker) */}
                      {!reduce ? (
                        <motion.span
                          aria-hidden
                          animate={{ opacity: [0.25, 0.85, 0.25] }}
                          transition={{
                            duration: 1.9,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "999px",
                            boxShadow: "0 0 22px 4px var(--accent-glow)",
                            pointerEvents: "none",
                          }}
                        />
                      ) : null}
                      <motion.span
                        animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
                        transition={
                          reduce
                            ? undefined
                            : {
                                duration: 1.9,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }
                        }
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding:
                            "clamp(0.4rem, 0.7vh, 0.55rem) clamp(0.85rem, 1.2vw, 1.1rem)",
                          borderRadius: "999px",
                          border:
                            "1px solid color-mix(in srgb, var(--accent) 60%, transparent)",
                          background:
                            "color-mix(in srgb, var(--accent) 10%, transparent)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.72rem, 0.95vw, 0.9rem)",
                          letterSpacing: "0.04em",
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--accent)",
                            display: "inline-flex",
                          }}
                        >
                          <LinkIcon />
                        </span>
                        {citation}
                      </motion.span>
                    </span>

                    {citationNote ? (
                      <motion.span
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={
                          reduce ? { duration: 0 } : { duration: 0.6, delay: 0.9 }
                        }
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.82rem, 1vw, 0.95rem)",
                          lineHeight: 1.45,
                          color: "var(--text-muted)",
                        }}
                      >
                        {citationNote}
                      </motion.span>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
