"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Ornament } from "../components/Ornament";
import { EditableText, GhostHandle } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface TitleSlideProps {
  title: string;
  subtitle?: string;
  author?: string;
  event?: string;
  date?: string;
  /** Storlek på huvudrubriken. Default md. */
  titleSize?: Size;
  /** Storlek på undertiteln. Default md. */
  subtitleSize?: "sm" | "md" | "lg";
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(2.25rem, 6vw, 5rem)",
  md: "clamp(3rem, 8vw, 7rem)",
  lg: "clamp(4rem, 10vw, 9rem)",
  xl: "clamp(5rem, 13vw, 11rem)",
};

const SUBTITLE_SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "clamp(1rem, 1.8vw, 1.5rem)",
  md: "clamp(1.25rem, 2.5vw, 2rem)",
  lg: "clamp(1.5rem, 3.2vw, 2.75rem)",
};

export function TitleSlide({
  title,
  subtitle,
  author,
  event,
  date,
  titleSize = "md",
  subtitleSize = "md",
  children,
}: TitleSlideProps) {
  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col items-start gap-8"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <Ornament />
        <motion.h1
          className="leading-[1.02]"
          style={{
            fontSize: TITLE_SIZES[titleSize],
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
            textTransform: "var(--heading-case)" as "normal" | "uppercase",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <EditableText
            path="title"
            value={title}
            sizeControls={[
              { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
            ]}
          >
            {title}
          </EditableText>
        </motion.h1>
        {subtitle ? (
          <motion.p
            className="max-w-3xl leading-snug text-text-muted"
            style={{ fontSize: SUBTITLE_SIZES[subtitleSize] }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
          >
            <EditableText
              path="subtitle"
              value={subtitle}
              sizeControls={[
                { prop: "subtitleSize", current: subtitleSize, options: ["sm", "md", "lg"], label: "Subtitle" },
              ]}
            >
              {subtitle}
            </EditableText>
          </motion.p>
        ) : (
          <GhostHandle path="subtitle" label="+ subtitle" placeholder="T.ex. Från förståelse till praktik" />
        )}
        <motion.div
            className="mt-8 flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.2em] text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            {author ? (
              <EditableText path="author" value={author}>
                <span>{author}</span>
              </EditableText>
            ) : (
              <GhostHandle path="author" label="+ författare" />
            )}
            {author && (event || date) && <span className="text-accent">/</span>}
            {event ? (
              <EditableText path="event" value={event}>
                <span>{event}</span>
              </EditableText>
            ) : (
              <GhostHandle path="event" label="+ event" />
            )}
            {event && date && <span className="text-accent">/</span>}
            {date ? (
              <EditableText path="date" value={date}>
                <span>{date}</span>
              </EditableText>
            ) : (
              <GhostHandle path="date" label="+ datum" placeholder="T.ex. 2026-04-29" />
            )}
          </motion.div>
        {children}
      </div>
    </div>
  );
}
