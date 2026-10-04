"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RapidFireIdeas — staged reveal av en bunt korta idéer/exempel som
 * byggs upp till ett "wall of ideas". Varje klick lägger till nästa kort
 * med subtil rotation + scale-in. Sista kortet med ★-prefix får extra
 * emfas (accent-glow + större) som en climax/brygga.
 *
 * Tänkt för "rapid fire"-pedagogik där läraren snabbt nämner många
 * konkreta tips utan att djupdyka i något enskilt.
 *
 * MDX-format:
 * ```mdx
 * <RapidFireIdeas
 *   chapter="§ Konkret · Vad kan vi göra"
 *   title="Vad kan vi göra då?"
 *   subtitle="Stega genom — bygg upp en idé i taget."
 *   accent= "var(--accent)"
 * >
 * - Prebunking · Förekomma istället för att förekommas.
 * - Leta hallucinationer · I alla ämnen.
 * - ★ Ge dem hopp · Det är vårt mandat.
 * </RapidFireIdeas>
 * ```
 *
 * Per rad: `Rubrik · Beskrivning`. Prefix `★ ` markerar climax-item.
 */

interface RapidFireIdeasProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Antal kolumner. Default = auto baserat på items.length. */
  columns?: number | string;
  children?: ReactNode;
}

interface Idea {
  title: string;
  description: string;
  primary: boolean;
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
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

/** Auto-välj antal kolumner baserat på items.length. */
function autoColumns(n: number): number {
  if (n <= 4) return n;
  if (n <= 6) return 3;
  if (n <= 9) return 3;
  if (n <= 12) return 4;
  return 4;
}

export function RapidFireIdeas({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  columns,
  children,
}: RapidFireIdeasProps) {
  const ideas = useMemo(() => parseIdeas(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(Math.max(ideas.length, 1));
  const cols =
    columns !== undefined
      ? typeof columns === "string"
        ? parseInt(columns, 10) || autoColumns(ideas.length)
        : columns
      : autoColumns(ideas.length);

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
          padding: "clamp(2.2rem, 4vw, 4rem)",
          gap: "clamp(1rem, 2vh, 1.6rem)",
          zIndex: 2,
        }}
      >
        {/* Title + subtitle */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.9rem, 3.2vw, 2.9rem)",
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
                fontSize: "clamp(0.9rem, 1.2vw, 1.2rem)",
                color: "var(--text)",
                marginTop: "0.4rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Idea-grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "clamp(0.6rem, 1.1vw, 1rem)",
            minHeight: 0,
            alignContent: "start",
          }}
        >
          {ideas.map((idea, i) => {
            const visible = i <= step;
            const isCurrent = i === step;
            // Subtil pseudo-random rotation & offset för "brainstorm"-känsla
            const rot = ((i * 47) % 5) - 2; // -2 till +2 grader
            const isPrimary = idea.primary;
            return (
              <motion.div
                key={i}
                data-card={isPrimary ? "" : "flat"}
                initial={{ opacity: 0, scale: 0.85, rotate: 0, y: 14 }}
                animate={{
                  opacity: visible ? 1 : 0,
                  scale: visible ? 1 : 0.85,
                  rotate: visible ? rot : 0,
                  y: visible ? 0 : 14,
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1.05, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.25rem, 0.5vh, 0.4rem)",
                  background: isPrimary
                    ? `linear-gradient(135deg, ${withAlpha(accent, 0.15)} 0%, ${withAlpha(accent, 0.08)} 100%)`
                    : "linear-gradient(180deg, rgba(28, 24, 18, 0.78) 0%, rgba(15, 13, 10, 0.85) 100%)",
                  border: isPrimary
                    ? `1.5px solid ${withAlpha(accent, 0.67)}`
                    : "1px solid rgba(247,241,230,0.10)",
                  borderRadius: "0.5rem",
                  padding:
                    "clamp(0.7rem, 1.2vw, 1.1rem) clamp(0.85rem, 1.4vw, 1.3rem)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: isPrimary
                    ? `0 24px 50px -16px ${withAlpha(accent, 0.53)}, inset 0 1px 0 ${withAlpha(accent, 0.4)}`
                    : isCurrent
                    ? `0 16px 36px -16px ${withAlpha(accent, 0.33)}, inset 0 1px 0 ${withAlpha(accent, 0.2)}`
                    : "0 12px 28px -14px rgba(0,0,0,0.5)",
                  position: "relative",
                  overflow: "hidden",
                  // Primary-kort lite större tack vare grid-cell-span om sista
                  gridColumn: isPrimary && i === ideas.length - 1
                    ? `span ${Math.min(cols, 2)}`
                    : undefined,
                }}
              >
                {/* Primary glow */}
                {isPrimary ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `radial-gradient(ellipse at top, ${withAlpha(accent, 0.2)} 0%, transparent 65%)`,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}

                {/* Nummer + ev star */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
                    letterSpacing: "0.18em",
                    color: isPrimary ? accent : `${withAlpha(accent, 0.67)}`,
                    fontWeight: 700,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {isPrimary ? (
                    <span style={{ fontSize: "1.3em", lineHeight: 1 }}>★</span>
                  ) : null}
                </div>

                {/* Rubrik */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: isPrimary ? 800 : 700,
                    fontSize: isPrimary
                      ? "clamp(1.2rem, 1.7vw, 1.7rem)"
                      : "clamp(0.95rem, 1.3vw, 1.3rem)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                    position: "relative",
                    textShadow: isPrimary
                      ? `0 0 24px ${withAlpha(accent, 0.4)}`
                      : "none",
                  }}
                >
                  {idea.title}
                </div>

                {/* Beskrivning */}
                {idea.description ? (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: isPrimary
                        ? "clamp(0.85rem, 1.1vw, 1.1rem)"
                        : "clamp(0.78rem, 0.95vw, 0.95rem)",
                      lineHeight: 1.4,
                      color: "var(--text-muted)",
                      position: "relative",
                    }}
                  >
                    {renderInline(idea.description, accent)}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Stega-indikator */}
        {ideas.length > 1 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{
              flexShrink: 0,
              alignSelf: "center",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: `${withAlpha(accent, 0.67)}`,
            }}
          >
            <span>← →</span>
            <span style={{ color: "var(--text-muted)" }}>
              {String(step + 1).padStart(2, "0")} /{" "}
              {String(ideas.length).padStart(2, "0")}
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
