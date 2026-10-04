"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PrebunkingCard {
  label: string;
  hint: string;
}

interface ArticleLine {
  kind: "heading" | "lead" | "subheading" | "body";
  text: string;
}

interface PrebunkingLabProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Stor titel. */
  title: string;
  /** Subtitle. */
  subtitle?: string;
  /** Bakgrund. */
  background?: string;
  /** Accentfärg. */
  accent?: string;
  /** Etikett på chat-fönstret. Default "SkolUp AI · Klassrumsdemo". */
  chatLabel?: string;
  /** Elev-prompten som typas fram i steg 1. */
  prompt: string;
  /** AI:ns "publikation" — t.ex. "Exempelbladet". Visas som badge i artikel. */
  articleSource?: string;
  /** Datum för fiktiv artikel. */
  articleDate?: string;
  /**
   * Markdown-lista i children. Två separata listor — korten först,
   * artikeltexten sedan. Båda i `<ul>` med en avskiljande tom rad i MDX.
   *
   * Kort-format: `- **Namn** · Beskrivning`
   * Artikel-format (rad-prefix): `- # Rubrik` / `- > Ingress` / `- ## Underrubrik` / `- Brödtext`
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
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

function parseChildren(children: ReactNode): {
  cards: PrebunkingCard[];
  article: ArticleLine[];
} {
  const cards: PrebunkingCard[] = [];
  const article: ArticleLine[] = [];

  // Hitta första element-child i en li (MDX-noteringen `- # ...` blir
  // `<li><h1>...</h1></li>`, så vi kollar element-typen istället för text-
  // prefixet — markdown-parsern tar bort `# `/`> ` innan vi ser texten).
  const firstElement = (
    li: ReactElement<{ children?: ReactNode }>
  ): ReactElement | null => {
    const kids = Children.toArray(li.props.children);
    for (const k of kids) {
      if (isValidElement(k)) return k as ReactElement;
    }
    return null;
  };

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const innerEl = firstElement(li);
    const innerType = innerEl ? innerEl.type : null;
    const raw = extractText(li.props.children).trim();
    if (!raw) return;

    // Artikel om listraden började som markdown-heading eller blockquote.
    // Om vi redan börjat artikeln, fortsätter alla efterföljande rader dit.
    const isHeading = innerType === "h1";
    const isSubheading = innerType === "h2";
    const isLead = innerType === "blockquote";
    const isArticleStart = isHeading || isSubheading || isLead;

    if (isArticleStart || article.length > 0) {
      if (isHeading) article.push({ kind: "heading", text: raw });
      else if (isSubheading) article.push({ kind: "subheading", text: raw });
      else if (isLead) article.push({ kind: "lead", text: raw });
      else article.push({ kind: "body", text: raw });
      return;
    }

    // Kort
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    const labelMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const label = labelMatch ? labelMatch[1] : parts[0];
    const hint = parts.slice(1).join(" · ");
    cards.push({ label, hint });
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

  return { cards, article };
}

/**
 * Typewriter som skriver fram en sträng tecken för tecken.
 */
function useTypewriter(
  text: string,
  active: boolean,
  speed = 18,
  delay = 0
): { shown: string; done: boolean } {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown("");
      setDone(false);
      return;
    }
    setShown("");
    setDone(false);
    const start = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        if (i >= text.length) {
          setShown(text);
          setDone(true);
          clearInterval(id);
        } else {
          setShown(text.slice(0, i));
        }
      }, speed);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(start);
  }, [text, active, speed, delay]);

  return { shown, done };
}

/**
 * PrebunkingLab — split-layout med exempel-kort till vänster (verktyg
 * eller spel) och en SkolUp AI-chattdemo till höger där en elevprompt
 * typas fram och en formaterad fejk-artikel skrivs ut.
 *
 * Steg 0: korten staggar in, chatfönstret är tomt.
 * Steg 1 (klick): prompten typas → artikeln skrivs ut med rubrik, ingress,
 * underrubrik och brödtext.
 *
 * Designintention: visa att prebunking inte bara är spel — eleverna kan
 * också *själva* generera trovärdiga narrativ och därigenom förstå hur
 * påverkan byggs upp.
 */
