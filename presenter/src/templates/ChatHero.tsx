"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMessage {
  side: "user" | "ai";
  label: string;
  text: string;
}

interface ChatHeroProps {
  eyebrow?: string;
  title: string;
  /** Storlek på titeln. Default "xl". */
  titleSize?: "md" | "lg" | "xl";
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  background?: string;
  /** Avatar-etikett för AI:n i bubblan. Default "AI". */
  aiLabel?: string;
  /** Regex-pattern (som sträng) för vilka labels som räknas som user-sida.
   *  Default: "elev|du|user|jag|erik". */
  userPattern?: string;
  /** Accentfärg. Default cyan som på övriga bluegray-slides. */
  accent?: string;
  /** ms mellan meddelanden under autoplay. Default 1600. */
  beat?: number | string;
  /** Visa en pulserande mikrofon-ikon intill titeln (för "tala in"-slides). */
  voice?: boolean;
  /**
   * Markdown-lista med meddelanden som children, t.ex.:
   *   - **Elev:** Hola!
   *   - **Maria:** Me llamo Maria.
   */
  children?: ReactNode;
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

function parseLines(children: ReactNode, userRe: RegExp): ChatMessage[] {
  const out: ChatMessage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children);
    const m = raw.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    const label = m ? m[1].trim() : "";
    const text = m ? m[2].trim() : raw.trim();
    const side: "user" | "ai" = userRe.test(label) ? "user" : "ai";
    out.push({ side, label, text });
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

/**
 * Hero-variant med stor titel, bild höger, och en fler-turnerande
 * chattkonversation som animeras in meddelande-för-meddelande.
 */
const TITLE_SIZES = {
  md: "clamp(3rem, 7vw, 7rem)",
  lg: "clamp(4.5rem, 12vw, 13rem)",
  xl: "clamp(6rem, 17vw, 19rem)",
};

function renderBold(text: string | undefined, boldColor: string, normalColor: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: boldColor, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: normalColor }}>
        {part}
      </span>
    );
  });
}

