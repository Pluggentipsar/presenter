"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface VideoChaptersProps {
  /** Path till videon */
  src: string;
  /** Rubrik över videon */
  title?: string;
  /** Sidolista med chapters. Format: "- 0:15 · Titel" */
  children?: ReactNode;
  /** Autoplay-loop som bakgrund. Default true. */
  autoPlay?: boolean;
  titleSize?: Size;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 1.875rem)",
  md: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lg: "clamp(2.5rem, 5vw, 4rem)",
  xl: "clamp(3rem, 6vw, 5rem)",
};

interface Chapter {
  seconds: number;
  display: string;
  title: string;
}

function parseTime(t: string): number {
  const parts = t.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(t, 10) || 0;
}

function parseChapters(children: ReactNode): Chapter[] {
  const chapters: Chapter[] = [];

  const extractText = (rawNode: ReactNode): string => {
    const node = unwrapLazy(rawNode);
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (isValidElement(node)) {
      return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
    }
    return "";
  };

  const parseLine = (text: string): Chapter | null => {
    const parts = text.split(/\s*[·•|]\s*/);
    if (parts.length < 2) return null;
    const timeStr = parts[0]?.trim() ?? "";
    const title = parts.slice(1).join(" · ").trim();
    if (!timeStr) return null;
    return {
      seconds: parseTime(timeStr),
      display: timeStr,
      title,
    };
  };

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = extractText(li.props.children);
    const chapter = parseLine(text);
    if (chapter) chapters.push(chapter);
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
  return chapters;
}

/**
 * Video med sido-lista av tidsmarkörer. Klick på ett kapitel spolar dit.
 *
 * <VideoChapters src="/videos/skr/media3.mp4" title="Collins Simulator">
 * - 0:00 · Intro och spelkoncept
 * - 0:15 · Collins kretsar baksidan av månen
 * - 1:02 · Blackout - ingen radio
 * - 2:30 · Slutskärmen med statistik
 * </VideoChapters>
 */
export function VideoChapters({
  src,
  title,
  children,
  autoPlay = true,
  titleSize = "md",
}: VideoChaptersProps) {
  const chapters = parseChapters(children);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const jumpTo = (i: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = chapters[i].seconds;
    video.play().catch(() => {});
    setActiveIdx(i);
  };

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

        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Video */}
          <motion.div
            className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-black"
            style={{ borderRadius: "var(--radius)", aspectRatio: "16/9" }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <video
              ref={videoRef}
              src={src}
              autoPlay={autoPlay}
              muted
              playsInline
              controls
              className="h-full w-full object-contain"
            />
          </motion.div>

          {/* Chapter-lista */}
          {chapters.length > 0 && (
            <motion.div
              className="flex w-full flex-col gap-1.5 md:w-80"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mb-1 text-xs uppercase tracking-[0.25em] text-accent">
                Kapitel
              </div>
              {chapters.map((chapter, i) => {
                const isActive = activeIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => jumpTo(i)}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2 text-left transition-all ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-white/10 bg-bg-surface/30 hover:border-white/30 hover:bg-bg-surface/60"
                    }`}
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <span
                      className={`shrink-0 font-mono text-xs tabular-nums md:text-sm ${
                        isActive ? "text-accent" : "text-text-muted"
                      }`}
                    >
                      {chapter.display}
                    </span>
                    <span className="text-sm leading-snug text-text md:text-base">
                      {chapter.title}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
