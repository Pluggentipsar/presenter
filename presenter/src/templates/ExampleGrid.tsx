"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ExampleGridProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  tagline?: string;
  background?: string;
  accent?: string;
  /** Antal kolumner i griden. Default 3. */
  columns?: number | string;
  /**
   * Markdown-lista — varje rad blir ett kort med kort textinnehåll.
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/** True when a photo/image background with a dark scrim sits behind the content. */
function hasDarkImageBackdrop(bg: string | undefined): boolean {
  if (!bg) return false;
  return bg.startsWith("/") || bg.startsWith("http");
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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
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

function renderBoldInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Kompakt grid för många korta exempel — t.ex. "15 sätt att göra X".
 * Kort med frostat glas, staggered cascade-reveal, bg-bild bakom.
 */
export function ExampleGrid({
  kicker,
  title,
  subtitle,
  tagline,
  background,
  accent = "var(--accent)",
  columns = 3,
  children,
}: ExampleGridProps) {
  const items = parseItems(children);
  const cols = typeof columns === "string" ? parseInt(columns, 10) : columns;

  // När en fotobakgrund med mörk scrim ligger bakom innehållet ska text och kort
  // alltid vara ljusa. Annars följer de temat (mörkt på nattglas, mörkt på dagsljus).
  const onDark = hasDarkImageBackdrop(background);
  const textColor = onDark ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDark ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const cardBg = onDark ? "rgba(247,241,230,0.06)" : "var(--bg-surface)";
  const cardBorder = onDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)";
  const cardInset = onDark
    ? "inset 0 1px 0 rgba(255,255,255,0.05)"
    : "inset 0 1px 0 rgba(255,255,255,0.6)";
  const titleShadow = onDark ? "0 6px 30px rgba(0,0,0,0.4)" : "none";

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
          gap: "clamp(1rem, 2vh, 1.5rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5" style={{ flexShrink: 0, maxWidth: "46em" }}>
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
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: textColor,
                margin: 0,
                textShadow: titleShadow,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.1vw, 1.15rem)",
                color: mutedColor,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Kort-grid */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "clamp(0.5rem, 0.9vw, 0.85rem)",
            alignContent: "center",
          }}
        >
          {items.map((text, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const delay = 0.45 + (col + row) * 0.06;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.55,
                  delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  padding: "clamp(0.6rem, 0.9vw, 0.85rem) clamp(0.75rem, 1.1vw, 1.05rem)",
                  borderRadius: "0.55rem",
                  background: cardBg,
                  backdropFilter: "blur(14px) saturate(140%)",
                  WebkitBackdropFilter: "blur(14px) saturate(140%)",
                  border: cardBorder,
                  boxShadow: `0 6px 16px -6px rgba(0,0,0,0.35), ${cardInset}`,
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    color: accent,
                    fontWeight: 700,
                    marginTop: "0.15rem",
                    minWidth: "1.2rem",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.78rem, 0.88vw, 0.92rem)",
                    color: textColor,
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                >
                  {renderBoldInline(text, accent)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tagline */}
        {tagline ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.45 + items.length * 0.04,
            }}
            style={{
              marginTop: "auto",
              paddingLeft: "1rem",
              borderLeft: `3px solid ${accent}`,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
              color: accent,
              lineHeight: 1.4,
              maxWidth: "32em",
            }}
          >
            <EditableText path="tagline" value={tagline ?? ""}>{tagline}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
