"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

interface SlideshowMorphProps {
  /** Bilder - kommaseparerad string eller array */
  images: string | string[];
  /** Rubriker per bild - kommaseparerad string (ska matcha antal bilder) */
  captions?: string;
  /** Morph-variant */
  morph?: "crossfade" | "scale" | "slide" | "zoom-blur";
  /** Starta i auto-mode: bild byts var N sekund */
  autoPlay?: number | string;
  /** Visa räknare */
  showCounter?: boolean;
  children?: ReactNode;
}

/**
 * Slideshow med snygga morfningseffekter mellan bilder.
 * Varje klick → nästa bild med vald morph-animation.
 *
 * Användning:
 * <SlideshowMorph
 *   images="bild1.jpg, bild2.jpg, bild3.jpg"
 *   captions="Först, Sedan, Slutligen"
 *   morph="zoom-blur"
 * />
 */
export function SlideshowMorph({
  images,
  captions,
  morph = "crossfade",
  autoPlay,
  showCounter = true,
  children,
}: SlideshowMorphProps) {
  const imageList = Array.isArray(images)
    ? images
    : images.split(/\s*,\s*/).filter(Boolean);
  const captionList = captions
    ? captions.split(/\s*,\s*/)
    : [];

  const activeStep = useSlideSteps(imageList.length);
  const current = imageList[activeStep];
  const caption = captionList[activeStep];

  // Variants per morph-typ
  const variants = {
    crossfade: {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    },
    scale: {
      enter: { opacity: 0, scale: 1.1 },
      center: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
    slide: {
      enter: { opacity: 0, x: 100 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -100 },
    },
    "zoom-blur": {
      enter: { opacity: 0, scale: 1.3, filter: "blur(30px)" },
      center: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 0.95, filter: "blur(20px)" },
    },
  };

  const selectedVariant = variants[morph];

  // Ignore autoPlay for now, basic note
  void autoPlay;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AnimatePresence mode="sync">
        <motion.div
          key={activeStep}
          className="absolute inset-0"
          variants={selectedVariant}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={caption ?? ""}
            className="h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient för läsbarhet */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
        }}
      />

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 p-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="slide-prose"
            >
              <h2
                className="text-[clamp(2rem,4vw,3.5rem)] leading-tight text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                }}
              >
                <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Custom children overlay */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          <div className="slide-prose">{children}</div>
        </div>
      )}

      {/* Counter */}
      {showCounter && (
        <div className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          {activeStep + 1} / {imageList.length}
        </div>
      )}
    </div>
  );
}
