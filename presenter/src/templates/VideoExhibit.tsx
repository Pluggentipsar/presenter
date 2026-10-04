"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * VideoExhibit — en video i en editorial "galleri-ram" på en mörk, andande
 * scen. Tänkt för ett ögonblick där videon ÄR poängen (en låt, en dans, ett
 * mänskligt verk). Klick var som helst på ramen spelar/pausar — med ljud,
 * eftersom det är ett klick (user gesture). Kan börja vid en given sekund
 * (`startTime`) så man hoppar över ett stilla intro.
 *
 * ```mdx
 * <VideoExhibit
 *   chapter="§ Det som skaver"
 *   src="/bilder/folkhogskola/gener8ion.mp4"
 *   startTime={20}
 *   title="GENER8ION"
 *   credit="Yung Lean · STORM II"
 *   caption="AI kan kopiera varje ton. Inte att någon menade det."
 * />
 * ```
 */

interface VideoExhibitProps {
  src: string;
  /** Sekund att börja vid (hoppa över stilla intro). Default 0. */
  startTime?: number | string;
  chapter?: string;
  kicker?: string;
  /** Stort verk-namn på placard, t.ex. "GENER8ION". */
  title?: string;
  /** Upphovsrad, t.ex. "Yung Lean · STORM II". */
  credit?: string;
  /** Liten kursiv rad under ramen. */
  caption?: string;
  accent?: string;
  background?: string;
  aspectRatio?: string;
  loop?: boolean;
}

/**
 * Bakgrunden är en garanterad "mörk-scen" bara när ett foto skickas in — då
 * lägger vi en mörk scrim ovanpå för läsbarhet, så texten måste bli fast-ljus
 * oavsett tema. Utan foto följer scenen temat (ljus på dagsljus, mörk på
 * nattglas) och texten ska följa --text/--text-muted så den blir mörk på ljus.
 */
function isPhotoBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

function resolveBackground(bg: string | undefined): string {
  const fallback =
    "radial-gradient(ellipse 80% 70% at 50% 45%, var(--bg-surface) 0%, var(--bg) 75%)";
  if (!bg) return fallback;
  if (isPhotoBackground(bg))
    return `linear-gradient(rgba(6,7,12,0.72), rgba(6,7,12,0.86)), url('${bg}') center/cover no-repeat`;
  return bg;
}

export function VideoExhibit({
  src,
  startTime = 0,
  chapter,
  kicker,
  title,
  credit,
  caption,
  accent = "var(--accent)",
  background,
  aspectRatio = "16 / 9",
  loop = false,
}: VideoExhibitProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const startNum =
    typeof startTime === "string" ? parseFloat(startTime) : startTime;

  // Stående format (telefoninspelning, Suno-export) behöver motsatt
  // storleksstyrning mot liggande — se ramen nedan.
  const isPortrait = (() => {
    const m = /^\s*([\d.]+)\s*[/:]\s*([\d.]+)\s*$/.exec(aspectRatio);
    if (!m) return false;
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    return h > 0 && w / h < 1;
  })();

  // Texten sitter på en mörk scrim bara när ett foto (eller annan custom-bg)
  // ligger bakom. Då måste text/captions vara fast-ljusa oavsett tema.
  // Annars följer scenen temat och texten ska följa --text/--text-muted.
  const onDarkBg = isPhotoBackground(background);
  const textColor = onDarkBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDarkBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  // Sök till startTime när metadata laddats — så poster-framen blir rätt
  // ställe och uppspelningen börjar där.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const seek = () => {
      if (startNum > 0 && v.currentTime < startNum) {
        try {
          v.currentTime = startNum;
        } catch {
          /* ignore */
        }
      }
    };
    if (v.readyState >= 1) seek();
    v.addEventListener("loadedmetadata", seek);
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [startNum, src]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (startNum > 0 && v.currentTime < startNum) {
        try {
          v.currentTime = startNum;
        } catch {
          /* ignore */
        }
      }
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{
        background: resolveBackground(background),
        color: textColor,
        padding: "clamp(2.1rem, 4vw, 3.8rem)",
      }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.4rem)",
            right: "clamp(2rem, 4vw, 3.4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 5,
          }}
        >
          {chapter}
        </div>
      ) : null}
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.9rem, 2vh, 1.6rem)",
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {kicker}
          </motion.div>
        ) : null}

        {/* ram */}
        <motion.div
          onClick={toggle}
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            // Stående video måste styras av HÖJDEN. En 9:16-ram som får
            // 62vw blir dubbelt så hög som sliden, och layouten svarar med
            // att krympa den till en frimärksstor ruta. Liggande video
            // fortsätter styras av bredden som förut.
            ...(isPortrait
              ? { height: "min(74vh, 44rem)", width: "auto" }
              : { width: "min(62vw, 980px)", maxWidth: "100%" }),
            padding: "clamp(0.4rem, 0.6vw, 0.7rem)",
            borderRadius: "0.8rem",
            background: "var(--bg-surface)",
            border: `1px solid ${withAlpha(accent, 0.4)}`,
            boxShadow: `0 40px 90px -20px rgba(0,0,0,0.7), 0 0 90px ${withAlpha(accent, 0.14)}`,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "relative",
              ...(isPortrait ? { height: "100%" } : { width: "100%" }),
              aspectRatio,
              borderRadius: "0.5rem",
              overflow: "hidden",
              background: "#000",
            }}
          >
            <video
              ref={videoRef}
              src={src}
              loop={loop}
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              className="h-full w-full"
              style={{ objectFit: "cover", display: "block" }}
            />

            {/* play-knapp när pausad */}
            {!playing ? (
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: "rgba(6,7,12,0.28)",
                  pointerEvents: "none",
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: "clamp(64px, 7vw, 96px)",
                    height: "clamp(64px, 7vw, 96px)",
                    borderRadius: "9999px",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 14px 36px ${withAlpha(accent, 0.5)}, 0 0 0 6px rgba(255,255,255,0.16)`,
                  }}
                >
                  <svg
                    width="36%"
                    height="40%"
                    viewBox="0 0 24 24"
                    fill="#0a0908"
                    style={{ marginLeft: "10%" }}
                  >
                    <path d="M6 4 L20 12 L6 20 Z" />
                  </svg>
                </motion.span>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* placard */}
        {title || credit ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.2rem",
              textAlign: "center",
            }}
          >
            {title ? (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(1.15rem, 1.8vw, 1.7rem)",
                  letterSpacing: "0.02em",
                  color: textColor,
                }}
              >
                {title}
              </div>
            ) : null}
            {credit ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.66rem, 0.85vw, 0.82rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: mutedColor,
                }}
              >
                {credit}
              </div>
            ) : null}
          </motion.div>
        ) : null}

        {caption ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
              color: textColor,
              maxWidth: "34em",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {caption}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
