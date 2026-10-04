"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useIsOverlay } from "./SlideWithOverlays";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FloatingPhone — overlay som renderar en mobiltelefon med chat på skärmen.
 *
 * Bra för att visa hur en elev/användare interagerar med en chatbot på sin
 * telefon — t.ex. skickar en skärmdump och frågar om innehållet. Animerar
 * meddelanden ett i taget med typing-indikator innan AI-svar.
 *
 * MDX-format:
 * ```mdx
 * <FloatingPhone
 *   x="48%" y="6%" width="32%"
 *   appName="ChatGPT"
 *   accent="#10a37f"
 * >
 * - **Du:** :screenshot Är de sura på mig?
 * - **AI:** Det är svårt att säga säkert utifrån bara konversationen...
 * </FloatingPhone>
 * ```
 *
 * Format per item: `**Avsändare:** text`. Texten kan börja med `:screenshot`
 * vilket renderas som en mockad skärmdump-bilaga ovanför meddelandet.
 * Avsändare som matchar /^(du|user|jag)/i blir user-bubbla (höger),
 * allt annat blir bot-bubbla (vänster).
 */

interface FloatingPhoneProps {
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  /** App-namn i header. */
  appName?: string;
  /** Tidsstämpel i status bar. */
  time?: string;
  /** Accent-färg på user-bubblor. */
  accent?: string;
  /** Auto-spela animationen. Default true. */
  autoplay?: boolean | string;
  /** ms mellan meddelanden. Default 1500. */
  beat?: number | string;
  /** Initial fördröjning innan första meddelandet. Default 700. */
  initialDelay?: number | string;
  children?: ReactNode;
}

