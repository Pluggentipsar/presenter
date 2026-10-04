"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PrincipleStack — stapel av "Sluta X. Börja Y." med strikethrough-animation
 * på X och accent-reveal på Y. Stega framåt för att tända en princip i taget.
 *
 * MDX-format:
 * ```mdx
 * <PrincipleStack
 *   chapter="§ Akt 4 · Principer"
 *   title="Tre principer för klassrummet."
 *   subtitle="Inget magiskt — bara tre **skiftningar** i hur vi tänker."
 *   accent= "var(--accent)"
 * >
 * - detektera · förstå
 * - fokusera på produkt · synliggöra process
 * - servera information · bygga bildning
 * </PrincipleStack>
 * ```
 *
 * Per rad: `Sluta-X · Börja-Y`. Prefixen "Sluta" / "Börja" sätts av templaten.
 */

interface PrincipleStackProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Prefix på vänsterledet — default "Sluta". */
  startVerb?: string;
  /** Prefix på högerledet — default "Börja". */
  endVerb?: string;
  children?: ReactNode;
}

interface Principle {
  before: string;
  after: string;
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

function parsePrinciples(children: ReactNode): Principle[] {
  const out: Principle[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const before = (parts[0] ?? "").trim();
    const after = parts.slice(1).join(" · ").trim();
    if (!before || !after) return;
    out.push({ before, after });
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

export function PrincipleStack({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  startVerb = "Sluta",
  endVerb = "Börja",
  children,
}: PrincipleStackProps) {
  const principles = useMemo(() => parsePrinciples(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(principles.length);

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
          gap: "clamp(2rem, 4vh, 3.5rem)",
          zIndex: 2,
          justifyContent: "center",
        }}
      >
        {/* Topp — title + subtitle */}
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
              {title}
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
                fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
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

        {/* Principer — staplade */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.4rem, 2.8vh, 2.2rem)",
            maxWidth: "min(1400px, 95%)",
          }}
        >
          {principles.map((p, i) => {
            const lit = i <= step;
            const isLatest = i === step;
            const baseDelay = 0.6 + i * 0.6;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: lit ? 1 : 0.25, x: 0 }}
                transition={{ duration: 0.7, delay: baseDelay }}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "clamp(0.6rem, 1.2vw, 1.1rem)",
                  flexWrap: "wrap",
                }}
              >
                {/* Sluta */}
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.2rem, 2vw, 1.9rem)",
                    fontWeight: 400,
                    color: "var(--text-muted)",
                  }}
                >
                  {startVerb}
                </span>

                {/* Before-text med strikethrough */}
                <span
                  style={{
                    position: "relative",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)",
                    color: lit ? "var(--text-muted)" : "var(--text-muted)",
                    letterSpacing: "-0.02em",
                    transition: "color 0.5s",
                  }}
                >
                  {p.before}
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: lit ? 1 : 0 }}
                    transition={{
                      duration: 0.55,
                      delay: baseDelay + 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: "absolute",
                      left: "-2%",
                      right: "-2%",
                      top: "55%",
                      height: "4px",
                      background: accent,
                      boxShadow: `0 0 16px ${withAlpha(accent, 0.6)}`,
                      transformOrigin: "left center",
                      borderRadius: "2px",
                    }}
                  />
                </span>

                {/* Pil */}
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: lit ? 0.7 : 0.2, x: 0 }}
                  transition={{ duration: 0.5, delay: baseDelay + 0.85 }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
                    color: accent,
                    margin: "0 0.4em",
                  }}
                >
                  →
                </motion.span>

                {/* Börja */}
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.2rem, 2vw, 1.9rem)",
                    fontWeight: 400,
                    color: "var(--text-muted)",
                  }}
                >
                  {endVerb}
                </span>

                {/* After-text */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: lit ? 1 : 0.25 }}
                  transition={{ duration: 0.6, delay: baseDelay + 0.95 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 3.2vw, 3rem)",
                    color: lit ? accent : "var(--text-muted)",
                    letterSpacing: "-0.025em",
                    textShadow: isLatest ? `0 0 32px ${withAlpha(accent, 0.4)}` : "none",
                    transition: "color 0.5s, text-shadow 0.5s",
                  }}
                >
                  {p.after}
                </motion.span>

                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: lit ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: baseDelay + 1.1 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1.8rem, 3.2vw, 3rem)",
                    color: lit ? accent : "var(--text-muted)",
                  }}
                >
                  .
                </motion.span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
