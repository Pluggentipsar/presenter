"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { EditableText, GhostHandle } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface RotatingStatementProps {
  /** Text före det roterande ordet, t.ex. "Vi behöver lära". */
  prefix?: string;
  /** Comma-separerad lista med roterande ord, t.ex. "med,om,mot,genom,trots". */
  words?: string;
  /** Text efter det roterande ordet, t.ex. "AI". */
  suffix?: string;
  /** Millisekunder mellan byten. Default 2800. */
  interval?: number;
  /** Kapitel-markör uppe till höger. */
  chapter?: string;
  /** Bakgrund — bild (.png/.jpg) eller video (.mp4). Auto-detekteras via filändelse. */
  background?: string;
  /** Tvinga bakgrundstyp om auto-detection blir fel. */
  backgroundType?: "image" | "video";
  /** Accent-färg för roterande ord. Default orange. */
  accent?: string;
  /** Overlay-opacitet för bakgrunden (0-1). Default 0.5. */
  overlay?: number;
}

function parseWords(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,·|]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return /\.(mp4|webm|mov|mkv|m4v|ogv)$/.test(lower);
}

/**
 * Stor typografisk slide där ett ord roterar mellan flera varianter.
 * Perfekt för pedagogiska rörelser: "Vi behöver lära MED/OM/MOT/GENOM/TROTS AI".
 *
 * Det roterande ordet fade:ar + glider in vertikalt mellan varianter.
 * Prefix och suffix ligger fasta i stort typsnitt ovan och nedanför.
 */
export function RotatingStatement({
  prefix,
  words,
  suffix,
  interval = 2800,
  chapter,
  background,
  backgroundType,
  accent = "var(--accent)",
  overlay = 0.5,
}: RotatingStatementProps) {
  const wordList = useMemo(() => parseWords(words), [words]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (wordList.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % wordList.length);
    }, interval);
    return () => clearInterval(timer);
  }, [wordList.length, interval]);

  const currentWord = wordList[index] ?? "";
  const isVideo =
    backgroundType === "video" ||
    (backgroundType !== "image" && background != null && isVideoUrl(background));
  // När en bild/video ligger bakom texten behövs en mörk scrim för läsbarhet,
  // och då ska texten vara fast ljus oavsett tema. Utan bakgrund följer texten temat.
  const hasMedia = Boolean(background);
  const primaryText = hasMedia ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = hasMedia ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const dotIdle = hasMedia ? "rgba(245,246,250,0.25)" : "rgba(0,0,0,0.14)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Bakgrund */}
      {background ? (
        isVideo ? (
          <video
            src={background}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )
      ) : null}

      {/* Overlay för läsbarhet — bara när en bild/video ligger bakom texten */}
      {hasMedia ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(0,0,0,${overlay * 0.8}) 0%, rgba(0,0,0,${overlay}) 50%, rgba(0,0,0,${overlay * 1.1}) 100%)`,
          }}
        />
      ) : null}

      {/* Chapter-markör */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            zIndex: 3,
          }}
        >
          <GhostHandle path="chapter" label="+ kapitel" />
        </div>
      )}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          zIndex: 2,
          gap: "clamp(0.8rem, 1.6vh, 1.5rem)",
        }}
      >
        {prefix ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: primaryText,
              textAlign: "center",
              textShadow: hasMedia ? "0 4px 24px rgba(0,0,0,0.5)" : "none",
              margin: 0,
            }}
          >
            <EditableText path="prefix" value={prefix}>
              {prefix}
            </EditableText>
          </motion.div>
        ) : (
          <GhostHandle path="prefix" label="+ prefix" placeholder="T.ex. Vi behöver lära" />
        )}

        {/* Roterande ord */}
        <div
          style={{
            position: "relative",
            height: "clamp(5rem, 12vw, 12rem)",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord + index}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "clamp(5rem, 12vw, 13rem)",
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: accent,
                textTransform: "uppercase",
                textShadow: `0 8px 40px ${withAlpha(accent, 0.33)}, 0 0 80px ${withAlpha(accent, 0.2)}`,
                margin: 0,
              }}
            >
              {currentWord}
            </motion.div>
          </AnimatePresence>
        </div>

        {suffix ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: primaryText,
              textAlign: "center",
              textShadow: hasMedia ? "0 4px 24px rgba(0,0,0,0.5)" : "none",
              margin: 0,
            }}
          >
            <EditableText path="suffix" value={suffix}>
              {suffix}
            </EditableText>
          </motion.div>
        ) : (
          <GhostHandle path="suffix" label="+ suffix" placeholder="T.ex. AI" />
        )}

        {/* Progress-indikator: en liten prick per ord */}
        {wordList.length > 1 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "clamp(1.5rem, 3vh, 3rem)",
            }}
          >
            {wordList.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === index ? "1.5rem" : "0.5rem",
                  height: "0.25rem",
                  borderRadius: "2px",
                  background: i === index ? accent : dotIdle,
                  transition: "all 0.4s ease",
                }}
              />
            ))}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
