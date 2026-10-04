"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import {
  AmbientBackdrop,
  glassCardStyle,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";

/**
 * LensQuestion — kortet som STÄNGER en lins.
 *
 * Byggd för att rimma med `LiquidDivider`, som öppnar samma lins: samma
 * glaskort, samma siffra, samma accentlinje. Men spegelvänd — sifferkortet
 * ligger till höger, linjen tecknas höger→vänster, och ett stort spöklikt
 * frågetecken ligger bakom texten. Publiken läser skillnaden utan att den
 * behöver förklaras: dividern öppnar, det här stänger.
 *
 * ```mdx
 * <LensQuestion
 *   number="01"
 *   lens="Assisterande"
 *   question="Vilket **hinder** står mellan eleven och innehållet — och kan vi ta bort just det?"
 * />
 * ```
 *
 * Fetstil i `question` renderas som accentfärgad text.
 */

interface LensQuestionProps {
  /** Linsens nummer — samma som dess LiquidDivider. */
  number?: string;
  /** Linsens namn, t.ex. "Assisterande". */
  lens: string;
  /** Frågan. Stödjer **fet** för accentfärg. */
  question: string;
  /** Liten etikett ovanför frågan. Default "… frågar". */
  eyebrow?: string;
  /** Bakgrundsbild att refraktera mot. */
  background?: string;
  /** Sekundär ambient-accent. */
  accent2?: string;
}

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/** **fet** → accentfärgad span. */
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function LensQuestion({
  number,
  lens,
  question,
  eyebrow,
  background,
  accent2,
}: LensQuestionProps) {
  const label = eyebrow ?? `${lens} frågar`;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} overlay={0.7} />

      {/* Spöklikt frågetecken — bär ytan så texten slipper göra det ensam.
          Ligger bakom allt, beskuret av overflow-hidden i högerkanten. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.86, rotate: -6 }}
        // OBS: måltalet måste vara slutopaciteten. Sätter man opacity i style
        // och animerar till 1 vinner animationen — glyfen blev då helt
        // accentgrön i stället för en diskret ton.
        animate={{ opacity: 0.12, scale: 1, rotate: 0 }}
        transition={{ duration: 1.6, ease: EASE }}
        style={{
          position: "absolute",
          // Lyft upp och krymp: tidigare låg glyfen så lågt att bara den övre
          // kurvan syntes och läste som en grön klump, inte som ett frågetecken.
          right: "3vw",
          bottom: "5vh",
          zIndex: 1,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(18rem, 44vh, 34rem)",
          lineHeight: 1,
          fontWeight: 500,
          color: "var(--accent)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        ?
      </motion.div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(3rem, 5vw, 5rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.4rem, 3vh, 2.4rem)",
        }}
      >
        {/* Topprad: etikett till vänster, sifferkortet till höger.
            Dividerns kort ligger till vänster — spegelvändningen är signalen. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vh, 1.2rem)" }}>
            {/* Accentlinjen tecknas höger→vänster (motsatt dividern). */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.0, delay: 0.25, ease: EASE }}
              style={{
                height: "1.5px",
                width: "6rem",
                background:
                  "linear-gradient(270deg, var(--accent) 0%, transparent 100%)",
                boxShadow: "0 0 20px var(--accent-glow)",
                transformOrigin: "right",
                borderRadius: "999px",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
              style={{
                fontFamily: "var(--font-mono)",
                // Ca dubbelt mot dividerns kicker. Etiketten bär vilken lins
                // som stängs — den måste gå att läsa från bakre raden, inte
                // bara av den som står vid datorn. Tightare spärr så den inte
                // blir orimligt bred när graden växer.
                fontSize: "clamp(1.1rem, 1.7vw, 2rem)",
                letterSpacing: "0.22em",
                fontWeight: 600,
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="lens" value={lens}>
                {label}
              </EditableText>
            </motion.div>
          </div>

          {number ? (
            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 28, mass: 1 }}
              style={{
                ...glassCardStyle({
                  radius: "1.25rem",
                  blur: 28,
                  padding: "clamp(1rem, 1.6vw, 1.6rem) clamp(1.4rem, 2.2vw, 2.2rem)",
                }),
                position: "relative",
                flexShrink: 0,
                fontFamily: "var(--font-display)",
                // Medvetet mindre än dividerns 5–10rem: linsen är avklarad,
                // siffran är en kvittens och ska inte konkurrera med frågan.
                fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)",
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
                color: "var(--accent)",
                textShadow: "0 0 40px var(--accent-glow)",
                fontVariantNumeric: "tabular-nums",
                opacity: 0.85,
              }}
            >
              <SpecularHighlight intensity={0.18} />
              <span style={{ position: "relative", zIndex: 2 }}>{number}</span>
            </motion.div>
          ) : null}
        </div>

        {/* Frågan — ytans huvudperson. */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.5, ease: EASE }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 4.4vw, 4rem)",
            fontWeight: 500,
            letterSpacing: "-0.025em",
            lineHeight: 1.12,
            color: "var(--text)",
            margin: 0,
            // Procent, inte em: em är relativt den redan stora display-graden,
            // så "20em" blir bredare än ytan och slutar begränsa något alls.
            // 68 % ger läsbar radlängd OCH lämnar frågetecknet i fred till höger.
            maxWidth: "68%",
          }}
        >
          <EditableText path="question" value={question}>
            {renderInline(question)}
          </EditableText>
        </motion.p>
      </div>
    </div>
  );
}