interface ChatLine {
  side: "user" | "bot";
  label: string;
  text: string;
  hasScreenshot: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parseLines(children: ReactNode): ChatLine[] {
  const lines: ChatLine[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    let label = "";
    const textParts: string[] = [];
    let foundLabel = false;
    Children.forEach(li.props.children, (child) => {
      if (
        !foundLabel &&
        isValidElement(child) &&
        (child as ReactElement).type === "strong"
      ) {
        const inner = extractText(
          (child as ReactElement<{ children?: ReactNode }>).props.children,
        );
        label = inner.replace(/:\s*$/, "").trim();
        foundLabel = true;
      } else {
        textParts.push(extractText(child));
      }
    });
    let text = textParts.join("").trim();
    text = text.replace(/^:\s*/, "");

    if (!foundLabel) {
      const raw = extractText(li.props.children).trim();
      const md = raw.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
      if (md) {
        label = md[1].trim();
        text = md[2].trim();
      } else {
        text = raw;
      }
    }

    // Detect :screenshot marker
    const hasScreenshot = /:screenshot\b/i.test(text);
    text = text.replace(/:screenshot\b\s*/i, "").trim();

    const side: "user" | "bot" = /^(du|user|jag)\b/i.test(label)
      ? "user"
      : "bot";
    lines.push({ side, label, text, hasScreenshot });
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
  return lines;
}

export function FloatingPhone({
  x = "50%",
  y = "8%",
  width = "30%",
  height,
  rotation = 0,
  opacity = 1,
  zIndex = 10,
  appName = "ChatGPT",
  time = "14:23",
  accent = "#10a37f",
  autoplay = true,
  beat = 1500,
  initialDelay = 700,
  children,
}: FloatingPhoneProps) {
  const isOverlay = useIsOverlay();
  // useMemo så items behåller stabil referens mellan renders — annars kör
  // useEffect:en nedan om vid varje render (eftersom items är dep:en) och
  // hinner aldrig vänta ut typing+message-delayen för bot-svaren.
  const items = useMemo(() => parseLines(children), [children]);
  const beatNum = typeof beat === "string" ? parseInt(beat, 10) : beat;
  const initialDelayNum =
    typeof initialDelay === "string"
      ? parseInt(initialDelay, 10)
      : initialDelay;
  const autoplayBool =
    typeof autoplay === "string" ? autoplay !== "false" : autoplay;

  const [visibleCount, setVisibleCount] = useState(autoplayBool ? 0 : items.length);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (!autoplayBool) return;
    if (visibleCount >= items.length) {
      setShowTyping(false);
      return;
    }
    const next = items[visibleCount];
    const isFirst = visibleCount === 0;
    const isBot = next?.side === "bot";

    if (isBot) {
      const typingDelay = isFirst ? initialDelayNum : beatNum * 0.6;
      const messageDelay = typingDelay + beatNum;
      const t1 = setTimeout(() => setShowTyping(true), typingDelay);
      const t2 = setTimeout(() => {
        setShowTyping(false);
        setVisibleCount((n) => n + 1);
      }, messageDelay);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      const delay = isFirst ? initialDelayNum : beatNum * 0.7;
      const t = setTimeout(() => setVisibleCount((n) => n + 1), delay);
      return () => clearTimeout(t);
    }
  }, [autoplayBool, visibleCount, items, beatNum, initialDelayNum]);

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    transform: `rotate(${rotation}deg)`,
    opacity,
    zIndex,
    pointerEvents: "none",
    aspectRatio: height ? undefined : "9 / 19",
  };

  const phoneFrame = (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(165deg, #2a2a2c 0%, #1a1a1c 50%, #2a2a2c 100%)",
        borderRadius: "min(2.4rem, 7%)",
        padding: "0.5rem",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0c",
          borderRadius: "min(2rem, 6%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Dynamic island */}
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "30%",
            height: "1.4rem",
            background: "#000",
            borderRadius: "999px",
            zIndex: 5,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0.55rem 1.4rem 0.4rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.55rem, 0.7vw, 0.7rem)",
            fontWeight: 600,
            color: "rgba(245,246,250,0.92)",
          }}
        >
          <span>{time}</span>
          <span style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.7em" }}>●●●●</span>
            <span>5G</span>
            <span>🔋</span>
          </span>
        </div>

        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.5rem 0.9rem",
            borderBottom: "1px solid rgba(247,241,230,0.08)",
            background: "rgba(20,20,22,0.75)",
          }}
        >
          <div
            style={{
              width: "1.6rem",
              height: "1.6rem",
              borderRadius: "50%",
              background: accent,
              color: "#0a0908",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
              fontWeight: 600,
              color: "rgba(245,246,250,0.92)",
            }}
          >
            {appName}
          </span>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            padding: "0.7rem 0.7rem",
            overflow: "auto",
          }}
        >
          {items.slice(0, visibleCount).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems:
                  msg.side === "user" ? "flex-end" : "flex-start",
                gap: "0.3rem",
                maxWidth: "100%",
              }}
            >
              {msg.hasScreenshot ? (
                <ScreenshotMock side={msg.side} />
              ) : null}
              {msg.text ? (
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "1rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(0.55rem, 0.72vw, 0.72rem)",
                    lineHeight: 1.4,
                    background:
                      msg.side === "user"
                        ? accent
                        : "rgba(247,241,230,0.08)",
                    color:
                      msg.side === "user"
                        ? "#0a0908"
                        : "rgba(245,246,250,0.92)",
                    borderBottomRightRadius:
                      msg.side === "user" ? "0.25rem" : undefined,
                    borderBottomLeftRadius:
                      msg.side === "bot" ? "0.25rem" : undefined,
                  }}
                >
                  {msg.text}
                </div>
              ) : null}
            </motion.div>
          ))}

          {/* Typing-indikator */}
          <AnimatePresence>
            {showTyping ? (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.2rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "1rem",
                    background: "rgba(247,241,230,0.08)",
                    borderBottomLeftRadius: "0.25rem",
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      style={{
                        width: "0.32rem",
                        height: "0.32rem",
                        borderRadius: "50%",
                        background: "rgba(245,246,250,0.6)",
                        animation: `floatingphone-pulse 1.1s ${d * 0.18}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Input bar (visuell, ej funktionell) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.7rem",
            borderTop: "1px solid rgba(247,241,230,0.06)",
            background: "rgba(15,15,17,0.85)",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "0.4rem 0.7rem",
              borderRadius: "999px",
              background: "rgba(247,241,230,0.06)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.5rem, 0.65vw, 0.65rem)",
              color: "rgba(245,246,250,0.6)",
            }}
          >
            Skriv ett meddelande…
          </div>
          <div
            style={{
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0a0908"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "0.35rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "30%",
            height: "0.18rem",
            background: "rgba(245,246,250,0.6)",
            borderRadius: "999px",
          }}
        />
      </div>

      <style>{`
        @keyframes floatingphone-pulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }
      `}</style>
    </motion.div>
  );

  if (isOverlay) {
    return <div style={wrapperStyle}>{phoneFrame}</div>;
  }
  return (
    <div className="relative h-full w-full" style={{ background: "var(--slide-base, var(--bg))" }}>
      <div style={wrapperStyle}>{phoneFrame}</div>
    </div>
  );
}

// ============================================================================
// Mock screenshot — stiliserad gruppchatt
// ============================================================================

function ScreenshotMock({ side }: { side: "user" | "bot" }) {
  const isUser = side === "user";
  return (
    <div
      style={{
        maxWidth: "70%",
        padding: "0.4rem",
        borderRadius: "0.6rem",
        background: isUser
          ? "rgba(255,255,255,0.85)"
          : "rgba(247,241,230,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "0.18rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      }}
    >
      {/* "Header" på mock-screenshoten */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          paddingBottom: "0.18rem",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            width: "0.55rem",
            height: "0.55rem",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.2)",
          }}
        />
        <div
          style={{
            width: "40%",
            height: "0.3rem",
            borderRadius: "999px",
            background: "rgba(0,0,0,0.2)",
          }}
        />
      </div>
      {/* Mock-meddelanden i screenshoten */}
      {[
        { side: "left", width: "75%" },
        { side: "left", width: "55%" },
        { side: "right", width: "45%" },
        { side: "left", width: "65%" },
        { side: "right", width: "35%" },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: b.side === "right" ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              width: b.width,
              height: "0.45rem",
              borderRadius: "999px",
              background:
                b.side === "right" ? "rgba(36,121,235,0.5)" : "rgba(0,0,0,0.18)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
