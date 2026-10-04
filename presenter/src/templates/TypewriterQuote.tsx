"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";

interface TypewriterQuoteProps {
  /** Kicker (kontext, t.ex. "Richard Dawkins · UnHerd · 5 maj 2026"). */
  kicker?: string;
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /** Texten som ska typewriters fram. Använd \n för radbryt. */
  text: string;
  /** Attribution som visas under texten (signatur). */
  attribution?: string;
  /** Tecken/sekund — default 35 (lugnt skrivande). */
  typeSpeed?: number | string;
  /** Delay innan typing börjar (ms). Default 600. */
  startDelay?: number | string;
  /** Justering. Default left (som Dawkins skriver i sin tidning). */
  align?: "left" | "center";
}

/**
 * TypewriterQuote — text skrivs fram tecken-för-tecken, som om någon
 * skriver i realtid. Med blinkande cursor.
 *
 * Designat för "Dawkins-stunden" — där han faktiskt skrev sin essä och
 * publiken ser hans text ta form. Tema-agnostiskt — använder var(--accent)
 * för cursor och var(--text) för text. Funkar i både midnatt (mörk) och
 * berattelser (papper).
 */
export function TypewriterQuote({
  kicker,
  chapter,
  text,
  attribution,
  typeSpeed = 35,
  startDelay = 600,
  align = "left",
}: TypewriterQuoteProps) {
  const speed = typeof typeSpeed === "string" ? parseFloat(typeSpeed) : typeSpeed;
  const start = typeof startDelay === "string" ? parseFloat(startDelay) : startDelay;
  const fullText = text.replace(/\\n/g, "\n");

  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTyped(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, start);
    return () => clearTimeout(startTimer);
  }, [fullText, speed, start]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--bg) 75%)",
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
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Decorative line under kicker */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 7rem)",
          width: "3rem",
          height: "1px",
          background: "var(--accent)",
          transformOrigin: "left",
          zIndex: 3,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          justifyContent: "center",
          alignItems: align === "center" ? "center" : "flex-start",
          textAlign: align,
          gap: "clamp(1rem, 2.5vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Texten — typewriter */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)",
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            maxWidth: "32em",
            whiteSpace: "pre-wrap",
            position: "relative",
            minHeight: "1.4em",
          }}
        >
          {typed}
          {/* Blinkande cursor */}
          <motion.span
            aria-hidden
            animate={{ opacity: done ? [1, 0, 1] : 1 }}
            transition={
              done
                ? { duration: 1.0, repeat: 2, ease: "linear" }
                : { duration: 0.1 }
            }
            style={{
              display: "inline-block",
              width: "0.06em",
              height: "1.05em",
              marginLeft: "0.05em",
              marginBottom: "-0.18em",
              background: "var(--accent)",
              verticalAlign: "baseline",
            }}
          />
        </div>

        {/* Attribution — visas när texten är klar */}
        {attribution ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
              color: "color-mix(in srgb, var(--text) 65%, transparent)",
              letterSpacing: "0.005em",
              maxWidth: "32em",
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
