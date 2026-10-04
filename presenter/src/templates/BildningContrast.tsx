"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BildningContrast — två vertikala spalter splittade med en glödande
 * mittlinje. Vänster = något AI:n levererar (information, fakta, output).
 * Höger = något läraren / människan står för (bildning, omdöme, mening).
 *
 * Båda spalterna har ett eyebrow, ett stort definitionsord, och en lista
 * av karakteristika. Stega framåt för att tända höger spalt efter att
 * vänster har landat — eller låt båda komma in i ordning automatiskt.
 *
 * MDX-format:
 * ```mdx
 * <BildningContrast
 *   chapter="§ Akt 4 · Vad vi ger"
 *   title="AI ger information. Vi ger bildning."
 *   leftLabel="AI:n"
 *   leftWord="Information"
 *   rightLabel="Du"
 *   rightWord="Bildning"
 * >
 * - Faktatätt · Sammanhang
 * - Hastighet · Mognad
 * - Output · Insikt
 * - Snabbt svar · Ett liv av frågor
 * </BildningContrast>
 * ```
 *
 * Per rad: `Vänster · Höger`. Renderas parallellt, en rad per spalt.
 */

interface BildningContrastProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Eyebrow ovanför vänster definitionsord. */
  leftLabel?: string;
  /** Stort definitionsord vänster. */
  leftWord?: string;
  /** Eyebrow ovanför höger definitionsord. */
  rightLabel?: string;
  /** Stort definitionsord höger. */
  rightWord?: string;
  /** Radstorlek: "md" (default) eller "lg" — lg för deck med få (3–4)
   *  rader där texten ska bära på projektor. */
  rowSize?: "md" | "lg";
  children?: ReactNode;
}

const ROW_SIZES = {
  md: {
    left: "clamp(1.05rem, 1.4vw, 1.35rem)",
    right: "clamp(1.1rem, 1.5vw, 1.5rem)",
    lineHeight: 1.35,
  },
  lg: {
    left: "clamp(1.4rem, 2vw, 1.95rem)",
    right: "clamp(1.5rem, 2.2vw, 2.15rem)",
    lineHeight: 1.28,
  },
} as const;

interface ContrastRow {
  left: string;
  right: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
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

function parseRows(children: ReactNode): ContrastRow[] {
  const out: ContrastRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const left = (parts[0] ?? "").trim();
    const right = parts.slice(1).join(" · ").trim();
    if (!left && !right) return;
    out.push({ left, right });
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

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
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

export function BildningContrast({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  leftLabel = "AI:n",
  leftWord = "Information",
  rightLabel = "Du",
  rightWord = "Bildning",
  rowSize = "md",
  children,
}: BildningContrastProps) {
  const rows = useMemo(() => parseRows(children), [children]);
  const rowStyle = ROW_SIZES[rowSize] ?? ROW_SIZES.md;
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // 0 = inget extra, 1 = vänster column färdig, 2 = höger börjar tonas in
  // Använder 2 steg + N rader för progressiv reveal
  const totalSteps = 2 + rows.length;
  const step = useSlideSteps(totalSteps);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.5vh, 2.2rem)",
          zIndex: 2,
        }}
      >
        {/* Topp */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                color: "var(--text)",
                marginTop: "0.5rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Två-spalt med mittlinje */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 2px 1fr",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          {/* VÄNSTER */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
              opacity: 0.7, // vänster är "den andra sidan", lite dimmare
              filter: "saturate(0.85)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.85, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {leftLabel}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.65 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(2.4rem, 4.4vw, 4rem)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "var(--text)",
                marginBottom: "clamp(0.6rem, 1vh, 0.9rem)",
              }}
            >
              {leftWord}
            </motion.div>

            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.95 }}
              style={{
                height: 1,
                background: "var(--text-muted)",
                opacity: 0.35,
                transformOrigin: "left center",
                marginBottom: "clamp(0.6rem, 1vh, 0.9rem)",
              }}
            />

            {/* Vänsterrader — synkat med högerrader så ett klick lyser
                upp ett par (vänster + höger) tillsammans. */}
            {rows.map((row, i) => {
              const lit = step >= 2 + i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: lit ? 1 : 0.28,
                    x: 0,
                  }}
                  transition={{ duration: 0.55, delay: 1.1 + i * 0.12 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: rowStyle.left,
                    color: lit ? "var(--text)" : "var(--text-muted)",
                    lineHeight: rowStyle.lineHeight,
                    transition: "color 0.5s",
                  }}
                >
                  {row.left}
                </motion.div>
              );
            })}
          </div>

          {/* MITTLINJE */}
          <div
            style={{
              position: "relative",
              width: "2px",
              minWidth: "2px",
              alignSelf: "stretch",
            }}
          >
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, transparent 0%, ${accent} 50%, transparent 100%)`,
                boxShadow: `0 0 22px ${withAlpha(accent, 0.6)}`,
                transformOrigin: "center",
              }}
            />
          </div>

          {/* HÖGER */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {rightLabel}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.0, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(2.4rem, 4.4vw, 4rem)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: accent,
                marginBottom: "clamp(0.6rem, 1vh, 0.9rem)",
                textShadow: `0 0 36px ${withAlpha(accent, 0.4)}`,
              }}
            >
              {rightWord}
            </motion.div>

            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 1.55 }}
              style={{
                height: 1,
                background: `${withAlpha(accent, 0.33)}`,
                transformOrigin: "left center",
                marginBottom: "clamp(0.6rem, 1vh, 0.9rem)",
              }}
            />

            {/* Högerrader */}
            {rows.map((row, i) => {
              const lit = step >= 2 + i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{
                    opacity: lit ? 1 : 0.25,
                    x: 0,
                  }}
                  transition={{ duration: 0.6, delay: 1.7 + i * 0.18 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: rowStyle.right,
                    color: lit ? "var(--text)" : "var(--text-muted)",
                    lineHeight: rowStyle.lineHeight,
                    transition: "color 0.5s",
                  }}
                >
                  {renderInline(row.right, accent)}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
