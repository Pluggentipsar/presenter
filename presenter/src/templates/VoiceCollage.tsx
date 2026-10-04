"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface VoiceCollageProps {
  title?: string;
  children?: ReactNode;
  /** Storlek på rubriken. Default md. */
  titleSize?: Size;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 1.875rem)",
  md: "clamp(1.5rem, 3vw, 2.25rem)",
  lg: "clamp(2rem, 4vw, 3rem)",
  xl: "clamp(2.5rem, 5vw, 3.75rem)",
};

/**
 * Grid av korta citat från fältet - röster som "skriker samtidigt".
 * Varje rad i markdown-listan blir ett kort med valfri avsändare (fetstil
 * framför kolon). Korten har organisk variation i storlek + lätt rotation
 * för att undvika en stel tabell-känsla.
 *
 * <VoiceCollage title="Röster från fältet">
 * - **Lärare, åk 8:** Jag är så trött på det här
 * - **Elev, åk 9:** Chatten är min bästa vän
 * - **Vårdnadshavare:** Min dotter pratar bara med ChatGPT
 * </VoiceCollage>
 */
function extractVoices(children: ReactNode): {
  attribution: string | null;
  quote: ReactNode;
}[] {
  const voices: { attribution: string | null; quote: ReactNode }[] = [];

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const kids = Children.toArray(li.props.children);
    // Kolla om första noden är <strong>X:</strong>
    if (kids.length > 0 && isValidElement(kids[0])) {
      const first = kids[0] as ReactElement<{ children?: ReactNode }>;
      if (first.type === "strong") {
        const strongText = Children.toArray(first.props.children).join("");
        if (strongText.trim().endsWith(":")) {
          const attribution = strongText.replace(/:$/, "").trim();
          const rest = kids.slice(1);
          voices.push({ attribution, quote: rest });
          return;
        }
      }
    }
    voices.push({ attribution: null, quote: kids });
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
  return voices;
}

// Pre-bestämda variationer så att layouten är pålitlig men inte stel
const STYLES = [
  { span: "col-span-2", rotate: -1.2, size: "lg" },
  { span: "col-span-1", rotate: 0.8, size: "sm" },
  { span: "col-span-1", rotate: -0.6, size: "md" },
  { span: "col-span-2", rotate: 1.1, size: "md" },
  { span: "col-span-1", rotate: -1.4, size: "sm" },
  { span: "col-span-2", rotate: 0.5, size: "md" },
  { span: "col-span-1", rotate: 1.3, size: "lg" },
  { span: "col-span-1", rotate: -0.9, size: "sm" },
  { span: "col-span-2", rotate: 0.7, size: "md" },
  { span: "col-span-1", rotate: -1.1, size: "md" },
  { span: "col-span-2", rotate: 0.3, size: "sm" },
  { span: "col-span-1", rotate: -0.4, size: "md" },
] as const;

const CARD_TEXT_SIZES = {
  sm: "text-[clamp(0.95rem,1.6vw,1.25rem)]",
  md: "text-[clamp(1.125rem,2.1vw,1.625rem)]",
  lg: "text-[clamp(1.5rem,2.8vw,2.25rem)]",
} as const;

export function VoiceCollage({
  title,
  children,
  titleSize = "md",
}: VoiceCollageProps) {
  const voices = extractVoices(children);

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-6"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="leading-tight text-text-muted"
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

        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4">
          {voices.map((voice, i) => {
            const style = STYLES[i % STYLES.length];
            return (
              <motion.div
                key={i}
                className={`${style.span} flex flex-col gap-2 rounded-xl border border-white/10 bg-bg-surface/60 p-4 backdrop-blur-sm`}
                style={{
                  transform: `rotate(${style.rotate}deg)`,
                  borderRadius: "var(--radius)",
                }}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.45,
                  delay: 0.15 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div
                  className={`${CARD_TEXT_SIZES[style.size]} leading-snug text-text`}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <span className="text-accent">&ldquo;</span>
                  {voice.quote}
                  <span className="text-accent">&rdquo;</span>
                </div>
                {voice.attribution && (
                  <div className="text-[0.7rem] uppercase tracking-[0.15em] text-text-muted md:text-xs">
                    — {voice.attribution}
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
