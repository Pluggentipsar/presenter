"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { EditableText } from "@/lib/inline-edit";

/**
 * PrivacyDecree — en teatralisk regel-statement-slide för känslig data
 * och GDPR-relaterade dataskyddsregler.
 *
 * Designad för att vara *poster*: ett stort dramatiskt påbud som inte
 * bara läses utan KÄNNS. Pills med förbjudna kategorier pulsar i rött,
 * en stor ALDRIG-typografi dominerar, och tumregeln avslutar med ett
 * lugnt italics-citat.
 *
 * MDX-format:
 *
 *   <PrivacyDecree
 *     chapter="§ XIII · Heads-up"
 *     headline="ALDRIG personuppgifter i öppna AI-verktyg"
 *     forbiddenText="Personnummer | Elevnamn | Diagnoser | Skyddade uppgifter"
 *     body="Använd kommunens **säkra verktyg** om de finns. Annars: **anonymisera först** — byt namn, ta bort årtal, runda siffror."
 *     tumregel="Det du inte sätter på personalrummets anslagstavla — skriver du inte i en extern AI."
 *   />
 */

interface PrivacyDecreeProps {
  chapter?: string;
  /** Stor headline. Första ordet rendras extra dramatiskt om det är versaler. */
  headline: string;
  /** Pipe-separerade förbjudna kategorier: "A | B | C | D" */
  forbiddenText?: string;
  /** Brödtext under pillorna. Stödjer **fet** för accent. */
  body?: string;
  /** Italic-citat längst ner. */
  tumregel?: string;
  background?: string;
  overlay?: number | string;
}

const RED = "#E15B4F";
const RED_GLOW = "rgba(225,91,79,0.45)";

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) {
    // Följ temat: ljust på dagsljus, mörkt på nattglas.
    return "var(--slide-base, var(--bg))";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.65;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(
      1,
      a + 0.18
    )})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * En foto-/bild-bakgrund (eller en custom mörk bakgrund som passas in) får alltid
 * en mörk scrim → texten måste då vara fast ljus oavsett tema. Utan background-prop
 * följer slidan temat och texten ska använda CSS-variabler.
 */
function isDarkBackground(bg: string | undefined): boolean {
  return Boolean(bg && (bg.startsWith("/") || bg.startsWith("http")));
}

// Fasta ljusa textfärger för element som garanterat är mörka (foto + scrim).
const FIXED_LIGHT = "rgba(245,246,250,0.92)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

/** Splittra på första-ord-i-versaler om det finns. */
function splitHeadline(text: string): { firstWord: string | null; rest: string } {
  const m = text.match(/^([A-ZÅÄÖ]{2,})\s+(.+)$/);
  if (m) return { firstWord: m[1], rest: m[2] };
  return { firstWord: null, rest: text };
}

