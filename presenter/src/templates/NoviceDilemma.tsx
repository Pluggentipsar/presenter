"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface NoviceDilemmaProps {
  chapter?: string;
  title?: string;
  leftLabel?: string;
  leftOutput?: string;
  rightLabel?: string;
  rightOutput?: string;
  middleLabel?: string;
  background?: string;
  accent?: string;
  overlay?: number;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * NoviceDilemma — visualiserar att AI förstärker existerande kompetens.
 *
 * Layout: två karaktärer (novis vänster, expert höger), AI i mitten.
 * Från AI:n går två pilar ut — men output ser olika ut:
 *   - Novis får en enkel klump (cirkel) med "SVAR"
 *   - Expert får en förgrenad struktur med "SVAR + FÖRSTÅELSE"
 *
 * Asymmetrin växer in animerat så publiken SER ojämlikheten uppstå.
 */
export function NoviceDilemma({
  chapter,
  title = "Vem gynnas av AI?",
  leftLabel = "Novis",
  leftOutput = "Plausibelt svar",
  rightLabel = "Expert",
  rightOutput = "Granskat + vidareutvecklat",
  middleLabel = "AI",
  background,
  accent = "var(--accent)",
  overlay = 0.6,
}: NoviceDilemmaProps) {
  // Färger. Novisspalten är slidens ämne — den måste vara läsbar på projektor.
  // var(--text-muted) följer registret i stället för en fast ljusgrå som blir
  // 1,7:1 mot ett ljust papper.
  const dullColor = "var(--text-muted)";
  const vibrantColor = accent;

  // Är en foto/URL-bakgrund satt? Då ligger en mörk scrim ovanpå och text
  // måste vara fast ljus. Annars följer slide:n temat (ljust eller mörkt).
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const primaryText = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const textShadow = hasPhotoBg ? "0 6px 30px rgba(0,0,0,0.5)" : "none";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 2rem)",
        }}
      >
        {/* Titel */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 3.4vw, 3rem)",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: primaryText,
              margin: 0,
              textAlign: "center",
              textShadow,
              flexShrink: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Main visualization */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "clamp(1rem, 2vw, 2rem)",
            minHeight: 0,
            position: "relative",
          }}
        >
          {/* VÄNSTER: Novice */}
          <ColumnCharacter
            label={leftLabel}
            output={leftOutput}
            color={dullColor}
            side="left"
            delay={0.5}
            isRich={false}
            accent={accent}
            mutedText={mutedText}
            primaryText={primaryText}
            textShadow={textShadow}
          />

          {/* MITTEN: AI */}
          <motion.div
            data-card
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.6rem",
              padding: "1.2rem 1.4rem",
              // Följer temats geometri. data-card tvingar 0 på brutalist-teman.
              borderRadius: "var(--radius)",
              background: hasPhotoBg ? "rgba(20, 18, 15, 0.65)" : "var(--bg-elevated)",
              backdropFilter: "blur(16px) saturate(140%)",
              WebkitBackdropFilter: "blur(16px) saturate(140%)",
              border: `2px solid ${withAlpha(accent, 0.44)}`,
              // Djupskugga, inget accent-sken — sken är dekoration.
              boxShadow: "0 18px 40px -12px rgba(0,0,0,0.5)",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* AI-glyph — pulserar */}
            <motion.div
              data-glow
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.06, 1],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "clamp(2rem, 3vw, 2.8rem)",
                color: accent,
                textShadow: `0 0 20px ${withAlpha(accent, 0.67)}`,
              }}
            >
              ✦
            </motion.div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
              }}
            >
              {middleLabel}
            </div>
          </motion.div>

          {/* HÖGER: Expert */}
          <ColumnCharacter
            label={rightLabel}
            output={rightOutput}
            color={vibrantColor}
            side="right"
            delay={0.8}
            isRich={true}
            accent={accent}
            mutedText={mutedText}
            primaryText={primaryText}
            textShadow={textShadow}
          />

          {/* Pilar från AI till karaktärerna */}
          <Arrows accent={accent} dullColor={dullColor} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Column: en karaktär med label + output-visualisering
// ============================================================================

interface ColumnCharacterProps {
  label: string;
  output: string;
  color: string;
  side: "left" | "right";
  delay: number;
  isRich: boolean;
  accent: string;
  mutedText: string;
  primaryText: string;
  textShadow: string;
}

function ColumnCharacter({
  label,
  output,
  color,
  delay,
  isRich,
  accent,
  mutedText,
  primaryText,
  textShadow,
}: ColumnCharacterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(0.7rem, 1.4vh, 1rem)",
        minHeight: 0,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.8rem, 1vw, 1rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      {/* Output-visualisering */}
      <div
        style={{
          position: "relative",
          width: "clamp(180px, 20vw, 280px)",
          height: "clamp(180px, 20vw, 280px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRich ? (
          <RichOutput color={color} delay={delay + 1.2} accent={accent} />
        ) : (
          <SimpleOutput color={color} delay={delay + 1.2} />
        )}
      </div>

      {/* Output-beskrivning */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "normal",
          fontWeight: 600,
          fontSize: "clamp(1.15rem, 1.6vw, 1.7rem)",
          color: isRich ? primaryText : mutedText,
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "18em",
          textShadow,
        }}
      >
        {output}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Simple output — en klump. Novice får denna.
