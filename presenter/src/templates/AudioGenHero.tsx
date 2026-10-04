"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface AudioGenHeroProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  trackLabel?: string;
  voiceLabel?: string;
  interests?: string;
  glosor?: string;
  audioSrc?: string;
  accent?: string;
  background?: string;
  /** Cut-out-bild (t.ex. EPA-traktorn) som läggs stor och dimmad bakom kortet. */
  accentImage?: string;
}

const BAR_COUNT = 50;

function splitList(s?: string): string[] {
  if (!s) return [];
  return s.split(/[·,|]/).map((x) => x.trim()).filter(Boolean);
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const a = Math.sin(i * 0.45);
  const b = Math.cos(i * 0.19 + 1.3);
  return Math.min(1, 0.26 + 0.7 * Math.abs(a * 0.7 + b * 0.45));
});

const CARD_WIDTH = { width: "100%", maxWidth: "min(66%, 64rem)", alignSelf: "flex-start" as const };

/**
 * AI-genererad ljud-showcase i nattglas-stil — som en liten film:
 *   Fas 1 (compose): prompten skrivs fram i ett input-kort.
 *   Fas 2 (genererar): ett klick "skickar" → laddningsanimation (~2s).
 *   Fas 3 (resultat): ett premium glaskort blommar in med levande vågform,
 *     intresse-pills, glosor-chips och en play-knapp som spelar riktigt ljud.
 * EPA-traktorn (accentImage) tonar in starkare när resultatet kommer.
 *
 * Stegsystem: 2 steg (0 = compose, 1 = genererar → resultat via timer).
 */