export function ChatHero({
  eyebrow,
  title,
  titleSize = "xl",
  subtitle,
  image,
  imageAlt = "",
  background,
  aiLabel = "AI",
  userPattern = "elev|du|user|jag|erik",
  accent = "#67D4CD",
  beat = 1600,
  voice,
  children,
}: ChatHeroProps) {
  const beatNum = typeof beat === "string" ? parseInt(beat, 10) : beat;
  const userRe = new RegExp(`^(${userPattern})\\b`, "i");
  const safeMessages = parseLines(children, userRe);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= safeMessages.length) return;
    const start = visibleCount === 0 ? 800 : beatNum;
    const t = setTimeout(() => setVisibleCount((n) => n + 1), start);
    return () => clearTimeout(t);
  }, [visibleCount, safeMessages.length, beatNum]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Bakgrund */}
      {background ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-keep-color=""
            src={background}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {/* Vignett för text-läsbarhet — bara när det finns en (mörk) bakgrundsbild.
          Utan bild skulle den mörka vinjetten skada läsbarheten av mörk text på ljust tema. */}
      {background ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 20% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />
      ) : null}

      <div
        className="relative grid h-full w-full"
        style={{ gridTemplateColumns: image ? "58% 42%" : "1fr" }}
      >
        {/* Vänster: titel överst, chatt dockas i botten */}
        <div
          className="flex flex-col h-full"
          style={{
            padding: "clamp(2.5rem, 4.5vw, 5rem)",
            position: "relative",
            zIndex: 2,
          }}
        >
         <div
           className="flex flex-col"
           style={{
             gap: "clamp(1rem, 1.5vw, 1.75rem)",
             flex: "0 0 auto",
             marginTop: "clamp(1rem, 3vh, 3rem)",
           }}
         >
          {eyebrow ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.25rem, 2vw, 2rem)",
                color: accent,
                letterSpacing: "-0.01em",
              }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>
                {eyebrow}
              </EditableText>
            </motion.div>
          ) : null}

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem", flexWrap: "wrap" }}>
            <motion.h1
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: TITLE_SIZES[titleSize],
                lineHeight: 0.88,
                letterSpacing: "-0.045em",
                color: "var(--text)",
                margin: 0,
                textShadow: background ? "0 8px 40px rgba(0,0,0,0.4)" : undefined,
              }}
            >
              <EditableText
                path="title"
                value={title ?? ""}
                sizeControls={[
                  { prop: "titleSize", current: titleSize, options: ["md", "lg", "xl"], label: "Titel" },
                ]}
              >
                {title}
              </EditableText>
            </motion.h1>
            {voice ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "clamp(2.8rem, 4vw, 4.2rem)",
                  height: "clamp(2.8rem, 4vw, 4.2rem)",
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 0 0 ${withAlpha(accent, 0.5)}`,
                  animation: "voicePulse 2s ease-in-out infinite",
                  flexShrink: 0,
                }}
                aria-label="Röstinmatning aktiv"
              >
                <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="#0a0908"/>
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1" stroke="#0a0908" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 18v3M9 21h6" stroke="#0a0908" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <style>{`
                  @keyframes voicePulse {
                    0%, 100% { box-shadow: 0 0 0 0 ${withAlpha(accent, 0.5)}; }
                    50% { box-shadow: 0 0 0 18px ${withAlpha(accent, 0)}; }
                  }
                `}</style>
              </motion.div>
            ) : null}
          </div>

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.25rem, 1.8vw, 1.8rem)",
                margin: 0,
                lineHeight: 1.2,
                maxWidth: "28em",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {renderBold(subtitle, accent, "var(--text)")}
              </EditableText>
            </motion.p>
          ) : null}
         </div>

          {/* Chatt — dockas i botten av vänsterkolumnen */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              maxWidth: "32em",
            }}
          >
            <AnimatePresence initial={false}>
              {safeMessages.slice(0, visibleCount).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.side === "user" ? "flex-end" : "flex-start",
                    gap: "0.7rem",
                    alignItems: "flex-end",
                  }}
                >
                  {msg.side === "ai" ? (
                    <div
                      style={{
                        flexShrink: 0,
                        width: "1.9rem",
                        height: "1.9rem",
                        borderRadius: "50%",
                        background: accent,
                        color: "#0a0908",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        boxShadow: `0 4px 14px -4px ${withAlpha(accent, 0.5)}`,
                      }}
                      aria-hidden
                    >
                      {aiLabel.slice(0, 2).toUpperCase()}
                    </div>
                  ) : null}

                  <div
                    style={{
                      background:
                        msg.side === "user"
                          ? accent
                          : "rgba(32, 34, 40, 0.92)",
                      color:
                        msg.side === "user"
                          ? "#0a0908"
                          : "rgba(245,246,250,0.92)",
                      padding: "0.75rem 1.05rem",
                      borderRadius: "1.1rem",
                      borderTopLeftRadius: msg.side === "ai" ? "0.35rem" : "1.1rem",
                      borderTopRightRadius: msg.side === "user" ? "0.35rem" : "1.1rem",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                      lineHeight: 1.45,
                      maxWidth: "26em",
                      backdropFilter:
                        msg.side === "ai" ? "blur(8px)" : undefined,
                      WebkitBackdropFilter:
                        msg.side === "ai" ? "blur(8px)" : undefined,
                      boxShadow:
                        msg.side === "ai"
                          ? "0 12px 28px -14px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
                          : "0 12px 28px -14px rgba(0,0,0,0.45)",
                      fontWeight: msg.side === "user" ? 500 : 400,
                    }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Höger: bild flush med bottenhöger-hörn */}
        <div className="relative flex items-end justify-end overflow-hidden">
          <motion.img
            src={image}
            alt={imageAlt}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              objectPosition: "bottom right",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}