// ============================================================================

function SimpleOutput({ color, delay }: { color: string; delay: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <motion.circle
        cx="100"
        cy="100"
        r="55"
        fill={color}
        opacity="0.2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx="100"
        cy="100"
        r="40"
        fill={color}
        opacity="0.4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx="100"
        cy="100"
        r="25"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: delay + 0.2, ease: [0.22, 1.1, 0.36, 1] }}
      />
      <motion.text
        x="100"
        y="108"
        textAnchor="middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.6 }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontWeight: 700,
          // Punchas ut mot den innersta cirkeln, som nu bär var(--text-muted).
          // Samma lösning som RichOutput gör mot accent-noden.
          fill: "var(--bg)",
        }}
      >
        SVAR
      </motion.text>
    </svg>
  );
}

// ============================================================================
// Rich output — förgrenad struktur. Expert får denna.
// ============================================================================

function RichOutput({
  color,
  delay,
  accent,
}: {
  color: string;
  delay: number;
  accent: string;
}) {
  // Hårdkodad konstellation av noder — liknar en "neural-blommig"-struktur
  const nodes = [
    { x: 100, y: 100, r: 20, label: "SVAR", isCentral: true, delay: 0 },
    { x: 60, y: 60, r: 9, delay: 0.2 },
    { x: 60, y: 140, r: 9, delay: 0.35 },
    { x: 140, y: 60, r: 9, delay: 0.5 },
    { x: 140, y: 140, r: 9, delay: 0.65 },
    { x: 35, y: 100, r: 7, delay: 0.8 },
    { x: 165, y: 100, r: 7, delay: 0.95 },
    { x: 100, y: 40, r: 8, delay: 1.1 },
    { x: 100, y: 160, r: 8, delay: 1.25 },
    { x: 40, y: 35, r: 5, delay: 1.4 },
    { x: 160, y: 35, r: 5, delay: 1.55 },
    { x: 40, y: 165, r: 5, delay: 1.7 },
    { x: 160, y: 165, r: 5, delay: 1.85 },
  ];

  // Linjer mellan centrum och förgreningar
  const lines = nodes
    .filter((n) => !n.isCentral)
    .map((n, i) => ({
      x1: 100,
      y1: 100,
      x2: n.x,
      y2: n.y,
      delay: n.delay,
      idx: i,
    }));

  // data-glow släcker drop-shadow:en på brutalist-teman, där accent-sken är
  // dekoration och därmed förbjudet. Glas-teman behåller sitt sken.
  return (
    <svg
      viewBox="0 0 200 200"
      data-glow
      style={{
        width: "100%",
        height: "100%",
        filter: `drop-shadow(0 0 16px ${withAlpha(accent, 0.4)})`,
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Linjer (förgreningar) */}
      {lines.map((line, i) => (
        <motion.line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={color}
          strokeWidth="1.5"
          opacity="0.6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 0.5, delay: delay + line.delay, ease: "easeOut" }}
        />
      ))}

      {/* Noder */}
      {nodes.map((node, i) => (
        <motion.circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={{
            duration: 0.5,
            delay: delay + node.delay + 0.1,
            ease: [0.22, 1.2, 0.36, 1],
          }}
        />
      ))}

      {/* Central label */}
      <motion.text
        x="100"
        y="104"
        textAnchor="middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.4 }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          // Punchas ut mot accent-noden: ljus på nattglas, mörk på dagsljus.
          fill: "var(--bg)",
        }}
      >
        SVAR
      </motion.text>

      {/* Pulserande glow runt centrum */}
      <motion.circle
        cx="100"
        cy="100"
        r="26"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
        animate={{
          r: [26, 34, 26],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 3,
          delay: delay + 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}

// ============================================================================
// Arrows från AI till båda sidor
// ============================================================================

function Arrows({ accent, dullColor }: { accent: string; dullColor: string }) {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
      preserveAspectRatio="none"
      viewBox="0 0 1000 400"
    >
      {/* Pil till vänster (novice) — tunn, grå */}
      <motion.path
        d="M 460 200 Q 370 200 270 220"
        stroke={dullColor}
        strokeWidth="2"
        strokeDasharray="4 6"
        fill="none"
        opacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
      />
      {/* Pil till höger (expert) — tjockare, accent */}
      <motion.path
        d="M 540 200 Q 640 200 740 200"
        stroke={accent}
        strokeWidth="3"
        fill="none"
        opacity="0.7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 1.5, ease: "easeOut" }}
      />
      {/* Pilhuvud höger */}
      <motion.polygon
        points="740,194 755,200 740,206"
        fill={accent}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.3, delay: 2.6 }}
      />
    </svg>
  );
}
