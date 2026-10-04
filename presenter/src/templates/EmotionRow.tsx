"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

type Size = "sm" | "md" | "lg" | "xl";

interface EmotionRowProps {
  title?: string;
  children?: ReactNode;
  /** Stega fram en i taget med space/pil. Default false = alla syns direkt. */
  stepped?: boolean;
  titleSize?: Size;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 1.875rem)",
  md: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lg: "clamp(2.5rem, 5vw, 4rem)",
  xl: "clamp(3rem, 6vw, 5rem)",
};

interface ParsedItem {
  emoji?: string;
  label: string;
  sublabel?: string;
}

/**
 * Rad med N färgade "pill"-kategorier. Bra för ramverk som återkommer
 * (tex de fem känslorna, Blooms sex nivåer, värdegrund-kategorier).
 *
 * Kan stega fram med space/pil om stepped=true, annars visas alla direkt.
 *
 * <EmotionRow title="Fem känslor" stepped>
 * - 🟡 Rädsla · Skydda
 * - 🟣 Sorg · Hedra
 * - 🟠 Reflektion · Pausa
 * - 🟢 Nyfikenhet · Utforska
 * - 🔵 Agens · Medskapa
 * </EmotionRow>
 */
function parseItems(children: ReactNode): ParsedItem[] {
  const items: ParsedItem[] = [];

  const parseLine = (text: string): ParsedItem => {
    // Matcha ledande emoji (unicode) följt av text
    const emojiMatch = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)$/u);
    let emoji: string | undefined;
    let rest = text;
    if (emojiMatch) {
      emoji = emojiMatch[1];
      rest = emojiMatch[2];
    }
    const parts = rest.split(/\s*[·•|]\s*/);
    return {
      emoji,
      label: parts[0]?.trim() ?? "",
      sublabel: parts[1]?.trim(),
    };
  };

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = Children.toArray(li.props.children)
      .map((k) => {
        if (typeof k === "string") return k;
        if (isValidElement(k)) {
          const kids = (k as ReactElement<{ children?: ReactNode }>).props.children;
          return Children.toArray(kids).join("");
        }
        return "";
      })
      .join("");
    items.push(parseLine(text));
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;
    const type = element.type;
    if (type === "ul" || type === "ol") {
      Children.forEach(element.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (type === "li") {
      walkLi(element as ReactElement<{ children?: ReactNode }>);
    }
  });
  return items;
}

export function EmotionRow({
  title,
  children,
  stepped = false,
  titleSize = "md",
}: EmotionRowProps) {
  const items = parseItems(children);
  const activeStep = useSlideSteps(stepped ? items.length : 0);

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
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        <div
          className="grid gap-3 md:gap-4"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item, i) => {
            const isRevealed = stepped ? i <= activeStep : true;
            const isActive = stepped ? i === activeStep : false;
            return (
              <motion.div
                key={i}
                className="flex flex-col gap-3 rounded-lg border p-5 text-left transition-all"
                style={{
                  borderRadius: "var(--radius)",
                  borderColor: isActive ? "var(--accent)" : "rgba(255,255,255,0.08)",
                  background: isActive
                    ? "var(--accent-dim, rgba(255,255,255,0.04))"
                    : "rgba(255,255,255,0.02)",
                  boxShadow: isActive
                    ? "0 0 36px var(--accent-glow, rgba(255,255,255,0.1))"
                    : "none",
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{
                  opacity: isRevealed ? (stepped && !isActive ? 0.35 : 1) : 0,
                  y: isRevealed ? 0 : 16,
                }}
                transition={{
                  duration: 0.5,
                  delay: stepped ? 0 : 0.1 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {item.emoji && (
                  <div className="text-[clamp(1.75rem,3.5vw,2.75rem)] leading-none">
                    {item.emoji}
                  </div>
                )}
                <div
                  className="text-[clamp(1.125rem,2vw,1.5rem)] font-semibold leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.label}
                </div>
                {item.sublabel && (
                  <div className="text-[clamp(0.8rem,1.2vw,0.95rem)] uppercase tracking-[0.2em] text-text-muted">
                    {item.sublabel}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
