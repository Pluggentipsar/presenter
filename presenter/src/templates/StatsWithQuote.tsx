"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface StatItem {
  value: string;
  suffix?: string;
  label: string;
}

interface StatsWithQuoteProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Rubrik. */
  title?: string;
  /** Underrubrik. */
  subtitle?: string;
  /** Källa under stats (mono, små caps). */
  source?: string;
  /**
   * Markdown-lista med stats.
   * Format: `- VÄRDE · SUFFIX · LABEL`
   * SUFFIX är frivilligt — t.ex. "%", " miljoner", "/v".
   */
  children?: ReactNode;
  /** Citat som visas under stats — t.ex. "lättillgängliga och trygga..." */
  quote?: string;
  /** Attribution för citatet (källa). */
  quoteSource?: string;
  /** Animationstid för count-up (sekunder). Default 1.4. */
  countDuration?: number | string;
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

function parseStats(children: ReactNode): StatItem[] {
  const out: StatItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [value = "", suffix = "", label = ""] = parts;
    out.push({ value, suffix, label });
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
  return out;
}

/**
 * StatsWithQuote — tre (eller fler) siffror i editorial bokstil + ett
 * ko-placerat citat under, för att binda data till en mänsklig röst.
 *
 * Designat för "hemmaplan"-slides där man visar omfattningsstatistik
 * (typ Internetstiftelsen) och samtidigt nämner Bris/expertkälla.
 * Tema-agnostisk — alla färger ärvs från temat.
 */
export function StatsWithQuote({
  kicker,
  chapter,
  title,
  subtitle,
  source,
  children,
  quote,
  quoteSource,
  countDuration = 1.4,
  background,
  overlay,
  overlayMode = "dark",
}: StatsWithQuoteProps) {
  const stats = parseStats(children);
  const duration =
    typeof countDuration === "string"
      ? parseFloat(countDuration)
      : countDuration;

  // När en bild/foto-bakgrund skickas in (ofta mörkad via overlayMode="dark")
  // sitter texten på fotot, inte på temats bg. Då måste primär/mutad text vara
  // fast ljus så den syns även på ljust tema (dagsljus). Utan bakgrund
  // följer texten temat via var(--text)/var(--text-muted).
  const hasBackground = Boolean(background);
  const textPrimary = hasBackground ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMutedColor = hasBackground
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
            color: textMutedColor,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(4.5rem, 7vh, 6rem)",
          gap: "clamp(1.5rem, 2.8vh, 2.4rem)",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {/* Title + subtitle */}
        {title || subtitle ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(0.4rem, 1vh, 0.8rem)",
              textAlign: "center",
            }}
          >
            {title ? (
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.7rem, 2.8vw, 2.5rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: textPrimary,
                  margin: 0,
                }}
              >
                <EditableText path="title" value={title}>
                  {title}
                </EditableText>
              </motion.h2>
            ) : null}
            {subtitle ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
                  color: textMutedColor,
                  textAlign: "center",
                  margin: 0,
                  maxWidth: "32em",
                }}
              >
                <EditableText path="subtitle" value={subtitle}>
                  {subtitle}
                </EditableText>
              </motion.p>
            ) : null}
          </div>
        ) : null}

        {/* Stats-grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))`,
            gap: "clamp(1.5rem, 3vw, 3rem)",
            width: "100%",
            maxWidth: "min(64rem, 100%)",
            alignItems: "start",
          }}
        >
          {stats.map((stat, i) => (
            <StatCell
              key={i}
              stat={stat}
              delay={0.7 + i * 0.25}
              duration={duration}
              textPrimary={textPrimary}
            />
          ))}
        </div>

        {/* Source */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.7 + stats.length * 0.25 + 0.3,
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.68rem, 0.82vw, 0.8rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: textMutedColor,
              textAlign: "center",
              maxWidth: "40em",
            }}
          >
            <EditableText path="source" value={source}>
              {source}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Citat-block under stats */}
        {quote ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.7 + stats.length * 0.25 + 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              marginTop: "clamp(0.8rem, 1.8vh, 1.6rem)",
              padding:
                "clamp(1.2rem, 2vh, 1.8rem) clamp(1.5rem, 3vw, 2.5rem)",
              background:
                "color-mix(in srgb, var(--accent) 6%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "var(--radius)",
              maxWidth: "min(48rem, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.5rem, 1vh, 0.8rem)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(1.1rem, 1.5vw, 1.4rem)",
                lineHeight: 1.4,
                color: textPrimary,
                letterSpacing: "-0.005em",
              }}
            >
              <EditableText path="quote" value={quote}>
                "{quote}"
              </EditableText>
            </div>
            {quoteSource ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.75rem)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                <EditableText path="quoteSource" value={quoteSource}>
                  — {quoteSource}
                </EditableText>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function StatCell({
  stat,
  delay,
  duration,
  textPrimary,
}: {
  stat: StatItem;
  delay: number;
  duration: number;
  textPrimary: string;
}) {
  const targetValue = parseFloat(stat.value.replace(",", "."));
  const isNumeric = Number.isFinite(targetValue);
  const decimals = (() => {
    const s = stat.value.replace(",", ".");
    const ix = s.indexOf(".");
    return ix === -1 ? 0 : s.length - ix - 1;
  })();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isNumeric) return;
    const startMs = performance.now();
    const delayMs = delay * 1000 + 200;
    const totalMs = duration * 1000;
    let raf = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const elapsed = now - startMs - delayMs;
      if (elapsed < 0) {
        setDisplayValue(0);
      } else if (elapsed >= totalMs) {
        setDisplayValue(targetValue);
        return;
      } else {
        setDisplayValue(targetValue * easeOut(elapsed / totalMs));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, isNumeric, duration, delay]);

  const formatted = isNumeric
    ? displayValue.toLocaleString("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : stat.value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "clamp(0.5rem, 1vh, 0.85rem)",
      }}
    >
      {/* Siffran */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          letterSpacing: "-0.035em",
          lineHeight: 0.9,
        }}
      >
        <span
          style={{
            fontSize: "clamp(4.5rem, 9vw, 8rem)",
            color: "var(--accent)",
          }}
        >
          {formatted}
        </span>
        {stat.suffix ? (
          <span
            style={{
              fontSize: "clamp(1.8rem, 4vw, 3.2rem)",
              color: textPrimary,
              marginLeft: "0.1em",
              fontWeight: 600,
            }}
          >
            {stat.suffix}
          </span>
        ) : null}
      </div>

      {/* Liten ornament-linje */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: delay + 0.3 }}
        style={{
          width: "clamp(2rem, 3.5vw, 3rem)",
          height: "1px",
          background: "var(--accent)",
          transformOrigin: "left",
        }}
      />

      {/* Label */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
          lineHeight: 1.4,
          color: textPrimary,
          letterSpacing: "0.005em",
          maxWidth: "16em",
        }}
      >
        {stat.label}
      </div>
    </motion.div>
  );
}
