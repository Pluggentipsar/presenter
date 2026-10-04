"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * BreathingFrame — uttalande inramat av en "box breathing"-kvadrat som andas:
 * fyrkanten skalar in → håll → ut → håll, och en glödande punkt vandrar runt
 * perimetern (en sida per fas) medan fasetiketterna sitter på sidorna. För
 * "om det känns jobbigt — andas i en fyrkant". Texten lever i mitten.
 *
 * ```mdx
 * <BreathingFrame chapter="§ Inramning" text="Möjligheter på **inandning**. Utmaningar på **utandning**." />
 * ```
 */

interface BreathingFrameProps {
  chapter?: string;
  /** Uttalandet i mitten. Stödjer **fet** (→ accent). */
  text?: string;
  /** Fyra fasetiketter (topp, höger, botten, vänster). */
  phases?: string;
  /** Sekunder per fas. Default 4 (16 s totalt varv). */
  phaseSeconds?: number;
  accent?: string;
  background?: string;
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <span key={i} style={{ color: accent, fontWeight: 700 }}>{part.slice(2, -2)}</span>
      : <span key={i}>{part}</span>,
  );
}

export function BreathingFrame({
  chapter,
  text = "",
  phases = "Andas in · Håll · Andas ut · Håll",
  phaseSeconds = 4,
  accent = "var(--accent)",
  background,
}: BreathingFrameProps) {
  const cycle = phaseSeconds * 4;
  const label = phases.split(/\s*·\s*/).map((p) => p.trim());
  // En bild-bakgrund får en mörk scrim för läsbarhet → texten i mitten blir då fast ljus.
  const hasPhotoScrim = !!background && (background.startsWith("/") || background.startsWith("http"));
  const bg = background
    ? (hasPhotoScrim
        ? `linear-gradient(rgba(10,9,8,0.7), rgba(10,9,8,0.82)), url('${background}') center/cover no-repeat`
        : background)
    : "var(--slide-base, var(--bg))";
  // Mitt-texten följer temat (mörk på ljust tema) — utom när den ligger på en mörk foto-scrim.
  const statementColor = hasPhotoScrim ? "rgba(245,246,250,0.92)" : "var(--text)";
  // Dämpade etiketter följer temat, men på en mörk foto-scrim blir de fast ljus-dämpade.
  const mutedColor = hasPhotoScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  const sideLabel: CSSProperties = {
    position: "absolute",
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: mutedColor,
    whiteSpace: "nowrap",
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <div className="relative flex h-full w-full flex-col items-center justify-center" style={{ padding: "clamp(2rem, 4vw, 4rem)", gap: "clamp(1.5rem, 3vh, 2.5rem)", zIndex: 2 }}>
        {chapter ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)", letterSpacing: "0.3em", textTransform: "uppercase", color: mutedColor }}
          >
            {chapter}
          </motion.div>
        ) : null}

        {/* Andnings-kvadrat */}
        <div style={{ position: "relative", width: "clamp(17rem, 40vh, 26rem)", height: "clamp(17rem, 40vh, 26rem)" }}>
          {/* Fasetiketter på sidorna */}
          {label[0] ? <div style={{ ...sideLabel, top: "-1.6rem", left: "50%", transform: "translateX(-50%)" }}>{label[0]}</div> : null}
          {label[1] ? <div style={{ ...sideLabel, top: "50%", right: "-1rem", transform: "translate(100%, -50%)" }}>{label[1]}</div> : null}
          {label[2] ? <div style={{ ...sideLabel, bottom: "-1.6rem", left: "50%", transform: "translateX(-50%)" }}>{label[2]}</div> : null}
          {label[3] ? <div style={{ ...sideLabel, top: "50%", left: "-1rem", transform: "translate(-100%, -50%)" }}>{label[3]}</div> : null}

          {/* Den andande ramen */}
          <motion.div
            initial={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: [1, 1.06, 1.06, 1, 1], opacity: [0.85, 1, 1, 0.85, 0.85] }}
            transition={{ duration: cycle, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut", repeat: Infinity }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "var(--radius)",
              border: `1.5px solid ${withAlpha(accent, 0.55)}`,
              boxShadow: `0 0 40px ${withAlpha(accent, 0.18)}, inset 0 0 40px ${withAlpha(accent, 0.08)}`,
            }}
          >
            {/* Vandrande punkt runt perimetern */}
            <motion.div
              initial={{ left: "0%", top: "0%" }}
              animate={{ left: ["0%", "100%", "100%", "0%", "0%"], top: ["0%", "0%", "100%", "100%", "0%"] }}
              transition={{ duration: cycle, times: [0, 0.25, 0.5, 0.75, 1], ease: "linear", repeat: Infinity }}
              style={{
                position: "absolute",
                width: "0.9rem",
                height: "0.9rem",
                borderRadius: "999px",
                background: accent,
                boxShadow: `0 0 16px ${accent}, 0 0 6px ${accent}`,
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Texten i mitten */}
            {text ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(1.5rem, 3vw, 2.5rem)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(1.3rem, 2.3vw, 2.1rem)", lineHeight: 1.25, letterSpacing: "-0.01em", color: statementColor, textAlign: "center" }}>
                  {renderInline(text, accent)}
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
