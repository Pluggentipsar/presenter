"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface PitfallProps {
  /** Kort mono-tag i övre vänster: "FÄLLA 01" eller liknande. */
  badge?: string;
  chapter?: string;
  /** Det stora ordet — ex "Hallucinationer". */
  word: string;
  /** Kort beskrivning under. */
  subtitle?: string;
  /** Exempel-fråga som renderas som user-bubbla i frostat glas. */
  question?: string;
  /** AI:s fel svar som renderas i AI-bubbla. Typewriter-typas fram. */
  answer?: string;
  /** Korrigering som slår upp efter några sekunder — röd strikethrough + sanning. */
  correction?: string;
  /** Sista italic-raden längst ner. */
  tagline?: string;
  background?: string;
  /** Huvudaccent — default varningsröd. */
  accent?: string;
  /** ms per tecken när AI:n typas. Default 22. */
  typeSpeed?: number;
  /** Alternativ innehåll via children (MDX). */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,5,5,0.7), rgba(10,5,5,0.82)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function Pitfall({
  badge,
  chapter,
  word,
  subtitle,
  question,
  answer = "",
  correction,
  tagline,
  background,
  accent = "#E84D4D",
  typeSpeed = 22,
}: PitfallProps) {
  const [typed, setTyped] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);

  // När en bild/foto-bakgrund är satt lägger resolveBackground en mörk scrim
  // ovanpå — då måste primärtexten vara fast ljus oavsett tema. Utan bild
  // följer texten temat (mörk på ljust tema, ljus på mörkt).
  const hasMediaBg = !!background && (background.startsWith("/") || background.startsWith("http"));
  const textColor = hasMediaBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasMediaBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  useEffect(() => {
    if (!answer) return;
    setTyped("");
    setShowCorrection(false);
    const start = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        if (i > answer.length) {
          clearInterval(iv);
          // Efter typing: visa korrigering efter lite pause
          setTimeout(() => setShowCorrection(true), 1400);
          return;
        }
        setTyped(answer.slice(0, i));
      }, typeSpeed);
    }, 2000 + (question?.length ?? 0) * 8);
    return () => clearTimeout(start);
  }, [answer, typeSpeed, question]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Röd ambient glow från toppen — varnings-känsla */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
        }}
      />

      {/* Grid-texture topp-streck — warning */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
          transformOrigin: "center",
          boxShadow: `0 0 20px ${withAlpha(accent, 0.38)}`,
          zIndex: 3,
        }}
      />

      {/* Badge top-left */}
      {badge ? (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
            padding: "0.3rem 0.75rem",
            border: `1px solid ${accent}`,
            borderRadius: "0.3rem",
            background: `${withAlpha(accent, 0.07)}`,
            zIndex: 3,
          }}
        >
          ⚠ <EditableText path="badge" value={badge ?? ""}>{badge}</EditableText>
        </motion.div>
      ) : null}

      {/* Chapter top-right */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
        </motion.div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2.2vh, 2rem)",
          justifyContent: "center",
        }}
      >
        {/* MEGA-ordet */}
        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1.2, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(4rem, 11vw, 13rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.045em",
            color: textColor,
            margin: 0,
            textShadow: `0 8px 40px rgba(0,0,0,0.18), 0 0 60px ${withAlpha(accent, 0.12)}`,
          }}
        >
          <EditableText path="word" value={word}>{word}</EditableText>
        </motion.h1>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 1.6vw, 1.7rem)",
              lineHeight: 1.35,
              color: textColor,
              margin: 0,
              maxWidth: "32em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </motion.p>
        ) : null}

        {/* Chat-simulation: user question + AI answer + correction overlay */}
        {question || answer ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            style={{
              marginTop: "clamp(1rem, 2vh, 2rem)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.2vh, 1.1rem)",
              maxWidth: "48em",
            }}
          >
            {question ? (
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: "var(--bg-elevated)",
                    border: "1px solid rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  DU
                </div>
                <div
                  style={{
                    padding: "0.7rem 1rem",
                    borderRadius: "1rem 1rem 1rem 0.3rem",
                    background: "var(--bg-surface)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                    lineHeight: 1.4,
                    color: "var(--text)",
                  }}
                >
                  {question}
                </div>
              </div>
            ) : null}

            {answer ? (
              <div
                style={{
                  alignSelf: "flex-end",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.8rem",
                  flexDirection: "row-reverse",
                  maxWidth: "90%",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: accent,
                    color: "#0a0908",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: "0.3rem",
                  }}
                >
                  AI
                </div>
                <div
                  style={{
                    position: "relative",
                    padding: "0.85rem 1.15rem",
                    borderRadius: "1rem 1rem 0.3rem 1rem",
                    background: "rgba(20, 12, 10, 0.75)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: `1px solid ${withAlpha(accent, 0.19)}`,
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
                    lineHeight: 1.5,
                    color: "rgba(245,246,250,0.92)",
                    maxWidth: "36em",
                    boxShadow: `0 12px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px ${withAlpha(accent, 0.12)}`,
                  }}
                >
                  <span>
                    {typed}
                    {typed.length < answer.length ? (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                        style={{
                          display: "inline-block",
                          width: "0.5ch",
                          height: "1em",
                          background: accent,
                          marginLeft: "0.1em",
                          verticalAlign: "middle",
                        }}
                      />
                    ) : null}
                  </span>
                  {/* Strike-through overlay när correction visas */}
                  {showCorrection ? (
                    <motion.div
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        position: "absolute",
                        left: "0.9rem",
                        right: "0.9rem",
                        top: "50%",
                        height: "3px",
                        background: accent,
                        transform: "translateY(-50%) rotate(-1.5deg)",
                        transformOrigin: "left",
                        boxShadow: `0 0 8px ${withAlpha(accent, 0.5)}`,
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {correction && showCorrection ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1.2, 0.36, 1] }}
                style={{
                  alignSelf: "flex-end",
                  marginTop: "0.3rem",
                  padding: "0.7rem 1rem",
                  borderRadius: "0.6rem",
                  background: accent,
                  color: "#0a0908",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.85rem, 1vw, 1rem)",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  maxWidth: "36em",
                  boxShadow: `0 12px 30px -8px ${withAlpha(accent, 0.38)}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginRight: "0.6rem",
                    fontWeight: 700,
                  }}
                >
                  ↳ Fel:
                </span>
                {correction}
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}

        {tagline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: answer ? 3.5 + (answer.length * typeSpeed) / 1000 : 1.2 }}
            style={{
              marginTop: "auto",
              paddingTop: "1rem",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(1rem, 1.3vw, 1.4rem)",
              color: accent,
              lineHeight: 1.4,
              maxWidth: "30em",
              borderLeft: `3px solid ${accent}`,
              paddingLeft: "1rem",
            }}
          >
            <EditableText path="tagline" value={tagline ?? ""}>{tagline}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
