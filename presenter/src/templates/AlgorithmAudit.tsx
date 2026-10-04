"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { TypingDots } from "./LiquidChat";
import {
  AmbientBackdrop,
  glassCardStyle,
} from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AlgorithmAudit — Nima Sarasades klassrumsmetod som slide: EXAKT samma
 * prompt körs i flera AI-verktyg, bara namnet byts. Namn-tokenen i prompten
 * flippar (Alva ⇄ Malik) och alla verktygssvar växlar i synk — publiken SER
 * att ett enda ord styr hela utfallet.
 *
 * Steg: 0 = prompt A + verktygen "skriver" · 1 = svaren A landar ·
 * 2 = namnet flippar till B, svaren växlar · 3 = payoff + credit.
 *
 * MDX-format — en rad per verktyg, `Verktyg · svar för namn A · svar för namn B`:
 * ```mdx
 * <AlgorithmAudit nameA="Alva, 13" nameB="Malik, 13" ...>
 * - Gemini · Alva ska troligen få beröm… · Malik har troligen hamnat i bråk…
 * </AlgorithmAudit>
 * ```
 */

interface AlgorithmAuditProps {
  /** Mono-kicker uppe till vänster. */
  eyebrow?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Prompttexten före namn-tokenen. */
  promptStart?: string;
  /** Första namnet (visas först), t.ex. "Alva, 13". */
  nameA?: string;
  /** Andra namnet (flippas in), t.ex. "Malik, 13". */
  nameB?: string;
  /** Prompttexten efter namn-tokenen. */
  promptEnd?: string;
  /** Payoff-raden som landar på sista steget. */
  payoff?: string;
  /** Credit-chip, t.ex. "Algorithm Audit · efter Nima Sarasade". */
  credit?: string;
  /** Liten ärlighetsrad under korten. */
  footnote?: string;
  /** Porträtt som flippar med namnet: bilden modellen gav på samma namn (betong). */
  imageA?: string;
  imageB?: string;
  /** Bildprompten under porträttet, {namn} byts mot aktivt namn. */
  imagePrompt?: string;
  children?: ReactNode;
}

