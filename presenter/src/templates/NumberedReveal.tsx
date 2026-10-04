"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

type Size = "sm" | "md" | "lg" | "xl";

interface NumberedRevealProps {
  title?: string;
  /** Storlek på rubriken. Default md. */
  titleSize?: Size;
  /** Storlek på punkterna. Default md. */
  itemSize?: Size;
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3.5vw, 2.5rem)",
  md: "clamp(2rem, 5vw, 3.5rem)",
  lg: "clamp(2.75rem, 6.5vw, 5rem)",
  xl: "clamp(3.5rem, 8vw, 6.5rem)",
};

const ITEM_SIZES: Record<Size, string> = {
  sm: "clamp(1rem, 1.8vw, 1.25rem)",
  md: "clamp(1.25rem, 2.5vw, 1.75rem)",
  lg: "clamp(1.75rem, 3.5vw, 2.5rem)",
  xl: "clamp(2.25rem, 4.5vw, 3.25rem)",
};

const NUMBER_SIZES: Record<Size, string> = {
  sm: "clamp(1.75rem, 3.5vw, 2.75rem)",
  md: "clamp(2.5rem, 5vw, 4rem)",
  lg: "clamp(3.25rem, 6.5vw, 5.25rem)",
  xl: "clamp(4rem, 8vw, 6.5rem)",
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
 * Numrerad lista som byggs uppifrån och ned med pil-animation.
 * Varje klick → nästa punkt animeras fram. Först transparent, sen tydlig.
 */
export function NumberedReveal({
  title,
  titleSize = "md",
  itemSize = "md",
  children,
}: NumberedRevealProps) {
  const points = extractPoints(children);
  const activeStep = useSlideSteps(points.length);

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
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
              textTransform: "var(--heading-case)" as "normal" | "uppercase",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        <ol className="flex flex-col gap-8">
          {points.map((point, i) => {
            const isActive = i <= activeStep;
            return (
              <motion.li
                key={i}
                className="flex items-start gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 1 : 0.15 }}
                transition={{ duration: 0.6 }}
              >
                {/* Nummer */}
                <motion.div
                  className="flex flex-shrink-0 items-center"
                  initial={{ scale: 0.8, x: -20 }}
                  animate={{
                    scale: isActive ? 1 : 0.85,
                    x: isActive ? 0 : -10,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <span
                    className="inline-block leading-none tabular-nums"
                    style={{
                      fontSize: NUMBER_SIZES[itemSize],
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      textShadow: isActive ? "0 0 24px var(--accent-glow)" : "none",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </motion.div>

                {/* Pil (bara på aktiv) */}
                {isActive && i === activeStep && (
                  <motion.svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    className="mt-3 flex-shrink-0"
                    style={{ color: "var(--accent)" }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <motion.path
                      d="M5 12h14M12 5l7 7-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                  </motion.svg>
                )}

                {/* Text */}
                <motion.div
                  className="leading-snug"
                  style={{
                    fontSize: `var(--room-body, ${ITEM_SIZES[itemSize]})`,
                    fontFamily: "var(--font-body)",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {point}
                </motion.div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
