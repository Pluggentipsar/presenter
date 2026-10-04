"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * ThreeLayerTeaching — kapitelavslutet som gör metaperspektivet synligt.
 *
 * Tre horisontella lager avtäcks ett i taget: vad ELEVEN behöver veta, vad
 * LÄRAREN behöver förstå, och HUR det kan undervisas. På sista klicket ritas
 * en lodrät accent-linje ner genom de tre siffrorna — de blir noder på samma
 * tråd, och lagren går till full opacitet. Det är hela poängen med bilden:
 * kunskap, förståelse och undervisning är inte tre ämnen utan ett.
 *
 * Byggd som återkommande kapitelkort — samma form varje gång gör att publiken
 * känner igen rörelsen och slipper läsa om strukturen.
 *
 * Enbart tema-tokens; fungerar symmetriskt på ljusa och mörka teman.
 *
 * ```mdx
 * <ThreeLayerTeaching
 *   chapter="§ 1 · Oraklet"
 *   kicker="Kapitelkortet"
 *   student="AI kan låta säker utan att veta."
 *   teacher="Språkmodellen producerar rimliga fortsättningar ur mönster, inte kontrollerade sanningar."
 *   teaching="Låt eleverna hitta något de vet bättre än AI — och bevisa det."
 * />
 * ```
 */

interface ThreeLayerTeachingProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Etikett för lager 1. */
  studentLabel?: string;
  /** Kärnmeningen eleven ska kunna använda direkt. */
  student?: string;
  /** Etikett för lager 2. */
  teacherLabel?: string;
  /** Den djupare förklaringen läraren behöver bära. */
  teacher?: string;
  /** Etikett för lager 3. */
  teachingLabel?: string;
  /** Den konkreta undervisningsrörelsen. */
  teaching?: string;
  /**
   * Valfri slutrad som visas tillsammans med den sammanbindande linjen.
   * Utan den blir sista steget bara linjen — ofta starkast.
   */
  bottomLine?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** **fet** → accent, *kursiv* → em. */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
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

interface Layer {
  label: string;
  text: string;
  path: string;
}

export function ThreeLayerTeaching({
  chapter,
  kicker = "Kapitelkortet",
  studentLabel = "Eleven behöver veta",
  student,
  teacherLabel = "Läraren behöver förstå",
  teacher,
  teachingLabel = "Så kan du undervisa",
  teaching,
  bottomLine,
}: ThreeLayerTeachingProps) {
  const reduceMotion = useReducedMotion() ?? false;

  const layers: Layer[] = [
    { label: studentLabel, text: student ?? "", path: "student" },
    { label: teacherLabel, text: teacher ?? "", path: "teacher" },
    { label: teachingLabel, text: teaching ?? "", path: "teaching" },
  ].filter((l) => l.text.length > 0);

  // Ett steg per lager + ett avslutande steg för den sammanbindande linjen.
  const step = useSlideSteps(layers.length + 1);
  const connected = step >= layers.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 8%, var(--bg-surface) 0%, var(--bg) 68%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2.5rem, 5vw, 5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.1 }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              marginBottom: "clamp(1.8rem, 4vh, 3rem)",
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
          </motion.div>
        ) : null}

        {/* ————— De tre lagren ————— */}
        <div style={{ position: "relative" }}>
          {/* Den sammanbindande tråden — ritas på sista steget.
              Ligger bakom siffrorna och binder ihop dem till noder. */}
          <motion.span
            aria-hidden
            initial={false}
            animate={{
              scaleY: connected ? 1 : 0,
              opacity: connected ? 1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.9,
              ease: EASE,
            }}
            style={{
              position: "absolute",
              left: "calc(clamp(1.5rem, 2.2vw, 2.2rem) / 2)",
              top: "1.4em",
              bottom: "1.4em",
              width: "2px",
              marginLeft: "-1px",
              background: "var(--accent)",
              boxShadow: "0 0 18px var(--accent-glow)",
              transformOrigin: "top",
              zIndex: 0,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1.1rem, 2.6vh, 2rem)",
            }}
          >
            {layers.map((layer, i) => {
              const shown = step >= i;
              const isNode = connected;
              return (
                <motion.div
                  key={layer.path}
                  initial={false}
                  animate={{
                    opacity: shown ? (connected ? 1 : i === step ? 1 : 0.42) : 0,
                    y: shown ? 0 : 16,
                  }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.6,
                    ease: EASE,
                  }}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns:
                      "clamp(1.5rem, 2.2vw, 2.2rem) minmax(0, 1fr)",
                    columnGap: "clamp(1.1rem, 2vw, 1.9rem)",
                    alignItems: "start",
                    zIndex: 1,
                  }}
                >
                  {/* Nod / siffra */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      paddingTop: "0.15em",
                    }}
                  >
                    <motion.span
                      initial={false}
                      animate={{
                        scale: isNode ? 1 : 0.92,
                      }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.5,
                        ease: EASE,
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "clamp(1.5rem, 2.2vw, 2.2rem)",
                        height: "clamp(1.5rem, 2.2vw, 2.2rem)",
                        borderRadius: "50%",
                        border: `1.5px solid ${
                          isNode
                            ? "var(--accent)"
                            : "color-mix(in srgb, var(--text) 22%, transparent)"
                        }`,
                        background: isNode
                          ? "var(--accent)"
                          : "var(--bg)",
                        color: isNode ? "var(--bg)" : "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.6rem, 0.8vw, 0.78rem)",
                        fontWeight: 700,
                        boxShadow: isNode
                          ? "0 0 22px var(--accent-glow)"
                          : "none",
                        transition: reduceMotion
                          ? "none"
                          : "background 0.5s, border-color 0.5s, color 0.5s, box-shadow 0.5s",
                      }}
                    >
                      {i + 1}
                    </motion.span>
                  </div>

                  {/* Etikett + mening */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.6rem, 0.78vw, 0.78rem)",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        color: "var(--accent)",
                        marginBottom: "clamp(0.3rem, 0.7vh, 0.5rem)",
                      }}
                    >
                      <EditableText
                        path={`${layer.path}Label`}
                        value={layer.label}
                      >
                        {layer.label}
                      </EditableText>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                        fontSize: "clamp(1.1rem, 1.85vw, 1.8rem)",
                        lineHeight: 1.3,
                        letterSpacing: "-0.015em",
                        color: "var(--text)",
                      }}
                    >
                      <EditableText path={layer.path} value={layer.text}>
                        {renderInline(layer.text)}
                      </EditableText>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ————— Slutrad ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: connected ? 1 : 0,
              y: connected ? 0 : 10,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              delay: reduceMotion ? 0 : 0.35,
              ease: EASE,
            }}
            style={{
              marginTop: "clamp(1.6rem, 3.5vh, 2.6rem)",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.3rem)",
              borderTop: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
              lineHeight: 1.45,
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {renderInline(bottomLine)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
