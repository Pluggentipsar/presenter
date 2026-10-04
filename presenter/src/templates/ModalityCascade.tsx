"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { cascadeVariants } from "./modality-cascade-varianter";

export interface ModalityCascadeProps {
  /** En variant ur modality-cascade-varianter.ts, med en manuell promptgräns för varje resultat. */
  visualStyle?: string;
  kicker?: string;
  title?: string;
  /** Källbilden (foto på tavlan). */
  sourceImage: string;
  sourceCaption?: string;
  accent?: string;
  background?: string;
  /** Starta podd, låt och film när deras clickersteg visas. */
  autoPlayMedia?: boolean;

  // Beat 1 · Sammanfattning (ChatGPT)
  summaryPrompt?: string;
  summaryHeading?: string;
  /** Punkter separerade med || */
  summaryItems?: string;
  summaryOvning?: string;
  summaryIntro?: string;

  // Beat 2 · Infografik (Gamma)
  infographicPrompt?: string;
  infographicImage?: string;

  // Beat 3 · Podd (NotebookLM)
  podcastPrompt?: string;
  podcastSrc?: string;
  podcastTitle?: string;
  podcastHosts?: string;
  podcastTips?: string;

  // Beat 4 · Låt (Suno)
  songPrompt?: string;
  songSrc?: string;
  songTitle?: string;

  // Beat 5 · Spel (Claude)
  gamePrompt?: string;
  gameSrc?: string;
  gameTitle?: string;
}

interface Beat {
  key: string;
  label: string;
  tool: string;
  kind: "text" | "image" | "audio" | "video";
  prompt?: string;
  src?: string;
  meta?: string;
  tips?: string;
}

const WAVE = Array.from({ length: 34 }, (_, i) => Math.min(1, 0.3 + 0.65 * Math.abs(Math.sin(i * 0.5) * Math.cos(i * 0.2 + 1))));

export function ModalityCascade(props: ModalityCascadeProps) {
  // Familjernas egna utseenden (modality-cascade-varianter.ts), till exempel en föreläsnings form med visualStyle="sta".
  const Variant = props.visualStyle ? cascadeVariants[props.visualStyle] : undefined;
  return Variant ? <Variant {...props} /> : <LegacyModalityCascade {...props} />;
}

