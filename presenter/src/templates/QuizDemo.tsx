"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface QuizDemoProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  background?: string;
  accent?: string;
  question?: string;
  options?: string[];
  /** Index för rätt svar (0-baserat). */
  correctIndex?: number;
  /** Index som användaren "klickar fel" först. Default 1. */
  wrongFirstIndex?: number;
  /** Förklaring som visas vid rätt svar. */
  explanation?: string;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function QuizDemo({
  kicker,
  title,
  subtitle,
  prompt = "Skapa ett interaktivt quiz om demokrati för åk 9. 5 frågor med direkt feedback på rätt och fel svar + kort förklaring.",
  background,
  accent = "var(--accent)",
  question = "Vilket av följande är INTE en demokratisk princip?",
  options = ["Majoritetsbeslut", "Ensamhärskande", "Rättsstat", "Yttrandefrihet"],
  correctIndex = 1,
  wrongFirstIndex = 0,
  explanation = "Demokrati bygger på folkets inflytande. En ensamhärskare — som väljs ingen annanstans än av sig själv — strider direkt mot den principen.",
}: QuizDemoProps) {
  // När en bild/foto-bakgrund skickas in läggs en mörk scrim på (se resolveBackground),
  // så texten i vänsterkolumnen måste vara fast ljus oavsett tema. Utan bild följer
  // texten temat (mörk på ljust tema, ljus på mörkt).
  const hasMediaBackground =
    !!background && (background.startsWith("/") || background.startsWith("http"));
  const leftText = hasMediaBackground ? "rgba(245,246,250,0.92)" : "var(--text)";
  const leftTextMuted = hasMediaBackground ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const [clickedWrong, setClickedWrong] = useState<number | null>(null);
  const [clickedCorrect, setClickedCorrect] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setClickedWrong(wrongFirstIndex), 2800);
    const t2 = setTimeout(() => {
      setClickedWrong(null);
      setClickedCorrect(true);
    }, 5500);
    // Loop — reset efter visning
    const t3 = setTimeout(() => {
      setClickedCorrect(false);
    }, 11000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [wrongFirstIndex]);

  // Re-trigga loopen
  useEffect(() => {
    if (clickedCorrect) return;
    if (clickedWrong !== null) return;
    const t1 = setTimeout(() => setClickedWrong(wrongFirstIndex), 2000);
    const t2 = setTimeout(() => {
      setClickedWrong(null);
      setClickedCorrect(true);
    }, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [clickedCorrect, clickedWrong, wrongFirstIndex]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative grid h-full w-full"
        style={{ gridTemplateColumns: "45% 55%", zIndex: 2 }}
      >
        {/* VÄNSTER: prompt + content */}
        <div
          className="flex flex-col"
          style={{
            padding: "clamp(2rem, 3.5vw, 3.5rem)",
            gap: "clamp(1rem, 1.8vh, 1.5rem)",
            justifyContent: "center",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                lineHeight: 1,
                letterSpacing: "-0.025em",
                color: leftText,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                color: leftTextMuted,
                margin: 0,
                lineHeight: 1.4,
                maxWidth: "30em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}

          {/* Prompt-bar */}
          {prompt ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{
                marginTop: "0.5rem",
                background: "var(--text)",
                borderRadius: "1rem",
                padding: "0.85rem 1.1rem",
                boxShadow: "0 18px 45px -15px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: "1.7rem",
                  height: "1.7rem",
                  borderRadius: "50%",
                  background: accent,
                  color: "rgba(245,246,250,0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: "0.1rem",
                }}
              >
                DU
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.88rem, 1vw, 1rem)",
                  color: "var(--bg)",
                  lineHeight: 1.45,
                }}
              >
                <EditableText path="prompt" value={prompt ?? ""}>{prompt}</EditableText>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* HÖGER: quiz-mockup */}
        <div
          className="relative flex items-center justify-center"
          style={{ padding: "clamp(1.5rem, 2.5vw, 2.5rem)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: "32em",
              background: "var(--bg-elevated)",
              borderRadius: "1.2rem",
              padding: "clamp(1.3rem, 2vw, 2rem)",
              boxShadow: `0 40px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.1), 0 0 60px -20px ${withAlpha(accent, 0.38)}`,
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Browser-chrome-dots */}
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.2rem" }}>
              {["#FF5F56", "#FFBD2E", "#27C93F"].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: "0.6rem",
                    height: "0.6rem",
                    borderRadius: "50%",
                    background: c,
                  }}
                />
              ))}
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                demokrati-quiz.html
              </div>
            </div>

            {/* Quiz header */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
              }}
            >
              Fråga 1 av 5
            </div>

            {/* Question */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.1rem, 1.5vw, 1.4rem)",
                color: "var(--text)",
                lineHeight: 1.3,
              }}
            >
              <EditableText path="question" value={question ?? ""}>{question}</EditableText>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {options.map((opt, i) => {
                const isWrongClicked = clickedWrong === i;
                const isCorrectClicked = clickedCorrect && i === correctIndex;
                const isOtherAfterAnswer =
                  clickedCorrect && i !== correctIndex;
                let bg = "#ffffff";
                let border = "1.5px solid rgba(17,17,17,0.15)";
                let color = "rgba(17,17,17,0.85)";
                if (isWrongClicked) {
                  bg = "#FEE2E2";
                  border = "1.5px solid #DC2626";
                  color = "#7F1D1D";
                } else if (isCorrectClicked) {
                  bg = "#D1FAE5";
                  border = "1.5px solid #059669";
                  color = "#065F46";
                } else if (isOtherAfterAnswer) {
                  bg = "#F5F5F4";
                  border = "1.5px solid rgba(17,17,17,0.08)";
                  color = "rgba(17,17,17,0.4)";
                }
                return (
                  <motion.div
                    key={i}
                    animate={{ background: bg }}
                    transition={{ duration: 0.3 }}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.6rem",
                      border,
                      color,
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.9rem, 1vw, 1rem)",
                      fontWeight: isCorrectClicked ? 600 : 500,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.6rem",
                      cursor: "pointer",
                    }}
                  >
                    <span>{opt}</span>
                    {isWrongClicked ? <span style={{ fontSize: "1.1rem" }}>✕</span> : null}
                    {isCorrectClicked ? <span style={{ fontSize: "1.1rem" }}>✓</span> : null}
                  </motion.div>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {clickedCorrect ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "0.6rem",
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.82rem, 0.92vw, 0.92rem)",
                      color: "#065F46",
                      lineHeight: 1.45,
                      marginTop: "0.2rem",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#059669",
                        marginRight: "0.5rem",
                        fontWeight: 700,
                      }}
                    >
                      Rätt!
                    </span>
                    <EditableText path="explanation" value={explanation ?? ""}>{explanation}</EditableText>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
