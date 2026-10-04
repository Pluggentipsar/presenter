"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { buildBackgroundCss } from "@/lib/background";

interface PromptInputProps {
  /** Liten eyebrow ovanför inputen, t.ex. "§ Krok · Spelet". */
  eyebrow?: string;
  /** Stor rubrik ovanför inputen. */
  title?: string;
  /** Hint som står i input-baren innan typingen börjar. */
  placeholder?: string;
  /** Prompten som ska typas fram. */
  prompt: string;
  /** Avsändarens namn över inputen. Default "Du". */
  sender?: string;
  /** ms per tecken vid typing. Default 28. */
  typingSpeed?: number;
  /** ms innan typing börjar. Default 600. */
  delay?: number;
  /** ms efter texten är klar tills "thinking dots" visas. Default 800. */
  thinkingDelay?: number;
  /** Bakgrund — CSS-värde eller bildsökväg. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

/**
 * Stor central chat-input-stilad ruta där en prompt typas fram tecken för
 * tecken — som om Joel skrev till ChatGPT live. Send-knappen pulsar efter
 * texten är klar, och tre "thinking dots" tickar igång under för att signalera
 * att AI tänker (övergång till nästa slide där "AI:n levererar").
 *
 * Användning:
 * ```mdx
 * <PromptInput
 *   eyebrow="§ A · Krok · Spelet"
 *   title="Vi ber AI bygga ett spel åt oss."
 *   prompt="Skapa ett spel som jag kan styra med händerna…"
 * />
 * ```
 */
export function PromptInput({
  eyebrow,
  title,
  placeholder = "Skriv ett meddelande…",
  prompt,
  sender = "Du",
  typingSpeed = 28,
  delay = 600,
  thinkingDelay = 800,
  background,
  overlay,
  overlayMode = "dark",
}: PromptInputProps) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    setShown(0);
    setDone(false);
    setThinking(false);
    let interval: ReturnType<typeof setInterval> | null = null;
    let thinkTimer: ReturnType<typeof setTimeout> | null = null;
    const startTimer = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= prompt.length) {
          if (interval) clearInterval(interval);
          interval = null;
          setDone(true);
          thinkTimer = setTimeout(() => setThinking(true), thinkingDelay);
        }
      }, typingSpeed);
    }, delay);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (thinkTimer) clearTimeout(thinkTimer);
    };
  }, [prompt, typingSpeed, delay, thinkingDelay]);

  const text = prompt.slice(0, shown);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-12"
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      <div className="flex w-full max-w-[88%] flex-col gap-8">
        {(eyebrow || title) ? (
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <div
                className="text-xs uppercase"
                style={{
                  color: "var(--text-muted)",
                  letterSpacing: "0.3em",
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                  lineHeight: 1.1,
                  letterSpacing: "var(--heading-tracking)",
                  textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {title}
              </h1>
            ) : null}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3"
        >
          {sender ? (
            <div
              className="pl-3 text-xs uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.3em",
              }}
            >
              {sender} skriver…
            </div>
          ) : null}

          {/* Input-baren */}
          <div
            className="flex items-end gap-4 px-7 py-6 md:px-8 md:py-7"
            style={{
              background: "var(--bg-surface)",
              border: `var(--border-width) solid ${
                done ? "var(--accent)" : "var(--accent-dim)"
              }`,
              borderRadius: "calc(var(--radius) * 2)",
              boxShadow: done
                ? "0 0 0 6px var(--accent-dim), 0 30px 60px -20px var(--accent-glow)"
                : "0 20px 50px -25px rgba(0,0,0,0.4)",
              transition: "box-shadow 0.4s ease, border-color 0.4s ease",
            }}
          >
            <span
              className="block flex-1"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.25rem, 2.2vw, 1.85rem)",
                lineHeight: 1.45,
                color: shown === 0 ? "var(--text-muted)" : "var(--text)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "2.6em",
              }}
            >
              {shown === 0 ? placeholder : text}
              {!done ? (
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: "0.08em",
                    height: "1em",
                    marginLeft: "0.04em",
                    background: "var(--accent)",
                    verticalAlign: "text-bottom",
                    animation: "pi-blink 0.9s steps(1) infinite",
                  }}
                />
              ) : null}
            </span>

            <SendButton active={done} />
          </div>

          {/* Thinking-dots — AI:n "tänker" och bygger spelet */}
          <AnimatePresence>
            {thinking ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 pl-3"
              >
                <span
                  className="text-xs uppercase"
                  style={{
                    color: "var(--text-muted)",
                    letterSpacing: "0.3em",
                  }}
                >
                  AI bygger spelet
                </span>
                <ThinkingDots />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes pi-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function SendButton({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={
        active
          ? { scale: [1, 1.08, 1], opacity: 1 }
          : { scale: 1, opacity: 0.5 }
      }
      transition={
        active
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className="flex h-12 w-12 shrink-0 items-center justify-center"
      style={{
        background: active ? "var(--accent)" : "var(--accent-dim)",
        borderRadius: "9999px",
        color: active ? "white" : "var(--text-muted)",
        boxShadow: active ? "0 6px 20px var(--accent-glow)" : "none",
      }}
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          style={{
            display: "inline-block",
            width: "0.5rem",
            height: "0.5rem",
            background: "var(--accent)",
            borderRadius: "9999px",
          }}
        />
      ))}
    </span>
  );
}
