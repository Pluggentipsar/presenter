"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

type Size = "sm" | "md" | "lg" | "xl";

interface PassageProps {
  /** Rubrik över passagen */
  title?: string;
  /** Liten tag ovanför (tex "KONTEXT" eller "INSIKT") */
  tag?: string;
  /** Textjustering: left (default) eller center */
  align?: "left" | "center";
  /** Max bredd: narrow (läsvänlig kolumn), wide (utnyttjar mer yta) */
  width?: "narrow" | "wide";
  titleSize?: Size;
  textSize?: Size;
  children?: ReactNode;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3vw, 2.25rem)",
  md: "clamp(2rem, 4.5vw, 3.25rem)",
  lg: "clamp(2.75rem, 6vw, 4.5rem)",
  xl: "clamp(3.5rem, 7.5vw, 5.75rem)",
};

const TEXT_SIZES: Record<Size, string> = {
  sm: "clamp(1rem, 1.6vw, 1.25rem)",
  md: "clamp(1.25rem, 2.2vw, 1.75rem)",
  lg: "clamp(1.625rem, 2.8vw, 2.25rem)",
  xl: "clamp(2rem, 3.5vw, 2.75rem)",
};

/**
 * Långform text-passage med stöd för markdown-highlights (**fet** blir accent).
 *
 * Bra när man vill låta publiken läsa ett par meningar utan att trycka in
 * dem i en punktlista eller stor rubrik. Ger andrum mellan mer visuella
 * slides.
 *
 * <Passage title="Det handlar inte om verktyget" tag="INSIKT">
 * Det är inte lätt att vara lärare just nu. **Det blir inte enklare**
 * av att varje dag har en ny AI-app som går viralt. Men **det som
 * verkligen spelar roll** är om vi behåller frågan om *varför* i
 * fokus - gång, på gång, på gång.
 * </Passage>
 */
export function Passage({
  title,
  tag,
  align = "left",
  width = "narrow",
  titleSize = "md",
  textSize = "md",
  children,
  background,
  overlay,
  overlayMode = "dark",
}: PassageProps) {
  const maxWidth = width === "narrow" ? "48rem" : "var(--slide-max-width)";
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
        className={`flex w-full flex-col gap-6 ${align === "center" ? "items-center" : "items-start"}`}
        style={{ maxWidth }}
      >
        {tag && (
          <motion.div
            className="text-xs uppercase tracking-[0.3em] text-accent md:text-sm"
            style={{ fontWeight: 600 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
          </motion.div>
        )}
        {title && (
          <motion.h2
            className={`leading-tight ${align === "center" ? "text-center" : ""}`}
            style={{
              fontSize: TITLE_SIZES[titleSize],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <EditableText
              path="title"
              value={title ?? ""}
              sizeControls={[
                { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
                { prop: "textSize", current: textSize, options: ["sm", "md", "lg", "xl"], label: "Brödtext" },
              ]}
            >{title}</EditableText>
          </motion.h2>
        )}
        <motion.div
          className={`slide-prose leading-[1.5] ${align === "center" ? "text-center" : ""}`}
          style={{
            fontSize: TEXT_SIZES[textSize],
            fontFamily: "var(--font-body)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
