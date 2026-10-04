"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Lightbox } from "./Lightbox";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * PromptToImage — animerad bildgenerering.
 *
 * Visar en chat-input-style ruta där prompten skrivs ut bokstav för bokstav,
 * därefter "genereras" bilden via en diffusions-stil-animering: börjar blurrad
 * och desaturerad, klarnar i flera steg.
 *
 * MDX-format:
 * ```mdx
 * <PromptToImage
 *   chapter="§ Bias · Demo"
 *   prompt="Skapa en bild på en ultramanlig lärare"
 *   image="/bilder/kritisk-ai-litteracitet/ultramanlig.png"
 *   accent= "var(--accent)"
 * />
 * ```
 */

interface PromptToImageProps {
  /** Prompt-texten som skrivs ut bokstav för bokstav. */
  prompt: string;
  /** URL till bilden som "genereras". */
  image: string;
  /** Chapter-tagg. */
  chapter?: string;
  /** Bakgrund. */
  background?: string;
  /** Mörk overlay (0-1). Default 0.65. */
  overlay?: number;
  /** Accent-färg. */
  accent?: string;
  /** Etikett ovanför chat-rutan (typ "ChatGPT" eller "Midjourney"). */
  modelLabel?: string;
  /** Hastighet på typewriter (ms per tecken). Default 35. */
  typingSpeed?: number | string;
  /** Fördröjning innan typewriter startar (ms). Default 600. */
  initialDelay?: number | string;
  /** Fördröjning efter prompt klar innan bilden börjar genereras (ms). Default 600. */
  imageDelay?: number | string;
  /** Hur länge bildens "diffusion"-animering tar (ms). Default 2400. */
  diffusionDuration?: number | string;
  /** Alt-text. */
  alt?: string;
  /** Bildramens aspect-ratio (CSS-syntax). Default "1 / 1". Använd t.ex. "16/9" för breda bilder. */
  aspectRatio?: string;
  /** object-fit för bilden. Default "cover". Sätt till "contain" för att se hela bilden utan beskärning. */
  imageFit?: "cover" | "contain";
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function PromptToImage({
  prompt,
  image,
  chapter,
  background,
  overlay = 0.6,
  accent = "var(--accent)",
  modelLabel = "ChatGPT · Bildgenerering",
  typingSpeed = 35,
  initialDelay = 600,
  imageDelay = 600,
  diffusionDuration = 2400,
  alt = "AI-genererad bild",
  aspectRatio = "1 / 1",
  imageFit = "cover",
}: PromptToImageProps) {
  const typingSpeedNum =
    typeof typingSpeed === "string" ? parseInt(typingSpeed, 10) : typingSpeed;
  const initialDelayNum =
    typeof initialDelay === "string"
      ? parseInt(initialDelay, 10)
      : initialDelay;
  const imageDelayNum =
    typeof imageDelay === "string" ? parseInt(imageDelay, 10) : imageDelay;
  const diffusionDurationSec =
    (typeof diffusionDuration === "string"
      ? parseInt(diffusionDuration, 10)
      : diffusionDuration) / 1000;

  const [charsShown, setCharsShown] = useState(0);
  const [imageStarted, setImageStarted] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Starta först när sliden faktiskt syns — inte under in-/uttransition.
  // Annars hinner typewritern bli klar innan publiken ser sliden.
  useEffect(() => {
    const el = rootRef.current;
    // Fallback: starta ändå strax efter mount, ifall observern inte triggar
    // (t.ex. i editor-previewns skalade container). På live tar observern över.
    const fallback = setTimeout(() => setVisible(true), 500);
    if (!el || typeof IntersectionObserver === "undefined") {
      return () => clearTimeout(fallback);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e && e.isIntersecting && e.intersectionRatio > 0.2) {
          clearTimeout(fallback);
          setVisible(true);
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    obs.observe(el);
    return () => {
      clearTimeout(fallback);
      obs.disconnect();
    };
  }, []);

  // Typewriter-animering — nollställs och spelas om varje gång sliden blir synlig.
  useEffect(() => {
    if (!visible) {
      setCharsShown(0);
      setImageStarted(false);
      return;
    }
    const startTimer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setCharsShown((c) => {
          if (c >= prompt.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return c;
          }
          return c + 1;
        });
      }, typingSpeedNum);
    }, initialDelayNum);
    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, prompt, typingSpeedNum, initialDelayNum]);

  // När prompt är fullt ut skriven — vänta imageDelay, börja diffusion
  useEffect(() => {
    if (charsShown < prompt.length) return;
    const timer = setTimeout(() => {
      setImageStarted(true);
    }, imageDelayNum);
    return () => clearTimeout(timer);
  }, [charsShown, prompt.length, imageDelayNum]);

  return (
    <div
      ref={rootRef}
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

      {/* Stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          padding: "clamp(4rem, 8vh, 6rem) clamp(3rem, 6vw, 6rem)",
          zIndex: 2,
        }}
      >
        {/* Prompt-rutan */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "min(820px, 80%)",
            background: "rgba(20,18,16,0.78)",
            border: "1px solid rgba(247,241,230,0.12)",
            borderRadius: "0.85rem",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            overflow: "hidden",
          }}
        >
          {/* Brand-bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0.65rem 1rem",
              borderBottom: "1px solid rgba(247,241,230,0.06)",
            }}
          >
            <div
              style={{
                width: "1.4rem",
                height: "1.4rem",
                borderRadius: "50%",
                background: accent,
                color: "rgba(245,246,250,0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "rgba(245,246,250,0.92)",
                letterSpacing: "0.01em",
              }}
            >
              {modelLabel}
            </span>
          </div>

          {/* Prompt-input */}
          <div
            style={{
              padding: "1.1rem 1.3rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
              lineHeight: 1.4,
              color: "rgba(245,246,250,0.92)",
              minHeight: "3.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: `${accent}`, fontWeight: 600 }}>{">"}</span>
            <span>
              {prompt.slice(0, charsShown)}
              {charsShown < prompt.length ? (
                <span
                  style={{
                    display: "inline-block",
                    width: "0.55rem",
                    height: "1.2em",
                    background: accent,
                    marginLeft: "2px",
                    verticalAlign: "middle",
                    animation: "prompt-blink 1s steps(2) infinite",
                  }}
                />
              ) : null}
            </span>
          </div>
        </motion.div>

        {/* Bild — diffunderar in, klickbar för förstoring när färdig */}
        <button
          type="button"
          onClick={() => {
            if (imageStarted) setLightboxOpen(true);
          }}
          disabled={!imageStarted}
          aria-label={imageStarted ? "Förstora bilden" : undefined}
          style={{
            all: "unset",
            position: "relative",
            width: "min(560px, 60%)",
            aspectRatio,
            background: "rgba(20,18,16,0.5)",
            border: "1px solid rgba(247,241,230,0.08)",
            borderRadius: "0.85rem",
            overflow: "hidden",
            boxShadow: imageStarted
              ? `0 24px 60px rgba(0,0,0,0.55), 0 0 80px ${withAlpha(accent, 0.13)}`
              : "0 12px 30px rgba(0,0,0,0.3)",
            transition: "box-shadow 300ms ease, transform 300ms ease",
            cursor: imageStarted ? "zoom-in" : "default",
          }}
          onMouseEnter={(e) => {
            if (!imageStarted) return;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 32px 80px rgba(0,0,0,0.6), 0 0 100px ${withAlpha(accent, 0.27)}`;
          }}
          onMouseLeave={(e) => {
            if (!imageStarted) return;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 24px 60px rgba(0,0,0,0.55), 0 0 80px ${withAlpha(accent, 0.13)}`;
          }}
        >
          {/* Pulserande "generating"-overlay innan bilden börjar */}
          {!imageStarted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(135deg, ${withAlpha(accent, 0.07)}, transparent 30%, ${withAlpha(accent, 0.07)} 70%, transparent)`,
                pointerEvents: "none",
              }}
            />
          ) : null}

          {/* Själva bilden — diffusion-animering */}
          {imageStarted ? (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img data-keep-color=""
              src={image}
              alt={alt}
              initial={{
                opacity: 0.15,
                filter: "blur(40px) saturate(0.2) brightness(0.6)",
              }}
              animate={{
                opacity: [0.15, 0.55, 0.85, 1],
                filter: [
                  "blur(40px) saturate(0.2) brightness(0.6)",
                  "blur(20px) saturate(0.55) brightness(0.85)",
                  "blur(8px) saturate(0.85) brightness(0.95)",
                  "blur(0px) saturate(1) brightness(1)",
                ],
              }}
              transition={{
                duration: diffusionDurationSec,
                times: [0, 0.35, 0.7, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: imageFit,
                display: "block",
              }}
            />
          ) : null}

          {/* Zoom-hint som tonas in när bilden är klar */}
          {imageStarted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: diffusionDurationSec + 0.2 }}
              aria-hidden
              style={{
                position: "absolute",
                bottom: "0.6rem",
                right: "0.6rem",
                padding: "0.3rem 0.55rem",
                borderRadius: "0.4rem",
                background: "rgba(10,9,8,0.62)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(245,246,250,0.6)",
                pointerEvents: "none",
              }}
            >
              ⤢ Klicka för att förstora
            </motion.div>
          ) : null}
        </button>
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        image={image}
        caption={prompt}
      />

      <style>{`
        @keyframes prompt-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
