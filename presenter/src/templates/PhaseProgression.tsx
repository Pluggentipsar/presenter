"use client";

import { motion } from "framer-motion";
import { Children, Fragment, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PhaseProgressionProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Avslutande mening — italic. */
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista. Format per rad:
   * `- Title · Description`
   *
   * Numreringen (01, 02, 03) genereras automatiskt.
   *
   * Exempel:
   * - Pre-training · Läs allt — gissa nästa ord, miljarder gånger.
   * - Instruktion · Lär dig svara på frågor — exempel på bra svar.
   * - RLHF · Människor markerar bra/dåliga svar.
   */
  children?: ReactNode;
}

interface Phase {
  title: string;
  description: string;
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
    return inner;
  }
  return "";
}

function parsePhases(children: ReactNode): Phase[] {
  const out: Phase[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const idx = raw.indexOf("·");
    if (idx === -1) {
      out.push({ title: raw, description: "" });
      return;
    }
    const title = raw.slice(0, idx).trim().replace(/^\*\*(.+)\*\*$/, "$1");
    const description = raw.slice(idx + 1).trim();
    out.push({ title, description });
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
 * PhaseProgression — 3-5 fas-kort i en horisontell rad. Varje kort har
 * stort numrerat badge, bold titel, beskrivning och accentbar i toppen.
 * Gradient-pilar mellan korten visar att det är ett flöde.
 *
 * Step-baserad reveal: korten kommer in en åt gången, pilarna ritas in
 * mellan när nästa kort visas.
 *
 * Fungerar för: träningssteg (Pre-training → Instruktion → RLHF),
 * processfas, lärflöden, transformationskedjor.
 */
export function PhaseProgression({
  chapter,
  title,
  subtitle,
  closing,
  background,
  accent = "#B4763A",
  overlay,
  children,
}: PhaseProgressionProps) {
  const phases = parsePhases(children);
  // +1 så max activeStep = phases.length och alla faser visas på sista steget.
  const activeStep = useSlideSteps(phases.length + 1);

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

        {/* Phase cards */}
        <div
          className="flex flex-1 items-stretch"
          style={{
            display: "grid",
            gridTemplateColumns: phases.map(() => "1fr").join(" 0.5fr "),
            gap: 0,
          }}
        >
          {phases.map((p, i) => {
            const visible = activeStep > i;
            const showArrow = i < phases.length - 1;
            const arrowVisible = activeStep > i + 1;
            return (
              <Fragment key={i}>
                <motion.div
                  key={`card-${i}`}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={
                    visible
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : { opacity: 0.08, y: 30, filter: "blur(8px)" }
                  }
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "0.85rem",
                    overflow: "hidden",
                    border: `1px solid ${withAlpha(accent, 0.27)}`,
                    background: `linear-gradient(160deg, ${withAlpha(accent, 0.09)} 0%, rgba(10,9,8,0.55) 60%)`,
                    boxShadow: visible
                      ? `0 0 70px ${withAlpha(accent, 0.15)}, inset 0 0 0 1px ${withAlpha(accent, 0.19)}`
                      : "none",
                    minWidth: 0,
                  }}
                >
                  {/* Top accent strip */}
                  <div
                    style={{
                      height: "4px",
                      background: `linear-gradient(90deg, ${accent} 0%, ${withAlpha(accent, 0.5)} 100%)`,
                      boxShadow: `0 0 12px ${withAlpha(accent, 0.5)}`,
                    }}
                  />

                  {/* Number badge */}
                  <div
                    style={{
                      padding: "clamp(1.25rem, 2.5vw, 2rem)",
                      paddingBottom: "clamp(0.75rem, 1.5vw, 1.2rem)",
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(0.7rem, 1.2vw, 1rem)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(2rem, 3.2vw, 3rem)",
                        fontWeight: 800,
                        color: accent,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                        textShadow: `0 0 24px ${withAlpha(accent, 0.38)}`,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: "1px",
                        background: `linear-gradient(90deg, ${withAlpha(accent, 0.31)} 0%, transparent 100%)`,
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      padding: "0 clamp(1.25rem, 2.5vw, 2rem)",
                      paddingBottom: "clamp(0.75rem, 1.5vh, 1.2rem)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.4rem, 2.4vw, 2.2rem)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                    }}
                  >
                    <EditableText path={`phases[${i}].title`} value={p.title}>
                      {renderInline(p.title, accent)}
                    </EditableText>
                  </div>

                  {/* Description */}
                  {p.description ? (
                    <div
                      style={{
                        padding: "0 clamp(1.25rem, 2.5vw, 2rem) clamp(1.25rem, 2.5vw, 2rem)",
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1rem, 1.3vw, 1.25rem)",
                        lineHeight: 1.45,
                        color: "var(--text)",
                        marginTop: "auto",
                      }}
                    >
                      <EditableText
                        path={`phases[${i}].description`}
                        value={p.description}
                      >
                        {renderInline(p.description, accent)}
                      </EditableText>
                    </div>
                  ) : null}
                </motion.div>

                {/* Arrow connector */}
                {showArrow ? (
                  <div
                    key={`arrow-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <motion.svg
                      width="100%"
                      height="32"
                      viewBox="0 0 100 32"
                      preserveAspectRatio="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: arrowVisible ? 1 : 0.15 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.line
                        x1="0"
                        y1="16"
                        x2="80"
                        y2="16"
                        stroke={accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="3 3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: arrowVisible ? 1 : 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        vectorEffect="non-scaling-stroke"
                      />
                      <motion.path
                        d="M 80 10 L 95 16 L 80 22"
                        fill="none"
                        stroke={accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0, x: -6 }}
                        animate={
                          arrowVisible
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0, x: -6 }
                        }
                        transition={{
                          duration: 0.4,
                          delay: 0.6,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        vectorEffect="non-scaling-stroke"
                        style={{ filter: `drop-shadow(0 0 4px ${withAlpha(accent, 0.5)})` }}
                      />
                    </motion.svg>
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>

        {/* Closing */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: activeStep >= phases.length ? 1 : 0,
              y: activeStep >= phases.length ? 0 : 8,
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
