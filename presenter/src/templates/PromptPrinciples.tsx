"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface Principle {
  name: string;
  description: string;
  bad: string;
  good: string;
}

interface PromptPrinciplesProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /**
   * Markdown-lista — varje rad är en princip:
   *   - **Namn** · Beskrivning · Dålig prompt · Bra prompt
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.75)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
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
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 4) return;
    const nameRaw = parts[0].trim();
    const nameMatch = nameRaw.match(/^\*\*(.+?)\*\*$/);
    const name = nameMatch ? nameMatch[1] : nameRaw;
    out.push({
      name,
      description: parts[1].trim(),
      bad: parts[2].trim(),
      good: parts[3].trim(),
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

const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function PromptPrinciples({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  children,
}: PromptPrinciplesProps) {
  const principles = parsePrinciples(children);
  const activeStep = useSlideSteps(Math.max(principles.length, 1));
  const current = principles[activeStep];

  // När en foto-/bild-bakgrund anges ligger den bakom en mörk scrim (se
  // resolveBackground) — då måste texten vara fast ljus oavsett tema. Utan
  // foto-bakgrund följer texten temat (mörk på dagsljus, ljus på nattglas).
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http"))
  );
  const textPrimary = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none ambient-accent"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${withAlpha(accent, 0.09)} 0%, transparent 70%)`,
        }}
      />

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4.5vw, 4.5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.75rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-2" style={{ flexShrink: 0, maxWidth: "38em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.9rem))",
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
                color: textPrimary,
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
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--room-body, clamp(0.95rem, 1.1vw, 1.15rem))",
                color: textMuted,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Principle card */}
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "100%",
                  maxWidth: "var(--room-document-width, 65em)",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "clamp(1.5rem, 3vw, 3rem)",
                  alignItems: "start",
                }}
              >
                {/* Roman numeral + progress */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.8rem",
                    minWidth: "clamp(4rem, 7vw, 7rem)",
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1.3, 0.36, 1] }}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontStyle: "italic",
                      fontSize: "clamp(4rem, 7vw, 8rem)",
                      lineHeight: 0.9,
                      color: accent,
                      textShadow: `0 0 40px ${withAlpha(accent, 0.25)}`,
                    }}
                  >
                    {ROMANS[activeStep] ?? String(activeStep + 1)}
                  </motion.div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: textMuted,
                    }}
                  >
                    {String(activeStep + 1).padStart(2, "0")} / {String(principles.length).padStart(2, "0")}
                  </div>
                </div>

                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 2vh, 1.5rem)" }}>
                  {/* Name + description */}
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(2.2rem, 4.5vw, 4.2rem)",
                        lineHeight: 1.02,
                        letterSpacing: "-0.025em",
                        color: textPrimary,
                        marginBottom: "0.4rem",
                      }}
                    >
                      {current.name}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.3rem))",
                        color: textMuted,
                        lineHeight: 1.35,
                        maxWidth: "32em",
                      }}
                    >
                      {current.description}
                    </motion.div>
                  </div>

                  {/* Bad → Good */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.55 }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "var(--room-prompt-columns, 1fr auto 1fr)",
                      gap: "clamp(0.8rem, 1.5vw, 1.5rem)",
                      alignItems: "center",
                    }}
                  >
                    {/* Bad */}
                    <div data-card="flat"
                      style={{
                        padding: "clamp(0.9rem, 1.3vw, 1.3rem) clamp(1rem, 1.5vw, 1.5rem)",
                        borderRadius: "0.7rem",
                        background: hasPhotoBg
                          ? "rgba(245,246,250,0.04)"
                          : "var(--bg-surface)",
                        border: hasPhotoBg
                          ? "1px solid rgba(245,246,250,0.1)"
                          : "1px solid rgba(0,0,0,0.1)",
                        filter: "saturate(0.4)",
                        opacity: 0.78,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--room-caption, 0.65rem)",
                          letterSpacing: "0.25em",
                          textTransform: "uppercase",
                          color: textMuted,
                          marginBottom: "0.5rem",
                          fontWeight: 600,
                        }}
                      >
                        Inte så här
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--room-prompt-before, var(--room-body, clamp(0.85rem, 1vw, 1rem)))",
                          color: textMuted,
                          lineHeight: 1.4,
                          fontStyle: "italic",
                        }}
                      >
                        "{current.bad}"
                      </div>
                    </div>

                    {/* Arrow */}
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
                        color: accent,
                        lineHeight: 1,
                        filter: `drop-shadow(0 0 10px ${withAlpha(accent, 0.38)})`,
                      }}
                    >
                      →
                    </motion.div>

                    {/* Good */}
                    <div data-card=""
                      style={{
                        padding: "clamp(0.9rem, 1.3vw, 1.3rem) clamp(1rem, 1.5vw, 1.5rem)",
                        borderRadius: "0.7rem",
                        background: `${withAlpha(accent, 0.08)}`,
                        border: `1px solid ${withAlpha(accent, 0.31)}`,
                        boxShadow: `0 12px 30px -12px ${withAlpha(accent, 0.25)}, inset 0 1px 0 ${withAlpha(accent, 0.12)}`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--room-caption, 0.65rem)",
                          letterSpacing: "0.25em",
                          textTransform: "uppercase",
                          color: accent,
                          marginBottom: "0.5rem",
                          fontWeight: 700,
                        }}
                      >
                        Snarare så
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--room-prompt-after, var(--room-body, clamp(0.9rem, 1.05vw, 1.08rem)))",
                          color: textPrimary,
                          lineHeight: 1.45,
                        }}
                      >
                        "{current.good}"
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Progress-prickar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "auto",
          }}
        >
          {principles.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                background:
                  i === activeStep
                    ? accent
                    : i < activeStep
                      ? `${withAlpha(accent, 0.38)}`
                      : hasPhotoBg
                        ? "rgba(245,246,250,0.12)"
                        : "rgba(0,0,0,0.14)",
                width: i === activeStep ? "2rem" : "0.5rem",
              }}
              transition={{ duration: 0.4 }}
              style={{
                height: "2px",
                borderRadius: "1px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