export function PrebunkingLab({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  chatLabel = "SkolUp AI · Klassrumsdemo",
  prompt,
  articleSource = "Tänkt nyhet",
  articleDate,
  children,
}: PrebunkingLabProps) {
  const { cards, article } = parseChildren(children);
  const step = useSlideSteps(2); // 0 = idle, 1 = typewriter igång
  const triggered = step >= 1;

  // Typewriter för prompten
  const promptTyper = useTypewriter(prompt, triggered, 22, 250);

  // När prompten är klar, börja typa artikeln rad för rad
  const articleStartDelay = 600;
  const [articleIdx, setArticleIdx] = useState(0);
  useEffect(() => {
    if (!promptTyper.done) {
      setArticleIdx(0);
      return;
    }
    // Stagger rad för rad
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    article.forEach((_, i) => {
      timeouts.push(
        setTimeout(() => setArticleIdx((prev) => Math.max(prev, i + 1)), articleStartDelay + i * 220)
      );
    });
    return () => timeouts.forEach(clearTimeout);
  }, [promptTyper.done, article]);

  const bg = background ?? "var(--slide-base, var(--bg))";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem) clamp(2.5rem, 5vw, 5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.75rem)",
          minHeight: 0,
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "52em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {kicker}
            </motion.div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(2rem, 4.2vw, 3.8rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                lineHeight: 1.5,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {/* Split: kort + chat */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
            gap: "clamp(1.5rem, 2.5vw, 2.5rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {/* Vänster — kort */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.75rem, 1.5vh, 1.25rem)",
              minHeight: 0,
            }}
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                data-card=""
                initial={{ opacity: 0, x: -24, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.45 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  gap: "clamp(0.85rem, 1.5vw, 1.2rem)",
                  alignItems: "center",
                  padding: "clamp(1rem, 1.8vh, 1.5rem) clamp(1rem, 1.8vw, 1.4rem)",
                  background: "var(--bg-surface)",
                  // Kvar med flit: brutalistkontraktet ([data-card]) skriver
                  // över kant, radie och skugga med !important på joelsai-
                  // temana, medan de sex andra decken behåller sitt mjuka läge.
                  border: `1px solid ${withAlpha(accent, 0.2)}`,
                  borderRadius: "0.6rem",
                  boxShadow:
                    "0 20px 40px -22px rgba(0,0,0,0.25), inset 0 1px 0 rgba(0,0,0,0.04)",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(1.5rem, 2.3vw, 2.3rem)",
                    fontWeight: 700,
                    color: accent,
                    width: "2.6rem",
                    textAlign: "right",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  aria-hidden
                  style={{
                    width: "2px",
                    alignSelf: "stretch",
                    background: withAlpha(accent, 0.27),
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.25rem, 1.7vw, 1.7rem)",
                      lineHeight: 1.15,
                      color: "var(--text)",
                      marginBottom: "0.3rem",
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {card.label}
                  </div>
                  {card.hint ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontStyle: "var(--display-italic, italic)",
                        fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                        lineHeight: 1.4,
                        color: "var(--text-muted)",
                      }}
                    >
                      {card.hint}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Höger — chat-fönster */}
          <motion.div
            data-card="flat"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              background:
                "linear-gradient(180deg, rgb(20,18,16), rgb(15,12,10))",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {/* Top-bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                padding: "0.7rem 1.1rem",
                borderBottom: "1px solid rgba(247,241,230,0.06)",
                background: "rgba(20,18,16,0.6)",
              }}
            >
              <div
                style={{
                  width: "1.6rem",
                  height: "1.6rem",
                  borderRadius: "50%",
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#0a0908",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                }}
              >
                S
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  color: "rgba(245,246,250,0.92)",
                }}
              >
                {chatLabel}
              </div>
              <div style={{ flex: 1 }} />
              <div
                aria-hidden
                style={{
                  display: "flex",
                  gap: "0.4rem",
                }}
              >
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    style={{
                      display: "inline-block",
                      width: "0.6rem",
                      height: "0.6rem",
                      borderRadius: "50%",
                      background: "rgba(247,241,230,0.22)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Prompt-input */}
            <div
              style={{
                padding: "1.1rem 1.3rem 0.9rem",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.95rem, 1.15vw, 1.2rem)",
                lineHeight: 1.4,
                color: "rgba(245,246,250,0.92)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.55rem",
                borderBottom: "1px solid rgba(247,241,230,0.06)",
                minHeight: "3.2rem",
              }}
            >
              <span
                style={{
                  color: accent,
                  fontWeight: 700,
                  flexShrink: 0,
                  lineHeight: 1.4,
                }}
              >
                ›
              </span>
              <span style={{ flex: 1 }}>
                {promptTyper.shown}
                {triggered && !promptTyper.done ? (
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: "0.5rem",
                      height: "1.05em",
                      background: accent,
                      marginLeft: "2px",
                      verticalAlign: "middle",
                      animation: "prebunking-cursor 1s steps(2) infinite",
                    }}
                  />
                ) : null}
                {!triggered ? (
                  <span
                    style={{
                      color: "rgba(247,241,230,0.35)",
                      fontStyle: "italic",
                    }}
                  >
                    elevprompten skrivs när du klickar fram nästa steg…
                  </span>
                ) : null}
              </span>
            </div>

            {/* Artikel-utskrift */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "1.1rem 1.3rem 1.3rem",
                fontFamily: "var(--font-display)",
                color: "rgba(245,246,250,0.92)",
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                minHeight: 0,
              }}
            >
              {/* Källrad */}
              <AnimatePresence>
                {promptTyper.done ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.18rem 0.5rem",
                        background: accent,
                        color: "#0a0908",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        borderRadius: "0.2rem",
                      }}
                    >
                      {articleSource}
                    </span>
                    {articleDate ? (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.7rem",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(245,246,250,0.6)",
                        }}
                      >
                        {articleDate}
                      </span>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {article.map((line, i) => {
                const visible = i < articleIdx;
                if (!visible) return null;
                if (line.kind === "heading") {
                  return (
                    <motion.h3
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(1.2rem, 1.7vw, 1.8rem)",
                        lineHeight: 1.1,
                        letterSpacing: "-0.02em",
                        color: "rgba(245,246,250,0.92)",
                        margin: "0.2rem 0 0.1rem",
                      }}
                    >
                      {line.text}
                    </motion.h3>
                  );
                }
                if (line.kind === "lead") {
                  return (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontWeight: 500,
                        fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                        lineHeight: 1.45,
                        color: "rgba(245,246,250,0.92)",
                        margin: "0.15rem 0 0.25rem",
                        borderLeft: `3px solid ${accent}`,
                        paddingLeft: "0.8rem",
                      }}
                    >
                      {line.text}
                    </motion.p>
                  );
                }
                if (line.kind === "subheading") {
                  return (
                    <motion.h4
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(0.85rem, 1vw, 1rem)",
                        lineHeight: 1.2,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: accent,
                        margin: "0.5rem 0 0.1rem",
                      }}
                    >
                      {line.text}
                    </motion.h4>
                  );
                }
                return (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1vw, 1rem)",
                      lineHeight: 1.55,
                      color: "rgba(245,246,250,0.92)",
                      margin: 0,
                    }}
                  >
                    {line.text}
                  </motion.p>
                );
              })}

              {/* Pulserande "tänker"-indikator innan första raden */}
              {promptTyper.done && articleIdx === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: "flex",
                    gap: "0.35rem",
                    paddingTop: "0.4rem",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.25, 0.8, 0.25] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: i * 0.18,
                      }}
                      style={{
                        display: "inline-block",
                        width: "0.45rem",
                        height: "0.45rem",
                        borderRadius: "50%",
                        background: accent,
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes prebunking-cursor {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
