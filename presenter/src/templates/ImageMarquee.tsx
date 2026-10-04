"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface ImageMarqueeProps {
  /** Liten label/eyebrow uppe till vänster, t.ex. "AI på film". */
  eyebrow?: string;
  /** Stor rubrik som ligger ovanpå (sparsamt — får inte konkurrera). */
  title?: string;
  /**
   * Sekunder per loop-varv. Default 28 (lugnt parad-tempo).
   * Lägre = snabbare.
   */
  speed?: number;
  /** Riktning. Default left (höger till vänster). */
  direction?: "left" | "right";
  /**
   * Hur stor varje bild är (rad-höjd som andel av viewport-höjd).
   * Default 0.55 (≈55vh per rad).
   */
  imageScale?: number;
  /** Antal rader. Default 1. Med 2 rullar de åt motsatt håll. */
  rows?: 1 | 2;
  /** Bakgrund. Default tema-bg. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Markdown-lista med bilder:
   * `- /bilder/foo.png · Alt-text`
   * Alt-texten är valfri.
   */
  children?: ReactNode;
}

interface MarqueeItem {
  src: string;
  alt: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

function parseItems(children: ReactNode): MarqueeItem[] {
  const items: MarqueeItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      const liEl = li as ReactElement<{ children?: ReactNode }>;
      const text = extractText(liEl.props.children).trim();
      if (!text) return;
      const [srcRaw, ...rest] = text.split("·").map((s) => s.trim());
      if (!srcRaw) return;
      items.push({ src: srcRaw, alt: rest.join(" · ") || "" });
    });
  });
  return items;
}

/**
 * Bilder rullar i en oändlig horisontell loop över skärmen.
 * Använd för pop-kultur-AI-paraden, logo-vägg, etc.
 *
 * Användning:
 * ```mdx
 * <ImageMarquee eyebrow="AI på film" speed={32}>
 * - /bilder/mellanstadiet/terminator.png · Terminator
 * - /bilder/mellanstadiet/WALL-E.png · Wall-E
 * - /bilder/mellanstadiet/R2-D2_Droid.png · R2-D2
 * - /bilder/mellanstadiet/optimus.webp · Optimus
 * - /bilder/mellanstadiet/cute robot.png · Söt robot
 * - /bilder/mellanstadiet/bighero6.jpg · Big Hero 6
 * </ImageMarquee>
 * ```
 */
export function ImageMarquee({
  eyebrow,
  title,
  speed = 28,
  direction = "left",
  imageScale = 0.55,
  rows = 1,
  background,
  overlay,
  overlayMode = "dark",
  children,
}: ImageMarqueeProps) {
  const items = parseItems(children);
  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-text-muted">
        Inga bilder definierade i ImageMarquee.
      </div>
    );
  }

  // Duplicera listan så den kan loopa sömlöst (animera 0 → -50%).
  const doubled = [...items, ...items];

  const rowHeight = `${Math.round(imageScale * 100)}vh`;

  // Splitta items i rader. Vid rows=2: udda → rad 1, jämnt → rad 2.
  const row1 = rows === 2 ? items.filter((_, i) => i % 2 === 0) : items;
  const row2 = rows === 2 ? items.filter((_, i) => i % 2 === 1) : null;

  const animation =
    direction === "left" ? "marquee-left" : "marquee-right";
  const animationReverse =
    direction === "left" ? "marquee-right" : "marquee-left";

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      {(eyebrow || title) ? (
        <div className="absolute left-0 right-0 top-0 z-10 px-12 pt-10">
          {eyebrow ? (
            <div
              className="text-xs uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.3em",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h1
              className="mt-2"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                lineHeight: 1.1,
                letterSpacing: "var(--heading-tracking)",
                textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
                color: "var(--text)",
              }}
            >
              {title}
            </h1>
          ) : null}
        </div>
      ) : null}

      <div className="flex h-full w-full flex-col items-center justify-center gap-10">
        <MarqueeRow
          items={rows === 2 ? [...row1, ...row1] : doubled}
          rowHeight={rowHeight}
          duration={speed}
          animationName={animation}
        />
        {row2 ? (
          <MarqueeRow
            items={[...row2, ...row2]}
            rowHeight={rowHeight}
            duration={speed * 1.15}
            animationName={animationReverse}
          />
        ) : null}
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function MarqueeRow({
  items,
  rowHeight,
  duration,
  animationName,
}: {
  items: MarqueeItem[];
  rowHeight: string;
  duration: number;
  animationName: string;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex w-max items-center gap-12"
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
        }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.src}-${i}`}
            className="shrink-0"
            style={{ height: rowHeight }}
          >
            <img
              src={item.src}
              alt={item.alt}
              className="h-full w-auto object-contain"
              style={{
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
