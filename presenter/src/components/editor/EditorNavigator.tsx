"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SlideLabel {
  tag: string;
  title: string;
}

interface EditorNavigatorProps {
  open: boolean;
  onClose: () => void;
  labels: SlideLabel[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Fullscreen overlay för att snabbt hoppa till vilken slide som helst.
 * Samma mönster som M-menyn i presentationsvyn: visar alla slides i grid
 * med nummer + template-tag + titel. Klick byter aktiv slide i editorn.
 */
export function EditorNavigator({
  open,
  onClose,
  labels,
  activeIndex,
  onSelect,
  onReorder,
}: EditorNavigatorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Escape stänger
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSelect = (i: number) => {
    onSelect(i);
    onClose();
  };

  const handleDragStart = (e: React.DragEvent, i: number) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (i !== dragOverIndex) setDragOverIndex(i);
  };

  const handleDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    const from = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);
    if (from === null || from === to) return;
    onReorder(from, to);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" aria-hidden />
          <motion.div
            className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-8 md:p-12"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-accent">Navigera</div>
                <div className="mt-1 text-sm text-text-muted">
                  {labels.length} slides · klick byter · drag för att ordna om · esc stänger
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-muted transition-all hover:border-accent hover:text-accent"
              >
                Stäng
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {labels.map((label, i) => {
                const isActive = i === activeIndex;
                const isDragOver = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
                const isDragging = dragIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    title="Klick för att hoppa · Dra för att ordna om"
                    className={`group relative flex aspect-video flex-col justify-between rounded-lg border p-3 text-left transition-all cursor-grab active:cursor-grabbing ${
                      isDragging
                        ? "opacity-30"
                        : isDragOver
                          ? "border-accent border-dashed bg-accent/10 scale-105"
                          : isActive
                            ? "border-accent bg-accent-dim"
                            : "border-white/10 bg-bg-surface/40 hover:border-white/30 hover:bg-bg-surface"
                    }`}
                  >
                    {/* Grip-handle (visuell drag-hint) */}
                    <span
                      aria-hidden
                      className="absolute right-2 bottom-2 select-none text-white/25 transition-colors group-hover:text-accent/70"
                      style={{
                        fontSize: "0.8rem",
                        lineHeight: 1,
                        letterSpacing: "0.05em",
                      }}
                    >
                      ⋮⋮
                    </span>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          isActive ? "text-accent" : "text-text-muted"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-text-muted">
                        {shortTag(label.tag)}
                      </span>
                    </div>
                    {label.title && (
                      <div className="line-clamp-3 text-sm text-text pr-4">{label.title}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function shortTag(tag: string): string {
  const map: Record<string, string> = {
    TitleSlide: "TITLE",
    SectionDivider: "DIVIDER",
    GiantText: "GIANT",
    Quote: "QUOTE",
    PictureQuote: "P-QUOTE",
    ImageText: "IMG+TXT",
    StatCounter: "STAT",
    PromptAnimation: "PROMPT",
    SideScrollList: "SIDESCRL",
    NumberedReveal: "NUMBERS",
    BulletBuild: "BULLETS",
    Timeline: "TIMELINE",
    Reflection: "REFLECT",
    Comparison: "COMPARE",
    HeroImage: "HERO",
    LayeredText: "LAYERED",
    ImageBleed: "BLEED",
    Collage: "COLLAGE",
    VideoEmbed: "VIDEO",
    VideoBackground: "VIDEO-BG",
    SlideshowMorph: "MORPH",
    GiantScroll: "SCROLL",
    LayeredScroll: "SCROLL+",
    ParticleField: "PARTICLE",
    LoadingSlide: "LOADING",
    PollQuestion: "POLL",
    CodeReveal: "CODE",
    Callout: "CALLOUT",
  };
  return map[tag] ?? tag.toUpperCase().slice(0, 8);
}
