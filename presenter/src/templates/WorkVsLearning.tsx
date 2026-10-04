"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  GlassCard,
} from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface WorkVsLearningProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Rubriken över vänsterkolumnen. Default "AI for Work". */
  leftHeader?: string;
  /** Rubriken över högerkolumnen. Default "AI for Learning". */
  rightHeader?: string;
  /** Underrubrik / etikett under leftHeader. */
  leftSubLabel?: string;
  /** Underrubrik / etikett under rightHeader. */
  rightSubLabel?: string;
  /** Källcitat nederst. */
  source?: string;
  /** "md" (default, byggd för 9-raders forskningstabell) eller "lg" —
   *  stora celler för deck med 3–5 rader som ska bära på projektor. */
  size?: "md" | "lg";
  /** Default true: efter reveal dimmas icke-★-rader till 32 % (highlight-
   *  fasen). Sätt false när ALLA rader är innehåll som ska förbli läsbara. */
  dimRows?: boolean;
  background?: string;
  accent2?: string;
  /**
   * Rader. Format: `- Dimension · Värde-Work · Värde-Learning`
   * Använd `★ Dimension` för att markera raden som central (typ failure mode).
   */
  children?: ReactNode;
}

interface Row {
  dimension: string;
  work: string;
  learning: string;
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

function parseRows(children: ReactNode): Row[] {
  const out: Row[] = [];
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
          const starred = text.startsWith("★");
          const clean = text.replace(/^★\s*/, "");
          const parts = clean.split(/\s*·\s*/);
          out.push({
            dimension: parts[0] ?? "",
            work: parts[1] ?? "",
            learning: parts[2] ?? "",
            starred,
          });
        }
      });
    }
  });
  return out;
}

/**
 * Khosravis 9-dimensions-tabell — AI for Work vs AI for Learning.
 * Premiär: en keynote 2026-05-27 (Khosravi et al., arXiv 2605.04816).
 *
 * Användning:
 * ```mdx
 * <WorkVsLearning
 *   kicker="Forskning · Khosravi et al. 2026"
 *   title="AI for **Work** vs AI for **Learning**"
 *   leftHeader="AI for Work"
 *   leftSubLabel="produktivitet"
 *   rightHeader="AI for Learning"
 *   rightSubLabel="kapacitet"
 *   source="arXiv 2605.04816 · Building AI Companions that Prioritise Learning over Performance"
 * >
 * - Syfte · Klara uppgifter snabbare/bättre · Bygga lärandets kapacitet över tid
 * - Vad AI gör · Utför kognitiv uppgift · Stöttar och utmanar
 * - Interaktion · Transaktionell, tillståndslös · Utvecklande, kumulativ
 * - Ansträngning · Minimera friktion · Bevara produktiv kamp
 * - Fel · Är ineffektivitet att eliminera · Är diagnostik och lärtillfälle
 * - Framgångsmått · Output-kvalitet · Retention, transfer, metakognition
 * - ★ Failure mode · Produktivitetsvinster maskerar atrofi · Provresultat upp men kunskap ner
 * - Designprincip · Minimera friktion, direkta svar · Bevara produktiv kamp; vägra svar
 * - Grunding · Augmentation, distribuerad kognition · Konstruktivism, self-regulated learning
 * </WorkVsLearning>
 * ```
 */
