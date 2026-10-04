"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg";

interface LeadStatementProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Textstorlek. Default md. */
  size?: Size;
  /**
   * Maxbredd på textblocket. Håll smal när sliden delar yta med en
   * overlay (FloatingPhone/FloatingImage) på högersidan — så texten
   * radbryts och aldrig hamnar under overlay-elementet.
   */
  maxWidth?: string;
  children: ReactNode;
}

const SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 2.6vw, 2.7rem)",
  md: "clamp(2rem, 3.4vw, 3.4rem)",
  lg: "clamp(2.6rem, 4.6vw, 4.8rem)",
};

/**
 * LeadStatement — vänsterställt påstående som lämnar plats för en overlay.
 *
 * Som GiantText, men vänsterpositionerat istället för centrerat och med en
 * hård maxbredd så texten radbryts och håller sig i vänsterzonen. Byggt för
 * slides som delar ytan med en FloatingPhone/FloatingImage på högersidan —
 * texten ska aldrig hamna under overlay-elementet.
 *
 * Tema-agnostisk. Stöd för **fet** via MDX (<strong>).
 */
export function LeadStatement({
  kicker,
  chapter,
  size = "md",
  maxWidth = "32rem",
  children,
}: LeadStatementProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll — vänsterställt, vertikalt centrerat */}
      <div
        className="relative flex h-full w-full items-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          zIndex: 2,
        }}
      >
        <EditableText path="content" block label="Text">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: SIZES[size],
              lineHeight: 1.12,
              letterSpacing: "var(--heading-tracking)",
              textTransform: "var(--heading-case)" as "normal" | "uppercase",
              color: "var(--text)",
            }}
          >
            {children}
          </motion.div>
        </EditableText>
      </div>
    </div>
  );
}
