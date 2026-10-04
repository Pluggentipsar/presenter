"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";

/**
 * MatteusGap ★ — gapet som växer när alla får samma verktyg.
 *
 * Matteuseffekten: den som har ska varda given. Två elever startar i samma
 * punkt och får samma AI. Den ena har språket, stödet hemma och någon som
 * frågar "vad tänkte du?" — kurvan stiger. Den andra har verktyget och
 * ingen som visar — kurvan planar ut. Gapet emellan är sliden.
 *
 * Kurvorna TECKNAS, de dyker inte upp. Det är hela argumentet: gapet
 * uppstår över tid, av samma insats. Först när båda är dragna fylls ytan
 * mellan dem och får sitt namn.
 *
 * Byggd för avslutningen, direkt efter "skolan är viktigare än någonsin" —
 * där svaret på varför måste bli konkret: det kompensatoriska uppdraget.
 *
 * ```mdx
 * <MatteusGap
 *   kicker="§ Avslut · Det kompensatoriska"
 *   title="Hur undviker vi Matteusgapet?"
 *   upperLabel="Den som redan har"
 *   lowerLabel="Den som inte har"
 *   landing="Kunskap **om** AI är en del av det kompensatoriska uppdraget."
 * />
 * ```
 */

interface MatteusGapProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  /** Står under rubriken, sätter scenen innan kurvorna dras. */
  intro?: string;
  /** Etikett vid startpunkten — det båda har gemensamt. */
  startLabel?: string;
  upperLabel?: string;
  upperCaption?: string;
  lowerLabel?: string;
  lowerCaption?: string;
  /** Namnet på ytan mellan kurvorna. */
  gapLabel?: string;
  /** Landningsraden. Stödjer **fetstil**. */
  landing?: string;
  /** Källrad längst ned till höger. */
  source?: string;
  accent?: string;
}

const W = 1000;
const H = 400;

const START = { x: 62, y: 232 };
const UPPER = `M ${START.x} ${START.y} C 300 226 500 178 700 118 S 900 44 946 30`;
const LOWER = `M ${START.x} ${START.y} C 300 240 520 258 720 268 S 900 276 946 280`;
// Ytan mellan kurvorna: upp längs den övre, tillbaka längs den undre.
const GAP_AREA = `${UPPER} L 946 280 C 900 276 820 272 720 268 S 300 240 ${START.x} ${START.y} Z`;

