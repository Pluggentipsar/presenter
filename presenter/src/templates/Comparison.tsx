"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

interface ComparisonProps {
  title?: string;
  accentSide?: "left" | "right" | "none";
  children?: ReactNode;
}

interface ComparisonColumnProps {
  title: string;
  children?: ReactNode;
}

/**
 * Två kolumner sida vid sida. Användbar för:
 * - Före/efter
 * - Utan AI / Med AI
 * - Vad skolan var / Vad skolan kan bli
 *
 * Användning:
 * <Comparison title="Före / Efter" accentSide="right">
 *   <ComparisonColumn title="Utan AI">
 *     - Samma material till alla
 *   </ComparisonColumn>
 *   <ComparisonColumn title="Med AI">
 *     - Individanpassat på 30 sek
 *   </ComparisonColumn>
 * </Comparison>
 */
export function Comparison({ title, accentSide = "right", children }: ComparisonProps) {
  // Filter out only ComparisonColumn children
  const columns = Children.toArray(children).filter(
    (child) => isValidElement(child)
  ) as ReactElement<ComparisonColumnProps>[];

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
              textTransform: "var(--heading-case)" as "normal" | "uppercase",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {columns.map((col, i) => {
            const isAccent =
              (accentSide === "left" && i === 0) ||
              (accentSide === "right" && i === columns.length - 1);
            const isMuted = accentSide !== "none" && !isAccent;
            return (
              <motion.div
                key={i}
                className="flex flex-col gap-5 p-8"
                style={{
                  borderRadius: "var(--radius)",
                  border: isAccent
                    ? "2px solid var(--accent)"
                    : "1px solid color-mix(in srgb, var(--text) 8%, transparent)",
                  background: isAccent
                    ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--bg-surface)) 0%, color-mix(in srgb, var(--accent) 4%, var(--bg-surface)) 100%)"
                    : "var(--bg-surface)",
                  boxShadow: isAccent
                    ? "0 0 64px -10px var(--accent-glow), 0 24px 50px -22px rgba(0,0,0,0.55), inset 0 1px 0 color-mix(in srgb, var(--accent) 40%, transparent)"
                    : undefined,
                  transform: isAccent ? "scale(1.035)" : undefined,
                  opacity: isMuted ? 0.62 : 1,
                  filter: isMuted ? "saturate(0.7)" : undefined,
                  transformOrigin: accentSide === "right" ? "right center" : "left center",
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{
                  opacity: isMuted ? 0.62 : 1,
                  y: 0,
                }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.15, ease: "easeOut" }}
              >
                <h3
                  className="leading-tight"
                  style={{
                    fontSize: isAccent
                      ? "clamp(1.75rem, 3.45vw, 2.6rem)"
                      : "clamp(1.5rem, 3vw, 2.25rem)",
                    color: isAccent ? "var(--accent)" : "var(--text)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)",
                    letterSpacing: "var(--heading-tracking)",
                    textTransform: "var(--heading-case)" as "normal" | "uppercase",
                    textShadow: isAccent
                      ? "0 0 24px color-mix(in srgb, var(--accent) 45%, transparent)"
                      : undefined,
                  }}
                >
                  {col.props.title}
                </h3>
                <div
                  className="slide-prose"
                  style={{
                    fontSize: isAccent
                      ? "clamp(1.05rem, 1.95vw, 1.4rem)"
                      : "clamp(0.95rem, 1.65vw, 1.18rem)",
                    color: isAccent ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {col.props.children}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ComparisonColumn(_props: ComparisonColumnProps) {
  // Denna komponent används bara som "data holder" inuti Comparison.
  // Children och title läses av Comparison via Children.map.
  return null;
}
