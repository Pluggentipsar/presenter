"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface ChatPreviewProps {
  projector?: boolean;
  /** Rubrik bredvid widget-mockupen */
  title?: string;
  /** Underrubrik/tag */
  tag?: string;
  /** Brand-namn som visas i widget-headern (default "Chatt") */
  widgetName?: string;
  /** Subtitle i widget-headern, t.ex. "Online nu • Anonymt" */
  widgetStatus?: string;
  /** Färg på widget-accent (default = tema-accent) */
  widgetAccent?: string;
  /** Layout: text-left + chat-right (default) eller tvärtom */
  chatPosition?: "left" | "right";
  /** Storlek på rubriken */
  titleSize?: Size;
  /**
   * Beskrivande text under titeln (om du vill ha en split-layout med
   * förklaring bredvid mockupen).
   */
  description?: string;
  /** Auto-spela animationen (default true). False = visa allt direkt. */
  autoplay?: boolean | string;
  /** ms mellan meddelanden under autoplay */
  beat?: number | string;
  /**
   * Stegvis avslöjning via space/pil istället för autoplay.
   * Tar över från autoplay när satt — ett meddelande per steg.
   */
  stepped?: boolean | string;
  /**
   * Markdown-lista i children:
   *  - **Du:** Är det här våld?
   *  - **Stödchatten:** Det du beskriver låter allvarligt...
   * Avsändare som matchar /^(du|user|jag)/i går höger (user-bubble),
   * allt annat går vänster (bot-bubble).
   */
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3vw, 2.5rem)",
  md: "clamp(2rem, 4vw, 3.25rem)",
  lg: "clamp(2.75rem, 5.5vw, 4.5rem)",
  xl: "clamp(3.5rem, 7vw, 6rem)",
};

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
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseLines(children: ReactNode): ChatLine[] {
  const lines: ChatLine[] = [];

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    // MDX renderar **Label:** som <strong>Label:</strong>. Hitta första
    // <strong> som första child = labeln, resten = meddelande-texten.
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
        const plain = raw.match(/^([A-Za-zÅÄÖåäö][^:]{0,20}):\s*(.*)$/s);
        if (plain) {
          label = plain[1].trim();
          text = plain[2].trim();
        } else {
          text = raw;
        }
      }
    }

    // Alla mänskliga avsändare hör hemma på user-sidan. Tidigare matchade
    // bara du/user/jag, vilket lade "Eleven" på AI:ns sida — i en dialog
    // mellan elev och chattbot hamnade båda i samma grå bubbla.
    const side: "user" | "bot" =
      /^(du|user|jag|vi|elev|läraren|lärare|assistent|personal|pedagog)/i.test(label)
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

/**
 * ChatPreview — visar en mockad chattwidget i en faux browser-frame
 * tillsammans med en rubrik/text. Skapad för en produktpitch för att
 * visa själva produkten istället för att bara prata om den.
 */
