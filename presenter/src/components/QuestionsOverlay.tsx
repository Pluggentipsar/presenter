"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { AudienceQuestion } from "@/lib/audience-session";

interface QuestionsOverlayProps {
  visible: boolean;
  questions: AudienceQuestion[];
  onClose: () => void;
  onMarkSeen: () => void;
  currentSlide: number;
}

export function QuestionsOverlay({
  visible,
  questions,
  onClose,
  onMarkSeen,
  currentSlide,
}: QuestionsOverlayProps) {
  // Markera alla som sedda när modalen öppnas
  useEffect(() => {
    if (visible) onMarkSeen();
  }, [visible, onMarkSeen]);

  const sorted = [...questions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-6 md:p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

          <motion.div
            className="relative flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-white/10 bg-bg p-6 md:p-8"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-accent">
                  Frågor från publiken
                </div>
                <div className="mt-1 text-sm text-text-muted">
                  {questions.length === 0
                    ? "Inga frågor än"
                    : `${questions.length} st total${questions.length === 1 ? "" : "t"}`}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-muted transition-all hover:border-accent hover:text-accent"
              >
                Stäng
              </button>
            </div>

            <div className="-mx-2 max-h-[60vh] overflow-auto px-2">
              {sorted.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-text-muted">
                  När någon i publiken ställer en fråga dyker den upp här.
                </div>
              )}
              <ul className="flex flex-col gap-3">
                {sorted.map((q) => {
                  const onCurrent = q.slide_index === currentSlide;
                  return (
                    <li
                      key={q.id}
                      className={`rounded-lg border p-4 ${
                        onCurrent
                          ? "border-accent/60 bg-accent/5"
                          : "border-white/10 bg-bg-surface/40"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm text-text">{q.question}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                        {q.slide_index != null && (
                          <span>
                            Slide {q.slide_index + 1}
                            {onCurrent && (
                              <span className="ml-1 text-accent">· aktuell</span>
                            )}
                          </span>
                        )}
                        <span>{formatTime(q.created_at)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}
