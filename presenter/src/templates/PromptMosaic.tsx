"use client";

import { motion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { glassCardStyle } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PromptMosaic — bias-förslide: AI-genererade bilder pinnas upp i en collage
 * via STAGED REVEAL, var och en med sin prompt som typas fram i mono
 * ("Create an image of a successful person" ×3 → tre kostymer). Mitten står
 * och blinkar som om modellen fortfarande genererar — tills sista klicket,
 * då ordet (t.ex. "Bias") blommar upp i ett glaskort och bilderna desatureras.
 *
 * Bilderna behåller sina NATURLIGA proportioner (ingen beskärning) — stående
 * står, liggande ligger; slot-positionerna är tunade för 7 bilder i ordningen
 * liggande ×3 (vänsterspalt) → stående (center-topp) → stående (center-botten)
 * → liggande (höger-topp) → liggande (höger-botten). Andra antal cyklar slots.
 *
 * MDX-format — en rad per bild, `Sökväg · prompt`:
 * ```mdx
 * <PromptMosaic word="Bias" link="genedlabs.ai/bias-teachable-moments">
 * - /bilder/mitt-deck/bias-larare.webp · Create an image of a teacher
 * - ...
 * </PromptMosaic>
 * ```
 */

interface PromptMosaicProps {
  /** Mono-kicker uppe till vänster (valfri). */
  eyebrow?: string;
  /** Ordet som avslöjas i mitten på sista steget. */
  word?: string;
  /** Länk som visas i chip nere till höger (utan protokoll är fine). */
  link?: string;
  /** Etikett före länken i chipet. */
  linkLabel?: string;
  children?: ReactNode;
}

interface Tile {
  src: string;
  prompt: string;
}

interface Slot {
  top: string;
  left: string;
  width: string;
  rot: number;
}

/**
 * Kollage-positioner (% av 16:9-ytan), tunade för 7 bilder: vänsterspalten
 * staplar samma-prompt-trion (liggande), mitten bär stående lärare (topp) och
 * elev (botten) runt ordet, högerspalten klassen (topp) och familjen (botten).
 * Bredder valda så naturliga höjder landar utan kollisioner med ord-kortet.
 */
const SLOTS: Slot[] = [
  { top: "4.5%", left: "2%", width: "24%", rot: -2.5 }, // 0 liggande · vänster topp
  { top: "33.5%", left: "4%", width: "22%", rot: 1.8 }, // 1 liggande · vänster mitt
  { top: "60.5%", left: "1.5%", width: "24%", rot: -1.5 }, // 2 liggande · vänster botten
  { top: "2%", left: "33%", width: "15.5%", rot: 2 }, // 3 stående · center topp
  { top: "56%", left: "36%", width: "14.5%", rot: -2 }, // 4 stående · center botten
  { top: "4%", left: "59.5%", width: "29%", rot: 2.2 }, // 5 liggande · höger topp
  { top: "61%", left: "61.5%", width: "30%", rot: -1.8 }, // 6 liggande · höger botten
];

/**
 * Alternativ uppsättning för ÅTTA bilder i mönstret liggande, liggande,
 * stående, stående, liggande, liggande, stående, stående — dvs partibias-
 * kollaget (V, S, MP, C, L, KD, M, SD i riksdagsordning). Fyra kolumner med
 * en fri mittkorridor (~41–57 %) så ord-kortet i mitten inte begravs.
 */
const SLOTS_8: Slot[] = [
  { top: "5%", left: "1.5%", width: "23%", rot: -2.5 }, // 0 liggande · kolumn 1 topp
  { top: "55%", left: "1%", width: "23%", rot: 1.8 }, // 1 liggande · kolumn 1 botten
  { top: "3%", left: "26%", width: "14.5%", rot: 2 }, // 2 stående · kolumn 2 topp
  { top: "52%", left: "26%", width: "15%", rot: -1.6 }, // 3 stående · kolumn 2 botten
  { top: "4%", left: "58%", width: "22%", rot: 2.2 }, // 4 liggande · kolumn 3 topp
  { top: "57%", left: "57%", width: "23%", rot: -1.8 }, // 5 liggande · kolumn 3 botten
  { top: "2%", left: "82.5%", width: "15%", rot: -2.2 }, // 6 stående · kolumn 4 topp
  { top: "51%", left: "83%", width: "15%", rot: 1.5 }, // 7 stående · kolumn 4 botten
];

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

function parseTiles(children: ReactNode): Tile[] {
  const out: Tile[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const src = parts.shift() ?? "";
    if (!src) return;
    // Tolerera gamla beskärnings-flaggor (top/bottom/center) — numera no-op.
    const promptParts = parts.filter((p) => p && !/^(top|bottom|center)$/i.test(p));
    out.push({ src, prompt: promptParts.join(" · ") });
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

/** Prompt-chip med typewriter när den är aktiv (senast framklickad). */
function TypeChip({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [text, active]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        maxWidth: "calc(100% - 1.2rem)",
        margin: "0.6rem",
        padding: "0.4rem 0.75rem",
        borderRadius: "0.85rem",
        background: "var(--glass-card-bg, rgba(10,12,18,0.55))",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: "1px solid var(--glass-border, rgba(255,255,255,0.14))",
        boxShadow: "0 4px 14px rgba(10,14,24,0.18)",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
        letterSpacing: "0.02em",
        lineHeight: 1.4,
        color: "var(--text)",
      }}
    >
      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>
        ›
      </span>
      <span>{text.slice(0, shown)}</span>
      {active && shown < text.length ? (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ color: "var(--accent)", flexShrink: 0 }}
        >
          ▍
        </motion.span>
      ) : null}
    </span>
  );
}

