"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { parseMessages, TypingDots } from "./LiquidChat";
import {
  AmbientBackdrop,
  glassCardStyle,
} from "./_decorations/GlassDecorations";

interface ExercisePitchProps {
  /** Mono-kicker uppe till vänster, t.ex. "§ Om AI · Övningen". */
  eyebrow?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Badge-pill ovanför titeln, t.ex. "Övning · helklass". */
  badge?: string;
  /** Övningens namn — slidens hjälte. */
  title?: string;
  /**
   * Utmaningsraden under titeln. `**ord**` lyfts i accent,
   * t.ex. "Vem hittar **flest hallucinationer** på **fem minuter**?"
   */
  challenge?: string;
  /** App-namn i demo-chattens header. */
  app?: string;
  /** Status-text i chattens header. Default "Online". */
  status?: string;
  /** Liten rad under chattkortet — poängen med exemplet. */
  caption?: string;
  /** Apple Messages-blå för user-bubblor. Samma default som LiquidChat. */
  userColor?: string;
  /** Sekundär accent för ambient-orbs. */
  accent2?: string;
  /**
   * Markdown-lista med demo-chatten. Samma format som LiquidChat:
   * `- **Du:** fråga` / `- **AI:** svar`.
   */
  children?: ReactNode;
}

/** Renderar `**ord**` i accent + tyngd, resten ärver. */
function renderEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong
          key={i}
          style={{ color: "var(--accent)", fontWeight: 650 }}
        >
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Övnings-pitch: en aktivitet lärarna kan stjäla rakt av, presenterad som
 * en händelse — badge, stort övningsnamn, utmaningsrad med accent-lyfta
 * nyckelord, och ett litet lutat demo-chattkort som bevisföring till höger.
 * Skiljer sig medvetet från LiquidChat (fullstor chattfönster-slide):
 * här är övningen hjälten och chatten ett exhibit.
 */
export function ExercisePitch({
  eyebrow,
  chapter,
  badge = "Övning",
  title,
  challenge,
  app = "Copilot",
  status = "Online",
  caption,
  userColor = "linear-gradient(180deg, #5B9DFF 0%, #2C7BFF 100%)",
  accent2,
  children,
}: ExercisePitchProps) {
  const messages = parseMessages(children);
  const step = useSlideSteps(messages.length);
  const visibleCount = Math.min(step + 1, messages.length);
  const visibleMessages = messages.slice(0, visibleCount);
  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const showTypingDots =
    visibleCount > 0 &&
    visibleCount < messages.length &&
    lastMessage?.side === "user" &&
    messages[visibleCount]?.side === "ai";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop accent2={accent2} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.5rem, 4vw, 4rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
          gap: "clamp(2rem, 4vw, 4.5rem)",
          alignItems: "center",
        }}
      >
        {/* Vänster: övningen */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.1rem, 2.2vh, 1.7rem)",
            maxWidth: "30em",
          }}
        >
          {(eyebrow || chapter) ? (
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              {eyebrow ? (
                <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                  {eyebrow}
                </span>
              ) : null}
              {chapter ? (
                <span style={{ color: "var(--text-muted)" }}>{chapter}</span>
              ) : null}
            </div>
          ) : null}

          {/* Badge — övningsstämpeln */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{ display: "flex" }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.5rem 1.05rem",
                borderRadius: "9999px",
                background: "var(--accent-dim)",
                border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              <motion.span
                aria-hidden
                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.25, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "inline-block",
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: "var(--accent-bright, var(--accent))",
                }}
              />
              {badge}
            </span>
          </motion.div>

          {/* Titel */}
          {title ? (
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.6rem, 4.8vw, 4.6rem)",
                  fontWeight: 550,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {title}
              </motion.h1>
              {/* Accent-linjen tecknar sig under namnet */}
              <motion.div
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.9,
                  delay: 0.65,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  transformOrigin: "left",
                  marginTop: "clamp(0.7rem, 1.2vh, 1rem)",
                  height: "3px",
                  width: "38%",
                  borderRadius: "9999px",
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, var(--accent-bright, var(--accent)) 100%)",
                }}
              />
            </div>
          ) : null}

          {/* Utmaningsraden */}
          {challenge ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.35rem, 2vw, 2rem)",
                fontWeight: 400,
                letterSpacing: "-0.015em",
                lineHeight: 1.35,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {renderEmphasis(challenge)}
            </motion.p>
          ) : null}
        </div>

        {/* Höger: demo-chatten som exhibit */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.5vh, 1.1rem)",
            justifySelf: "center",
            width: "min(100%, 30rem)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, rotate: -4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotate: -1.6, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 26,
              mass: 0.9,
              delay: 0.3,
            }}
            style={{
              ...glassCardStyle({ radius: "1.5rem", blur: 26, padding: "0" }),
              display: "flex",
              flexDirection: "column",
              maxHeight: "min(72vh, 560px)",
            }}
          >
            {/* Chatt-header, slimmad */}
            <div
              style={{
                padding: "0.9rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                borderBottom:
                  "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              }}
            >
              <motion.span
                aria-hidden
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  display: "inline-block",
                  width: "0.45rem",
                  height: "0.45rem",
                  borderRadius: "50%",
                  background: "#4ADE80",
                  boxShadow: "0 0 8px rgba(74,222,128,0.6)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {app}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.66rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  opacity: 0.8,
                }}
              >
                {status}
              </span>
            </div>

            {/* Meddelanden */}
            <div
              style={{
                flex: 1,
                padding: "1.2rem 1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                overflowY: "auto",
              }}
            >
              <AnimatePresence initial={false}>
                {visibleMessages.map((msg, i) => {
                  const isUser = msg.side === "user";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                        mass: 0.7,
                      }}
                      style={{
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        maxWidth: "88%",
                        padding: "0.7rem 1rem",
                        borderRadius: isUser
                          ? "1.2rem 1.2rem 0.4rem 1.2rem"
                          : "1.2rem 1.2rem 1.2rem 0.4rem",
                        // Samma tema-logik som LiquidChat: user = brand-blå,
                        // AI = var(--bg-elevated) så bubblan syns på ljust.
                        background: isUser
                          ? userColor
                          : "var(--bg-elevated, rgba(255,255,255,0.06))",
                        backdropFilter: isUser
                          ? undefined
                          : "blur(18px) saturate(140%)",
                        WebkitBackdropFilter: isUser
                          ? undefined
                          : "blur(18px) saturate(140%)",
                        border: isUser
                          ? "1px solid rgba(255,255,255,0.18)"
                          : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                        boxShadow: isUser
                          ? "0 6px 20px rgba(44,123,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)"
                          : "0 4px 14px rgba(0,0,0,0.12)",
                        color: isUser ? "#fff" : "var(--text)",
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.92rem, 1.05vw, 1.05rem)",
                        lineHeight: 1.45,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {msg.text}
                    </motion.div>
                  );
                })}
                {showTypingDots ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      alignSelf: "flex-start",
                      background: "var(--bg-elevated, rgba(255,255,255,0.06))",
                      backdropFilter: "blur(18px) saturate(140%)",
                      WebkitBackdropFilter: "blur(18px) saturate(140%)",
                      border:
                        "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                      borderRadius: "1.2rem 1.2rem 1.2rem 0.4rem",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                    }}
                  >
                    <TypingDots color="var(--text-muted)" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Poäng-raden under kortet */}
          {caption ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 + visibleCount * 0.15 }}
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.4,
                margin: 0,
                padding: "0 1rem",
              }}
            >
              {caption}
            </motion.p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
