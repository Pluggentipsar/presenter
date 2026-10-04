"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText, GhostHandle } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

type Size = "sm" | "md" | "lg" | "xl";

interface CalloutProps {
  /** Variant - påverkar färg och ikon */
  variant?: "info" | "warning" | "success" | "insight" | "quote" | "danger";
  /** Rubrik över callouten */
  title?: string;
  /** Liten tag ovanför (tex "OBS", "INSIKT") */
  tag?: string;
  /** Pre-heading - visas före titeln (som ett kapitelnummer el likn) */
  preHeading?: string;
  /** Storlek på rubriken. Default md. */
  titleSize?: Size;
  /** Storlek på brödtext. Default md. */
  bodySize?: Size;
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.8vw, 2.25rem)",
  md: "clamp(1.75rem, 4vw, 3rem)",
  lg: "clamp(2.5rem, 5.5vw, 4.25rem)",
  xl: "clamp(3.25rem, 7vw, 5.5rem)",
};

const BODY_SIZES: Record<Size, string> = {
  sm: "clamp(0.9rem, 1.5vw, 1.125rem)",
  md: "clamp(1.125rem, 2vw, 1.5rem)",
  lg: "clamp(1.5rem, 2.8vw, 2.25rem)",
  xl: "clamp(2rem, 3.5vw, 3rem)",
};

/**
 * Callout - framträdande box/tag som drar uppmärksamhet.
 * Bra för att lyfta en specifik insikt, ett varningsblock eller ett citat.
 *
 * <Callout variant="insight" tag="Nyckelinsikt">
 *   # Det handlar inte om verktyget
 *   Det handlar om vilket lärande vi designar för.
 * </Callout>
 */
export function Callout({
  variant = "insight",
  title,
  tag,
  preHeading,
  titleSize = "md",
  bodySize = "md",
  children,
}: CalloutProps) {
  const icon = icons[variant];
  const color = colors[variant];

  return (
    <div className="slide-container">
      <motion.div
        className="flex w-full flex-col gap-6 border p-12"
        style={{
          maxWidth: "var(--slide-max-width)",
          borderRadius: "var(--radius)",
          borderColor: color,
          borderWidth: "2px",
          background: `${withAlpha(color, 0.06)}`,
          boxShadow: `0 0 40px ${withAlpha(color, 0.19)}`,
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: color, color: "rgba(245,246,250,0.92)" }}
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            {icon}
          </motion.div>
          {tag ? (
            <motion.span
              className="text-sm uppercase tracking-[0.3em] md:text-base"
              style={{ color, fontWeight: 600 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <EditableText path="tag" value={tag}>
                {tag}
              </EditableText>
            </motion.span>
          ) : (
            <GhostHandle path="tag" label="+ tag" placeholder="T.ex. OBS eller Insikt" />
          )}
        </div>

        {preHeading ? (
          <motion.div
            className="text-sm uppercase tracking-[0.25em] text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <EditableText path="preHeading" value={preHeading}>
              {preHeading}
            </EditableText>
          </motion.div>
        ) : (
          <GhostHandle path="preHeading" label="+ pre-heading" />
        )}

        {title ? (
          <motion.h2
            className="leading-tight"
            style={{
              fontSize: TITLE_SIZES[titleSize],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
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
          </motion.h2>
        ) : (
          <GhostHandle path="title" label="+ titel" />
        )}

        {children && (
          <motion.div
            className="slide-prose leading-relaxed"
            style={{ fontSize: BODY_SIZES[bodySize] }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <EditableText
              path="content"
              block
              label="Callout-text"
              sizeControls={[
                { prop: "bodySize", current: bodySize, options: ["sm", "md", "lg", "xl"], label: "Brödtext" },
              ]}
            >
              {children}
            </EditableText>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

const colors = {
  info: "var(--accent)",
  insight: "var(--accent)",
  warning: "#f59e0b",
  success: "#10b981",
  quote: "var(--accent)",
  danger: "#ef4444",
};

const icons = {
  info: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  insight: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 4 12.95V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.05A7 7 0 0 1 12 2z" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  ),
  warning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  success: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  quote: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 9h2.5v6H7V9zm0-5h6v2H7V4zm8 5h2.5v6H15V9zm0-5h6v2h-6V4z" />
    </svg>
  ),
  danger: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};
