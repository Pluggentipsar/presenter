"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Children, isValidElement } from "react";
import { EditableText } from "@/lib/inline-edit";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface MapPinsProps {
  /** Rubrik över kartan */
  title?: string;
  /** Path till kartbilden (tex Sverige-karta) */
  mapImage: string;
  /** Alt-text för kartan */
  alt?: string;
  /** Stega fram pins en i taget. Default false. */
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

interface ParsedPin {
  label: string;
  x: number; // 0-100 procent från vänster
  y: number; // 0-100 procent uppifrån
  note?: string;
}

/**
 * Karta (valfri bild) med animerade pins.
 *
 * Children-format: "- Label · x,y" eller "- Label · x,y · notering"
 * där x,y är procent (0-100) av kartbildens yta.
 *
 * <MapPins title="Där jag har varit" mapImage="/bilder/karta-sverige.png">
 * - Hemorten · 42,68 · Hemma-basen
 * - Lidköping · 38,62
 * - Göteborg · 30,72
 * - Stockholm · 55,58
 * - Umeå · 50,30
 * </MapPins>
 */
function parsePins(children: ReactNode): ParsedPin[] {
  const pins: ParsedPin[] = [];

  const extractText = (rawNode: ReactNode): string => {
    const node = unwrapLazy(rawNode);
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (isValidElement(node)) {
      return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
    }
    return "";
  };

  const parseLine = (text: string): ParsedPin | null => {
    const parts = text.split(/\s*[·•|]\s*/);
    if (parts.length < 2) return null;
    const label = parts[0]?.trim() ?? "";
    const coords = parts[1]?.trim() ?? "";
    const note = parts[2]?.trim();
    const m = coords.match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return { label, x: parseFloat(m[1]), y: parseFloat(m[2]), note };
  };

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = extractText(li.props.children);
    const pin = parseLine(text);
    if (pin) pins.push(pin);
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
  return pins;
}

export function MapPins({
  title,
  mapImage,
  alt = "Karta",
  stepped = false,
  titleSize = "md",
  children,
}: MapPinsProps) {
  const pins = parsePins(children);
  const activeStep = useSlideSteps(stepped ? pins.length : 0);

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

        <div className="relative mx-auto" style={{ maxHeight: "70vh" }}>
          <div className="relative inline-block">
            <Image
              src={mapImage}
              alt={alt}
              width={1000}
              height={1000}
              unoptimized
              className="h-auto max-h-[70vh] w-auto"
              style={{ objectFit: "contain" }}
            />

            {pins.map((pin, i) => {
              const isVisible = stepped ? i <= activeStep : true;
              const isActive = stepped ? i === activeStep : false;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                  initial={{ opacity: 0, y: -8, scale: 0.8 }}
                  animate={{
                    opacity: isVisible ? 1 : 0,
                    y: 0,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: stepped ? 0 : 0.2 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="rounded-full border-2 border-white/20 bg-accent px-3 py-1 text-xs font-semibold text-bg md:text-sm"
                      style={{
                        boxShadow: isActive
                          ? "0 0 24px var(--accent-glow)"
                          : "0 2px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      {pin.label}
                    </div>
                    <div
                      className="h-3 w-3 rounded-full border-2 border-bg bg-accent"
                      style={{
                        boxShadow: isActive
                          ? "0 0 16px var(--accent-glow)"
                          : "none",
                      }}
                    />
                    {pin.note && isActive && (
                      <motion.div
                        className="mt-1 max-w-[160px] rounded-md bg-bg-surface/90 px-2 py-1 text-center text-[0.65rem] text-text-muted backdrop-blur"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        {pin.note}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
