"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PromptShowcaseProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Avslutande mening — italic. */
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista. Varje rad är en prompt. Kan bestå av prompt + ev. effekt.
   * Format: `- Prompt-text · effect-text` (effect optional)
   *
   * Exempel:
   * - "Gör mejlet tydligare och vänligare." · Tonjustering
   * - "Förkorta texten till hälften." · Komprimering
   */
  children?: ReactNode;
}

interface PromptCard {
  prompt: string;
  effect?: string;
  rotation: number;
  tx: number;
  ty: number;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
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
    return inner;
  }
  return "";
}

function parsePrompts(children: ReactNode): PromptCard[] {
  const out: PromptCard[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    let prompt = parts[0].trim();
    // Strip leading/trailing quotes if present
    prompt = prompt.replace(/^["'""]|["'""]$/g, "").trim();
    const effect = parts.length > 1 ? parts.slice(1).join(" · ").trim() : undefined;
    // Rotation och offset bestäms av index för pseudo-organisk feel
    const idx = out.length;
    const rotation = ((idx * 13) % 7) - 3; // -3 till +3 grader
    const tx = ((idx * 7) % 5) - 2; // små offset
    const ty = ((idx * 11) % 6) - 3;
    out.push({ prompt, effect, rotation, tx, ty });
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

function renderInline(text: string, accent: string): ReactNode {
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
 * PromptShowcase — typografisk showcase av prompts. Varje prompt är ett
 * citatkort i serif-italic, lätt tiltat, med stora accent-citattecken
 * runt om. Korten är arrangerade i en grid med pseudo-organisk rotation
 * så de inte ser robotiska ut. Animerad stagger-reveal.
 *
 * Bäst för: showcase av "5 prompter du kan använda direkt" — Nivå 1
 * Språkhjälp, eller liknande sammelsurium av små prompts.
 */
export function PromptShowcase({
  chapter,
  title,
  subtitle,
  closing,
  background,
  accent = "#B4763A",
  overlay,
  children,
}: PromptShowcaseProps) {
  const prompts = parsePrompts(children);
  const activeStep = useSlideSteps(prompts.length + 1);

  // Layout: grid med variabelt antal kolumner beroende på antal prompts
  const cols = prompts.length <= 3 ? prompts.length : prompts.length === 4 ? 2 : 3;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.55) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
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
                color: accent,
                fontWeight: 700,
                opacity: 0.85,
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
                fontSize: "clamp(1.85rem, 4.2vw, 3.6rem)",
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
                fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "38em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Prompt cards grid */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "clamp(1rem, 1.8vw, 1.6rem)",
            alignItems: "stretch",
          }}
        >
          {prompts.map((p, i) => {
            const visible = activeStep > i;
            return (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 30,
                  rotate: 0,
                  filter: "blur(8px)",
                }}
                animate={
                  visible
                    ? {
                        opacity: 1,
                        y: p.ty,
                        x: p.tx,
                        rotate: p.rotation,
                        filter: "blur(0px)",
                      }
                    : {
                        opacity: 0.06,
                        y: 30,
                        rotate: 0,
                        filter: "blur(8px)",
                      }
                }
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "clamp(1.5rem, 3vw, 2.4rem)",
                  paddingTop: "clamp(2rem, 4vw, 3rem)",
                  borderRadius: "0.75rem",
                  background: `linear-gradient(160deg, rgba(247,241,230,0.04) 0%, rgba(10,9,8,0.4) 100%)`,
                  border: `1px solid ${withAlpha(accent, 0.19)}`,
                  boxShadow: visible
                    ? `0 18px 60px -20px rgba(0,0,0,0.6), 0 0 40px ${withAlpha(accent, 0.08)}, inset 0 0 0 1px ${withAlpha(accent, 0.08)}`
                    : "none",
                  overflow: "hidden",
                  minHeight: "clamp(8rem, 18vh, 12rem)",
                }}
              >
                {/* Stora citattecken bakom */}
                <div
                  style={{
                    position: "absolute",
                    top: "0.4rem",
                    left: "0.8rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(3.5rem, 7vw, 6rem)",
                    fontWeight: 800,
                    color: accent,
                    opacity: 0.18,
                    lineHeight: 1,
                    pointerEvents: "none",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;
                </div>

                {/* Prompt-text */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.05rem, 1.45vw, 1.4rem)",
                    lineHeight: 1.4,
                    color: "var(--text)",
                    fontWeight: 500,
                  }}
                >
                  <EditableText path={`prompts[${i}].prompt`} value={p.prompt}>
                    {renderInline(p.prompt, accent)}
                  </EditableText>
                </div>

                {/* Effect (om det finns) */}
                {p.effect ? (
                  <div
                    style={{
                      marginTop: "0.9rem",
                      paddingTop: "0.7rem",
                      borderTop: `1px solid ${withAlpha(accent, 0.19)}`,
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: accent,
                      fontWeight: 600,
                      opacity: 0.85,
                    }}
                  >
                    <EditableText path={`prompts[${i}].effect`} value={p.effect ?? ""}>
                      {p.effect}
                    </EditableText>
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Closing */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: activeStep >= prompts.length ? 1 : 0,
              y: activeStep >= prompts.length ? 0 : 8,
            }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
              color: "var(--text-muted)",
              maxWidth: "44em",
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
