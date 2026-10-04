"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface NarrationProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /**
   * Justering av textblocket.
   * - "left": textblocket i vänster halva (default — lämnar höger fri för FloatingImage)
   * - "right": textblocket i höger halva
   * - "center": centrerat (då passar ingen sidofloating)
   */
  align?: "left" | "right" | "center";
  /**
   * Storlek på meningarna.
   * - "sm": liten, för längre passager
   * - "md": default
   * - "lg": stor, för korta dramatiska öppningar
   */
  size?: "sm" | "md" | "lg";
  /**
   * Visa typografisk separator (liten linje) före texten.
   */
  ornament?: boolean;
  /**
   * Pausens längd mellan meningarna (sekunder).
   * Default 0.9 — ger berättartempo.
   */
  pause?: number | string;
  /**
   * Skrivmaskinseffekt — texten typas fram tecken-för-tecken
   * istället för att fadar in i taget. Caret blinkar under tiden.
   */
  typewriter?: boolean;
  /**
   * Hastighet i ms per tecken vid typewriter. Default 35.
   * Lägre = snabbare. Sätt typ 25 för snabb, 50 för långsam.
   */
  speed?: number | string;
  /**
   * Innehåll: varje paragraf (rad åtskild med tomrad i MDX) blir
   * en mening som fadar in (eller typas fram med typewriter).
   */
  children?: ReactNode;
  /** Liten attribution under hela textblocket. */
  attribution?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseLines(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      const trimmed = child.trim();
      if (trimmed) out.push(trimmed);
      return;
    }
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      // Hantera även list items om någon skriver listan istället för paragrafer
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const liEl = li as ReactElement<{ children?: ReactNode }>;
          const text = extractTextNode(liEl.props.children).trim();
          if (text) out.push(text);
        }
      });
    } else if (t === "p" || typeof t === "string") {
      const text = extractTextNode(el.props.children).trim();
      if (text) out.push(text);
    }
  });
  return out;
}

const SIZE_MAP = {
  sm: "clamp(1.4rem, 1.8vw, 1.7rem)",
  md: "clamp(1.8rem, 2.4vw, 2.4rem)",
  lg: "clamp(2.2rem, 3vw, 3rem)",
} as const;

/**
 * Narration — berättande textsekvens där varje mening fadar in i taget,
 * editorial bok-stil. Default ligger textblocket i vänster halva så att
 * man kan kombinera med <FloatingImage> till höger.
 *
 * Tema-agnostisk.
 */
