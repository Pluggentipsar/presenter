"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

interface AttentionAttachmentProps {
  /** Kicker-text uppe till vänster. */
  kicker?: string;
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /** Första raden — typiskt "Sociala medier hackade vår". */
  firstLineLead?: string;
  /** Det första nyckelordet — typiskt "attention". */
  firstWord: string;
  /** Andra raden — typiskt "Chattboten hackar vår". */
  secondLineLead?: string;
  /** Det andra nyckelordet — typiskt "attachment". */
  secondWord: string;
  /** Attribution som visas nederst. */
  attribution?: string;
  /** Färg på första nyckelordet. Default: dim accent. */
  firstWordColor?: string;
  /** Färg på andra nyckelordet. Default: full accent. */
  secondWordColor?: string;
}

/**
 * AttentionAttachment — den retoriska "mirror"-sliden.
 *
 * Två rader som ekar varandra:
 *   "Sociala medier hackade vår ATTENTION."
 *   "Chattboten hackar vår ATTACHMENT."
 *
 * Det första ordet är dämpat (gammal-teknik). Det andra ordet brinner —
 * det är den nya kategorin. En subtil mirror-linje delar dem.
 *
 * Designat specifikt för Tristan Harris / Center for Humane Tech-formuleringen
 * men kan användas för alla "kontrasterande slogan"-moment.
 */
export function AttentionAttachment({
  kicker,
  chapter,
  firstLineLead = "Sociala medier hackade vår",
  firstWord,
  secondLineLead = "Chattboten hackar vår",
  secondWord,
  attribution,
  firstWordColor,
  secondWordColor,
}: AttentionAttachmentProps) {
  const dimColor = firstWordColor ?? "color-mix(in srgb, var(--text) 55%, transparent)";
  const liveColor = secondWordColor ?? "var(--accent)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 75%)",
      }}
    >
      {/* Subtil accent-glow under andra ordet */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 30% at 50% 70%, var(--accent-dim) 0%, transparent 80%)",
          pointerEvents: "none",
        }}
      />

      {/* Mirror-linje horisontellt mitt i */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.18 }}
        transition={{ duration: 1.4, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "12%",
          right: "12%",
          top: "50%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent) 70%, transparent 100%)",
          transformOrigin: "center",
          zIndex: 1,
        }}
      />

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
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Två rader, en över och en under mirror-linjen */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 7vw, 8rem)",
          gap: "clamp(2.5rem, 5vh, 4.5rem)",
          zIndex: 2,
        }}
      >
        {/* Rad 1 — den dämpade (gammalt) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "0.4em",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(1.6rem, 3vw, 2.6rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: dimColor,
            textAlign: "center",
            maxWidth: "28em",
          }}
        >
          <span>{firstLineLead}</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            style={{
              fontStyle: "italic",
              textTransform: "lowercase",
              fontWeight: 500,
              color: "color-mix(in srgb, var(--text) 78%, transparent)",
            }}
          >
            {firstWord}.
          </motion.span>
        </motion.div>

        {/* Rad 2 — den brinnande (nytt) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 2.0, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "0.4em",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(1.7rem, 3.2vw, 2.8rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "28em",
          }}
        >
          <span>{secondLineLead}</span>
          <motion.span
            initial={{
              opacity: 0,
              scale: 0.9,
              filter: "blur(8px)",
            }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
            }}
            transition={{
              duration: 1.0,
              delay: 2.7,
              ease: [0.22, 1.3, 0.36, 1],
            }}
            style={{
              fontStyle: "italic",
              textTransform: "lowercase",
              fontWeight: 700,
              color: liveColor,
              textShadow: `0 0 60px ${liveColor}88, 0 0 120px ${liveColor}44`,
            }}
          >
            {secondWord}.
          </motion.span>
        </motion.div>

        {/* Attribution — diskret under */}
        {attribution ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 4.2 }}
            style={{
              position: "absolute",
              bottom: "clamp(2rem, 4vh, 3.5rem)",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--text) 42%, transparent)",
              textAlign: "center",
              maxWidth: "40em",
            }}
          >
            <EditableText path="attribution" value={attribution}>
              {attribution}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
