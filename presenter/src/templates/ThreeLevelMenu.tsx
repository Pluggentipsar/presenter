"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ThreeLevelMenuProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista. Format per rad:
   * `- LEVEL · Level rubrik · Övningstitel; Övningstitel; Övningstitel`
   *
   * LEVEL = 1 | 2 | 3 (eller fler, men tre är optimum)
   *
   * Exempel:
   * - 1 · Kom igång · Förbättra mejlet; Sammanfatta dokument; Gör en checklista
   * - 2 · Frigör tankekraft · Strukturera anteckningar; Förbered ett möte; Granska text
   * - 3 · Delegera process · Bygg informationspaket; Risk- och konsekvensanalys; Designa en agent
   */
  children?: ReactNode;
}

interface LevelData {
  level: number;
  headline: string;
  items: string[];
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    const b = Math.min(1, a + 0.15);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
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
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseLevels(children: ReactNode): LevelData[] {
  const levels: LevelData[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (parts.length < 3) return;
    const level = parseInt(parts[0], 10);
    if (Number.isNaN(level)) return;
    const headline = parts[1];
    const items = parts[2]
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    levels.push({ level, headline, items });
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
  return levels;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
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

/**
 * ThreeLevelMenu — workshop-meny i tre kolumner med stigande djup.
 * Nivå 1 = enkel start, Nivå 2 = frigör tankekraft, Nivå 3 = delegera process.
 * Varje kolumn växer i visuell intensitet från vänster till höger; intensiteten
 * matchar den kognitiva höjden i övningarna.
 *
 * Step-baserad reveal via space.
 */
export function ThreeLevelMenu({
  chapter,
  title,
  subtitle,
  background,
  accent = "#B4763A",
  overlay,
  children,
}: ThreeLevelMenuProps) {
  const levels = parseLevels(children);
  const activeStep = useSlideSteps(levels.length + 1);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.55) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.5rem", maxWidth: "44em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.85rem, 4.2vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "32em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Three columns — increasing intensity */}
        <div
          className="flex flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${levels.length}, 1fr)`,
            gap: "clamp(1rem, 1.8vw, 2rem)",
            alignItems: "stretch",
          }}
        >
          {levels.map((lvl, i) => {
            const intensity = (i + 1) / levels.length; // 0..1
            const visible = activeStep > i;
            const headerOpacity = 0.18 + intensity * 0.22;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={
                  visible
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0.1, y: 30, filter: "blur(8px)" }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: `1px solid ${accent}${Math.round((0.2 + intensity * 0.4) * 255)
                    .toString(16)
                    .padStart(2, "0")}`,
                  background: `linear-gradient(180deg, ${accent}${Math.round(headerOpacity * 80)
                    .toString(16)
                    .padStart(2, "0")} 0%, rgba(10,9,8,0.4) 60%)`,
                  boxShadow: visible
                    ? `0 0 60px ${accent}${Math.round(intensity * 40)
                        .toString(16)
                        .padStart(2, "0")}, inset 0 0 0 1px ${withAlpha(accent, 0.19)}`
                    : "none",
                }}
              >
                {/* Header band */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${accent}${Math.round(headerOpacity * 200)
                      .toString(16)
                      .padStart(2, "0")} 0%, ${withAlpha(accent, 0.06)} 100%)`,
                    borderBottom: `1px solid ${withAlpha(accent, 0.25)}`,
                    padding: "clamp(1.1rem, 2vw, 1.6rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {/* Level number badge */}
                    <div
                      style={{
                        width: "clamp(2rem, 3vw, 2.5rem)",
                        height: "clamp(2rem, 3vw, 2.5rem)",
                        borderRadius: "0.4rem",
                        background: accent,
                        color: "#0a0908",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
                        flexShrink: 0,
                        boxShadow: `0 0 20px ${withAlpha(accent, 0.31)}`,
                      }}
                    >
                      {lvl.level}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Nivå {lvl.level}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.2rem, 1.8vw, 1.7rem)",
                      color: "var(--text)",
                      lineHeight: 1.15,
                    }}
                  >
                    <EditableText path={`levels[${i}].headline`} value={lvl.headline}>
                      {renderInline(lvl.headline, accent)}
                    </EditableText>
                  </div>
                  {/* Depth indicator bars */}
                  <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                    {Array.from({ length: levels.length }).map((_, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1,
                          height: "3px",
                          borderRadius: "2px",
                          background: j <= i ? accent : `${withAlpha(accent, 0.15)}`,
                          opacity: j <= i ? 0.7 + (intensity - 0.3) * 0.3 : 1,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Items list */}
                <div
                  style={{
                    flex: 1,
                    padding: "clamp(1rem, 2vw, 1.6rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(0.6rem, 1.2vh, 1rem)",
                  }}
                >
                  {lvl.items.map((item, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, x: -10 }}
                      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                      transition={{ duration: 0.4, delay: 0.2 + j * 0.08 }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.7rem",
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1rem, 1.3vw, 1.25rem)",
                        color: "var(--text)",
                        lineHeight: 1.35,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.7rem, 0.9vw, 0.85rem)",
                          color: accent,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          marginTop: "0.2em",
                          opacity: 0.7,
                          minWidth: "1.5em",
                        }}
                      >
                        {String(j + 1).padStart(2, "0")}
                      </span>
                      <span style={{ flex: 1 }}>
                        <EditableText path={`levels[${i}].items[${j}]`} value={item}>
                          {renderInline(item, accent)}
                        </EditableText>
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
