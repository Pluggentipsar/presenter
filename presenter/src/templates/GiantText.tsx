"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";

type Size = "sm" | "md" | "lg" | "xl";

interface GiantTextProps {
  children: ReactNode;
  align?: "left" | "center";
  /** Textstorlek. Default md. */
  size?: Size;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Andra påståendet — kommer först på NÄSTA klick, i mindre grad, medan
   * huvudtexten står kvar. Utan denna prop registreras inga steg alls och
   * sliden beter sig exakt som förut.
   */
  reveal?: string;
}

const SIZES: Record<Size, string> = {
  sm: "clamp(1.75rem, 4vw, 3.5rem)",
  md: "clamp(2.5rem, 6vw, 5.5rem)",
  lg: "clamp(3.5rem, 8vw, 7.5rem)",
  xl: "clamp(5rem, 11vw, 10rem)",
};

export function GiantText({
  children,
  align = "left",
  size = "md",
  background,
  overlay,
  overlayMode = "dark",
  reveal,
}: GiantTextProps) {
  const hasBackground = Boolean(background);
  // Utan reveal registreras noll steg — befintliga deck är opåverkade.
  const step = useSlideSteps(reveal ? 2 : 0);
  const revealed = Boolean(reveal) && step >= 1;
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
        className={`flex w-full flex-col gap-6 ${
          align === "center" ? "items-center text-center" : "items-start"
        }`}
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <EditableText
          path="content"
          block
          label="Text"
          sizeControls={[
            { prop: "size", current: size, options: ["sm", "md", "lg", "xl"], label: "Storlek" },
          ]}
        >
          <motion.div
            className="leading-[1.08]"
            style={{
              fontSize: `calc(${SIZES[size]} * var(--display-scale, 1))`,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
              textTransform: "var(--heading-case)" as "normal" | "uppercase",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </EditableText>

        {/* Andra påståendet — eget klick-steg, medvetet mindre än huvudtexten
            så det läser som ett tillägg och inte som en ny rubrik. */}
        {reveal ? (
          <AnimatePresence>
            {revealed ? (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: align === "center" ? "center" : "flex-start",
                  gap: "clamp(0.7rem, 1.6vh, 1.2rem)",
                  // Se HookStatement: em här räknas mot omslagets ärvda 16px
                  // och klämmer texten. Bredden hör hemma på textblocket.
                  width: "100%",
                }}
              >
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: "clamp(3rem, 7vw, 6rem)",
                    height: "2px",
                    background: "var(--accent)",
                    transformOrigin: align === "center" ? "center" : "left",
                    boxShadow: "0 0 20px var(--accent-glow)",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "clamp(1.4rem, 2.6vw, 2.5rem)",
                    lineHeight: 1.28,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                    textAlign: align === "center" ? "center" : "left",
                    // em mot den egna storleken — annars smal spalt.
                    maxWidth: "26em",
                  }}
                >
                  <EditableText path="reveal" value={reveal}>
                    {reveal}
                  </EditableText>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
