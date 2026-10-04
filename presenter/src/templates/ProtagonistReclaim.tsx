"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";

interface ProtagonistReclaimProps {
  kicker?: string;
  /** Första statement — diagnosen (problemet). */
  problemStatement: string;
  /** Andra statement — vändningen (uppgiften). */
  reclaimStatement: string;
  /** Källa eller credit nederst. */
  source?: string;
}

/**
 * Tvåstegs editorial-statement: först diagnos (AI-labben gjorde AGI till hjälten),
 * sen vändning (eleven är protagonisten). Premiär: en keynote 2026-05-27.
 *
 * Inspirerad av Matthew Bermans/Lulu Chengs PR-analys: vem är hjälten i AI-berättelsen?
 * Designad som ett lugnt, tungt landningsstatement innan "Namnge eleven"-sliden.
 */
export function ProtagonistReclaim({
  kicker = "§ Reclaim",
  problemStatement,
  reclaimStatement,
  source,
}: ProtagonistReclaimProps) {
  const accent = "var(--accent)";

  const renderRich = (text: string, isProblem: boolean): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <motion.span
            key={i}
            initial={{ opacity: isProblem ? 0.45 : 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            style={{
              color: accent,
              fontWeight: 500,
              textShadow: `0 0 28px ${withAlpha(accent, 0.45)}`,
              position: "relative",
              display: "inline-block",
            }}
          >
            {m[1]}
            {!isProblem ? (
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 1.2,
                  delay: 2.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: "-0.08em",
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: accent,
                  boxShadow: `0 0 12px ${withAlpha(accent, 0.7)}`,
                  transformOrigin: "left",
                  borderRadius: "1px",
                }}
              />
            ) : null}
          </motion.span>
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
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(3rem, 5vh, 5rem) clamp(2.5rem, 4vw, 5rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "clamp(2rem, 4vh, 3.5rem)",
          maxWidth: "min(72rem, 100%)",
          margin: "0 auto",
        }}
      >
        {/* Kicker */}
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
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

        {/* Steg 1 — Diagnos */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 2.4vw, 2.4rem)",
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "-0.022em",
            lineHeight: 1.32,
            color: "var(--text-muted)",
            opacity: 0.95,
            maxWidth: "30em",
          }}
        >
          <EditableText path="problemStatement" value={problemStatement} multiline>{renderRich(problemStatement, true)}</EditableText>
        </motion.div>

        {/* Bridge — subtle horisontell linje */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            width: "clamp(3rem, 6vw, 5rem)",
            height: "1px",
            background: `linear-gradient(90deg, transparent 0%, ${withAlpha(
              "var(--accent)",
              0.7,
            )} 50%, transparent 100%)`,
            transformOrigin: "left",
            marginLeft: "0.2em",
          }}
        />

        {/* Steg 2 — Reclaim */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.1,
            delay: 2.0,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 3.4vw, 3.4rem)",
            fontWeight: 500,
            letterSpacing: "-0.028em",
            lineHeight: 1.18,
            color: "var(--text)",
            maxWidth: "26em",
          }}
        >
          <EditableText path="reclaimStatement" value={reclaimStatement} multiline>{renderRich(reclaimStatement, false)}</EditableText>
        </motion.div>

        {/* Source */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 3.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              opacity: 0.7,
              marginTop: "auto",
              paddingTop: "1rem",
              borderTop: `1px solid ${withAlpha("var(--accent)", 0.15)}`,
              alignSelf: "stretch",
            }}
          >
            <EditableText path="source" value={source ?? ""}>{source}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
