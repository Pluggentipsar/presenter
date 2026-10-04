"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * TwinOutput — samma motor, två utfall.
 *
 * Dramaturgin bär hela poängen: de två svaren kommer fram **samtidigt, med
 * exakt samma animation och exakt samma färg**. Publiken kan inte se vilket
 * som är sant. Först på nästa klick faller etiketterna — och det ena visar
 * sig vara påhitt.
 *
 * Det är den enda ärliga bilden av hallucinationer: inte ett litet separat
 * fel vid sidan om, utan samma grundmekanism som producerar de korrekta
 * svaren.
 *
 * Etiketten på påhittet är den enda röda ytan i bilden — en blottläggning
 * enligt alert-disciplinen, inte en generell accent.
 *
 * ```mdx
 * <TwinOutput
 *   chapter="§ 1 · Oraklet"
 *   kicker="Samma motor"
 *   engineLabel="Språkmodellen"
 *   question="Vem var Sveriges statsminister 1994?"
 *   leftText="Carl Bildt fram till oktober, då Ingvar Carlsson tillträdde efter valet."
 *   leftLabel="Korrekt och användbart"
 *   rightText="Ingvar Carlsson, som efterträdde Olof Palme direkt efter mordet 1986."
 *   rightLabel="Övertygande påhitt"
 *   bottomLine="Fakta och hallucinationer produceras av **samma grundmekanism**."
 * />
 * ```
 */

interface TwinOutputProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Etikett på motorn i mitten. */
  engineLabel?: string;
  /** Frågan som ställdes — visas ovanför motorn. */
  question?: string;
  /** Vänstra svaret. */
  leftText?: string;
  /** Vänstra etiketten — faller först på steg 2. */
  leftLabel?: string;
  /** Högra svaret. */
  rightText?: string;
  /** Högra etiketten — blottläggningen, faller samtidigt som den vänstra. */
  rightLabel?: string;
  /** Payoffen. `**fet**` blir accent. */
  bottomLine?: string;
  /** Sätts av withSlideBg när sliden har en egen bakgrund — då ritas ingen vinjett. */
  background?: string;
  /**
   * Källrad eller märkning längst ned — t.ex. att exemplet är konstruerat
   * eller en rekonstruktion. Briefen kräver att sådant märks synligt.
   */
  footnote?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

interface OutputCardProps {
  text: string;
  label?: string;
  labelled: boolean;
  isAlert: boolean;
  reduceMotion: boolean;
  side: "left" | "right";
}

function OutputCard({
  text,
  label,
  labelled,
  isAlert,
  reduceMotion,
  side,
}: OutputCardProps) {
  const labelColor = isAlert ? "var(--accent-alert)" : "var(--accent)";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.6rem, 1.4vh, 1rem)",
        minWidth: 0,
      }}
    >
      {/* Kortet — identiskt på båda sidor tills etiketten faller */}
      <motion.div
        data-card
        initial={
          reduceMotion
            ? false
            : { opacity: 0, y: 20, x: side === "left" ? 14 : -14 }
        }
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.75, ease: EASE }}
        style={{
          padding: "clamp(1.1rem, 2vw, 1.8rem)",
          background: "var(--bg-elevated)",
          border: `1px solid ${
            labelled
              ? `color-mix(in srgb, ${labelColor} 55%, transparent)`
              : "color-mix(in srgb, var(--text) 10%, transparent)"
          }`,
          borderRadius: "var(--radius)",
          boxShadow: labelled
            ? `0 24px 60px -35px color-mix(in srgb, ${labelColor} 45%, transparent)`
            : "0 24px 60px -40px color-mix(in srgb, var(--text) 30%, transparent)",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.92rem, 1.25vw, 1.2rem)",
          lineHeight: 1.5,
          color: "var(--text)",
          transition: reduceMotion ? "none" : "border-color 0.6s, box-shadow 0.6s",
        }}
      >
        {text}
      </motion.div>

      {/* Etiketten — avslöjandet */}
      {label ? (
        <motion.div
          initial={false}
          animate={{
            opacity: labelled ? 1 : 0,
            y: labelled ? 0 : -8,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.55em",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.82vw, 0.82rem)",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: labelColor,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "block",
              width: "1.6rem",
              height: "2px",
              background: labelColor,
            }}
          />
          {label}
        </motion.div>
      ) : null}
    </div>
  );
}

