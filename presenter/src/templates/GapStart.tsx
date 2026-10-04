"use client";

import { motion } from "framer-motion";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface GapStartProps {
  lead?: string;
  heroA?: string;
  heroB?: string;
  markerLabel?: string;
  accent?: string;
  background?: string;
}

function piecePath(cx: number, cy: number, s: number): string {
  const h = s / 2;
  const k = s * 0.17;
  const kb = s * 0.26;
  const L = cx - h, R = cx + h, T = cy - h, B = cy + h;
  return [
    `M ${L} ${T}`,
    `L ${R} ${T}`,
    `L ${R} ${cy - k}`,
    `C ${R + kb} ${cy - k} ${R + kb} ${cy + k} ${R} ${cy + k}`,
    `L ${R} ${B}`,
    `L ${L} ${B}`,
    `L ${L} ${cy + k}`,
    `C ${L + kb} ${cy + k} ${L + kb} ${cy - k} ${L} ${cy - k}`,
    "Z",
  ].join(" ");
}

// Fält över hela ytan (viewBox 0 0 320 180), gap mitt-höger.
const GAP_X = 214, GAP_Y = 88, GAP_S = 46;
const COLS = [26, 72, 118, 164, 210, 256, 302];
const ROWS = [22, 66, 110, 154];
const FIELD = COLS.flatMap((x) => ROWS.map((y) => ({ x, y }))).filter(
  (p) => Math.hypot(p.x - GAP_X, p.y - GAP_Y) > 48,
);

/**
 * Landning: "Du måste inte använda AI. Men vet du var du inte räcker till —
 * då vet du var du ska börja." Ett fält av svaga pusselbitar täcker hela ytan;
 * EN lucka glöder som en ljuskälla (callback till AiPusselbit), märkt "Börja
 * här". Texten ligger i ren yta till vänster. Hela bilden är helheten — en
 * glödande punkt är startpunkten.
 */
export function GapStart({
  lead = "Du måste inte använda AI.",
  heroA = "Men vet du var du inte räcker till —",
  heroB = "då vet du var du ska börja.",
  markerLabel = "Börja här",
  accent = "var(--accent)",
  background,
}: GapStartProps) {
  const gapPath = piecePath(GAP_X, GAP_Y, GAP_S);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} orbs={false} />

      {/* Pusselfält över hela ytan */}
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      >
        <defs>
          <radialGradient id="gs-glow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={withAlpha(accent, 0.6)} />
            <stop offset="50%" stopColor={withAlpha(accent, 0.2)} />
            <stop offset="100%" stopColor={withAlpha(accent, 0)} />
          </radialGradient>
        </defs>

        {/* svaga bitar — dimmare åt vänster (där texten ligger) */}
        {FIELD.map((p, i) => {
          const op = 0.04 + Math.max(0, (p.x - 90) / 320) * 0.1;
          return <path key={i} d={piecePath(p.x, p.y, 36)} fill="none" stroke={withAlpha("var(--text)", op)} strokeWidth="0.7" />;
        })}

        {/* Ljus ur luckan */}
        <motion.circle cx={GAP_X} cy={GAP_Y} r="58" fill="url(#gs-glow2)" animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />

        {/* Hål-kant — luminös */}
        <motion.path
          d={gapPath}
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: `drop-shadow(0 0 7px ${withAlpha(accent, 0.9)})` }}
        />

        {/* Locator + kärna */}
        <motion.circle cx={GAP_X} cy={GAP_Y} fill="none" stroke={accent} strokeWidth="1" animate={{ r: [5, 30], opacity: [0.85, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />
        <circle cx={GAP_X} cy={GAP_Y} r="4" fill="#fff" style={{ filter: `drop-shadow(0 0 11px ${withAlpha(accent, 1)})` }} />
        <text x={GAP_X} y={GAP_Y + 32} textAnchor="middle" fill="var(--text)" style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {markerLabel}
        </text>
      </svg>

      {/* Tema-driven gradient vänster för text-kontrast (mörk på mörka teman, ljus på ljusa) */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(90deg, var(--bg, #06070c) 12%, rgba(var(--ambient-overlay, 6,7,12),0.6) 38%, transparent 60%)", pointerEvents: "none" }} />

      {/* Text */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", padding: "clamp(2.4rem, 4vw, 4rem) clamp(2.6rem, 5vw, 5rem)" }}>
        <div style={{ maxWidth: "min(46%, 34rem)", display: "flex", flexDirection: "column", gap: "clamp(1rem, 2vh, 1.6rem)" }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(1.05rem, 1.5vw, 1.6rem)", color: "var(--text-muted)" }}
          >
            {lead}
          </motion.div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 3.8vw, 3.8rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.06, color: "var(--text)", margin: 0 }}>
            <motion.span initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              {heroA}{" "}
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              style={{ color: accent, textShadow: `0 0 28px ${withAlpha(accent, 0.5)}` }}
            >
              {heroB}
            </motion.span>
          </h2>
        </div>
      </div>
    </div>
  );
}
