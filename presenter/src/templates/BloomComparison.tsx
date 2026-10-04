"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface BloomLevel {
  verb: string;
  leftText: string;
  rightText: string;
  color: string;
}

interface BloomComparisonProps {
  kicker?: string;
  title?: string;
  leftTitle?: string;
  rightTitle?: string;
  leftBadge?: string;
  rightBadge?: string;
  background?: string;
  accent?: string;
  /**
   * Markdown-lista — varje rad är en taxonomi-nivå:
   *   - **Verb** · Brain-rot-text · Förstärkt-text · #färg
   * Ordningen är top-down i pyramiden (SKAPA först, MINNAS sist).
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.7), rgba(10,9,8,0.82)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * True när bakgrunden är ett foto med mörk scrim — då måste header-texten
 * vara fast ljus på BÅDA teman (annars blir var(--text) mörk mot mörk scrim).
 */
function isDarkScrimBg(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
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

function parseLevels(children: ReactNode): BloomLevel[] {
  const out: BloomLevel[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 3) return;
    const verbRaw = parts[0].trim();
    const verbMatch = verbRaw.match(/^\*\*(.+?)\*\*$/);
    const verb = verbMatch ? verbMatch[1] : verbRaw;
    out.push({
      verb,
      leftText: parts[1].trim(),
      rightText: parts[2].trim(),
      color: (parts[3] || "#999").trim(),
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

function PyramidLevel({
  level,
  i,
  total,
  variant,
  delay,
}: {
  level: BloomLevel;
  i: number;
  total: number;
  variant: "brainrot" | "forstärkt";
  delay: number;
}) {
  const widthPct = 55 + (i / (total - 1)) * 45; // 55% top → 100% bottom
  const isBrainRot = variant === "brainrot";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: `${widthPct}%`,
        alignSelf: "center",
        marginBottom: "0.35rem",
        filter: isBrainRot ? "saturate(0.55) brightness(0.85)" : "saturate(1.1)",
      }}
    >
      <div
        style={{
          position: "relative",
          background: level.color,
          padding: "0.75rem 1.1rem",
          clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)",
          display: "flex",
          alignItems: "center",
          gap: "0.9rem",
          minHeight: "3.8rem",
          boxShadow: isBrainRot
            ? "none"
            : `0 8px 24px -10px ${level.color}AA, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        {/* Verb */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(0.9rem, 1.15vw, 1.25rem)",
            color: "#1a1612",
            letterSpacing: "0.02em",
            flexShrink: 0,
            textTransform: "uppercase",
            position: "relative",
            minWidth: "6rem",
          }}
        >
          {level.verb}
          {isBrainRot ? (
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: delay + 0.4, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
              style={{
                position: "absolute",
                left: "-0.2em",
                right: "-0.2em",
                top: "50%",
                height: "2.5px",
                background: "#B9002E",
                transform: "translateY(-50%) rotate(-5deg)",
                transformOrigin: "left",
                pointerEvents: "none",
                boxShadow: "0 0 6px rgba(185,0,46,0.6)",
              }}
            />
          ) : null}
        </div>

        {/* Text */}
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.68rem, 0.82vw, 0.88rem)",
            color: "#1a1612",
            lineHeight: 1.35,
            fontWeight: 500,
          }}
        >
          {isBrainRot ? level.leftText : level.rightText}
        </div>
      </div>
    </motion.div>
  );
}

export function BloomComparison({
  kicker,
  title,
  leftTitle = "Blooms taxonomi över AI brain rot",
  rightTitle = "Blooms taxonomi för förstärkt lärande",
  leftBadge = "UTAN MEDVETENHET",
  rightBadge = "MED MEDVETENHET",
  background,
  accent = "var(--accent)",
  children,
}: BloomComparisonProps) {
  const levels = parseLevels(children);
  const onDarkScrim = isDarkScrimBg(background);
  // Header-text: fast ljus mot foto-scrim, annars temats text-färg (mörk på ljust tema).
  const headingColor = onDarkScrim ? "rgba(245,246,250,0.92)" : "var(--text)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 3.5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.75rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: headingColor,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
        </div>

        {/* Två pyramider */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "clamp(1rem, 2vw, 2rem)",
            alignItems: "center",
            minHeight: 0,
          }}
        >
          {/* Vänster pyramid — brain rot */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#B9002E",
                  fontWeight: 700,
                  padding: "0.25rem 0.7rem",
                  border: "1px solid #B9002E",
                  borderRadius: "0.3rem",
                  background: "rgba(185,0,46,0.15)",
                }}
              >
                {leftBadge}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1rem, 1.3vw, 1.3rem)",
                  color: headingColor,
                  textAlign: "center",
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  maxWidth: "18em",
                }}
              >
                <EditableText path="leftTitle" value={leftTitle ?? ""}>{leftTitle}</EditableText>
              </div>
            </motion.div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              {levels.map((level, i) => (
                <PyramidLevel
                  key={`L-${i}`}
                  level={level}
                  i={i}
                  total={levels.length}
                  variant="brainrot"
                  delay={0.6 + i * 0.08}
                />
              ))}
            </div>
          </div>

          {/* Glödande vertikal divider */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "1px",
              alignSelf: "stretch",
              minHeight: "70%",
              background: `linear-gradient(to bottom, transparent 0%, ${withAlpha(accent, 0.5)} 50%, transparent 100%)`,
              boxShadow: `0 0 12px ${withAlpha(accent, 0.25)}`,
              transformOrigin: "center",
            }}
            aria-hidden
          />

          {/* Höger pyramid — förstärkt lärande */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 700,
                  padding: "0.25rem 0.7rem",
                  border: `1px solid ${accent}`,
                  borderRadius: "0.3rem",
                  background: `${withAlpha(accent, 0.1)}`,
                }}
              >
                {rightBadge}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1rem, 1.3vw, 1.3rem)",
                  color: headingColor,
                  textAlign: "center",
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  maxWidth: "18em",
                }}
              >
                <EditableText path="rightTitle" value={rightTitle ?? ""}>{rightTitle}</EditableText>
              </div>
            </motion.div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              {levels.map((level, i) => (
                <PyramidLevel
                  key={`R-${i}`}
                  level={level}
                  i={i}
                  total={levels.length}
                  variant="forstärkt"
                  delay={0.9 + i * 0.08}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
