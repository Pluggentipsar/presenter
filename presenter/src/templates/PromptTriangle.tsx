"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PromptTriangle — promptkunskap som tre hörn i stället för en lista med knep.
 *
 * Mål, kontext och hjälpform tänds ett i taget. Sidorna ritas ut allteftersom
 * hörnen aktiveras, och först när alla tre står fyller triangelns insida med
 * en mjuk accent-vask — bilden av att det är sambandet, inte de enskilda
 * delarna, som gör prompten bra.
 *
 * Poängen den bär: bra promptning är inte magiska ord, det är tydligt
 * tänkande. Därför är formen en figur och inte en checklista.
 *
 * Generell med flit — tre-hörnsformen fungerar för vilken triad som helst
 * och är tänkt att kunna lånas till andra presentationer.
 *
 * ```mdx
 * <PromptTriangle
 *   kicker="§ 2 · Promptkunskap"
 *   title="Tre delar räcker."
 *   bottomLine="Bra promptning är inte magiska ord. Det är **tydligt tänkande**."
 * >
 * - Mål · Vad försöker jag lära mig eller skapa?
 * - Kontext · Vad behöver AI veta om mig, uppgiften och situationen?
 * - Hjälpform · Hur ska AI hjälpa — utan att ta över?
 * </PromptTriangle>
 * ```
 *
 * Per rad: `Hörnets namn · Frågan det ställer`. Exakt tre rader.
 */

interface PromptTriangleProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Rubrik ovanför figuren. */
  title?: string;
  /** Slutrad — landar när alla tre hörn står. `**fet**` blir accent. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Corner {
  name: string;
  question: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Hörnens position i procent. Toppen mitt, basen brett isär. */
const VERTICES = [
  { x: 50, y: 10 },
  { x: 91, y: 87 },
  { x: 9, y: 87 },
];

/** Var etiketten hamnar i förhållande till sitt hörn. */
const LABEL_ALIGN: Array<"center" | "right" | "left"> = [
  "center",
  "right",
  "left",
];

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

function parseCorners(children: ReactNode): Corner[] {
  const out: Corner[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: parts[0].trim(),
      question: parts.slice(1).join(" · ").trim(),
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
  return out.slice(0, 3);
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

export function PromptTriangle({
  chapter,
  kicker,
  title,
  bottomLine,
  children,
}: PromptTriangleProps) {
  const corners = useMemo(() => parseCorners(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(corners.length + (bottomLine ? 1 : 0));
  const complete = step >= corners.length - 1;
  const landed = Boolean(bottomLine) && step >= corners.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 5,
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

      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding:
            "clamp(4.5rem, 9vh, 6.5rem) clamp(2.5rem, 5vw, 5rem) clamp(2.5rem, 5vh, 4rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {title ? (
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.1 }}
            style={{
              margin: 0,
              marginBottom: "clamp(0.6rem, 1.5vh, 1rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.4rem, 2.3vw, 2.2rem)",
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* ————— Triangeln ————— */}
        <div
          style={{
            position: "relative",
            flex: 1,
            // Full bredd i stället för 46rem: figuren låg som en liten ö mitt
            // på duken med tomma marginaler på båda sidor.
            width: "100%",
            minHeight: "clamp(17rem, 54vh, 34rem)",
          }}
        >
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* Insidan fylls när alla tre står — sambandet, inte delarna */}
            <motion.polygon
              points={VERTICES.map((v) => `${v.x},${v.y}`).join(" ")}
              fill="var(--accent)"
              initial={false}
              animate={{ opacity: complete ? 0.08 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 1, ease: EASE }}
            />
            {/* Sidorna ritas ut allteftersom hörnen tänds */}
            {VERTICES.map((v, i) => {
              const next = VERTICES[(i + 1) % VERTICES.length];
              // Sidan mellan hörn i och i+1 kräver att båda står.
              const shown = step >= Math.max(i, (i + 1) % VERTICES.length);
              return (
                <motion.line
                  key={i}
                  x1={v.x}
                  y1={v.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="var(--accent)"
                  strokeWidth={1.4}
                  vectorEffect="non-scaling-stroke"
                  initial={false}
                  animate={{
                    pathLength: shown ? 1 : 0,
                    opacity: shown ? 0.7 : 0,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
                />
              );
            })}
          </svg>

          {/* Hörnen */}
          {corners.map((corner, i) => {
            const v = VERTICES[i];
            if (!v) return null;
            const lit = step >= i;
            const align = LABEL_ALIGN[i];
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: lit ? 1 : 0,
                  scale: lit ? 1 : 0.86,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.65, ease: EASE }}
                style={{
                  position: "absolute",
                  left: `${v.x}%`,
                  top: `${v.y}%`,
                  // x/y, inte CSS-transform: framer-motion bygger om transform
                  // när scale animeras och skulle slänga centreringen.
                  x: "-50%",
                  y: "-50%",
                  width: "clamp(12rem, 27vw, 26rem)",
                  textAlign: align,
                  zIndex: 2,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "block",
                    width: "0.85rem",
                    height: "0.85rem",
                    margin:
                      align === "center"
                        ? "0 auto clamp(0.4rem, 1vh, 0.65rem)"
                        : align === "right"
                          ? "0 0 clamp(0.4rem, 1vh, 0.65rem) auto"
                          : "0 auto clamp(0.4rem, 1vh, 0.65rem) 0",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 18px var(--accent-glow)",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1.5rem, 2.7vw, 2.6rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    color: "var(--accent)",
                  }}
                >
                  {corner.name}
                </div>
                {corner.question ? (
                  <div
                    style={{
                      marginTop: "clamp(0.35rem, 0.9vh, 0.7rem)",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.15rem, 1.8vw, 1.75rem)",
                      lineHeight: 1.32,
                      color: "var(--text-muted)",
                    }}
                  >
                    {corner.question}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              marginTop: "clamp(1rem, 2.5vh, 1.8rem)",
              paddingTop: "clamp(0.8rem, 1.6vh, 1.2rem)",
              borderTop: "2px solid var(--accent)",
              maxWidth: "26em",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.05rem, 1.55vw, 1.55rem)",
              lineHeight: 1.35,
              color: "var(--text)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {renderInline(bottomLine)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
