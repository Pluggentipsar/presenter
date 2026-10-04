"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DesignChoices — central kategorilista med chat-bubblor runtom.
 *
 * När du stegar fram revealas ett chat-citat i taget. Den matchande
 * kategorin i centern highlightas (accent-färg + glow). Efter alla
 * bubblor revealats är hela bilden synlig.
 *
 * MDX-format:
 * ```mdx
 * <DesignChoices
 *   chapter="§ Designval"
 *   title="Designval"
 *   categories="Antropomorfism, Speglar användaren, Ifrågasätter inte, Sykofantism"
 *   accent="#3b9eff"
 * >
 * - Jag förstår din frustration 😌 💬 🤗 · Antropomorfism
 * - Jag gillar att hjälpa med kreativa projekt 🎨 ✨ 🤖 · Antropomorfism
 * - Du är så klok och insiktsfull! 🧠 ✨ 👏 · Sykofantism
 * - Det är en fantastisk idé! 🏆 🎉 🙌 · Sykofantism
 * - Absolut! Du verkar verkligen veta vad du pratar om · Speglar användaren
 * - Ja, du har helt rätt! Politiker är fruktansvärda 😡 · Sykofantism
 * </DesignChoices>
 * ```
 *
 * Format per item: `chat-text · kategori-namn` (separator " · ").
 * Texten kan innehålla emojis fritt.
 */

interface DesignChoicesProps {
  chapter?: string;
  title?: string;
  /** Komma-separerad lista över kategorier i ordning. */
  categories?: string;
  /** Accent-färg för aktiv kategori. */
  accent?: string;
  background?: string;
  overlay?: number;
  children?: ReactNode;
}

