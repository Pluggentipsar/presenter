"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MethodModeling — modellerar klassrumsgrepp som skyddar tänkandet.
 *
 * Tvåkolumnslayout: vänster rail med numrerade grepp (romerska I–IV),
 * höger yta med en mini-chattkonversation som växlar per klick-steg.
 * Aktivt grepp får accent-vänsterkant, full opacity och synlig beskrivning;
 * inaktiva grepp dämpas till bara namnet. Höger sida crossfade:ar mellan
 * bubbelpar — elevrepliken spring-ar in först, AI-svaret +0.5s senare.
 *
 * Sista klick-steget (om `bottomLine` finns) visar en avslutande poäng
 * under grepplistan med alla grepp kvar synliga.
 *
 * Byggd för "fyra grepp som skyddar tänkandet" i lärarföreläsningar.
 * Enbart tema-tokens — fungerar symmetriskt på ljusa (dagsljus)
 * och mörka teman.
 *
 * MDX-format — en rad per grepp, delar separerade med ` · `:
 *
 * ```mdx
 * <MethodModeling
 *   kicker="Metodik"
 *   chapter="§ Akt 3 · Skydda tänkandet"
 *   title="Fyra grepp som skyddar tänkandet."
 *   subtitle="Modellera i klassrummet — inte förbjud i korridoren."
 *   bottomLine="AI:n gör inte jobbet — den tvingar fram tänkandet."
 *   userLabel="Eleven"
 *   aiLabel="AI:n"
 * >
 * - Förklara först · Eleven förklarar sin idé innan AI:n får svara · Jag tror att fotosyntesen funkar så här... · Bra start! Vad händer med koldioxiden i steg två?
 * - Motfrågor · AI:n instrueras att bara ställa frågor tillbaka · Kan du skriva min inledning? · Vad vill du att läsaren ska känna efter första meningen?
 * </MethodModeling>
 * ```
 *
 * Per rad: `Namn · Beskrivning · Elevrepliken · AI-svaret`.
 * Minst 4 delar krävs — delar 5+ joinas tillbaka in i AI-svaret.
 */

interface MethodModelingProps {
  /** Kicker uppe till vänster i vänsterspalten. */
  kicker?: string;
  /** Kapitelmarkör i vänsterspaltens topprad. */
  chapter?: string;
  /** Övergripande rubrik. */
  title?: string;
  /** Underrubrik, kursiv. */
  subtitle?: string;
  /** Avslutande poäng — visas som eget sista klick-steg under grepplistan. */
  bottomLine?: string;
  /** Etikett vid elevbubblan. */
  userLabel?: string;
  /** Etikett vid AI-bubblan. */
  aiLabel?: string;
  children?: ReactNode;
}

interface Method {
  name: string;
  description: string;
  userText: string;
  aiText: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseMethods(children: ReactNode): Method[] {
  const out: Method[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 4) return;
    out.push({
      name: parts[0].trim(),
      description: parts[1].trim(),
      userText: parts[2].trim(),
      aiText: parts.slice(3).join(" · ").trim(),
    });
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

/** **fet** → accent (eller ärvd färg i elevbubblan), *kursiv* → em. */
function renderInline(text: string, inheritBold = false): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span
          key={i}
          style={{
            color: inheritBold ? "inherit" : "var(--accent)",
            fontWeight: 700,
          }}
        >
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

interface BubbleProps {
  role: "user" | "ai";
  label: string;
  text: string;
  delay: number;
  reduceMotion: boolean;
}

function Bubble({ role, label, text, delay, reduceMotion }: BubbleProps) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={
        reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18, scale: 0.96 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 240, damping: 24, delay }
      }
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        alignItems: isUser ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {/* Avsändar-etikett */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.55rem, 0.75vw, 0.7rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: isUser ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {label}
      </div>

      {/* Bubbla */}
      <div
        style={{
          maxWidth: "28em",
          padding:
            "clamp(0.85rem, 1.2vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.5rem)",
          background: isUser
            ? "var(--accent)"
            : "color-mix(in srgb, var(--text) 6%, transparent)",
          border: isUser
            ? "1px solid color-mix(in srgb, var(--accent) 70%, transparent)"
            : "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
          borderRadius: "var(--radius)",
          borderTopRightRadius: isUser ? "0.1rem" : undefined,
          borderTopLeftRadius: !isUser ? "0.1rem" : undefined,
          fontFamily: isUser ? "var(--font-body)" : "var(--font-display)",
          fontSize: "clamp(0.95rem, 1.25vw, 1.15rem)",
          lineHeight: 1.45,
          color: isUser ? "var(--bg)" : "var(--text)",
        }}
      >
        {renderInline(text, isUser)}
      </div>
    </motion.div>
  );
}

