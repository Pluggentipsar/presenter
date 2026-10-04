"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface OrnamentProps {
  /** Override tema-ornamentet */
  variant?: "line" | "starburst" | "dot" | "square" | "none";
  /** Storlek i rem (default 6 = w-24) */
  size?: string;
  className?: string;
}

/**
 * En dekorativ accent-markör som används på TitleSlide, StatCounter m.fl.
 * Default läser tema-variabeln --ornament-style, men kan overrideas per slide.
 */
export function Ornament({ variant, size = "6rem", className = "" }: OrnamentProps) {
  // Läs --ornament-style från CSS-vars om inget variant är satt
  const [computed, setComputed] = useState<string | undefined>(variant);

  useEffect(() => {
    if (variant) return;
    // Läs från CSS (default tema sätter aldrig --ornament-style, bara tema-specifika gör det)
    const root = document.querySelector("[data-ornament]") as HTMLElement | null;
    if (root) {
      const style = root.getAttribute("data-ornament");
      if (style) setComputed(style);
    }
  }, [variant]);

  const style = computed ?? "line";

  if (style === "none") return null;

  if (style === "starburst") {
    return (
      <motion.div
        className={className}
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: size, height: size, color: "var(--ornament-color)" }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
          <path d="M12 0 L13.5 9 L22 6 L15 12 L22 18 L13.5 15 L12 24 L10.5 15 L2 18 L9 12 L2 6 L10.5 9 Z" />
        </svg>
      </motion.div>
    );
  }

  if (style === "dot") {
    return (
      <motion.div
        className={`rounded-full ${className}`}
        style={{
          width: "0.75rem",
          height: "0.75rem",
          background: "var(--ornament-color)",
          boxShadow: "0 0 16px var(--accent-glow)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    );
  }

  if (style === "square") {
    return (
      <motion.div
        className={className}
        style={{
          width: size,
          height: "0.5rem",
          background: "var(--ornament-color)",
        }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      />
    );
  }

  // Default: line
  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: "0.25rem",
        background: "var(--ornament-color)",
      }}
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  );
}
