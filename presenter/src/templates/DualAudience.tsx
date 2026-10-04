"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DualAudience — de två föreläsningarna som pågår samtidigt.
 *
 * Vänster sida är det eleverna behöver förstå, höger sida är det läraren
 * behöver kunna undervisa. De kommer fram var för sig, och på sista klicket
 * **kollapsar glappet mellan dem**: panelerna glider ihop, skarven blir en
 * glödande accent-söm, och sammanslagningen landar under dem.
 *
 * Rörelsen är argumentet. Lärarna i salen är både elever och didaktiker
 * under timmen, och bilden säger det utan att någon behöver förklara det.
 *
 * ```mdx
 * <DualAudience
 *   kicker="Två föreläsningar samtidigt"
 *   leftTitle="Det eleverna behöver förstå"
 *   rightTitle="Det du behöver kunna undervisa"
 *   merge="AI-litteracitet i praktiken"
 *   mergeNote="Samma innehåll — två riktningar."
 * >
 * - L Vad AI faktiskt gör när den svarar
 * - L När den hjälper och när den tar över
 * - R Hur du gör förståelsen undervisningsbar
 * - R Vilken aktivitet som passar din elevgrupp
 * </DualAudience>
 * ```
 *
 * Rader som börjar med `L ` hamnar till vänster, `R ` till höger.
 * Utan children fungerar bilden ändå — då bär rubrikerna ensamma.
 */

interface DualAudienceProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Vänstra panelens rubrik. */
  leftTitle?: string;
  /** Högra panelens rubrik. */
  rightTitle?: string;
  /** Vad de två blir tillsammans — landar på sista steget. */
  merge?: string;
  /** Liten rad under sammanslagningen. */
  mergeNote?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

function parseSides(children: ReactNode): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const m = raw.match(/^([LRVH])\s+(.*)$/s);
    if (!m) return;
    const target = m[1] === "L" || m[1] === "V" ? left : right;
    target.push(m[2].trim());
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
  return { left, right };
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

interface PanelProps {
  title?: string;
  items: string[];
  side: "left" | "right";
  shown: boolean;
  merged: boolean;
  reduceMotion: boolean;
  titlePath: string;
}

function Panel({
  title,
  items,
  side,
  shown,
  merged,
  reduceMotion,
  titlePath,
}: PanelProps) {
  const isLeft = side === "left";
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: shown ? 1 : 0,
        x: shown ? 0 : isLeft ? -40 : 40,
      }}
      transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
      style={{
        minWidth: 0,
        padding: "clamp(1.3rem, 2.6vw, 2.4rem)",
        background: "var(--bg-elevated)",
        border: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
        // Insidan mot skarven tappar sin rundning när panelerna möts.
        borderRadius: merged
          ? isLeft
            ? "var(--radius) 0 0 var(--radius)"
            : "0 var(--radius) var(--radius) 0"
          : "var(--radius)",
        borderRightWidth: merged && isLeft ? 0 : 1,
        borderLeftWidth: merged && !isLeft ? 0 : 1,
        transition: reduceMotion ? "none" : "border-radius 0.7s, border-width 0.7s",
        textAlign: isLeft ? "left" : "right",
      }}
    >
      {title ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1.05rem, 1.7vw, 1.65rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.015em",
            color: "var(--text)",
          }}
        >
          <EditableText path={titlePath} value={title}>
            {renderInline(title)}
          </EditableText>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div
          style={{
            marginTop: "clamp(0.9rem, 2vh, 1.4rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.5rem, 1.1vh, 0.85rem)",
          }}
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion || !shown ? 0 : 0.25 + i * 0.12,
                ease: EASE,
              }}
              style={{
                display: "flex",
                flexDirection: isLeft ? "row" : "row-reverse",
                alignItems: "baseline",
                gap: "0.7em",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.85rem, 1.1vw, 1.05rem)",
                lineHeight: 1.45,
                color: "var(--text-muted)",
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: "0.4rem",
                  height: "0.4rem",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  transform: "translateY(-0.15em)",
                }}
              />
              <span>{renderInline(item)}</span>
            </motion.div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

export function DualAudience({
  chapter,
  kicker,
  leftTitle,
  rightTitle,
  merge,
  mergeNote,
  children,
}: DualAudienceProps) {
  const { left, right } = useMemo(() => parseSides(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  // 0: vänster · 1: höger · 2: de förs ihop
  const step = useSlideSteps(merge ? 3 : 2);
  const leftShown = step >= 0;
  const rightShown = step >= 1;
  const merged = Boolean(merge) && step >= 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 15%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
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
              marginBottom: "clamp(1.4rem, 3.5vh, 2.6rem)",
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

        {/* ————— De två panelerna ————— */}
        <motion.div
          initial={false}
          animate={{ gap: merged ? 0 : undefined }}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: merged ? 0 : "clamp(1rem, 2.5vw, 2.4rem)",
            alignItems: "stretch",
            transition: reduceMotion ? "none" : "gap 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <Panel
            title={leftTitle}
            items={left}
            side="left"
            shown={leftShown}
            merged={merged}
            reduceMotion={reduceMotion}
            titlePath="leftTitle"
          />
          <Panel
            title={rightTitle}
            items={right}
            side="right"
            shown={rightShown}
            merged={merged}
            reduceMotion={reduceMotion}
            titlePath="rightTitle"
          />

          {/* Sömmen — glöder först när panelerna faktiskt möts */}
          <motion.span
            aria-hidden
            initial={false}
            animate={{
              opacity: merged ? 1 : 0,
              scaleY: merged ? 1 : 0.4,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
            style={{
              position: "absolute",
              left: "50%",
              top: "8%",
              bottom: "8%",
              width: "2px",
              marginLeft: "-1px",
              background: "var(--accent)",
              boxShadow: "0 0 24px var(--accent-glow)",
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* ————— Sammanslagningen ————— */}
        {merge ? (
          <motion.div
            initial={false}
            animate={{
              opacity: merged ? 1 : 0,
              y: merged ? 0 : -14,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.8,
              delay: reduceMotion || !merged ? 0 : 0.3,
              ease: EASE,
            }}
            style={{
              marginTop: "clamp(1.4rem, 3.5vh, 2.4rem)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(0.4rem, 1vh, 0.7rem)",
            }}
          >
            {/* Pil ner från sömmen */}
            <motion.span
              aria-hidden
              initial={false}
              animate={{ opacity: merged ? 0.55 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay: 0.2 }}
              style={{
                display: "block",
                width: "2px",
                height: "clamp(0.9rem, 2vh, 1.5rem)",
                background:
                  "linear-gradient(to bottom, var(--accent), transparent)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.4rem, 2.6vw, 2.5rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                color: "var(--accent)",
                textAlign: "center",
                textShadow: "0 8px 45px var(--accent-glow)",
              }}
            >
              <EditableText path="merge" value={merge}>
                {merge}
              </EditableText>
            </div>
            {mergeNote ? (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.85rem, 1.2vw, 1.15rem)",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                <EditableText path="mergeNote" value={mergeNote}>
                  {mergeNote}
                </EditableText>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
