"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  glassCardStyle,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface LiquidQuoteProps {
  kicker?: string;
  chapter?: string;
  /** Källan / attribution under citatet. */
  attribution?: string;
  /** Sekundär attribution-rad (typ år, plats). */
  source?: string;
  /** Bakgrundsbild att refraktera mot. */
  background?: string;
  /** Sekundär ambient-accent. */
  accent2?: string;
  /** Storlek på citattexten. Default md. */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Citatets text. **bold** ger accent-färg och glow. Använd som children
   * eller via `quote` prop.
   */
  quote?: string;
  children?: ReactNode;
}

const SIZE_MAP = {
  sm: "clamp(1.4rem, 2.2vw, 2rem)",
  md: "clamp(1.8rem, 3.2vw, 2.8rem)",
  lg: "clamp(2.4rem, 4.2vw, 3.8rem)",
  xl: "clamp(3rem, 5.5vw, 5rem)",
};

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
    if (t === "p") return inner + "\n";
    return inner;
  }
  return "";
}

function renderRich(raw: string, accent: string): ReactNode {
  const out: ReactNode[] = [];
  raw.split(/(\*\*[^*]+\*\*)/).forEach((part, i) => {
    const m = /^\*\*(.+)\*\*$/.exec(part);
    if (m) {
      out.push(
        <span
          key={i}
          style={{
            color: accent,
            textShadow: `0 0 28px ${withAlpha(accent, 0.45)}`,
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
}

export function LiquidQuote({
  kicker,
  chapter,
  attribution,
  source,
  background,
  accent2,
  size = "md",
  quote,
  children,
}: LiquidQuoteProps) {
  const accent = "var(--accent)";
  const raw = quote ?? (children ? extractText(children).trim() : "");

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
          padding: "clamp(2.5rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2.5rem, 4vw, 4rem)",
            right: "clamp(2.5rem, 4vw, 4rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            zIndex: 3,
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
              <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* Quote card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
            mass: 0.95,
          }}
          style={{
            ...glassCardStyle({
              radius: "1.75rem",
              blur: 30,
              padding: "clamp(2.5rem, 5vw, 4.5rem) clamp(2.5rem, 5vw, 5rem)",
            }),
            position: "relative",
            maxWidth: "min(70rem, 92%)",
          }}
        >
          <SpecularHighlight intensity={0.18} />

          {/* Decorative quote mark */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "clamp(0.5rem, 1vh, 1rem)",
              left: "clamp(1rem, 2vw, 2rem)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(5rem, 9vw, 8rem)",
              fontWeight: 600,
              lineHeight: 1,
              color: accent,
              opacity: 0.22,
              pointerEvents: "none",
            }}
          >
            "
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: SIZE_MAP[size],
              lineHeight: 1.22,
              letterSpacing: "-0.018em",
              color: "var(--text)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            <EditableText path={quote != null ? "quote" : "content"} value={raw} multiline block>
              {raw.split(/\n\n+/).map((para, pi) => (
                <p
                  key={pi}
                  style={{ margin: pi > 0 ? "0.8em 0 0 0" : 0 }}
                >
                  {renderRich(para, accent)}
                </p>
              ))}
            </EditableText>
          </motion.blockquote>

          {(attribution || source) ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                marginTop: "clamp(1.5rem, 3vh, 2.2rem)",
                paddingTop: "clamp(1rem, 2vh, 1.5rem)",
                borderTop: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.78rem, 0.95vw, 1rem)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {attribution ? (
                <div style={{ color: accent, fontWeight: 500 }}>
                  — <EditableText path="attribution" value={attribution}>{attribution}</EditableText>
                </div>
              ) : null}
              {source ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
                  <EditableText path="source" value={source}>{source}</EditableText>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
