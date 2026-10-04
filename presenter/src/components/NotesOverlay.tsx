"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotesSizeControl, notesSizeKey, useNotesSize } from "./NotesSize";

interface NotesOverlayProps {
  visible: boolean;
  notes: string | null;
  slideNumber: number;
  totalSlides: number;
  onClose: () => void;
}

export function NotesOverlay({ visible, notes, slideNumber, totalSlides, onClose }: NotesOverlayProps) {
  const notesSize = useNotesSize("overlay");
  // + och − ändrar storleken medan rutan är öppen; pilarna går som förut till spelaren.
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      notesSizeKey(e, notesSize);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, notesSize]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-center px-4 pb-12 pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl rounded-xl border border-accent-dim bg-bg-surface/95 p-6 shadow-2xl backdrop-blur-sm"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-text-muted">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent-glow)" }} />
                Speaker notes
              </span>
              <span className="flex items-center gap-5">
                <NotesSizeControl notes={notesSize} />
                <span className="tabular-nums">
                  Slide {slideNumber} / {totalSlides}
                </span>
              </span>
            </div>
            <div className="slide-prose max-h-[60vh] overflow-auto leading-relaxed text-text" style={{ fontSize: notesSize.size }}>
              {notes ? (
                notes.split(/\n\s*\n/).map((para, i) => (
                  <p key={i} className="mb-[0.7em] last:mb-0">
                    {para.trim()}
                  </p>
                ))
              ) : (
                <p className="text-text-muted italic">Inga notes för denna slide.</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-text-muted">
              <span>Tryck <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">N</kbd> eller klicka utanför för att stänga · <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">+</kbd> <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">−</kbd> textstorlek</span>
              <span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">←</kbd>{" "}
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">→</kbd> fortsätter att fungera
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
