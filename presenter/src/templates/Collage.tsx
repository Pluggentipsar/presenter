"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

interface CollageProps {
  /** Bilder - 2, 3, 4 eller 5 stycken */
  images: string | string[];
  /** Layout-variant */
  layout?: "grid-2" | "grid-3" | "grid-4" | "grid-5-hero" | "auto";
  /** Titel ovanför */
  title?: string;
  children?: ReactNode;
}

/**
 * Flera bilder i komposition. Bra för att visa bredd, variation, exempel.
 *
 * Layouts:
 * - grid-2: Två bilder sida vid sida
 * - grid-3: Tre bilder i rad
 * - grid-4: 2x2-rutnät
 * - grid-5-hero: En stor + fyra små
 * - auto: Väljs baserat på antal bilder
 *
 * Användning:
 * <Collage layout="grid-3" images="img1.jpg, img2.jpg, img3.jpg">
 *   # Valfri titel
 * </Collage>
 *
 * Eller som array (fungerar inte alltid i MDX-attribut):
 * <Collage layout="grid-4" images={["img1", "img2", "img3", "img4"]} />
 */
export function Collage({ images, layout = "auto", title, children }: CollageProps) {
  const imageList = Array.isArray(images)
    ? images
    : images.split(/\s*,\s*/).filter(Boolean);

  // Bestäm layout automatiskt baserat på antal
  const actualLayout = layout === "auto"
    ? imageList.length === 2
      ? "grid-2"
      : imageList.length === 3
        ? "grid-3"
        : imageList.length === 5
          ? "grid-5-hero"
          : "grid-4"
    : layout;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-8"
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
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}
        {children && <div className="slide-prose">{children}</div>}
        <GridContainer layout={actualLayout}>
          {imageList.map((src, i) => (
            <motion.div
              key={src + i}
              className="relative overflow-hidden bg-bg-surface"
              style={{ borderRadius: "var(--radius)" }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.1 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </GridContainer>
      </div>
    </div>
  );
}

function GridContainer({
  layout,
  children,
}: {
  layout: string;
  children: ReactNode;
}) {
  const gridClass = {
    "grid-2": "grid grid-cols-2 gap-4 aspect-[16/10] max-h-[75vh]",
    "grid-3": "grid grid-cols-3 gap-4 aspect-[16/10] max-h-[75vh]",
    "grid-4": "grid grid-cols-2 grid-rows-2 gap-4 aspect-[16/10] max-h-[75vh]",
    "grid-5-hero":
      "grid grid-cols-3 grid-rows-2 gap-4 aspect-[16/10] max-h-[75vh] [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2",
  }[layout] ?? "grid grid-cols-2 gap-4 aspect-[16/10] max-h-[75vh]";

  return <div className={gridClass}>{children}</div>;
}
