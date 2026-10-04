"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface LayeredTextProps {
  /** Bild (PNG med transparent bakgrund fungerar bäst) */
  image: string;
  alt?: string;
  /** Var subjektet ska placeras */
  imagePosition?: "right" | "left" | "center";
  /** Storlek på subjektet (procent av slide-höjd, default 80) */
  imageSize?: number | string;
  /** Bakgrundsfärg - kan överrida tema */
  background?: string;
  /** Text-färg - kan överrida tema (tex när bakgrund är ljus) */
  textColor?: string;
  /** Text-innehåll (h1/h2, paragrafer, etc) */
  children?: ReactNode;
  /** Låt text vara FÖRE bilden istället för bakom */
  textInFront?: boolean;
}

/**
 * Komposition med text i lager + urklippt subjekt (som dog-i-sele-layouten).
 *
 * Texten och bilden överlappar - texten syns delvis bakom bilden.
 * Perfekt för redaktionella "cover"-slides med ett tydligt subjekt.
 *
 * Användning:
 * <LayeredText image="/bilder/subjekt/hund.png" background="#f9c7d4" imagePosition="right">
 *   # A new harness
 *   ## furrrr Lucky!
 * </LayeredText>
 */
export function LayeredText({
  image,
  alt = "",
  imagePosition = "right",
  imageSize = 85,
  background,
  textColor,
  children,
  textInFront = false,
}: LayeredTextProps) {
  const sizeNum = typeof imageSize === "string" ? parseFloat(imageSize) : imageSize;

  const imageStyle = {
    right: { right: "0", left: "auto" },
    left: { left: "0", right: "auto" },
    center: { left: "50%", transform: "translateX(-50%)" },
  }[imagePosition];

  const textAlign = {
    right: "items-start text-left",
    left: "items-end text-right",
    center: "items-center text-center",
  }[imagePosition];

  return (
    <div
      className="relative flex h-full w-full items-center overflow-hidden"
      style={background ? { background } : { background: "var(--slide-base, var(--bg))" }}
    >
      {/* Text (bakom eller framför) */}
      <motion.div
        className={`slide-prose absolute inset-0 flex flex-col justify-center gap-4 p-16 ${textAlign}`}
        style={{
          zIndex: textInFront ? 20 : 10,
          color: textColor,
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="flex max-w-5xl flex-col gap-2"
          style={textColor ? { color: textColor } : undefined}
        >
          {children}
        </div>
      </motion.div>

      {/* Subjekt-bild (framför eller bakom) */}
      <motion.div
        className={`absolute top-1/2 flex -translate-y-1/2 justify-center`}
        style={{
          ...imageStyle,
          height: `${sizeNum}%`,
          maxHeight: "95vh",
          zIndex: textInFront ? 10 : 20,
        }}
        initial={{ opacity: 0, x: imagePosition === "right" ? 60 : imagePosition === "left" ? -60 : 0, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={alt}
          className="h-full w-auto object-contain"
          style={{
            filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.25))",
          }}
        />
      </motion.div>
    </div>
  );
}
