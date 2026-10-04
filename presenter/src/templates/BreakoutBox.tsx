"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface BreakoutBoxProps {
  chapter?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Antal minuter som timern börjar på. Default 5. */
  timerMinutes?: number;
  /** Visa telefonjämförelse-mockup. Default true. */
  comparePhones?: boolean;
  /** Etiketter för vänster/höger telefon. */
  leftLabel?: string;
  rightLabel?: string;
  /** Pipe-separerad lista av items i vänster feed. */
  leftFeed?: string;
  /** Pipe-separerad lista av items i höger feed. */
  rightFeed?: string;
  accent?: string;
  background?: string;
  /** Markdown-lista med frågor. */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseQuestions(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) out.push(text);
        }
      });
    }
  });
  return out;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PhoneFeed({
  label,
  items,
  accent,
  hue,
}: {
  label: string;
  items: string[];
  accent: string;
  hue: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 + hue * 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "clamp(8.5rem, 11vw, 12rem)",
        aspectRatio: "9 / 18",
        borderRadius: "1.4rem",
        background: "rgba(10,9,8,0.88)",
        border: "1px solid rgba(247,241,230,0.16)",
        boxShadow: `0 20px 50px -20px rgba(0,0,0,0.7), inset 0 0 0 4px rgba(247,241,230,0.05)`,
        padding: "1.2rem 0.6rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        position: "relative",
      }}
    >
      {/* Speaker notch */}
      <div
        style={{
          position: "absolute",
          top: "0.4rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "3rem",
          height: "0.35rem",
          borderRadius: "999px",
          background: "rgba(247,241,230,0.12)",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(245,246,250,0.6)",
          textAlign: "center",
          marginTop: "0.6rem",
          marginBottom: "0.3rem",
        }}
      >
        {label}
      </div>
      {items.map((item, i) => {
        const h = (hue * 90 + i * 32) % 360;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: hue === 0 ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.8 + hue * 0.1 + i * 0.12,
            }}
            style={{
              borderRadius: "0.4rem",
              padding: "0.45rem 0.55rem",
              fontFamily: "var(--font-body)",
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "rgba(245,246,250,0.92)",
              background: `linear-gradient(135deg, hsl(${h}deg 55% 45% / 0.55), hsl(${(h + 30) % 360}deg 55% 35% / 0.35))`,
              border: `1px solid hsl(${h}deg 60% 55% / 0.45)`,
              boxShadow: `0 4px 12px -6px hsl(${h}deg 60% 30% / 0.6)`,
              letterSpacing: "0.01em",
            }}
          >
            {item}
          </motion.div>
        );
      })}
      {/* Subtle accent-glow på en av items */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.4rem",
          background: `radial-gradient(ellipse at 50% 100%, ${withAlpha(accent, 0.18)}, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
    </motion.div>
  );
}

export function BreakoutBox({
  chapter,
  kicker,
  title,
  subtitle,
  timerMinutes = 5,
  comparePhones = true,
  leftLabel = "Elev A",
  rightLabel = "Elev B",
  leftFeed = "Klimat-news|Veganrecept|Politik-debatt|Greta-klipp|Miljöprotest",
  rightFeed = "Fortnite-clips|Allsvenskan|Streamer-stream|Gaming-memes|Bilarna",
  accent = "var(--accent)",
  background,
  children,
}: BreakoutBoxProps) {
  const questions = parseQuestions(children);
  const totalSeconds = timerMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const start = setTimeout(() => setStarted(true), 1200);
    return () => clearTimeout(start);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [started, secondsLeft]);

  const leftItems = leftFeed.split("|").map((s) => s.trim()).filter(Boolean);
  const rightItems = rightFeed.split("|").map((s) => s.trim()).filter(Boolean);
  const isLow = secondsLeft <= 60;

  const hasImageBg = !!background && (background.startsWith("/") || background.startsWith("http"));
  const bg = background
    ? hasImageBg
      ? `linear-gradient(rgba(10,9,8,0.72), rgba(10,9,8,0.88)), url('${background}') center/cover no-repeat`
      : background
    : "var(--slide-base, var(--bg))";
  // Med bild-bakgrund ligger en mörk scrim över → texten måste vara fast ljus i båda teman.
  // Utan bild följer texten temat (mörk text på ljust tema, ljus på mörkt).
  const primaryTextColor = hasImageBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedTextColor = hasImageBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Diagonal accent-band längs ena kanten */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(110deg, ${withAlpha(accent, 0.08)} 0%, transparent 38%, transparent 62%, ${withAlpha(accent, 0.05)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "clamp(2rem, 4vh, 3.5rem)",
          left: "clamp(2rem, 4vw, 3.5rem)",
          right: "clamp(2rem, 4vw, 3.5rem)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 4,
          gap: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {kicker ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              {kicker}
            </div>
          ) : null}
          {chapter ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: mutedTextColor,
              }}
            >
              {chapter}
            </div>
          ) : null}
        </div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.3rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: mutedTextColor,
            }}
          >
            Tid kvar
          </div>
          <motion.div
            animate={
              isLow
                ? {
                    opacity: [0.85, 1, 0.85],
                    scale: [1, 1.04, 1],
                  }
                : {}
            }
            transition={{
              duration: 1,
              repeat: isLow ? Infinity : 0,
              ease: "easeInOut",
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 4vw, 3.6rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: isLow ? "#E63946" : accent,
              textShadow: `0 0 32px ${isLow ? "rgba(230,57,70,0.5)" : withAlpha(accent, 0.5)}`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(secondsLeft)}
          </motion.div>
        </motion.div>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "clamp(7rem, 14vh, 9rem) clamp(3rem, 6vw, 6rem) clamp(2.5rem, 5vh, 4rem)",
          display: "grid",
          gridTemplateColumns: comparePhones ? "minmax(0, 1.4fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "start",
          zIndex: 2,
        }}
      >
        {/* Vänster: title + frågor */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.2rem, 2.5vh, 2rem)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: primaryTextColor,
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1.05rem, 1.3vw, 1.35rem)",
                  lineHeight: 1.45,
                  color: mutedTextColor,
                  margin: "0.7rem 0 0 0",
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </motion.div>

          {/* Frågor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.5 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "0.95rem 1.1rem",
                  borderRadius: "0.6rem",
                  background: `linear-gradient(90deg, ${withAlpha(accent, 0.08)}, transparent 70%)`,
                  borderLeft: `2px solid ${accent}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(1.1rem, 1.4vw, 1.4rem)",
                    fontWeight: 600,
                    color: accent,
                    minWidth: "1.5em",
                    lineHeight: 1.3,
                  }}
                >
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.05rem, 1.35vw, 1.4rem)",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    color: primaryTextColor,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {q}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Höger: telefon-jämförelse */}
        {comparePhones ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(0.8rem, 1.5vw, 1.4rem)",
              paddingTop: "clamp(0.5rem, 2vh, 1.5rem)",
            }}
          >
            <PhoneFeed label={leftLabel} items={leftItems} accent={accent} hue={0} />
            <PhoneFeed label={rightLabel} items={rightItems} accent={accent} hue={1} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
