"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Idea {
  title: string;
  description: string;
  primary: boolean;
}

interface IdeaGridProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bottomLine?: string;
  /** Antal kolumner. Default = auto baserat på items.length. */
  columns?: number | string;
  /**
   * Begränsa hela contentens bredd. Resten av sliden är fri för t.ex.
   * en FloatingVideo eller FloatingImage till höger. Ex: "62%", "640px".
   */
  contentMaxWidth?: string;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
  /**
   * Markdown-lista i children:
   *   - Titel · Beskrivning
   *   - ★ Climax-titel · Beskrivning  (★ markerar extra emfas)
   */
  children?: ReactNode;
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

function parseIdeas(children: ReactNode): Idea[] {
  const out: Idea[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    let primary = false;
    let cleaned = raw;
    if (cleaned.startsWith("★")) {
      primary = true;
      cleaned = cleaned.replace(/^★\s*/, "").trim();
    }
    const parts = cleaned.split(/\s*·\s*/);
    const title = (parts[0] ?? "").trim();
    const description = parts.slice(1).join(" · ").trim();
    if (!title) return;
    out.push({ title, description, primary });
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

function autoColumns(n: number): number {
  if (n <= 3) return n;
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 9) return 3;
  return 4;
}

/**
 * Memphis-trogen idé-grid som revealas stegvis (en idé per space-tryck).
 * Varje kort har stort nummer + titel + beskrivning. ★-prefix i listan
 * markerar climax-item som får accent-färgad ram.
 *
 * MDX-format:
 * ```mdx
 * <IdeaGrid
 *   eyebrow="§ E · Vad mer?"
 *   title="Vad mer kan AI hjälpa er LÄRA er?"
 *   subtitle="Ropa ut! Jag fyller i."
 * >
 * - Förklara svåra ord · När du fastnat på något i en text.
 * - ★ Lära dig något du verkligen vill veta · Det är där AI är som bäst.
 * </IdeaGrid>
 * ```
 */
export function IdeaGrid({
  eyebrow,
  title,
  subtitle,
  bottomLine,
  columns,
  contentMaxWidth,
  background,
  overlay,
  overlayMode = "light",
  children,
}: IdeaGridProps) {
  const reduce = useReducedMotion();
  const ideas = useMemo(() => parseIdeas(children), [children]);
  const cols =
    columns !== undefined
      ? typeof columns === "string"
        ? parseInt(columns, 10) || autoColumns(ideas.length)
        : columns
      : autoColumns(ideas.length);

  const totalSteps = ideas.length + (bottomLine ? 1 : 0);
  const step = useSlideSteps(Math.max(totalSteps, 1));
  const showBottom = bottomLine ? step >= ideas.length : false;

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  // Alternerande offset-skuggor och tilts för memphis-känsla
  const SHADOWS = ["--card-shadow", "--card-shadow-alt"];
  const TILTS = [-1.4, 1.0, -0.8, 1.3, -1.1, 0.9, -1.5, 1.2, -0.7];

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="grid" />

      <div
        className="relative z-10 flex h-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12"
        style={{ width: contentMaxWidth ?? "100%", maxWidth: contentMaxWidth }}
      >
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {title ? (
          <motion.h1
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            className="leading-[0.92] tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(2.4rem, 5.4vw, 5.4rem)",
              color: "var(--text)",
              textShadow: "var(--title-shadow, none)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </motion.h1>
        ) : null}

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.45vw, 1.45rem)",
              color: "var(--text-muted)",
              fontWeight: 500,
              marginTop: "0.6rem",
              maxWidth: "44em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </motion.p>
        ) : null}

        <div
          className="grid flex-1 mt-8"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: "clamp(0.8rem, 1.2vw, 1.2rem)",
            alignContent: "center",
          }}
        >
          {ideas.map((idea, i) => {
            const revealed = i < step;
            const tilt = reduce ? 0 : TILTS[i % TILTS.length];
            const shadowVar = SHADOWS[i % SHADOWS.length];
            const numberColor =
              i % 2 === 0 ? "var(--accent)" : "var(--ornament-color)";

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: revealed ? 1 : 0,
                  y: revealed ? 0 : 14,
                  scale: revealed ? 1 : 0.92,
                  rotate: revealed ? tilt : tilt - 4,
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  background: idea.primary
                    ? "var(--accent)"
                    : "var(--bg-surface)",
                  color: idea.primary ? "var(--bg-surface)" : "var(--text)",
                  border: "var(--card-border, 3px solid #1A1A1A)",
                  borderRadius: "var(--radius)",
                  boxShadow: `var(${shadowVar}, 0 6px 18px rgba(0,0,0,0.1))`,
                  padding: "clamp(0.9rem, 1.4vw, 1.4rem) clamp(1.1rem, 1.6vw, 1.6rem)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "clamp(0.7rem, 1.1vw, 1.1rem)",
                }}
              >
                {/* Stort nummer */}
                <span
                  className="select-none leading-none flex items-center justify-center"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)" as unknown as number,
                    fontSize: "clamp(2rem, 3.2vw, 3.2rem)",
                    color: idea.primary ? "var(--bg-surface)" : numberColor,
                    width: "clamp(2.2rem, 3.4vw, 3.4rem)",
                    flexShrink: 0,
                    textShadow: idea.primary
                      ? "none"
                      : "var(--title-shadow, none)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="flex flex-col" style={{ gap: "0.2rem", flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--heading-weight)" as unknown as number,
                      fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
                      lineHeight: 1.05,
                    }}
                  >
                    {idea.title}
                  </div>
                  {idea.description ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.8rem, 1vw, 1rem)",
                        color: idea.primary
                          ? "rgba(244,236,216,0.92)"
                          : "var(--text-muted)",
                        fontWeight: 500,
                        lineHeight: 1.3,
                      }}
                    >
                      {idea.description}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: showBottom ? 1 : 0,
              y: showBottom ? 0 : 14,
              scale: showBottom ? 1 : 0.94,
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-8 py-3 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.2rem, 2.0vw, 2.0rem)",
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default IdeaGrid;
