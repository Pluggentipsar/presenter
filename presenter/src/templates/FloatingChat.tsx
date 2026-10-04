"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useIsOverlay } from "./SlideWithOverlays";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FloatingChat — animerad chat-widget som overlay.
 *
 * Visar en mockad chat med user-/AI-bubblor som rullar in en i taget.
 * Tänkt att läggas på en annan slide (t.ex. en BigStat) för att
 * illustrera ett konkret exempel bredvid en siffra.
 *
 * MDX-format:
 * ```mdx
 * <FloatingChat x="55%" y="14%" width="42%" widgetName="ChatGPT">
 * - **Du:** Jag vill tvätta bilen. Biltvätten är 50 meter bort.
 * - **AI:** Gå. När du startat bilen, spänt fast bältet...
 * </FloatingChat>
 * ```
 *
 * Avsändare som matchar /^(du|user|jag)/i blir user-bubbla (höger),
 * allt annat blir bot-bubbla (vänster).
 */

interface FloatingChatProps {
  /** Horisontell position (procent eller px). */
  x?: string;
  /** Vertikal position. */
  y?: string;
  /** Bredd. */
  width?: string;
  /** Höjd (auto om inte angiven). */
  height?: string;
  /** Rotation i grader. */
  rotation?: number;
  /** Opacitet. */
  opacity?: number;
  /** Z-index. */
  zIndex?: number;
  /** Brand-namn i widget-headern. */
  widgetName?: string;
  /** Status-text under brand-namnet. */
  widgetStatus?: string;
  /** Accent-färg på user-bubblor. */
  accent?: string;
  /** Visa Mac-style window-dots. Default false (renare editorial-look). */
  showWindowControls?: boolean;
  /** Liten kicker-rubrik ovanför widgeten (t.ex. "EXEMPEL"). */
  kicker?: string;
  /** Auto-spela animationen. Default true. */
  autoplay?: boolean | string;
  /** ms mellan meddelanden under autoplay. Default 1400. */
  beat?: number | string;
  /** Initial fördröjning innan första meddelandet (ms). Default 600. */
  initialDelay?: number | string;
  /** Markdown-lista där varje punkt är ett meddelande. */
  children?: ReactNode;
}

interface ChatLine {
  side: "user" | "bot";
  label: string;
  text: string;
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
    // MDX renderar **Label:** som <strong>Label:</strong> så asterisker
    // är borta när vi tittar i React-trädet. Vi måste därför leta efter
    // en <strong>-nod som första child i li:t — den är "labeln" — och
    // resten av syskon är meddelande-texten.
    let label = "";
    let textParts: string[] = [];
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
    // Om labeln slutade utan kolon, kan kolon ligga som första tecken
    // i textdelen ("Du" + ": Jag vill...") — strippa det.
    text = text.replace(/^:\s*/, "");

    // Fallback: om vi inte hittade någon <strong>-nod, försök plain-text
    // "Label: text" eller "**Label:** text" (för rena strängar).
    if (!foundLabel) {
      const raw = extractText(li.props.children).trim();
      const md = raw.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
      if (md) {
        label = md[1].trim();
        text = md[2].trim();
      } else {
        const plain = raw.match(/^([A-Za-zÅÄÖåäö][^:]{0,20}):\s*(.*)$/s);
        if (plain) {
          label = plain[1].trim();
          text = plain[2].trim();
        } else {
          text = raw;
        }
      }
    }

