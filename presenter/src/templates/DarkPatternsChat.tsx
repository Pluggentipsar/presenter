"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Role = "user" | "ai";

interface ChatMessage {
  role: Role;
  text: string;
  /** Dark-pattern-namnet (visas som badge bredvid AI-meddelande). */
  pattern?: string;
  /** Kort förklaring under pattern-namnet. */
  patternHint?: string;
}

interface DarkPatternsChatProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Övergripande rubrik. */
  title?: string;
  /** Slutkomment under chatten. */
  punchline?: string;
  /**
   * Markdown-lista med en rad per meddelande.
   * Format för user: `- user · TEXT`
   * Format för AI: `- ai · TEXT · PATTERN_NAME · PATTERN_HINT`
   * (PATTERN_NAME och PATTERN_HINT är valfria — utelämnas för "rena" AI-meddelanden.)
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

function parseMessages(children: ReactNode): ChatMessage[] {
  const out: ChatMessage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [roleRaw = "user", text = "", pattern, patternHint] = parts;
    const role: Role = roleRaw === "ai" ? "ai" : "user";
    out.push({
      role,
      text,
      pattern: pattern || undefined,
      patternHint: patternHint || undefined,
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
  return out;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
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

interface MessageProps {
  message: ChatMessage;
  delay: number;
}

function Message({ message, delay }: MessageProps) {
  const isUser = message.role === "user";
  const hasPattern = message.role === "ai" && message.pattern;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: "clamp(0.6rem, 1vw, 1rem)",
        width: "100%",
      }}
    >
      {/* Bubble */}
      <div
        style={{
          maxWidth: hasPattern ? "26em" : "30em",
          padding: "clamp(0.8rem, 1.1vw, 1.05rem) clamp(1rem, 1.4vw, 1.3rem)",
          background: isUser
            ? "color-mix(in srgb, var(--text) 6%, transparent)"
            : "var(--accent-dim)",
          border: isUser
            ? "1px solid color-mix(in srgb, var(--text) 12%, transparent)"
            : "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
          borderRadius: "var(--radius)",
          borderTopRightRadius: isUser ? "0.1rem" : undefined,
          borderTopLeftRadius: !isUser ? "0.1rem" : undefined,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
          lineHeight: 1.45,
          color: "var(--text)",
          backdropFilter: "blur(6px)",
        }}
      >
        {renderInline(message.text)}
      </div>

      {/* Pattern-badge — bara för AI-meddelanden med pattern */}
      {hasPattern ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, x: -6 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.5, delay: delay + 0.6, ease: [0.22, 1.3, 0.36, 1] }}
          style={{
            flexShrink: 0,
            maxWidth: "13em",
            padding: "clamp(0.45rem, 0.7vw, 0.65rem) clamp(0.7rem, 1vw, 0.95rem)",
            background: "rgba(232, 77, 77, 0.12)",
            border: "1px solid rgba(232, 77, 77, 0.55)",
            borderRadius: "0.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
            position: "relative",
          }}
        >
          {/* Statisk dot — undviker infinite animation som blockerar headless-render */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "0.55rem",
              right: "0.55rem",
              width: "0.4rem",
              height: "0.4rem",
              borderRadius: "50%",
              background: "#E84D4D",
              boxShadow: "0 0 8px #E84D4D",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.78vw, 0.72rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--accent-alert)",
              fontWeight: 700,
              paddingRight: "0.8rem",
            }}
          >
            {message.pattern}
          </div>
          {message.patternHint ? (
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.82rem)",
                color: "color-mix(in srgb, var(--text) 75%, transparent)",
                lineHeight: 1.3,
                fontStyle: "italic",
              }}
            >
              {message.patternHint}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/**
 * DarkPatternsChat — animerad chat-mockup som identifierar
 * konkreta dark patterns i AI-companions.
 *
 * Inspirerad av De Freitas farväls-studie (Harvard Business School) som
 * analyserade 1200 chat-farväl och dokumenterade systematiska försök att
 * få användaren att stanna kvar. Visar mönstren konkret med röda badges
 * bredvid varje AI-meddelande som triggar dem.
 */
export function DarkPatternsChat({
  kicker,
  chapter,
  title,
  punchline,
  children,
}: DarkPatternsChatProps) {
  const messages = parseMessages(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--bg) 75%)",
      }}
    >
      {/* Subtle red glow as warning */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 30% at 70% 60%, rgba(232,77,77,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 4vw, 4rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.2rem)",
          zIndex: 2,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Title */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(1.5rem, 2.3vw, 2.2rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "32em",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Chat-flöde */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.9rem, 1.6vh, 1.4rem)",
            width: "100%",
            maxWidth: "min(56rem, 100%)",
          }}
        >
          {messages.map((m, i) => (
            <Message key={i} message={m} delay={0.6 + i * 0.85} />
          ))}
        </div>

        {/* Punchline */}
        {punchline ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 + messages.length * 0.85 + 0.4 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.4rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "40em",
              margin: 0,
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="punchline" value={punchline}>
              {renderInline(punchline)}
            </EditableText>
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