export function Narration({
  kicker,
  chapter,
  align = "left",
  size = "md",
  ornament = true,
  pause = 0.9,
  typewriter = false,
  speed = 35,
  children,
  attribution,
  background,
  overlay,
  overlayMode = "dark",
}: NarrationProps) {
  const lines = parseLines(children);
  const pauseSec =
    typeof pause === "string" ? parseFloat(pause) : pause;
  const speedMs =
    typeof speed === "string" ? parseFloat(speed) : speed;

  const isCenter = align === "center";
  const justify =
    align === "left"
      ? "flex-start"
      : align === "right"
        ? "flex-end"
        : "center";

  // När en bild/custom-bakgrund ligger bakom texten (och overlayn inte är
  // ljus) är ytan mörk på ALLA teman — då måste texten vara fast ljus, annars
  // blir near-black-texten på dagsljus osynlig mot den mörklagda bilden.
  // Utan bakgrund följer texten temat (var(--text)) som vanligt.
  const onDarkBackdrop = !!background && overlayMode !== "light";
  const textColor = onDarkBackdrop ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDarkBackdrop
    ? "rgba(245,246,250,0.6)"
    : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Textblock */}
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          padding: "clamp(3rem, 6vw, 6rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isCenter ? "center" : "flex-start",
            gap: "clamp(0.8rem, 1.8vh, 1.5rem)",
            width: isCenter ? "min(50rem, 100%)" : "min(42rem, 50%)",
            maxWidth: "100%",
            textAlign: isCenter ? "center" : "left",
          }}
        >
          {ornament ? (
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                width: "clamp(2rem, 4vw, 3.5rem)",
                height: "1px",
                background: "var(--accent)",
                transformOrigin: isCenter ? "center" : "left",
                marginBottom: "clamp(0.4rem, 1vh, 0.8rem)",
              }}
            />
          ) : null}

          {typewriter
            ? renderTypewriterLines(lines, size, speedMs, pauseSec, textColor)
            : lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 1.1,
                    delay: 0.5 + i * pauseSec,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: SIZE_MAP[size],
                    lineHeight: 1.3,
                    letterSpacing: "-0.015em",
                    color: textColor,
                    margin: 0,
                  }}
                >
                  {line}
                </motion.p>
              ))}

          {attribution ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: typewriter
                  ? estimateTypewriterDuration(lines, speedMs, pauseSec) + 0.6
                  : 0.5 + lines.length * pauseSec + 0.4,
              }}
              style={{
                marginTop: "clamp(1rem, 2vh, 1.8rem)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              <EditableText path="attribution" value={attribution}>
                — {attribution}
              </EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- Typewriter-stöd -------------------------------------------------------

/**
 * Beräkna ungefär hur länge hela typewriter-sekvensen tar (sekunder).
 * Används för att fördröja attribution till efter att texten typats färdig.
 */
function estimateTypewriterDuration(
  lines: string[],
  speedMs: number,
  pauseSec: number
): number {
  const charsTime = lines.reduce(
    (sum, line) => sum + (line.length * speedMs) / 1000,
    0
  );
  const pauses = Math.max(0, lines.length - 1) * pauseSec;
  return 0.5 + charsTime + pauses;
}

function renderTypewriterLines(
  lines: string[],
  size: "sm" | "md" | "lg",
  speedMs: number,
  pauseSec: number,
  textColor: string
) {
  // Beräkna när varje rad ska börja typas, i sekunder från slide-mount.
  let cursor = 0.5; // initialdröjsmål
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    starts.push(cursor);
    cursor += (lines[i].length * speedMs) / 1000 + pauseSec;
  }
  const isLast = (i: number) => i === lines.length - 1;
  return lines.map((line, i) => (
    <TypewriterLine
      key={i}
      text={line}
      startDelayMs={starts[i] * 1000}
      speedMs={speedMs}
      size={size}
      showCaretAfter={isLast(i)}
      textColor={textColor}
    />
  ));
}

function TypewriterLine({
  text,
  startDelayMs,
  speedMs,
  size,
  showCaretAfter,
  textColor,
}: {
  text: string;
  startDelayMs: number;
  speedMs: number;
  size: "sm" | "md" | "lg";
  showCaretAfter: boolean;
  textColor: string;
}) {
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [hideCaret, setHideCaret] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let caretHideTimer: ReturnType<typeof setTimeout> | null = null;
    const startTimer = setTimeout(() => {
      setStarted(true);
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          interval = null;
          setDone(true);
          if (showCaretAfter) {
            // Caret blinkar ett tag efter sista raden, sen försvinner
            caretHideTimer = setTimeout(() => setHideCaret(true), 2200);
          }
        }
      }, speedMs);
    }, startDelayMs);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (caretHideTimer) clearTimeout(caretHideTimer);
    };
  }, [text, speedMs, startDelayMs, showCaretAfter]);

  // Visa raden bara när den hunnits börja, så den inte tar upp plats innan
  const isActive = !done; // typar fortfarande
  const showCaret = started && !hideCaret && (isActive || showCaretAfter);

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: started ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 400,
        fontStyle: "normal",
        fontSize: SIZE_MAP[size],
        lineHeight: 1.3,
        letterSpacing: "-0.015em",
        color: textColor,
        margin: 0,
        // Reservera höjden så efterföljande paragrafer inte hoppar in
        minHeight: started ? undefined : "1.3em",
      }}
    >
      <span>{text.slice(0, shown)}</span>
      {showCaret ? <Caret /> : null}
    </motion.p>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: "0.08em",
        height: "1em",
        marginLeft: "0.06em",
        background: "var(--accent)",
        verticalAlign: "-0.12em",
        animation: "narration-caret-blink 0.95s steps(2, start) infinite",
      }}
    >
      <style>{`
        @keyframes narration-caret-blink {
          to { visibility: hidden; }
        }
      `}</style>
    </span>
  );
}
