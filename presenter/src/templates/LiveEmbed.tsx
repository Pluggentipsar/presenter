"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * LiveEmbed — embeddar en URL som iframe i en slide. Bra för Claude
 * Artifacts, Codepen, externa demos, m.m. Visar en "Spela upp"-poster
 * tills användaren klickar — då laddas iframen.
 *
 * MDX-format:
 * ```mdx
 * <LiveEmbed
 *   chapter="§ Dark Patterns · Live"
 *   title="Dark patterns i en chatbot"
 *   description="Klicka för att spela upp den interaktiva demon."
 *   url="https://claude.ai/public/artifacts/..."
 *   accent= "var(--accent)"
 * />
 * ```
 */

interface LiveEmbedProps {
  /** URL att embedda. */
  url: string;
  /** Stor titel ovanför embeden. */
  title?: string;
  /** Beskrivning under titeln. */
  description?: string;
  /** Chapter-tagg. */
  chapter?: string;
  /** Bakgrund. */
  background?: string;
  /** Mörk overlay (0-1) på bakgrund. Default 0.6. */
  overlay?: number;
  /** Accent-färg. */
  accent?: string;
  /** Aspect ratio för embed-frame. Default "16 / 10". */
  aspectRatio?: string;
  /** Auto-ladda iframe direkt (utan klick). Default false. */
  autoload?: boolean | string;
  /** Etikett på play-knappen. Default "Klicka för att spela". */
  playLabel?: string;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function LiveEmbed({
  url,
  title,
  description,
  chapter,
  background,
  overlay = 0.6,
  accent = "var(--accent)",
  aspectRatio = "16 / 10",
  autoload = false,
  playLabel = "Klicka för att spela",
}: LiveEmbedProps) {
  const autoloadBool =
    typeof autoload === "string" ? autoload !== "false" : autoload;
  const [loaded, setLoaded] = useState(autoloadBool);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Titel + description */}
      {title || description ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(4vh, 6vh, 8vh)",
            left: "clamp(3rem, 6vw, 6rem)",
            right: "clamp(3rem, 6vw, 6rem)",
            zIndex: 4,
          }}
        >
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                color: "var(--text)",
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {description ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: "0.5rem 0 0",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
                fontWeight: 400,
                color: "var(--text-muted)",
                maxWidth: "70ch",
              }}
            >
              {description}
            </motion.p>
          ) : null}
        </div>
      ) : null}

      {/* Embed-frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: title ? "clamp(20vh, 24vh, 28vh)" : "clamp(8vh, 12vh, 16vh)",
          bottom: "clamp(4vh, 6vh, 8vh)",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          background: "var(--bg-surface)",
          border: `1px solid ${withAlpha(accent, 0.2)}`,
          borderRadius: "0.85rem",
          boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 80px ${withAlpha(accent, 0.07)}`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
        }}
      >
        <AnimatePresence mode="wait">
          {!loaded ? (
            <motion.button
              key="poster"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.4rem",
                color: "var(--text)",
                fontFamily: "var(--font-display)",
              }}
            >
              {/* Play-cirkel */}
              <motion.div
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: "clamp(5rem, 9vw, 8rem)",
                  height: "clamp(5rem, 9vw, 8rem)",
                  borderRadius: "50%",
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 12px 40px ${withAlpha(accent, 0.4)}, 0 0 80px ${withAlpha(accent, 0.2)}`,
                }}
              >
                <svg
                  width="40%"
                  height="40%"
                  viewBox="0 0 24 24"
                  fill="#0a0908"
                  style={{ marginLeft: "0.3rem" }}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.div>
              <div
                style={{
                  fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "var(--text)",
                }}
              >
                {playLabel}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  maxWidth: "60ch",
                  textAlign: "center",
                  wordBreak: "break-all",
                  padding: "0 1rem",
                }}
              >
                {new URL(url).hostname}
              </div>
            </motion.button>
          ) : (
            <motion.iframe
              key="iframe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              src={url}
              title={title ?? "Embedded artifact"}
              allow="autoplay; encrypted-media; clipboard-read; clipboard-write"
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "#fff",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
