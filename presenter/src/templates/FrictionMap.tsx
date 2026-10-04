"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

/**
 * FrictionMap — visualiserar AI som en automatiserande teknologi.
 *
 * Lärandeprocessen ritas som en bana med tre "friktionspunkter" (toppar):
 * Friktion · Önskvärd svårighet · Meningsfullt motstånd. Dessa är där lärandet
 * sker — det produktiva motståndet som tvingar tänkandet.
 *
 * Sen kommer AI som en gradient-våg som glider över banan från vänster.
 * Bakom vågen plattar terrängen ut. Slutligen står vi med en platt,
 * frictionless väg — och inget lärande.
 *
 * Texten landar:
 *   "AI är en automatiserande teknologi.
 *    Den tar bort friktionen.
 *    Det är friktionen vi måste designa för."
 *
 * Den visuella metaforen ÄR poängen. Animationen visar exakt det texten säger.
 */

interface FrictionMapProps {
  chapter?: string;
  accent?: string;
  background?: string;
  /** Mörk overlay (0-1). Default 0.92 — vi vill ha rymdsvart för animationen. */
  overlay?: number;
  /** Anpassa friktion-etiketterna. */
  peak1Label?: string;
  peak2Label?: string;
  peak3Label?: string;
  /** Texterna underneath. */
  hero?: string;
  bridge?: string;
  landing?: string;
}

// SVG terräng-paths — design så att tre tydliga toppar bildas.
// viewBox 1600x600 där y=500 är "marken". Toppar är medvetet sänkta
// från canvas-kanten (min y=80) så etiketterna får plats utan att kapas.
const ROUGH_PATH =
  "M 0 500 " +
  "Q 100 500 150 500 " +
  "Q 250 140 350 500 " + // Topp 1 vid (250, 140) — Friktion
  "Q 450 500 500 500 " +
  "Q 700 80 900 500 " + // Topp 2 vid (700, 80) — Önskvärd svårighet (HÖGST)
  "Q 1000 500 1080 500 " +
  "Q 1230 250 1380 500 " + // Topp 3 vid (1230, 250) — Meningsfullt motstånd
  "Q 1480 500 1600 500";

const SMOOTH_PATH = "M 0 500 L 1600 500";

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  const fallback = "var(--bg)";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(5,3,8,${a}), rgba(5,3,8,${Math.min(1, a + 0.04)})), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

export function FrictionMap({
  chapter = "§ Pedagogiskt ansvar",
  accent = "var(--accent)",
  background,
  overlay = 0.92,
  peak1Label = "Friktion",
  peak2Label = "Önskvärd svårighet",
  peak3Label = "Meningsfullt motstånd",
  hero = "AI är en *automatiserande* teknologi.",
  bridge = "Den tar bort friktionen.",
  landing = "Det är **friktionen** vi måste designa för.",
}: FrictionMapProps) {
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
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1rem, 2vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* SVG-animationen tar övre 55% */}
        <div
          style={{
            flex: "0 0 55%",
            minHeight: 0,
            position: "relative",
          }}
        >
          <FrictionAnimation
            accent={accent}
            peak1Label={peak1Label}
            peak2Label={peak2Label}
            peak3Label={peak3Label}
          />
        </div>

        {/* Text tar nedre 45% */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "clamp(0.6rem, 1.4vh, 1.2rem)",
            minHeight: 0,
          }}
        >
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 7.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.5rem, 2.6vw, 2.6rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textShadow: "0 4px 20px rgba(0,0,0,0.6)",
            }}
          >
            <EditableText path="hero" value={hero}>
              {renderInline(hero, accent)}
            </EditableText>
          </motion.div>

          {/* Bridge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 8.6 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              color: "var(--text-muted)",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="bridge" value={bridge}>
              {renderInline(bridge, accent)}
            </EditableText>
          </motion.div>

          {/* Landing */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 9.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 3.2vw, 3.4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              textShadow: "0 6px 30px rgba(0,0,0,0.6)",
              marginTop: "clamp(0.4rem, 1vh, 0.8rem)",
            }}
          >
            <EditableText path="landing" value={landing}>
              {renderInline(landing, accent)}
            </EditableText>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Animationen (SVG)
// ============================================================================

