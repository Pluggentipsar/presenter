"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import {
  AmbientBackdrop,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";

interface JagAIJagCirclesProps {
  projector?: boolean;
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Tagline under cirklarna (default: "Du formar AI och AI formar dig"). */
  tagline?: string;
  /** Label för första Jag-cirkeln. Default "Jag". */
  firstLabel?: string;
  /** Underrubrik för första cirkeln. */
  firstSubtitle?: string;
  /** Frågorna för första cirkeln (komma-separerade eller barnstring). */
  firstQuestions?: string;
  /** Label för AI-cirkeln. */
  middleLabel?: string;
  /** Underrubrik för AI-cirkeln. */
  middleSubtitle?: string;
  /** Frågorna för AI-cirkeln. */
  middleQuestions?: string;
  /** Label för tredje Jag-cirkeln. */
  lastLabel?: string;
  /** Underrubrik för sista cirkeln. */
  lastSubtitle?: string;
  /** Frågorna för sista cirkeln. */
  lastQuestions?: string;
}

/**
 * JagAIJagCircles — Joels signaturmodell visualiserad.
 *
 * Tre cirklar i serie:
 *   JAG (du tänker) → AI (med avsikt) → JAG (du värderar)
 *
 * Designad som ett *boksida-diagram*, inte ett app-flöde. Sirkliga former
 * med tunn ornament-ring, serif-text, generösa luftrum. Cirklarna pulserar
 * subtilt så att förståelsen "Du formar AI och AI formar dig" är inbyggd
 * i visuellt språk innan Joel säger det.
 *
 * Tema-agnostisk — använder var(--accent) för Jag-cirklarna (värme,
 * mänsklighet) och en cirkulär dim-ton för AI-cirkeln (mellanstationen).
 *
 * Designad för det MEST VIKTIGA slidet i en föreläsning.
 */
export function JagAIJagCircles({
  projector = false,
  kicker,
  chapter,
  tagline = "Du formar AI med dina frågor. AI formar dig med sina svar.",
  firstLabel = "Jag",
  firstSubtitle = "Vad tänker jag redan?",
  firstQuestions = "Vad vet jag? · Vad vill jag förstå? · Är AI rätt verktyg?",
  middleLabel = "AI",
  middleSubtitle = "Med avsikt.",
  middleQuestions = "Vad ber jag om? · Ska den utmana eller hålla med? · Vilken roll ger jag den?",
  lastLabel = "Jag",
  lastSubtitle = "Vad tar jag ansvar för?",
  lastQuestions = "Är svaret rimligt? · Vad ändrar jag? · Kan jag förklara det utan AI?",
}: JagAIJagCirclesProps) {
  const step = useSlideSteps(projector ? 3 : 1);
  const stages = [
    {
      label: firstLabel,
      subtitle: firstSubtitle,
      questions: firstQuestions,
      type: "self" as const,
      labelPath: "firstLabel",
      subtitlePath: "firstSubtitle",
      questionsPath: "firstQuestions",
    },
    {
      label: middleLabel,
      subtitle: middleSubtitle,
      questions: middleQuestions,
      type: "ai" as const,
      labelPath: "middleLabel",
      subtitlePath: "middleSubtitle",
      questionsPath: "middleQuestions",
    },
    {
      label: lastLabel,
      subtitle: lastSubtitle,
      questions: lastQuestions,
      type: "self" as const,
      labelPath: "lastLabel",
      subtitlePath: "lastSubtitle",
      questionsPath: "lastQuestions",
    },
  ];

  if (projector) return <section className="projection-loop" data-projection-scene="loop" data-phase={step}>
    <header><span className="projection-caption">{kicker}</span><h2>{chapter}</h2></header>
    <div className="projection-loop-layout"><div className="projection-loop-circles">{stages.map((stage, i) => <div key={i} data-active={step === i}><span>{stage.label}</span>{i < 2 && <b aria-hidden>→</b>}</div>)}</div>
    <article key={step}><h3>{stages[step].subtitle}</h3><ul>{stages[step].questions.split("·").map(q => <li key={q}>{q.trim()}</li>)}</ul></article></div>
    <footer>{tagline}</footer>
  </section>;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop accent2="#9D7AFF" overlay={0.5} />

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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Decorative ornament-line under kicker */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.0, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 7rem)",
          width: "3rem",
          height: "1px",
          background: "var(--accent)",
          transformOrigin: "left",
          zIndex: 3,
        }}
      />

      {/* Centrerad cirkel-rad */}
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(1rem, 2.5vw, 2.5rem)",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
          }}
        >
          {stages.map((stage, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(1rem, 2.5vw, 2.5rem)",
                flex: i === 1 ? "0 0 auto" : "1",
                justifyContent: i === 1 ? "center" : i === 0 ? "flex-end" : "flex-start",
              }}
            >
              {/* Stage-cirkel */}
              <StageCircle
                stage={stage}
                delay={0.5 + i * 0.7}
                isLast={i === stages.length - 1}
              />

              {/* Pil mellan cirklar */}
              {i < stages.length - 1 ? (
                <FlowArrow delay={0.9 + i * 0.7} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Tagline längst ner */}
      {tagline ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.6 }}
          style={{
            position: "absolute",
            bottom: "clamp(3rem, 6vh, 5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--room-body, clamp(1.05rem, 1.5vw, 1.4rem))",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "36em",
            letterSpacing: "0.005em",
            zIndex: 3,
          }}
        >
          <EditableText path="tagline" value={tagline}>
            {tagline}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}

