"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMessage {
  role: string;
  text: string;
  side: "user" | "ai";
}

interface ChatColumn {
  /** Header på chattfönstret (typ "ChatGPT" eller "Hej AI") */
  app?: string;
  /** Liten label ovanför fönstret, t.ex. "12-timmars kodning" */
  caption?: string;
  /** Meddelanden i fönstret */
  messages: ChatMessage[];
}

interface ChatMockupProps {
  eyebrow?: string;
  title?: string;
  bottomLine?: string;

  /** Single-mode: app-namn på fönsterheadern. */
  app?: string;
  /**
   * Single-mode: accentfärg på app-headern + user-bubblan. Default är
   * `var(--accent)` (matchar temat). Använd för att differentiera olika
   * AI-verktyg, t.ex. `#7C3AED` för Suno.
   */
  appAccent?: string;

  /** Split-mode: två chats sida-vid-sida. */
  split?: boolean;
  /**
   * Split-mode reveal:
   * - "alternating" (default) — L, R, L, R … (jämför parallellt)
   * - "leftFirst" — alla L-meddelanden först, sen alla R (visa en hel
   *   konversation åt gången).
   */
  splitReveal?: "alternating" | "leftFirst";
  /** Split-mode: vänster fönster app-namn + valfri caption */
  leftApp?: string;
  leftCaption?: string;
  /** Split-mode: höger fönster app-namn + valfri caption */
  rightApp?: string;
  rightCaption?: string;

  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";

  /**
   * Meddelanden via en MDX-lista. Format per rad:
   *
   * Single-mode:
   *   - **Du:** Text-text-text
   *   - **ChatGPT:** Svar-text
   *
   * Split-mode (prefix L eller R före label):
   *   - L **Du:** Vänster-prompt
   *   - L **ChatGPT:** Vänster-svar
   *   - R **Du:** Höger-prompt
   *   - R **ChatGPT:** Höger-svar
   *
   * Avsändare som matchar /^(du|user|jag|elev)/i blir user-bubble (höger).
   * Övriga blir ai-bubble (vänster).
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

interface ParsedLine {
  side: "user" | "ai";
  role: string;
  text: string;
  /** "L" eller "R" om split-mode-prefix användes, annars undefined */
  column?: "L" | "R";
}

