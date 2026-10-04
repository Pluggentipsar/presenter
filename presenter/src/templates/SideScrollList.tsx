"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

type Size = "sm" | "md" | "lg" | "xl";

interface SideScrollListProps {
  title?: string;
  children?: ReactNode;
  /** Färg på blobbarna - default är accent */
  blobColor?: string;
  /** Storlek på rubriken. Default md. */
  titleSize?: Size;
  /** Storlek på text i blobbarna. Default md. */
  pointSize?: Size;
  /** Liten mono-tagg uppe till höger (t.ex. "§ Det är ett wicked problem"). */
  chapter?: string;
  /** Bakgrundsbild eller CSS-värde. Om angiven används helsides-bakgrund. */
  background?: string;
  /** Mörk overlay på bakgrundsbild (0-1). Default 0.7. */
  overlay?: number;
  /** Accentfärg för chapter-markör + hårkors. Default var(--accent). */
  accent?: string;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "transparent";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.125rem, 2.25vw, 1.75rem)",
  md: "clamp(1.5rem, 3vw, 2.25rem)",
  lg: "clamp(2rem, 4vw, 3rem)",
  xl: "clamp(2.5rem, 5vw, 3.75rem)",
};

const POINT_SIZES: Record<Size, string> = {
  sm: "clamp(1.125rem, 2.25vw, 2rem)",
  md: "clamp(1.5rem, 3vw, 2.75rem)",
  lg: "clamp(2rem, 4vw, 3.5rem)",
  xl: "clamp(2.5rem, 5vw, 4.25rem)",
};

function extractPoints(children: ReactNode): ReactNode[] {
  const points: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;
    const type = element.type;
    if (type === "ul" || type === "ol") {
      Children.forEach(element.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          points.push((li as ReactElement<{ children?: ReactNode }>).props.children);
        }
      });
    } else if (type === "li") {
      points.push(element.props.children);
    }
  });
  return points;
}

/**
 * Sidoscrollande punktlista med stor rund blobb.
 *
 * Varje klick → nästa punkt scrollar in från höger.
 * Efter alla punkter visats → en översikts-layout med alla punkter mindre.
 *
 * Användning:
 * <SideScrollList title="Tre principer">
 * - Lärande måste få vara ansträngande
 * - AI ska vara språket med vilket du definierar lärande
 * - Aldrig AI för AI:s skull
 * </SideScrollList>
 *
 * Antal steg: antal punkter + 1 (sista steget visar alla)
 */
export function SideScrollList({
  title,
  children,
  blobColor,
  titleSize = "md",
  pointSize = "md",
  chapter,
  background,
  overlay = 0.7,
  accent,
}: SideScrollListProps) {
  const points = extractPoints(children);
  const totalSteps = points.length + 1; // en per punkt + en översikt
  const activeStep = useSlideSteps(totalSteps);

  const isOverview = activeStep === points.length;
  const currentIndex = isOverview ? -1 : activeStep;
  const accentColor = accent ?? "var(--accent)";
  const useFullBackground = Boolean(background);

  // När en helsides-bakgrund (foto med mörk scrim) är satt är ytan mörk på BÅDA
  // teman → texten måste vara fast ljus. Utan bakgrund följer texten temat.
  const primaryText = useFullBackground ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = useFullBackground ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  const containerClass = useFullBackground
    ? "relative h-full w-full overflow-hidden flex items-center justify-center"
    : "slide-container";

  const containerStyle: React.CSSProperties = useFullBackground
    ? { background: resolveBackground(background, overlay), padding: "clamp(3rem, 6vw, 7rem)", paddingTop: "clamp(5rem, 9vh, 7rem)" }
    : {};

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Chapter — bara när background är satt (då har vi helsides-canvas) */}
      {chapter && useFullBackground ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör — bara när background är satt */}
      {useFullBackground ? (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "clamp(3rem, 5vh, 4rem)",
            left: "clamp(3rem, 6vw, 6rem)",
            width: "3rem",
            height: "1px",
            background: accentColor,
            transformOrigin: "left",
            zIndex: 5,
          }}
        />
      ) : null}

      <div
        className="relative flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="leading-tight"
            style={{
              fontSize: TITLE_SIZES[titleSize],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
              color: mutedText,
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        {/* Singel-vy: en punkt i taget */}
        <AnimatePresence mode="wait">
          {!isOverview && (
            <motion.div
              key={`point-${currentIndex}`}
              className="flex items-center gap-10"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="flex flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  width: "clamp(8rem, 16vw, 14rem)",
                  height: "clamp(8rem, 16vw, 14rem)",
                  background: blobColor ?? "var(--accent)",
                  boxShadow: "0 0 60px var(--accent-glow), inset 0 -20px 40px rgba(0,0,0,0.2)",
                }}
                initial={{ scale: 0.7, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  className="text-[clamp(3rem,6vw,5rem)] font-bold text-bg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {currentIndex + 1}
                </span>
              </motion.div>
              <motion.div
                className="leading-tight"
                style={{
                  fontSize: POINT_SIZES[pointSize],
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                  color: primaryText,
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {points[currentIndex]}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Översikts-vy: alla punkter syns */}
        {isOverview && (
          <motion.div
            className="flex flex-col gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {points.map((point, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-6"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
              >
                <div
                  className="flex flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: "clamp(3rem, 5vw, 4rem)",
                    height: "clamp(3rem, 5vw, 4rem)",
                    background: blobColor ?? "var(--accent)",
                    boxShadow: "0 0 24px var(--accent-dim)",
                  }}
                >
                  <span
                    className="text-xl font-bold text-bg md:text-2xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div
                  className="text-[clamp(1.125rem,2vw,1.5rem)] leading-snug"
                  style={{ fontFamily: "var(--font-body)", color: primaryText }}
                >
                  {point}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Progress-indikator i botten */}
        <div
          className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em]"
          style={{ color: mutedText }}
        >
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === activeStep ? "1.5rem" : "0.375rem",
                  background: i <= activeStep ? "var(--accent)" : mutedText,
                  opacity: i <= activeStep ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <span className="ml-2">
            {isOverview ? "Sammanfattning" : `${activeStep + 1} av ${points.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}
