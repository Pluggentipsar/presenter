"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface MetricGridProps {
  /** Rubrik ovanför rutnätet */
  title?: string;
  /** Liten tag ovanför titeln (UPPERCASE) */
  tag?: string;
  /** Antal kolumner (default auto: 2 om ≤4 items, 3 om ≤6, 4 om fler) */
  columns?: number | string;
  /** "card" (default, mörkare ram) | "minimal" (bara typografi) | "dashboard" (med ikoner) */
  variant?: "card" | "minimal" | "dashboard";
  /** Stagger-fördröjning mellan items (ms, default 80) */
  stagger?: number | string;
  titleSize?: Size;
  /**
   * Items i markdown-lista, format:
   * - **Etikett** · värde · sub-text
   *   eller
   * - emoji **Etikett** · värde · sub-text
   *   eller
   * - **Etikett** · värde
   */
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3vw, 2.25rem)",
  md: "clamp(2rem, 4vw, 3rem)",
  lg: "clamp(2.75rem, 5vw, 4.25rem)",
  xl: "clamp(3.5rem, 6.5vw, 5.5rem)",
};

interface MetricItem {
  emoji?: string;
  label: string;
  value?: string;
  sub?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseLi(li: ReactElement<{ children?: ReactNode }>): MetricItem {
  const raw = extractText(li.props.children).trim();
  // Plocka ev. emoji från början (ett enskilt non-word-tecken eller emoji-block)
  const emojiMatch = raw.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]\s+)/u);
  const rest = emojiMatch ? raw.slice(emojiMatch[0].length) : raw;
  const emoji = emojiMatch ? emojiMatch[1].trim() : undefined;

  const parts = rest.split("·").map((p) => p.trim());
  // Strippa **fet** runt label
  const label = parts[0]?.replace(/^\*\*(.*)\*\*$/, "$1") ?? "";
  const value = parts[1];
  const sub = parts.slice(2).join(" · ");
  return { emoji, label, value, sub: sub || undefined };
}

function parseChildren(children: ReactNode): MetricItem[] {
  const items: MetricItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          items.push(parseLi(li as ReactElement<{ children?: ReactNode }>));
        }
      });
    } else if (el.type === "li") {
      items.push(parseLi(el));
    }
  });
  return items;
}

/**
 * MetricGrid — N items i ett rutnät med stagger-reveal. Varje item visar
 * label + (optional) värde + (optional) sub-text + (optional) emoji.
 *
 * Tre varianter:
 * - "card" (default): mörkare cards med subtle border
 * - "minimal": bara typografi, lågmält
 * - "dashboard": större cards med hover-glow, ger dashboard-känsla
 *
 * Format i children:
 * - **Tillgänglighet 24/7** · Dygnet runt · Sänker tröskeln för att söka hjälp
 * - 📊 **Avlastning** · 25-30% · Mejl till växeln som kan automatiseras
 */
export function MetricGrid({
  title,
  tag,
  columns,
  variant = "card",
  stagger = 80,
  titleSize = "md",
  children,
}: MetricGridProps) {
  const items = parseChildren(children);
  const colCount =
    typeof columns === "string"
      ? parseInt(columns, 10)
      : columns ?? (items.length <= 4 ? 2 : items.length <= 6 ? 3 : 4);
  const staggerNum =
    typeof stagger === "string" ? parseInt(stagger, 10) : stagger;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {(tag || title) && (
          <div className="flex flex-col gap-3">
            {tag && (
              <motion.span
                className="text-xs uppercase tracking-[0.35em]"
                style={{ color: "var(--accent)" }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
              </motion.span>
            )}
            {title && (
              <motion.h2
                className="leading-[1.05]"
                style={{
                  fontSize: TITLE_SIZES[titleSize],
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                  color: "var(--text)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <EditableText
                  path="title"
                  value={title ?? ""}
                  sizeControls={[
                    { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
                  ]}
                >{title}</EditableText>
              </motion.h2>
            )}
          </div>
        )}

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.25 + (i * staggerNum) / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col gap-3 p-6"
              style={
                variant === "minimal"
                  ? {
                      borderTop: "2px solid color-mix(in srgb, var(--accent) 60%, transparent)",
                      paddingTop: "1.25rem",
                    }
                  : variant === "dashboard"
                    ? {
                        borderRadius: "var(--radius)",
                        border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
                        background:
                          "linear-gradient(160deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--bg-surface) 60%, transparent))",
                        backdropFilter: "blur(6px)",
                        boxShadow:
                          "0 1px 0 color-mix(in srgb, var(--accent) 18%, transparent) inset, 0 30px 60px -30px color-mix(in srgb, var(--accent) 30%, transparent)",
                      }
                    : {
                        borderRadius: "var(--radius)",
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: "var(--bg-surface)",
                      }
              }
            >
              {item.emoji && (
                <div
                  className="text-3xl leading-none"
                  style={{ filter: "saturate(1.1)" }}
                >
                  {item.emoji}
                </div>
              )}
              {item.value && (
                <div
                  className="leading-none"
                  style={{
                    fontSize: variant === "dashboard" ? "clamp(2rem, 3.5vw, 3rem)" : "clamp(1.75rem, 3vw, 2.5rem)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)",
                    letterSpacing: "-0.02em",
                    color: "var(--accent)",
                  }}
                >
                  {item.value}
                </div>
              )}
              <div
                className="leading-snug"
                style={{
                  fontSize: variant === "dashboard"
                    ? "clamp(1rem, 1.4vw, 1.25rem)"
                    : "clamp(1.125rem, 1.6vw, 1.5rem)",
                  color: "var(--text)",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
              {item.sub && (
                <div
                  className="leading-snug text-text-muted"
                  style={{ fontSize: "clamp(0.85rem, 1.1vw, 1rem)" }}
                >
                  {item.sub}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