function FrictionAnimation({
  accent,
  peak1Label,
  peak2Label,
  peak3Label,
}: {
  accent: string;
  peak1Label: string;
  peak2Label: string;
  peak3Label: string;
}) {
  return (
    <svg
      viewBox="0 0 1600 600"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="aiWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="40%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>

        <linearGradient id="terrainFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>

        {/* Filter för glow på toppar */}
        <filter id="peakGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Basgrund: horisontell golvlinje (hint) */}
      <motion.line
        x1="0"
        y1="500"
        x2="1600"
        y2="500"
        stroke="var(--text-muted)"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="4 8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />

      {/* Rough terrain — fade out efter waven */}
      <motion.path
        d={ROUGH_PATH}
        stroke={accent}
        strokeWidth="3"
        fill="url(#terrainFill)"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1, 1, 1],
          opacity: [0, 1, 1, 0.05],
        }}
        transition={{
          duration: 7,
          times: [0, 0.3, 0.65, 1],
          ease: "easeInOut",
        }}
      />

      {/* Toppmarkörer + etiketter */}
      <PeakMarker x={250} y={140} label={peak1Label} accent={accent} delay={2.2} />
      <PeakMarker x={700} y={80} label={peak2Label} accent={accent} delay={2.6} highest />
      <PeakMarker x={1230} y={250} label={peak3Label} accent={accent} delay={3.0} />

      {/* AI-wave glider in från vänster */}
      <motion.g
        initial={{ x: -400 }}
        animate={{ x: 1700 }}
        transition={{ duration: 2.8, delay: 4.2, ease: "easeInOut" }}
      >
        <rect x="0" y="0" width="400" height="600" fill="url(#aiWaveGradient)" />
        {/* Skarp ledande kant */}
        <motion.line
          x1="200"
          y1="0"
          x2="200"
          y2="600"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
      </motion.g>

      {/* "AI"-etikett som följer waven */}
      <motion.text
        x="0"
        y="50"
        initial={{ opacity: 0, x: -200 }}
        animate={{ opacity: [0, 1, 1, 0], x: [-200, 1700, 1700, 1700] }}
        transition={{
          duration: 3.2,
          delay: 4.0,
          times: [0, 0.15, 0.85, 1],
          ease: "easeInOut",
        }}
        fill={accent}
        fontFamily="var(--font-mono)"
        fontSize="22"
        fontWeight="700"
        letterSpacing="0.3em"
        textAnchor="middle"
      >
        AI
      </motion.text>

      {/* Smooth terrain — fader in efter waven */}
      <motion.path
        d={SMOOTH_PATH}
        stroke="var(--text-muted)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{
          opacity: { duration: 0.6, delay: 6.4 },
          pathLength: { duration: 1.2, delay: 6.4, ease: "easeInOut" },
        }}
      />

      {/* "Tomheten"-etikett under den platta linjen */}
      <motion.text
        x="800"
        y="555"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 7.4 }}
        fill="var(--text-muted)"
        fontFamily="var(--font-mono)"
        fontSize="14"
        letterSpacing="0.3em"
        textAnchor="middle"
      >
        — INGEN FRIKTION —
      </motion.text>
    </svg>
  );
}

// ============================================================================
// Toppmarkör med etikett
// ============================================================================

function PeakMarker({
  x,
  y,
  label,
  accent,
  delay,
  highest = false,
}: {
  x: number;
  y: number;
  label: string;
  accent: string;
  delay: number;
  highest?: boolean;
}) {
  // Safety: håll etiketten minst 30px från canvas-toppen så den aldrig
  // klipps. Linjen anpassas så avståndet till etiketten alltid är vettigt.
  const fontSize = highest ? 20 : 17;
  const minLabelY = fontSize + 12; // text-baseline + lite luft
  const idealLabelY = y - 32;
  const labelY = Math.max(idealLabelY, minLabelY);
  const lineEndY = labelY + 8; // etiketten och linjen får inte kollidera

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 5,
        times: [0, 0.15, 0.7, 1],
        delay,
        ease: "easeInOut",
      }}
    >
      {/* Glödprick på toppen */}
      <motion.circle
        cx={x}
        cy={y}
        r={highest ? 6 : 5}
        fill={accent}
        filter="url(#peakGlow)"
        animate={{
          r: highest ? [6, 9, 6] : [5, 7, 5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Etikettlinje (bara om det finns plats för en) */}
      {y - lineEndY > 6 ? (
        <line
          x1={x}
          y1={y - 8}
          x2={x}
          y2={lineEndY}
          stroke={accent}
          strokeWidth="1"
          strokeOpacity="0.7"
        />
      ) : null}

      {/* Etikett */}
      <text
        x={x}
        y={labelY}
        fill="var(--text)"
        fontFamily="var(--font-display)"
        fontSize={fontSize}
        fontStyle="italic"
        fontWeight={highest ? "600" : "500"}
        textAnchor="middle"
      >
        {label}
      </text>
    </motion.g>
  );
}

// ============================================================================
// Inline markdown-rendering (**fet** + *kursiv*)
// ============================================================================

function renderInline(text: string, accentColor: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: accentColor, fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {chunk.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
