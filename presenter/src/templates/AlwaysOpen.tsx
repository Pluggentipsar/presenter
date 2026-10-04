"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";

/**
 * AlwaysOpen ★ — lektionens 45 minuter mot elevens dygn.
 *
 * Argumentet går inte att säga lika hårt som det går att rita. En lektion
 * är en hårfin skåra i ett dygnsvarv — tre procent av ringen. Sedan tar
 * den slut, och eleven är ensam med resten. Det är först när hela ringen
 * tänds som poängen landar: en lärportal stänger inte 09.10.
 *
 * Rörelsen bär betydelsen. Steg 0 ritar bara skåran, och den är avsiktligt
 * pinsamt liten — låt den stå tyst en stund. Steg 1 låter ljuset gå hela
 * varvet, och det är där rummet ska dra efter andan.
 *
 * ```mdx
 * <AlwaysOpen
 *   chapter="§ Lärportalen · Payoff"
 *   lessonStart="08.25"
 *   lessonEnd="09.10"
 *   lessonLabel="Lektionen"
 *   statement="Lektionen slutade 09.10."
 *   reveal="För eleven är den nu öppen — **dygnet runt.**"
 * />
 * ```
 */

interface AlwaysOpenProps {
  chapter?: string;
  kicker?: string;
  /** Klockslag lektionen börjar, "HH.MM" eller "HH:MM". Default 08.25. */
  lessonStart?: string;
  /** Klockslag lektionen slutar. Default 09.10. */
  lessonEnd?: string;
  /** Etikett vid skåran. Default "Lektionen". */
  lessonLabel?: string;
  /** Etikett när hela ringen tänds. Default "Öppen". */
  openLabel?: string;
  /** Raden som står innan ringen tänds. Stödjer **fet**. */
  statement?: string;
  /** Raden som kommer med ljuset. Stödjer **fet**. */
  reveal?: string;
  /** Liten källrad nere till höger. */
  source?: string;
  accent?: string;
  background?: string;
  overlay?: number;
}

const SIZE = 420;
const C = SIZE / 2;
const R = 158;

