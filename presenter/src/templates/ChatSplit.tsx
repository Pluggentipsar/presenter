"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMessage {
  side: "left" | "right";
  role: string; // "Du", "ChatGPT", etc.
  text: string;
}

interface ChatSplitProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  leftTitle?: string;
  leftSubtitle?: string;
  leftAccent?: string;
  rightTitle?: string;
  rightSubtitle?: string;
  rightAccent?: string;
  background?: string;
  chapter?: string;
  /** Markdown-lista. Format: `- L **Roll:** text` eller `- R **Roll:** text`. */
  children?: ReactNode;
}

// ============================================================================
// Parsing: ta en MDX-lista där varje rad inleds med L eller R + space
// och sedan "**Roll:** text". Returnera array av meddelanden per sida.
// ============================================================================

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

function parseMessages(children: ReactNode): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    // Hitta första tecknet (L eller R) följt av whitespace
    const sideMatch = raw.match(/^([LR])\s+(.*)$/is);
    if (!sideMatch) return;
    const side = sideMatch[1] === "L" ? "left" : "right";
    const rest = sideMatch[2].trim();
    // Plocka ut "**Roll:** text"
    const roleMatch = rest.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    if (!roleMatch) {
      messages.push({ side, role: "", text: rest });
      return;
    }
    messages.push({
      side,
      role: roleMatch[1].trim(),
      text: roleMatch[2].trim(),
    });
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
  return messages;
}

function resolveBackground(bg: string | undefined): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.72), rgba(10,9,8,0.82)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// ============================================================================
// Template: två chat-kolumner sida vid sida med header, subtitle, meddelanden.
// ============================================================================

export function ChatSplit({
  kicker,
  title,
  subtitle,
  leftTitle = "A",
  leftSubtitle,
  leftAccent = "#6A6763",
  rightTitle = "B",
  rightSubtitle,
  rightAccent = "var(--accent)",
  background,
  chapter,
  children,
}: ChatSplitProps) {
  const messages = parseMessages(children);
  const leftMessages = messages.filter((m) => m.side === "left");
  const rightMessages = messages.filter((m) => m.side === "right");

  // Bara när en bild/URL skickas in lägger resolveBackground på en mörk scrim.
  // Då sitter slide:n mörk på alla teman → fixerat ljus text. Annars följer temat.
  const onPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Chapter-markör */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3rem)",
            right: "clamp(2rem, 4vw, 3rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.8rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.6rem",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: rightAccent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.8vw, 3.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)",
                margin: 0,
                maxWidth: "22em",
                textShadow: onPhoto ? "0 6px 30px rgba(0,0,0,0.5)" : "none",
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.25vw, 1.35rem)",
                lineHeight: 1.4,
                color: onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)",
                maxWidth: "34em",
                margin: 0,
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Två chat-kolumner */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <ChatColumn
            title={leftTitle}
            subtitle={leftSubtitle}
            accent={leftAccent}
            messages={leftMessages}
            side="left"
            baseDelay={0.5}
            onPhoto={onPhoto}
          />
          <ChatColumn
            title={rightTitle}
            subtitle={rightSubtitle}
            accent={rightAccent}
            messages={rightMessages}
            side="right"
            baseDelay={0.8}
            onPhoto={onPhoto}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ChatColumn: en kolumn med header + stacked meddelanden.
// ============================================================================

interface ChatColumnProps {
  title: string;
  subtitle?: string;
  accent: string;
  messages: ChatMessage[];
  side: "left" | "right";
  baseDelay: number;
  onPhoto: boolean;
}

function ChatColumn({
  title,
  subtitle,
  accent,
  messages,
  baseDelay,
  onPhoto,
}: ChatColumnProps) {
  // Färger för text/ytor inuti kolumnen. På foto-scrim är slide:n mörk på alla
  // teman → fixerat ljus. Annars följer kolumnen temat (ljus på dagsljus).
  const colText = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const colMuted = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const colBg = onPhoto ? "rgba(20, 18, 15, 0.55)" : "var(--bg-surface)";
  const bubbleAiBg = onPhoto ? "rgba(247,241,230,0.08)" : "var(--bg-elevated)";
  const bubbleAiBorder = onPhoto
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.1)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: baseDelay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        padding: "clamp(1rem, 1.5vw, 1.5rem)",
        borderRadius: "1rem",
        background: colBg,
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        border: `1px solid ${withAlpha(accent, 0.25)}`,
        boxShadow: `0 18px 40px -12px rgba(0,0,0,0.4), 0 0 30px -15px ${withAlpha(accent, 0.2)}`,
        minHeight: 0,
      }}
    >
      {/* Kolumnheader */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.3rem",
          paddingBottom: "0.8rem",
          borderBottom: `1px solid ${withAlpha(accent, 0.21)}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.8rem, 1vw, 1rem)",
            fontWeight: 700,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.85rem, 1vw, 1rem)",
              color: colMuted,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {messages.map((m, i) => {
          const isUser = /du|jag|user|lärare|elev/i.test(m.role);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: baseDelay + 0.5 + i * 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "92%",
                borderRadius: "1rem",
                borderTopLeftRadius: !isUser ? "0.3rem" : "1rem",
                borderTopRightRadius: isUser ? "0.3rem" : "1rem",
                padding: "0.7rem 0.95rem",
                background: isUser
                  ? `${withAlpha(accent, 0.13)}`
                  : bubbleAiBg,
                border: `1px solid ${isUser ? accent + "40" : bubbleAiBorder}`,
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.3)",
              }}
            >
              {m.role ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.62rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: isUser ? accent : colMuted,
                    marginBottom: "0.35rem",
                  }}
                >
                  {m.role}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.82rem, 0.95vw, 1rem)",
                  lineHeight: 1.5,
                  color: colText,
                }}
              >
                {renderBoldItalic(m.text, accent)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function renderBoldItalic(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
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