interface Stage {
  label: string;
  subtitle: string;
  questions: string;
  type: "self" | "ai";
  labelPath: string;
  subtitlePath: string;
  questionsPath: string;
}

interface StageCircleProps {
  stage: Stage;
  delay: number;
  isLast: boolean;
}

function StageCircle({ stage, delay, isLast }: StageCircleProps) {
  const isAI = stage.type === "ai";
  const questions = stage.questions.split("·").map((q) => q.trim()).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(1rem, 2vh, 1.8rem)",
        flex: "0 0 auto",
      }}
    >
      {/* Cirkeln själv — frosted glass */}
      <div data-card="round"
        style={{
          position: "relative",
          width: "clamp(11rem, 18vw, 17rem)",
          height: "clamp(11rem, 18vw, 17rem)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: isAI
            ? "var(--glass-card-bg, radial-gradient(circle at 30% 25%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 50%, var(--glass-tint, rgba(122,168,255,0.04)) 100%))"
            : `var(--jaj-self-bg, radial-gradient(circle at 30% 25%, ${withAlpha("var(--accent)", 0.28)} 0%, ${withAlpha("var(--accent)", 0.12)} 55%, ${withAlpha("var(--accent)", 0.04)} 100%))`,
          backdropFilter: "blur(20px) saturate(170%) brightness(110%)",
          WebkitBackdropFilter: "blur(20px) saturate(170%) brightness(110%)",
          border: isAI
            ? "1px solid var(--glass-border, color-mix(in srgb, var(--text) 16%, transparent))"
            : "1.5px solid var(--accent)",
          boxShadow: isAI
            ? "var(--glass-card-shadow, 0 16px 48px -10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 24px rgba(0,0,0,0.25))"
            : `0 16px 56px -10px var(--accent-glow), 0 0 80px -20px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -10px 24px rgba(0,0,0,0.2)`,
          overflow: "hidden",
        }}
      >
        {/* Specular highlight — diagonal ljus från topp-vänster */}
        <div className="ambient-accent"
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "radial-gradient(ellipse at 25% 15%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 35%)",
            pointerEvents: "none",
          }}
        />
        {/* Slow-drifting glint som rör sig över cirkeln */}
        <motion.div
          className="ambient-accent"
          aria-hidden
          initial={{ rotate: -40, opacity: 0 }}
          animate={{ rotate: 320, opacity: [0, 0.18, 0.18, 0] }}
          transition={{
            duration: 14,
            delay: delay + 1.2,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "linear",
            times: [0, 0.15, 0.85, 1],
          }}
          style={{
            position: "absolute",
            inset: "-30%",
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 320deg, rgba(255,255,255,0.45) 350deg, transparent 360deg)",
            pointerEvents: "none",
          }}
        />
        {/* Kontinuerligt pulsande ring runt cirkeln */}
        <motion.div
          className="ambient-accent"
          aria-hidden
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.45, 0], scale: [1, 1.12, 1.18] }}
          transition={{
            duration: 3.4,
            delay: delay + 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: "-0.6rem",
            borderRadius: "50%",
            border: isAI
              ? "1px solid color-mix(in srgb, var(--text) 20%, transparent)"
              : "1px solid var(--accent)",
            pointerEvents: "none",
          }}
        />
        {/* Andra puls-ring med offset för en mer organisk känsla */}
        <motion.div
          className="ambient-accent"
          aria-hidden
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0, 0.3, 0], scale: [1, 1.2, 1.32] }}
          transition={{
            duration: 4.6,
            delay: delay + 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: "-0.6rem",
            borderRadius: "50%",
            border: isAI
              ? "1px solid color-mix(in srgb, var(--text) 16%, transparent)"
              : "1px solid var(--accent)",
            pointerEvents: "none",
          }}
        />

        {/* Label inuti cirkeln */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2.4rem, 4.2vw, 4rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: isAI ? "var(--text)" : "var(--accent)",
            textShadow: isAI
              ? "none"
              : "0 0 32px var(--accent-glow), 0 0 12px var(--accent)",
          }}
        >
          <EditableText path={stage.labelPath} value={stage.label}>
            {stage.label}
          </EditableText>
        </div>

        {/* Subtitle inuti cirkeln */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "var(--room-body, clamp(0.95rem, 1.2vw, 1.25rem))",
            color: "var(--text-muted)",
            marginTop: "clamp(0.3rem, 0.6vh, 0.5rem)",
            textAlign: "center",
            maxWidth: "12em",
            padding: "0 1rem",
            lineHeight: 1.3,
          }}
        >
          <EditableText path={stage.subtitlePath} value={stage.subtitle}>
            {stage.subtitle}
          </EditableText>
        </div>
      </div>

      {/* Frågor under cirkeln */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: delay + 0.4 }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.35rem, 0.7vh, 0.55rem)",
          alignItems: "center",
          maxWidth: "clamp(11rem, 18vw, 17rem)",
        }}
      >
        <EditableText path={stage.questionsPath} value={stage.questions} label="Frågor">
          {questions.map((q, qi) => (
            <div
              key={qi}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--room-body, clamp(0.95rem, 1.15vw, 1.2rem))",
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.35,
                letterSpacing: "0.01em",
              }}
            >
              {q}
            </div>
          ))}
        </EditableText>
      </motion.div>
    </motion.div>
  );
}

