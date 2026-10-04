"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface FriendshipKindsProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Intro-mening ovanför korten. */
  intro?: string;
  /** Rubrik på det öppna fjärde kortet. */
  openTitle?: string;
  /** Frågan i det öppna kortet — den publiken själv ska besvara. */
  openQuestion?: string;
  /**
   * Markdown-lista, tre sorter:
   * `- NAMN · BESKRIVNING · AI-OMDÖME`
   * Ett omdöme som innehåller "inte" markeras med accent (AI klarar det ej).
   */
  children?: ReactNode;
}

interface Kind {
  name: string;
  description: string;
  verdict: string;
  cannot: boolean;
}

const NUMERALS = ["I", "II", "III", "IV", "V"];

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

function parseKinds(children: ReactNode): Kind[] {
  const out: Kind[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [name = "", description = "", verdict = ""] = raw
      .split("·")
      .map((s) => s.trim());
    out.push({
      name,
      description,
      verdict,
      cannot: /\binte\b/i.test(verdict),
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

/**
 * FriendshipKinds — relationskritik-modellen.
 *
 * Aristoteles tre sorters vänskap som ett editorial boksida-diagram: tre
 * kort i rad, var och en med namn, beskrivning och ett AI-omdöme. Det kort
 * vars omdöme innehåller "inte" (dygdvänskapen) markeras med accent.
 *
 * Under korten: ett öppet, streckat fjärde kort — frågan publiken själv
 * ska besvara. Inga färdiga svar; provokationen är poängen.
 *
 * Designat att ersätta JagAIJagCircles på modell-slidet. Tema-agnostisk.
 */
export function FriendshipKinds({
  kicker,
  chapter,
  intro,
  openTitle = "Och AI? Den ryms inte riktigt i någon av dem.",
  openQuestion = "En fjärde sort av vänskap. Vad ska vi kalla den?",
  children,
}: FriendshipKindsProps) {
  const kinds = parseKinds(children);
  const afterCards = 0.7 + kinds.length * 0.55;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Subtilt mönster */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 45%, var(--accent-dim) 0%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

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
          padding: "clamp(2.5rem, 5vw, 5.5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.2rem, 2.6vh, 2.2rem)",
          zIndex: 2,
        }}
      >
        {/* Intro */}
        {intro ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.45rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "30em",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Tre kort */}
        <div
          style={{
            display: "flex",
            gap: "clamp(1rem, 2.2vw, 2.2rem)",
            justifyContent: "center",
            alignItems: "stretch",
            flexWrap: "wrap",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
          }}
        >
          {kinds.map((kind, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.7 + i * 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                flex: "1 1 0",
                minWidth: "12rem",
                maxWidth: "19rem",
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.5rem, 1vh, 0.8rem)",
                padding: "clamp(1.1rem, 2vh, 1.8rem) clamp(1rem, 1.6vw, 1.6rem)",
                background: kind.cannot
                  ? "var(--accent-dim)"
                  : "color-mix(in srgb, var(--text) 3%, transparent)",
                border: kind.cannot
                  ? "1.5px solid var(--accent)"
                  : "1px solid color-mix(in srgb, var(--text) 18%, transparent)",
                borderRadius: "var(--radius)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.18em",
                  color: kind.cannot ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {NUMERALS[i] ?? String(i + 1)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.2rem, 1.75vw, 1.65rem)",
                  color: "var(--text)",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.15,
                }}
              >
                {kind.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.9rem, 1.1vw, 1.08rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {kind.description}
              </span>
              {kind.verdict ? (
                <span
                  style={{
                    marginTop: "auto",
                    paddingTop: "clamp(0.6rem, 1.2vh, 1rem)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.72rem, 0.92vw, 0.92rem)",
                    letterSpacing: "0.04em",
                    color: kind.cannot ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: kind.cannot ? 700 : 500,
                  }}
                >
                  {kind.verdict}
                </span>
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* Öppet fjärde kort */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: afterCards + 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(1rem, 2.2vw, 2rem)",
            width: "100%",
            maxWidth: "min(46rem, 100%)",
            padding: "clamp(1rem, 2vh, 1.6rem) clamp(1.3rem, 2.4vw, 2.2rem)",
            border: "1.5px dashed color-mix(in srgb, var(--text) 38%, transparent)",
            borderRadius: "var(--radius)",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(2.6rem, 4.5vw, 4rem)",
              lineHeight: 0.9,
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            ?
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.25rem, 0.6vh, 0.5rem)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(1.15rem, 1.7vw, 1.6rem)",
                color: "var(--text)",
                letterSpacing: "-0.015em",
                lineHeight: 1.25,
              }}
            >
              <EditableText path="openTitle" value={openTitle}>
                {openTitle}
              </EditableText>
            </span>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(0.92rem, 1.15vw, 1.12rem)",
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              <EditableText path="openQuestion" value={openQuestion}>
                {openQuestion}
              </EditableText>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
