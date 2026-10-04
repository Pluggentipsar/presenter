"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { useInlineEdit, EditableText } from "@/lib/inline-edit";
import { useIsOverlay, useOverlayInstance } from "./SlideWithOverlays";
import { useObjectStep } from "./object-step";

/**
 * FloatingVideo — fritt placerad video ovanpå en slide (eller som egen slide).
 *
 * Speglar FloatingImage: renderar `<video>` för lokala MP4/WEBM/MOV-filer och
 * direkt-URL:er, samt `<iframe>` för YouTube- och Vimeo-URL:er. Flytt, storlek
 * och egenskaper sköts av editorns objektlager (components/editor/ObjectLayer)
 * via data-object-index.
 *
 * I edit-mode är video-controls inaktiverade så drag inte krockar med play/paus.
 *
 * I presenter-läget:
 *   - Video autoplayar muted+loopad (typiskt användningsfall för filmklipp)
 *   - Controls visas vid behov (om showControls=true)
 *
 * MDX-format:
 * ```mdx
 * <FloatingVideo
 *   src="/videos/min-video.mp4"
 *   x="20%" y="30%" width="380px"
 *   rotation={-2}
 * />
 *
 * <FloatingVideo
 *   src="https://youtu.be/dQw4w9WgXcQ"
 *   x="50%" y="40%" width="480px"
 * />
 * ```
 */

interface FloatingVideoProps {
  /** Video-URL — lokalt path (.mp4/.webm/.mov), direkt URL, eller YouTube/Vimeo-URL. */
  src: string;
  /** Horisontell position som procent eller px. */
  x?: string;
  /** Vertikal position som procent eller px. */
  y?: string;
  /** Bredd i px eller procent. */
  width?: string;
  /** Höjd (valfri — bryter aspect ratio om angiven). */
  height?: string;
  /** Rotation i grader. Default 0. */
  rotation?: number;
  /** Opacitet 0-1. Default 1. */
  opacity?: number;
  /** Z-index. Default 10. */
  zIndex?: number;
  /**
   * Layer:
   * - "front" (default) — videon ligger över template-content (zIndex 10)
   * - "back" — videon ligger UNDER template-content men över bakgrunden (zIndex 1)
   */
  layer?: "front" | "back";
  /** Slide-bakgrund vid standalone-läge. */
  background?: string;
  /** Mörk overlay på bakgrunden (0-1). Default 0. */
  overlay?: number;
  /** Liten chapter-tagg uppe till höger. */
  chapter?: string;
  /** Accentfärg. */
  accent?: string;
  /** Stäng av drop-shadow. */
  noShadow?: boolean;
  /** Visa native player-controls i presenter-läget. Default true. */
  showControls?: boolean;
  /** Autoplay i presenter-läget. Default true. */
  autoplay?: boolean;
  /** Loopa video i presenter-läget. Default true. */
  loop?: boolean;
  /** Mute (krävs för autoplay i de flesta browsers). Default true. */
  muted?: boolean;
  /** Poster-bild (visas innan video laddat). */
  poster?: string;
  /** Hörnradie (CSS-längd). */
  radius?: string;
  /** Syns efter så många klick (0 eller inget = från början). */
  step?: number | string;
  /** Försvinner vid det här klicket. */
  until?: number | string;
  /** Låst i editorn: går inte att flytta av misstag. */
  locked?: boolean;
  /** Namn i editorns lagerlista. */
  name?: string;
}

interface EmbedInfo {
  kind: "video" | "iframe";
  /** URL för rendering (kan vara ombyggd för YouTube/Vimeo embeds). */
  src: string;
}

/**
 * Detektera om src är YouTube/Vimeo och bygg embed-URL.
 * Returnerar `{ kind: "video", src }` för allt annat (lokala filer, direkt-URL:er).
 */
