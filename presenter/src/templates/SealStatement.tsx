"use client";

import { motion } from "framer-motion";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface SealStatementProps {
  /** Citatet före det sigillade ordet. */
  quotePre?: string;
  /** Det sigillade ordet/frasen (accent + glöd). */
  quoteSeal?: string;
  attribution?: string;
  subline?: string;
  /** Det som "säkrar det", separerat med · eller komma. */
  ingredients?: string;
  ingredientsLabel?: string;
  /** Text i sigillets mitt. */
  sealLabel?: string;
  accent?: string;
  background?: string;
}

const TICKS = Array.from({ length: 48 }, (_, i) => i);

/**
 * Ett citat med ett premium certifierings-sigill. Det sigillade ordet glöder;
 * sigillet (roterande ring, tick-markeringar, orbiterande ljuspunkt, ✓ i
 * mitten) stämplas in. "Det som säkrar det" som chips. För payoff-/bevis-beats
 * ("din undervisning är NPF-säkrad").
 */
export function SealStatement({
  quotePre = "Din undervisning är",
  quoteSeal = "NPF-säkrad.",
  attribution = "en elev, häromveckan",
  subline = "Det finaste betyget jag fått. Och mycket av det — tack vare AI.",
  ingredients = "stegvisa instruktioner · bildstöd · varierade uppgifter",
  ingredientsLabel = "det som säkrar det",
  sealLabel = "NPF-säkrad",
  accent = "var(--accent)",
  background,
}: SealStatementProps) {
  const ingList = ingredients.split(/[·,]/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.4rem, 4vw, 3.8rem) clamp(2.6rem, 5vw, 5rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          alignItems: "center",
          gap: "clamp(1.5rem, 3vw, 3.5rem)",
        }}
      >
        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 2vh, 1.6rem)" }}>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 4vw, 4.2rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--text)", margin: 0 }}
          >
            <span style={{ color: accent, opacity: 0.6 }}>”</span>
            {quotePre}{" "}
            <span style={{ color: accent, textShadow: `0 0 36px ${withAlpha(accent, 0.55)}` }}>{quoteSeal}</span>
            <span style={{ color: accent, opacity: 0.6 }}>”</span>
          </motion.h2>

          {attribution ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.74rem, 0.95vw, 0.95rem)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              — {attribution}
            </motion.div>
          ) : null}

          {subline ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem, 1.3vw, 1.35rem)", color: "var(--text-muted)", lineHeight: 1.4, maxWidth: "26em" }}>
              {subline}
            </motion.div>
          ) : null}

          {ingList.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.3rem" }}>
              {ingredientsLabel ? (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.64rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)" }}>{ingredientsLabel}</div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {ingList.map((tag, i) => (
                  <span key={i} data-tag style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.76rem, 0.92vw, 0.92rem)", fontWeight: 600, color: "var(--text)", padding: "0.32rem 0.85rem", borderRadius: "999px", background: withAlpha(accent, 0.14), border: `1px solid ${withAlpha(accent, 0.4)}` }}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Sigillet */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <motion.div
            initial={{ opacity: 0, scale: 1.28, rotate: -7 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 13, delay: 0.35 }}
            style={{ position: "relative", width: "clamp(15rem, 25vw, 23rem)", aspectRatio: "1 / 1" }}
          >
            {/* ringar + ticks. data-glow sitter på cirkeln själv, inte på <svg>:n:
                filter ärvs inte, så filter:none på föräldern lämnar barnets
                drop-shadow kvar. Opacitetspulsen står kvar — stämpeln andas. */}
            <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
              <motion.circle data-glow cx="100" cy="100" r="92" fill="none" stroke={accent} strokeWidth="1.4" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ filter: `drop-shadow(0 0 10px ${withAlpha(accent, 0.6)})` }} />
              <circle cx="100" cy="100" r="62" fill="none" stroke={withAlpha(accent, 0.3)} strokeWidth="1" />
              {TICKS.map((i) => {
                const a = (i / TICKS.length) * Math.PI * 2;
                const r1 = i % 4 === 0 ? 78 : 82;
                const x1 = 100 + r1 * Math.cos(a), y1 = 100 + r1 * Math.sin(a);
                const x2 = 100 + 88 * Math.cos(a), y2 = 100 + 88 * Math.sin(a);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={withAlpha(accent, i % 4 === 0 ? 0.7 : 0.3)} strokeWidth={i % 4 === 0 ? 1.4 : 0.8} />;
              })}
            </svg>

            {/* orbiterande ljuspunkt — rent dekorativ, släcks av ambient-accent
                på det ljusa joelsai-pappret; mörka teman behåller den. */}
            <motion.div
              aria-hidden
              className="ambient-accent"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 0 }}
            >
              <div style={{ position: "absolute", top: "1%", left: "50%", transform: "translate(-50%, -50%)", width: "0.7rem", height: "0.7rem", borderRadius: "50%", background: "#fff", boxShadow: `0 0 14px 4px ${withAlpha("#ffffff", 0.9)}, 0 0 24px 8px ${withAlpha(accent, 0.85)}` }} />
            </motion.div>

            {/* mitten — glas + ✓ + label. data-glow släcker 40 px-halon och den
                inset:ade vita ljuslinjen på kobolt; data-seal-core är kroken
                för temats egen kant-/bakgrundsregel. */}
            <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                data-glow
                data-seal-core
                style={{
                  width: "58%",
                  height: "58%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 38% 32%, ${withAlpha("#ffffff", 0.1)}, ${withAlpha(accent, 0.1)} 70%)`,
                  border: `1.5px solid ${withAlpha(accent, 0.5)}`,
                  backdropFilter: "blur(14px) saturate(160%)",
                  WebkitBackdropFilter: "blur(14px) saturate(160%)",
                  boxShadow: `inset 0 1px 0 ${withAlpha("#ffffff", 0.25)}, 0 0 40px ${withAlpha(accent, 0.3)}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <svg data-glow width="34%" height="34%" viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 8px ${withAlpha(accent, 0.8)})` }}>
                  <path d="M4 12.5l5 5L20 6.5" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.6rem, 0.9vw, 0.86rem)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color: "var(--text)", textAlign: "center" }}>
                  {sealLabel}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