export function AudioGenHero({
  kicker,
  title = "Utgå från elevernas intressen",
  subtitle,
  prompt = "",
  trackLabel = "AI-genererat ljud",
  voiceLabel,
  interests,
  glosor,
  audioSrc,
  accent = "var(--accent)",
  background,
  accentImage,
}: AudioGenHeroProps) {
  const step = useSlideSteps(2);
  const sent = step >= 1;

  const [typed, setTyped] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const ref = useRef<HTMLVideoElement | null>(null);

  // Skriv fram prompten
  useEffect(() => {
    if (!prompt) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= prompt.length) clearInterval(id);
    }, 17);
    return () => clearInterval(id);
  }, [prompt]);

  // Genererar → resultat
  useEffect(() => {
    if (sent) {
      const id = setTimeout(() => setReady(true), 1950);
      return () => clearTimeout(id);
    }
    setReady(false);
  }, [sent]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const promptShown = prompt.slice(0, typed);
  const typingDone = !prompt || typed >= prompt.length;
  const interestList = splitList(interests);
  const glosList = splitList(glosor);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      {accentImage ? (
        <motion.img
          src={accentImage}
          alt=""
          aria-hidden
          initial={false}
          animate={{ opacity: ready ? 0.5 : 0.28 }}
          transition={{ duration: 0.9 }}
          style={{
            position: "absolute",
            right: "-4%",
            bottom: "-7%",
            width: "clamp(40%, 48vw, 50%)",
            zIndex: 1,
            pointerEvents: "none",
            filter: "drop-shadow(0 26px 60px rgba(0,0,0,0.6))",
            WebkitMaskImage: "linear-gradient(105deg, transparent 0%, rgba(0,0,0,0.45) 24%, black 50%)",
            maskImage: "linear-gradient(105deg, transparent 0%, rgba(0,0,0,0.45) 24%, black 50%)",
          }}
        />
      ) : null}

      {audioSrc ? (
        <video
          ref={ref}
          src={audioSrc}
          playsInline
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", left: -10 }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.6vw, 3.4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.9rem, 1.7vh, 1.4rem)",
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 500,
            }}
          >
            {kicker}
          </motion.div>
        ) : null}

        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.9rem, 3.1vw, 3rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.02,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)",
                color: "var(--text-muted)",
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* FAS 1 — prompten skrivs fram | FAS 2/3 — prompten som skickad DU-bar */}
        {!sent ? (
          <ComposeCard promptShown={promptShown} typingDone={typingDone} accent={accent} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              ...CARD_WIDTH,
              background: "var(--bg-surface)",
              border: `1px solid ${withAlpha(accent, 0.2)}`,
              borderRadius: "0.9rem",
              padding: "0.65rem 0.95rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.7rem",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <Dot accent={accent} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.76rem, 0.92vw, 0.92rem)", lineHeight: 1.4, color: "var(--text-muted)" }}>
              {prompt}
            </span>
          </motion.div>
        )}

        {/* FAS 2 — genererar */}
        {sent && !ready ? <GeneratingPanel accent={accent} voiceLabel={voiceLabel} /> : null}

        {/* FAS 3 — resultatkortet */}
        {sent && ready ? (
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 210, damping: 26 }}
            style={{
              ...CARD_WIDTH,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.6vh, 1.3rem)",
              padding: "clamp(1.2rem, 2vw, 2rem)",
              borderRadius: "1.4rem",
              background:
                "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 55%, " + withAlpha(accent, 0.1) + " 100%)",
              backdropFilter: "blur(26px) saturate(180%) brightness(112%)",
              WebkitBackdropFilter: "blur(26px) saturate(180%) brightness(112%)",
              border: `1px solid ${withAlpha(accent, 0.32)}`,
              boxShadow: `0 30px 80px -28px rgba(0,0,0,0.28), 0 0 50px ${withAlpha(accent, 0.14)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          >
            {/* Header: play + spår + tid */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
              <motion.button
                type="button"
                onClick={toggle}
                whileTap={{ scale: 0.92 }}
                aria-label={playing ? "Pausa" : "Spela"}
                style={{
                  flexShrink: 0,
                  width: "clamp(3rem, 4vw, 3.8rem)",
                  height: "clamp(3rem, 4vw, 3.8rem)",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: accent,
                  color: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 30px ${withAlpha(accent, 0.6)}`,
                }}
              >
                {playing ? (
                  <svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="5" y="4" width="5" height="16" rx="1.2" />
                    <rect x="14" y="4" width="5" height="16" rx="1.2" />
                  </svg>
                ) : (
                  <svg width="42%" height="42%" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 7 4.5z" />
                  </svg>
                )}
              </motion.button>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)", color: "var(--text)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>
                  {trackLabel}
                </div>
                {voiceLabel ? (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)", letterSpacing: "0.16em", textTransform: "uppercase", color: accent }}>
                    {voiceLabel}
                  </div>
                ) : null}
              </div>

              <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "clamp(0.8rem, 1vw, 1rem)", color: "var(--text-muted)", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {fmt(cur)} <span style={{ opacity: 0.5 }}>/ {dur ? fmt(dur) : "1:24"}</span>
              </div>
            </div>

            {/* Vågformen */}
            <Waveform playing={playing} accent={accent} />

            {/* Footer: intressen + glosor */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {interestList.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.78rem, 0.95vw, 0.96rem)",
                      fontWeight: 600,
                      color: "var(--text)",
                      padding: "0.32rem 0.85rem",
                      borderRadius: "999px",
                      background: withAlpha(accent, 0.16),
                      border: `1px solid ${withAlpha(accent, 0.45)}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {glosList.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Glosor
                  </span>
                  {glosList.map((g, i) => (
                    <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.72rem, 0.9vw, 0.9rem)", color: "var(--text-muted)", padding: "0.2rem 0.55rem", borderRadius: "0.4rem", border: `1px solid ${withAlpha(accent, 0.22)}` }}>
                      {g}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function Dot({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: "1.5rem",
        height: "1.5rem",
        borderRadius: "50%",
        background: accent,
        color: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: "0.58rem",
        fontWeight: 700,
        marginTop: "0.1rem",
      }}
    >
      DU
    </span>
  );
}

function ComposeCard({ promptShown, typingDone, accent }: { promptShown: string; typingDone: boolean; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        ...CARD_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        padding: "clamp(1.1rem, 1.7vw, 1.6rem)",
        borderRadius: "1.2rem",
        background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 60%, " + withAlpha(accent, 0.08) + " 100%)",
        backdropFilter: "blur(22px) saturate(170%)",
        WebkitBackdropFilter: "blur(22px) saturate(170%)",
        border: `1px solid ${withAlpha(accent, 0.2)}`,
        boxShadow: "0 24px 60px -24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.24em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
        Min prompt till ChatGPT
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(1rem, 1.35vw, 1.32rem)", lineHeight: 1.5, color: "var(--text)", minHeight: "3.5em" }}>
        {promptShown}
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-block", width: "0.55ch", height: "1.05em", background: accent, marginLeft: "1px", verticalAlign: "text-bottom", borderRadius: "1px" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.8rem" }}>
        <motion.span
          animate={{ opacity: typingDone ? 1 : 0.4 }}
          style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.66rem, 0.82vw, 0.82rem)", letterSpacing: "0.1em", color: "var(--text-muted)" }}
        >
          Tryck för att generera
        </motion.span>
        <motion.div
          aria-hidden
          animate={typingDone ? { scale: [1, 1.12, 1], boxShadow: [`0 0 0 ${withAlpha(accent, 0)}`, `0 0 22px ${withAlpha(accent, 0.7)}`, `0 0 0 ${withAlpha(accent, 0)}`] } : {}}
          transition={typingDone ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
          style={{
            width: "2.4rem",
            height: "2.4rem",
            borderRadius: "50%",
            background: typingDone ? accent : "var(--bg-elevated)",
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="44%" height="44%" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke={typingDone ? "var(--bg)" : "var(--text-muted)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}

function GeneratingPanel({ accent, voiceLabel }: { accent: string; voiceLabel?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        ...CARD_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem",
        padding: "clamp(1.3rem, 2vw, 1.9rem)",
        borderRadius: "1.4rem",
        background: "var(--bg-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${withAlpha(accent, 0.28)}`,
        boxShadow: "0 24px 60px -26px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <motion.span
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          style={{ width: "2.1rem", height: "2.1rem", borderRadius: "50%", border: `2.5px solid ${withAlpha(accent, 0.25)}`, borderTopColor: accent, flexShrink: 0 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)", color: "var(--text)" }}>
            Genererar hörförståelse …
          </span>
          {voiceLabel ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.18em", textTransform: "uppercase", color: accent }}>
              {voiceLabel}
            </span>
          ) : null}
        </div>
      </div>
      {/* progress */}
      <div style={{ height: "6px", borderRadius: "999px", background: withAlpha(accent, 0.14), overflow: "hidden" }}>
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.85, ease: "easeInOut" }}
          style={{ height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${withAlpha(accent, 0.5)}, ${accent})`, boxShadow: `0 0 14px ${withAlpha(accent, 0.6)}` }}
        />
      </div>
    </motion.div>
  );
}

function Waveform({ playing, accent }: { playing: boolean; accent: string }) {
  return (
    <div
      style={{
        height: "clamp(120px, 22vh, 200px)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(2px, 0.5vw, 5px)",
      }}
    >
      {BARS.map((base, i) => {
        const lo = base * (playing ? 0.45 : 0.62);
        const hi = base * (playing ? 1.0 : 0.82);
        const dur2 = (playing ? 0.5 : 1.3) + ((i % 7) * 0.06);
        return (
          <motion.span
            key={i}
            aria-hidden
            animate={{ scaleY: [lo, hi, lo * 0.8, hi * 0.9, lo] }}
            transition={{ duration: dur2, repeat: Infinity, ease: "easeInOut", delay: (i % 11) * 0.045 }}
            style={{
              display: "inline-block",
              width: "clamp(3px, 0.7vw, 7px)",
              height: "100%",
              transformOrigin: "center",
              borderRadius: "999px",
              background: `linear-gradient(to bottom, ${withAlpha(accent, 0.35)}, ${accent} 50%, ${withAlpha(accent, 0.35)})`,
              boxShadow: `0 0 8px ${withAlpha(accent, 0.4)}`,
            }}
          />
        );
      })}
    </div>
  );
}
