"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ImageBleedProps {
  image: string;
  alt?: string;
  /** Vilket hörn bilden ska spilla ut i */
  corner?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
  /** Hur stor andel av slide bilden tar (procent av bredd) */
  size?: number | string;
  /** Rotation för dynamisk känsla (grader) */
  rotate?: number | string;
  children?: ReactNode;
}

/**
 * Bild som "spiller ut" över slide-ramen i ett hörn, skapar dynamik.
 * Text läggs i motsatt sida.
 *
 * Användning:
 * <ImageBleed image="/bilder/bakgrunder/skog.jpg" corner="top-right" size="55" rotate="3">
 *   # Rubrik som syns på motsatt sida
 *   Underrubrik.
 * </ImageBleed>
 */
export function ImageBleed({
  image,
  alt = "",
  corner = "top-right",
  size = 55,
  rotate = 0,
  children,
}: ImageBleedProps) {
  const sizeNum = typeof size === "string" ? parseFloat(size) : size;
  const rotateNum = typeof rotate === "string" ? parseFloat(rotate) : rotate;

  // Bildens position och avklipp i hörn
  const cornerStyles = {
    "top-right": {
      top: "-10%",
      right: "-10%",
      width: `${sizeNum}%`,
      height: `${sizeNum * 1.1}%`,
    },
    "bottom-right": {
      bottom: "-10%",
      right: "-10%",
      width: `${sizeNum}%`,
      height: `${sizeNum * 1.1}%`,
    },
    "top-left": {
      top: "-10%",
      left: "-10%",
      width: `${sizeNum}%`,
      height: `${sizeNum * 1.1}%`,
    },
    "bottom-left": {
      bottom: "-10%",
      left: "-10%",
      width: `${sizeNum}%`,
      height: `${sizeNum * 1.1}%`,
    },
  }[corner];

  // Textens position är motsatt hörn (flex-col: items-* = horisontell, justify-* = vertikal)
  const textAlignStyles = {
    "top-right": "items-start justify-end text-left",
    "bottom-right": "items-start justify-start text-left",
    "top-left": "items-end justify-end text-right",
    "bottom-left": "items-end justify-start text-right",
  }[corner];

  // Entrance-animation från korrekt riktning
  const enterX = corner.includes("right") ? 80 : -80;
  const enterY = corner.includes("top") ? -80 : 80;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Bild i hörnet */}
      <motion.div
        className="absolute overflow-hidden"
        style={{
          ...cornerStyles,
          borderRadius: "var(--radius)",
          transform: `rotate(${rotateNum}deg)`,
        }}
        initial={{ opacity: 0, x: enterX, y: enterY, rotate: rotateNum * 2 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: rotateNum }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))" }}
        />
      </motion.div>

      {/* Text */}
      <motion.div
        className={`slide-prose absolute inset-0 flex flex-col gap-4 p-16 ${textAlignStyles}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      >
        <div className="flex max-w-2xl flex-col gap-4">{children}</div>
      </motion.div>
    </div>
  );
}