/** Mini-markdown-rendering för **fet**. */
function renderInline(text: string, accent: string, accentGlow: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span
          key={i}
          style={{
            color: accent,
            fontWeight: 700,
            textShadow: `0 0 24px ${accentGlow}`,
          }}
        >
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function PrivacyDecree({
  chapter,
  headline,
  forbiddenText = "",
  body,
  tumregel,
  background,
  overlay = 0.65,
}: PrivacyDecreeProps) {
  const { firstWord, rest } = useMemo(() => splitHeadline(headline), [headline]);
  const darkBg = isDarkBackground(background);
  const textColor = darkBg ? FIXED_LIGHT : "var(--text)";
  const mutedColor = darkBg ? FIXED_LIGHT_MUTED : "var(--text-muted)";
  const hairline = darkBg ? "rgba(245,246,250,0.18)" : "rgba(0,0,0,0.12)";
  const forbidden = useMemo(
    () =>
      forbiddenText
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean),
    [forbiddenText]
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Atmosfär: röd pulsande glow + grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 50% 50%, rgba(225,91,79,0.16) 0%, transparent 65%),
            radial-gradient(ellipse 40% 30% at 50% 0%, rgba(225,91,79,0.18) 0%, transparent 60%)
          `,
          pointerEvents: "none",
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(225,91,79,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: darkBg
            ? "radial-gradient(circle, rgba(247,241,230,0.025) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
      {/* Diagonal varnings-streck över hörnen */}
      <CornerHazard top left />
      <CornerHazard top right />
      <CornerHazard bottom left />
      <CornerHazard bottom right />

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(1.75rem, 3.5vh, 3rem)",
            left: "clamp(1.75rem, 3.5vw, 3rem)",
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Centerblock */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(5rem, 10vh, 8rem) clamp(2rem, 4vw, 5rem)",
          gap: "clamp(1.75rem, 3.5vh, 3rem)",
          zIndex: 2,
        }}
      >
        {/* Förbjudna pills — appears first */}
        {forbidden.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "clamp(0.5rem, 1.2vw, 1rem)",
              maxWidth: "60rem",
            }}
          >
            {forbidden.map((label, i) => (
              <ForbiddenPill key={i} label={label} index={i} darkBg={darkBg} />
            ))}
          </div>
        ) : null}

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.2 + forbidden.length * 0.08 + 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            textAlign: "center",
            maxWidth: "44rem",
            position: "relative",
          }}
        >
          {firstWord ? (
            <motion.div
              initial={{ opacity: 0, scale: 1.4, letterSpacing: "0.4em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "-0.02em" }}
              transition={{
                duration: 1.0,
                delay: 0.2 + forbidden.length * 0.08 + 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                fontFamily: "var(--font-display, Fraunces, serif)",
                fontWeight: 800,
                fontSize: "clamp(3rem, 7vw, 6rem)",
                lineHeight: 0.95,
                color: RED,
                textShadow: `0 0 50px ${RED_GLOW}, 0 0 100px ${RED_GLOW}`,
                marginBottom: "0.4rem",
                letterSpacing: "-0.02em",
              }}
            >
              {firstWord}
            </motion.div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontWeight: 500,
              fontSize: firstWord
                ? "clamp(1.5rem, 2.6vw, 2.4rem)"
                : "clamp(2rem, 4vw, 3.6rem)",
              lineHeight: 1.15,
              color: textColor,
              letterSpacing: "-0.015em",
              textShadow: darkBg ? "0 4px 30px rgba(0,0,0,0.6)" : "none",
            }}
          >
            <EditableText path="headline" value={headline}>
              {firstWord ? rest : headline}
            </EditableText>
          </div>
        </motion.div>

        {/* Body */}
        {body ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.2 + forbidden.length * 0.08 + 1.4,
            }}
            style={{
              fontFamily: "var(--font-body, Inter, system-ui, sans-serif)",
              fontSize: "clamp(0.95rem, 1.35vw, 1.3rem)",
              lineHeight: 1.55,
              color: textColor,
              textAlign: "center",
              maxWidth: "44rem",
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="body" value={body}>
              {renderInline(
                body,
                darkBg ? "#F7E1A4" : "var(--accent)",
                darkBg ? "rgba(247,225,164,0.4)" : "var(--accent-glow)"
              )}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Tumregel */}
        {tumregel ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.2 + forbidden.length * 0.08 + 2.0,
            }}
            style={{
              position: "relative",
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
              color: mutedColor,
              textAlign: "center",
              maxWidth: "44rem",
              lineHeight: 1.4,
              padding: "1.1rem 1.5rem",
              borderTop: `1px solid ${hairline}`,
              borderBottom: `1px solid ${hairline}`,
            }}
          >
            <EditableText path="tumregel" value={tumregel}>
              {tumregel}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

function ForbiddenPill({
  label,
  index,
  darkBg,
}: {
  label: string;
  index: number;
  darkBg: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.85 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.55,
        delay: 0.35 + index * 0.09,
        ease: [0.22, 1.3, 0.36, 1],
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "clamp(0.45rem, 0.9vh, 0.65rem) clamp(0.85rem, 1.6vw, 1.3rem)",
        background:
          "linear-gradient(180deg, rgba(225,91,79,0.16) 0%, rgba(225,91,79,0.06) 100%)",
        border: `1.5px solid ${RED}88`,
        borderRadius: "999px",
        boxShadow: `0 0 22px ${RED_GLOW}, inset 0 0 0 1px ${RED}33`,
      }}
    >
      <motion.span
        aria-hidden
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.85, 1, 0.85],
        }}
        transition={{
          duration: 2.4,
          delay: index * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          width: "0.55rem",
          height: "0.55rem",
          borderRadius: "999px",
          background: RED,
          boxShadow: `0 0 12px ${RED}, 0 0 4px ${RED}`,
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display, Fraunces, serif)",
          fontWeight: 600,
          fontSize: "clamp(0.8rem, 1.05vw, 1.05rem)",
          color: darkBg ? FIXED_LIGHT : "var(--text)",
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function CornerHazard({
  top,
  bottom,
  left,
  right,
}: {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}) {
  // En liten diagonal-strip i hörnet — som varnings-tejp
  const pos: React.CSSProperties = {};
  if (top) pos.top = "1rem";
  if (bottom) pos.bottom = "1rem";
  if (left) pos.left = "1rem";
  if (right) pos.right = "1rem";

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.45 }}
      transition={{ duration: 1.2, delay: 0.6 }}
      style={{
        position: "absolute",
        ...pos,
        width: "clamp(2.5rem, 5vw, 4rem)",
        height: "clamp(2.5rem, 5vw, 4rem)",
        backgroundImage: `repeating-linear-gradient(45deg, ${RED}cc 0 6px, transparent 6px 14px)`,
        opacity: 0.45,
        pointerEvents: "none",
        maskImage: `linear-gradient(${
          top && left
            ? "135deg"
            : top && right
            ? "225deg"
            : bottom && left
            ? "45deg"
            : "315deg"
        }, black 0%, transparent 70%)`,
        WebkitMaskImage: `linear-gradient(${
          top && left
            ? "135deg"
            : top && right
            ? "225deg"
            : bottom && left
            ? "45deg"
            : "315deg"
        }, black 0%, transparent 70%)`,
      }}
    />
  );
}
