"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import {
  AmbientBackdrop,
  glassCardStyle,
} from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

export interface ChatMessage {
  role: string;
  text: string;
  side: "user" | "ai";
}

interface LiquidChatProps {
  /** Mono-kicker uppe till vänster. */
  eyebrow?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor hero-titel. */
  title?: string;
  /** Subtitle under title. */
  subtitle?: string;
  /** Linje längst nere (italic, mindre). */
  bottomLine?: string;
  /** App-namn i chat-headern. */
  app?: string;
  /** Status-text i headern. Default "Online". */
  status?: string;
  /** Bakgrundsbild/video som glasset refrakterar mot. */
  background?: string;
  /** Apple Messages-blå för user-bubblor. Default electric blue. */
  userColor?: string;
  /** Sekundär accent för ambient-orbs. */
  accent2?: string;
  /** Visa typing-indicator mellan AI-bubblor. Default true. */
  showTyping?: boolean;
  /**
   * Markdown-lista. Format: `- **Roll:** Text`
   * Roller som matchar /^(du|user|jag|elev)/i blir user-bubblor (höger).
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

export function parseMessages(children: ReactNode): ChatMessage[] {
  const out: ChatMessage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const roleMatch = raw.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    let role = "";
    let text = raw;
    if (roleMatch) {
      role = roleMatch[1].trim();
      text = roleMatch[2].trim();
    }
    const isUser = /^(du|user|jag|elev)\b/i.test(role);
    out.push({ role, text, side: isUser ? "user" : "ai" });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

export function TypingDots({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: "0.32rem",
        alignItems: "center",
        padding: "0.7rem 1rem",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{
            y: [0, -5, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
          style={{
            display: "inline-block",
            width: "0.42rem",
            height: "0.42rem",
            borderRadius: "50%",
            background: color,
          }}
        />
      ))}
    </div>
  );
}

export function LiquidChat({
  eyebrow,
  chapter,
  title,
  subtitle,
  bottomLine,
  app = "Messages",
  status = "Online",
  background,
  userColor = "linear-gradient(180deg, #5B9DFF 0%, #2C7BFF 100%)",
  accent2,
  showTyping = true,
  children,
}: LiquidChatProps) {
  const messages = parseMessages(children);
  const stepCount = messages.length;
  const step = useSlideSteps(stepCount);
  const visibleCount = Math.min(step + 1, messages.length);
  const visibleMessages = messages.slice(0, visibleCount);
  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const nextIsAi =
    visibleCount < messages.length && messages[visibleCount]?.side === "ai";
  const showTypingDots =
    showTyping &&
    visibleCount > 0 &&
    visibleCount < messages.length &&
    lastMessage?.side === "user" &&
    nextIsAi;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} />

      {/* Layout */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.5rem, 4vw, 4rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "center",
        }}
      >
        {/* Vänster: text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.5rem)",
            maxWidth: "32em",
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
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
                fontWeight: 500,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.05rem, 1.3vw, 1.3rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
          {bottomLine ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: 0.4 + visibleCount * 0.12,
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.05rem, 1.3vw, 1.3rem)",
                color: "var(--text)",
                marginTop: "auto",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                lineHeight: 1.4,
                opacity: 0.92,
              }}
            >
              {bottomLine}
            </motion.div>
          ) : null}
        </div>

        {/* Höger: chat-window */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 30,
            mass: 0.9,
          }}
          style={{
            ...glassCardStyle({ radius: "1.75rem", blur: 30, padding: "0" }),
            display: "flex",
            flexDirection: "column",
            maxHeight: "min(85vh, 720px)",
            position: "relative",
          }}
        >
          {/* Drifting specular highlight */}
          <motion.div
            aria-hidden
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "100%", opacity: [0, 0.6, 0] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              repeatDelay: 4,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "60%",
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 3,
              borderRadius: "inherit",
            }}
          />

          {/* Chat-header */}
          <div
            style={{
              padding: "1.1rem 1.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              borderBottom: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "2.4rem",
                height: "2.4rem",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #9D7AFF) 100%)",
                boxShadow:
                  "0 0 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.3)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  // Glyfen ska läsas mot den mättade accent-disken på BÅDE teman.
                  // var(--bg) = nära-vit på dagsljus (mot mörkgrön disk),
                  // nära-svart på nattglas (mot ljusblå disk) — alltid kontrast.
                  color: "var(--bg)",
                  letterSpacing: "-0.02em",
                }}
              >
                AI
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {app}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    display: "inline-block",
                    width: "0.42rem",
                    height: "0.42rem",
                    borderRadius: "50%",
                    background: "#4ADE80",
                    boxShadow: "0 0 8px rgba(74,222,128,0.6)",
                  }}
                />
                {status}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "1.4rem 1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              overflowY: "auto",
              position: "relative",
              zIndex: 2,
            }}
          >
            <AnimatePresence initial={false}>
              {visibleMessages.map((msg, i) => {
                const isUser = msg.side === "user";
                return (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      y: 18,
                      scale: 0.88,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 28,
                      mass: 0.7,
                    }}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "0.7rem 1rem",
                      borderRadius: isUser
                        ? "1.3rem 1.3rem 0.4rem 1.3rem"
                        : "1.3rem 1.3rem 1.3rem 0.4rem",
                      // AI-bubblan är en generisk frostad bubbla INUTI det
                      // tema-styrda glas-cardet — den måste följa temat.
                      // rgba(255,255,255,0.06) försvinner på ljust (vit-på-vit);
                      // var(--bg-elevated) ger en synlig bubbla på BÅDE teman.
                      // User-bubblan är en iMessage-blå brand-bubbla → behåller
                      // sin blå fyllning + vit text på alla teman.
                      background: isUser
                        ? userColor
                        : "var(--bg-elevated, rgba(255,255,255,0.06))",
                      backdropFilter: isUser ? undefined : "blur(18px) saturate(140%)",
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
                      position: "relative",
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
                    // Samma som AI-bubblan: tema-styrd så den syns på ljust.
                    background: "var(--bg-elevated, rgba(255,255,255,0.06))",
                    backdropFilter: "blur(18px) saturate(140%)",
                    WebkitBackdropFilter: "blur(18px) saturate(140%)",
                    border:
                      "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                    borderRadius: "1.3rem 1.3rem 1.3rem 0.4rem",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  }}
                >
                  <TypingDots color="var(--text-muted)" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Bottom hint */}
          <div
            style={{
              padding: "0.75rem 1.2rem",
              borderTop: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              // var(--text-muted) × 0.55 blir oläsligt mot nära-vit på ljust.
              // 0.8 håller den sekundär men läsbar på BÅDE teman.
              color: "var(--text-muted)",
              opacity: 0.8,
              textAlign: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            {visibleCount} / {messages.length}
            {visibleCount < messages.length ? " · tryck för nästa" : " · slut"}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