function LegacyModalityCascade({
  kicker,
  title = "Ett foto. Fem vägar in.",
  sourceImage,
  sourceCaption = "Foto på tavlan",
  accent = "var(--accent)",
  background,
  autoPlayMedia = false,
  summaryPrompt,
  summaryHeading = "Sammanfattning",
  summaryItems = "",
  summaryOvning,
  summaryIntro,
  infographicPrompt,
  infographicImage,
  podcastPrompt,
  podcastSrc,
  podcastTitle = "Vad tände gnistan 1914?",
  podcastHosts = "Två röster",
  podcastTips,
  songPrompt,
  songSrc,
  songTitle = "AI-genererad låt",
  gamePrompt,
  gameSrc,
  gameTitle = "Interaktivt spel",
}: ModalityCascadeProps) {
  const step = useSlideSteps(6);
  const docked = step >= 1;
  const activeIdx = step - 1;

  const beats: Beat[] = [
    { key: "summary", label: summaryHeading, tool: "ChatGPT", kind: "text", prompt: summaryPrompt },
    { key: "infographic", label: "Infografik", tool: "ChatGPT + Gemini", kind: "image", prompt: infographicPrompt, src: infographicImage },
    { key: "podcast", label: "Podd", tool: "NotebookLM", kind: "audio", prompt: podcastPrompt, src: podcastSrc, meta: podcastHosts, tips: podcastTips },
    { key: "song", label: "Låt", tool: "Suno", kind: "audio", prompt: songPrompt, src: songSrc, meta: songTitle },
    { key: "game", label: "Spel", tool: "Claude", kind: "video", prompt: gamePrompt, src: gameSrc, meta: gameTitle },
  ];
  const active = activeIdx >= 0 && activeIdx < beats.length ? beats[activeIdx] : null;

  const items = summaryItems.split("||").map((s) => s.trim()).filter(Boolean);

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
          gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          {kicker ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)", letterSpacing: "0.32em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.3rem" }}>
              {kicker}
            </div>
          ) : null}
          <motion.h2
            animate={{ fontSize: docked ? "clamp(1.4rem, 2.1vw, 2rem)" : "clamp(2rem, 3.2vw, 3rem)" }}
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.04, color: "var(--text)", margin: 0 }}
          >
            {title}
          </motion.h2>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: "clamp(1rem, 2vw, 2rem)" }}>
          {/* KÄLLAN + pipeline */}
          <motion.div
            animate={{ width: docked ? "30%" : "100%" }}
            transition={{ type: "spring", stiffness: 210, damping: 28 }}
            style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.4vh, 1.2rem)", minWidth: 0 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: docked ? "stretch" : "center", justifyContent: "center", flexShrink: 0 }}>
              <div
                style={{
                  position: "relative",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: `1px solid ${withAlpha(accent, 0.3)}`,
                  boxShadow: `0 26px 70px -26px rgba(0,0,0,0.75), 0 0 36px ${withAlpha(accent, 0.12)}`,
                  alignSelf: docked ? "stretch" : "center",
                  maxWidth: docked ? "100%" : "min(70%, 50rem)",
                }}
              >
                <img src={sourceImage} alt={sourceCaption} style={{ display: "block", width: "100%", height: "auto", maxHeight: docked ? "32vh" : "58vh", objectFit: "contain", background: "#0c0d12" }} />
                <div style={{ position: "absolute", left: "0.7rem", bottom: "0.7rem", fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,246,250,0.92)", background: "rgba(6,7,12,0.66)", padding: "0.28rem 0.6rem", borderRadius: "0.4rem", backdropFilter: "blur(8px)" }}>
                  {sourceCaption}
                </div>
              </div>
            </div>

            {/* Pipeline */}
            {docked ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minHeight: 0 }}>
                {beats.map((b, i) => {
                  const isActive = i === activeIdx;
                  const isDone = i < activeIdx;
                  return (
                    <div key={b.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.6rem", borderRadius: "0.6rem", background: isActive ? withAlpha(accent, 0.14) : "transparent", border: `1px solid ${isActive ? withAlpha(accent, 0.4) : "transparent"}`, opacity: isDone || isActive ? 1 : 0.5 }}>
                      <span style={{ width: "1.4rem", height: "1.4rem", flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700, background: isActive ? "var(--accent-bright)" : isDone ? withAlpha(accent, 0.18) : "var(--bg-elevated)", color: isActive ? "#0a0908" : isDone ? accent : "var(--text-muted)" }}>
                        {isDone ? "✓" : i + 1}
                      </span>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(0.8rem, 1vw, 0.98rem)", fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-muted)" }}>{b.label}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? accent : "var(--text-muted)", opacity: 0.85 }}>{b.tool}</span>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ textAlign: "center", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)", color: "var(--text-muted)" }}>
                Du fotar tavlan. Sen blir den fem saker.
              </motion.div>
            )}
          </motion.div>

          {/* STAGE */}
          {docked && active ? (
            <motion.div key={active.key} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* badge + prompt */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: "#0a0908", background: "var(--accent-bright)", padding: "0.28rem 0.7rem", borderRadius: "999px" }}>{active.tool}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)", color: "var(--text)" }}>{active.label}</span>
              </div>
              {active.tips ? (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: accent, fontWeight: 700, marginRight: "0.2rem" }}>Tips · styr värdarna</span>
                  {active.tips.split("||").map((t, j) => (
                    <span key={j} style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.74rem, 0.9vw, 0.9rem)", color: "var(--text)", padding: "0.3rem 0.7rem", borderRadius: "999px", background: withAlpha(accent, 0.12), border: `1px solid ${withAlpha(accent, 0.4)}` }}>
                      ”{t.trim()}”
                    </span>
                  ))}
                </div>
              ) : active.prompt ? (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "var(--bg-surface)", border: "1px solid var(--glass-border)", borderRadius: "0.8rem", padding: "0.6rem 0.85rem", flexShrink: 0 }}>
                  <span aria-hidden style={{ flexShrink: 0, width: "1.4rem", height: "1.4rem", borderRadius: "50%", background: "var(--accent-bright)", color: "#0a0908", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.55rem", fontWeight: 700, marginTop: "0.05rem" }}>DU</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.85rem, 0.98vw, 1.02rem)", lineHeight: 1.4, color: "var(--text-muted)" }}>{active.prompt}</span>
                </div>
              ) : null}

              {/* resultat */}
              <div style={{ flex: 1, minHeight: 0 }}>
                {active.kind === "text" ? (
                  <ResultCard accent={accent}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)", color: "var(--text)", marginBottom: "0.5rem" }}>{summaryHeading}</div>
                    {summaryIntro ? (
                      <p style={{ margin: "0 0 0.7rem", fontFamily: "var(--font-body)", fontSize: "clamp(0.8rem, 0.98vw, 1rem)", lineHeight: 1.45, color: "var(--text-muted)" }}>{summaryIntro}</p>
                    ) : null}
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", columnCount: 2, columnGap: "1.6rem" }}>
                      {items.map((it, j) => (
                        <li key={j} style={{ display: "flex", gap: "0.5rem", fontFamily: "var(--font-body)", fontSize: "clamp(0.82rem, 0.96vw, 1rem)", lineHeight: 1.45, color: "var(--text)", breakInside: "avoid", marginBottom: "0.45rem" }}>
                          <span aria-hidden style={{ color: accent, flexShrink: 0 }}>·</span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                    {summaryOvning ? (
                      <div style={{ marginTop: "0.8rem", padding: "0.6rem 0.8rem", borderRadius: "0.6rem", background: withAlpha(accent, 0.12), border: `1px solid ${withAlpha(accent, 0.3)}`, fontFamily: "var(--font-body)", fontSize: "clamp(0.76rem, 0.92vw, 0.92rem)", color: "var(--text)" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: accent, marginRight: "0.5rem" }}>Övning</span>
                        {summaryOvning}
                      </div>
                    ) : null}
                  </ResultCard>
                ) : active.kind === "image" ? (
                  <MediaFrame accent={accent}>
                    {active.src ? (
                      <img src={active.src} alt={active.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <Placeholder accent={accent} tool={active.tool} label="Infografik kommer" />
                    )}
                  </MediaFrame>
                ) : (
                  // audio + video
                  <MediaFrame accent={accent}>
                    <CascadePlayer key={active.key} accent={accent} src={active.src} title={active.meta || active.label} kind={active.kind} autoPlayMedia={autoPlayMedia} />
                  </MediaFrame>
                )}
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CascadePlayer({ accent, src, title, kind, autoPlayMedia }: { accent: string; src?: string; title: string; kind: "audio" | "video"; autoPlayMedia: boolean }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const media = ref.current;
    if (!media) return;
    if (autoPlayMedia) {
      // Om webbläsaren nekar ljudstart finns den vanliga spelknappen kvar.
      void media.play().catch(() => {});
    }
    // Varje steg har en egen spelare: stanna även vid bakåtsteg och slidebyte.
    return () => { media.pause(); };
  }, [autoPlayMedia, src]);

  const toggle = () => {
    const media = ref.current;
    if (!media) return;
    if (media.paused) void media.play().catch(() => {});
    else media.pause();
  };

  return <>
    {src ? <video
      ref={ref}
      src={src}
      playsInline
      controls={kind === "video"}
      aria-label={title}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onError={() => setPlaying(false)}
      style={kind === "video"
        ? { width: "100%", height: "100%", objectFit: "contain", background: "#000" }
        : { position: "absolute", width: 1, height: 1, opacity: 0, left: -10 }}
    /> : null}
    <PlayerChrome accent={accent} playing={playing} onToggle={toggle} hasSrc={!!src} title={title} kind={kind} />
  </>;
}

function ResultCard({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: "clamp(1rem, 1.6vw, 1.5rem)",
        borderRadius: "1.1rem",
        background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 60%, " + withAlpha(accent, 0.08) + " 100%)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: `1px solid ${withAlpha(accent, 0.28)}`,
        boxShadow: `0 24px 60px -26px rgba(0,0,0,0.35)`,
      }}
    >
      {children}
    </div>
  );
}

