"use client";

import { motion } from "framer-motion";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface GapTitleProps {
  event?: string;
  title?: string;
  subtitle?: string;
  author?: string;
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

// Samma fältgeometri som GapStart (viewBox 0 0 320 180) — luckan övre höger,
// där den väntar tyst tills GapStart besvarar den i slutet av decket.
const GAP_X = 240, GAP_Y = 58, GAP_S = 42;
const COLS = [26, 72, 118, 164, 210, 256, 302];
const ROWS = [22, 66, 110, 154];
const FIELD = COLS.flatMap((x) => ROWS.map((y) => ({ x, y }))).filter(
  (p) => Math.hypot(p.x - GAP_X, p.y - GAP_Y) > 44,
);

/**
 * Titelslide i pusselfältet — bookend till GapStart. Samma fält av svaga
 * pusselbitar, men VISKANDE: EN lucka andas mjukt i accent bakom titeln,
 * utan markör, ping eller svar. Slide 1 ställer frågan ("Var startar du?"),
 * GapStart i slutet svarar ("Börja här"). Avslutande ? i titeln får accent.
 * Ord-för-ord-reveal med blur, centrerad editorial hierarki.
 */
export function GapTitle({
  event,
  title = "Var startar du?",
  subtitle,
  author,
  accent = "var(--accent)",
  background,
}: GapTitleProps) {
  const gapPath = piecePath(GAP_X, GAP_Y, GAP_S);
  const words = title.split(" ").filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} orbs={false} />

      {/* Pusselfält över hela ytan — dimmare mot mitten där texten ligger */}
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      >
        <defs>
          <radialGradient id="gt-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={withAlpha(accent, 0.5)} />
            <stop offset="50%" stopColor={withAlpha(accent, 0.16)} />
            <stop offset="100%" stopColor={withAlpha(accent, 0)} />
          </radialGradient>
        </defs>

        {FIELD.map((p, i) => {
          const d = Math.hypot(p.x - 160, p.y - 90);
          const op = 0.035 + Math.min(0.075, Math.max(0, (d - 40) / 160) * 0.075);
          return <path key={i} d={piecePath(p.x, p.y, 36)} fill="none" stroke={withAlpha(accent, op + 0.02)} strokeWidth="0.7" />;
        })}

        {/* Luckan andas — tyst, obesvarad */}
        <motion.circle cx={GAP_X} cy={GAP_Y} r="46" fill="url(#gt-glow)" animate={{ opacity: [0.3, 0.58, 0.3] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
        <motion.path
          d={gapPath}
          fill="none"
          stroke={accent}
          strokeWidth="1.3"
          animate={{ opacity: [0.32, 0.66, 0.32] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${withAlpha(accent, 0.7)})` }}
        />
      </svg>

      {/* Vinjett för text-kontrast — tonar mot temats egen bakgrund (mörk på nattglas, ljus på dagsljus) */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 62% 56% at 50% 52%, color-mix(in srgb, var(--bg) 86%, transparent) 0%, color-mix(in srgb, var(--bg) 40%, transparent) 55%, transparent 78%)", pointerEvents: "none" }} />

      {/* Centrerad titelhierarki */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(2.5rem, 5vw, 5rem)", gap: "clamp(0.9rem, 1.8vh, 1.4rem)" }}>
        {event ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)", letterSpacing: "0.34em", textTransform: "uppercase", color: accent, fontWeight: 500 }}
          >
            {event}
          </motion.div>
        ) : null}

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3.2rem, 6.8vw, 6.2rem)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.04, color: "var(--text)", margin: 0 }}>
          {words.map((w, i) => {
            const tail = w.endsWith("?") || w.endsWith("!") ? w.slice(-1) : "";
            const core = tail ? w.slice(0, -1) : w;
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, filter: "blur(7px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.75, delay: 0.4 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "inline-block", marginInlineEnd: i < words.length - 1 ? "0.26em" : 0 }}
              >
                {core}
                {tail ? (
                  <span style={{ color: accent, textShadow: `0 0 30px ${withAlpha(accent, 0.55)}` }}>{tail}</span>
                ) : null}
                {i < words.length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </h1>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 + words.length * 0.15 + 0.2 }}
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(1.05rem, 1.55vw, 1.6rem)", color: "var(--text-muted)", margin: 0, maxWidth: "32em" }}
          >
            {subtitle}
          </motion.p>
        ) : null}

        {author ? (
          <>
            <motion.div
              aria-hidden
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 + words.length * 0.15 + 0.5 }}
              style={{ width: "3.2rem", height: "1px", background: withAlpha(accent, 0.45), margin: "0.2rem 0" }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 + words.length * 0.15 + 0.65 }}
              style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.72rem, 0.92vw, 0.95rem)", letterSpacing: "0.08em", color: "var(--text-muted)" }}
            >
              {author}
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}
