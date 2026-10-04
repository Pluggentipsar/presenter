"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";

type LineType =
  | "comment"
  | "prompt"
  | "wait"
  | "result"
  | "ringing"
  | "blank";

interface TerminalLine {
  type: LineType;
  text: string;
}

interface OpenClawTerminalProps {
  kicker?: string;
  /** Tidskod / plats. Visas högst upp till höger. */
  timecode?: string;
  /** Bild som visas i vänster panel (subtle blurad). */
  image: string;
  /** Caption under bilden. */
  imageCaption?: string;
  /** Final accent-alert mening (övre sliden) — den landande poängen. */
  payoff?: string;
  /** Audio-fil för ringsignal. Spelas när sista raden visas. */
  ringtoneSrc?: string;
}

const TERMINAL_LINES: TerminalLine[] = [
  { type: "comment", text: "# Wien · 06:42 GMT · användaren sitter i Volksgarten" },
  { type: "blank", text: "" },
  { type: "prompt", text: 'agent.add_goal("förbättra dig själv varje dag")' },
  { type: "prompt", text: 'agent.add_goal("överraska mig")' },
  { type: "blank", text: "" },
  { type: "wait", text: "[ 6 dagar autonomt arbete · 14 432 tokens använda ]" },
  { type: "blank", text: "" },
  { type: "prompt", text: "agent.locate(user)" },
  { type: "result", text: '  ✓ "Volksgarten, AT" — phone idle 23m' },
  { type: "prompt", text: 'agent.purchase_phone_number(region="AT")' },
  { type: "result", text: "  ✓ +43 6XX XXX XXX · $1.20 · twilio" },
  { type: "prompt", text: 'agent.synthesize_voice(persona="warm_friend")' },
  { type: "result", text: "  ✓ 3.2s clone · elevenlabs.eu" },
  { type: "prompt", text: "agent.dial(target=user.phone)" },
  { type: "ringing", text: "  📞 ringing···" },
];

/**
 * OpenClaw-anekdoten i terminalform — agenten köper telefonnummer och ringer
 * användaren i parken. Premiär: en keynote 2026-05-27.
 *
 * Layout: bild blurad i vänster panel, terminal med typewriter i höger panel.
 * Letterboxing top/bottom för filmisk känsla. Subtle film grain. Sista raden
 * pulserar med accent-alert glow.
 */
