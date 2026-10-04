"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { InteractionType, QuizOption } from "@/lib/interactions";

interface InteractionStartModalProps {
  visible: boolean;
  type: InteractionType | null;
  starting: boolean;
  error: string | null;
  slideIndex: number;
  onSubmit: (opts: { prompt: string; options?: QuizOption[]; slideIndex: number }) => Promise<void>;
  onClose: () => void;
}

export function InteractionStartModal({
  visible,
  type,
  starting,
  error,
  slideIndex,
  onSubmit,
  onClose,
}: InteractionStartModalProps) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setPrompt("");
      setOptions(["", ""]);
      setCorrectIndex(null);
    }
  }, [visible, type]);

  const canSubmit = (() => {
    if (!prompt.trim()) return false;
    if (type === "quiz") {
      const filled = options.filter((o) => o.trim().length > 0);
      return filled.length >= 2;
    }
    return true;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !type) return;
    const payload: { prompt: string; options?: QuizOption[]; slideIndex: number } = {
      prompt: prompt.trim(),
      slideIndex,
    };
    if (type === "quiz") {
      payload.options = options
        .map((o, i) => ({ text: o.trim(), correct: correctIndex === i }))
        .filter((o) => o.text.length > 0);
    }
    await onSubmit(payload);
  };

  const title = type === "quiz" ? "Starta quiz" : "Starta reflektion";
  const hint =
    type === "quiz"
      ? "Publiken röstar på ett alternativ. Du kan välja att visa resultatet när du vill."
      : "Publiken skriver en fri text. Du ser alla svar live och kan markera några som featured.";

  return (
    <AnimatePresence>
      {visible && type && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-6 md:p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" aria-hidden />

          <motion.form
            onSubmit={handleSubmit}
            className="relative flex w-full max-w-xl flex-col gap-4 rounded-xl border border-white/10 bg-bg p-6 md:p-8"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-accent">{title}</div>
              <p className="mt-1 text-xs text-text-muted">{hint}</p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Fråga</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus
                rows={3}
                maxLength={1000}
                placeholder={
                  type === "quiz"
                    ? "T.ex. Vilket område känner du dig mest osäker på?"
                    : "T.ex. Vad väcker det här en tanke om hos dig?"
                }
                className="rounded-lg border border-white/15 bg-bg-surface/40 p-3 text-sm text-text outline-none transition-colors focus:border-accent"
              />
            </label>

            {type === "quiz" && (
              <div className="flex flex-col gap-2">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Alternativ
                  <span className="ml-2 normal-case tracking-normal text-[0.65rem]">
                    (klicka prick för korrekt svar — valfritt)
                  </span>
                </div>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex((prev) => (prev === i ? null : i))}
                      title={correctIndex === i ? "Korrekt svar" : "Markera som korrekt"}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        correctIndex === i
                          ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                          : "border-white/15 text-text-muted hover:border-accent"
                      }`}
                    >
                      {correctIndex === i ? "✓" : ""}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Alternativ ${i + 1}`}
                      maxLength={300}
                      className="flex-1 rounded-lg border border-white/15 bg-bg-surface/40 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOptions(options.filter((_, j) => j !== i));
                          if (correctIndex === i) setCorrectIndex(null);
                          else if (correctIndex != null && correctIndex > i) {
                            setCorrectIndex(correctIndex - 1);
                          }
                        }}
                        className="shrink-0 text-text-muted hover:text-red-400"
                        title="Ta bort"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, ""])}
                    className="self-start text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-accent"
                  >
                    + lägg till alternativ
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-muted hover:border-accent hover:text-accent"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={!canSubmit || starting}
                className="rounded-full border border-accent bg-accent px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-bg transition-colors hover:bg-accent/90 disabled:opacity-40"
              >
                {starting ? "Startar…" : title}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
