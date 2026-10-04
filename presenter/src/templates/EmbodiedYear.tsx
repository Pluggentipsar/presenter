"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EmbodiedYear ★ — året då kurvan slutar vara en kurva och får kropp.
 *
 * Byggd som svar på frågetecknet i ParallaxTimeline: tidslinjen tar slut på
 * "2026 · ?" och den här sliden svarar. Samma tunna linje löper vidare tvärs
 * över ytan, årtalet står stort på den — och sedan fylls rummet av klipp på
 * maskiner som skottar snö, dansar och städar. Sist kliver figuren in från
 * höger och blir stående.
 *
 * Ordningen bär argumentet: abstraktion → rörliga bevis → en kropp i rummet.
 * Publiken ska hinna gå från "en kurva" till "de finns".
 *
 * Media auto-detekteras på filändelse (.mp4/.webm/.mov → video, annars bild).
 * Videor spelas muted i loop — lägg aldrig ljudspår som behövs här.
 *
 * ```mdx
 * <EmbodiedYear
 *   kicker="§ Och sen då? · Tempot"
 *   year="2026"
 *   figure="/bilder/mitt-deck/robot-figur.png"
 *   caption="Och nu har det fått kropp."
 * >
 * - /bilder/mitt-deck/robot1.mp4 · Skottar snö
 * - /bilder/mitt-deck/robot2.mp4 · Dansar i direktsändning
 * - /bilder/mitt-deck/robot3.mp4 · Plockar undan i vardagsrummet
 * </EmbodiedYear>
 * ```
 */

interface EmbodiedYearProps {
  kicker?: string;
  chapter?: string;
  /** Årtalet — stort, på linjen. */
  year?: string;
  /** Utfallande figur till höger. Ska vara en frilagd PNG, beskuren till motivet. */
  figure?: string;
  /** Kort rad under årtalet. Kommer med figuren. */
  caption?: string;
  accent?: string;
  children?: ReactNode;
}

interface Item {
  src: string;
  caption: string;
}

/** Tre porträttrutor i rad, lätt förskjutna så raden inte blir ett stelt band. */
const SLOTS = [
  { left: "3.5%", top: "8%", width: "20%", rot: -1.4 },
  { left: "27.5%", top: "4.5%", width: "20%", rot: 1 },
  { left: "51.5%", top: "9.5%", width: "20%", rot: -0.7 },
];

const VIDEO = /\.(mp4|webm|mov|ogg)(\?|$)/i;

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseItems(children: ReactNode): Item[] {
  const out: Item[] = [];
  const add = (raw: string) => {
    const idx = raw.indexOf(" · ");
    if (idx > -1)
      out.push({ src: raw.slice(0, idx).trim(), caption: raw.slice(idx + 3).trim() });
    else if (raw.trim()) out.push({ src: raw.trim(), caption: "" });
  };

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

export function EmbodiedYear({
  kicker,
  chapter,
  year = "2026",
  figure,
  caption,
  accent = "var(--accent)",
  children,
}: EmbodiedYearProps) {
  const items = parseItems(children).slice(0, SLOTS.length);
  // 0 = linjen och årtalet · 1..n = klippen · sista = figuren kliver in
  const step = useSlideSteps(items.length + 2);
  const figureIn = step >= items.length + 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Linjen som löper vidare från tidslinjen */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        <path
          d="M -10 690 C 260 660 420 712 700 690 S 1180 618 1620 636"
          fill="none"
          stroke="color-mix(in srgb, var(--text) 16%, transparent)"
          strokeWidth="2"
        />
        <path
          d="M -10 704 C 300 700 440 736 720 706 S 1200 640 1620 652"
          fill="none"
          stroke="color-mix(in srgb, var(--text) 42%, transparent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.6vh, 2.8rem)",
            left: "clamp(2rem, 3.5vw, 3.5rem)",
            right: "clamp(2rem, 3.5vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            zIndex: 6,
          }}
        >
          <span style={{ color: accent, fontWeight: 600 }}>
            {kicker ? (
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            ) : null}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {chapter ? (
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            ) : null}
          </span>
        </div>
      ) : null}

      {/* Klippen */}
      {items.map((item, i) => {
        const slot = SLOTS[i];
        const shown = step >= i + 1;
        const isVideo = VIDEO.test(item.src);
        return (
          <motion.figure
            key={item.src + i}
            initial={false}
            animate={{
              opacity: shown ? 1 : 0,
              y: shown ? 0 : 26,
              scale: shown ? 1 : 0.96,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: slot.left,
              top: slot.top,
              width: slot.width,
              margin: 0,
              rotate: `${slot.rot}deg`,
              zIndex: 3,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "9 / 16",
                overflow: "hidden",
                borderRadius: "clamp(0.4rem, 0.7vw, 0.8rem)",
                border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
                background: "var(--bg-surface)",
                boxShadow:
                  "0 36px 70px -34px rgba(0,0,0,0.55), 0 3px 14px rgba(0,0,0,0.12)",
              }}
            >
              {isVideo ? (
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.caption}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
            {item.caption ? (
              <figcaption
                style={{
                  marginTop: "0.6em",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.9vw, 1rem)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {item.caption}
              </figcaption>
            ) : null}
          </motion.figure>
        );
      })}

      {/* Årtalet — står på linjen */}
      <div
        style={{
          position: "absolute",
          left: "clamp(2rem, 3.5vw, 3.5rem)",
          bottom: "clamp(1.4rem, 4vh, 3rem)",
          zIndex: 5,
          maxWidth: "58%",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(3.6rem, 8.5vw, 8.5rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.04em",
            color: accent,
          }}
        >
          <EditableText path="year" value={year}>
            {year}
          </EditableText>
        </motion.div>
        {caption ? (
          <motion.div
            initial={false}
            animate={{ opacity: figureIn ? 1 : 0, y: figureIn ? 0 : 8 }}
            transition={{ duration: 0.6, delay: figureIn ? 0.35 : 0 }}
            style={{
              marginTop: "clamp(0.3rem, 0.9vh, 0.7rem)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.1rem, 1.9vw, 2.2rem)",
              lineHeight: 1.2,
              color: "var(--text)",
            }}
          >
            <EditableText path="caption" value={caption}>
              {inlineMarkdown(caption)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {/* Figuren kliver in från höger */}
      {figure ? (
        <motion.img
          src={figure}
          alt=""
          initial={false}
          animate={{ opacity: figureIn ? 1 : 0, x: figureIn ? 0 : 70 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            right: "clamp(1.5rem, 4vw, 4rem)",
            bottom: "3%",
            height: "84%",
            width: "auto",
            objectFit: "contain",
            zIndex: 4,
            filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.28))",
          }}
        />
      ) : null}
    </div>
  );
}

export default EmbodiedYear;