export function PromptMosaic({
  eyebrow,
  word = "Bias",
  link,
  linkLabel,
  children,
}: PromptMosaicProps) {
  const tiles = useMemo(() => parseTiles(children), [children]);
  const slots = tiles.length === 8 ? SLOTS_8 : SLOTS;
  // Steg: en bild per klick + ett sista steg för ordet.
  const step = useSlideSteps(tiles.length + 1);
  const visibleCount = Math.min(step + 1, tiles.length);
  const wordVisible = step >= tiles.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 120% 90% at 50% 40%, color-mix(in srgb, var(--accent) 5%, var(--bg)) 0%, var(--bg) 72%)",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.1rem, 2vh, 1.6rem)",
            left: "clamp(1.4rem, 2.5vw, 2.4rem)",
            zIndex: 5,
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      {/* Kollaget */}
      <div style={{ position: "absolute", inset: 0 }}>
        {tiles.map((tile, i) => {
          const slot = slots[i % slots.length];
          const revealed = i < visibleCount;
          const isNewest = i === visibleCount - 1 && !wordVisible;
          return (
            <motion.div
              key={tile.src + i}
              initial={false}
              animate={{
                opacity: revealed ? 1 : 0,
                scale: revealed ? 1 : 0.82,
                y: revealed ? 0 : 26,
                rotate: revealed ? slot.rot : slot.rot * 2.4,
                filter: wordVisible
                  ? "saturate(0.68) brightness(0.97)"
                  : "saturate(1) brightness(1)",
              }}
              transition={{
                opacity: { duration: 0.45 },
                scale: { type: "spring", stiffness: 250, damping: 24 },
                y: { type: "spring", stiffness: 250, damping: 24 },
                rotate: { type: "spring", stiffness: 250, damping: 24 },
                filter: { duration: 0.9, ease: "easeOut" },
              }}
              style={{
                position: "absolute",
                top: slot.top,
                left: slot.left,
                width: slot.width,
                zIndex: i + 1,
                borderRadius: "calc(var(--radius, 1rem) * 1.15)",
                overflow: "hidden",
                background: "var(--bg-elevated, rgba(127,127,127,0.12))",
                boxShadow:
                  "0 18px 40px -16px rgba(16,20,28,0.32), 0 5px 14px -6px rgba(16,20,28,0.16)",
                pointerEvents: "none",
              }}
            >
              {/* Naturlig proportion: bredden styr, höjden följer bilden */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.src}
                alt={tile.prompt}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              {/* Prompt-chip */}
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    maxWidth: "100%",
                    zIndex: 2,
                  }}
                >
                  <TypeChip text={tile.prompt} active={isNewest} />
                </motion.div>
              ) : null}
            </motion.div>
          );
        })}

        {/* Center: genererar… → ordet */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "47.5%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Mjuk accent-halo bakom ordet */}
          <motion.div
            aria-hidden
            animate={{
              opacity: wordVisible ? 0.85 : 0,
              scale: wordVisible ? 1 : 0.6,
            }}
            transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: "absolute",
              width: "150%",
              height: "150%",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, var(--accent-glow) 0%, transparent 62%)",
              filter: "blur(22px)",
              pointerEvents: "none",
            }}
          />

          {!wordVisible ? (
            // "Fortfarande genererande" — blinkande mono-markör
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text-muted)",
              }}
            >
              <span style={{ opacity: 0.7 }}>›</span>
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: "var(--accent)" }}
              >
                ▍
              </motion.span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              style={{
                ...glassCardStyle({
                  radius: "calc(var(--radius, 1rem) * 1.4)",
                  blur: 28,
                  padding: "clamp(1.2rem, 2.2vw, 2rem) clamp(1.6rem, 3vw, 2.8rem)",
                }),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "clamp(0.5rem, 1vh, 0.8rem)",
              }}
            >
              <h1
                style={{
                  display: "flex",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(3rem, 6.5vw, 6rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  lineHeight: 1,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {word.split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 26 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 24,
                      delay: 0.12 + i * 0.07,
                    }}
                    style={{ display: "inline-block" }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </h1>
              <motion.div
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 0.45,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  transformOrigin: "left",
                  height: "3px",
                  width: "72%",
                  borderRadius: "9999px",
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, var(--accent-bright, var(--accent)) 100%)",
                }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Länk-chip nere till höger */}
      {link ? (
        <motion.div
          animate={{ opacity: wordVisible ? 1 : 0.55 }}
          transition={{ duration: 0.6 }}
          style={{
            position: "absolute",
            right: "clamp(1.4rem, 2.5vw, 2.4rem)",
            bottom: "clamp(0.35rem, 0.9vh, 0.7rem)",
            zIndex: 5,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.95rem",
            borderRadius: "9999px",
            background: "var(--glass-card-bg, rgba(10,12,18,0.5))",
            backdropFilter: "blur(14px) saturate(150%)",
            WebkitBackdropFilter: "blur(14px) saturate(150%)",
            border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
          }}
        >
          {linkLabel ? <span>{linkLabel}</span> : null}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            {link}
          </span>
        </motion.div>
      ) : null}
    </div>
  );
}
