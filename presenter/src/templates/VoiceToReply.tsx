"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface VoiceToReplyProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Det administratören dikterar in (rambly). */
  transcript?: string;
  /** Etikett över transkriptet. Default "Admin talar". */
  speakerLabel?: string;
  /** AI:ns färdiga svar. Stödjer markdown-rader: blankrader → paragrafer, `**bold**`, `*italic*`. Använd `\n` eller blankrader för radbrytning. */
  reply?: string;
  /** Etikett över AI-svaret. Default "Copilot svarar". */
  replyLabel?: string;
  /** Modellnamn. Default "Microsoft Copilot · Pro". */
  modelLabel?: string;
  /** Mottagare-rad ovanför svaret (valfri). T.ex. "Till: maria.lindgren@..." */
  replyTo?: string;
  /** Ämnesrad (valfri). T.ex. "Re: Avslag på ansökan om elevassistent" */
  replySubject?: string;
  /** ms per tecken under transkript-typing. Default 24. */
  transcriptSpeed?: number;
  /** ms per tecken under reply-typing. Default 14. */
  replySpeed?: number;
  /** Paus i ms mellan transkript-slut och reply-start. Default 600. */
  thinkingDelay?: number;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** Splitta reply-text till stycken (på blankrad) — varje stycke renderas som <p>. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

