"use client";

import { motion } from "framer-motion";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface LeverAmplifyProps {
  chapter?: string;
  title?: string;
  /** Tre sanningar, separerade med || */
  truths?: string;
  handoff?: string;
  inputLabel?: string;
  loadLabel?: string;
  beamLabel?: string;
  fulcrumLabel?: string;
  accent?: string;
  background?: string;
}

/**
 * "AI är hävstången — inte ersättningen." En hävstång som spänner över hela
 * bredden: ditt omdöme (liten insats) längst till vänster, en ljuspuls färdas
 * längs AI-armen och lyfter en stor last (varje elev) längst till höger, som
 * tänds. Vilopunkten i mitten = det vi vet om lärande. Tre vertikala band:
 * rubrik → hävstång → sanningar. Premium-material, glöd, spring-fysik.
 */
export function LeverAmplify({
  chapter,
  title = "Ditt omdöme i förarsätet.",
  truths = "",
  handoff,
  inputLabel = "Ditt omdöme",
  loadLabel = "Varje elev",
  beamLabel = "AI · hävstången",
  fulcrumLabel = "Det vi vet om lärande",
  accent = "var(--accent)",
  background,
}: LeverAmplifyProps) {
  const truthList = truths.split("||").map((t) => t.trim()).filter(Boolean);
  const warm = "#E3A867"; // varm = lasten som lyfts (resultatet)

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.6vw, 3.4rem) clamp(2.6rem, 4.5vw, 4.5rem)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* BAND 1 — rubrik */}
        <div style={{ flexShrink: 0 }}>
          {chapter ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)", letterSpacing: "0.32em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.5rem" }}>
              {chapter}
            </div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 3.8vw, 3.8rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.02, color: "var(--text)", margin: 0 }}
          >
            {title}
          </motion.h2>
        </div>

        {/* BAND 2 — hävstången, full bredd */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {/* golv-sken + linje */}
          <div style={{ position: "absolute", left: "0", right: "0", bottom: "8%", height: "42%", background: `radial-gradient(ellipse at 50% 100%, ${withAlpha(accent, 0.13)}, transparent 72%)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "2%", right: "2%", bottom: "12%", height: "1px", background: `linear-gradient(90deg, transparent, ${withAlpha(accent, 0.28)} 20%, ${withAlpha(accent, 0.28)} 80%, transparent)` }} />

          {/* Vilopunkt (mitten) */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, 0)", width: 0, height: 0, borderLeft: "clamp(1.1rem,1.7vw,1.6rem) solid transparent", borderRight: "clamp(1.1rem,1.7vw,1.6rem) solid transparent", borderBottom: `clamp(2.6rem,4vw,3.6rem) solid ${accent}`, filter: `drop-shadow(0 0 14px ${withAlpha(accent, 0.6)})`, zIndex: 1 }} />
          <div style={{ position: "absolute", left: "50%", top: "calc(50% + clamp(2.9rem,4.4vw,4rem))", transform: "translateX(-50%)", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "clamp(0.62rem, 0.8vw, 0.82rem)", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {fulcrumLabel}
          </div>

          {/* Armen — pivot i mitten (top:50%) */}
          <motion.div
            initial={{ rotate: 6 }}
            animate={{ rotate: -4.5 }}
            transition={{ type: "spring", stiffness: 65, damping: 12, delay: 0.45 }}
            style={{
              position: "absolute",
              left: "3%",
              right: "3%",
              top: "50%",
              transform: "translateY(-50%)",
              height: "clamp(13px, 1.5vw, 18px)",
              borderRadius: "999px",
              transformOrigin: "center",
              zIndex: 2,
              background: `linear-gradient(180deg, ${withAlpha("#ffffff", 0.55)} 0%, ${accent} 40%, ${withAlpha(accent, 0.7)} 100%)`,
              boxShadow: `0 0 36px ${withAlpha(accent, 0.55)}, inset 0 1px 0 ${withAlpha("#ffffff", 0.55)}, inset 0 -2px 5px ${withAlpha("#000000", 0.3)}`,
            }}
          >
            {/* arm-etikett */}
            <div style={{ position: "absolute", left: "62%", top: "-1.8rem", transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: "clamp(0.68rem, 0.9vw, 0.92rem)", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700, whiteSpace: "nowrap" }}>
              {beamLabel}
            </div>

            {/* ljuspuls DU → last (full bredd) */}
            <motion.div
              aria-hidden
              animate={{ left: ["3%", "97%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.3, times: [0, 0.12, 0.88, 1] }}
              style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", width: "clamp(0.8rem, 1.1vw, 1.1rem)", height: "clamp(0.8rem, 1.1vw, 1.1rem)", borderRadius: "50%", background: "#fff", boxShadow: `0 0 18px 5px ${withAlpha("#ffffff", 0.9)}, 0 0 30px 10px ${withAlpha(accent, 0.85)}` }}
            />

            {/* Effort-nod (vänster) */}
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ position: "relative", width: "clamp(2.8rem, 3.8vw, 3.6rem)", height: "clamp(2.8rem, 3.8vw, 3.6rem)" }}>
                <motion.div aria-hidden animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${accent}` }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${withAlpha("#ffffff", 0.9)}, ${accent} 62%)`, color: "#0a0908", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "clamp(0.64rem,0.82vw,0.82rem)", fontWeight: 700, boxShadow: `0 0 32px ${withAlpha(accent, 0.8)}` }}>
                  DU
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem, 0.88vw, 0.9rem)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{inputLabel}</div>
            </div>

            {/* Load-nod (höger) — tänds */}
            <div style={{ position: "absolute", right: 0, top: "50%", transform: "translate(50%, -50%)" }}>
              <motion.div
                animate={{ boxShadow: [`0 0 0 ${withAlpha(warm, 0)}`, `0 0 44px ${withAlpha(warm, 0.65)}`, `0 0 0 ${withAlpha(warm, 0)}`] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
                style={{ width: "clamp(4.4rem, 6.2vw, 6.2rem)", height: "clamp(3.1rem, 4.5vw, 4.1rem)", borderRadius: "0.8rem", background: `linear-gradient(135deg, ${withAlpha(warm, 0.32)}, ${withAlpha(warm, 0.12)})`, border: `1.5px solid ${withAlpha(warm, 0.7)}`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0.25rem", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(0.82rem, 1.05vw, 1.1rem)", color: "var(--text)", lineHeight: 1.1, backdropFilter: "blur(10px)" }}
              >
                {loadLabel}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* BAND 3 — sanningar + överlämning */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {truthList.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(1.2rem, 3vw, 3rem)" }}>
              {truthList.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                  style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", fontFamily: "var(--font-display)", fontSize: "clamp(1rem, 1.3vw, 1.35rem)", color: "var(--text)", lineHeight: 1.25 }}
                >
                  <span aria-hidden style={{ color: accent, flexShrink: 0, fontSize: "0.78em" }}>◆</span>
                  <span>{t}</span>
                </motion.div>
              ))}
            </div>
          ) : null}
          {handoff ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.72rem, 0.9vw, 0.9rem)", letterSpacing: "0.04em", color: accent, opacity: 0.85 }}>
              {handoff}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
