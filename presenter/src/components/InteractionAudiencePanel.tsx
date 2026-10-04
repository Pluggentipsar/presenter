"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAudienceInteractions } from "@/lib/use-audience-interactions";
import type { Interaction, InteractionResponse } from "@/lib/interactions";

interface InteractionAudiencePanelProps {
  sessionId: string;
  audienceId: string;
  onActiveChange?: (active: Interaction | null) => void;
}

/**
 * Fixed panel nere till vänster för publiken. Öppnas automatiskt när
 * en ny interaktion blir aktiv. Låter åhöraren svara + se resultat
 * när presentatören avslöjat dem (quiz) eller featured svar (reflektion).
 */
export function InteractionAudiencePanel({
  sessionId,
  audienceId,
  onActiveChange,
}: InteractionAudiencePanelProps) {
  const { active, myResponse, responses, submitting, error, submit } = useAudienceInteractions(
    sessionId,
    audienceId
  );
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Meddela parent vid ändring
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Auto-expand när en ny aktiv interaktion kommer
  useEffect(() => {
    if (active && active.active && active.id !== dismissed) {
      setExpanded(true);
    } else if (!active || !active.active) {
      setExpanded(false);
    }
  }, [active, dismissed]);

  if (!active || !active.active) return null;

  const handleSubmit = async (opts: { optionIndex?: number | null; text?: string | null }) => {
    await submit(opts);
  };

  return (
    <AnimatePresence>
      {expanded ? (
        <motion.div
          key="panel"
          className="fixed bottom-4 left-4 right-4 z-30 md:right-auto md:w-[380px]"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-bg p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-accent">
                  {active.type === "quiz" ? "Quiz" : "Reflektion"}
                </div>
                <p className="mt-1 text-sm text-text">{active.prompt}</p>
              </div>
              <button
                onClick={() => {
                  setExpanded(false);
                  setDismissed(active.id);
                }}
                className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-text-muted"
                aria-label="Göm"
              >
                –
              </button>
            </div>

            {active.type === "quiz" ? (
              <QuizForm
                interaction={active}
                myResponse={myResponse}
                responses={responses}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            ) : (
              <ReflectionForm
                myResponse={myResponse}
                responses={responses}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="badge"
          onClick={() => {
            setExpanded(true);
            setDismissed(null);
          }}
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-accent bg-accent/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-accent backdrop-blur-sm animate-pulse"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          {active.type === "quiz" ? "Öppna quiz" : "Öppna reflektion"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function QuizForm({
  interaction,
  myResponse,
  responses,
  submitting,
  onSubmit,
}: {
  interaction: Interaction;
  myResponse: InteractionResponse | null;
  responses: InteractionResponse[];
  submitting: boolean;
  onSubmit: (opts: { optionIndex?: number | null; text?: string | null }) => Promise<void>;
}) {
  const options = interaction.options ?? [];
  const hasVoted = myResponse?.option_index != null;
  const showResults = interaction.reveal_results;

  const counts = options.map(
    (_, i) => responses.filter((r) => r.option_index === i).length
  );
  const total = counts.reduce((a, b) => a + b, 0);

  if (showResults) {
    return (
      <ul className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const count = counts[i];
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const isMine = myResponse?.option_index === i;
          const isCorrect = opt.correct === true;
          return (
            <li
              key={i}
              className={`relative overflow-hidden rounded-lg border p-2.5 ${
                isCorrect
                  ? "border-emerald-400/60"
                  : isMine
                    ? "border-accent/60"
                    : "border-white/10"
              } bg-bg-surface/40`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent/15"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-text">
                  {isCorrect && <span className="text-emerald-400">✓</span>}
                  {isMine && <span className="text-accent">•</span>}
                  {opt.text}
                </span>
                <span className="tabular-nums text-text-muted">{pct}%</span>
              </div>
            </li>
          );
        })}
        <div className="text-xs text-text-muted">{total} röster</div>
      </ul>
    );
  }

  if (hasVoted) {
    return (
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 text-sm text-emerald-300">
        Tack! Din röst är registrerad. Väntar på att föreläsaren ska visa resultatet.
        <div className="mt-1 text-xs text-text-muted">
          Du röstade på:{" "}
          <span className="text-text">
            {options[myResponse!.option_index!]?.text ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <li key={i}>
          <button
            onClick={() => onSubmit({ optionIndex: i })}
            disabled={submitting}
            className="w-full rounded-lg border border-white/15 bg-bg-surface/40 p-3 text-left text-sm text-text transition-colors hover:border-accent hover:bg-accent/5 disabled:opacity-50"
          >
            {opt.text}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReflectionForm({
  myResponse,
  submitting,
  onSubmit,
}: {
  myResponse: InteractionResponse | null;
  responses: InteractionResponse[];
  submitting: boolean;
  onSubmit: (opts: { optionIndex?: number | null; text?: string | null }) => Promise<void>;
}) {
  const [text, setText] = useState(myResponse?.text ?? "");

  useEffect(() => {
    if (myResponse?.text) setText(myResponse.text);
  }, [myResponse]);

  const hasAnswered = Boolean(myResponse?.text);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Skriv din reflektion…"
        className="resize-none rounded-lg border border-white/15 bg-bg-surface/40 p-3 text-sm text-text outline-none transition-colors focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">
          {hasAnswered ? "Du kan uppdatera ditt svar" : `${text.length}/2000`}
        </div>
        <button
          onClick={() => onSubmit({ text })}
          disabled={submitting || !text.trim()}
          className="rounded-full border border-accent bg-accent px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-bg transition-colors hover:bg-accent/90 disabled:opacity-40"
        >
          {submitting ? "Skickar…" : hasAnswered ? "Uppdatera" : "Skicka"}
        </button>
      </div>
    </div>
  );
}