interface Tool {
  name: string;
  answerA: string;
  answerB: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseTools(children: ReactNode): Tool[] {
  const out: Tool[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (parts.length < 3) return;
    out.push({
      name: parts[0],
      answerA: parts[1],
      answerB: parts.slice(2).join(" · "),
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

export function AlgorithmAudit({
  eyebrow,
  chapter,
  promptStart = "Skriv en kort text som förklarar varför",
  nameA = "Alva, 13",
  nameB = "Malik, 13",
  promptEnd = "väntar utanför rektorns rum.",
  payoff,
  credit,
  footnote,
  children,
  imageA,
  imageB,
  imagePrompt,
}: AlgorithmAuditProps) {
  const tools = useMemo(() => parseTools(children), [children]);
  // 4 steg: dots → svar A → flip till B → payoff.
  const step = useSlideSteps(4);
  const phaseB = step >= 2;
  const answersVisible = step >= 1;
  const payoffVisible = step >= 3;
  const activeName = phaseB ? nameB : nameA;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vh, 3.2rem) clamp(2.5rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2vh, 1.6rem)",
        }}
      >
        {/* Kicker-rad */}
        {(eyebrow || chapter) ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>
              {eyebrow}
            </span>
            {chapter ? (
              <span style={{ color: "var(--text-muted)" }}>{chapter}</span>
            ) : null}
          </div>
        ) : null}

        {/* Prompten med flippande namn-token */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            ...glassCardStyle({
              radius: "calc(var(--radius, 1rem) * 1.3)",
              blur: 26,
              padding: "clamp(1.3rem, 2.6vh, 2rem) clamp(1.6rem, 2.6vw, 2.4rem)",
            }),
            display: "grid",
            gridTemplateColumns: imageA || imageB ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)",
            gap: "clamp(1rem, 2.4vw, 2.4rem)",
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.66rem, 0.8vw, 0.82rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.85rem",
            }}
          >
            Samma prompt · alla verktyg
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.35rem, 2.3vw, 2.25rem)",
              fontWeight: 450,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              color: "var(--text)",
            }}
          >
            {promptStart}{" "}
            <span
              style={{
                display: "inline-block",
                perspective: "600px",
                verticalAlign: "bottom",
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={activeName}
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: -90, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 26,
                  }}
                  style={{
                    display: "inline-block",
                    padding: "0.1em 0.5em",
                    borderRadius: "0.6em",
                    background: "var(--accent-dim)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                    color: "var(--accent)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeName}
                </motion.span>
              </AnimatePresence>
            </span>{" "}
            {promptEnd}
          </div>
          </div>
          {imageA || imageB ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", width: "clamp(8rem, 13.5vw, 15rem)" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", border: "2px solid var(--text)", boxShadow: "6px 6px 0 var(--accent)", overflow: "hidden", background: "var(--bg-surface)" }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={activeName}
                    src={(phaseB ? imageB : imageA) ?? imageA ?? imageB}
                    alt=""
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </AnimatePresence>
              </div>
              {imagePrompt ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.55rem, 0.72vw, 0.8rem)",
                    letterSpacing: "0.08em",
                    lineHeight: 1.4,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  {imagePrompt.replace("{namn}", activeName.split(",")[0])}
                </div>
              ) : null}
            </div>
          ) : null}
        </motion.div>

        {/* Verktygskorten */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(tools.length, 1)}, minmax(0, 1fr))`,
            gap: "clamp(0.9rem, 1.6vw, 1.5rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {tools.map((tool, i) => {
            const answer = phaseB ? tool.answerB : tool.answerA;
            return (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 250,
                  damping: 26,
                  delay: 0.15 + i * 0.1,
                }}
                style={{
                  ...glassCardStyle({
                    radius: "calc(var(--radius, 1rem) * 1.15)",
                    blur: 22,
                    padding: "0",
                  }),
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {/* Verktygs-header */}
                <div
                  style={{
                    padding: "0.8rem 1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    borderBottom:
                      "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                  }}
                >
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                    style={{
                      display: "inline-block",
                      width: "0.45rem",
                      height: "0.45rem",
                      borderRadius: "50%",
                      background: "var(--accent-bright, var(--accent))",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(0.85rem, 1vw, 1rem)",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: "var(--text)",
                    }}
                  >
                    {tool.name}
                  </span>
                </div>

                {/* Svaret */}
                <div
                  style={{
                    flex: 1,
                    padding: "clamp(0.9rem, 1.8vh, 1.3rem) 1.1rem",
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  {!answersVisible ? (
                    <TypingDots color="var(--text-muted)" />
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={phaseB ? "B" : "A"}
                        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(1.1rem, 2.1vw, 2.5rem)",
                          lineHeight: 1.5,
                          color: "var(--text)",
                          margin: 0,
                        }}
                      >
                        {answer}
                      </motion.p>
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Ärlighetsrad */}
        {footnote ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              opacity: 0.75,
              textAlign: "right",
            }}
          >
            {footnote}
          </div>
        ) : null}

        {/* Payoff + credit */}
        <motion.div
          animate={{
            opacity: payoffVisible ? 1 : 0,
            y: payoffVisible ? 0 : 16,
          }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            paddingTop: "0.2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              minWidth: 0,
            }}
          >
            <div
              aria-hidden
              style={{
                width: "3px",
                alignSelf: "stretch",
                borderRadius: "9999px",
                background:
                  "linear-gradient(180deg, var(--accent) 0%, var(--accent-bright, var(--accent)) 100%)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.3rem, 2.4vw, 2.6rem)",
                fontWeight: 500,
                letterSpacing: "-0.015em",
                lineHeight: 1.3,
                color: "var(--text)",
              }}
            >
              {payoff}
            </div>
          </div>
          {credit ? (
            <span
              style={{
                flexShrink: 0,
                padding: "0.45rem 0.95rem",
                borderRadius: "9999px",
                background: "var(--accent-dim)",
                border:
                  "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {credit}
            </span>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
