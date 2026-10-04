"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AnthropomorphismLine — vi har alltid läst in liv där inget liv finns.
 *
 * Fyra ting vi mänskliggjort ställs upp längs samma linje och tänds ett i
 * taget. Över varje ting pekar en pil NED: det är vi som projicerar. Först
 * på sista klicket kommer pilen som pekar UPP från det sista tinget — och
 * det är hela argumentet. Gosedjuret svarade aldrig. Chatboten gör det.
 *
 * Riktningen på pilarna bär poängen, inte ikonerna. Glyferna är medvetet
 * abstrakta och kodade — ingen robotestetik, inga ansikten.
 *
 * ```mdx
 * <AnthropomorphismLine
 *   kicker="§ 3 · Vi gör saker mänskliga"
 *   statement="Vi har alltid läst in liv där **inget liv finns**."
 *   reveal="Skillnaden är att chatbotten **svarar tillbaka**."
 *   projectionLabel="vi läser in liv"
 *   responseLabel="den svarar tillbaka"
 * >
 * - Gosedjuret · gosedjur
 * - Dammsugaren som fick ett namn · robot
 * - Tamagotchin · agg
 * - ”Jag finns här för dig” · chatt
 * </AnthropomorphismLine>
 * ```
 *
 * Per rad: `Etikett · glyf`. Glyfer: `gosedjur`, `robot`, `agg`, `chatt`.
 * Alternativt `Etikett · /bilder/…/fil.png` — då visas bilden (transparent
 * PNG rekommenderas) istället för glyfen, i större format.
 */

interface AnthropomorphismLineProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Påståendet överst. `**fet**` blir accent. */
  statement?: string;
  /** Vändningen — kommer på sista klicket, med pilen som pekar tillbaka. */
  reveal?: string;
  /** Etikett vid pilarna som pekar ned mot tingen. */
  projectionLabel?: string;
  /** Etikett vid pilen som pekar tillbaka från det sista tinget. */
  responseLabel?: string;
  /**
   * Objektens storlek i vw när raden bär fotografier i stället för glyfer.
   * Default 10,5 — höj när bilderna är motivet och inte illustrationen.
   */
  imageSize?: number | string;
  children?: ReactNode;
}

type Glyph = "gosedjur" | "robot" | "agg" | "chatt";

