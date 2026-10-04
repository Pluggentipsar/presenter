"use client";

import { motion } from "framer-motion";

interface ErrorSlideProps {
  /** Felkod som visas jättestort i mitten. Default "404". */
  errorCode?: string;
  /** Versal underrubrik — vad gick fel. */
  errorTitle?: string;
  /** Längre beskrivning (stödjer radbrytning via \n). */
  errorMessage?: string;
  /** Tag högst upp till vänster. */
  errorTag?: string;
  /** Tidsstämpel — default en fix-sträng som ser realistisk ut. */
  timestamp?: string;
  /** Visa den animerade framstegsindikatorn längst ned. */
  showProgress?: boolean;
  /** Vad progresstexten säger. */
  progressLabel?: string;
}

/**
 * Fejkad 404/system-felsida för satiriska moment. Tegel-färgad "ERROR"-tag,
 * gigantiskt glitchande felkod, konjak-versal underrubrik, kursiv
 * beskrivning, och en framstegsindikator som aldrig helt når fram.
 */
export function ErrorSlide({
  errorCode = "404",
  errorTitle = "FÖRELÄSNINGEN KUNDE INTE LADDAS",
  errorMessage = "AI försökte ta över föreläsningen men misslyckades.\nTalaren är tillbaka vid kontrollerna.",
  errorTag = "ERR_AI_TAKEOVER",
  timestamp = "2026-04-29T14:17:43Z",
  showProgress = true,
  progressLabel = "ÅTERSTÄLLER KONTROLLEN…",
}: ErrorSlideProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{
        background: "var(--slide-base, var(--bg))",
        color: "var(--text)",
        padding: "clamp(2rem, 3vw, 3.5rem)",
      }}
    >
      {/* Subtil scanline-textur */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(247,241,230,0) 0px, rgba(247,241,230,0) 3px, rgba(247,241,230,0.025) 4px)",
          mixBlendMode: "overlay",
          opacity: 0.6,
        }}
      />

      {/* Top-tag */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
          color: "#9A3A2A",
          letterSpacing: "0.18em",
          display: "flex",
          alignItems: "center",
          gap: "0.8rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        <span
          style={{
            background: "#9A3A2A",
            color: "#0a0908",
            padding: "0.3rem 0.7rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
          }}
        >
          ERROR
        </span>
        <span style={{ color: "var(--text)" }}>{errorTag}</span>
        <span style={{ color: "var(--text-muted)" }}>· {timestamp}</span>
      </motion.div>

      {/* Mitten */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ gap: "clamp(1.5rem, 2.5vw, 2.5rem)", position: "relative", zIndex: 2 }}
      >
        {/* Glitchande felkod */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, -4, 3, -2, 0, 0, 0, 0, 0, 0],
          }}
          transition={{
            opacity: { duration: 0.7 },
            scale: { duration: 0.7 },
            x: {
              duration: 0.4,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            },
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(9rem, 28vw, 26rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.05em",
            color: "var(--text)",
            textShadow:
              "4px 0 rgba(154,58,42,0.35), -4px 0 rgba(6,182,212,0.25)",
          }}
        >
          {errorCode}
        </motion.div>

        {/* Underrubrik */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.95rem, 1.3vw, 1.35rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#B4763A",
            fontWeight: 600,
            margin: 0,
            textAlign: "center",
          }}
        >
          {errorTitle}
        </motion.p>

        {/* Beskrivning */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1.1rem, 1.5vw, 1.5rem)",
            maxWidth: "34em",
            textAlign: "center",
            color: "var(--text)",
            opacity: 0.92,
            whiteSpace: "pre-line",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {errorMessage}
        </motion.p>
      </div>

      {/* Framstegsindikator längst ned */}
      {showProgress ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          style={{ width: "100%", position: "relative", zIndex: 2 }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.88rem)",
              color: "var(--text-muted)",
              marginBottom: "0.7rem",
              letterSpacing: "0.18em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>{progressLabel}</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              █
            </motion.span>
          </div>
          <div
            style={{
              width: "100%",
              height: "3px",
              background: "var(--bg-elevated)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "37%", "43%", "71%", "78%", "94%"] }}
              transition={{
                duration: 8,
                delay: 1.2,
                ease: "easeOut",
                times: [0, 0.2, 0.35, 0.6, 0.8, 1],
              }}
              style={{
                height: "100%",
                background: "linear-gradient(to right, #B4763A, var(--text))",
                position: "absolute",
                top: 0,
                left: 0,
                boxShadow: "0 0 12px rgba(180,118,58,0.6)",
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
