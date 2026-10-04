"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface BulletBuildProps {
  title?: string;
  children?: ReactNode;
  /** Storlek på rubrik. Default md. */
  titleSize?: Size;
  /** Storlek på punktlista-text. Default md. */
  bulletSize?: Size;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3.5vw, 2.5rem)",
  md: "clamp(2rem, 5vw, 3.5rem)",
  lg: "clamp(2.75rem, 6.5vw, 5rem)",
  xl: "clamp(3.5rem, 8vw, 6.5rem)",
};

const BULLET_SIZES: Record<Size, string> = {
  sm: "clamp(1rem, 1.8vw, 1.25rem)",
  md: "clamp(1.25rem, 2.5vw, 1.75rem)",
  lg: "clamp(1.75rem, 3.5vw, 2.5rem)",
  xl: "clamp(2.25rem, 4.5vw, 3.25rem)",
};

function extractBullets(children: ReactNode): ReactNode[] {
  const bullets: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;
    const type = element.type;

    if (type === "ul" || type === "ol") {
      Children.forEach(element.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          bullets.push((li as ReactElement<{ children?: ReactNode }>).props.children);
        }
      });
    } else if (type === "li") {
      bullets.push(element.props.children);
    }
  });

  return bullets;
}

export function BulletBuild({
  title,
  children,
  titleSize = "md",
  bulletSize = "md",
}: BulletBuildProps) {
  const bullets = extractBullets(children);

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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <EditableText
              path="title"
              value={title ?? ""}
              sizeControls={[
                { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
                { prop: "bulletSize", current: bulletSize, options: ["sm", "md", "lg", "xl"], label: "Bullets" },
              ]}
            >{title}</EditableText>
          </motion.h2>
        )}
        <ul className="flex flex-col gap-5">
          {bullets.map((bullet, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-4 leading-snug"
              style={{ fontSize: BULLET_SIZES[bulletSize] }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.2, ease: "easeOut" }}
            >
              <span
                className="mt-[0.55em] h-2 w-2 flex-shrink-0 rounded-full bg-accent"
                style={{ boxShadow: "0 0 12px var(--accent-glow)" }}
              />
              <span>{bullet}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
