"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

/**
 * NotebookLMExample — konkret skolreform-exempel på en specifik
 * NotebookLM-teknik. Designad för en serie av 6 slides där varje punkt
 * får sin egen exempel-slide.
 *
 * Layout:
 *  - Top: tip-nummer + reform-pill med färg
 *  - Center: stor titel (tipsens rubrik)
 *  - Mid: exempel-rutan (talspråklig text, fluten kropp)
 *  - Below: prompt-rutan i monospace (valfri)
 *  - Bottom: igenkänningsrutan (italic, "så här märker du det")
 *
 * Stegsystem:
 *  - Steg 0: titel + reform-pill
 *  - Steg 1: exempel-rutan in
 *  - Steg 2: prompt-rutan in (om den finns)
 *  - Steg 3 (eller 2): igenkänningsrutan in
 *
 * MDX-format:
 *
 *   <NotebookLMExample
 *     chapter="§ II · NotebookLM"
 *     tipNumber="01"
 *     reformLabel="Lgr22-revideringen"
 *     reformAccent="#B4763A"
 *     title="Källkvalitet är 80 % av output."
 *     example="Du sätter upp en notebook för lärarlagen — och dumpar in 25 källor: alla kursplaner, kommentarmaterial, gamla bloggar, Skolporten-artiklar. Resultatet blir mosig."
 *     prompt="Bättre setup: Den reviderade läroplanen som PDF · Skolverkets kommentarmaterial · Skolverkets jämförelsedokument 'Det här ändras' · Den gamla Lgr22-versionen · Ev. ett nyhetsbrev med ikraftträdandedatum."
 *     promptLabel="Bättre setup — 5 källor"
 *     recognition="Om NotebookLM börjar svara med 'enligt vissa källor… medan andra menar…' på frågor som borde ha tydligt svar — du har 25 källor som spretar."
 *     background="..."
 *   />
 */

interface NotebookLMExampleProps {
  chapter?: string;
  /** Tipsens nummer i serien, t.ex. "01", "02"… */
  tipNumber?: string;
  /** Reform-pill-text, t.ex. "Lgr22-revideringen" */
  reformLabel?: string;
  /** Accentfärg för reform-pillan + reglar (default = konjak). */
  reformAccent?: string;
  /** Stor rubrik */
  title: string;
  /** Liten subtitle under titeln, valfri */
  subtitle?: string;
  /** Den talspråkliga exempel-rutan (huvudtext) */
  example: string;
  /** Frivillig prompt eller fras (visas i monospace) */
  prompt?: string;
  /** Etikett ovanför prompt-rutan */
  promptLabel?: string;
  /** Italic igenkännings-rutan längst ner */
  recognition?: string;
  background?: string;
  overlay?: number | string;
}

const ACCENT_DEFAULT = "#B4763A";

function resolveBackground(
  bg: string | undefined,
  overlay: number | string
): string {
  if (!bg) {
    return "radial-gradient(ellipse at 50% 25%, #1a1410 0%, #0a0908 80%)";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.65;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(
      1,
      a + 0.15
    )})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/** Mini-markdown för **fet** */