function MediaFrame({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        borderRadius: "1.1rem",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-surface)",
        border: `1px solid ${withAlpha(accent, 0.28)}`,
        boxShadow: `0 24px 60px -26px rgba(0,0,0,0.35)`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {children}
    </div>
  );
}

function Placeholder({ accent, tool, label }: { accent: string; tool: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", color: "var(--text-muted)" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent }}>{tool}</span>
      <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)" }}>{label}</span>
    </div>
  );
}

function PlayerChrome({ accent, playing, onToggle, hasSrc, title, kind }: { accent: string; playing: boolean; onToggle: () => void; hasSrc: boolean; title: string; kind: string }) {
  // För video läggs chrome bara om inget src finns (annars syns videon själv)
  if (kind === "video" && hasSrc) return null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem" }}>
      <button
        type="button"
        onClick={hasSrc ? onToggle : undefined}
        aria-label={playing ? "Pausa" : "Spela"}
        style={{ width: "clamp(3rem, 4vw, 3.8rem)", height: "clamp(3rem, 4vw, 3.8rem)", borderRadius: "50%", border: "none", cursor: hasSrc ? "pointer" : "default", background: hasSrc ? "var(--accent-bright)" : "var(--bg-elevated)", color: "#0a0908", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hasSrc ? `0 0 28px ${withAlpha(accent, 0.6)}` : "none" }}
      >
        {playing ? (
          <svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2" /><rect x="14" y="4" width="5" height="16" rx="1.2" /></svg>
        ) : (
          <svg width="42%" height="42%" viewBox="0 0 24 24" fill={hasSrc ? "currentColor" : "var(--text-muted)"}><path d="M7 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
        )}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(2px, 0.4vw, 4px)", height: "clamp(36px, 6vh, 56px)" }}>
        {WAVE.map((base, i) => (
          <motion.span
            key={i}
            aria-hidden
            animate={{ scaleY: playing ? [base * 0.5, base, base * 0.6, base * 0.9, base * 0.5] : [base * 0.6, base * 0.8, base * 0.6] }}
            transition={{ duration: (playing ? 0.5 : 1.4) + (i % 6) * 0.06, repeat: Infinity, ease: "easeInOut", delay: (i % 9) * 0.05 }}
            style={{ width: "clamp(2px, 0.45vw, 5px)", height: "100%", transformOrigin: "center", borderRadius: "999px", background: `linear-gradient(to bottom, ${withAlpha(accent, 0.35)}, ${accent} 50%, ${withAlpha(accent, 0.35)})` }}
          />
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(0.85rem, 1vw, 1.05rem)", color: "var(--text)", textAlign: "center" }}>
        {title}
        {!hasSrc ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}> · spår kommer</span> : null}
      </div>
    </div>
  );
}
