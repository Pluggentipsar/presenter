"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * MovingShapes — Heider & Simmel-demon. Publiken ser antropomorfismen ske
 * i sitt eget huvud innan någon förklarar den.
 *
 * 1944 visade Heider och Simmel en 2,5 minuter lång trickfilm för 34
 * försökspersoner: en stor triangel, en liten triangel, en cirkel och en
 * rektangel med en dörr. Alla utom en beskrev det de sett som en berättelse
 * om levande varelser med avsikter — jakt, rädsla, beskydd. Det är bara
 * geometri som rör sig.
 *
 * Templaten är byggd som ett *moment*, inte som en illustration. Figurerna
 * rör sig, publiken svarar högt på frågan, och först därefter kommer
 * avslöjandet. Kör man den som en stillbild med förklaring bredvid faller
 * hela poängen — då berättar man om fenomenet i stället för att utlösa det.
 *
 * ```mdx
 * <MovingShapes
 *   kicker="§ Antropomorfism"
 *   question="Vad händer?"
 *   reveal="Ni beskrev nyss avsikter. Det är tre trianglar och en cirkel."
 *   source="Heider & Simmel, American Journal of Psychology, 1944"
 * />
 * ```
 *
 * **Steg:** 1) figurerna rör sig · 2) frysbild + frågan · 3) avslöjandet.
 *
 * Lånvillkor: ställ frågan öppet och *vänta*. Momentet bärs av att salen
 * svarar "den jagar den lilla" — inte av animationen i sig.
 */

interface MovingShapesProps {
  /** Kickertext uppe till vänster. */
  kicker?: string;
  /** Frågan som ställs när rörelsen fryser. Steg 2. */
  question?: string;
  /** Avslöjandet. Steg 3. Stödjer **fet** → accent. */
  reveal?: string;
  /** Källrad nederst. */
  source?: string;
  accent?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.37, 0, 0.63, 1];
/** Ett varv i koreografin. Tillräckligt långt för att en berättelse ska hinna uppstå. */
const LOOP = 9;

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function MovingShapes({
  kicker,
  question = "Vad händer?",
  reveal,
  source,
  accent = "var(--accent)",
}: MovingShapesProps) {
  const step = useSlideSteps(3);
  const moving = step === 0;
  const frozen = step >= 1;

  /**
   * Koreografin. Fyra beats, medvetet enkla: den stora triangeln kommer ut
   * ur huset, de två små drar sig undan, cirkeln söker skydd, den stora
   * följer efter. Ingenting här "betyder" något — betydelsen uppstår i
   * betraktaren, vilket är hela demonstrationen.
   */
  const loop = moving
    ? { duration: LOOP, repeat: Infinity, ease: EASE, times: [0, 0.28, 0.55, 0.78, 1] }
    : { duration: 0.6, ease: EASE };

  const stor = moving
    ? { x: [96, 210, 268, 322, 96], y: [128, 132, 96, 150, 128], rotate: [0, 14, -8, 26, 0] }
    : { x: 322, y: 150, rotate: 26 };

  const liten = moving
    ? { x: [300, 322, 372, 404, 300], y: [188, 210, 196, 132, 188], rotate: [0, -18, 12, -30, 0] }
    : { x: 404, y: 132, rotate: -30 };

  const cirkel = moving
    ? { x: [340, 384, 420, 132, 340], y: [126, 96, 150, 130, 126] }
    : { x: 132, y: 130 };

  /** Dörren står öppen i början och på slutet, stängd när cirkeln är inne. */
  const dorr = moving
    ? { rotate: [0, -62, -62, -14, 0] }
    : { rotate: -14 };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {kicker ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
        </div>
      ) : null}

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.4rem, 3.5vh, 2.6rem)",
          padding: "clamp(4rem, 9vh, 7rem) clamp(2.5rem, 6vw, 6rem) clamp(3rem, 6vh, 4.5rem)",
        }}
      >
        {/* Scenen. Medvetet naken: ingen bakgrund, inga detaljer, inget som
            kan bära mening utom figurerna själva. */}
        <div style={{ width: "min(100%, 62rem)", position: "relative" }}>
          <svg
            viewBox="0 0 560 300"
            style={{ width: "100%", height: "auto", display: "block" }}
            aria-label="Geometriska figurer i rörelse"
          >
            {/* Huset — rektangel med gångjärnsdörr */}
            <rect
              x="72" y="78" width="132" height="116"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2.5"
              opacity="0.55"
            />
            <motion.rect
              x="72" y="150" width="4" height="44"
              fill="var(--text-muted)"
              opacity="0.75"
              style={{ originX: "72px", originY: "194px" }}
              animate={dorr}
              transition={loop}
            />

            {/* Stor triangel */}
            <motion.polygon
              points="-19,16 19,16 0,-20"
              fill={accent}
              opacity="0.92"
              animate={stor}
              transition={loop}
            />

            {/* Liten triangel */}
            <motion.polygon
              points="-12,10 12,10 0,-13"
              fill="var(--text)"
              opacity="0.8"
              animate={liten}
              transition={loop}
            />

            {/* Cirkel */}
            <motion.circle
              r="11"
              fill="var(--text)"
              opacity="0.62"
              animate={cirkel}
              transition={loop}
            />
          </svg>

          {/* Frysmarkering — signalerar att rörelsen stannat, utan text */}
          {frozen && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute",
                inset: "-2%",
                border: `1px dashed ${withAlpha("var(--text-muted)", 0.35)}`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* Frågan */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(2rem, 4vw, 3.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            <EditableText path="question" value={question}>{question}</EditableText>
          </motion.div>
        )}

        {/* Avslöjandet */}
        {step >= 2 && reveal ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.5vw, 1.4rem)",
              lineHeight: 1.45,
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "42rem",
            }}
          >
            <EditableText path="reveal" value={reveal}>
              {renderInline(reveal)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {source ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(1.6rem, 3.5vh, 2.6rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)",
            color: "var(--text-muted)",
            opacity: 0.8,
          }}
        >
          <EditableText path="source" value={source}>{source}</EditableText>
        </div>
      ) : null}
    </div>
  );
}
