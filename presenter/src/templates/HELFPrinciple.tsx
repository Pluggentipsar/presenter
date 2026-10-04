"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type PrincipleKind = "deep" | "scaffold" | "metacog" | "context";

interface HELFPrincipleProps {
  /** Principnummer 01-04. */
  number: string;
  /** Princip-namn — "Deep & interactive learning" etc. */
  name: string;
  /** Kort en-mening definition. */
  tagline: string;
  /** Designprincip — den landande callouten. */
  designPrinciple: string;
  /** Källcitat. Default Khosravi et al. */
  source?: string;
  /** Slide-typ — påverkar färgaccent och inline-SVG-illustration. */
  kind: PrincipleKind;
  /**
   * Tre-fyra punkter via markdown-lista som children.
   * Format: `- **Headline.** Body text.`
   */
  children?: ReactNode;
}

function extractTextHELF(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextHELF).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractTextHELF(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseBullets(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractTextHELF(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) out.push(text);
        }
      });
    }
  });
  return out;
}

const KIND_CONFIG: Record<
  PrincipleKind,
  { accent: string; accentAlpha: number; illustration: (color: string) => ReactNode }
> = {
  deep: {
    accent: "#7AA8FF", // nattglas-blue
    accentAlpha: 0.5,
    illustration: (color) => (
      // Cirkulär generations-cykel: eleven → AI → eleven igen
      <g>
        <circle
          cx="80"
          cy="80"
          r="56"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="2 4"
          opacity="0.4"
        />
        <motion.circle
          cx="80"
          cy="24"
          r="14"
          fill={color}
          opacity="0.85"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 240, damping: 18 }}
        />
        <motion.circle
          cx="128"
          cy="108"
          r="14"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.7"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.85, type: "spring", stiffness: 240, damping: 18 }}
        />
        <motion.circle
          cx="32"
          cy="108"
          r="14"
          fill={color}
          opacity="0.85"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.1, type: "spring", stiffness: 240, damping: 18 }}
        />
        {/* Arrows längs cirkeln — pilar mellan noderna */}
        <motion.path
          d="M 95 30 Q 124 50, 124 95"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.0, duration: 0.8 }}
        />
        <motion.path
          d="M 112 110 Q 80 124, 50 110"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.25, duration: 0.8 }}
        />
        <motion.path
          d="M 37 95 Q 35 50, 65 30"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        />
        <text
          x="80"
          y="28"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            fill: "#0a0c12",
            fontWeight: 700,
          }}
        >
          ELEV
        </text>
        <text
          x="128"
          y="112"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            fill: color,
            fontWeight: 700,
          }}
        >
          AI
        </text>
        <text
          x="32"
          y="112"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            fill: "#0a0c12",
            fontWeight: 700,
          }}
        >
          ELEV
        </text>
      </g>
    ),
  },
  scaffold: {
    accent: "#9D7AFF", // violett
    accentAlpha: 0.5,
    illustration: (color) => (
      // Tre zoner — för låg / sweet spot / för hög
      <g>
        {[0, 1, 2].map((i) => (
          <motion.rect
            key={i}
            x={20 + i * 40}
            y={130 - (i === 1 ? 80 : 40)}
            width="32"
            height={i === 1 ? 80 : 40}
            rx="4"
            fill={i === 1 ? color : "none"}
            stroke={color}
            strokeWidth={i === 1 ? 0 : 1.5}
            opacity={i === 1 ? 0.85 : 0.45}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              delay: 0.6 + i * 0.18,
              type: "spring",
              stiffness: 240,
              damping: 22,
            }}
            style={{ transformOrigin: `${36 + i * 40}px 130px` }}
          />
        ))}
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          x="52"
          y="148"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            fill: "var(--text-muted)",
            letterSpacing: "0.05em",
          }}
        >
          för lätt
        </motion.text>
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          x="92"
          y="148"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            fill: color,
            letterSpacing: "0.05em",
            fontWeight: 700,
          }}
        >
          ZPD
        </motion.text>
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          x="132"
          y="148"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            fill: "var(--text-muted)",
            letterSpacing: "0.05em",
          }}
        >
          för svårt
        </motion.text>
      </g>
    ),
  },
  metacog: {
    accent: "#FF7AC6", // metakognitions-rosa
    accentAlpha: 0.5,
    illustration: (color) => (
      // Två överlappande cirklar — "vad jag tror jag vet" / "vad jag vet"
      <g>
        <motion.circle
          cx="64"
          cy="80"
          r="42"
          fill={color}
          opacity="0.18"
          stroke={color}
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ delay: 0.6, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        <motion.circle
          cx="96"
          cy="80"
          r="42"
          fill={color}
          opacity="0.18"
          stroke={color}
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.55 }}
          transition={{ delay: 0.85, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          x="64"
          y="36"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            fill: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          tror jag vet
        </motion.text>
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35 }}
          x="96"
          y="136"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            fill: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          vet
        </motion.text>
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          x="80"
          y="84"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fill: color,
            fontWeight: 600,
            fontStyle: "italic",
          }}
        >
          gap
        </motion.text>
      </g>
    ),
  },
  context: {
    accent: "#7EE0A5", // kontext-grön
    accentAlpha: 0.45,
    illustration: (color) => (
      // Fyra olika kontexter — kuber/rutor i grupp
      <g>
        {[
          { x: 22, y: 22, label: "praktik" },
          { x: 96, y: 22, label: "berättelse" },
          { x: 22, y: 96, label: "rum" },
          { x: 96, y: 96, label: "person" },
        ].map((ctx, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.6 + i * 0.15,
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            style={{ transformOrigin: `${ctx.x + 21}px ${ctx.y + 21}px` }}
          >
            <rect
              x={ctx.x}
              y={ctx.y}
              width="42"
              height="42"
              rx="6"
              fill={color}
              opacity="0.15"
              stroke={color}
              strokeWidth="1.5"
            />
            <text
              x={ctx.x + 21}
              y={ctx.y + 27}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "7.5px",
                fill: color,
                letterSpacing: "0.06em",
              }}
            >
              {ctx.label}
            </text>
          </motion.g>
        ))}
        {/* Connecting lines i mitten */}
        <motion.line
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          x1="64"
          y1="64"
          x2="118"
          y2="118"
          stroke={color}
          strokeWidth="1"
          opacity="0.35"
          strokeDasharray="2 3"
        />
        <motion.line
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.55, duration: 0.8 }}
          x1="118"
          y1="64"
          x2="64"
          y2="118"
          stroke={color}
          strokeWidth="1"
          opacity="0.35"
          strokeDasharray="2 3"
        />
        <motion.circle
          cx="91"
          cy="91"
          r="6"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.8, type: "spring", stiffness: 260, damping: 18 }}
        />
      </g>
    ),
  },
};