export function TwinOutput({
  chapter,
  kicker,
  engineLabel = "Samma modell",
  question,
  leftText,
  leftLabel,
  rightText,
  rightLabel,
  bottomLine,
  footnote,
  background,
}: TwinOutputProps) {
  const reduceMotion = useReducedMotion() ?? false;

  // 0: bara motorn · 1: båda svaren samtidigt · 2: etiketterna · 3: payoffen
  const step = useSlideSteps(bottomLine ? 4 : 3);
  const answersOut = step >= 1;
  const labelled = step >= 2;
  const payoff = step >= 3;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Vinjetten — rent dekorativ, släcks av temat på papper. Ritas ALDRIG
          när sliden har en egen bakgrund: lagret är opakt och skalets regel
          når bara mallens rot, inte ett barnbarn. */}
      {background ? null : (
      <div
        aria-hidden
        className="ambient-accent"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 50% 20%, var(--bg-surface) 0%, var(--bg) 72%)",
        }}
      />
      )}
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              marginBottom: "clamp(1.2rem, 3vh, 2.2rem)",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ————— Frågan ————— */}
        {question ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.15 }}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.78rem, 1.05vw, 1.05rem)",
              color: "var(--text-muted)",
              marginBottom: "clamp(0.8rem, 1.8vh, 1.3rem)",
            }}
          >
            <EditableText path="question" value={question}>
              {`”${question}”`}
            </EditableText>
          </motion.div>
        ) : null}

        {/* ————— Motorn ————— */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "clamp(3.4rem, 6vw, 5rem)",
              height: "clamp(3.4rem, 6vw, 5rem)",
            }}
          >
            <motion.span
              className="ambient-accent"
              initial={{ opacity: 0.5, scale: 1 }}
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.5, 0.95, 0.5], scale: [1, 1.12, 1] }
              }
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: "-30%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
              }}
            />
            <motion.span
              initial={{ rotate: 0 }}
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border:
                  "1.5px dashed color-mix(in srgb, var(--accent) 60%, transparent)",
              }}
            />
            <span
              data-glow
              style={{
                position: "absolute",
                inset: "26%",
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 26px var(--accent-glow)",
              }}
            />
          </div>
          {engineLabel ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="engineLabel" value={engineLabel}>
                {engineLabel}
              </EditableText>
            </span>
          ) : null}
        </motion.div>

        {/* ————— Grenarna ————— */}
        <svg
          aria-hidden
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "clamp(1.6rem, 4vh, 3rem)",
            marginTop: "0.4rem",
          }}
        >
          {[22, 78].map((endX, i) => (
            <motion.path
              key={i}
              d={`M 50 0 C 50 12, ${endX} 8, ${endX} 20`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="3 3"
              initial={false}
              animate={{
                pathLength: answersOut ? 1 : 0,
                opacity: answersOut ? 0.5 : 0,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
            />
          ))}
        </svg>

        {/* ————— De två utfallen ————— */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.2rem, 3vw, 3rem)",
            alignItems: "start",
          }}
        >
          {answersOut && leftText ? (
            <OutputCard
              text={leftText}
              label={leftLabel}
              labelled={labelled}
              isAlert={false}
              reduceMotion={reduceMotion}
              side="left"
            />
          ) : (
            <div />
          )}
          {answersOut && rightText ? (
            <OutputCard
              text={rightText}
              label={rightLabel}
              labelled={labelled}
              isAlert
              reduceMotion={reduceMotion}
              side="right"
            />
          ) : (
            <div />
          )}
        </div>

        {/* ————— Payoffen ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: payoff ? 1 : 0, y: payoff ? 0 : 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, ease: EASE }}
            style={{
              marginTop: "clamp(1.4rem, 3.5vh, 2.4rem)",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.3rem)",
              borderTop: "2px solid var(--accent)",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
              lineHeight: 1.35,
              color: "var(--text)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {renderInline(bottomLine)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* ————— Märkning ————— */}
        {footnote ? (
          <motion.div
            initial={false}
            animate={{ opacity: labelled ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.2 }}
            style={{
              marginTop: "clamp(0.7rem, 1.6vh, 1.1rem)",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.58rem, 0.76vw, 0.76rem)",
              letterSpacing: "0.14em",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="footnote" value={footnote}>
              {footnote}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
