"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useInlineEdit, EditableText } from "@/lib/inline-edit";
import { useIsOverlay, useOverlayInstance } from "./SlideWithOverlays";

/**
 * FloatingAudio — frittflyttande ljudspelare som overlay på en slide.
 *
 * Designad i Memphis-stil med chunky play-button och caption ovanför.
 * Lägg som overlay efter en huvudkomponent (t.ex. IdeaGrid) — den ligger
 * då ovanpå föregående slide. Komponenten är registrerad i OVERLAY_TAGS
 * (`src/lib/mdx-parser.ts`).
 *
 * Edit-mode:
 *   - Klicka → markeras (outline + delete-knapp i edit-mode)
 *   - Caption/sublabel kan redigeras inline via dubbelklick
 *
 * MDX-format:
 * ```mdx
 * <FloatingAudio
 *   src="/bilder/foo/ljud.mp3"
 *   x="70%" y="40%" width="280px"
 *   caption="🎙️ Lyssna"
 *   sublabel="Är det Zlatan?"
 * />
 * ```
 */

interface FloatingAudioProps {
  /** Ljud-URL — lokalt path (.mp3/.wav/.m4a) eller direkt URL. */
  src: string;
  /** Horisontell position som procent eller px. Default "70%". */
  x?: string;
  /** Vertikal position som procent eller px. Default "40%". */
  y?: string;
  /** Bredd i px eller procent. Default "280px". */
  width?: string;
  /** Rotation i grader. Default -2. */
  rotation?: number;
  /** Caption ovanför knappen. */
  caption?: string;
  /** Mindre text under caption — t.ex. en utmaning eller fråga. */
  sublabel?: string;
  /** Accentfärg på play-knappen. Default Memphis-rosa. */
  accent?: string;
  /** Z-index. Default 10. */
  zIndex?: number;
}

export function FloatingAudio({
  src,
  x = "70%",
  y = "40%",
  width = "280px",
  rotation = -2,
  caption,
  sublabel,
  accent = "#EF4F8F",
  zIndex = 10,
}: FloatingAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(false);

  const { editMode } = useInlineEdit();
  const isOverlay = useIsOverlay();
  const overlayInstance = useOverlayInstance();
  const onDelete = overlayInstance.onDelete;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onTime = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, []);

  // Klicka utanför för att deselect i edit-mode.
  useEffect(() => {
    if (!editMode) {
      setSelected(false);
      return;
    }
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editMode]);

  const toggle = () => {
    if (editMode) return; // Spela inte upp i edit-mode
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const onWrapperClick = (e: React.MouseEvent) => {
    if (editMode) {
      e.stopPropagation();
      setSelected(true);
    }
  };

  return (
    <motion.div
      ref={wrapperRef}
      initial={{ opacity: 0, scale: 0.94, rotate: rotation - 2 }}
      animate={{ opacity: 1, scale: 1, rotate: rotation }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onClick={onWrapperClick}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        zIndex,
        transformOrigin: "center center",
        pointerEvents: "auto",
        outline: editMode && selected ? "2px dashed " + accent : "none",
        outlineOffset: "8px",
      }}
    >
      {caption ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
            color: "var(--text)",
            textAlign: "center",
            marginBottom: "0.65rem",
            lineHeight: 1.1,
          }}
        >
          <EditableText path="caption" value={caption}>{caption}</EditableText>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausa" : "Spela"}
        disabled={editMode}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          width: "100%",
          padding: "0.9rem 1.15rem",
          background: "var(--bg-surface, #FFFFFF)",
          border: "var(--card-border, 3px solid #1A1A1A)",
          borderRadius: "var(--radius, 0.75rem)",
          boxShadow: "var(--card-shadow, 6px 6px 0 #1A1A1A)",
          cursor: editMode ? "default" : "pointer",
          fontFamily: "var(--font-body)",
          color: "var(--text)",
          transition: "transform 0.12s ease",
        }}
        onMouseDown={(e) => {
          if (editMode) return;
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translate(2px, 2px)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "";
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "clamp(2.6rem, 3.4vw, 3.4rem)",
            height: "clamp(2.6rem, 3.4vw, 3.4rem)",
            borderRadius: "50%",
            background: accent,
            color: "#FFFFFF",
            border: "var(--card-border, 3px solid #1A1A1A)",
            flexShrink: 0,
          }}
        >
          {playing ? (
            <svg width="38%" height="38%" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" />
              <rect x="8" y="0" width="4" height="14" />
            </svg>
          ) : (
            <svg width="42%" height="42%" viewBox="0 0 12 14" fill="currentColor">
              <polygon points="0,0 12,7 0,14" />
            </svg>
          )}
        </span>

        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
              lineHeight: 1.1,
            }}
          >
            {playing ? "Pausa" : "Spela"}
          </div>
          {sublabel ? (
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
                color: "var(--text-muted)",
                fontWeight: 500,
                marginTop: "0.15rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <EditableText path="sublabel" value={sublabel}>{sublabel}</EditableText>
            </div>
          ) : null}
          <div
            style={{
              marginTop: "0.4rem",
              height: "4px",
              width: "100%",
              background: "rgba(0,0,0,0.12)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: accent,
                transition: "width 0.15s linear",
              }}
            />
          </div>
        </div>
      </button>

      {/* Delete-knapp i edit-mode när overlayen är markerad */}
      {editMode && isOverlay && selected && onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Ta bort ljudspelaren"
          style={{
            position: "absolute",
            top: "-14px",
            right: "-14px",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#1A1A1A",
            color: "#FFFFFF",
            border: "2px solid #FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            lineHeight: 1,
            padding: 0,
            zIndex: 20,
          }}
        >
          ×
        </button>
      ) : null}

      <audio ref={audioRef} src={src} preload="metadata" />
    </motion.div>
  );
}

export default FloatingAudio;
