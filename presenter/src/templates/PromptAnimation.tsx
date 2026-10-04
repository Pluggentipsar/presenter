"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface PromptAnimationProps {
  promptText: string;
  resultText?: string;
  codeSnippet?: string;
  layout?: "left" | "right";
  typeSpeed?: number;
}

/**
 * Joels signatur-slide.
 *
 * En prompt skrivs ut tecken för tecken, övergår sedan till "genererar kod"
 * och landar i ett resultat. Samtidigt visas en meningsfull text på andra sidan.
 *
 * Tre faser:
 * 1. Typa prompten (tecken för tecken)
 * 2. "Genererar..." (kort paus med pulserande indikator)
 * 3. Resultat fade:ar in (kod eller mjuk text)
 */
export function PromptAnimation({
  promptText,
  resultText,
  codeSnippet,
  layout = "right",
  typeSpeed = 25,
}: PromptAnimationProps) {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "generating" | "result">("typing");

  useEffect(() => {
    setTyped("");
    setPhase("typing");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(promptText.slice(0, i));
      if (i >= promptText.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("generating"), 400);
        setTimeout(() => setPhase("result"), 1600);
      }
    }, typeSpeed);
    return () => clearInterval(interval);
  }, [promptText, typeSpeed]);

  const promptOnLeft = layout === "left";

  return (
    <div className="slide-container">
      <div
        className={`grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr] ${
          promptOnLeft ? "" : "md:[&>*:first-child]:order-last"
        }`}
      >
        {/* Text-sidan (resultText) */}
        <div className="flex flex-col justify-center">
          {resultText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "result" ? 1 : 0.15 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-4"
            >
              <motion.div
                className="h-[2px] bg-accent origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: phase === "result" ? 1 : 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{ width: "3rem" }}
              />
              <p
                className="text-[clamp(1.5rem,3.5vw,2.75rem)] font-medium leading-[1.25]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {resultText}
              </p>
            </motion.div>
          )}
        </div>

        {/* Prompt-sidan */}
        <div className="flex flex-col gap-4">
          <PromptTerminal typed={typed} phase={phase} isTyping={phase === "typing"} />

          <AnimatePresence mode="wait">
            {phase === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 pl-1 text-sm font-mono text-accent"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span>genererar</span>
              </motion.div>
            )}
            {phase === "result" && codeSnippet && (
              <motion.pre
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden rounded-lg border border-accent-dim bg-bg-surface/80 p-4 font-mono text-xs leading-relaxed text-text"
              >
                <code>{codeSnippet}</code>
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PromptTerminal({
  typed,
  phase,
  isTyping,
}: {
  typed: string;
  phase: "typing" | "generating" | "result";
  isTyping: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-bg-surface/80 transition-colors ${
        phase === "result" ? "border-accent-dim" : "border-accent"
      }`}
      style={{
        boxShadow: phase === "typing" ? "0 0 24px var(--accent-glow)" : "0 0 12px var(--accent-dim)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-accent-dim px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        </span>
        <span className="ml-2">prompt</span>
      </div>
      <div className="min-h-[140px] p-5 font-mono text-sm leading-relaxed text-text">
        <span className="mr-2 text-accent">&gt;</span>
        <span>{typed}</span>
        {isTyping && (
          <motion.span
            className="ml-[1px] inline-block h-[1.1em] w-[0.55em] translate-y-[2px] bg-accent"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}
