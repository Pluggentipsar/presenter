"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";

/**
 * ValueInversion ★ — det maskinella faller, det mänskliga stiger.
 *
 * Påståendet "AI gör det mänskliga dyrbarare" låter som en tröstmening
 * tills man ser att det är ett prisargument. När något blir oändligt
 * billigt att producera flyttas värdet till det som inte går att
 * producera. Två kurvor som korsar varandra säger det på en sekund;
 * en mening om det tar en minut och övertygar ingen.
 *
 * Stegen bär vändningen. Steg 0 ritar bara fallet — det är den delen
 * publiken redan känner till och är rädd för. Steg 1 lägger den stigande
 * kurvan ovanpå, och det är då meningen byter innebörd från hot till
 * uppdrag.
 *
 * ```mdx
 * <ValueInversion
 *   chapter="§ Agens > intelligens"
 *   axisLabel="Ju mer AI kan →"
 *   fallLabel="Det maskinella"
 *   fallEnd="nästan gratis"
 *   riseLabel="Det mänskliga"
 *   riseEnd="dyrbarare"
 *   crossLabel="här står skolan"
 *   landing="AI gör oss inte mänskligare. Den gör det **mänskliga** dyrbarare."
 * />
 * ```
 */

interface ValueInversionProps {
  chapter?: string;
  kicker?: string;
  title?: string;
  /** Etikett längs x-axeln. */
  axisLabel?: string;
  /** Namn på den fallande kurvan. */
  fallLabel?: string;
  /** Vad den fallande kurvan landar i. */
  fallEnd?: string;
  /** Namn på den stigande kurvan. */
  riseLabel?: string;
  /** Vad den stigande kurvan landar i. */
  riseEnd?: string;
  /** Etikett vid korsningen. Utelämna för att dölja markören. */
  crossLabel?: string;
  /** Landningsraden. Stödjer **fet**. */
  landing?: string;
  source?: string;
  accent?: string;
}

const W = 900;
const H = 400;

const FALL = "M 70 88 C 240 100 340 188 460 222 C 600 262 720 300 850 318";
const RISE = "M 70 318 C 220 306 330 258 460 222 C 610 180 730 116 850 70";
const CROSS = { x: 460, y: 222 };

export function ValueInversion({
  chapter,
  kicker,
  title,
  axisLabel = "Ju mer AI kan →",
  fallLabel = "Det maskinella",
  fallEnd = "nästan gratis",
  riseLabel = "Det mänskliga",
  riseEnd = "dyrbarare",
  crossLabel,
  landing,
  source,
  accent = "var(--accent)",
}: ValueInversionProps) {
  const step = useSlideSteps(2);
  const risen = step >= 1;

  const muted = "var(--text-muted)";
  const fallColor = muted;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
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
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 5vh, 4rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(4.5rem, 8vh, 6rem)",
          gap: "clamp(0.8rem, 2vh, 1.6rem)",
          zIndex: 2,
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

        {title ? (
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.4rem, 2.6vw, 2.3rem)",
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title} multiline block>
              {inlineMarkdown(title)}
            </EditableText>
          </div>
        ) : null}

        {/* ── Diagrammet ── */}
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", maxHeight: "100%", overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <filter id="vi-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Basen */}
            <line x1={70} y1={362} x2={860} y2={362} stroke="rgba(128,128,128,0.25)" strokeWidth={1.5} />
            <text
              x={70}
              y={390}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fill: muted,
              }}
            >
              {axisLabel}
            </text>

            {/* Fallande kurva */}
            <motion.path
              d={FALL}
              fill="none"
              stroke={fallColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="1 0"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: risen ? 0.55 : 1 }}
              transition={{ pathLength: { duration: 1.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.6 } }}
            />
            <motion.text
              x={78}
              y={70}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fill: fallColor,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {fallLabel}
            </motion.text>
            <motion.text
              x={856}
              y={340}
              textAnchor="end"
              style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: "0.1em", fill: fallColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.9 }}
            >
              {fallEnd}
            </motion.text>

            {/* Stigande kurva — vändningen */}
            <motion.path
              d={RISE}
              fill="none"
              stroke={accent}
              strokeWidth={4}
              strokeLinecap="round"
              filter="url(#vi-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={risen ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.text
              x={78}
              y={344}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fill: accent,
              }}
              initial={{ opacity: 0 }}
              animate={risen ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {riseLabel}
            </motion.text>
            <motion.text
              x={856}
              y={48}
              textAnchor="end"
              style={{
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                fill: accent,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={risen ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.7, delay: 1.6 }}
            >
              {riseEnd}
            </motion.text>

            {/* Korsningen */}
            {crossLabel ? (
              <motion.g
                initial={{ opacity: 0 }}
                animate={risen ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 1.1 }}
              >
                <motion.circle
                  cx={CROSS.x}
                  cy={CROSS.y}
                  r={9}
                  fill="var(--bg)"
                  stroke={accent}
                  strokeWidth={2.5}
                />
                <motion.circle
                  cx={CROSS.x}
                  cy={CROSS.y}
                  r={9}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1.5}
                  animate={{ r: [9, 22], opacity: [0.7, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                />
                <text
                  x={CROSS.x + 20}
                  y={CROSS.y - 16}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fill: "var(--text)",
                  }}
                >
                  {crossLabel}
                </text>
              </motion.g>
            ) : null}
          </svg>
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={risen ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.9, delay: 1.9 }}
            style={{
              paddingTop: "clamp(0.8rem, 1.8vh, 1.4rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.5rem, 2.9vw, 2.7rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="landing" value={landing} multiline block>
              {inlineMarkdown(landing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {source ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(1.4rem, 2.6vh, 2rem)",
            right: "clamp(3rem, 6vw, 7rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.8rem)",
            letterSpacing: "0.12em",
            color: muted,
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
