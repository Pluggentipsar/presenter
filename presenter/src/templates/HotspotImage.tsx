"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Children, isValidElement, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface HotspotImageProps {
  /** Path till bilden */
  src: string;
  alt?: string;
  title?: string;
  /** Stega fram hotspots med space. Default false = alla syns direkt. */
  stepped?: boolean;
  titleSize?: Size;
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 1.875rem)",
  md: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lg: "clamp(2.5rem, 5vw, 4rem)",
  xl: "clamp(3rem, 6vw, 5rem)",
};

interface Hotspot {
  x: number;
  y: number;
  label: string;
  description?: string;
}

/**
 * Bild med klickbara hotspots som visar tooltip.
 *
 * Children-format: "- x,y · Etikett · Beskrivning (valfri)"
 * där x,y är procent (0-100) av bilden.
 *
 * <HotspotImage src="/bilder/blooms.png" alt="Blooms taxonomi" title="Skiftet">
 * - 40,25 · Skapa · AI gör det lätt att generera, svårt att ta ansvar
 * - 50,40 · Värdera · Kräver kontext-medvetenhet mer än förr
 * - 60,55 · Analysera · Där det mänskliga jobbet ligger
 * - 75,80 · Minnas · Chattbotten vet redan allt
 * </HotspotImage>
 */
function parseHotspots(children: ReactNode): Hotspot[] {
  const hotspots: Hotspot[] = [];

  const extractText = (rawNode: ReactNode): string => {
    const node = unwrapLazy(rawNode);
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (isValidElement(node)) {
      return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
    }
    return "";
  };

  const parseLine = (text: string): Hotspot | null => {
    const parts = text.split(/\s*[·•|]\s*/);
    if (parts.length < 2) return null;
    const coordStr = parts[0]?.trim() ?? "";
    const label = parts[1]?.trim() ?? "";
    const description = parts[2]?.trim();
    const m = coordStr.match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return {
      x: parseFloat(m[1]),
      y: parseFloat(m[2]),
      label,
      description,
    };
  };

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = extractText(li.props.children);
    const hotspot = parseLine(text);
    if (hotspot) hotspots.push(hotspot);
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
  return hotspots;
}

export function HotspotImage({
  src,
  alt = "",
  title,
  stepped = false,
  titleSize = "md",
  children,
}: HotspotImageProps) {
  const hotspots = parseHotspots(children);
  const activeStep = useSlideSteps(stepped ? hotspots.length : 0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeIdx = stepped ? activeStep : hoveredIdx;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-6"
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

        <div className="relative mx-auto inline-block" style={{ maxHeight: "70vh" }}>
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={900}
            unoptimized
            className="h-auto max-h-[70vh] w-auto rounded-md"
            style={{ objectFit: "contain", borderRadius: "var(--radius)" }}
          />

          {hotspots.map((hs, i) => {
            const isVisible = stepped ? i <= activeStep : true;
            const isActive = activeIdx === i;
            return (
              <motion.button
                key={i}
                className="group absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40"
                style={{
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  transform: "translate(-50%, -50%)",
                  background: isActive
                    ? "var(--accent)"
                    : "rgba(0,0,0,0.5)",
                  boxShadow: isActive
                    ? "0 0 24px var(--accent-glow)"
                    : "0 2px 8px rgba(0,0,0,0.4)",
                  cursor: stepped ? "default" : "pointer",
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isVisible ? 1 : 0,
                  scale: isVisible ? 1 : 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: stepped ? 0 : 0.2 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onMouseEnter={() => !stepped && setHoveredIdx(i)}
                onMouseLeave={() => !stepped && setHoveredIdx(null)}
                aria-label={hs.label}
              >
                <motion.span
                  className="inline-block h-2 w-2 rounded-full bg-white"
                  animate={isActive ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                  transition={{ duration: 1.2, repeat: isActive ? Infinity : 0 }}
                />

                {/* Tooltip */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="pointer-events-none absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-md border border-accent/30 bg-bg-surface/95 p-3 text-left backdrop-blur"
                      style={{ borderRadius: "var(--radius)" }}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="text-sm font-semibold text-accent">
                        {hs.label}
                      </div>
                      {hs.description && (
                        <div className="mt-1 text-xs leading-snug text-text">
                          {hs.description}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
