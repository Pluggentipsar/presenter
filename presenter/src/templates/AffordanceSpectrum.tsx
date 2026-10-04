"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface AffordanceSpectrumProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Vänster anknytningspunkt — minst lärande. Default "Mindre lärande". */
  leftAnchor?: string;
  /** Höger anknytningspunkt — mest lärande. Default "Mer lärande". */
  rightAnchor?: string;
  /** Final fråga underst. */
  payoff?: string;
  /**
   * Affordans-punkter via markdown-lista.
   * Format: `- Namn · Beskrivning`
   * Ordnas från vänster (minst lärande) till höger (mest lärande).
   * 3-5 punkter rekommenderas.
   */
  children?: ReactNode;
}

interface Affordance {
  name: string;
  description: string;
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

function parseAffordances(children: ReactNode): Affordance[] {
  const out: Affordance[] = [];
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
          const parts = text.split(/\s*·\s*/);
          out.push({
            name: parts[0] ?? "",
            description: parts.slice(1).join(" · "),
          });
        }
      });
    }
  });
  return out;
}

/**
 * Spektrum av affordanser — vilket lärande bjuder appen in till?
 * Premiär: en keynote 2026-05-27.
 *
 * Horisontell axel från muted vänster (mindre lärande) till accent höger
 * (mer lärande). Varje punkt är ett glass-card med accent-progression.
 */
export function AffordanceSpectrum({
  kicker,
  title,
  subtitle,
  leftAnchor = "Mindre lärande",
  rightAnchor = "Mer lärande",
  payoff,
  children,
}: AffordanceSpectrumProps) {
  const items = parseAffordances(children);
  const accent = "var(--accent)";

  const renderRich = (text: string): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <span key={i} style={{ color: accent, fontWeight: 500 }}>
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
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.5rem, 4vh, 4rem) clamp(2.5rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.4rem, 2.4vh, 2rem)",
        }}
      >
        {/* Header */}
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 500,
            }}
          >
            <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
          </motion.div>
        ) : null}

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
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
                fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.7rem 0 0 0",
                maxWidth: "46em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Anchor labels */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            opacity: 0.85,
          }}
        >
          <div><EditableText path="leftAnchor" value={leftAnchor}>{leftAnchor}</EditableText></div>
          <div style={{ color: accent }}><EditableText path="rightAnchor" value={rightAnchor}>{rightAnchor}</EditableText></div>
        </motion.div>

        {/* Spektrum-stapel: gradient + cards */}
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 1.8vh, 1.5rem)",
            minHeight: 0,
            justifyContent: "center",
          }}
        >
          {/* Horisontell gradient-bar */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              height: "3px",
              borderRadius: "1.5px",
              background: `linear-gradient(90deg, ${withAlpha(
                "var(--text-muted)",
                0.35,
              )} 0%, ${withAlpha("var(--accent)", 0.85)} 100%)`,
              transformOrigin: "left",
              boxShadow: `0 0 18px ${withAlpha("var(--accent)", 0.32)}`,
            }}
          />

          {/* Kort-rad */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
              gap: "clamp(0.8rem, 1.4vw, 1.4rem)",
              alignItems: "stretch",
            }}
          >
            {items.map((item, i) => {
              const ratio = items.length > 1 ? i / (items.length - 1) : 0.5;
              const cardAccent = `color-mix(in srgb, var(--text-muted) ${(1 - ratio) * 100}%, var(--accent) ${ratio * 100}%)`;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 28,
                    delay: 0.6 + i * 0.14,
                    mass: 0.9,
                  }}
                  style={{
                    position: "relative",
                    background: `linear-gradient(160deg, ${withAlpha(
                      cardAccent,
                      0.12,
                    )} 0%, ${withAlpha("var(--bg-elevated)", 0.92)} 45%, ${withAlpha("var(--bg-surface)", 0.96)} 100%)`,
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: `1px solid ${withAlpha(cardAccent, 0.32)}`,
                    borderTop: `3px solid ${cardAccent}`,
                    borderRadius: "0.9rem",
                    padding: "clamp(1.3rem, 1.8vw, 1.8rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.7rem",
                    boxShadow: `0 16px 36px -14px rgba(0,0,0,0.65), 0 0 ${
                      28 + ratio * 22
                    }px ${withAlpha(cardAccent, 0.22 + ratio * 0.2)}, inset 0 1px 0 ${withAlpha(cardAccent, 0.2)}`,
                    overflow: "hidden",
                  }}
                >
                  {/* Accent glow corner */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: "-35%",
                      right: "-25%",
                      width: "65%",
                      height: "65%",
                      background: `radial-gradient(circle, ${withAlpha(cardAccent, 0.28)} 0%, transparent 65%)`,
                      pointerEvents: "none",
                      filter: "blur(22px)",
                    }}
                  />
                  {/* Step indicator */}
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.82vw, 0.82rem)",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: cardAccent,
                      fontWeight: 600,
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    0{i + 1}
                  </div>
                  {/* Name */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.45rem, 1.9vw, 1.9rem)",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: ratio > 0.65 ? accent : "var(--text)",
                      lineHeight: 1.15,
                      textShadow:
                        ratio > 0.65
                          ? `0 0 22px ${withAlpha("var(--accent)", 0.4)}`
                          : undefined,
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {item.name}
                  </div>
                  {/* Description */}
                  {item.description ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(1rem, 1.15vw, 1.15rem)",
                        color: "var(--text)",
                        opacity: 0.85,
                        lineHeight: 1.5,
                        position: "relative",
                        zIndex: 2,
                      }}
                    >
                      {renderRich(item.description)}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Payoff */}
        {payoff ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 + items.length * 0.14 + 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.45vw, 1.45rem)",
              color: "var(--text)",
              opacity: 0.9,
              letterSpacing: "-0.015em",
              lineHeight: 1.4,
              maxWidth: "44em",
              textAlign: "center",
              margin: "0 auto",
              paddingTop: "clamp(0.6rem, 1.2vh, 1rem)",
              borderTop: `1px solid ${withAlpha("var(--accent)", 0.18)}`,
            }}
          >
            <EditableText path="payoff" value={payoff ?? ""}>{renderRich(payoff)}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