export function ChatPreview({
  projector = false,
  title,
  tag,
  widgetName = "Chatt",
  widgetStatus = "Online nu",
  widgetAccent,
  chatPosition = "right",
  titleSize = "md",
  description,
  autoplay = true,
  beat = 900,
  stepped,
  children,
}: ChatPreviewProps) {
  const accent = widgetAccent ?? "var(--accent)";
  const beatNum = typeof beat === "string" ? parseInt(beat, 10) : beat;
  const steppedBool =
    projector || (typeof stepped === "string" ? stepped !== "false" : !!stepped);
  const autoplayBool =
    steppedBool
      ? false
      : typeof autoplay === "string"
        ? autoplay !== "false"
        : autoplay;

  const items = parseLines(children);
  const activeStep = useSlideSteps(steppedBool ? items.length : 0);
  const [autoCount, setAutoCount] = useState(autoplayBool ? 0 : items.length);

  useEffect(() => {
    if (!autoplayBool) return;
    if (autoCount >= items.length) return;
    const t = setTimeout(() => setAutoCount((n) => n + 1), beatNum);
    return () => clearTimeout(t);
  }, [autoplayBool, autoCount, items.length, beatNum]);

  const visibleCount = steppedBool
    ? Math.min(activeStep + 1, items.length)
    : autoCount;

  const textCol = (
    <div className="flex flex-col gap-5">
      {tag && (
        <span
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
        </span>
      )}
      {title && (
        <h2
          className="leading-[1.05]"
          style={{
            fontSize: TITLE_SIZES[titleSize],
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
            color: "var(--text)",
          }}
        >
          <EditableText path="title" value={title ?? ""}>{title}</EditableText>
        </h2>
      )}
      {description && (
        <p
          className="leading-relaxed text-text-muted"
          style={{ fontSize: "var(--room-body, clamp(1rem, 1.4vw, 1.25rem))" }}
        >
          {description}
        </p>
      )}
    </div>
  );

  const chatCol = (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <div
        className="overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: "rgba(0,0,0,0.12)",
          background: "var(--bg-surface)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="flex items-center gap-1.5 border-b px-4 py-2.5"
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>

        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{
            background: "color-mix(in srgb, var(--accent) 14%, transparent)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: accent, color: "rgba(245,246,250,0.92)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-text">{widgetName}</span>
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#28c840" }} />
              {widgetStatus}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5" style={{ minHeight: "min(45vh, 28rem)" }}>
          {items.slice(projector ? Math.max(0, visibleCount - 2) : 0, visibleCount).map((msg, i) => {
            // Avsändaren skrivs ut när den byts — som i en riktig chatt.
            // Utan den gick det inte att se vem som sa vad när samma sida
            // hade flera röster (eleven som talar in, du som promptar).
            const previous = i === 0 ? undefined : items[(projector ? Math.max(0, visibleCount - 2) : 0) + i - 1];
            const showLabel = msg.label && msg.label !== previous?.label;
            return (
              <motion.div
                key={(projector ? Math.max(0, visibleCount - 2) : 0) + i}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-col ${msg.side === "user" ? "items-end" : "items-start"}`}
                style={{ gap: "0.28rem" }}
              >
                {showLabel ? (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--room-caption, 0.62rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: msg.side === "user" ? accent : "var(--text-muted)",
                      padding: "0 0.35rem",
                    }}
                  >
                    {msg.label}
                  </span>
                ) : null}
                <div
                  className="projection-chat-message max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-snug"
                  style={
                    msg.side === "user"
                      ? { background: accent, color: "rgba(245,246,250,0.92)", borderBottomRightRadius: "0.4rem" }
                      : {
                          background: "var(--bg-elevated)",
                          color: "var(--text)",
                          borderBottomLeftRadius: "0.4rem",
                        }
                  }
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
          {autoplayBool && visibleCount < items.length && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className="flex gap-1 rounded-2xl px-4 py-3"
                style={{ background: "var(--bg-elevated)" }}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: "var(--text-muted)",
                      animation: `chatpreview-pulse 1s ${d * 0.15}s infinite ease-in-out`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div
          className="flex items-center gap-2 border-t px-4 py-3"
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <div
            className="flex-1 rounded-full px-4 py-2 text-sm text-text-muted"
            style={{ background: "var(--bg-elevated)" }}
          >
            Skriv ditt meddelande…
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: accent, color: "rgba(245,246,250,0.92)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </div>
        </div>
      </div>

      <style>{`@keyframes chatpreview-pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4 } 40% { transform: scale(1); opacity: 1 } }`}</style>
    </motion.div>
  );

  return (
    <div className="slide-container">
      <div
        className="grid w-full items-center gap-12"
        style={{
          maxWidth: "var(--slide-max-width)",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {chatPosition === "right" ? (
          <>
            {textCol}
            {chatCol}
          </>
        ) : (
          <>
            {chatCol}
            {textCol}
          </>
        )}
      </div>
    </div>
  );
}
