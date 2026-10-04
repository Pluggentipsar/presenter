"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface HeroImageProps {
  src: string;
  alt?: string;
  children?: ReactNode;
  /** Positionering av textblock */
  align?: "top-left" | "center" | "bottom-left" | "bottom-right" | "top-right";
  /** Mörker-overlay över bilden för läsbarhet (0-1) */
  overlay?: number | string;
  /** Gradient-overlay istället för platt mörkning */
  gradient?: "top" | "bottom" | "left" | "right" | "none";
  /** Blur bilden lätt för att texten ska sticka ut mer */
  blur?: boolean;
}

/**
 * Slide där en bild täcker hela viewporten.
 * Text läggs ovanpå med overlay/gradient för läsbarhet.
 *
 * Användning:
 * <HeroImage src="/bilder/bakgrunder/natur.jpg" align="bottom-left" gradient="bottom">
 *   # Rubrik
 *   Underrubrik eller body-text.
 * </HeroImage>
 */
export function HeroImage({
  src,
  alt = "",
  children,
  align = "bottom-left",
  overlay = 0.35,
  gradient = "bottom",
  blur = false,
}: HeroImageProps) {
  const overlayOpacity = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  // flex-col: main axis = vertical, cross axis = horizontal
  // justify-* = vertical position, items-* = horizontal position
  const alignClass = {
    "top-left": "items-start justify-start text-left",
    "top-right": "items-end justify-start text-right",
    "center": "items-center justify-center text-center",
    "bottom-left": "items-start justify-end text-left",
    "bottom-right": "items-end justify-end text-right",
  }[align];

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
      {/* Bakgrundsbild */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <EditableMedia path="src" value={src} mediaType="image" label="Bakgrundsbild">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`h-full w-full object-cover ${blur ? "blur-sm" : ""}`}
          />
        </EditableMedia>
      </motion.div>

      {/* Overlay för läsbarhet */}
      {gradient !== "none" ? (
        <div className="absolute inset-0" style={gradientStyle} />
      ) : (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Text-innehåll.
          Texten ligger ALLTID ovanpå fotot + en mörk scrim (gradient eller
          platt bg-black) som finns oavsett tema för läsbarhet. Därför måste
          texten vara fast ljus på BÅDA teman — annars blir slide-prosens
          var(--text) nästan svart på ljust tema (dagsljus) och försvinner
          mot scrimen. Scoped style nedan slår .slide-prose p { color: var(--text) }. */}
      <motion.div
        className={`hero-image-text slide-prose absolute inset-0 flex flex-col gap-4 p-16 ${alignClass}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      >
        <div className="flex max-w-4xl flex-col gap-4">
          <EditableText path="content" block label="Hero-text">{children}</EditableText>
        </div>
      </motion.div>

      <style>{`
        .hero-image-text,
        .hero-image-text h1,
        .hero-image-text h2,
        .hero-image-text h3,
        .hero-image-text p,
        .hero-image-text li,
        .hero-image-text strong {
          color: rgba(245, 246, 250, 0.92);
        }
        .hero-image-text blockquote {
          color: rgba(245, 246, 250, 0.7);
        }
      `}</style>
    </div>
  );
}
