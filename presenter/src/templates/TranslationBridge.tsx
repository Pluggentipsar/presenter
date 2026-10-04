"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface TermPair {
  sv: string;
  ar: string;
}

interface TranslationBridgeProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  swedishText?: string;
  arabicText?: string;
  /** Ordmärke vänster panel. Inga flaggor — arabiska talas i 25+ länder. */
  swedishLabel?: string;
  arabicLabel?: string;
  /** Begreppen som blir brostenar mellan panelerna. */
  terms?: TermPair[];
  /** Etikett över begreppen. Tom sträng döljer den. */
  termsLabel?: string;
  caption?: string;
  accent?: string;
  background?: string;
}

/**
 * Översättningsbron: svensk text reser sig som vänster brofäste, den arabiska
 * översättningen SKRIVER SIG SJÄLV ord för ord (RTL, blur-in som en ljuspenna)
 * som höger brofäste — och begreppen landar som glödande brostenar i honung
 * mellan panelerna, med trådar som spänner ut mot båda texterna.
 *
 * Typografiska ordmärken i stället för flaggor (arabiska är inte ett land).
 *
 * Stegsystem: 4 steg (0 = prompt, 1 = svenskan, 2 = arabiskan skriver sig,
 * 3 = bron byggs + caption).
 */
export function TranslationBridge({
  kicker,
  title = "Översätt till modersmålet",
  subtitle,
  prompt,
  swedishText = "",
  arabicText = "",
  swedishLabel = "Svenska",
  arabicLabel = "العربية",
  terms = [],
  termsLabel = "De svåraste begreppen",
  caption = "Innehållet sänks aldrig. Bron byggs.",
  accent = "var(--accent)",
  background,
}: TranslationBridgeProps) {
  const step = useSlideSteps(4);
  const svOn = step >= 1;
  const arOn = step >= 2;
  const bridgeOn = step >= 3;
  const warm = "#E3A867"; // bron är payoffen — honung
  const arWords = arabicText.split(/\s+/).filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(1.9rem, 3.2vw, 3rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.75rem, 1.4vh, 1.1rem)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          {kicker ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)", letterSpacing: "0.32em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.3rem" }}>{kicker}</div>
          ) : null}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.55rem, 2.6vw, 2.5rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--text)", margin: 0 }}>{title}</h2>
          {subtitle ? (
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.92rem, 1.15vw, 1.2rem)", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.3 }}>{subtitle}</p>
          ) : null}
        </div>

        {/* Prompt-bar */}
        {prompt ? (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", alignSelf: "flex-start", maxWidth: "52em", background: "var(--bg-surface)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "0.8rem", padding: "0.6rem 0.9rem", flexShrink: 0 }}>
            <span aria-hidden style={{ flexShrink: 0, width: "1.4rem", height: "1.4rem", borderRadius: "50%", background: accent, color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.55rem", fontWeight: 700, marginTop: "0.05rem" }}>DU</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.85rem, 1vw, 1.02rem)", lineHeight: 1.4, color: "var(--text)" }}>{prompt}</span>
          </div>
        ) : null}

        {/* Bron: två brofästen + stenarna i mitten */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr clamp(10rem, 15vw, 14rem) 1fr",
            gap: "clamp(0.85rem, 1.5vw, 1.4rem)",
            alignItems: "stretch",
          }}
        >
          {/* VÄNSTER brofäste — svenskan */}
          <div style={panelStyle(svOn, accent)}>
            <PanelMark label={swedishLabel} accent={accent} active={svOn} />
            <motion.div
              initial={false}
              animate={svOn ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.86rem, 1vw, 1.06rem)", lineHeight: 1.62, color: "var(--text)", overflow: "hidden", minHeight: 0 }}
            >
              {swedishText}
            </motion.div>
          </div>

          {/* MITTEN — brostenar (begreppen) */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.4rem, 0.9vh, 0.65rem)", minHeight: 0 }}>
            {/* ljuspelare bakom bron */}
            <motion.div
              aria-hidden
              initial={false}
              animate={{ opacity: bridgeOn ? 1 : 0 }}
              transition={{ duration: 1 }}
              style={{ position: "absolute", inset: "-8% -34%", background: `radial-gradient(ellipse 52% 62% at 50% 50%, ${withAlpha(warm, 0.13)}, transparent 70%)`, pointerEvents: "none" }}
            />
            {/* väntläge: streckad mittlinje där bron ska byggas */}
            <motion.div
              aria-hidden
              initial={false}
              animate={{ opacity: bridgeOn ? 0 : 1 }}
              transition={{ duration: 0.5 }}
              style={{ position: "absolute", left: "50%", top: "10%", bottom: "10%", width: 0, borderLeft: `1px dashed ${withAlpha(accent, 0.2)}` }}
            />
            {/*
              Etikett över begreppen. De två textspalterna har haft var sin
              rubrik hela tiden — mittspalten stod naken, och då syns det inte
              att stenarna i bron ÄR svaret på prompten "lista de svåraste
              begreppen". Kommer med bron, inte före.
            */}
            {termsLabel ? (
              <motion.div
                initial={false}
                animate={{ opacity: bridgeOn ? 1 : 0, y: bridgeOn ? 0 : 6 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.56rem, 0.72vw, 0.72rem)",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: withAlpha(warm, 0.9),
                  textAlign: "center",
                  marginBottom: "clamp(0.1rem, 0.4vh, 0.3rem)",
                }}
              >
                {termsLabel}
              </motion.div>
            ) : null}
            {terms.map((t, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={bridgeOn ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 250, damping: 22, delay: bridgeOn ? i * 0.13 : 0 }}
                style={{ position: "relative", display: "flex", alignItems: "center" }}
              >
                {/* tråd mot svenskan */}
                <motion.div
                  aria-hidden
                  initial={false}
                  animate={{ scaleX: bridgeOn ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: bridgeOn ? i * 0.13 + 0.2 : 0 }}
                  style={{ position: "absolute", right: "100%", width: "clamp(0.8rem, 1.7vw, 1.7rem)", height: "1px", transformOrigin: "right center", background: `linear-gradient(90deg, transparent, ${withAlpha(warm, 0.55)})` }}
                />
                {/* brosten */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.08rem", padding: "clamp(0.3rem, 0.6vh, 0.48rem) 0.6rem", borderRadius: "0.65rem", background: withAlpha(warm, 0.1), border: `1px solid ${withAlpha(warm, 0.5)}`, boxShadow: `0 0 22px ${withAlpha(warm, 0.15)}, inset 0 1px 0 rgba(255,255,255,0.08)`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.58rem, 0.74vw, 0.76rem)", letterSpacing: "0.08em", color: "var(--text)", fontWeight: 600 }}>{t.sv}</span>
                  <span style={{ fontFamily: "var(--font-body)", direction: "rtl", fontSize: "clamp(0.8rem, 0.96vw, 1rem)", color: warm, fontWeight: 600, lineHeight: 1.3 }}>{t.ar}</span>
                </div>
                {/* tråd mot arabiskan */}
                <motion.div
                  aria-hidden
                  initial={false}
                  animate={{ scaleX: bridgeOn ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: bridgeOn ? i * 0.13 + 0.2 : 0 }}
                  style={{ position: "absolute", left: "100%", width: "clamp(0.8rem, 1.7vw, 1.7rem)", height: "1px", transformOrigin: "left center", background: `linear-gradient(90deg, ${withAlpha(warm, 0.55)}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>

          {/* HÖGER brofäste — arabiskan skriver sig själv */}
          <div style={panelStyle(arOn, accent)}>
            <PanelMark label={arabicLabel} accent={accent} active={arOn} rtl />
            <div style={{ fontFamily: "var(--font-body)", direction: "rtl", textAlign: "right", fontSize: "clamp(0.96rem, 1.12vw, 1.18rem)", lineHeight: 1.85, color: "var(--text)", overflow: "hidden", minHeight: 0 }}>
              {arOn
                ? arWords.map((w, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, filter: "blur(5px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.32, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                      style={{ display: "inline-block", marginInlineEnd: i < arWords.length - 1 ? "0.3em" : 0 }}
                    >
                      {w}
                      {i < arWords.length - 1 ? " " : ""}
                    </motion.span>
                  ))
                : null}
            </div>
          </div>
        </div>

        {/* Caption */}
        <motion.div
          initial={false}
          animate={bridgeOn ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.8, delay: bridgeOn ? 0.95 : 0 }}
          style={{ flexShrink: 0, textAlign: "center", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.92rem, 1.15vw, 1.2rem)", color: "var(--text-muted)" }}
        >
          {caption}
        </motion.div>
      </div>
    </div>
  );
}

function panelStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    padding: "clamp(0.95rem, 1.4vw, 1.35rem)",
    borderRadius: "1rem",
    background: active ? "var(--bg-surface)" : withAlpha(accent, 0.04),
    border: `1px ${active ? "solid" : "dashed"} ${withAlpha(accent, active ? 0.32 : 0.18)}`,
    backdropFilter: "blur(16px) saturate(150%)",
    WebkitBackdropFilter: "blur(16px) saturate(150%)",
    boxShadow: active ? "0 22px 50px -24px rgba(0,0,0,0.55)" : "none",
    transition: "background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease",
    overflow: "hidden",
  };
}

function PanelMark({ label, accent, active, rtl }: { label: string; accent: string; active: boolean; rtl?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexDirection: rtl ? "row-reverse" : "row",
        paddingBottom: "0.5rem",
        marginBottom: "0.6rem",
        borderBottom: `1px solid ${withAlpha(accent, active ? 0.3 : 0.14)}`,
        flexShrink: 0,
        transition: "border-color 0.5s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          width: "0.45rem",
          height: "0.45rem",
          borderRadius: "50%",
          background: active ? accent : withAlpha(accent, 0.3),
          boxShadow: active ? `0 0 10px ${withAlpha(accent, 0.8)}` : "none",
          transition: "background 0.5s ease, box-shadow 0.5s ease",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: rtl ? "var(--font-body)" : "var(--font-mono)",
          fontSize: rtl ? "clamp(0.85rem, 1vw, 1.02rem)" : "clamp(0.62rem, 0.8vw, 0.8rem)",
          letterSpacing: rtl ? "0" : "0.3em",
          textTransform: "uppercase",
          color: active ? accent : "var(--text-muted)",
          fontWeight: 700,
          transition: "color 0.5s ease",
        }}
      >
        {label}
      </span>
    </div>
  );
}
