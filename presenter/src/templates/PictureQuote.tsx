"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface PictureQuoteProps {
  /** Porträttbild av citat-källan */
  image: string;
  /** Namn på citat-källan */
  attribution: string;
  /** Kontext under namnet (titel, datum, etc) */
  context?: string;
  /** Positionering av bilden */
  imagePosition?: "left" | "right";
  /** Storlek på citatet. Default md. */
  size?: Size;
  /** Citattext */
  children: ReactNode;
}

const SIZES: Record<Size, string> = {
  sm: "clamp(1rem, 2vw, 1.625rem)",
  md: "clamp(1.5rem, 3.25vw, 2.5rem)",
  lg: "clamp(2rem, 4.5vw, 3.5rem)",
  xl: "clamp(2.75rem, 6vw, 4.75rem)",
};

/**
 * Citat med ett porträtt bredvid. Bra för elevcitat, expert-uttalanden,
 * eller personliga berättelser där vem som sa det spelar roll.
 *
 * <PictureQuote
 *   image="/bilder/subjekt/william.png"
 *   attribution="William"
 *   context="Gymnasieelev, mars 2023"
 * >
 *   Det här förändrar ju fan allting.
 * </PictureQuote>
 */
export function PictureQuote({
  image,
  attribution,
  context,
  imagePosition = "left",
  size = "md",
  children,
}: PictureQuoteProps) {
  const imageOnLeft = imagePosition === "left";

  return (
    <div className="slide-container">
      <div
        className={`grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[35%_65%] ${
          imageOnLeft ? "" : "md:grid-flow-col-dense md:[&>*:first-child]:col-start-2"
        }`}
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <motion.div
          className="relative aspect-square overflow-hidden"
          style={{ borderRadius: "var(--radius)" }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={attribution}
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to ${imageOnLeft ? "right" : "left"}, transparent 60%, var(--bg))`,
            }}
          />
        </motion.div>

        <motion.div
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-accent"
            style={{ filter: "drop-shadow(0 0 16px var(--accent-glow))" }}
          >
            <path d="M7 9h2.5v6H7V9zm0-5h6v2H7V4zm8 5h2.5v6H15V9zm0-5h6v2h-6V4z" />
          </svg>

          <blockquote
            className="leading-[1.25]"
            style={{
              fontSize: SIZES[size],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
          >
            <EditableText
              path="content"
              label="Citat"
              sizeControls={[
                { prop: "size", current: size, options: ["sm", "md", "lg", "xl"], label: "Storlek" },
              ]}
            >{children}</EditableText>
          </blockquote>

          <div className="mt-4">
            <div
              className="text-lg font-semibold md:text-xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <EditableText path="attribution" value={attribution ?? ""}>{attribution}</EditableText>
            </div>
            {context && (
              <div className="mt-1 text-sm uppercase tracking-[0.2em] text-text-muted md:text-base">
                <EditableText path="context" value={context ?? ""}>{context}</EditableText>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
