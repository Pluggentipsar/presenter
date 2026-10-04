"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { EditableText } from "@/lib/inline-edit";

interface AiArMediaProps {
  /** Lokal videopath (mp4). Om satt ger det manuell play-knapp. */
  video?: string;
  /** Bild-path. Om satt visas bild med click-to-zoom. */
  image?: string;
  /** Alt-text för bild */
  alt?: string;
  /** Liten text under mediet */
  caption?: string;
  /** Label uppe till vänster — default "AI är…" */
  label?: string;
  /** Mål-aspect för mediarutan — default 16/9 för video, auto för bild */
  aspectRatio?: string;
}

/**
 * Återkommande mall för "AI är…"-sektionen. Hanterar både video (manuell
 * play) och bild (klick-för-förstor). "AI är…" hamnar konsekvent top-left
 * för att fungera som visuellt ankare över flera slides i rad.
 */
export function AiArMedia({
  video,
  image,
  alt = "",
  caption,
  label = "AI är…",
  aspectRatio,
}: AiArMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        // Om unmuted play blockeras: spela mutat i stället (alltid tillåtet).
        p.catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    } else {
      v.pause();
    }
  }

  const isVideo = Boolean(video);
  const effectiveAspect = aspectRatio ?? (isVideo ? "16 / 9" : undefined);

  return (
    <div
      className="relative h-full w-full flex flex-col"
      style={{
        background: "var(--slide-base, var(--bg))",
        color: "var(--text)",
        padding: "clamp(2.5rem, 4vw, 4rem)",
        overflow: "hidden",
      }}
    >
      <AiArBackdrop />

      {/* AI är… top-left anchor */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <AiArLabel>{label}</AiArLabel>
      </div>

      {/* Media-area */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col items-center justify-center"
        style={{ minHeight: 0, marginTop: "0.5rem", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "min(92%, 1200px)",
            maxHeight: "100%",
            width: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isVideo ? (
            <div style={{ position: "relative" }}>
              <Spotlight />
              <div
              onClick={togglePlay}
              style={{
                position: "relative",
                width: "min(92vw, 1100px)",
                aspectRatio: effectiveAspect,
                borderRadius: "0.75rem",
                overflow: "hidden",
                background: "var(--bg-elevated, var(--bg-surface))",
                boxShadow:
                  "0 40px 80px -20px rgba(0,0,0,0.7), 0 20px 30px -10px var(--accent-glow, rgba(0,0,0,0.25))",
                zIndex: 1,
                cursor: "pointer",
              }}
            >
              <video
                ref={videoRef}
                src={video}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                className="h-full w-full object-cover"
              />
              {!playing ? (
                <div
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: "rgba(10,9,8,0.2)",
                    pointerEvents: "none",
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: "clamp(70px, 8vw, 110px)",
                      height: "clamp(70px, 8vw, 110px)",
                      borderRadius: "9999px",
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 14px 36px var(--accent-glow, rgba(0,0,0,0.4)), 0 0 0 6px rgba(255,255,255,0.18)",
                    }}
                  >
                    <svg
                      width="38%"
                      height="42%"
                      viewBox="0 0 24 24"
                      fill="rgba(245,246,250,0.92)"
                      style={{ marginLeft: "10%" }}
                    >
                      <path d="M6 4 L20 12 L6 20 Z" />
                    </svg>
                  </motion.span>
                </div>
              ) : null}
            </div>
            </div>
          ) : image ? (
            <div style={{ position: "relative" }}>
              <Spotlight />
              <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Förstora bild"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "zoom-in",
                borderRadius: "0.75rem",
                overflow: "hidden",
                boxShadow:
                  "0 40px 80px -20px rgba(0,0,0,0.7), 0 20px 30px -10px var(--accent-glow, rgba(0,0,0,0.25))",
                display: "block",
                position: "relative",
                zIndex: 1,
              }}
            >
              <img
                src={image}
                alt={alt}
                style={{
                  display: "block",
                  maxWidth: "min(90vw, 1000px)",
                  maxHeight: "78vh",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </button>
            </div>
          ) : null}
        </div>

        {caption ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
              color: "var(--text)",
              margin: "1.25rem 0 0 0",
              letterSpacing: "0.02em",
            }}
          >
            <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
          </motion.p>
        ) : null}
      </motion.div>

      {/* Zoom-overlay för bild */}
      <AnimatePresence>
        {zoomed && image ? (
          <motion.button
            key="zoom"
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Stäng förstorad bild"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(10,9,8,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "zoom-out",
              padding: "3vw",
            }}
          >
            <motion.img
              src={image}
              alt={alt}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{
                maxWidth: "94vw",
                maxHeight: "94vh",
                objectFit: "contain",
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                borderRadius: "0.5rem",
              }}
            />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Spotlight — ett mjukt, pulserande ljus som placeras bakom ett
 * media-objekt (video/bild/chattfönster). Spiller ut över objektets
 * kanter så att det "lyser upp" omgivningen; opaciteten andas långsamt
 * i ett mönster som flashar in och sedan sjunker tillbaka.
 */