/**
 * Khosravis fyra HELF-principer — en per slide, var och en med unik visuell
 * illustration. Premiär: en keynote 2026-05-27.
 *
 * `kind` styr accent-färg + inline-SVG-illustration:
 * - "deep" → cirkulär elev→AI→elev-cykel (blå)
 * - "scaffold" → tre-zoners ZPD-balk (violett)
 * - "metacog" → överlappande cirklar med "gap" (rosa)
 * - "context" → fyra kontext-rutor förbundna i mitten (grön)
 */
export function HELFPrinciple({
  number,
  name,
  tagline,
  designPrinciple,
  source = "Khosravi et al. 2026 · arXiv 2605.04816",
  kind,
  children,
}: HELFPrincipleProps) {
  const config = KIND_CONFIG[kind];
  const accent = config.accent;
  const bullets = parseBullets(children);

  // Render text with **bold** → accent
  const renderRich = (text: string): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <span key={i} style={{ color: accent, fontWeight: 600 }}>
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
      <AmbientBackdrop accent2={accent} />

      {/* Top bar */}
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
          style={{ color: "var(--text-muted)" }}
        >
          § HELF · fyra principer
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          style={{ color: accent }}
        >
          Princip {number} / 04
        </motion.div>
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
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.62fr) minmax(0, 1fr)",
          gap: "clamp(1.8rem, 3.2vw, 3rem)",
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        {/* LEFT: number + illustration */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(5rem, 9vw, 9rem)",
                fontWeight: 300,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                color: accent,
                textShadow: `0 0 36px ${withAlpha(accent, config.accentAlpha)}`,
              }}
            >
              {number}
            </div>
            <div
              style={{
                width: "2.5rem",
                height: "2px",
                background: accent,
                marginTop: "0.8rem",
                boxShadow: `0 0 10px ${withAlpha(accent, 0.6)}`,
              }}
            />
          </motion.div>

          {/* SVG illustration */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "9rem",
            }}
          >
            <svg
              viewBox="0 0 160 160"
              style={{ width: "100%", maxWidth: "20rem", height: "auto" }}
            >
              {config.illustration(accent)}
            </svg>
          </motion.div>
        </div>

        {/* RIGHT: princip-text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 1.8vh, 1.6rem)",
            justifyContent: "space-between",
          }}
        >
          {/* Name + tagline */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="name" value={name}>{name}</EditableText>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.25rem, 1.6vw, 1.65rem)",
                fontStyle: "italic",
                lineHeight: 1.35,
                color: "var(--text)",
                margin: "0.9rem 0 0 0",
                maxWidth: "26em",
              }}
            >
              <EditableText path="tagline" value={tagline}>{renderRich(tagline)}</EditableText>
            </motion.p>
          </div>

          {/* Bullets */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1rem, 1.8vh, 1.5rem)",
            }}
          >
            {bullets.map((bullet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.7 + i * 0.14,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "1rem",
                  alignItems: "baseline",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.4rem, 1.8vw, 1.8rem)",
                    color: accent,
                    fontWeight: 500,
                    lineHeight: 1,
                    textShadow: `0 0 14px ${withAlpha(accent, 0.45)}`,
                  }}
                >
                  →
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(1.2rem, 1.5vw, 1.55rem)",
                    lineHeight: 1.45,
                    color: "var(--text)",
                  }}
                >
                  {renderRich(bullet)}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Design principle callout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 + bullets.length * 0.14 + 0.1 }}
            style={{
              padding: "clamp(1.1rem, 1.7vw, 1.5rem) clamp(1.3rem, 1.9vw, 1.7rem)",
              background: `linear-gradient(135deg, ${withAlpha(
                accent,
                0.14,
              )} 0%, ${withAlpha(accent, 0.02)} 100%)`,
              border: `1px solid ${withAlpha(accent, 0.32)}`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: "0.6rem",
              boxShadow: `0 4px 16px -8px ${withAlpha(accent, 0.4)}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.75rem, 0.88vw, 0.88rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Designprincip
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.3rem, 1.65vw, 1.7rem)",
                fontStyle: "italic",
                lineHeight: 1.35,
                color: "var(--text)",
                letterSpacing: "-0.014em",
              }}
            >
              <EditableText path="designPrinciple" value={designPrinciple} multiline>{renderRich(designPrinciple)}</EditableText>
            </div>
          </motion.div>

          {/* Source */}
          {source ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.72vw, 0.72rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "right",
              }}
            >
              <EditableText path="source" value={source}>{source}</EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
