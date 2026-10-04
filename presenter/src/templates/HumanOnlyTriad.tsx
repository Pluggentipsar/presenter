"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * HumanOnlyTriad — tre pelare med saker AI fundamentalt inte kan göra.
 * Varje pelare har en stor "AI" struken med strikethrough-animation, sen
 * "DU" i accent under. Sub-text förklarar kort. Stega framåt för att
 * tända en pelare i taget.
 *
 * MDX-format:
 * ```mdx
 * <HumanOnlyTriad
 *   chapter="§ Akt 4 · Det AI inte kan"
 *   title="Tre saker AI inte kan."
 *   subtitle="Det är där lärarens roll är **oersättlig**."
 *   accent= "var(--accent)"
 * >
 * - Se eleven · AI känner inte igen den specifika personen i rummet.
 * - Bära ansvar · AI tar inte konsekvensen om något går fel.
 * - Fylla rummet · AI:s närvaro är en illusion. Din är verklig.
 * </HumanOnlyTriad>
 * ```
 *
 * Per rad: `Verb-fras · Förklaring`.
 */

interface HumanOnlyTriadProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Etikett för det struken-igenom — default "AI:n". */
  negatedLabel?: string;
  /** Etikett för det aktiva — default "Du". */
  activeLabel?: string;
  children?: ReactNode;
}

interface Pillar {
  verb: string;
  explanation: string;
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

function parsePillars(children: ReactNode): Pillar[] {
  const out: Pillar[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const verb = (parts[0] ?? "").trim();
    const explanation = parts.slice(1).join(" · ").trim();
    if (!verb) return;
    out.push({ verb, explanation });
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

export function HumanOnlyTriad({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  negatedLabel = "AI",
  activeLabel = "DU",
  children,
}: HumanOnlyTriadProps) {
  const pillars = useMemo(() => parsePillars(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(pillars.length);

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
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.6rem, 3vh, 2.6rem)",
          zIndex: 2,
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
                fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
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
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text)",
                marginTop: "0.6rem",
                maxWidth: "60ch",
                lineHeight: 1.4,
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {renderInline(subtitle, accent)}
              </EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* Pelare */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(pillars.length, 1)}, 1fr)`,
            gap: "clamp(1rem, 2vw, 2rem)",
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          {pillars.map((pillar, i) => {
            const lit = i <= step;
            const isLatest = i === step;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 + i * 0.18 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: lit
                    ? "linear-gradient(180deg, rgba(28, 24, 18, 0.7) 0%, rgba(15, 13, 10, 0.85) 100%)"
                    : "rgba(20, 18, 15, 0.4)",
                  border: `1px solid ${lit ? `${withAlpha(accent, 0.2)}` : "rgba(247,241,230,0.06)"}`,
                  borderRadius: "0.75rem",
                  padding: "clamp(1.2rem, 2.2vw, 2rem)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: isLatest
                    ? `0 24px 48px -16px ${withAlpha(accent, 0.33)}, inset 0 1px 0 ${withAlpha(accent, 0.33)}`
                    : lit
                    ? `0 18px 38px -16px rgba(0,0,0,0.55)`
                    : "0 6px 16px -10px rgba(0,0,0,0.35)",
                  filter: lit ? "none" : "saturate(0.5)",
                  transition: "all 0.6s",
                }}
              >
                {/* Top — verb */}
                <div style={{ position: "relative" }}>
                  {/* AI struken */}
                  <div
                    style={{
                      display: "inline-block",
                      position: "relative",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(2.6rem, 4.5vw, 4.2rem)",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: lit ? "var(--text-muted)" : "rgba(247,241,230,0.25)",
                    }}
                  >
                    {i === 0 ? (
                      <EditableText path="negatedLabel" value={negatedLabel}>
                        {negatedLabel}
                      </EditableText>
                    ) : (
                      negatedLabel
                    )}
                    {/* Strikethrough-line, animeras */}
                    <motion.span
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: lit ? 1 : 0 }}
                      transition={{
                        duration: 0.55,
                        delay: 0.85 + i * 0.18 + 0.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        position: "absolute",
                        left: "-8%",
                        right: "-8%",
                        top: "55%",
                        height: "5px",
                        background: accent,
                        boxShadow: `0 0 18px ${withAlpha(accent, 0.6)}`,
                        transformOrigin: "left center",
                        borderRadius: "2px",
                      }}
                    />
                  </div>

                  {/* Verb — vad AI inte kan */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: lit ? 1 : 0.4 }}
                    transition={{ duration: 0.5, delay: 0.85 + i * 0.18 + 0.7 }}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)",
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                      marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
                    }}
                  >
                    {pillar.verb}
                  </motion.div>
                </div>

                {/* Mellan — divider + DU */}
                <div
                  style={{
                    margin: "clamp(1rem, 2vh, 1.6rem) 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(0.5rem, 1vh, 0.9rem)",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      height: 1,
                      background: lit ? `${withAlpha(accent, 0.27)}` : "rgba(247,241,230,0.08)",
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: lit ? 1 : 0.3, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.85 + i * 0.18 + 1.0 }}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(2.6rem, 4.5vw, 4.2rem)",
                      letterSpacing: "-0.04em",
                      color: lit ? accent : `${withAlpha(accent, 0.33)}`,
                      lineHeight: 1,
                      textShadow: lit ? `0 0 28px ${withAlpha(accent, 0.53)}` : "none",
                    }}
                  >
                    {i === 0 ? (
                      <EditableText path="activeLabel" value={activeLabel}>
                        {activeLabel}
                      </EditableText>
                    ) : (
                      activeLabel
                    )}
                  </motion.div>
                </div>

                {/* Botten — explanation */}
                {pillar.explanation ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: lit ? 0.85 : 0.3 }}
                    transition={{ duration: 0.5, delay: 0.85 + i * 0.18 + 1.2 }}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                      color: "var(--text)",
                      lineHeight: 1.45,
                    }}
                  >
                    {renderInline(pillar.explanation, accent)}
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