function resolveEmbed(
  src: string,
  { autoplay, loop, muted }: { autoplay: boolean; loop: boolean; muted: boolean },
): EmbedInfo {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/.exec(src);
  if (ytMatch) {
    const id = ytMatch[1];
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: muted ? "1" : "0",
      controls: "1",
      modestbranding: "1",
      rel: "0",
    });
    if (loop) {
      params.set("loop", "1");
      params.set("playlist", id); // krävs för loop på single video
    }
    return { kind: "iframe", src: `https://www.youtube.com/embed/${id}?${params.toString()}` };
  }
  // Vimeo: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      muted: muted ? "1" : "0",
      loop: loop ? "1" : "0",
    });
    return { kind: "iframe", src: `https://player.vimeo.com/video/${id}?${params.toString()}` };
  }
  return { kind: "video", src };
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "transparent";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    if (overlay > 0) {
      return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.06)})), url('${bg}') center/cover no-repeat`;
    }
    return `url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function FloatingVideo({
  src,
  x = "20%",
  y = "20%",
  width = "20%",
  height,
  rotation = 0,
  opacity = 1,
  zIndex,
  layer = "front",
  background,
  overlay = 0,
  chapter,
  accent: _accent,
  noShadow = false,
  showControls = true,
  autoplay = true,
  loop = true,
  muted = true,
  poster,
  radius,
  step,
  until,
  locked,
  name: _name,
}: FloatingVideoProps) {
  void _accent;
  void _name;
  const { editMode } = useInlineEdit();
  const isOverlay = useIsOverlay();
  const { index } = useOverlayInstance();
  const shown = useObjectStep(step, until);

  // Layer styr default-zIndex om inget explicit värde angivits
  const effectiveZIndex = zIndex ?? (layer === "back" ? 1 : 10);

  const embed = useMemo(
    () => resolveEmbed(src, { autoplay, loop, muted }),
    [src, autoplay, loop, muted],
  );

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height: height || "auto",
    transform: `rotate(${rotation}deg)`,
    // Klicksteg: dolt i spelaren, dämpat i editorn så att det går att placera.
    opacity: shown ? opacity : editMode ? 0.3 : 0,
    pointerEvents: shown || editMode ? undefined : "none",
    transition: "opacity 320ms ease",
    zIndex: effectiveZIndex,
    cursor: editMode && !locked ? "grab" : "default",
    userSelect: "none",
    touchAction: "none",
  };

  // I edit-mode: pointer-events:none så objektlagrets drag fungerar utan att
  // krocka med video-controls eller iframe-interaktion.
  // I presenter-läget: pointer-events:auto så användaren kan klicka på controls.
  const innerPointerEvents: CSSProperties["pointerEvents"] = editMode ? "none" : "auto";

  const innerCommon: CSSProperties = {
    display: "block",
    width: "100%",
    height: height ? "100%" : "auto",
    pointerEvents: innerPointerEvents,
    boxShadow: noShadow ? "none" : "0 8px 30px rgba(0,0,0,0.35)",
    borderRadius: radius || (noShadow ? 0 : "0.2rem"),
  };

  const mediaElement =
    embed.kind === "iframe" ? (
      <iframe
        src={embed.src}
        title="Inbäddad video"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={{
          ...innerCommon,
          aspectRatio: height ? undefined : "16 / 9",
          border: "none",
          objectFit: "cover",
        }}
      />
    ) : (
      <video
        src={embed.src}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        controls={!editMode && showControls}
        playsInline
        poster={poster}
        style={{
          ...innerCommon,
          objectFit: "cover",
        }}
      />
    );

  const videoElement = (
    <div
      data-object-index={editMode && isOverlay && index !== undefined ? index : undefined}
      data-object-kind={editMode ? "video" : undefined}
      data-object-locked={editMode && locked ? "" : undefined}
      data-object-hidden={editMode && !shown ? "" : undefined}
      style={wrapperStyle}
    >
      {mediaElement}
    </div>
  );

  // OVERLAY-MODE: bara videon, ingen slide-container.
  if (isOverlay) return videoElement;

  // STANDALONE-MODE: full slide-canvas med bakgrund + chapter-tagg.
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
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
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {videoElement}
    </div>
  );
}
