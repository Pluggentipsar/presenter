"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EscalationLadder ★ — N faser som TRAPPAR NER, inte fyra parallella kort.
 *
 * Byggd som ersättare till NarrativeFrames för AI-doping-sliden. Skillnaden
 * är både semantisk och teknisk:
 *
 * - Semantiskt: AI-doping är en ESKALERING (Ersättning → Beroende →
 *   Konsekvenser), inte tre likvärdiga alternativ. NarrativeFrames radar upp
 *   parallella narrativ på samma höjd; här sjunker varje fas nedåt och blir
 *   mörkare — formen bär "det smyger sig på, eleven märker inte gränserna".
 * - Tekniskt: NarrativeFrames hårdkodar mörka kort (rgba(20,17,14,…)) och
 *   ljus-på-mörk-text, så på ett ljust tema (dagsljus) blir korten
 *   svarta och de inaktiva nästan osynliga. Den här konsumerar tema-tokens
 *   (--bg-surface, --text, --accent, --accent-alert) och fungerar i både
 *   ljust och mörkt tema.
 *
 * Varje steg ligger lägre än det förra och tintas djupare. En severity-mätare
 * (●○○ → ●●○ → ●●●) visar eskaleringen kvantitativt. Steget märkt `★ ` är
 * landningen och får alert-accenten — det är där skadan blottläggs.
 *
 * Stega framåt: steg 0 visar alla som svaga konturer, sedan tänds en fas per
 * klick. Publiken ser hela trappan från början och känner fallet komma.
 *
 * MDX-format (samma som NarrativeFrames — drop-in):
 * ```mdx
 * <EscalationLadder chapter="§ Mot AI · AI-doping" title="AI-doping i tre faser"
 *   subtitle="Det smyger sig på." hint="Få elever stannar i fas 1.">
 * - Ersättning · AI tar över delar av tankearbetet — men eleven känner att hen "skrev" det.
 * - Beroende · "Jag kan inte börja utan att fråga AI:n först."
 * - ★ Konsekvenser · Tänkandet blir AI:ns prestation — inte elevens lärande.
 * </EscalationLadder>
 * ```
 */

interface EscalationLadderProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Rad som fälls in när sista steget är nått. */
  hint?: string;
  accent?: string;
  /** Valfri bakgrundsbild/-video-frame. Utan denna används slide-base. */
  background?: string;
  /** Overlay-täthet 0–1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** "dark" (svart wash) eller "light" (vit wash). Default dark. */
  overlayMode?: "dark" | "light";
  children?: ReactNode;
}

interface Phase {
  name: string;
  description: string;
  primary: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parsePhases(children: ReactNode): Phase[] {
  const out: Phase[] = [];
  const add = (raw: string) => {
    let working = raw.trim();
    if (!working) return;
    let primary = false;
    if (working.startsWith("★")) {
      primary = true;
      working = working.replace(/^★\s*/, "");
    }
    const idx = working.indexOf("·");
    if (idx > -1) {
      out.push({
        name: working.slice(0, idx).trim().replace(/\*\*/g, ""),
        description: working.slice(idx + 1).trim(),
        primary,
      });
    } else {
      out.push({ name: working.replace(/\*\*/g, ""), description: "", primary });
    }
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/** Severity-mätare: fyllda pips av totala, fler ju längre ner i trappan. */
function SeverityPips({
  filled,
  total,
  color,
  on,
}: {
  filled: number;
  total: number;
  color: string;
  on: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", gap: "0.3rem" }} aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: "clamp(0.5rem, 0.75vw, 0.7rem)",
            height: "clamp(0.5rem, 0.75vw, 0.7rem)",
            borderRadius: "999px",
            background:
              on && i < filled
                ? color
                : "color-mix(in srgb, var(--text) 15%, transparent)",
            boxShadow:
              on && i < filled
                ? `0 0 8px ${withAlpha(color, 0.6)}`
                : "none",
            transition: "background 0.4s ease, box-shadow 0.4s ease",
          }}
        />
      ))}
    </span>
  );
}