export function MethodModeling({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  userLabel = "Eleven",
  aiLabel = "AI:n",
  children,
}: MethodModelingProps) {
  const methods = useMemo(() => parseMethods(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const stepCount = methods.length + (bottomLine ? 1 : 0);
  const step = useSlideSteps(stepCount);
  const isBottomStep = Boolean(bottomLine) && step >= methods.length;
  const activeIndex =
    methods.length > 0 ? Math.min(step, methods.length - 1) : -1;
  const active = activeIndex >= 0 ? methods[activeIndex] : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 28% 22%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "38fr 58fr",
          columnGap: "clamp(1.8rem, 3.5vw, 3.5rem)",
          alignItems: "center",
          padding: "clamp(2.5rem, 5vw, 5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Vänster rail ————— */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Kicker + chapter */}
          {kicker || chapter ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.1 }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "clamp(1rem, 2vh, 1.5rem)",
              }}
            >
              {kicker ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  <EditableText path="kicker" value={kicker}>
                    {kicker}
                  </EditableText>
                </div>
              ) : null}
              {chapter ? (
                <div
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
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {/* Titel */}
          {title ? (
            <motion.h2
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.8,
                delay: reduceMotion ? 0 : 0.2,
                ease: EASE,
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.7rem, 2.7vw, 2.7rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title}>
                {renderInline(title)}
              </EditableText>
            </motion.h2>
          ) : null}

          {/* Subtitel */}
          {subtitle ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.6,
                delay: reduceMotion ? 0 : 0.4,
              }}
              style={{
                marginTop: "clamp(0.5rem, 1vh, 0.8rem)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)",
                lineHeight: 1.4,
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {renderInline(subtitle)}
              </EditableText>
            </motion.div>
          ) : null}

          {/* Grepplista */}
          <div
            style={{
              marginTop: "clamp(1.6rem, 3.5vh, 2.6rem)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.7rem, 1.4vh, 1.1rem)",
            }}
          >
            {methods.map((m, i) => {
              const isActive = !isBottomStep && i === activeIndex;
              const dimmed = !isActive && !isBottomStep;
              return (
                <motion.div
                  key={i}
                  initial={reduceMotion ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.55,
                    delay: reduceMotion ? 0 : 0.5 + i * 0.12,
                    ease: EASE,
                  }}
                >
                  <div
                    style={{
                      borderLeft: isActive
                        ? "3px solid var(--accent)"
                        : "3px solid color-mix(in srgb, var(--text) 12%, transparent)",
                      paddingLeft: "clamp(0.9rem, 1.3vw, 1.3rem)",
                      paddingTop: "0.15rem",
                      paddingBottom: "0.15rem",
                      opacity: dimmed ? 0.35 : 1,
                      transition: reduceMotion
                        ? "none"
                        : "opacity 0.45s, border-color 0.45s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "clamp(0.6rem, 0.9vw, 0.9rem)",
                      }}
                    >
                      {/* Romersk siffra */}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                          letterSpacing: "0.12em",
                          fontWeight: 600,
                          color: isActive
                            ? "var(--accent)"
                            : "color-mix(in srgb, var(--text) 55%, transparent)",
                          minWidth: "1.6em",
                          transition: reduceMotion ? "none" : "color 0.45s",
                        }}
                      >
                        {ROMAN[i] ?? String(i + 1)}
                      </span>
                      {/* Namn */}
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: isActive ? 700 : 500,
                          fontSize: "clamp(1.05rem, 1.5vw, 1.45rem)",
                          lineHeight: 1.2,
                          letterSpacing: "-0.01em",
                          color: "var(--text)",
                          transition: reduceMotion ? "none" : "font-weight 0.2s",
                        }}
                      >
                        {m.name}
                      </span>
                    </div>
                    {/* Beskrivning — bara på aktivt grepp */}
                    <AnimatePresence initial={false}>
                      {isActive ? (
                        <motion.div
                          key="desc"
                          initial={
                            reduceMotion
                              ? { opacity: 1, height: "auto" }
                              : { opacity: 0, height: 0 }
                          }
                          animate={{ opacity: 1, height: "auto" }}
                          exit={
                            reduceMotion
                              ? { opacity: 0, height: 0, transition: { duration: 0 } }
                              : { opacity: 0, height: 0 }
                          }
                          transition={{
                            duration: reduceMotion ? 0 : 0.45,
                            ease: EASE,
                          }}
                          style={{ overflow: "hidden" }}
                        >
                          <div
                            style={{
                              paddingTop: "0.4rem",
                              paddingLeft: "calc(1.6em + clamp(0.6rem, 0.9vw, 0.9rem))",
                              fontFamily: "var(--font-body)",
                              fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
                              lineHeight: 1.45,
                              color: "var(--text-muted)",
                            }}
                          >
                            {renderInline(m.description)}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom line — sista klick-steget */}
          {bottomLine ? (
            <AnimatePresence>
              {isBottomStep ? (
                <motion.div
                  key="bottomline"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduceMotion ? 0 : 0.25 },
                  }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.7,
                    ease: EASE,
                  }}
                  style={{
                    marginTop: "clamp(1.4rem, 3vh, 2.2rem)",
                    paddingTop: "clamp(0.9rem, 1.8vh, 1.4rem)",
                    borderTop: "2px solid var(--accent)",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.05rem, 1.45vw, 1.4rem)",
                    lineHeight: 1.4,
                    color: "var(--text)",
                  }}
                >
                  <EditableText path="bottomLine" value={bottomLine}>
                    {renderInline(bottomLine)}
                  </EditableText>
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : null}
        </div>

        {/* ————— Höger: chattyta ————— */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.8,
            delay: reduceMotion ? 0 : 0.6,
            ease: EASE,
          }}
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(1.6rem, 2.6vw, 2.6rem)",
            minHeight: "clamp(18rem, 52vh, 30rem)",
            background: "var(--bg-elevated)",
            border: "1px solid color-mix(in srgb, var(--text) 8%, transparent)",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 30px 70px -35px color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        >
          {active ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: { duration: reduceMotion ? 0 : 0.25 },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(1rem, 2vh, 1.5rem)",
                }}
              >
                <Bubble
                  role="user"
                  label={userLabel}
                  text={active.userText}
                  delay={0.05}
                  reduceMotion={reduceMotion}
                />
                <Bubble
                  role="ai"
                  label={aiLabel}
                  text={active.aiText}
                  delay={0.55}
                  reduceMotion={reduceMotion}
                />
              </motion.div>
            </AnimatePresence>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
