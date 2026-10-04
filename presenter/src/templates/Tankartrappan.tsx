"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { EditableText } from "@/lib/inline-edit";

interface Step {
  /** Stort nummer på cirkeln, t.ex. "1" */
  number: string;
  /** Titel, t.ex. "Jag tänker först" */
  title: string;
  /** Kort beskrivning under titeln */
  description: string;
}

interface TankartrappanProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Visas centrerat när alla steg revealats */
  bottomLine?: string;
  /** Egna steg — default är de 4 grundstegen */
  steps?: Step[];
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
}

const DEFAULT_STEPS: Step[] = [
  {
    number: "1",
    title: "Jag tänker först",
    description: "Vad vill jag lära mig? Vad har jag redan koll på?",
  },
  {
    number: "2",
    title: "AI hjälper",
    description: "Jag frågar — och berättar vad jag är ute efter.",
  },
  {
    number: "3",
    title: "Jag granskar",
    description: "Stämmer det? Förstår jag varför? Är det jag som tycker det?",
  },
  {
    number: "4",
    title: "Jag gör om",
    description: "Be om mer. Ändra. Försök igen tills det blir bra.",
  },
];

/**
 * Tänkartrappan — fyra steg för att använda AI utan att fuska bort lärandet.
 *
 * Stegen avslöjas en åt gången via space/pil-höger. Det sista steget triggar
 * även en bottom-line ("Du är chefen.") under trappan.
 *
 * Visuella effekter (chunky offset-skuggor, alternerande pink/blå, lutningar
 * och Bagel Fat One-display) styrs av temat — memphis_riso ger fullt utbygg-
 * nad grafik; andra teman faller tillbaka till neutrala kort.
 */
export function Tankartrappan({
  eyebrow = "TÄNKARTRAPPAN",
  title = "Du är chefen — inte AI:n.",
  subtitle = "Fyra steg för att lära dig — utan att låta AI tänka åt dig.",
  bottomLine = "Du är chefen.",
  steps = DEFAULT_STEPS,
  background,
  overlay,
  overlayMode = "light",
}: TankartrappanProps) {
  const reduce = useReducedMotion();
  // steps.length steg + 1 final reveal av bottom-line
  const activeStep = useSlideSteps(steps.length + 1);
  const allRevealed = activeStep > steps.length;

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  // Alternerande offset-skuggor: pink / blå / pink / blå …
  const SHADOWS = ["--card-shadow", "--card-shadow-alt"];
  // Lite lutning för memphis-känsla, dämpas till 0 vid reduced motion
  const TILTS = [-1.6, 1.2, -1.0, 1.4, -1.2, 1.0];

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="card" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12">
        {/* Eyebrow */}
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.6rem",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="leading-[0.92] tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            fontSize: "clamp(2.4rem, 5.4vw, 5.4rem)",
            color: "var(--text)",
            textShadow: "var(--title-shadow, none)",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>{title}</EditableText>
        </motion.h1>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.45vw, 1.45rem)",
              color: "var(--text-muted)",
              fontWeight: 500,
              marginTop: "0.7rem",
              maxWidth: "44em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </motion.p>
        ) : null}

        {/* Trappan — växer uppåt-höger. flex-col-reverse + indent per steg. */}
        <div
          className="relative mt-8 flex flex-1 flex-col-reverse items-stretch justify-end"
          style={{ gap: "clamp(0.6rem, 1.0vw, 1.0rem)" }}
        >
          {steps.map((step, i) => {
            const revealed = i < activeStep;
            // Indent: senare steg skjuts åt höger så det bildar en trappa
            const indent = i * 4.5; // rem (växer per steg)
            const tilt = reduce ? 0 : TILTS[i % TILTS.length];
            const shadowVar = SHADOWS[i % SHADOWS.length];
            // Sista stegets accent-färg matchar dess offset-skugga
            const numberColor = i % 2 === 0 ? "var(--accent)" : "var(--ornament-color)";

            return (
              <motion.div
                key={step.number}
                initial={false}
                animate={{
                  opacity: revealed ? 1 : 0,
                  x: revealed ? `${indent}rem` : `${indent - 2.2}rem`,
                  rotate: revealed ? tilt : tilt - 4,
                  scale: revealed ? 1 : 0.92,
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  background: "var(--bg-surface)",
                  border: "var(--card-border, 1px solid color-mix(in srgb, var(--text) 15%, transparent))",
                  borderRadius: "var(--radius)",
                  boxShadow: `var(${shadowVar}, 0 8px 24px rgba(0,0,0,0.12))`,
                  padding: "clamp(0.8rem, 1.3vw, 1.4rem) clamp(1.1rem, 1.6vw, 1.7rem)",
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(0.9rem, 1.6vw, 1.6rem)",
                  width: "fit-content",
                  maxWidth: `calc(100% - ${indent}rem)`,
                }}
              >
                {/* Stort nummer */}
                <span
                  className="select-none leading-none flex items-center justify-center"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)" as unknown as number,
                    fontSize: "clamp(2.6rem, 4.2vw, 4.4rem)",
                    color: numberColor,
                    width: "clamp(2.8rem, 4.4vw, 4.6rem)",
                    flexShrink: 0,
                    textShadow: "var(--title-shadow, none)",
                  }}
                >
                  {step.number}
                </span>

                {/* Titel + beskrivning */}
                <div className="flex flex-col" style={{ gap: "0.15rem" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--heading-weight)" as unknown as number,
                      fontSize: "clamp(1.2rem, 1.95vw, 1.95rem)",
                      color: "var(--text)",
                      lineHeight: 1.05,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1.05vw, 1.1rem)",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      lineHeight: 1.3,
                      maxWidth: "30em",
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom-line — revealas efter sista steget */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: allRevealed ? 1 : 0,
              y: allRevealed ? 0 : 14,
              scale: allRevealed ? 1 : 0.94,
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-8 py-3 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.4rem, 2.4vw, 2.4rem)",
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
                letterSpacing: "0.01em",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default Tankartrappan;