interface Bubble {
  text: string;
  category: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseBubbles(children: ReactNode): Bubble[] {
  const bubbles: Bubble[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!raw) return;
      // Splitta på SISTA " · " så texten kan innehålla bullets fritt
      const lastSep = raw.lastIndexOf(" · ");
      if (lastSep === -1) {
        bubbles.push({ text: raw, category: "" });
        return;
      }
      bubbles.push({
        text: raw.slice(0, lastSep).trim(),
        category: raw.slice(lastSep + 3).trim(),
      });
    });
  });
  return bubbles;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg)
    return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(5,5,8,${a}), rgba(5,5,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function DesignChoices({
  chapter,
  title = "Designval",
  categories = "",
  accent = "#3b9eff",
  background,
  overlay = 0.7,
  children,
}: DesignChoicesProps) {
  const bubbles = parseBubbles(children);
  const categoryList = categories
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const totalSteps = bubbles.length + 1;
  const step = useSlideSteps(totalSteps);
  const visibleBubbleCount = step;

  // Vilka kategorier är aktiva = har någon synlig bubbla
  const activeCategories = new Set(
    bubbles.slice(0, visibleBubbleCount).map((b) => b.category),
  );

  // Senast revealade bubblan (för "blink"-effekt)
  const latestCategory =
    visibleBubbleCount > 0
      ? bubbles[visibleBubbleCount - 1].category
      : null;

  // Auto-positionera bubblor: alternerande vänster/höger, jämnt fördelat vertikalt
  const sideBubbles = bubbles.map((b, i) => {
    const isLeft = i % 2 === 0;
    const sideIdx = Math.floor(i / 2);
    return { ...b, isLeft, sideIdx };
  });
  const leftCount = sideBubbles.filter((b) => b.isLeft).length;
  const rightCount = sideBubbles.filter((b) => !b.isLeft).length;
  const bubbleWidth = "min(26%, 32ch)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Subtle radial glow centered */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 65%, ${withAlpha(accent, 0.07)} 0%, transparent 50%)`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Centermodul: title + categories */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(1.5rem, 3vh, 3rem)",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4rem, 8vw, 8rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "var(--text)",
          }}
        >
          {title}
        </motion.div>

        {/* Kategorier */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1.2vh, 1rem)",
            alignItems: "center",
          }}
        >
          {categoryList.map((cat, i) => {
            const isActive = activeCategories.has(cat);
            const isLatest = latestCategory === cat;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isLatest ? [1, 1.06, 1] : 1,
                }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.5 + i * 0.08 },
                  scale: { duration: 0.7 },
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.4rem, 2.2vw, 2.2rem)",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "-0.015em",
                  color: isActive
                    ? accent
                    : "var(--text-muted)",
                  textShadow: isActive ? `0 0 30px ${withAlpha(accent, 0.53)}` : "none",
                  transition:
                    "color 480ms ease, text-shadow 480ms ease, font-weight 480ms ease",
                }}
              >
                {cat}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bubblor — auto-positionerade på sidorna */}
      <AnimatePresence>
        {sideBubbles.slice(0, visibleBubbleCount).map((b, i) => {
          const totalOnSide = b.isLeft ? leftCount : rightCount;
          // Y-fördelning: 8% till 80% beroende på side-index
          const yPct = totalOnSide <= 1
            ? 50
            : 8 + (72 * b.sideIdx) / Math.max(1, totalOnSide - 1);
          // X-positioner: vänster sida vid 3%, höger ankrad 3% från höger-edge
          // Höger-bubblan får translateX(-100%) via right-anchored absolute pos
          // För enkelhet: använd left för båda men sätt höger-bubblan till 71%.
          const xPct = b.isLeft ? 3 : 71;
          // Subtil x-jitter för organisk känsla
          const xJitter = ((b.sideIdx * 11) % 5) - 2;
          const finalX = xPct + xJitter;

          return (
            <ChatBubble
              key={i}
              text={b.text}
              x={`${finalX}%`}
              y={`${yPct}%`}
              isLeft={b.isLeft}
              accent={accent}
              width={bubbleWidth}
            />
          );
        })}
      </AnimatePresence>

      {/* Steg-progress nederst */}
      {bubbles.length > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.5rem",
            zIndex: 5,
          }}
        >
          {bubbles.map((_, i) => (
            <div
              key={i}
              style={{
                width: i < visibleBubbleCount ? "1.6rem" : "0.4rem",
                height: "0.4rem",
                borderRadius: "0.2rem",
                background:
                  i < visibleBubbleCount
                    ? accent
                    : "rgba(247,241,230,0.18)",
                transition: "all 460ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// ChatBubble — pill-formad vit ChatGPT-style bubbla
// ============================================================================

interface ChatBubbleProps {
  text: string;
  x: string;
  y: string;
  isLeft: boolean;
  accent: string;
  width?: string;
}

function ChatBubble({ text, x, y, isLeft, width = "min(26%, 32ch)" }: ChatBubbleProps) {
  // Ikon-rad i botten på bubblan: copy, thumb-up, thumb-down, share, refresh, ...
  const iconColor = "rgba(15,15,20,0.55)";
  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -16 : 16, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: width,
        background: "rgba(247,247,250,0.97)",
        color: "#0a0a14",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem 0.55rem",
        boxShadow: `0 14px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)`,
        fontFamily: "var(--font-display)",
        fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
        lineHeight: 1.4,
        zIndex: 3,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ marginBottom: "0.45rem" }}>{text}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          color: iconColor,
        }}
      >
        <ActionIcon kind="copy" />
        <ActionIcon kind="thumb-up" />
        <ActionIcon kind="thumb-down" />
        <ActionIcon kind="share" />
        <ActionIcon kind="refresh" />
        <span
          style={{
            fontSize: "1rem",
            lineHeight: 0.5,
            letterSpacing: "0.05em",
            color: iconColor,
          }}
        >
          ⋯
        </span>
      </div>
    </motion.div>
  );
}

// Liten action-ikon — minimal SVG
function ActionIcon({ kind }: { kind: string }) {
  const size = 14;
  const stroke = "rgba(15,15,20,0.45)";
  const common: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
  };
  switch (kind) {
    case "copy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={common}>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "thumb-up":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={common}>
          <path d="M14 9V5a3 3 0 0 0-6 0v4M5 9h14l-1 12H6L5 9z" />
        </svg>
      );
    case "thumb-down":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={common}>
          <path d="M10 15v4a3 3 0 0 0 6 0v-4M19 15H5l1-12h12l1 12z" />
        </svg>
      );
    case "share":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={common}>
          <path d="M12 4v12m0-12l-4 4m4-4l4 4M5 21h14" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={common}>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
        </svg>
      );
    default:
      return null;
  }
}
