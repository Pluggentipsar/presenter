"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Interaction, InteractionResponse } from "@/lib/interactions";

interface InteractionPresenterPanelProps {
  active: Interaction | null;
  responses: InteractionResponse[];
  onEnd: () => Promise<void>;
  onSetReveal: (reveal: boolean) => Promise<void>;
  onFeature: (responseId: string, featured: boolean) => Promise<void>;
}

/**
 * En diskret badge i presentatörsvyn som visar att en interaktion pågår.
 * Klicka för att expandera till en panel med live-resultat.
 */
export function InteractionPresenterPanel({
  active,
  responses,
  onEnd,
  onSetReveal,
  onFeature,
}: InteractionPresenterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!active) return null;

  return (
    <>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-accent/60 bg-accent/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-accent backdrop-blur-sm transition-colors hover:bg-accent/25"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        {active.type === "quiz" ? "Quiz pågår" : "Reflektion pågår"}
        <span className="text-text-muted">·</span>
        <span>{responses.length} svar</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-40 flex items-start justify-center overflow-auto p-6 md:p-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

            <motion.div
              className="relative flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-white/10 bg-bg p-6 md:p-8"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.3em] text-accent">
                    {active.type === "quiz" ? "Quiz" : "Reflektion"}
                    {active.slide_index != null && (
                      <span className="ml-2 text-text-muted">
                        · från slide {active.slide_index + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg text-text">{active.prompt}</p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-text-muted hover:border-accent hover:text-accent"
                >
                  Stäng
                </button>
              </div>

              {active.type === "quiz" ? (
                <QuizResults interaction={active} responses={responses} />
              ) : (
                <ReflectionResults
                  responses={responses}
                  onFeature={onFeature}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                <div className="text-xs text-text-muted">
                  {responses.length} svar · startad{" "}
                  {new Date(active.created_at).toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.type === "quiz" && (
                    <button
                      onClick={() => onSetReveal(!active.reveal_results)}
                      className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors ${
                        active.reveal_results
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                          : "border-white/15 text-text-muted hover:border-accent hover:text-accent"
                      }`}
                    >
                      {active.reveal_results ? "Resultat visas" : "Visa resultat för publik"}
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await onEnd();
                      setExpanded(false);
                    }}
                    className="rounded-full border border-red-400/60 bg-red-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-red-300 hover:bg-red-500/20"
                  >
                    Avsluta
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function QuizResults({
  interaction,
  responses,
}: {
  interaction: Interaction;
  responses: InteractionResponse[];
}) {
  const options = interaction.options ?? [];
  const counts = options.map(
    (_, i) => responses.filter((r) => r.option_index === i).length
  );
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <ul className="flex flex-col gap-3">
      {options.map((opt, i) => {
        const count = counts[i];
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        const isCorrect = opt.correct === true;
        return (
          <li
            key={i}
            className={`relative overflow-hidden rounded-lg border p-3 ${
              isCorrect ? "border-emerald-400/60 bg-emerald-400/5" : "border-white/10 bg-bg-surface/40"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent/20 transition-all"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-text">
                {isCorrect && <span className="text-emerald-400">✓</span>}
                {opt.text}
              </div>
              <div className="flex items-center gap-3 text-sm tabular-nums text-text-muted">
                <span>{count}</span>
                <span className="w-10 text-right font-semibold text-text">{pct}%</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReflectionResults({
  responses,
  onFeature,
}: {
  responses: InteractionResponse[];
  onFeature: (id: string, featured: boolean) => Promise<void>;
}) {
  const sorted = [...responses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-text-muted">
        Inga reflektioner än. De dyker upp här så fort publiken svarar.
      </div>
    );
  }

  return (
    <ul className="flex max-h-[50vh] flex-col gap-3 overflow-auto">
      {sorted.map((r) => (
        <li
          key={r.id}
          className={`rounded-lg border p-4 ${
            r.featured
              ? "border-accent/60 bg-accent/5"
              : "border-white/10 bg-bg-surface/40"
          }`}
        >
          <p className="whitespace-pre-wrap text-sm text-text">{r.text}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              {new Date(r.created_at).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={() => onFeature(r.id, !r.featured)}
              className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] transition-colors ${
                r.featured
                  ? "border-accent text-accent"
                  : "border-white/15 text-text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {r.featured ? "★ Featured" : "Markera"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
