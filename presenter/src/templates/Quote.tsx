"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

type Size = "sm" | "md" | "lg" | "xl";

interface QuoteProps {
  children: ReactNode;
  attribution?: string;
  context?: string;
  /** Storlek på citatet. Default md. */
  size?: Size;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

const SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 2rem)",
  md: "clamp(1.75rem, 4vw, 3.25rem)",
  lg: "clamp(2.5rem, 5vw, 4.5rem)",
  xl: "clamp(3.5rem, 7vw, 6rem)",
};

export function Quote({
  children,
  attribution,
  context,
  size = "md",
  background,
  overlay,
  overlayMode = "dark",
}: QuoteProps) {
  const hasBackground = Boolean(background);
  return (
    <div
      className="slide-container"
      style={
        hasBackground
          ? { background: buildBackgroundCss(background, overlay, overlayMode) }
          : undefined
      }
    >
      <div
        className="flex w-full flex-col gap-8"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <motion.div
          className="flex items-start gap-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div
            className="h-auto flex-shrink-0 self-stretch bg-accent"
            style={{ width: "var(--border-width, 1px)", minWidth: "3px" }}
          />
          <blockquote
            className="italic leading-[1.25]"
            style={{
              fontSize: SIZES[size],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
          >
            &ldquo;
            <EditableText
              path="content"
              label="Citat"
              sizeControls={[
                { prop: "size", current: size, options: ["sm", "md", "lg", "xl"], label: "Storlek" },
              ]}
            >
              {children}
            </EditableText>
            &rdquo;
          </blockquote>
        </motion.div>
        {(attribution || context) && (
          <motion.div
            className="pl-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {attribution && (
              <p
                className="text-lg text-text md:text-xl"
                style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
              >
                —{" "}
                <EditableText path="attribution" value={attribution}>
                  {attribution}
                </EditableText>
              </p>
            )}
            {context && (
              <p className="mt-1 text-sm uppercase tracking-[0.2em] text-text-muted">
                <EditableText path="context" value={context}>
                  {context}
                </EditableText>
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
