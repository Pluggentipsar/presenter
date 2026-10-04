"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface CollageQuote {
  text: string;
  /** "alert" — sista/tyngsta citatet. Får accent-alert + större storlek. */
  variant?: "default" | "alert";
}

interface QuoteCollageProps {
  /** Kicker-rad uppe till vänster. */
  kicker?: string;
  /** Liten header-rad ovanpå citaten (t.ex. "Adam, 16 · samtal med ChatGPT"). */
  header?: string;
  /** Källrad nederst. */
  source?: string;
  /** Bakgrund. */
  background?: string;
  /** Accent-färg. Default var(--accent-alert) eftersom citatcollage oftast är blottäggning. */
  accent?: string;
  /** Typewriter-hastighet (ms per tecken). Default 24. */
  typingSpeed?: number;
  /** Paus mellan citat (ms). Default 1100. */
  betweenPause?: number;
  /**
   * Markdown-lista i children. Format per rad:
   * `- ALERT: Citat-text` (alert-variant) eller `- Citat-text` (default).
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseQuotes(children: ReactNode): CollageQuote[] {
  const items: CollageQuote[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    if (raw.startsWith("ALERT:")) {
      items.push({ text: raw.slice(6).trim(), variant: "alert" });
    } else {
      items.push({ text: raw, variant: "default" });
    }
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return items;
}

// Hjälp-positioner för citatbubblor (procent från top-left + rotation).
// Maxar för 5 citat — fungerar för 3-5 stycken.
const POSITIONS: Array<{ top: string; left: string; width: string; rotate: number }> = [
  { top: "10%", left: "6%", width: "44%", rotate: -2.2 },
  { top: "8%", left: "54%", width: "42%", rotate: 1.6 },
  { top: "44%", left: "3%", width: "44%", rotate: -1 },
  { top: "44%", left: "55%", width: "42%", rotate: 1.4 },
  { top: "75%", left: "20%", width: "60%", rotate: -1.5 },
];

function Typewriter({
  text,
  active,
  speed,
  initialDelay,
}: {
  text: string;
  active: boolean;
  speed: number;
  initialDelay: number;
}) {
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (!active) {
      setChars(0);
      return;
    }
    setChars(0);
    const start = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        if (i >= text.length) {
          setChars(text.length);
          clearInterval(id);
        } else {
          setChars(i);
        }
      }, speed);
      return () => clearInterval(id);
    }, initialDelay);
    return () => clearTimeout(start);
  }, [text, active, speed, initialDelay]);
  return <>{text.slice(0, chars)}</>;
}

/**
 * QuoteCollage — flera citat utspridda på slidens yta, typas fram en åt gången
 * i mjuk stagger. Sista citatet kan markeras som "alert" (accent-alert, större)
 * för att bära tyngsta budskapet. Tänkt för fragmentiska, känsloladdade
 * blottläggningar där flera röster eller flera meningar landar tillsammans.
 *
 * Designintention: ersätter förklaringsslides med direkt impact. Använd
 * sparsamt — citaten ska göra jobbet.
 */
export function QuoteCollage({
  kicker,
  header,
  source,
  background,
  accent = "var(--accent-alert)",
  typingSpeed = 24,
  betweenPause = 1100,
  children,
}: QuoteCollageProps) {
  const quotes = parseQuotes(children);
  // Vilka citat har börjat avtäckas? Hanteras via stigande state.
  const [activeIdx, setActiveIdx] = useState(-1);

  // Auto-stagger genom alla citat.
  useEffect(() => {
    if (quotes.length === 0) return;
    setActiveIdx(-1);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    // Första startar efter 600ms.
    quotes.forEach((q, i) => {
      const approxPrevTime =
        i === 0
          ? 600
          : 600 +
            quotes
              .slice(0, i)
              .reduce((sum, qq) => sum + qq.text.length * typingSpeed + betweenPause, 0);
      timeouts.push(setTimeout(() => setActiveIdx((cur) => Math.max(cur, i)), approxPrevTime));
    });
    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes.length, typingSpeed, betweenPause]);

  // Om ett explicit background skickas in (foto/custom mörk yta) behandlas det som
  // icke-tema-bakgrund → citaten får fast ljus text. Annars följer slidens rot temat.
  const hasCustomBg = Boolean(background);
  const bg = background ?? "var(--slide-base, var(--bg))";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Subtil signal-röd glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${withAlpha(accent, 0.08)}, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Kicker uppe till vänster */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {kicker}
        </motion.div>
      ) : null}

      {/* Header */}
      {header ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            right: "clamp(2rem, 4vw, 4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: withAlpha(accent, 0.75),
            zIndex: 5,
            textAlign: "right",
          }}
        >
          {header}
        </motion.div>
      ) : null}

      {/* Citatcollage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "clamp(4rem, 8vh, 6rem) clamp(2rem, 4vw, 4rem)",
        }}
      >
        {quotes.map((quote, i) => {
          const pos = POSITIONS[i] ?? POSITIONS[POSITIONS.length - 1];
          const visible = i <= activeIdx;
          const isAlert = quote.variant === "alert";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24, scale: 0.96, rotate: pos.rotate + (pos.rotate < 0 ? -3 : 3) }}
              animate={
                visible
                  ? { opacity: 1, y: 0, scale: 1, rotate: pos.rotate }
                  : { opacity: 0, y: 24, scale: 0.96 }
              }
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                transformOrigin: "center center",
              }}
            >
              <div
                style={{
                  padding: isAlert
                    ? "clamp(1.1rem, 2vh, 1.6rem) clamp(1.3rem, 2.3vw, 2rem)"
                    : "clamp(0.85rem, 1.6vh, 1.2rem) clamp(1rem, 1.8vw, 1.5rem)",
                  borderRadius: "0.65rem",
                  background: isAlert
                    ? `linear-gradient(135deg, ${withAlpha(accent, 0.18)}, ${withAlpha(accent, 0.08)})`
                    : hasCustomBg
                      ? "rgba(20,15,15,0.78)"
                      : "var(--bg-elevated)",
                  border: isAlert
                    ? `1.5px solid ${withAlpha(accent, 0.7)}`
                    : `1px solid ${withAlpha(accent, 0.22)}`,
                  boxShadow: isAlert
                    ? `0 25px 50px -20px rgba(0,0,0,0.7), 0 0 50px -10px ${withAlpha(accent, 0.55)}`
                    : `0 20px 40px -22px rgba(0,0,0,0.35), inset 0 1px 0 ${hasCustomBg ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"}`,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: isAlert
                    ? "clamp(1.2rem, 1.85vw, 2rem)"
                    : "clamp(0.95rem, 1.3vw, 1.35rem)",
                  fontWeight: isAlert ? 600 : 500,
                  lineHeight: 1.35,
                  letterSpacing: "-0.012em",
                  color:
                    !isAlert && hasCustomBg
                      ? "rgba(245,246,250,0.92)"
                      : "var(--text)",
                  position: "relative",
                }}
              >
                {/* Citatmarkör */}
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: isAlert ? "-0.5rem" : "-0.35rem",
                    left: isAlert ? "0.85rem" : "0.7rem",
                    fontFamily: "var(--font-display)",
                    fontSize: isAlert ? "2.4rem" : "1.8rem",
                    fontWeight: 800,
                    color: withAlpha(accent, isAlert ? 0.85 : 0.5),
                    lineHeight: 1,
                  }}
                >
                  &ldquo;
                </span>
                <span style={{ display: "inline-block", paddingLeft: "0.5rem" }}>
                  <Typewriter
                    text={quote.text}
                    active={visible}
                    speed={typingSpeed}
                    initialDelay={150}
                  />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Källrad */}
      {source ? (
        <AnimatePresence>
          {activeIdx >= quotes.length - 1 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{
                position: "absolute",
                bottom: "clamp(1rem, 2vh, 1.5rem)",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "center",
                maxWidth: "70%",
              }}
            >
              {source}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}
