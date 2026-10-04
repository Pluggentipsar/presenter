"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface LabsNarrativeProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Sluttreplik underst — Berman/Cheng-payoff. */
  payoff?: string;
  /**
   * Tre labb via markdown-lista. Format per rad (pipe-separerad):
   * `- Labbnamn | Narrative-tag | Huvudaktör | Signaturreplik | Open source · accent-färg`
   * Sista fältet (accent) är valfritt — om utelämnat ärvs tema-accent.
   */
  children?: ReactNode;
}

interface Lab {
  name: string;
  narrativeTag: string;
  actor: string;
  quote: string;
  openSource: string;
  accent?: string;
}

/** Hårdkodad mappning från lab-namn → logo-fil(er). */
const LAB_LOGOS: Record<string, string[]> = {
  Anthropic: ["/logos/anthropic.svg"],
  OpenAI: ["/logos/openai.svg"],
  "xAI + Meta": ["/logos/xai.svg", "/logos/meta.svg"],
};

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

function parseLabs(children: ReactNode): Lab[] {
  const out: Lab[] = [];
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
          if (!text) return;
          const parts = text.split(/\s*\|\s*/);
          out.push({
            name: parts[0] ?? "",
            narrativeTag: parts[1] ?? "",
            actor: parts[2] ?? "",
            quote: parts[3] ?? "",
            openSource: parts[4] ?? "",
            accent: parts[5] || undefined,
          });
        }
      });
    }
  });
  return out;
}

/**
 * Tre AI-labb och deras grundberättelser — staged reveal.
 * Premiär: en keynote 2026-05-27.
 *
 * Layout: title + subtitle, tre glass-paneler i rad (mobil: stackad), payoff under.
 * Varje panel: logo-platshållare, narrative-tag, huvudaktör, signaturreplik, open-source-läge.
 */
export function LabsNarrative({
  kicker = "§ Berättelserna bakom berättelserna",
  chapter,
  title,
  subtitle,
  payoff,
  children,
}: LabsNarrativeProps) {
  const labs = parseLabs(children);
  const accent = "var(--accent)";

  const renderRich = (text: string): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <span
            key={i}
            style={{ color: accent, textShadow: `0 0 20px ${withAlpha(accent, 0.4)}` }}
          >
            {m[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "clamp(1.4rem, 2vw, 2rem) clamp(2rem, 3vw, 3rem)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 5,
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{ color: accent }}
        >
          <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
        </motion.div>
        {chapter ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            style={{ color: "var(--text-muted)" }}
          >
            <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
          </motion.div>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          paddingTop: "clamp(4.5rem, 7vh, 6rem)",
          paddingBottom: "clamp(1.8rem, 2.6vh, 2.4rem)",
          paddingLeft: "clamp(2rem, 3vw, 3rem)",
          paddingRight: "clamp(2rem, 3vw, 3rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.2vh, 1.8rem)",
        }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{renderRich(title)}</EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.98rem, 1.18vw, 1.18rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.7rem 0 0 0",
                maxWidth: "48em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Three labs */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${labs.length}, minmax(0, 1fr))`,
            gap: "clamp(1rem, 1.8vw, 1.5rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {labs.map((lab, i) => {
            const labAccent = lab.accent || accent;
            const logos = LAB_LOGOS[lab.name] || [];
            return (
              <motion.div
                key={i}
                data-card=""
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 28,
                  delay: 0.4 + i * 0.32,
                  mass: 0.95,
                }}
                style={{
                  position: "relative",
                  background: `linear-gradient(160deg, ${withAlpha(
                    labAccent,
                    0.08,
                  )} 0%, var(--bg-surface) 45%, var(--bg-elevated) 100%)`,
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: `1px solid ${withAlpha(labAccent, 0.28)}`,
                  borderTop: `2px solid ${labAccent}`,
                  borderRadius: "1.1rem",
                  padding: "clamp(1.4rem, 2vw, 2rem)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  boxShadow: `0 18px 48px -16px rgba(0,0,0,0.28), 0 0 48px -8px ${withAlpha(labAccent, 0.22)}, inset 0 1px 0 ${withAlpha(labAccent, 0.18)}`,
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* Accent glow i hörnet */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "-40%",
                    right: "-30%",
                    width: "70%",
                    height: "70%",
                    background: `radial-gradient(circle, ${withAlpha(labAccent, 0.22)} 0%, transparent 65%)`,
                    pointerEvents: "none",
                    filter: "blur(20px)",
                  }}
                />

                {/* Logo-rad i toppen */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4 + i * 0.32 + 0.18,
                    duration: 0.6,
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    minHeight: "3rem",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {logos.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      style={{
                        height: "clamp(2rem, 2.6vw, 2.8rem)",
                        width: "auto",
                        filter: `drop-shadow(0 0 14px ${withAlpha(labAccent, 0.55)})`,
                        opacity: 0.95,
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </motion.div>

                {/* Namn */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.5rem, 2.1vw, 2.1rem)",
                    fontWeight: 500,
                    letterSpacing: "-0.024em",
                    color: "var(--text)",
                    lineHeight: 1,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {lab.name}
                </div>

                {/* Narrative-tag */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.74vw, 0.74rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: labAccent,
                    fontWeight: 600,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {lab.narrativeTag}
                </div>

                {/* Quote */}
                {lab.quote ? (
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                      color: "var(--text)",
                      letterSpacing: "-0.014em",
                      paddingLeft: "0.9rem",
                      borderLeft: `2px solid ${withAlpha(labAccent, 0.65)}`,
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    “{lab.quote}”
                  </div>
                ) : null}

                {/* Actor */}
                {lab.actor ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.82vw, 0.82rem)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {lab.actor}
                  </div>
                ) : null}

                {/* Open source position som bottom-row */}
                {lab.openSource ? (
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "0.8rem",
                      borderTop: `1px solid ${withAlpha(labAccent, 0.22)}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Open source ·</span>
                    <span
                      style={{
                        color: labAccent,
                        fontWeight: 600,
                      }}
                    >
                      {lab.openSource}
                    </span>
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Payoff */}
        {payoff ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.4 + labs.length * 0.32 + 0.3,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 1.5vw, 1.55rem)",
              color: "var(--text)",
              opacity: 1,
              textAlign: "center",
              maxWidth: "46em",
              margin: "0 auto",
              lineHeight: 1.35,
              letterSpacing: "-0.015em",
              paddingTop: "clamp(0.6rem, 1.2vh, 1rem)",
              borderTop: `1px solid ${withAlpha("var(--accent)", 0.2)}`,
            }}
          >
            <EditableText path="payoff" value={payoff ?? ""}>{renderRich(payoff)}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
