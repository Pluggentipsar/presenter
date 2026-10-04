"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

interface PollQuestionProps {
  question: string;
  options: string;
  /** Visa resultat-staplar (procentsatser kommaseparerade, matchande options) */
  results?: string;
  /** Kort förklaring efter svaret visas */
  reveal?: string;
  /** Färgtema för fel/rätt (om ena option är "rätt" - syns först vid reveal) */
  correct?: number | string;
}

/**
 * Interaktiv fråga med alternativ. Bra för att aktivera publik.
 * Steg 1: frågan visas, alternativ syns
 * Steg 2: resultat avslöjas (om `results` givet)
 * Steg 3: reveal-text syns (om given)
 *
 * Användning:
 * <PollQuestion
 *   question="Vilken procent av gymnasieelever använder AI?"
 *   options="under 30%, 30-60%, 60-80%, över 80%"
 *   results="5, 15, 55, 25"
 *   correct="2"
 *   reveal="Närmare 77% enligt Internetstiftelsen 2026."
 * />
 */
export function PollQuestion({
  question,
  options,
  results,
  reveal,
  correct,
}: PollQuestionProps) {
  const optionList = options.split(/\s*,\s*/).filter(Boolean);
  const resultList = results
    ? results.split(/\s*,\s*/).map((n) => parseFloat(n))
    : null;
  const correctIdx = correct !== undefined ? Number(correct) : undefined;

  // Steg 0: bara frågan. 1: alternativ syns. 2: resultat. 3: reveal.
  // Om resultat eller reveal saknas så hoppar vi över de stegen.
  const totalSteps = 2 + (resultList ? 1 : 0) + (reveal ? 1 : 0);
  const activeStep = useSlideSteps(totalSteps);

  const showOptions = activeStep >= 1;
  const showResults = resultList && activeStep >= 2;
  const showReveal = reveal && activeStep >= (resultList ? 3 : 2);

  const [userPick, setUserPick] = useState<number | null>(null);

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <motion.h2
          className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <EditableText path="question" value={question ?? ""}>{question}</EditableText>
        </motion.h2>

        <AnimatePresence>
          {showOptions && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {optionList.map((opt, i) => {
                const pct = resultList?.[i] ?? 0;
                const isCorrect = correctIdx === i;
                const isPicked = userPick === i;
                const showResultsForThis = showResults;

                return (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => setUserPick(i)}
                    className="group relative flex w-full items-center justify-between overflow-hidden border p-5 text-left transition-colors"
                    style={{
                      borderRadius: "var(--radius)",
                      borderColor: isPicked
                        ? "var(--accent)"
                        : "rgba(255,255,255,0.1)",
                      background: "var(--bg-surface)",
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
                  >
                    {/* Resultat-bar bakom texten */}
                    {showResultsForThis && (
                      <motion.div
                        className="absolute inset-0 origin-left"
                        style={{
                          background: isCorrect
                            ? "var(--accent-dim)"
                            : "rgba(255,255,255,0.05)",
                          zIndex: 0,
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: pct / 100 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-4">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full border font-mono text-sm tabular-nums"
                        style={{
                          borderColor: isCorrect && showResultsForThis
                            ? "var(--accent)"
                            : "var(--text-muted)",
                          color: isCorrect && showResultsForThis
                            ? "var(--accent)"
                            : "var(--text)",
                          background: isCorrect && showResultsForThis
                            ? "var(--accent-dim)"
                            : "transparent",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span
                        className="text-[clamp(1rem,1.75vw,1.25rem)]"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {opt}
                      </span>
                    </div>
                    {showResultsForThis && (
                      <motion.span
                        className="relative z-10 font-mono text-sm tabular-nums text-accent md:text-base"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {pct}%
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReveal && (
            <motion.div
              className="border-l-2 border-accent pl-5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[clamp(1.125rem,2vw,1.5rem)] leading-snug text-text-muted">
                {reveal}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-text-muted">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === activeStep ? "1.5rem" : "0.375rem",
                  background: i <= activeStep ? "var(--accent)" : "var(--text-muted)",
                  opacity: i <= activeStep ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
