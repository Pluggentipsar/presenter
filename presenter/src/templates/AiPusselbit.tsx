"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface AiPusselbitProps {
  /** Liten mono-kicker över rubriken. */
  kicker?: string;
  /** Stor rubrik (display). */
  title?: string;
  /** Stödmening under rubriken. */
  body?: string;
  /** Italik-tagline som tonar in när biten slottar i. Sätt "" för att dölja. */
  tagline?: string;
  /** Text inuti pusselbiten. Default "AI". */
  pieceLabel?: string;
  /** Accentfärg. Default tema-accent. */
  accent?: string;
  /** Valfri fotobakgrund att refraktera glaset mot. */
  background?: string;
}

/**
 * Bygger en pusselbit-path centrerad i (cx,cy) med storlek s.
 * Tab (utbuktning) på höger kant, socket (urtag) på vänster kant — klassisk
 * pusselbit. Hålet i "tavlan" och den inflygande biten använder samma path,
 * så biten slottar exakt.
 */
function piecePath(cx: number, cy: number, s: number): string {
  const h = s / 2;
  const k = s * 0.17; // knopp halv-höjd
  const kb = s * 0.26; // knopp utbuktning
  const L = cx - h;
  const R = cx + h;
  const T = cy - h;
  const B = cy + h;
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

/**
 * AI som pusselbiten som saknas. En frostad glas-"tavla" (helheten / klassen /
 * målet) har ett pusselbit-format hål — luckan, "var du inte räcker till". På
 * nästa steg flyger en AI-märkt glasbit in och slottar i hålet → bilden blir
 * hel, med en glow-puls. Symboliserar det kompensatoriska uppdraget: AI som
 * det som täpper luckan.
 *
 * Stegsystem: steg 0 = luckan glöder (tom). Steg 1 = AI-biten slottar i.
 */
export function AiPusselbit({
  kicker = "Det kompensatoriska uppdraget",
  title = "Skolans kompensatoriska uppdrag",
  body = "Att uppväga skillnader i elevernas förutsättningar.",
  tagline = "AI kan vara biten som saknas.",
  pieceLabel = "AI",
  accent = "var(--accent)",
  background,
}: AiPusselbitProps) {
  const step = useSlideSteps(2);
  const filled = step >= 1;

  const HOLE_X = 120;
  const HOLE_Y = 90;
  const PIECE = 52;
  const path = piecePath(HOLE_X, HOLE_Y, PIECE);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.4rem, 4vw, 4rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.92fr) minmax(0, 1.08fr)",
          alignItems: "center",
          gap: "clamp(1.5rem, 3vw, 3rem)",
        }}
      >
        {/* VÄNSTER — text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.9rem, 1.6vh, 1.4rem)",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.92rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : null}

          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.2rem, 3.6vw, 3.4rem)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                lineHeight: 1.04,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </motion.h2>
          ) : null}

          {body ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.1rem, 1.5vw, 1.5rem)",
                fontWeight: 400,
                lineHeight: 1.35,
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "20em",
              }}
            >
              {body}
            </motion.p>
          ) : null}

          {tagline ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: filled ? 1 : 0, y: filled ? 0 : 8 }}
              transition={{ duration: 0.6, delay: filled ? 0.35 : 0 }}
              style={{
                marginTop: "0.4rem",
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
                color: "var(--text)",
                lineHeight: 1.3,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "1.7rem",
                  height: "1.7rem",
                  flexShrink: 0,
                  borderRadius: "0.4rem",
                  background: withAlpha(accent, 0.18),
                  border: `1px solid ${withAlpha(accent, 0.5)}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: accent,
                }}
              >
                {pieceLabel}
              </span>
              {tagline}
            </motion.div>
          ) : null}
        </div>

        {/* HÖGER — pussel-SVG */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="0 0 240 180"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "80vh",
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id="apb-board" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--bg-elevated, rgba(255,255,255,0.10))" />
                <stop offset="55%" stopColor="var(--bg-surface, rgba(255,255,255,0.035))" />
                <stop offset="100%" stopColor={withAlpha(accent, 0.1)} />
              </linearGradient>
              <linearGradient id="apb-piece" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={withAlpha(accent, 0.6)} />
                <stop offset="100%" stopColor={withAlpha(accent, 0.2)} />
              </linearGradient>
              <mask id="apb-hole">
                <rect x="18" y="16" width="150" height="148" rx="14" fill="white" />
                <path d={path} fill="black" />
              </mask>
            </defs>

            {/* Tavlan med hål */}
            <g mask="url(#apb-hole)">
              <rect
                x="18"
                y="16"
                width="150"
                height="148"
                rx="14"
                fill="url(#apb-board)"
                stroke={withAlpha(accent, 0.22)}
                strokeWidth="0.75"
              />
              <line x1="68" y1="16" x2="68" y2="164" stroke={withAlpha(accent, 0.12)} strokeWidth="0.6" />
              <line x1="118" y1="16" x2="118" y2="164" stroke={withAlpha(accent, 0.12)} strokeWidth="0.6" />
              <line x1="18" y1="65" x2="168" y2="65" stroke={withAlpha(accent, 0.12)} strokeWidth="0.6" />
              <line x1="18" y1="115" x2="168" y2="115" stroke={withAlpha(accent, 0.12)} strokeWidth="0.6" />
            </g>

            {/* Hål-kanten — luckan glöder tills den fylls */}
            <motion.path
              d={path}
              fill="none"
              stroke={accent}
              strokeWidth="1.4"
              animate={{ opacity: filled ? 0 : [0.35, 0.9, 0.35] }}
              transition={
                filled
                  ? { duration: 0.4 }
                  : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
              style={{ filter: `drop-shadow(0 0 6px ${withAlpha(accent, 0.7)})` }}
            />

            {/* Lock-in-puls */}
            <motion.circle
              cx={HOLE_X}
              cy={HOLE_Y}
              fill="none"
              stroke={accent}
              strokeWidth="1.4"
              initial={{ r: 26, opacity: 0 }}
              animate={filled ? { r: [26, 58], opacity: [0.7, 0] } : { r: 26, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />

            {/* AI-biten — flyger in och slottar i hålet */}
            <motion.g
              initial={{ opacity: 0, x: 70, y: -8 }}
              animate={filled ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: 70, y: -8 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <path
                d={path}
                fill="url(#apb-piece)"
                stroke={accent}
                strokeWidth="1.6"
                style={{ filter: `drop-shadow(0 6px 18px ${withAlpha(accent, 0.35)})` }}
              />
              <text
                x={HOLE_X}
                y={HOLE_Y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text)"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {pieceLabel}
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
}