interface FlowArrowProps {
  delay: number;
}

function FlowArrow({ delay }: FlowArrowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.5 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        flex: "0 0 auto",
        marginTop: "-3rem", // align with circle center, not below questions
      }}
    >
      <svg
        width="clamp(2rem, 4vw, 3.5rem)"
        height="clamp(1.2rem, 2vh, 2rem)"
        viewBox="0 0 56 24"
        fill="none"
        style={{ overflow: "visible", color: "var(--accent)" }}
      >
        <defs>
          <filter id={`flow-glow-${delay}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Linjens "ghost" — alltid synlig svag stroke */}
        <motion.line
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.35 }}
          transition={{ duration: 0.6, delay: delay + 0.1 }}
          x1="2"
          y1="12"
          x2="48"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Pulserande över-linje */}
        <motion.line
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.95, 0.35] }}
          transition={{
            duration: 2.4,
            delay: delay + 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          x1="2"
          y1="12"
          x2="48"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          filter={`url(#flow-glow-${delay})`}
        />
        {/* Pilspets */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.7 }}
          d="M 42 6 L 52 12 L 42 18"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Två glödande sfärer som rör sig längs linjen med offset */}
        <motion.circle
          initial={{ cx: 2, opacity: 0 }}
          animate={{
            cx: [2, 48],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2.4,
            delay: delay + 1.0,
            repeat: Infinity,
            repeatDelay: 0.4,
            ease: "easeInOut",
            times: [0, 0.15, 0.85, 1],
          }}
          cy="12"
          r="2.8"
          fill="currentColor"
          filter={`url(#flow-glow-${delay})`}
        />
        <motion.circle
          initial={{ cx: 2, opacity: 0 }}
          animate={{
            cx: [2, 48],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: 2.4,
            delay: delay + 2.0,
            repeat: Infinity,
            repeatDelay: 0.4,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1],
          }}
          cy="12"
          r="1.6"
          fill="currentColor"
          filter={`url(#flow-glow-${delay})`}
        />
      </svg>
    </motion.div>
  );
}