interface Thing {
  label: string;
  glyph: Glyph;
  /** Bildväg (t.ex. /bilder/…/gosedjur.png) — ersätter glyfen om satt. */
  image?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const GLYPHS: Glyph[] = ["gosedjur", "robot", "agg", "chatt"];
/** Etikettens fontstorlek — linjens bottenoffset räknas från samma värde så
 * att punkterna hamnar exakt på linjen oavsett om etiketten radbryts. */
const LABEL_FONT = "clamp(1.15rem, 2vw, 1.9rem)";
const isImagePath = (p: string) =>
  p.startsWith("/") || /^https?:\/\//.test(p) || /\.(png|jpe?g|webp|avif|svg)$/i.test(p);

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseThings(children: ReactNode): Thing[] {
  const out: Thing[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const glyph = parts.find((p) =>
      (GLYPHS as string[]).includes(p.toLowerCase()),
    );
    const image = parts.slice(1).find(isImagePath);
    out.push({
      label: parts[0],
      glyph: (glyph?.toLowerCase() as Glyph) ?? GLYPHS[out.length % 4],
      image,
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
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

/** Abstrakta konturer. Inga ansikten, ingen robotestetik. */
function ThingGlyph({ kind }: { kind: Glyph }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 48 48" style={{ width: "100%", height: "100%" }}>
      {kind === "gosedjur" ? (
        <g {...common}>
          <circle cx={16} cy={13} r={5} />
          <circle cx={32} cy={13} r={5} />
          <path d="M24 40c-8 0-13-5-13-13s5-11 13-11 13 4 13 11-5 13-13 13z" />
          <circle cx={20} cy={25} r={1.4} fill="currentColor" stroke="none" />
          <circle cx={28} cy={25} r={1.4} fill="currentColor" stroke="none" />
        </g>
      ) : null}
      {kind === "robot" ? (
        <g {...common}>
          <ellipse cx={24} cy={28} rx={17} ry={9} />
          <ellipse cx={24} cy={24} rx={17} ry={9} />
          <path d="M17 24h14" />
          {/* Namnbrickan — det är den som gör den till någon */}
          <rect x={16} y={9} width={16} height={8} rx={2} />
          <path d="M20 13h8" />
        </g>
      ) : null}
      {kind === "agg" ? (
        <g {...common}>
          <path d="M24 5c8 0 14 11 14 20s-6 18-14 18-14-9-14-18S16 5 24 5z" />
          <rect x={16} y={19} width={16} height={12} rx={2} />
          <path d="M20 25h3M26 25h3" />
        </g>
      ) : null}
      {kind === "chatt" ? (
        <g {...common}>
          <path d="M8 12a4 4 0 014-4h24a4 4 0 014 4v14a4 4 0 01-4 4H20l-8 7v-7a4 4 0 01-4-4z" />
          <path d="M16 17h16M16 23h10" />
        </g>
      ) : null}
    </svg>
  );
}

export function AnthropomorphismLine({
  chapter,
  kicker,
  statement,
  reveal,
  projectionLabel = "vi läser in liv",
  responseLabel = "den svarar tillbaka",
  imageSize,
  children,
}: AnthropomorphismLineProps) {
  // Bildstorleken skalar med vw men har golv och tak så att raden håller
  // ihop på både projektor och laptop.
  const imgVw =
    typeof imageSize === "string" ? parseFloat(imageSize) : (imageSize ?? 10.5);
  const imgSize = `clamp(${(imgVw * 0.48).toFixed(2)}rem, ${imgVw}vw, ${(imgVw * 0.95).toFixed(2)}rem)`;

  const things = useMemo(() => parseThings(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(things.length + (reveal ? 1 : 0));
  const answered = Boolean(reveal) && step >= things.length;
  const lastIndex = things.length - 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.4rem, 3.5vh, 2.6rem)",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ————— Påståendet ————— */}
        {statement ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, delay: 0.1 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.4rem, 2.5vw, 2.4rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              maxWidth: "20em",
            }}
          >
            <EditableText path="statement" value={statement}>
              {renderInline(statement)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* ————— Linjen med tingen ————— */}
        <div style={{ position: "relative", paddingTop: "clamp(1.8rem, 4vh, 2.8rem)" }}>
          {/* Projektionsetikett */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            ↓ {projectionLabel}
          </div>

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(things.length, 1)}, 1fr)`,
              gap: "clamp(0.6rem, 1.6vw, 1.6rem)",
              alignItems: "end",
            }}
          >
            {/* Linjen som växer genom alla ting */}
            <motion.span
              aria-hidden
              initial={false}
              animate={{
                scaleX:
                  things.length > 1
                    ? Math.min(step + 1, things.length) / things.length
                    : 1,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: `calc(${LABEL_FONT} * 2.6 + clamp(0.4rem, 1vh, 0.7rem) + 0.25rem)`,
                height: "1.5px",
                background: "color-mix(in srgb, var(--accent) 55%, transparent)",
                transformOrigin: "left",
              }}
            />

            {things.map((thing, i) => {
              const lit = step >= i;
              const isLast = i === lastIndex;
              const glowing = isLast && answered;
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: lit ? 1 : 0.14, y: lit ? 0 : 8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "clamp(0.4rem, 1vh, 0.7rem)",
                    zIndex: 2,
                  }}
                >
                  {/* Pil ned — vi projicerar */}
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={{ opacity: lit ? 0.5 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.5 }}
                    style={{
                      width: "1.5px",
                      height: "clamp(1.1rem, 2.6vh, 1.9rem)",
                      background:
                        "linear-gradient(to bottom, transparent, var(--accent))",
                    }}
                  />

                  {thing.image ? (
                    <img
                      src={thing.image}
                      alt=""
                      style={{
                        width: imgSize,
                        height: imgSize,
                        objectFit: "contain",
                        filter: glowing
                          ? "drop-shadow(0 0 22px var(--accent-glow))"
                          : "drop-shadow(0 10px 22px rgba(0, 0, 0, 0.28))",
                        transition: reduceMotion ? "none" : "filter 0.6s",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "clamp(2.6rem, 5vw, 4rem)",
                        height: "clamp(2.6rem, 5vw, 4rem)",
                        color: glowing ? "var(--accent)" : "var(--text)",
                        filter: glowing
                          ? "drop-shadow(0 0 14px var(--accent-glow))"
                          : "none",
                        transition: reduceMotion ? "none" : "color 0.6s, filter 0.6s",
                      }}
                    >
                      <ThingGlyph kind={thing.glyph} />
                    </div>
                  )}

                  {/* Punkten på linjen */}
                  <span
                    aria-hidden
                    style={{
                      width: glowing ? "0.65rem" : "0.45rem",
                      height: glowing ? "0.65rem" : "0.45rem",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      boxShadow: glowing
                        ? "0 0 20px var(--accent-glow)"
                        : "0 0 8px var(--accent-glow)",
                      transition: reduceMotion ? "none" : "all 0.5s",
                    }}
                  />

                  <div
                    style={{
                      minHeight: "2.6em",
                      textAlign: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: LABEL_FONT,
                      lineHeight: 1.3,
                      color: glowing ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: glowing ? 700 : 500,
                      transition: reduceMotion ? "none" : "color 0.6s",
                    }}
                  >
                    {thing.label}
                  </div>

                  {/* Pilen tillbaka — bara från det sista tinget */}
                  {isLast ? (
                    <motion.div
                      initial={false}
                      animate={{ opacity: answered ? 1 : 0, y: answered ? 0 : -8 }}
                      transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
                      style={{
                        position: "absolute",
                        top: "clamp(-0.4rem, -1vh, -0.2rem)",
                        left: "calc(50% + clamp(1.6rem, 3.2vw, 2.6rem))",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: "1.5px",
                          height: "clamp(1.1rem, 2.6vh, 1.9rem)",
                          background:
                            "linear-gradient(to top, transparent, var(--accent))",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          color: "var(--accent)",
                        }}
                      >
                        ↑ {responseLabel}
                      </span>
                    </motion.div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ————— Vändningen ————— */}
        {reveal ? (
          <motion.div
            initial={false}
            animate={{ opacity: answered ? 1 : 0, y: answered ? 0 : 12 }}
            transition={{
              duration: reduceMotion ? 0 : 0.8,
              delay: reduceMotion || !answered ? 0 : 0.25,
              ease: EASE,
            }}
            style={{
              paddingTop: "clamp(0.8rem, 1.8vh, 1.3rem)",
              borderTop: "2px solid var(--accent)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.25rem, 2.2vw, 2.1rem)",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="reveal" value={reveal}>
              {renderInline(reveal)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
