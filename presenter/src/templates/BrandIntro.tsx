"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

interface BrandIntroProps {
  /** Logo-bildens path. PNG med transparens funkar bäst. */
  logo: string;
  /** Alt-text för logon */
  alt?: string;
  /** Logo-höjd som procent av slide-höjd. Default 28. */
  logoHeight?: number | string;
  /** Tagline-text under logon */
  tagline?: string;
  /** Liten tag ovanför logon (UPPERCASE) */
  eyebrow?: string;
  /** Liten meta-text längst ner (datum, plats, författare) */
  meta?: string;
  /**
   * Bakgrundsstil:
   * - "solid" (default): bara temats bg
   * - "radial": radial-gradient med accent-glow bakom logon
   * - "split": diagonal accent-färg-yta bakom
   */
  background?: "solid" | "radial" | "split";
  /** Custom bakgrundsfärg (override) */
  bgColor?: string;
  /** Children = ev. extra innehåll under tagline (t.ex. citat) */
  children?: ReactNode;
}

/**
 * BrandIntro — öppnings-/avslutsslide där en logo dominerar och
 * skapar tydlig visuell identitet. Bättre än HeroImage-hack för
 * brand-tunga pitchar.
 */
export function BrandIntro({
  logo,
  alt = "",
  logoHeight = 28,
  tagline,
  eyebrow,
  meta,
  background = "radial",
  bgColor,
  children,
}: BrandIntroProps) {
  const heightStr =
    typeof logoHeight === "number" ? `${logoHeight}vh` : logoHeight;

  const bgStyle: React.CSSProperties = bgColor
    ? { background: bgColor }
    : background === "radial"
      ? {
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 60%)",
        }
      : background === "split"
        ? {
            background:
              "linear-gradient(135deg, var(--bg) 0%, var(--bg) 50%, color-mix(in srgb, var(--accent) 12%, var(--bg)) 50%, color-mix(in srgb, var(--accent) 12%, var(--bg)) 100%)",
          }
        : { background: "var(--slide-base, var(--bg))" };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-12 text-center">
        {eyebrow && (
          <motion.span
            className="text-sm uppercase tracking-[0.4em]"
            style={{ color: "var(--accent)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
          </motion.span>
        )}

        <motion.img
          src={logo}
          alt={alt}
          style={{ height: heightStr, width: "auto", maxWidth: "min(80vw, 60rem)" }}
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {tagline && (
          <motion.p
            className="max-w-3xl leading-snug"
            style={{
              fontSize: "clamp(1.25rem, 2.4vw, 2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "var(--text)",
              opacity: 0.92,
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.92, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <EditableText path="tagline" value={tagline ?? ""}>{tagline}</EditableText>
          </motion.p>
        )}

        {children && (
          <motion.div
            className="slide-prose max-w-2xl text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {meta && (
        <motion.div
          className="absolute bottom-8 left-0 right-0 text-center text-xs uppercase tracking-[0.35em] text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          {meta}
        </motion.div>
      )}
    </div>
  );
}