export function WorkVsLearning({
  kicker,
  chapter,
  title,
  subtitle,
  leftHeader = "AI for Work",
  rightHeader = "AI for Learning",
  leftSubLabel,
  rightSubLabel,
  source,
  size = "md",
  dimRows = true,
  background,
  accent2,
  children,
}: WorkVsLearningProps) {
  const rows = parseRows(children);
  const accent = "var(--accent)";
  const mutedColor = "var(--text-muted)";
  const S =
    size === "lg"
      ? {
          cell: "clamp(1.05rem, 1.45vw, 1.4rem)",
          dimension: "clamp(0.85rem, 1.05vw, 1.05rem)",
          colHeader: "clamp(1.2rem, 1.7vw, 1.7rem)",
          rowGap: "clamp(0.6rem, 1.2vh, 1.1rem)",
          cellLineHeight: 1.42,
        }
      : {
          cell: "clamp(0.85rem, 1.05vw, 1.05rem)",
          dimension: "clamp(0.72rem, 0.85vw, 0.88rem)",
          colHeader: "clamp(0.95rem, 1.25vw, 1.25rem)",
          rowGap: "clamp(0.3rem, 0.6vh, 0.6rem)",
          cellLineHeight: 1.4,
        };

  // Trigger highlight-phase efter att alla rader har faded in.
  // Då dimmer non-star-rader och en light-streak sveper över star-raden.
  const [highlightPhase, setHighlightPhase] = useState(false);
  useEffect(() => {
    if (!dimRows) return;
    const allRowsRevealed = 300 + rows.length * 60 + 450;
    const t = setTimeout(() => setHighlightPhase(true), allRowsRevealed + 350);
    return () => clearTimeout(t);
  }, [rows.length, dimRows]);
  const hasStarred = rows.some((r) => r.starred);

  // Render title with **bold** spans (accent)
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
              textShadow: `0 0 24px ${withAlpha(accent, 0.4)}`,
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
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(1.8rem, 3vw, 3rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2vh, 1.6rem)",
        }}
      >
        {/* Header row */}
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
                color: mutedColor,
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </div>
          ) : null}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
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
                fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
                color: mutedColor,
                lineHeight: 1.5,
                margin: "0.5rem 0 0 0",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: S.rowGap,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Column headers */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(7em, 1.1fr) 1.4fr 1.4fr",
              gap: "clamp(0.5rem, 1vw, 0.9rem)",
              alignItems: "end",
              paddingBottom: "0.6rem",
              borderBottom: `1px solid ${withAlpha("var(--accent)", 0.18)}`,
            }}
          >
            <div />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: S.colHeader,
                  fontWeight: 600,
                  letterSpacing: "-0.018em",
                  color: size === "lg" ? "var(--text)" : mutedColor,
                }}
              >
                <EditableText path="leftHeader" value={leftHeader}>{leftHeader}</EditableText>
              </div>
              {leftSubLabel ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: mutedColor,
                    opacity: 0.7,
                  }}
                >
                  <EditableText path="leftSubLabel" value={leftSubLabel}>{leftSubLabel}</EditableText>
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: S.colHeader,
                  fontWeight: 600,
                  letterSpacing: "-0.018em",
                  color: accent,
                  textShadow: `0 0 16px ${withAlpha("var(--accent)", 0.32)}`,
                }}
              >
                <EditableText path="rightHeader" value={rightHeader}>{rightHeader}</EditableText>
              </div>
              {rightSubLabel ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: accent,
                    opacity: 0.7,
                  }}
                >
                  <EditableText path="rightSubLabel" value={rightSubLabel}>{rightSubLabel}</EditableText>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity:
                  highlightPhase && hasStarred && !row.starred ? 0.32 : 1,
                x: 0,
              }}
              transition={{
                duration: row.starred ? 0.5 : 0.6,
                delay: 0.3 + i * 0.06,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "minmax(7em, 1.1fr) 1.4fr 1.4fr",
                gap: "clamp(0.5rem, 1vw, 0.9rem)",
                alignItems: "start",
                padding: row.starred
                  ? "clamp(0.5rem, 0.9vh, 0.8rem) clamp(0.4rem, 0.8vw, 0.7rem)"
                  : "clamp(0.35rem, 0.7vh, 0.55rem) clamp(0.4rem, 0.8vw, 0.7rem)",
                borderRadius: "0.6rem",
                background: row.starred
                  ? `linear-gradient(135deg, ${withAlpha(
                      "var(--accent)",
                      0.1,
                    )} 0%, ${withAlpha("var(--accent)", 0.02)} 100%)`
                  : "transparent",
                border: row.starred
                  ? `1px solid ${withAlpha(
                      "var(--accent)",
                      highlightPhase ? 0.55 : 0.3,
                    )}`
                  : "1px solid transparent",
                boxShadow: row.starred
                  ? highlightPhase
                    ? `inset 0 1px 0 ${withAlpha("var(--accent)", 0.35)}, 0 0 32px ${withAlpha("var(--accent)", 0.28)}`
                    : `inset 0 1px 0 ${withAlpha("var(--accent)", 0.18)}`
                  : undefined,
                overflow: row.starred ? "hidden" : "visible",
              }}
            >
              {/* Light-streak overlay för star-raden */}
              {row.starred && highlightPhase ? (
                <motion.div
                  aria-hidden
                  initial={{ x: "-110%" }}
                  animate={{ x: "210%" }}
                  transition={{
                    duration: 1.4,
                    ease: [0.4, 0, 0.2, 1],
                    repeat: Infinity,
                    repeatDelay: 2.6,
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: "55%",
                    background: `linear-gradient(105deg, transparent 0%, ${withAlpha(
                      "var(--accent)",
                      0,
                    )} 20%, ${withAlpha(
                      "var(--accent)",
                      0.32,
                    )} 50%, ${withAlpha("var(--accent)", 0)} 80%, transparent 100%)`,
                    pointerEvents: "none",
                    mixBlendMode: "screen",
                    zIndex: 0,
                  }}
                />
              ) : null}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: S.dimension,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: row.starred ? accent : mutedColor,
                  fontWeight: row.starred ? 600 : 400,
                  paddingTop: "0.15rem",
                }}
              >
                {row.starred ? "★ " : ""}{row.dimension}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: S.cell,
                  color: size === "lg" ? "var(--text)" : mutedColor,
                  lineHeight: S.cellLineHeight,
                  opacity: size === "lg" ? 0.92 : 0.85,
                }}
              >
                {row.work}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: S.cell,
                  color: "var(--text)",
                  lineHeight: S.cellLineHeight,
                  fontWeight: row.starred ? 500 : 400,
                  textShadow: row.starred
                    ? `0 0 14px ${withAlpha("var(--accent)", 0.18)}`
                    : undefined,
                }}
              >
                {row.learning}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Source */}
        {source ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.3 + rows.length * 0.06 + 0.2,
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: mutedColor,
              opacity: 0.7,
              textAlign: "right",
              borderTop: "1px solid var(--glass-border, rgba(255,255,255,0.06))",
              paddingTop: "0.6rem",
              marginTop: "0.2rem",
            }}
          >
            <EditableText path="source" value={source ?? ""}>{source}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
