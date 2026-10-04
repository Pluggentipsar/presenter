"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PromptEvolutionProps {
  /** Liten kapitel-markör uppe i hörnet. */
  chapter?: string;
  /** Stor rubrik. */
  title?: string;
  /** Subtitel under rubriken. */
  subtitle?: string;
  /** Avslutande commentary under sista prompten. */
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista med tre prompter. Format per rad:
   * `- LABEL · prompt-text`
   *
   * Exempel:
   * - SVAG · Skriv ett mejl om mötet.
   * - BÄTTRE · Skriv ett tydligt och vänligt mejl till deltagare...
   * - PROCESS · Jag ska bjuda in till möte. Ställ först fem frågor...
   *
   * Stegrev tre prompter ger den klassiska "from textstöd till tankestöd"-
   * progression. Använd radbrytning med `\n` i prompten (eller blankrader
   * inom punkten) för flerradiga prompter.
   */
  children?: ReactNode;
}

interface PromptStep {
  label: string;
  text: string;
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
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function parseSteps(children: ReactNode): PromptStep[] {
  const steps: PromptStep[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const idx = raw.indexOf("·");
    if (idx === -1) {
      steps.push({ label: "", text: raw });
      return;
    }
    const label = raw.slice(0, idx).trim();
    const text = raw.slice(idx + 1).trim();
    steps.push({ label, text });
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
  return steps;
}

function renderInline(text: string, accent: string): ReactNode {
  // Render **bold** as accent, *italic* as italic
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
 * PromptEvolution — visar samma uppgift som tre prompter med stegrad
 * intensitet: svag → bättre → process. Varje prompt får mer höjd, accent
 * och visuell tyngd i tur och ordning. Step-baserad reveal via space.
 *
 * Pedagogiskt verktyg för att visa förflyttningen från "skriv ett mejl"
 * till "ställ först frågor, föreslå struktur, vänta på respons".
 */
export function PromptEvolution({
  chapter,
  title,
  subtitle,
  closing,
  background,
  accent = "#B4763A",
  overlay,
  children,
}: PromptEvolutionProps) {
  const steps = parseSteps(children);
  // +1 så max activeStep = steps.length och sista prompten visas
  const activeStep = useSlideSteps(steps.length + 1);
  // Step 0: header synlig, ingen prompt
  // Step 1..n: prompt 1..n synlig

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.55) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem)",
          gap: "clamp(1.25rem, 2.5vh, 2.25rem)",
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
                fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
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
                fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "32em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Prompts stack — växer i visuell tyngd nedåt */}
        <div
          className="flex flex-1 flex-col"
          style={{ gap: "clamp(0.75rem, 1.5vh, 1.25rem)", justifyContent: "center" }}
        >
          {steps.map((step, i) => {
            const visible = activeStep > i;
            const intensity = (i + 1) / steps.length; // 0..1
            // Card storlek/intensity grows with i
            const fontSize = `clamp(${0.95 + intensity * 0.55}rem, ${
              1.1 + intensity * 0.9
            }vw, ${1.2 + intensity * 0.8}rem)`;
            const padding = `clamp(${0.9 + intensity * 0.5}rem, ${
              1.5 + intensity * 1
            }vw, ${1.4 + intensity * 1.4}rem)`;
            const borderOpacity = 0.15 + intensity * 0.45;
            const bgOpacity = 0.18 + intensity * 0.22;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -24, filter: "blur(6px)" }}
                animate={
                  visible
                    ? { opacity: 1, x: 0, filter: "blur(0px)" }
                    : { opacity: 0.08, x: -24, filter: "blur(6px)" }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: "clamp(1rem, 1.8vw, 1.6rem)",
                  padding,
                  borderRadius: "0.65rem",
                  border: `1px solid ${accent}${Math.round(borderOpacity * 255)
                    .toString(16)
                    .padStart(2, "0")}`,
                  background: `linear-gradient(135deg, rgba(10,9,8,${bgOpacity + 0.1}) 0%, rgba(10,9,8,${bgOpacity}) 100%)`,
                  boxShadow:
                    visible && i === steps.length - 1
                      ? `0 0 60px ${withAlpha(accent, 0.15)}, inset 0 0 0 1px ${withAlpha(accent, 0.19)}`
                      : "none",
                }}
              >
                {/* Label badge */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    minWidth: "clamp(5rem, 9vw, 8rem)",
                    paddingRight: "clamp(0.5rem, 1vw, 1rem)",
                    borderRight: `1px solid ${withAlpha(accent, 0.19)}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: `clamp(${0.6 + intensity * 0.15}rem, ${
                        0.7 + intensity * 0.25
                      }vw, ${0.85 + intensity * 0.2}rem)`,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: accent,
                      fontWeight: 700,
                      opacity: 0.55 + intensity * 0.45,
                    }}
                  >
                    <EditableText path={`steps[${i}].label`} value={step.label}>
                      {step.label}
                    </EditableText>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.55rem, 0.7vw, 0.7rem)",
                      letterSpacing: "0.18em",
                      color: "var(--text-muted)",
                      marginTop: "0.35rem",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                  </div>
                </div>

                {/* Prompt text */}
                <div
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize,
                    lineHeight: 1.55,
                    color: `rgba(247,241,230,${0.7 + intensity * 0.25})`,
                    whiteSpace: "pre-wrap",
                    fontWeight: i === steps.length - 1 ? 500 : 400,
                  }}
                >
                  <EditableText path={`steps[${i}].text`} value={step.text}>
                    {renderInline(step.text, accent)}
                  </EditableText>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: activeStep >= steps.length ? 1 : 0,
              y: activeStep >= steps.length ? 0 : 8,
            }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
              color: "var(--text-muted)",
              maxWidth: "40em",
              lineHeight: 1.4,
              borderLeft: `2px solid ${accent}`,
              paddingLeft: "1rem",
            }}
          >
            <EditableText path="closing" value={closing ?? ""}>{closing}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