export function EscalationLadder({
  chapter,
  title,
  subtitle,
  hint,
  accent = "var(--accent)",
  background,
  overlay,
  overlayMode = "dark",
  children,
}: EscalationLadderProps) {
  const phases = parsePhases(children);
  const totalSteps = phases.length + 1;
  const step = useSlideSteps(totalSteps);
  const activeIndex = step - 1; // -1 = inget tänt än
  const allLit = step >= phases.length;

  if (phases.length === 0) return null;

  const alert = "var(--accent-alert)";

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: buildBackgroundCss(background, overlay, overlayMode),
        padding: "clamp(2rem, 4.5vh, 3.4rem) clamp(2.5rem, 5vw, 5rem)",
      }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.2vh, 2.6rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(2rem, 4vw, 3.6rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.03,
            color: "var(--text)",
            maxWidth: "22ch",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>
      ) : null}

      {subtitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            margin: "clamp(0.5rem, 1vh, 0.8rem) 0 0",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
            color: "var(--text-muted)",
            maxWidth: "48ch",
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {subtitle}
          </EditableText>
        </motion.p>
      ) : null}

      {/* Trappan */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(0.5rem, 1.3vh, 1rem)",
          marginTop: "clamp(0.8rem, 2vh, 1.4rem)",
        }}
      >
        {phases.map((phase, i) => {
          const lit = activeIndex >= i;
          const isCurrent = activeIndex === i;
          const isAlert = phase.primary;
          const stepColor = isAlert ? alert : accent;
          // Varje steg dras in en aning och tintas djupare — fallet nedåt.
          const indent = i * 6; // procent
          const tint = 4 + i * 4; // % accent i bakgrunden
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: lit ? 1 : 0.28,
                y: 0,
                marginLeft: `${indent}%`,
              }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: "clamp(0.9rem, 2vw, 1.6rem)",
                width: `${100 - indent}%`,
                padding:
                  "clamp(0.7rem, 1.6vh, 1.15rem) clamp(1.1rem, 2vw, 1.6rem)",
                borderRadius: "var(--radius, 0.75rem)",
                borderLeft: `4px solid ${
                  lit
                    ? stepColor
                    : "color-mix(in srgb, var(--text) 22%, transparent)"
                }`,
                background: lit
                  ? `color-mix(in srgb, ${stepColor} ${tint}%, var(--bg-surface, var(--bg)))`
                  : "color-mix(in srgb, var(--text) 3%, transparent)",
                boxShadow: isCurrent
                  ? `0 ${14 + i * 6}px ${40 + i * 10}px -22px ${withAlpha(
                      stepColor,
                      0.55,
                    )}`
                  : "none",
                transition:
                  "background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
              }}
            >
              {/* Nummer */}
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(1.6rem, 3vw, 2.8rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: lit ? stepColor : "var(--text-muted)",
                  minWidth: "1.6em",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Namn + beskrivning */}
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)",
                    fontSize: "clamp(1.25rem, 2.2vw, 2rem)",
                    letterSpacing: "var(--heading-tracking)",
                    lineHeight: 1.1,
                    color: lit ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {phase.name}
                </span>
                {phase.description ? (
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.2rem",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.82rem, 1.15vw, 1.12rem)",
                      lineHeight: 1.4,
                      color: lit
                        ? "color-mix(in srgb, var(--text) 78%, transparent)"
                        : "var(--text-muted)",
                    }}
                  >
                    {phase.description}
                  </span>
                ) : null}
              </span>

              {/* Severity-mätare */}
              <SeverityPips
                filled={i + 1}
                total={phases.length}
                color={stepColor}
                on={lit}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Hint */}
      <div style={{ minHeight: "clamp(1.6rem, 4vh, 2.6rem)" }}>
        {hint && allLit ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              marginTop: "clamp(0.5rem, 1.2vh, 0.9rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            <EditableText path="hint" value={hint}>
              {hint}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