/** Animerad waveform — fyra barer som pulserar synkront. */
function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.18rem", height: "1.5rem" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          animate={
            active
              ? {
                  scaleY: [0.4, 1.1, 0.6, 0.95, 0.5],
                }
              : { scaleY: 0.25 }
          }
          transition={{
            duration: 0.9 + (i % 3) * 0.15,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
          style={{
            width: "0.22rem",
            height: "1.4rem",
            borderRadius: "1px",
            background: color,
            boxShadow: `0 0 10px ${withAlpha(color, 0.56)}`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

/** Tre tankepunkter (typing-indikator). */
function ThinkingDots({ visible, color }: { visible: boolean; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.32rem",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={
            visible
              ? { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }
              : { y: 0, opacity: 0 }
          }
          transition={{
            duration: 1,
            repeat: visible ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
          style={{
            width: "0.55rem",
            height: "0.55rem",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${withAlpha(color, 0.5)}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * VoiceToReply — administratören dikterar rörigt → AI svarar med ett polerat mejl.
 *
 * Animerings-flow:
 *   1. Transcript typar fram word-by-word (mic pulserar i header).
 *   2. Mic slutar pulsera, "thinking dots" syns på höger sida.
 *   3. Reply (mejl) typar fram paragraf för paragraf.
 *
 * Layout: 50/50 split. Vänster panel har voice-bandet i toppen. Höger panel
 * har ett to/subject-block (mejl-header) följt av brödtext.
 */
export function VoiceToReply({
  chapter,
  title,
  subtitle,
  transcript = "",
  speakerLabel = "Admin talar",
  reply = "",
  replyLabel = "Copilot svarar",
  modelLabel = "Microsoft Copilot · Pro",
  replyTo,
  replySubject,
  transcriptSpeed = 24,
  replySpeed = 14,
  thinkingDelay = 600,
  background,
  accent = "#B4763A",
  overlay,
}: VoiceToReplyProps) {
  const [transcriptShown, setTranscriptShown] = useState("");
  const [replyShown, setReplyShown] = useState("");
  const [phase, setPhase] = useState<"transcript" | "thinking" | "reply" | "done">(
    "transcript"
  );

  const transcriptSpeedNum =
    typeof transcriptSpeed === "string" ? parseFloat(transcriptSpeed) : transcriptSpeed;
  const replySpeedNum =
    typeof replySpeed === "string" ? parseFloat(replySpeed) : replySpeed;
  const thinkingDelayNum =
    typeof thinkingDelay === "string" ? parseFloat(thinkingDelay) : thinkingDelay;

  // Transcript typewriter
  useEffect(() => {
    if (phase !== "transcript") return;
    if (transcriptShown.length >= transcript.length) {
      setPhase("thinking");
      return;
    }
    const t = setTimeout(() => {
      setTranscriptShown(transcript.slice(0, transcriptShown.length + 1));
    }, transcriptSpeedNum);
    return () => clearTimeout(t);
  }, [phase, transcriptShown, transcript, transcriptSpeedNum]);

  // Thinking pause
  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(() => setPhase("reply"), thinkingDelayNum);
    return () => clearTimeout(t);
  }, [phase, thinkingDelayNum]);

  // Reply typewriter
  useEffect(() => {
    if (phase !== "reply") return;
    if (replyShown.length >= reply.length) {
      setPhase("done");
      return;
    }
    const t = setTimeout(() => {
      setReplyShown(reply.slice(0, replyShown.length + 1));
    }, replySpeedNum);
    return () => clearTimeout(t);
  }, [phase, replyShown, reply, replySpeedNum]);

  const replyParas = paragraphs(replyShown);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.62) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(1.75rem, 3vw, 3rem)",
          gap: "clamp(0.85rem, 1.6vh, 1.4rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.35rem", maxWidth: "60em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
                opacity: 0.85,
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.5rem, 3vw, 2.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "44em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Split panel */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
            gap: "clamp(0.85rem, 1.6vw, 1.4rem)",
            minHeight: 0,
          }}
        >
          {/* LEFT: voice transcript */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "0.75rem",
              border: `1px solid ${withAlpha(accent, 0.21)}`,
              background: "var(--bg-elevated)",
              boxShadow: `0 0 40px ${withAlpha(accent, 0.08)}, inset 0 0 0 1px ${withAlpha(accent, 0.08)}`,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                padding: "clamp(0.75rem, 1.2vw, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
                borderBottom: `1px solid ${withAlpha(accent, 0.19)}`,
                background: `linear-gradient(90deg, ${withAlpha(accent, 0.09)} 0%, transparent 100%)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                {/* Mic icon */}
                <div
                  style={{
                    width: "1.7rem",
                    height: "1.7rem",
                    borderRadius: "50%",
                    background:
                      phase === "transcript"
                        ? `radial-gradient(circle, ${accent} 0%, ${withAlpha(accent, 0.56)} 70%)`
                        : `${withAlpha(accent, 0.19)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      phase === "transcript"
                        ? `0 0 20px ${accent}, 0 0 8px ${accent}`
                        : "none",
                    transition: "all 0.3s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="3" width="6" height="13" rx="3" fill="#0a0908" />
                    <path
                      d="M5 11a7 7 0 0 0 14 0"
                      stroke="#0a0908"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <line x1="12" y1="18" x2="12" y2="22" stroke="#0a0908" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: accent,
                    fontWeight: 700,
                  }}
                >
                  <EditableText path="speakerLabel" value={speakerLabel}>
                    {speakerLabel}
                  </EditableText>
                </div>
              </div>
              <Waveform active={phase === "transcript"} color={accent} />
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "clamp(1rem, 1.6vw, 1.4rem)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)",
                lineHeight: 1.55,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {transcriptShown}
              {phase === "transcript" ? (
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "1.1em",
                    background: accent,
                    marginLeft: "0.18rem",
                    verticalAlign: "text-bottom",
                  }}
                />
              ) : null}
            </div>
          </motion.div>

          {/* RIGHT: AI reply (email format) */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "0.75rem",
              border: `1px solid ${withAlpha(accent, 0.31)}`,
              background: "var(--text)",
              boxShadow: `0 0 50px ${withAlpha(accent, 0.15)}, inset 0 0 0 1px ${withAlpha(accent, 0.12)}`,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {/* Reply header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                padding: "clamp(0.75rem, 1.2vw, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
                borderBottom: `1px solid ${withAlpha(accent, 0.19)}`,
                background: `linear-gradient(90deg, ${withAlpha(accent, 0.15)} 0%, ${withAlpha(accent, 0.03)} 100%)`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: phase === "reply" || phase === "done" ? "#5DBE7B" : accent,
                    boxShadow: `0 0 10px ${phase === "reply" || phase === "done" ? "#5DBE7B" : accent}`,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: "var(--bg)",
                    fontWeight: 700,
                  }}
                >
                  <EditableText path="replyLabel" value={replyLabel}>
                    {replyLabel}
                  </EditableText>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {phase === "thinking" ? <ThinkingDots visible={true} color={accent} /> : null}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.72vw, 0.72rem)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--bg)",
                    opacity: 0.5,
                  }}
                >
                  <EditableText path="modelLabel" value={modelLabel}>
                    {modelLabel}
                  </EditableText>
                </div>
              </div>
            </div>

            {/* Email metadata bar */}
            {(replyTo || replySubject) && phase !== "transcript" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  padding: "clamp(0.75rem, 1.2vw, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
                  borderBottom: `1px solid ${withAlpha("var(--bg)", 0.12)}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                  color: "var(--bg)",
                }}
              >
                {replyTo ? (
                  <div>
                    <span style={{ opacity: 0.55 }}>Till:&nbsp;</span>
                    <span style={{ color: "var(--bg)" }}>{replyTo}</span>
                  </div>
                ) : null}
                {replySubject ? (
                  <div>
                    <span style={{ opacity: 0.55 }}>Ämne:&nbsp;</span>
                    <span style={{ color: "var(--bg)", fontWeight: 600 }}>
                      {replySubject}
                    </span>
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {/* Reply body */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "clamp(1rem, 1.6vw, 1.4rem) clamp(1.2rem, 1.8vw, 1.7rem)",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.92rem, 1.1vw, 1.08rem)",
                lineHeight: 1.6,
                color: "var(--bg)",
                minHeight: 0,
              }}
            >
              {phase === "transcript" || phase === "thinking" ? (
                <div
                  style={{
                    color: withAlpha("var(--bg)", 0.45),
                    fontStyle: "italic",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {phase === "thinking" ? "Strukturerar svaret…" : "Väntar på input…"}
                </div>
              ) : (
                replyParas.map((p, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : "0.85rem 0 0 0" }}>
                    {renderInline(p, accent)}
                    {i === replyParas.length - 1 && phase === "reply" ? (
                      <motion.span
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{
                          duration: 0.65,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{
                          display: "inline-block",
                          width: "0.45rem",
                          height: "1.05em",
                          background: accent,
                          marginLeft: "0.15rem",
                          verticalAlign: "text-bottom",
                        }}
                      />
                    ) : null}
                  </p>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