export function MatteusGap({
  kicker,
  chapter,
  title,
  intro,
  startLabel = "Samma klassrum. Samma verktyg.",
  upperLabel = "Den som redan har",
  upperCaption,
  lowerLabel = "Den som inte har",
  lowerCaption,
  gapLabel = "Matteusgapet",
  landing,
  source,
  accent = "var(--accent)",
}: MatteusGapProps) {
  // 0 = tom scen · 1 = övre kurvan · 2 = undre kurvan · 3 = gapet får namn · 4 = landningen
  const step = useSlideSteps(5);
  const upperDrawn = step >= 1;
  const lowerDrawn = step >= 2;
  const gapNamed = step >= 3;
  const landed = step >= 4;

  const draw = (on: boolean, delay: number) => ({
    strokeDasharray: 1,
    strokeDashoffset: on ? 0 : 1,
    transition: `stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        display: "flex",
        flexDirection: "column",
        padding:
          "clamp(1.6rem, 3.4vh, 2.8rem) clamp(2rem, 4.5vw, 4.5rem) clamp(1.4rem, 3vh, 2.4rem)",
      }}
    >
      {kicker || chapter ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.68rem, 0.85vw, 0.9rem))",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: accent, fontWeight: 600 }}>
            {kicker ? (
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            ) : null}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {chapter ? (
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            ) : null}
          </span>
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.9rem, 3.4vw, 3.4rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.028em",
            color: "var(--text)",
            margin: "clamp(0.5rem, 1.4vh, 1.1rem) 0 0",
            maxWidth: "18em",
          }}
        >
          <EditableText path="title" value={title}>
            {inlineMarkdown(title)}
          </EditableText>
        </motion.h2>
      ) : null}

      {intro ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--room-body, clamp(0.95rem, 1.3vw, 1.4rem))",
            lineHeight: 1.35,
            color: "var(--text-muted)",
            margin: "clamp(0.35rem, 0.9vh, 0.7rem) 0 0",
            maxWidth: "34em",
          }}
        >
          <EditableText path="intro" value={intro}>
            {inlineMarkdown(intro)}
          </EditableText>
        </motion.p>
      ) : null}

      {/* Diagrammet */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: "clamp(0.6rem, 1.6vh, 1.2rem)" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, width: "var(--room-gap-chart-width, 100%)", height: "100%" }}
          aria-hidden
        >
          <defs>
            <linearGradient id="mg-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Ytan mellan kurvorna */}
          <path
            d={GAP_AREA}
            fill="url(#mg-fill)"
            style={{
              opacity: gapNamed ? 1 : 0,
              transition: "opacity 1s ease 0.15s",
            }}
          />

          {/* Undre kurvan */}
          <path
            d={LOWER}
            fill="none"
            stroke="color-mix(in srgb, var(--text) 45%, transparent)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            style={draw(lowerDrawn, 0)}
          />

          {/* Övre kurvan */}
          <path
            d={UPPER}
            fill="none"
            stroke={accent}
            strokeWidth="4.5"
            strokeLinecap="round"
            pathLength={1}
            style={draw(upperDrawn, 0)}
          />

          {/* Startpunkten */}
          <circle
            cx={START.x}
            cy={START.y}
            r="7"
            fill="var(--bg-surface)"
            stroke="color-mix(in srgb, var(--text) 55%, transparent)"
            strokeWidth="3"
          />

          {/* Mätlinjen som namnger gapet */}
          <line
            x1="826"
            y1="70"
            x2="826"
            y2="274"
            stroke="color-mix(in srgb, var(--text) 38%, transparent)"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            style={{ opacity: gapNamed ? 1 : 0, transition: "opacity 0.8s ease" }}
          />
        </svg>

        {/* Etiketter ovanpå diagrammet, i HTML för läsbarhetens skull */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Start */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              position: "absolute",
              left: "1%",
              top: "64%",
              maxWidth: "13em",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.68rem, 0.88vw, 0.95rem))",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            {startLabel}
          </motion.div>

          {/* Övre etikett */}
          <motion.div
            initial={false}
            animate={{ opacity: upperDrawn ? 1 : 0, x: upperDrawn ? 0 : -14 }}
            transition={{ duration: 0.6, delay: upperDrawn ? 1.1 : 0 }}
            style={{
              position: "absolute",
              right: "0.5%",
              top: "-1%",
              maxWidth: "var(--room-chart-label-width, 13em)",
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--room-body, clamp(1rem, 1.5vw, 1.7rem))",
                lineHeight: 1.12,
                color: accent,
              }}
            >
              {upperLabel}
            </div>
            {upperCaption ? (
              <div
                style={{
                  marginTop: "0.35em",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--room-detail, clamp(0.75rem, 1vw, 1.05rem))",
                  lineHeight: 1.4,
                  color: "var(--text-muted)",
                }}
              >
                {upperCaption}
              </div>
            ) : null}
          </motion.div>

          {/* Undre etikett */}
          <motion.div
            initial={false}
            animate={{ opacity: lowerDrawn ? 1 : 0, x: lowerDrawn ? 0 : -14 }}
            transition={{ duration: 0.6, delay: lowerDrawn ? 1.1 : 0 }}
            style={{
              position: "absolute",
              right: "0.5%",
              top: "73%",
              maxWidth: "var(--room-chart-label-width, 13em)",
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--room-body, clamp(1rem, 1.5vw, 1.7rem))",
                lineHeight: 1.12,
                color: "var(--text)",
              }}
            >
              {lowerLabel}
            </div>
            {lowerCaption ? (
              <div
                style={{
                  marginTop: "0.35em",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--room-detail, clamp(0.75rem, 1vw, 1.05rem))",
                  lineHeight: 1.4,
                  color: "var(--text-muted)",
                }}
              >
                {lowerCaption}
              </div>
            ) : null}
          </motion.div>

          {/* Gapets namn, i mätlinjen.
              Centreringen ligger i den yttre div:en — framer-motion skriver
              sin egen `transform` och skulle annars äta translate(-50%,-50%). */}
          <div
            style={{
              position: "absolute",
              // Mitt på mätlinjen (x=826 av 1000) och mitt i gapet (y≈174 av
              // 400) — räknat på kurvornas faktiska punkter.
              left: "var(--room-gap-label-left, 82.6%)",
              top: "43.5%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <motion.div
              initial={false}
              animate={{ opacity: gapNamed ? 1 : 0, y: gapNamed ? 0 : 8 }}
              transition={{ duration: 0.6, delay: gapNamed ? 0.5 : 0 }}
              style={{
                padding: "0.35em 0.9em",
                borderRadius: "999px",
                background: "var(--bg-surface)",
                border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-detail, clamp(0.72rem, 0.95vw, 1.05rem))",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: accent,
                whiteSpace: "nowrap",
              }}
            >
              {gapLabel}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Landningen */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "2em",
          marginTop: "clamp(0.6rem, 1.6vh, 1.2rem)",
        }}
      >
        {landing ? (
          <motion.p
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
            transition={{ duration: 0.7 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.1rem, 1.8vw, 2.1rem)",
              lineHeight: 1.22,
              color: "var(--text)",
              margin: 0,
              maxWidth: "24em",
            }}
          >
            <EditableText path="landing" value={landing}>
              {inlineMarkdown(landing)}
            </EditableText>
          </motion.p>
        ) : (
          <span />
        )}
        {source ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.62rem, 0.78vw, 0.82rem))",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {source}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default MatteusGap;