function renderInline(text: string, accent: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span
          key={i}
          style={{
            color: accent,
            fontWeight: 600,
          }}
        >
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function NotebookLMExample({
  chapter,
  tipNumber,
  reformLabel,
  reformAccent = ACCENT_DEFAULT,
  title,
  subtitle,
  example,
  prompt,
  promptLabel = "Konkret prompt",
  recognition,
  background,
  overlay = 0.65,
}: NotebookLMExampleProps) {
  const totalSteps = useMemo(() => {
    let n = 1; // example
    if (prompt) n += 1;
    if (recognition) n += 1;
    return n;
  }, [prompt, recognition]);
  const step = useSlideSteps(totalSteps);

  const exampleVisible = step >= 1;
  const promptVisible = !!prompt && step >= 2;
  const recognitionVisible =
    !!recognition && (prompt ? step >= 3 : step >= 2);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Atmosfär: subtil reform-glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 55% at 50% 35%, ${reformAccent}14 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(247,241,230,0.025) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(1.75rem, 3.5vw, 3rem)",
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Centerblock */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding:
            "clamp(4rem, 8vh, 6rem) clamp(2.5rem, 5vw, 5rem) clamp(2.5rem, 4vh, 3.5rem)",
          gap: "clamp(1.25rem, 2.5vh, 2rem)",
          zIndex: 2,
          maxWidth: "min(96%, 72rem)",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Top: tip-nummer + reform-pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {tipNumber ? (
            <div
              style={{
                fontFamily: "var(--font-display, Fraunces, serif)",
                fontWeight: 600,
                fontSize: "clamp(2.2rem, 4.5vw, 4rem)",
                color: reformAccent,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                opacity: 0.85,
              }}
            >
              <EditableText path="tipNumber" value={tipNumber}>
                {tipNumber}
              </EditableText>
            </div>
          ) : (
            <div />
          )}

          {reformLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.5rem 1rem",
                border: `1.5px solid ${reformAccent}66`,
                borderRadius: "999px",
                background: `linear-gradient(180deg, ${reformAccent}1f 0%, ${reformAccent}08 100%)`,
                boxShadow: `0 0 18px ${reformAccent}33`,
              }}
            >
              <span
                style={{
                  width: "0.45rem",
                  height: "0.45rem",
                  borderRadius: "999px",
                  background: reformAccent,
                  boxShadow: `0 0 8px ${reformAccent}`,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                  fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                  fontWeight: 600,
                }}
              >
                <EditableText path="reformLabel" value={reformLabel}>
                  {reformLabel}
                </EditableText>
              </span>
            </div>
          ) : null}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontWeight: 500,
              fontSize: "clamp(1.6rem, 3vw, 2.8rem)",
              lineHeight: 1.15,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title, reformAccent)}
            </EditableText>
          </h2>
          {subtitle ? (
            <div
              style={{
                fontFamily: "var(--font-display, Fraunces, serif)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </div>
          ) : null}
        </motion.div>

        {/* Example */}
        <motion.div
          initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
          animate={
            exampleVisible
              ? { opacity: 1, x: 0, filter: "blur(0px)" }
              : { opacity: 0, x: -16, filter: "blur(4px)" }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            padding: "1rem 1.25rem 1rem 1.5rem",
            borderLeft: `3px solid ${reformAccent}`,
            background: "var(--bg-surface)",
            borderRadius: "0 0.4rem 0.4rem 0",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: reformAccent,
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Exempel
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              lineHeight: 1.5,
              color: "var(--text)",
              letterSpacing: "-0.005em",
            }}
          >
            <EditableText path="example" value={example}>
              {renderInline(example, reformAccent)}
            </EditableText>
          </div>
        </motion.div>

        {/* Prompt */}
        {prompt ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={
              promptVisible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 12 }
            }
            transition={{ duration: 0.6 }}
            style={{
              padding: "0.85rem 1.25rem 1rem",
              border: "1px dashed var(--text-muted)",
              borderRadius: "0.4rem",
              background: "var(--bg-elevated)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  width: "0.4rem",
                  height: "0.4rem",
                  borderRadius: "999px",
                  background: reformAccent,
                }}
              />
              <EditableText path="promptLabel" value={promptLabel}>
                {promptLabel}
              </EditableText>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                lineHeight: 1.55,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              <EditableText path="prompt" value={prompt}>
                {prompt}
              </EditableText>
            </div>
          </motion.div>
        ) : null}

        {/* Recognition */}
        {recognition ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={
              recognitionVisible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 12 }
            }
            transition={{ duration: 0.6 }}
            style={{
              marginTop: "auto",
              padding: "0.85rem 1.25rem",
              borderTop: "1px solid var(--text-muted)",
              borderBottom: "1px solid var(--text-muted)",
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
              lineHeight: 1.45,
              color: "var(--text-muted)",
              maxWidth: "60rem",
            }}
          >
            <span
              style={{
                fontStyle: "normal",
                fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginRight: "0.6rem",
              }}
            >
              Igenkänning
            </span>
            <EditableText path="recognition" value={recognition}>
              {recognition}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
