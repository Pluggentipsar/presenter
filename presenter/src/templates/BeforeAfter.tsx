"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";

interface BeforeAfterProps {
  /** Promptens text (skrivs fram tecken för tecken) */
  promptText: string;
  /** Titel över prompt-kolumnen */
  promptLabel?: string;
  /** Resultatet: antingen bild, video eller text. En av de tre ska anges. */
  resultImage?: string;
  resultVideo?: string;
  resultText?: string;
  /** Rubrik över resultatet */
  resultLabel?: string;
  /** Kort caption under resultatet */
  resultCaption?: string;
  /** Hur snabbt prompten typas (ms per tecken) */
  typeSpeed?: number;
  /** Orientering: row (default) eller column */
  layout?: "row" | "column";
}

/**
 * BeforeAfter - visar en prompt sida vid sida med det faktiska resultatet.
 * Steg 1: prompten typas fram. Steg 2: resultatet tonas in.
 *
 * Användbart för "så här gick det till"-moments där AI-magiken ska synas.
 *
 * <BeforeAfter
 *   promptText="Skapa ett Jeopardy-spel om Sveriges historia..."
 *   resultImage="/bilder/skr/resultat-spel.png"
 *   resultLabel="Resultat efter 45 sekunder"
 *   resultCaption="Fungerande spel i browsern - byggt på en prompt"
 * />
 */
export function BeforeAfter({
  promptText,
  promptLabel = "Prompt",
  resultImage,
  resultVideo,
  resultText,
  resultLabel = "Resultat",
  resultCaption,
  typeSpeed = 20,
  layout = "row",
}: BeforeAfterProps) {
  const activeStep = useSlideSteps(2);
  const [typed, setTyped] = useState("");

  const showPrompt = activeStep >= 0;
  const showResult = activeStep >= 1;

  // Typa fram prompten när steg 0 är aktivt
  useEffect(() => {
    if (!showPrompt) return;
    if (typed.length >= promptText.length) return;
    const timer = setTimeout(() => {
      setTyped(promptText.slice(0, typed.length + 1));
    }, typeSpeed);
    return () => clearTimeout(timer);
  }, [showPrompt, typed, promptText, typeSpeed]);

  const isRow = layout === "row";

  return (
    <div className="slide-container">
      <div
        className={`flex w-full gap-6 ${isRow ? "flex-col md:flex-row" : "flex-col"}`}
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {/* Prompt-sida */}
        <motion.div
          className="flex flex-1 flex-col gap-3 rounded-xl border border-white/10 bg-bg-surface/50 p-6"
          style={{ borderRadius: "var(--radius)" }}
          initial={{ opacity: 0, x: isRow ? -16 : 0, y: isRow ? 0 : -16 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-xs uppercase tracking-[0.25em] text-accent">
            {promptLabel}
          </div>
          <pre
            className="whitespace-pre-wrap text-[clamp(0.9rem,1.5vw,1.125rem)] leading-relaxed text-text"
            style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
          >
            {typed}
            <motion.span
              className="ml-0.5 inline-block h-[1em] w-[0.5ch] align-middle bg-accent"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
            />
          </pre>
        </motion.div>

        {/* Resultat-sida */}
        <motion.div
          className="flex flex-1 flex-col gap-3"
          initial={{ opacity: 0, x: isRow ? 16 : 0, y: isRow ? 0 : 16 }}
          animate={{
            opacity: showResult ? 1 : 0.15,
            x: 0,
            y: 0,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-xs uppercase tracking-[0.25em] text-accent">
            {resultLabel}
          </div>
          <div
            className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-bg-surface/30"
            style={{ borderRadius: "var(--radius)", minHeight: "300px" }}
          >
            {resultImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resultImage}
                alt={resultLabel}
                className="h-full w-full object-cover"
              />
            )}
            {resultVideo && (
              <video
                src={resultVideo}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            )}
            {resultText && (
              <div
                className="flex h-full items-center justify-center p-8 text-center text-[clamp(1.25rem,2.5vw,2rem)] leading-snug"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                }}
              >
                {resultText}
              </div>
            )}
          </div>
          {resultCaption && (
            <div className="text-sm text-text-muted">{resultCaption}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
