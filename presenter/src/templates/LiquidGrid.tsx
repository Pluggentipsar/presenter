"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  GlassCard,
} from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface LiquidGridProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Linje längst nere. */
  bottomLine?: string;
  /** Antal kolumner. Default 3. */
  columns?: number;
  /** Bakgrundsbild. */
  background?: string;
  /** Sekundär ambient-accent. */
  accent2?: string;
  /**
   * Markdown-lista. Format: `- Titel · Beskrivning`
   * Använd `★ Titel` för att markera ett item som central (får accent-border + glow).
   */
  children?: ReactNode;
}

interface GridItem {
  title: string;
  description: string;
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

function parseItems(children: ReactNode): GridItem[] {
  const out: GridItem[] = [];
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
            title: parts[0] ?? "",
            description: parts.slice(1).join(" · "),
            starred,
          });
        }
      });
    }
  });
  return out;
}

export function LiquidGrid({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  columns = 3,
  background,
  accent2,
  children,
}: LiquidGridProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

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
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
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
              {kicker}
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
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Title-block */}
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
              fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.05rem, 1.3vw, 1.3rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.8rem 0 0 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: "clamp(1.2rem, 2vw, 1.8rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 28,
                delay: 0.25 + i * 0.1,
                mass: 0.85,
              }}
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <GlassCard
                size="md"
                options={
                  item.starred
                    ? { radius: "1.25rem" }
                    : { radius: "1rem" }
                }
                style={
                  item.starred
                    ? {
                        border: `2px solid ${accent}`,
                        background: `linear-gradient(135deg, ${withAlpha("var(--accent)", 0.18)} 0%, ${withAlpha("var(--accent)", 0.05)} 100%)`,
                        boxShadow: `0 16px 48px -12px var(--accent-glow), 0 6px 16px rgba(0,0,0,0.35), inset 0 1px 0 ${withAlpha("var(--accent)", 0.4)}`,
                        height: "100%",
                      }
                    : { height: "100%" }
                }
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    height: "100%",
                  }}
                >
                  {item.starred ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: accent,
                        fontWeight: 600,
                        marginBottom: "0.3rem",
                      }}
                    >
                      ★ Central
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.2rem, 1.65vw, 1.7rem)",
                      fontWeight: 500,
                      letterSpacing: "-0.018em",
                      color: item.starred ? accent : "var(--text)",
                      lineHeight: 1.2,
                      textShadow: item.starred
                        ? `0 0 22px ${withAlpha("var(--accent)", 0.4)}`
                        : undefined,
                    }}
                  >
                    {item.title}
                  </div>
                  {item.description ? (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Bottom line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.4 + items.length * 0.1,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.45vw, 1.5rem)",
              color: "var(--text)",
              opacity: 0.85,
              textAlign: "center",
              maxWidth: "44em",
              margin: "0 auto",
              lineHeight: 1.4,
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