    const side: "user" | "bot" = /^(du|user|jag)\b/i.test(label)
      ? "user"
      : "bot";
    lines.push({ side, label, text });
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

export function FloatingChat({
  x = "55%",
  y = "14%",
  width = "42%",
  height,
  rotation = 0,
  opacity = 1,
  zIndex = 10,
  widgetName = "ChatGPT",
  widgetStatus = "Online",
  accent = "var(--accent)",
  showWindowControls = false,
  kicker,
  autoplay = true,
  beat = 1400,
  initialDelay = 600,
  children,
}: FloatingChatProps) {
  const isOverlay = useIsOverlay();
  const items = parseLines(children);
  const beatNum = typeof beat === "string" ? parseInt(beat, 10) : beat;
  const initialDelayNum =
    typeof initialDelay === "string"
      ? parseInt(initialDelay, 10)
      : initialDelay;
  const autoplayBool =
    typeof autoplay === "string" ? autoplay !== "false" : autoplay;

  const [visibleCount, setVisibleCount] = useState(autoplayBool ? 0 : items.length);
  const [showTyping, setShowTyping] = useState(false);

  // Drivande timeline: visa typing-indikatorn innan AI-svar.
  // För user-meddelanden går det direkt; för bot-meddelanden visar vi
  // typing-prick i ~beat ms innan meddelandet rullar in.
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
      // Visa typing efter en kort delay, sen meddelandet
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
      // User-meddelande — bara fade-in efter delay
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
  };

  const widget = (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(20,18,16,0.72)",
        border: "1px solid rgba(247,241,230,0.1)",
        borderRadius: "0.85rem",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        overflow: "hidden",
      }}
    >
      {/* Mac-style window dots — bara om explicit påslagen */}
      {showWindowControls ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.7rem 1rem",
            borderBottom: "1px solid rgba(247,241,230,0.06)",
          }}
        >
          <span
            style={{
              width: "0.6rem",
              height: "0.6rem",
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <span
            style={{
              width: "0.6rem",
              height: "0.6rem",
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <span
            style={{
              width: "0.6rem",
              height: "0.6rem",
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
        </div>
      ) : null}

      {/* Brand bar — minimalistisk, bara identifierande */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          padding: "0.7rem 1rem",
          borderBottom: "1px solid rgba(247,241,230,0.06)",
        }}
      >
        <div
          style={{
            width: "1.4rem",
            height: "1.4rem",
            borderRadius: "50%",
            background: accent,
            color: "#0a0908",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--text)",
            letterSpacing: "0.01em",
          }}
        >
          {widgetName}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "0.35rem",
              height: "0.35rem",
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          {widgetStatus}
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          padding: "0.9rem",
          minHeight: "8rem",
        }}
      >
        {items.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              justifyContent: msg.side === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "82%",
                padding: "0.7rem 1rem",
                borderRadius: "1.1rem",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.85rem, 1vw, 1rem)",
                lineHeight: 1.45,
                background:
                  msg.side === "user"
                    ? accent
                    : "rgba(247,241,230,0.07)",
                color: msg.side === "user" ? "#0a0908" : "var(--text)",
                borderBottomRightRadius:
                  msg.side === "user" ? "0.35rem" : undefined,
                borderBottomLeftRadius:
                  msg.side === "bot" ? "0.35rem" : undefined,
              }}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Typing-indikator */}
        {showTyping ? (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 6 }}
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
                gap: "0.3rem",
                padding: "0.85rem 1rem",
                borderRadius: "1.1rem",
                background: "rgba(247,241,230,0.07)",
                borderBottomLeftRadius: "0.35rem",
              }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: "var(--text-muted)",
                    animation: `floatingchat-pulse 1.1s ${d * 0.18}s infinite ease-in-out`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <style>{`
        @keyframes floatingchat-pulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </motion.div>
  );

  const widgetWithKicker = kicker ? (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.62rem, 0.75vw, 0.78rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: `${withAlpha(accent, 0.8)}`,
          marginBottom: "0.65rem",
        }}
      >
        {kicker}
      </motion.div>
      {widget}
    </>
  ) : (
    widget
  );

  // Som overlay: bara widgeten, ingen slide-canvas runtom
  if (isOverlay) {
    return <div style={wrapperStyle}>{widgetWithKicker}</div>;
  }

  // Standalone (om någon använder den utanför overlay-system)
  return (
    <div className="relative h-full w-full" style={{ background: "var(--slide-base, var(--bg))" }}>
      <div style={wrapperStyle}>{widgetWithKicker}</div>
    </div>
  );
}
