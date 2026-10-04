"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SlideProps {
  children: ReactNode;
  background?: string;
  className?: string;
  notes?: string;
}

/**
 * Wrapper för en slide. Används sällan direkt i MDX eftersom
 * de flesta templates (TitleSlide, GiantText, etc.) redan är slides.
 *
 * Används när man vill göra en helt custom slide:
 *
 * <Slide notes="Påminn om kompensatoriska uppdraget här.">
 *   ## Min egen slide
 *   Custom innehåll här.
 * </Slide>
 */
export function Slide({ children, background, className = "", notes }: SlideProps) {
  return (
    <motion.div
      className={`slide-container ${className}`}
      style={background ? { background } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      data-notes={notes}
    >
      <div className="slide-prose flex w-full max-w-6xl flex-col gap-6">{children}</div>
    </motion.div>
  );
}
