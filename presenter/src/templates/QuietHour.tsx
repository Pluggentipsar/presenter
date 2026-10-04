"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * QuietHour — klockslaget då alla andra sover.
 *
 * Tillgänglighet är svår att göra känd med ord. "Den finns alltid där" är
 * ett påstående; **02.14** är en upplevelse. Templaten gör tiden fysisk:
 * en rad fönster slocknar ett efter ett tills ett enda lyser kvar, och
 * först då landar raden.
 *
 * Fönstren är inte dekoration — de ÄR argumentet. Publiken ser hur många
 * som inte längre är nåbara, och behöver aldrig få det förklarat. Det är
 * också anledningen till att den inte får köras som stillbild: släckningen
 * måste ske medan de tittar.
 *
 * ```mdx
 * <QuietHour
 *   time="02.14"
 *   line="Ingen annan behöver väckas."
 *   windows={14}
 *   source="Fiktivt exempel"
 * />
 * ```
 *
 * **Steg:** 1) alla fönster lyser · 2) de slocknar, ett lyser kvar · 3) raden landar.
 *
 * **När välja den:** varje "ögonblicket då"-slide — sena kvällen, timmen före
 * provet, natten efter beskedet. Byt `time` och `line`. Inte för tidsserier
 * eller scheman; då är `ConsequenceTimeline` eller `ProcessBeats` ärligare.
 */

interface QuietHourProps {
  /** Klockslaget. Bär hela sliden — håll det kort. */
  time: string;
  /** Raden som landar sist. Stödjer **fet** → accent. */
  line?: string;
  /** Kickertext uppe till vänster. */
  kicker?: string;
  /** Antal fönster i raden. 10–18 är lagom. */
  windows?: number;
  /** Vilket fönster som lyser kvar (0-indexerat). Default: strax till höger om mitten. */
  litIndex?: number;
  /** Källrad nederst. */
  source?: string;
  accent?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

export function QuietHour({
  time,
  line,
  kicker,
  windows = 14,
  litIndex,
  source,
  accent = "var(--accent)",
}: QuietHourProps) {
  const step = useSlideSteps(3);
  const count = Math.max(4, Math.min(28, Math.round(windows)));
  const lit = litIndex ?? Math.floor(count * 0.62);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Nattens antydan — en mycket svag vinjett. Temat förblir ljust;
          det är rytmen och släckningen som bär, inte en mörk yta. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 42%, transparent 38%, ${withAlpha(
            "var(--text-muted)",
            0.09,
          )} 100%)`,
        }}
      />

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
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(2rem, 5vh, 3.4rem)",
          padding: "clamp(4rem, 9vh, 7rem) clamp(2.5rem, 6vw, 6rem)",
          zIndex: 2,
        }}
      >
        {/* Klockslaget */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(5rem, 15vw, 13rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            color: "var(--text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <EditableText path="time" value={time}>{time}</EditableText>
        </motion.div>

        {/* Fönsterraden — släcks vid steg 1, ett lyser kvar */}
        <div
          aria-hidden
          style={{
            display: "flex",
            gap: "clamp(0.4rem, 1vw, 0.9rem)",
            alignItems: "flex-end",
          }}
        >
          {Array.from({ length: count }).map((_, i) => {
            const stannar = i === lit;
            const slackt = step >= 1 && !stannar;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0.4 }}
                animate={{
                  opacity: slackt ? 0.12 : 1,
                  scaleY: 1,
                  backgroundColor: slackt
                    ? withAlpha("var(--text-muted)", 0.35)
                    : stannar && step >= 1
                      ? accent
                      : withAlpha("var(--text)", 0.55),
                }}
                transition={{
                  opacity: {
                    duration: 0.5,
                    // Slocknar utifrån och in, så det ena som lyser kvar
                    // blir det sista ögat märker.
                    delay: step >= 1 ? Math.abs(i - lit) * 0.075 : i * 0.03,
                    ease: EASE,
                  },
                  backgroundColor: { duration: 0.6, delay: step >= 1 ? Math.abs(i - lit) * 0.075 : 0 },
                  scaleY: { duration: 0.5, delay: i * 0.03, ease: EASE },
                }}
                style={{
                  width: "clamp(0.7rem, 1.6vw, 1.3rem)",
                  height: "clamp(1.1rem, 2.6vw, 2.1rem)",
                  borderRadius: "1px",
                  boxShadow:
                    stannar && step >= 1
                      ? `0 0 22px ${withAlpha(accent, 0.55)}`
                      : "none",
                }}
              />
            );
          })}
        </div>

        {/* Raden */}
        {step >= 2 && line ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.5rem, 2.9vw, 2.7rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "34rem",
            }}
          >
            <EditableText path="line" value={line}>
              {renderInline(line)}
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
            zIndex: 4,
          }}
        >
          <EditableText path="source" value={source}>{source}</EditableText>
        </div>
      ) : null}
    </div>
  );
}