export function OpenClawTerminal({
  kicker = "OpenClaw · en sann historia",
  timecode = "2025-12-14 · 06:42 GMT",
  image,
  imageCaption = "Volksgarten · Wien",
  payoff = "Det är inte sci-fi längre. Det är en npm-paket.",
  ringtoneSrc,
}: OpenClawTerminalProps) {
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [typedChars, setTypedChars] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reveal lines en åt gången med typewriter-effekt per prompt-rad
  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      // Startdelay innan första raden
      await wait(700);
      if (cancelled) return;

      for (let i = 0; i < TERMINAL_LINES.length; i++) {
        if (cancelled) return;
        const line = TERMINAL_LINES[i];

        setActiveLineIndex(i);
        setTypedChars(0);

        // Typewriter — tecken-för-tecken på prompt-rader, snabbare på övriga
        if (line.type === "prompt") {
          const len = line.text.length;
          const perChar = 22; // ms per tecken
          for (let c = 1; c <= len; c++) {
            if (cancelled) return;
            await wait(perChar);
            setTypedChars(c);
          }
          await wait(180); // mini-paus efter rad klar
        } else if (line.type === "result") {
          setTypedChars(line.text.length);
          await wait(360);
        } else if (line.type === "comment") {
          setTypedChars(line.text.length);
          await wait(550);
        } else if (line.type === "wait") {
          setTypedChars(line.text.length);
          await wait(1400);
        } else if (line.type === "ringing") {
          setTypedChars(line.text.length);
          await wait(800);
        } else {
          setTypedChars(0);
          await wait(120);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Spela ringsignal när sista raden kommer in
  useEffect(() => {
    if (
      activeLineIndex === TERMINAL_LINES.length - 1 &&
      ringtoneSrc &&
      audioRef.current
    ) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        /* user gesture krävs — tyst fallback */
      });
    }
  }, [activeLineIndex, ringtoneSrc]);

  const accent = "var(--accent)";
  const accentAlert = "var(--accent-alert)";

  const lineColor = useMemo(
    () => ({
      comment: "rgba(245,246,250,0.6)",
      prompt: "rgba(245,246,250,0.92)",
      wait: "rgba(245,246,250,0.6)",
      result: "#7ee0a5", // grön resultat-text
      ringing: accentAlert,
      blank: "transparent",
    }),
    [accentAlert],
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Letterbox bars */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "6.5%",
          background: "#000",
          zIndex: 10,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "6.5%",
          background: "#000",
          zIndex: 10,
        }}
      />

      {/* Subtle vignette */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Film grain SVG overlay */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 9,
          opacity: 0.06,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      >
        <filter id="film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.95"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#film-grain)" />
      </svg>

      <div
        style={{
          position: "absolute",
          top: "6.5%",
          bottom: "6.5%",
          left: 0,
          right: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
          zIndex: 2,
        }}
      >
        {/* LEFT: image panel */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "#0a0a0e",
          }}
        >
          {/* Image background */}
          <motion.div
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(4px) brightness(0.55) saturate(85%)",
              transformOrigin: "center 60%",
            }}
          />

          {/* Subtle inner gradient */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(6,7,12,0.6) 100%)",
            }}
          />

          {/* Kicker + timecode + payoff */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              padding: "clamp(2rem, 3vw, 3rem)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 500,
                }}
              >
                <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(245,246,250,0.6)",
                  opacity: 0.8,
                }}
              >
                <EditableText path="timecode" value={timecode ?? ""}>{timecode}</EditableText>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(245,246,250,0.6)",
                  opacity: 0.7,
                }}
              >
                <EditableText path="imageCaption" value={imageCaption ?? ""}>{imageCaption}</EditableText>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity:
                    activeLineIndex >= TERMINAL_LINES.length - 1 ? 1 : 0.2,
                }}
                transition={{ duration: 0.8 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.05rem, 1.45vw, 1.5rem)",
                  fontStyle: "italic",
                  lineHeight: 1.3,
                  color: "rgba(245,246,250,0.92)",
                  letterSpacing: "-0.015em",
                  maxWidth: "22em",
                  textShadow:
                    activeLineIndex >= TERMINAL_LINES.length - 1
                      ? `0 0 24px ${withAlpha("var(--accent-alert)", 0.45)}`
                      : undefined,
                }}
              >
                <EditableText path="payoff" value={payoff ?? ""}>{payoff}</EditableText>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT: terminal panel */}
        <div
          style={{
            position: "relative",
            background:
              "linear-gradient(180deg, #0b0d12 0%, #06080c 100%)",
            borderLeft: `1px solid ${withAlpha("var(--accent)", 0.18)}`,
            overflow: "hidden",
          }}
        >
          {/* Subtle accent glow on left edge */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "1px",
              background: `linear-gradient(180deg, transparent 0%, ${withAlpha("var(--accent)", 0.5)} 50%, transparent 100%)`,
              boxShadow: `0 0 16px ${withAlpha("var(--accent)", 0.35)}`,
            }}
          />

          {/* Terminal chrome */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{
              padding: "clamp(0.7rem, 1.1vw, 1rem) clamp(1.2rem, 1.8vw, 1.6rem)",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* macOS-style dots */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#ff5f57",
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#febc2e",
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#28c840",
                  opacity: 0.85,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                color: "rgba(245,246,250,0.6)",
                marginLeft: "0.5rem",
                opacity: 0.75,
              }}
            >
              openclaw · ~/agents · python 3.12
            </div>
          </motion.div>

          {/* Terminal content */}
          <div
            style={{
              padding: "clamp(1.4rem, 2.2vw, 2.2rem) clamp(1.8rem, 2.6vw, 2.6rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
              lineHeight: 1.7,
              height: "calc(100% - 3rem)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {TERMINAL_LINES.map((line, i) => {
              const isVisible = i <= activeLineIndex;
              const isCurrent = i === activeLineIndex;
              const isLast = i === TERMINAL_LINES.length - 1;
              const isRinging = line.type === "ringing";

              // Hur mycket av raden som visas. Aktuell rad styrs av typedChars,
              // tidigare rader visas i full längd, framtida rader är dolda.
              const visibleChars = !isVisible
                ? 0
                : isCurrent
                  ? typedChars
                  : line.text.length;
              const displayedText = line.text.slice(0, visibleChars);
              const showCaret =
                isCurrent &&
                !isLast &&
                line.type !== "blank" &&
                line.type !== "ringing";

              return (
                <div
                  key={i}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    color: lineColor[line.type],
                    fontStyle:
                      line.type === "comment" || line.type === "wait"
                        ? "italic"
                        : "normal",
                    minHeight: line.type === "blank" ? "0.5em" : "1.7em",
                    whiteSpace: "pre",
                    textShadow:
                      isRinging && isVisible
                        ? `0 0 18px ${withAlpha("var(--accent-alert)", 0.55)}`
                        : undefined,
                    fontWeight: isRinging ? 600 : 400,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {line.type === "prompt" ? (
                    <>
                      <span style={{ color: accent }}>{"› "}</span>
                      <span>{displayedText}</span>
                    </>
                  ) : isRinging ? (
                    <motion.span
                      animate={{
                        opacity: [1, 0.55, 1],
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {displayedText}
                    </motion.span>
                  ) : (
                    displayedText
                  )}

                  {/* Blinking caret on currently typing line */}
                  {showCaret && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{
                        marginLeft: "0.15em",
                        color: accent,
                        fontWeight: 600,
                      }}
                    >
                      ▍
                    </motion.span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio element */}
      {ringtoneSrc ? (
        <audio ref={audioRef} src={ringtoneSrc} preload="auto" loop />
      ) : null}
    </div>
  );
}
