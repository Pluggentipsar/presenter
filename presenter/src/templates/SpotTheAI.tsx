"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Round {
  /** Bild-URL eller emoji-fallback */
  src?: string;
  emoji?: string;
  /** Caption under bilden, t.ex. "Insta-profil @julianedreams" */
  caption: string;
  /** Är detta AI-genererat? */
  isAI: boolean;
  /** Förklaring som visas vid avslöjandet, t.ex. "Helt AI-gjord. Inga foton är riktiga." */
  reveal?: string;
}

interface SpotTheAIProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bottomLine?: string;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
  /**
   * Markdown-lista. En rad per round. Format:
   *
   *   - AI · /path/till/bild.jpg · Caption-text · Reveal-förklaring
   *   - RIKTIG · /path/till/bild.jpg · Caption-text · Reveal-förklaring
   *
   * Eller med emoji istället för bild-URL:
   *
   *   - AI · 🤖 · Caption · Reveal
   *
   * Första segmentet (AI/RIKTIG) bestämmer vad som är det rätta svaret.
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

function parseRounds(children: ReactNode): Round[] {
  const out: Round[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 3) return;
    const tag = parts[0].trim().toUpperCase();
    const isAI = tag === "AI" || tag === "FAKE" || tag === "FEJK";
    const second = parts[1].trim();
    const isImage = /^(\/|https?:)/.test(second);
    out.push({
      src: isImage ? second : undefined,
      emoji: isImage ? undefined : second,
      caption: parts[2].trim(),
      isAI,
      reveal: parts.slice(3).join(" · ").trim() || undefined,
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

/**
 * SpotTheAI — multi-round-quiz där publiken gissar om något är AI eller riktigt.
 *
 * Steg per round:
 *  - n*2     → bild + fråga ("AI eller riktigt?")
 *  - n*2+1   → reveal med stort AI/RIKTIGT-stamp och förklaring
 *
 * Memphis-trogen styling: chunky offset-skuggor, accent-färgade stamps.
 *
 * MDX-format:
 * ```mdx
 * <SpotTheAI eyebrow="§ G · Quiz" title="Är detta AI?">
 * - AI · /bilder/example1.jpg · Insta-profil @sunset.dreamz · Hela kontot är AI-genererat.
 * - RIKTIG · /bilder/example2.jpg · TikTok-creator @somebody · Riktig människa, riktig kamera.
 * </SpotTheAI>
 * ```
 */
export function SpotTheAI({
  eyebrow,
  title,
  subtitle,
  bottomLine,
  background,
  overlay,
  overlayMode = "light",
  children,
}: SpotTheAIProps) {
  const reduce = useReducedMotion();
  const rounds = useMemo(() => parseRounds(children), [children]);
  const totalSteps = rounds.length * 2 + (bottomLine ? 1 : 0);
  const step = useSlideSteps(Math.max(totalSteps, 1));

  const currentRound = Math.min(rounds.length - 1, Math.floor(step / 2));
  const isRevealed = step % 2 === 1 || step >= rounds.length * 2;
  const showBottom = bottomLine ? step >= rounds.length * 2 : false;

  const round = rounds[currentRound];

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="card" />

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
            className="leading-[0.92] tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(2.4rem, 5.4vw, 5.4rem)",
              color: "var(--text)",
              textShadow: "var(--title-shadow, none)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </motion.h1>
        ) : null}

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.45vw, 1.45rem)",
              color: "var(--text-muted)",
              fontWeight: 500,
              marginTop: "0.6rem",
              maxWidth: "44em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </motion.p>
        ) : null}

        {/* Round-counter */}
        {rounds.length > 1 ? (
          <div
            className="mt-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.8rem, 1vw, 1rem)",
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
            }}
          >
            RUNDA {String(currentRound + 1).padStart(2, "0")} / {String(rounds.length).padStart(2, "0")}
          </div>
        ) : null}

        {/* Bild + caption */}
        <div
          className="flex flex-1 items-center justify-center mt-4 mb-4"
          style={{ minHeight: 0 }}
        >
          <motion.div
            key={currentRound}
            initial={{ opacity: 0, scale: 0.94, rotate: reduce ? 0 : -1.2 }}
            animate={{ opacity: 1, scale: 1, rotate: reduce ? 0 : -1.2 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative flex flex-col items-center"
            style={{
              maxWidth: "30rem",
              width: "100%",
              height: "100%",
              minHeight: 0,
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                height: "auto",
                width: "auto",
                maxWidth: "100%",
                margin: "0 auto",
                aspectRatio: "4/5",
                background: "var(--bg-surface)",
                border: "var(--card-border, 3px solid #1A1A1A)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--card-shadow, 0 8px 24px rgba(0,0,0,0.12))",
              }}
            >
              {round?.src ? (
                /\.(mp4|webm|mov)$/i.test(round.src) ? (
                  <video data-keep-color=""
                    key={round.src}
                    src={round.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img data-keep-color=""
                    src={round.src}
                    alt={round.caption}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontSize: "clamp(5rem, 12vw, 12rem)" }}>
                    {round?.emoji ?? "🖼️"}
                  </span>
                </div>
              )}

              {/* Reveal-stamp ovanpå bilden — alltid renderad, opacity-toggle */}
              <div
                aria-hidden={!isRevealed}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 50,
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed
                    ? "scale(1) rotate(-12deg)"
                    : "scale(1.6) rotate(-18deg)",
                  transition:
                    "opacity 0.4s ease-out, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  data-card=""
                  style={{
                    background: round?.isAI
                      ? "var(--accent, #7aa8ff)"
                      : "var(--accent-alert, #4ade80)",
                    color: "var(--bg)",
                    padding: "0.7rem 2rem",
                    border: "3px solid rgba(0,0,0,0.65)",
                    borderRadius: "0.6rem",
                    fontFamily: "var(--font-display, sans-serif)",
                    fontWeight: 900,
                    fontSize: "clamp(2.4rem, 5vw, 5rem)",
                    letterSpacing: "0.05em",
                    lineHeight: 1,
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    boxShadow:
                      "0 14px 36px rgba(0,0,0,0.7), 0 0 80px rgba(255,255,255,0.4), inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.25)",
                  }}
                >
                  {round?.isAI ? "AI" : "RIKTIG"}
                </div>
              </div>
            </div>

            <div
              className="mt-3 text-center"
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              {round?.caption}
            </div>

            {/* Reveal-text */}
            {isRevealed && round?.reveal ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25 }}
                className="mt-2 text-center"
                style={{
                  flexShrink: 0,
                  minHeight: "3.2em",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  maxWidth: "32em",
                }}
              >
                {round.reveal}
              </motion.div>
            ) : (
              <div
                className="mt-2 text-center"
                style={{
                  flexShrink: 0,
                  minHeight: "3.2em",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                AI eller riktigt?
              </div>
            )}
          </motion.div>
        </div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{
              opacity: showBottom ? 1 : 0,
              y: showBottom ? 0 : 14,
              scale: showBottom ? 1 : 0.94,
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mt-2 flex items-center justify-center"
            style={{ flexShrink: 0 }}
          >
            <div
              className="px-8 py-3 text-center"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: "clamp(1.2rem, 2.0vw, 2.0rem)",
                color: "var(--text)",
                borderTop: "3px solid var(--accent)",
                borderBottom: "3px solid var(--accent)",
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

export default SpotTheAI;
