"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableMedia } from "@/lib/inline-edit";

interface VideoBackgroundProps {
  src: string;
  /** Positionering av textblock */
  align?: "top-left" | "center" | "bottom-left" | "bottom-right" | "top-right";
  /** Mörker-overlay över videon (0-1) för läsbarhet */
  overlay?: number | string;
  /** Gradient istället för platt mörkning */
  gradient?: "top" | "bottom" | "left" | "right" | "none";
  /** Blur videon */
  blur?: boolean;
  /** Pausa video (användbart för presentation) */
  paused?: boolean;
  /** Storlek på rubriken. "xl" och "2xl" breddar också container för att texten ska få plats. */
  titleSize?: "default" | "xl" | "2xl" | "3xl";
  children?: ReactNode;
}

/**
 * Video som bakgrund med text-overlay.
 * Lokala .mp4-filer i public/ rekommenderas.
 *
 * Användning:
 * <VideoBackground src="/videos/abstrakt.mp4" align="bottom-left" gradient="bottom">
 *   # Rubrik
 *   Undertext.
 * </VideoBackground>
 */
export function VideoBackground({
  src,
  align = "bottom-left",
  overlay = 0.4,
  gradient = "bottom",
  blur = false,
  paused = false,
  titleSize = "default",
  children,
}: VideoBackgroundProps) {
  const overlayOpacity = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  const alignClass = {
    "top-left": "items-start justify-start text-left",
    "top-right": "items-end justify-start text-right",
    "center": "items-center justify-center text-center",
    "bottom-left": "items-start justify-end text-left",
    "bottom-right": "items-end justify-end text-right",
  }[align];

  const titleSizeClass = {
    default: "max-w-4xl",
    xl: "max-w-6xl vb-title-xl",
    "2xl": "max-w-[90rem] vb-title-2xl",
    "3xl": "max-w-[110rem] vb-title-3xl",
  }[titleSize];

  const gradientStyle = (() => {
    if (gradient === "none") return undefined;
    const directions = {
      top: "to bottom",
      bottom: "to top",
      left: "to right",
      right: "to left",
    };
    return {
      background: `linear-gradient(${directions[gradient]}, rgba(0,0,0,${overlayOpacity * 1.8}) 0%, rgba(0,0,0,${overlayOpacity * 0.3}) 50%, transparent 100%)`,
    };
  })();

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <EditableMedia path="src" value={src} mediaType="video" label="Bakgrundsvideo">
        <motion.video
          src={src}
          autoPlay={!paused}
          loop
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${blur ? "blur-sm" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        />
      </EditableMedia>

      {gradient !== "none" ? (
        <div className="absolute inset-0" style={{ ...gradientStyle, zIndex: 4 }} />
      ) : (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity, zIndex: 4 }}
        />
      )}

      {/* Text-innehåll.
          Texten ligger ALLTID ovanpå videon + en mörk scrim (gradient eller
          platt bg-black) som finns oavsett tema för läsbarhet. Därför måste
          texten vara fast ljus på BÅDA teman — annars blir slide-prosens
          var(--text) nästan svart på ljust tema (dagsljus) och försvinner
          mot scrimen. Scoped style nedan slår .slide-prose p { color: var(--text) }. */}
      <motion.div
        className={`video-bg-text slide-prose absolute inset-0 flex flex-col gap-4 p-16 ${alignClass}`}
        style={{ zIndex: 10 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        <div className={`flex flex-col gap-4 ${titleSizeClass}`}>{children}</div>
      </motion.div>

      <style>{`
        .video-bg-text,
        .video-bg-text h1,
        .video-bg-text h2,
        .video-bg-text h3,
        .video-bg-text p,
        .video-bg-text li,
        .video-bg-text strong {
          color: rgba(245, 246, 250, 0.92);
        }
        .video-bg-text blockquote {
          color: rgba(245, 246, 250, 0.7);
        }
      `}</style>
    </div>
  );
}
