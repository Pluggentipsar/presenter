"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * GameReveal — slide som visualiserar "AI skriver kod → spelet är klart".
 *
 * Tre steg:
 *  - 0: kod-regn körs i bakgrunden + prompt-rubrik längst upp ("Skapa ett
 *    spel där man styr en T-rex…")
 *  - 1: kod-regnet stannar/dimmas, iframe pop:as in centrerat med rubrik
 *    "Detta spel byggde jag med claude.ai"
 *  - 2: iframe får full fokus (interaktion enabled, text fadar)
 *
 * MDX-format:
 * ```mdx
 * <GameReveal
 *   prompt="Skapa ett spel där man styr en T-rex som åker skate på månen"
 *   src="/spel/moonrex.html"
 *   gameTitle="MoonRex"
 *   credit="Byggt på 30 minuter med claude.ai"
 * />
 * ```
 */

interface GameRevealProps {
  /** Den prompt som "skickas till AI". Visas högst upp. */
  prompt?: string;
  /** Path eller URL till spelet (laddas i iframe). */
  src: string;
  /** Spelets visningsnamn — visas över iframe i steg 1+. */
  gameTitle?: string;
  /** Krediteringsrad under spelet. */
  credit?: string;
  /** Eyebrow uppe i hörnet. */
  eyebrow?: string;
  /** Accent-färg på kod-regn och ramar. */
  accent?: string;
  /** Sekundär accent — andra kod-regn-färg. */
  accent2?: string;
}

const CODE_CHARS =
  "01<>{}[]()/*+-=;:,.|&!?$#@MNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" +
  "ifelseforreturnfunctionconstvarletwhileasyncawaitthisnewnullundefined";

function pickChar() {
  return CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
}

export function GameReveal({
  prompt = "Skapa ett spel där man styr en T-rex som åker skate på månen",
  src,
  gameTitle = "Detta spel",
  credit = "Byggt med claude.ai",
  eyebrow,
  accent = "#EF4F8F",
  accent2 = "#22D3EE",
}: GameRevealProps) {
  const reduce = useReducedMotion();
  const step = useSlideSteps(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Code-rain canvas
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns: Array<{
      x: number;
      y: number;
      speed: number;
      chars: string[];
      head: number;
      color: string;
    }> = [];

    function resize() {
      if (!canvas || !wrapper) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrapper.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx?.scale(dpr, dpr);

      // Initialize columns
      const fontSize = 18;
      const colWidth = fontSize;
      const colCount = Math.ceil(rect.width / colWidth);
      const rowCount = Math.ceil(rect.height / fontSize) + 8;
      columns = [];
      for (let i = 0; i < colCount; i++) {
        const chars: string[] = [];
        for (let r = 0; r < rowCount; r++) chars.push(pickChar());
        columns.push({
          x: i * colWidth + fontSize / 2,
          y: 0,
          speed: 0.4 + Math.random() * 1.0,
          chars,
          head: Math.floor(Math.random() * rowCount),
          color: Math.random() < 0.5 ? accent : accent2,
        });
      }
    }

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const fontSize = 18;
    let lastTick = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 16.667, 2);
      lastTick = now;

      // Dim factor — when step >= 1, fade out the rain
      const dimTarget = step === 0 ? 1 : step === 1 ? 0.18 : 0.05;
      // Smooth dim via canvas globalAlpha
      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      // Black trail (creates the fading-tail effect)
      ctx.fillStyle = `rgba(8, 4, 16, ${0.12 + (1 - dimTarget) * 0.25})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'Courier New', Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.globalAlpha = dimTarget;

      for (const col of columns) {
        col.head += col.speed * dt;
        if (col.head > col.chars.length + 6) {
          col.head = -Math.random() * 30;
          col.speed = 0.4 + Math.random() * 1.0;
          col.color = Math.random() < 0.5 ? accent : accent2;
        }
        const headInt = Math.floor(col.head);
        for (let r = 0; r < col.chars.length; r++) {
          const dist = headInt - r;
          if (dist < 0 || dist > 18) continue;
          // Mutate char occasionally
          if (Math.random() < 0.02) col.chars[r] = pickChar();
          const y = r * fontSize + fontSize;
          let alpha = 0;
          let color = col.color;
          if (dist === 0) {
            color = "#FFFFFF";
            alpha = 1;
          } else if (dist < 3) {
            alpha = 0.95;
          } else {
            alpha = Math.max(0, 1 - dist / 18) * 0.7;
          }
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * dimTarget;
          ctx.fillText(col.chars[r], col.x, y);
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [reduce, step, accent, accent2]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Kod-regn canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* Subtilt nät-overlay för djup */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(8,4,16,0.55) 80%)`,
        }}
      />

      {/* Eyebrow */}
      {eyebrow ? (
        <div
          className="absolute"
          style={{
            top: "clamp(2rem, 4vh, 3rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "clamp(0.72rem, 0.9vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            zIndex: 5,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      {/* STEG 0: Prompt-rubrik överst */}
      <AnimatePresence>
        {step === 0 ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute"
            style={{
              top: "18%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(56rem, 90vw)",
              zIndex: 6,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono, 'Courier New', monospace)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.65rem",
              }}
            >
              ▸ DU SKICKAR
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.8rem, 3.6vw, 3.4rem)",
                color: "#FFFFFF",
                lineHeight: 1.1,
                textShadow: `0 0 30px ${withAlpha(accent, 0.53)}, 0 6px 0 rgba(0,0,0,0.4)`,
              }}
            >
              {prompt}
            </h2>
            <div
              style={{
                marginTop: "1.2rem",
                fontFamily: "var(--font-mono, 'Courier New', monospace)",
                fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                color: accent2,
                letterSpacing: "0.1em",
              }}
            >
              <BlinkingDots /> AI:n skriver koden
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* STEG 1+: Spel-iframe popping in */}
      <AnimatePresence>
        {step >= 1 ? (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 7, padding: "clamp(2rem, 4vh, 3.5rem)" }}
          >
            {/* Rubrik */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "clamp(0.8rem, 1.4vh, 1.4rem)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: accent2,
                  marginBottom: "0.45rem",
                }}
              >
                ▸ AI:n LEVERERAR
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)" as unknown as number,
                  fontSize: "clamp(1.5rem, 2.8vw, 2.8rem)",
                  color: "#FFFFFF",
                  lineHeight: 1,
                  textShadow: `0 0 24px ${withAlpha(accent, 0.47)}, 0 4px 0 rgba(0,0,0,0.5)`,
                }}
              >
                {gameTitle}
              </h2>
            </div>

            {/* Iframe-ram */}
            <div
              style={{
                position: "relative",
                width: "min(1100px, 92%)",
                aspectRatio: "16 / 9",
                background: "#000",
                border: `3px solid ${accent}`,
                borderRadius: "10px",
                boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 24px 60px rgba(239,79,143,0.35), 0 0 80px ${withAlpha(accent, 0.33)}`,
                overflow: "hidden",
              }}
            >
              <iframe
                src={src}
                title={gameTitle}
                onLoad={() => setIframeLoaded(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#0a0118",
                  // Disable pointer events until step 2 so users don't
                  // accidentally hijack focus during the reveal.
                  pointerEvents: step >= 2 ? "auto" : "none",
                  filter: step >= 2 ? "none" : "saturate(1.05)",
                }}
                allow="autoplay; fullscreen; gamepad"
              />
              {/* Loading-state */}
              {!iframeLoaded ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: accent2,
                    fontFamily: "var(--font-mono, monospace)",
                    letterSpacing: "0.2em",
                    fontSize: "0.9rem",
                  }}
                >
                  COMPILING…
                </div>
              ) : null}

              {/* Click-hint i steg 1 */}
              {step === 1 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(8,4,16,0.78)",
                    border: `2px solid ${accent}`,
                    color: "#FFFFFF",
                    padding: "0.5rem 1rem",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.85rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    boxShadow: `0 0 16px ${withAlpha(accent, 0.4)}`,
                    pointerEvents: "none",
                  }}
                >
                  Tryck space för att spela
                </motion.div>
              ) : null}
            </div>

            {/* Credit */}
            <div
              style={{
                marginTop: "clamp(0.7rem, 1.2vh, 1.2rem)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "clamp(0.8rem, 1vw, 1rem)",
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.08em",
                textAlign: "center",
              }}
            >
              {credit}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Tre blinkande prickar i mono-font. */
function BlinkingDots() {
  return (
    <span style={{ display: "inline-block" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          style={{ display: "inline-block" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

export default GameReveal;