/** "09.10" | "9:10" → decimaltimmar. Tål slarv; faller tillbaka på 0. */
function toHours(t: string | undefined, fallback: number): number {
  if (!t) return fallback;
  const m = /^(\d{1,2})[.:](\d{1,2})$/.exec(t.trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return fallback;
  return h + min / 60;
}

/** Timme → punkt på ringen. 00 ligger rakt upp, klockan går medsols. */
function pointAt(hour: number, radius = R): { x: number; y: number } {
  const rad = ((hour / 24) * 360 - 90) * (Math.PI / 180);
  return { x: C + radius * Math.cos(rad), y: C + radius * Math.sin(rad) };
}

function arcPath(from: number, to: number, radius = R): string {
  const a = pointAt(from, radius);
  const b = pointAt(to, radius);
  const large = to - from > 12 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function AlwaysOpen({
  chapter,
  kicker,
  lessonStart = "08.25",
  lessonEnd = "09.10",
  lessonLabel = "Lektionen",
  openLabel = "Öppen",
  statement,
  reveal,
  source,
  accent = "var(--accent)",
  background,
  overlay = 0.62,
}: AlwaysOpenProps) {
  const step = useSlideSteps(2);
  const lit = step >= 1;

  const start = toHours(lessonStart, 8.417);
  const end = toHours(lessonEnd, 9.167);
  const span = Math.max(end - start, 0.1);
  const mid = start + span / 2;

  const onDark = Boolean(background);
  const textColor = onDark ? "rgba(245,246,250,0.96)" : "var(--text)";
  const mutedColor = onDark ? "rgba(245,246,250,0.55)" : "var(--text-muted)";
  const trackColor = onDark ? "rgba(245,246,250,0.13)" : "rgba(10,9,8,0.10)";

  // Etiketten vid skåran sitter en bit utanför ringen, på skårans vinkel.
  const labelAnchor = pointAt(mid, R + 34);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {chapter ? (
        <div
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
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full items-center"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem) clamp(3rem, 6vw, 7rem)",
          gap: "clamp(2rem, 5vw, 5rem)",
          zIndex: 2,
        }}
      >
        {/* ── Ringen ── */}
        <div style={{ flex: "0 0 auto", width: "min(46%, 30rem)" }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ width: "100%", height: "auto", overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <filter id="ao-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dygnsspåret */}
            <circle cx={C} cy={C} r={R} fill="none" stroke={trackColor} strokeWidth={10} />

            {/* Timmarkeringar — var tredje timme får en längre streck */}
            {Array.from({ length: 24 }, (_, h) => {
              const major = h % 3 === 0;
              const a = pointAt(h, R - (major ? 17 : 12));
              const b = pointAt(h, R - 8);
              return (
                <line
                  key={h}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={trackColor}
                  strokeWidth={major ? 2 : 1}
                  opacity={major ? 1 : 0.6}
                />
              );
            })}

            {/* Hela dygnet tänds — steg 1 */}
            <motion.circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={accent}
              strokeWidth={10}
              strokeLinecap="round"
              filter="url(#ao-glow)"
              style={{ transformOrigin: `${C}px ${C}px`, rotate: -90 }}
              strokeDasharray={2 * Math.PI * R}
              initial={{ strokeDashoffset: 2 * Math.PI * R, opacity: 0 }}
              animate={
                lit
                  ? { strokeDashoffset: 0, opacity: 1 }
                  : { strokeDashoffset: 2 * Math.PI * R, opacity: 0 }
              }
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Skåran — lektionen. Ligger kvar ovanpå, alltid synlig. */}
            <motion.path
              d={arcPath(start, end)}
              fill="none"
              stroke={lit ? "var(--bg)" : accent}
              strokeWidth={lit ? 11 : 12}
              strokeLinecap="butt"
              filter={lit ? undefined : "url(#ao-glow)"}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Utpekning av skåran */}
            <motion.line
              x1={pointAt(mid, R + 10).x}
              y1={pointAt(mid, R + 10).y}
              x2={pointAt(mid, R + 26).x}
              y2={pointAt(mid, R + 26).y}
              stroke={mutedColor}
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: lit ? 0.35 : 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            />
            <motion.text
              x={labelAnchor.x}
              y={labelAnchor.y}
              textAnchor="start"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                letterSpacing: "0.14em",
                fill: lit ? mutedColor : accent,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              {`${lessonStart}–${lessonEnd}`}
            </motion.text>

            {/* Mitten — byter innebörd på steg 1 */}
            <motion.text
              x={C}
              y={C - 12}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: 62,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fill: lit ? accent : textColor,
              }}
              key={lit ? "open" : "closed"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: lit ? 0.9 : 1.5 }}
            >
              {lit ? "24/7" : `${Math.round(span * 60)} min`}
            </motion.text>
            <motion.text
              x={C}
              y={C + 26}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fill: mutedColor,
              }}
              key={lit ? "open-l" : "closed-l"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: lit ? 1.1 : 1.7 }}
            >
              {lit ? openLabel : lessonLabel}
            </motion.text>
          </svg>
        </div>

        {/* ── Texten ── */}
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2.2vh, 1.8rem)",
            minWidth: 0,
          }}
        >
          {kicker ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </div>
          ) : null}

          {statement ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4 }}
              style={{
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: "clamp(1.9rem, 3.6vw, 3.4rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                color: textColor,
              }}
            >
              <EditableText path="statement" value={statement} multiline block>
                {inlineMarkdown(statement)}
              </EditableText>
            </motion.div>
          ) : null}

          {reveal ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={lit ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.8, delay: lit ? 1.5 : 0 }}
              style={{
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: "clamp(1.9rem, 3.6vw, 3.4rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                color: textColor,
              }}
            >
              <EditableText path="reveal" value={reveal} multiline block>
                {inlineMarkdown(reveal)}
              </EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>

      {source ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(1.6rem, 3vh, 2.4rem)",
            right: "clamp(3rem, 6vw, 7rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.8rem)",
            letterSpacing: "0.12em",
            color: mutedColor,
            zIndex: 3,
          }}
        >
          <EditableText path="source" value={source}>
            {source}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}