function parseLines(children: ReactNode): ParsedLine[] {
  const out: ParsedLine[] = [];

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;

    let column: "L" | "R" | undefined;
    let rest = raw;
    const sideMatch = raw.match(/^([LR])\s+(.*)$/is);
    if (sideMatch) {
      column = sideMatch[1].toUpperCase() as "L" | "R";
      rest = sideMatch[2].trim();
    }

    // Plocka ut "**Roll:** text"
    const roleMatch = rest.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    let role = "";
    let text = rest;
    if (roleMatch) {
      role = roleMatch[1].trim();
      text = roleMatch[2].trim();
    }

    const isUser = /^(du|user|jag|elev)\b/i.test(role);
    out.push({
      side: isUser ? "user" : "ai",
      role,
      text,
      column,
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

export function ChatMockup({
  eyebrow,
  title,
  bottomLine,
  app = "Hej AI",
  appAccent,
  split = false,
  splitReveal = "alternating",
  leftApp,
  leftCaption,
  rightApp,
  rightCaption,
  background,
  overlay,
  overlayMode = "light",
  children,
}: ChatMockupProps) {
  const reduce = useReducedMotion();

  const lines = parseLines(children);

  // Konvertera parsade linjer till ChatMessage (utan column-info för rendering)
  const toMessage = (l: ParsedLine): ChatMessage => ({
    role: l.role,
    text: l.text,
    side: l.side,
  });

  const single: ChatColumn = {
    app,
    messages: split ? [] : lines.map(toMessage),
  };
  const left: ChatColumn = {
    app: leftApp ?? "Hej AI",
    caption: leftCaption,
    messages: split
      ? lines.filter((l) => l.column === "L").map(toMessage)
      : [],
  };
  const right: ChatColumn = {
    app: rightApp ?? "Hej AI",
    caption: rightCaption,
    messages: split
      ? lines.filter((l) => l.column === "R").map(toMessage)
      : [],
  };

  // Total reveal-steg: ett per meddelande totalt + 1 för bottomLine
  const totalMessages = split
    ? left.messages.length + right.messages.length
    : single.messages.length;
  const totalSteps = totalMessages + (bottomLine ? 1 : 0);
  // Ett läge per meddelande (och bottomLine) PLUS utgångsläget utan något.
  // useSlideSteps(n) ger n lägen, 0 … n−1: med bara totalSteps kom det sista
  // meddelandet — eller bottomLine — aldrig fram i spelaren.
  const step = useSlideSteps(totalSteps + 1);

  // Vid split: två reveal-modes
  // - "alternating" (default): L, R, L, R … (jämför parallellt)
  // - "leftFirst": alla L först, sen alla R (visa en hel konversation åt
  //   gången — perfekt när två konversationer demonstrerar *olika* användning).
  const visibleLeft = split
    ? splitReveal === "leftFirst"
      ? Math.min(left.messages.length, step)
      : Math.min(left.messages.length, Math.ceil(step / 2))
    : 0;
  const visibleRight = split
    ? splitReveal === "leftFirst"
      ? Math.min(right.messages.length, Math.max(0, step - left.messages.length))
      : Math.min(right.messages.length, Math.floor(step / 2))
    : 0;
  const visibleSingle = split ? 0 : Math.min(single.messages.length, step);
  const showBottom = bottomLine ? step > totalMessages : false;

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="compare" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12">
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {title ? (
          <motion.h1
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            className="mb-6 text-center leading-[0.92] tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(2.2rem, 4.8vw, 4.8rem)",
              color: "var(--text)",
              textShadow: "var(--title-shadow, none)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </motion.h1>
        ) : null}

        {split ? (
          <div className="grid flex-1 grid-cols-2 gap-6 lg:gap-10 mt-2">
            <ChatWindow
              column={left}
              shadowVar="--card-shadow"
              tilt={reduce ? 0 : -1.0}
              visibleCount={visibleLeft}
              reduce={!!reduce}
              accent="var(--accent)"
            />
            <ChatWindow
              column={right}
              shadowVar="--card-shadow-alt"
              tilt={reduce ? 0 : 1.2}
              visibleCount={visibleRight}
              reduce={!!reduce}
              accent="var(--ornament-color)"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center mt-2">
            <div className="w-full" style={{ maxWidth: "44rem" }}>
              <ChatWindow
                column={single}
                shadowVar="--card-shadow"
                tilt={reduce ? 0 : -0.6}
                visibleCount={visibleSingle}
                reduce={!!reduce}
                accent={appAccent ?? "var(--accent)"}
              />
            </div>
          </div>
        )}

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: showBottom ? 1 : 0,
              y: showBottom ? 0 : 14,
              scale: showBottom ? 1 : 0.94,
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-8 py-3 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.2rem, 2.0vw, 2.0rem)",
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function ChatWindow({
  column,
  shadowVar,
  tilt,
  visibleCount,
  reduce,
  accent,
}: {
  column: ChatColumn;
  shadowVar: string;
  tilt: number;
  visibleCount: number;
  reduce: boolean;
  accent: string;
}) {
  return (
    <div className="flex flex-col">
      {column.caption ? (
        <div
          className="mb-3 self-center"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.75rem, 1vw, 1rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {column.caption}
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12, rotate: tilt - 2 }}
        animate={{ opacity: 1, y: 0, rotate: tilt }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          background: "var(--bg-surface)",
          border: "var(--card-border, 1px solid color-mix(in srgb, var(--text) 15%, transparent))",
          borderRadius: "var(--radius)",
          boxShadow: `var(${shadowVar}, 0 8px 24px rgba(0,0,0,0.12))`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: "clamp(18rem, 32vh, 28rem)",
        }}
      >
        {/* Window-header: app-namn + dot-indikator */}
        <div
          className="flex items-center justify-between"
          style={{
            background: accent,
            color: "var(--bg)",
            padding: "0.6rem 1rem",
            borderBottom: "var(--card-border, 1px solid color-mix(in srgb, var(--text) 15%, transparent))",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="rounded-full"
              style={{
                width: "0.65rem",
                height: "0.65rem",
                background: "var(--bg)",
                opacity: 0.95,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(0.9rem, 1.2vw, 1.2rem)",
                letterSpacing: "0.01em",
              }}
            >
              {column.app}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5"
            style={{ opacity: 0.85 }}
          >
            <span
              className="rounded-full"
              style={{
                width: "0.5rem",
                height: "0.5rem",
                background: "var(--bg)",
              }}
            />
            <span
              className="rounded-full"
              style={{
                width: "0.5rem",
                height: "0.5rem",
                background: "var(--bg)",
              }}
            />
            <span
              className="rounded-full"
              style={{
                width: "0.5rem",
                height: "0.5rem",
                background: "var(--bg)",
              }}
            />
          </div>
        </div>

        {/* Meddelandeyta */}
        <div
          className="flex-1 flex flex-col gap-3 overflow-hidden"
          style={{
            padding: "clamp(0.9rem, 1.4vw, 1.4rem)",
            background: "var(--bg-surface)",
          }}
        >
          {column.messages.map((msg, i) => {
            const visible = i < visibleCount;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: visible ? 1 : 0,
                  y: visible ? 0 : 8,
                  scale: visible ? 1 : 0.96,
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: reduce ? 0 : 0.05,
                }}
                className={`flex ${msg.side === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  data-card="flat"
                  style={{
                    maxWidth: "85%",
                    background:
                      msg.side === "user" ? accent : "var(--bg)",
                    color:
                      msg.side === "user" ? "var(--bg)" : "var(--text)",
                    border: "var(--card-border, 1px solid color-mix(in srgb, var(--text) 15%, transparent))",
                    borderRadius: "1.2rem",
                    borderBottomRightRadius: msg.side === "user" ? "0.3rem" : "1.2rem",
                    borderBottomLeftRadius: msg.side === "user" ? "1.2rem" : "0.3rem",
                    padding: "clamp(0.55rem, 0.9vw, 0.85rem) clamp(0.85rem, 1.2vw, 1.15rem)",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    boxShadow: "var(--card-shadow, 0 2px 10px rgba(0,0,0,0.12))",
                  }}
                >
                  {msg.role && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        opacity: 0.7,
                        marginBottom: "0.15rem",
                      }}
                    >
                      {msg.role}
                    </div>
                  )}
                  <div>{msg.text}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

export default ChatMockup;
