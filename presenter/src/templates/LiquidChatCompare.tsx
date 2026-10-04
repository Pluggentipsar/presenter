"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import {
  AmbientBackdrop,
  glassCardStyle,
} from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMessage {
  role: string;
  text: string;
  side: "user" | "ai";
}

interface LiquidChatCompareProps {
  eyebrow?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  bottomLine?: string;
  /** Vänster pane caption — t.ex. "Lös åt mig". */
  leftLabel: string;
  /** Vänster pane subtitle/tagline. */
  leftCaption?: string;
  /** Vänster app-namn i headern. */
  leftApp?: string;
  /** Höger pane caption — t.ex. "Lär mig". */
  rightLabel: string;
  /** Höger pane subtitle/tagline. */
  rightCaption?: string;
  /** Höger app-namn i headern. */
  rightApp?: string;
  /**
   * Markdown-lista. Prefix `L ` eller `R ` framför `**Roll:** Text` styr
   * vilken pane meddelandet hamnar i. Roller som matchar /^(du|user|jag|elev)/i
   * blir user-bubblor (höger i pane).
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

function parsePaired(children: ReactNode): {
  left: ChatMessage[];
  right: ChatMessage[];
} {
  const left: ChatMessage[] = [];
  const right: ChatMessage[] = [];

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const paneMatch = raw.match(/^([LR])\s+(.*)$/s);
    const pane = paneMatch ? paneMatch[1].toUpperCase() : "L";
    const body = paneMatch ? paneMatch[2] : raw;
    const roleMatch = body.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    const role = roleMatch ? roleMatch[1].trim() : "";
    const text = roleMatch ? roleMatch[2].trim() : body.trim();
    const isUser = /^(du|user|jag|elev)/i.test(role);
    const msg: ChatMessage = { role, text, side: isUser ? "user" : "ai" };
    if (pane === "R") right.push(msg);
    else left.push(msg);
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

  return { left, right };
}

/**
 * Två LiquidChat-style chattfönster sida vid sida, för "samma fråga,
 * olika prompt"-jämförelser. Båda panes stegar i takt — varje space-tryck
 * avtäcker nästa meddelande i båda. Vänster pane får alert-tonad bubbel,
 * höger får accent-tonad — så jämförelsen blir grammatiskt läsbar utan
 * extra label.
 */
export function LiquidChatCompare({
  eyebrow,
  chapter,
  title,
  subtitle,
  bottomLine,
  leftLabel,
  leftCaption,
  leftApp = "ChatGPT",
  rightLabel,
  rightCaption,
  rightApp = "ChatGPT",
  children,
}: LiquidChatCompareProps) {
  const { left, right } = parsePaired(children);
  const totalSteps = Math.max(left.length, right.length);
  const step = useSlideSteps(totalSteps);
  const visibleLeft = left.slice(0, step + 1);
  const visibleRight = right.slice(0, step + 1);

  const alert = "var(--accent-alert, #ff5c7a)";
  const accent = "var(--accent)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2rem, 3.5vw, 3.2rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 1.8vh, 1.6rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {(eyebrow || chapter) ? (
            <div
              style={{
                display: "flex",
                gap: "1.4rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              {eyebrow ? (
                <span style={{ color: accent, fontWeight: 500 }}>{eyebrow}</span>
              ) : null}
              {chapter ? (
                <span style={{ color: "var(--text-muted)" }}>{chapter}</span>
              ) : null}
            </div>
          ) : <span />}
        </div>

        {/* Title */}
        {title ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: "44em" }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 3.4vw, 2.9rem)",
                fontWeight: 500,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.98rem, 1.15vw, 1.18rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: "0.55rem 0 0 0",
                  maxWidth: "40em",
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </motion.div>
        ) : null}

        {/* Två panes */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "clamp(1rem, 1.8vw, 1.8rem)",
            minHeight: 0,
          }}
        >
          <ChatPane
            label={leftLabel}
            caption={leftCaption}
            app={leftApp}
            tone="alert"
            tintColor={alert}
            messages={visibleLeft}
            delay={0.2}
          />
          <ChatPane
            label={rightLabel}
            caption={rightCaption}
            app={rightApp}
            tone="accent"
            tintColor={accent}
            messages={visibleRight}
            delay={0.35}
          />
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              borderTop: "1px solid var(--glass-border, rgba(0,0,0,0.1))",
              paddingTop: "clamp(0.85rem, 1.3vh, 1.1rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "64em",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function ChatPane({
  label,
  caption,
  app,
  tone,
  tintColor,
  messages,
  delay,
}: {
  label: string;
  caption?: string;
  app: string;
  tone: "alert" | "accent";
  tintColor: string;
  messages: ChatMessage[];
  delay: number;
}) {
  // Samma elev i båda panes → samma blåa bubbla. Det är AI-bubblan som
  // får tone-färg-tint (alert vs accent) så panes skiljer sig på sin
  // AI-respons, inte på eleven.
  const userBubble = "linear-gradient(180deg, #5B9DFF 0%, #2C7BFF 100%)";
  const aiBubbleBg =
    tone === "alert"
      ? `linear-gradient(180deg, ${withAlpha(tintColor, 0.18)} 0%, ${withAlpha(tintColor, 0.08)} 100%)`
      : "rgba(255,255,255,0.06)";
  const aiBubbleBorder =
    tone === "alert"
      ? `1px solid ${withAlpha(tintColor, 0.4)}`
      : "1px solid var(--glass-border, rgba(0,0,0,0.1))";
  // Status-pricken följer temats register i stället för en hårdkodad grön:
  // alert-panen märks med alert-accenten, accent-panen är neutralt dämpad.
  const headerDotColor =
    tone === "alert" ? "var(--accent-alert, #ff5c7a)" : "var(--text-muted)";

  return (
    <motion.div
      data-card=""
      data-chat-pane={tone}
      initial={{ opacity: 0, y: 22, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 26,
        delay,
      }}
      style={{
        ...glassCardStyle({ radius: "1.4rem", blur: 28, padding: "0" }),
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Pane label badge */}
      <div
        style={{
          padding: "0.85rem 1.2rem 0.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.15rem",
          borderBottom: "1px solid var(--glass-border, rgba(0,0,0,0.1))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: tintColor,
              fontWeight: 700,
            }}
          >
            {tone === "alert" ? "× Genväg" : "✓ Lärande"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 1.25vw, 1.2rem)",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.018em",
            }}
          >
            {label}
          </span>
        </div>
        {caption ? (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.78rem, 0.92vw, 0.92rem)",
              color: "var(--text-muted)",
              lineHeight: 1.4,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>

      {/* Chat-header (app + status) */}
      <div
        style={{
          padding: "0.7rem 1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
          borderBottom: "1px solid var(--glass-border, rgba(0,0,0,0.1))",
        }}
      >
        <div
          data-chat-avatar=""
          style={{
            width: "1.9rem",
            height: "1.9rem",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${tintColor} 0%, color-mix(in srgb, ${tintColor} 60%, #9D7AFF) 100%)`,
            boxShadow: `0 0 18px ${withAlpha(tintColor, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
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
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--bg)",
              letterSpacing: "-0.02em",
            }}
          >
            AI
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {app}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontFamily: "var(--font-body)",
              fontSize: "0.62rem",
              color: "var(--text-muted)",
            }}
          >
            <motion.span
              data-glow=""
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                display: "inline-block",
                width: "0.36rem",
                height: "0.36rem",
                borderRadius: "50%",
                background: headerDotColor,
                boxShadow: `0 0 6px ${withAlpha(headerDotColor, 0.6)}`,
              }}
            />
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "1rem 0.95rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.side === "user";
          const avatarBg = isUser
            ? "linear-gradient(135deg, #5B9DFF 0%, #2C7BFF 100%)"
            : tone === "alert"
              ? `linear-gradient(135deg, ${tintColor} 0%, color-mix(in srgb, ${tintColor} 60%, #9D7AFF) 100%)`
              : "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #9D7AFF) 100%)";
          const avatarGlow = isUser
            ? "rgba(44,123,255,0.45)"
            : tone === "alert"
              ? withAlpha(tintColor, 0.45)
              : "var(--accent-glow, rgba(0,0,0,0.4))";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 360,
                damping: 28,
                mass: 0.7,
              }}
              style={{
                alignSelf: isUser ? "flex-start" : "flex-end",
                maxWidth: "92%",
                display: "flex",
                alignItems: "flex-end",
                gap: "0.45rem",
                flexDirection: isUser ? "row" : "row-reverse",
              }}
            >
              {/* Avatar */}
              <div
                aria-hidden
                data-chat-avatar=""
                style={{
                  width: "1.85rem",
                  height: "1.85rem",
                  borderRadius: "50%",
                  background: avatarBg,
                  boxShadow: `0 0 12px ${avatarGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  color: "var(--bg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {isUser ? (
                  <svg
                    width="58%"
                    height="58%"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="3.6" />
                    <path d="M4.5 21 C 5.5 15.2, 18.5 15.2, 19.5 21" />
                  </svg>
                ) : (
                  "AI"
                )}
              </div>

              {/* Bubble */}
              <div
                data-chat-bubble={isUser ? "user" : "ai"}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: isUser
                    ? "1.1rem 1.1rem 1.1rem 0.35rem"
                    : "1.1rem 1.1rem 0.35rem 1.1rem",
                  background: isUser ? userBubble : aiBubbleBg,
                  backdropFilter: isUser ? undefined : "blur(18px) saturate(140%)",
                  WebkitBackdropFilter: isUser
                    ? undefined
                    : "blur(18px) saturate(140%)",
                  border: isUser ? "1px solid rgba(255,255,255,0.18)" : aiBubbleBorder,
                  boxShadow: isUser
                    ? "0 4px 14px rgba(44,123,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)"
                    : tone === "alert"
                      ? `0 3px 12px ${withAlpha(tintColor, 0.25)}, inset 0 1px 0 ${withAlpha(tintColor, 0.2)}`
                      : "0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                  color: isUser ? "#fff" : "var(--text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
                  lineHeight: 1.45,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    // Rollmärket ärver bubblans egen textfärg: i kobolt sätter
                    // temat bubblan till var(--bg) på fylld bläckyta, i övriga
                    // teman är den vit på den blå elevbubblan.
                    color: isUser ? "currentColor" : "var(--text-muted)",
                    fontWeight: 700,
                    marginBottom: "0.2rem",
                  }}
                >
                  {isUser ? "Elev" : "AI"}
                </div>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
