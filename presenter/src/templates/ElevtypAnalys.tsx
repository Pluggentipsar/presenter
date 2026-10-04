"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface ElevtypAnalysProps {
  kicker?: string;
  title?: string;
  gdprNote?: string;
  /** De fiktiva elevtyperna, separerade med || */
  elevtyper?: string;
  prompt?: string;
  /** Outputens fyra delar. */
  out1?: string;
  out2?: string;
  out3?: string;
  out4?: string;
  accent?: string;
  background?: string;
}

const OUT_LABELS = [
  "Möjliga reaktioner i elevgruppen",
  "Risker och hinder",
  "Förslag på förbättringar",
  "En förbättrad instruktion",
];

/**
 * AI som bollplank — GDPR-säkert. Ett bibliotek av FIKTIVA elevtyper (inga
 * riktiga elever) vägs mot en uppgift via en prompt; AI ger en strukturerad
 * 4-delad analys (reaktioner · risker · förbättringar · förbättrad instruktion)
 * som blommar fram på klick. Visar flödet OCH outputen.
 *
 * Stegsystem: 2 steg (0 = bibliotek + prompt, 1 = analysen revealas).
 */
export function ElevtypAnalys({
  kicker = "Lucka 6 · AI som bollplank",
  title = "Bolla uppgiften mot tio elever — noll riktiga.",
  gdprNote = "Fiktiva elevtyper · inga riktiga elever · GDPR-säkert",
  elevtyper = "",
  prompt,
  out1,
  out2,
  out3,
  out4,
  accent = "var(--accent)",
  background,
}: ElevtypAnalysProps) {
  const step = useSlideSteps(2);
  const revealed = step >= 1;
  const types = elevtyper.split("||").map((s) => s.trim()).filter(Boolean);
  const outputs = [out1, out2, out3, out4];
  const warm = "#E3A867"; // varm sekundär-accent — drar ögat till payoffen

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2rem, 3.4vw, 3.2rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.9rem, 1.6vh, 1.3rem)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)", letterSpacing: "0.32em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.3rem" }}>{kicker}</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 2.7vw, 2.6rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--text)", margin: 0 }}>{title}</h2>
          </div>
          {/* GDPR-badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.85rem", borderRadius: "999px", background: withAlpha(accent, 0.12), border: `1px solid ${withAlpha(accent, 0.45)}`, flexShrink: 0 }}>
            <svg width="1.1rem" height="1.1rem" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z" fill={withAlpha(accent, 0.2)} stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8.5 12l2.4 2.4L15.6 9.5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.6rem, 0.78vw, 0.78rem)", letterSpacing: "0.08em", color: "var(--text)", fontWeight: 600 }}>{gdprNote}</span>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 0.62fr) minmax(0, 1fr)", gap: "clamp(1rem, 2vw, 1.8rem)" }}>
          {/* VÄNSTER — biblioteket */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "clamp(0.9rem, 1.4vw, 1.3rem)", borderRadius: "1.1rem", background: "var(--bg-surface)", border: `1px solid ${withAlpha(accent, 0.25)}`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 22px 50px -24px rgba(0,0,0,0.35)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.64rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700, marginBottom: "0.7rem", flexShrink: 0 }}>
              Bibliotek · {types.length} fiktiva elevtyper
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "min-content", gap: "0.4rem 0.5rem", alignContent: "start" }}>
              {types.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
                  style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.35rem 0.5rem", borderRadius: "0.5rem", background: "var(--bg-elevated)", border: "1px solid rgba(0,0,0,0.1)" }}
                >
                  <span style={{ flexShrink: 0, width: "1.25rem", height: "1.25rem", borderRadius: "50%", background: withAlpha(accent, 0.18), color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.78rem, 0.95vw, 0.96rem)", color: "var(--text)", lineHeight: 1.2 }}>{t}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* HÖGER — prompt + output */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: "0.8rem" }}>
            {prompt ? (
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "var(--bg-surface)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.8rem", padding: "0.65rem 0.9rem", flexShrink: 0 }}>
                <span aria-hidden style={{ flexShrink: 0, width: "1.4rem", height: "1.4rem", borderRadius: "50%", background: accent, color: "rgba(245,246,250,0.95)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.55rem", fontWeight: 700, marginTop: "0.05rem" }}>DU</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.86rem, 1.02vw, 1.04rem)", lineHeight: 1.4, color: "var(--text)" }}>{prompt}</span>
              </div>
            ) : null}

            <div style={{ flex: 1, minHeight: 0 }}>
              {!revealed ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.7rem", borderRadius: "1.1rem", border: `1px dashed ${withAlpha(accent, 0.4)}`, background: withAlpha(accent, 0.04) }}>
                  <motion.span aria-hidden animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", border: `2px solid ${withAlpha(accent, 0.25)}`, borderTopColor: accent }} />
                  <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)", color: "var(--text-muted)" }}>AI väger uppgiften mot tio perspektiv …</span>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
                  style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "clamp(0.6rem, 1vw, 0.9rem)" }}
                >
                  {outputs.map((content, i) => {
                    const payoff = i === 3;
                    const ca = payoff ? warm : accent;
                    return (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                      style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minHeight: 0, padding: "clamp(0.85rem, 1.3vw, 1.2rem)", borderRadius: "0.9rem", background: payoff ? withAlpha(warm, 0.12) : "var(--bg-surface)", border: `1px solid ${payoff ? withAlpha(warm, 0.55) : "rgba(0,0,0,0.1)"}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", overflow: "hidden", boxShadow: payoff ? `0 0 32px ${withAlpha(warm, 0.18)}` : "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700, color: payoff ? "#0a0908" : "rgba(245,246,250,0.95)", background: ca, borderRadius: "0.3rem", padding: "0.1rem 0.36rem" }}>{i + 1}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.64rem, 0.82vw, 0.82rem)", letterSpacing: "0.1em", textTransform: "uppercase", color: ca, fontWeight: 700 }}>{OUT_LABELS[i]}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.84rem, 1vw, 1.04rem)", lineHeight: 1.45, color: "var(--text)", overflow: "auto", minHeight: 0 }}>{content}</div>
                    </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