export function Spotlight({
  color = "var(--accent-glow, rgba(255,255,255,0.5))",
  size = 90,
  delay = 0,
}: {
  color?: string;
  size?: number;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.15, 0.7, 0.35, 0.55, 0.35] }}
      transition={{
        duration: 7,
        times: [0, 0.14, 0.45, 0.72, 1],
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        top: -size,
        left: -size,
        right: -size,
        bottom: -size,
        background: `radial-gradient(ellipse, ${color} 0%, transparent 62%)`,
        filter: "blur(42px)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/**
 * Subtil animerad bakgrund för AI-är-sektionen. Tre långsamt drivande
 * färgblobbar i palettens toner — ger liv utan att dra fokus.
 */
export function AiArBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <motion.div
        animate={{ x: [-40, 60, -40], y: [-30, 50, -30], scale: [1, 1.1, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "8%",
          left: "6%",
          width: "58vmin",
          height: "58vmin",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, var(--accent-glow, rgba(255,255,255,0.18)) 0%, transparent 65%)",
          filter: "blur(30px)",
        }}
      />
      <motion.div
        animate={{ x: [30, -50, 30], y: [40, -20, 40], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          bottom: "6%",
          right: "4%",
          width: "52vmin",
          height: "52vmin",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, var(--accent-dim, rgba(255,255,255,0.08)) 0%, transparent 60%)",
          filter: "blur(28px)",
        }}
      />
      <motion.div
        animate={{
          x: [-20, 40, -20],
          y: [10, -30, 10],
          opacity: [0.08, 0.18, 0.08],
        }}
        transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "38%",
          right: "22%",
          width: "36vmin",
          height: "36vmin",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, var(--accent-glow, rgba(255,255,255,0.12)) 0%, transparent 70%)",
          filter: "blur(22px)",
        }}
      />
      {/* Glesa partiklar som driver uppåt */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.span
          key={i}
          animate={{
            y: [0, -40, 0],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{
            duration: 8 + i * 1.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.6,
          }}
          style={{
            position: "absolute",
            top: `${15 + ((i * 11) % 70)}%`,
            left: `${10 + ((i * 13) % 80)}%`,
            width: "6px",
            height: "6px",
            borderRadius: "9999px",
            background: "var(--text-muted)",
            boxShadow: "0 0 8px rgba(247,241,230,0.4)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Intern "AI är…"-label som återanvänds som visuellt ankare i flera slides.
 */
export function AiArLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: "clamp(1.4rem, 2.3vw, 2.1rem)",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "var(--text)",
        display: "inline-flex",
        alignItems: "baseline",
      }}
    >
      <span>{String(children).replace(/…|\.\.\./g, "")}</span>
      <span style={{ color: "#B4763A", marginLeft: "0.06em" }}>…</span>
    </motion.div>
  );
}
