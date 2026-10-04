"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

interface BookQuoteProps {
  /** Kicker uppe till vänster (vanligen källa/datum). */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Själva citatet. Stöd \n för radbryt. */
  quote: string;
  /** Attribution under citatet. */
  attribution?: string;
  /**
   * Visuell stämpel: "alert" gör citatet röd-tonat (för system-blottande
   * citat som OpenAI-medgivandet). "default" är terrakotta/accent.
   */
  variant?: "default" | "alert";
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

/**
 * BookQuote — citat som ett bokuppslag.
 *
 * Lugn fade-in (inte ord-för-ord-dramaturgi som EditorialQuote).
 * Designat för att kännas som en typografiskt välsatt sida i en
 * facklitterär bok — generösa marginaler, klassisk italic, en subtil
 * ornament-linje under attributionen.
 *
 * Två varianter:
 *   default — citatet använder var(--accent) för betoning
 *   alert   — citatet använder var(--accent-alert) — för "blottande"
 *             citat som OpenAI-medgivandet
 */
export function BookQuote({
  kicker,
  chapter,
  quote,
  attribution,
  variant = "default",
  background,
  overlay,
  overlayMode = "dark",
}: BookQuoteProps) {
  const accentVar = variant === "alert" ? "var(--accent-alert)" : "var(--accent)";
  const lines = quote.replace(/\\n/g, "\n").split("\n");

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
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
            color: variant === "alert" ? "var(--accent-alert)" : "var(--accent)",
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

      {/* Stort dekorativt citat-tecken bakom — som i en fackbok */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 2.0, delay: 0.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "12%",
          left: "8%",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "clamp(20rem, 40vw, 50rem)",
          lineHeight: 0.8,
          color: accentVar,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        “
      </motion.div>

      {/* Innehåll — centrerat */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          justifyContent: "center",
          alignItems: "center",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Citatet */}
        <motion.blockquote
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(1.8rem, 3.4vw, 3rem)",
            lineHeight: 1.3,
            letterSpacing: "-0.015em",
            color: "var(--text)",
            textAlign: "left",
            maxWidth: "26em",
            margin: 0,
            padding: 0,
          }}
        >
          <EditableText path="quote" value={quote} label="Citat">
            {lines.map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </EditableText>
        </motion.blockquote>

        {/* Ornament-linje under citatet */}
        {attribution ? (
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: "26em",
              height: "1px",
              background: accentVar,
              transformOrigin: "left",
              alignSelf: "flex-start",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        ) : null}

        {/* Attribution */}
        {attribution ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.9 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
              color: "var(--text-muted)",
              letterSpacing: "0.005em",
              maxWidth: "26em",
              width: "100%",
              textAlign: "left",
            }}
          >
            <EditableText path="attribution" value={attribution}>
              — {attribution}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
