"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  GlassCard,
} from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface DempseyFourWordsProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Final reveal-mening — Dempseys tes. */
  bottomLine?: string;
  background?: string;
  accent2?: string;
  /**
   * Fyra ord. Format: `- Ord · *etymologi-källa* · betydelse`
   * Pipe-separator också accepterad.
   */
  children?: ReactNode;
}

interface WordItem {
  word: string;
  etymology: string;
  meaning: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "em") return `*${inner}*`;
    if (t === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): WordItem[] {
  const out: WordItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          const parts = text.split(/\s*·\s*/);
          out.push({
            word: parts[0] ?? "",
            etymology: parts[1]?.replace(/^\*|\*$/g, "") ?? "",
            meaning: parts.slice(2).join(" · "),
          });
        }
      });
    }
  });
  return out;
}

/**
 * Fyra ord — skola, utbildning, undervisning, lärande — med etymologi-reveal.
 * Premiär: en keynote 2026-05-27 (Patrick Dempseys analys av rörelsen i ordens
 * rötter och hur vi har kollapsat dem till ett).
 *
 * Användning:
 * ```mdx
 * <DempseyFourWords
 *   kicker="Fyra ord vi använder som ett"
 *   title="Vid sina rötter implicerar **alla fyra rörelse**."
 *   bottomLine="Och vi har slagit ihop dem till ett."
 * >
 * - Lärande · *leornian (fornengelska)* · att följa ett spår, vandra en stig
 * - Undervisning · *paidagogos (grekiska)* · den som vandrar bredvid barnet
 * - Skola · *skholē (grekiska)* · fri tid, den kontemplativa vila som gör tänkande möjligt
 * - Utbildning · *educere (latin)* · att leda ut, dra fram det som redan finns inuti
 * </DempseyFourWords>
 * ```
 */
export function DempseyFourWords({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  background,
  accent2,
  children,
}: DempseyFourWordsProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

  // Parse title for bold spans
  const renderTitle = (raw: string): ReactNode => {
    const out: ReactNode[] = [];
    raw.split(/(\*\*[^*]+\*\*)/).forEach((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        out.push(
          <span
            key={i}
            style={{
              color: accent,
              textShadow: `0 0 28px ${withAlpha(accent, 0.4)}`,
            }}
          >
            {m[1]}
          </span>,
        );
      } else if (part) {
        out.push(<span key={i}>{part}</span>);
      }
    });
    return out;
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.6vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.4rem, 2.6vh, 2.2rem)",
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
          ) : <span />}
          {chapter ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </div>
          ) : null}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ maxWidth: "48em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 3.6vw, 3.2rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{renderTitle(title)}</EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.7rem 0 0 0",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* 2x2 grid of words */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            gap: "clamp(1rem, 1.8vw, 1.6rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {items.slice(0, 4).map((item, i) => {
            const wordDelay = 0.4 + i * 0.55;
            const chars = Array.from(item.word);
            return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + i * 0.18,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <GlassCard
                size="md"
                options={{
                  radius: "1.25rem",
                  padding: "clamp(1.4rem, 2.4vw, 2rem)",
                }}
                style={{ height: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    height: "100%",
                  }}
                >
                  {/* Calligraphy-reveal: varje bokstav glider in från blur,
                      som om någon skrev den. Italic + serif-känsla via
                      negativ letter-spacing och fontStyle: italic. */}
                  <div
                    aria-label={item.word}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.2rem, 3.6vw, 3.4rem)",
                      fontWeight: 400,
                      fontStyle: "italic",
                      letterSpacing: "-0.012em",
                      color: "var(--text)",
                      lineHeight: 1,
                      margin: 0,
                      display: "inline-flex",
                      flexWrap: "wrap",
                    }}
                  >
                    {chars.map((char, ci) => (
                      <motion.span
                        key={ci}
                        initial={{
                          opacity: 0,
                          filter: "blur(10px)",
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          filter: "blur(0px)",
                          y: 0,
                        }}
                        transition={{
                          duration: 0.85,
                          delay: wordDelay + ci * 0.09,
                          ease: [0.22, 0.61, 0.36, 1],
                        }}
                        style={{
                          display: "inline-block",
                          whiteSpace: "pre",
                          textShadow:
                            ci === chars.length - 1
                              ? `0 0 22px ${withAlpha("var(--accent)", 0.28)}`
                              : undefined,
                        }}
                      >
                        {char === " " ? " " : char}
                      </motion.span>
                    ))}
                  </div>
                  {item.etymology ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.78rem, 0.95vw, 1rem)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: accent,
                        fontStyle: "italic",
                        fontWeight: 500,
                        marginTop: "0.2rem",
                      }}
                    >
                      {item.etymology}
                    </div>
                  ) : null}
                  {item.meaning ? (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                        margin: "0.3rem 0 0 0",
                      }}
                    >
                      {item.meaning}
                    </p>
                  ) : null}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
        </div>

        {/* Bottom line — Dempseys tes */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.3 + Math.min(items.length, 4) * 0.18 + 0.2,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 1.5vw, 1.55rem)",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "46em",
              margin: "0 auto",
              lineHeight: 1.35,
              letterSpacing: "-0.015em",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine ?? ""}>{bottomLine}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
