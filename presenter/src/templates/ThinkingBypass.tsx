"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ThinkingBypass ★ — vägen genom tänkandet, och vägen runt.
 *
 * Kognitiv avlastning är inget nytt, och det är därför invändningen
 * "miniräknaren då?" alltid kommer. Skillnaden går inte att avfärda med
 * ord men den går att rita: miniräknaren låg PÅ vägen genom tänkandet.
 * Det nya ligger BREDVID den.
 *
 * Tiden gör argumentet. Den långa vägen ritas i tre och en halv sekund
 * och stannar vid varje beat — förstå, pröva, fastna, förstå igen. Sedan
 * snärtar genvägen förbi på fyra tiondelar. Ingen behöver få skillnaden
 * förklarad efter att ha sett den.
 *
 * Säg ingenting under steg 1. Låt snärten vara hela repliken.
 *
 * ```mdx
 * <ThinkingBypass
 *   chapter="§ Genvägen"
 *   whisper="Kognitiv avlastning är inget nytt — miniräknaren, formelsamlingen, stavningskontrollen."
 *   startLabel="Uppgift"
 *   endLabel="Svar"
 *   throughLabel="Tänkandet"
 *   bypassLabel="Öppen dygnet runt"
 *   landing="Det nya ligger inte **på** vägen genom tänkandet. Det ligger **bredvid** den."
 * >
 * - förstå
 * - pröva
 * - fastna
 * - förstå igen
 * </ThinkingBypass>
 * ```
 */

interface ThinkingBypassProps {
  chapter?: string;
  kicker?: string;
  /** Lågmäld rad överst — invändningen du tar udden av. */
  whisper?: string;
  startLabel?: string;
  endLabel?: string;
  /** Namnet på det man går igenom. */
  throughLabel?: string;
  /** Etikett på genvägen. */
  bypassLabel?: string;
  /** Landningsraden. Stödjer **fet**. */
  landing?: string;
  source?: string;
  accent?: string;
  /** Markdown-lista: beats inne i tänkandet. Fyra är optimum. */
  children?: ReactNode;
}

const W = 960;
const H = 380;

const START = { x: 84, y: 250 };
const END = { x: 876, y: 250 };
const BOX = { x: 268, y: 206, w: 424, h: 88 };

/** Den långa vägen: in i lådan, tvärs igenom, ut på andra sidan. */
const LONG = `M ${START.x} ${START.y} L ${BOX.x} ${START.y} L ${BOX.x + BOX.w} ${START.y} L ${END.x} ${END.y}`;
/** Genvägen: en båge över alltihop. */
const BYPASS = `M ${START.x} ${START.y} C 240 62 300 46 480 46 C 660 46 720 62 ${END.x} ${END.y}`;

const DRAW = 3.5;

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const t = extractText(el.props.children).trim();
        if (t) out.push(t);
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out.slice(0, 5);
}

export function ThinkingBypass({
  chapter,
  kicker,
  whisper,
  startLabel = "Uppgift",
  endLabel = "Svar",
  throughLabel = "Tänkandet",
  bypassLabel = "Öppen dygnet runt",
  landing,
  source,
  accent = "var(--accent)",
  children,
}: ThinkingBypassProps) {
  const step = useSlideSteps(2);
  const bypassed = step >= 1;
  const beats = parseItems(children);

  const muted = "var(--text-muted)";
  const line = "rgba(128,128,128,0.45)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.2rem, 4.5vh, 4rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(4.5rem, 8vh, 6rem)",
          gap: "clamp(0.8rem, 1.8vh, 1.4rem)",
          zIndex: 2,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        {whisper ? (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.4vw, 1.3rem)",
              lineHeight: 1.35,
              color: muted,
              maxWidth: "60ch",
            }}
          >
            <EditableText path="whisper" value={whisper} multiline block>
              {inlineMarkdown(whisper)}
            </EditableText>
          </div>
        ) : null}

        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", maxHeight: "100%", overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <filter id="tb-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Tänkandet — lådan man går igenom */}
            <motion.rect
              x={BOX.x}
              y={BOX.y}
              width={BOX.w}
              height={BOX.h}
              rx={10}
              fill="var(--bg-surface)"
              stroke={line}
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: bypassed ? 0.45 : 1 }}
              transition={{ duration: 0.7, delay: bypassed ? 0.25 : 0.2 }}
            />
            <motion.text
              x={BOX.x + BOX.w / 2}
              y={BOX.y - 16}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fill: bypassed ? muted : "var(--text)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {throughLabel}
            </motion.text>

            {/* Den långa vägen */}
            <motion.path
              d={LONG}
              fill="none"
              stroke={bypassed ? line : "var(--text)"}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: DRAW, delay: 0.45, ease: "linear" }}
            />

            {/* Beats inne i tänkandet — de dyker upp i takt med att linjen kryper */}
            {beats.map((b, i) => {
              const x = BOX.x + (BOX.w / (beats.length + 1)) * (i + 1);
              const at = 0.45 + DRAW * (0.28 + (i / Math.max(beats.length, 1)) * 0.42);
              return (
                <g key={i}>
                  <motion.circle
                    cx={x}
                    cy={START.y}
                    r={6}
                    fill="var(--bg)"
                    stroke={bypassed ? line : accent}
                    strokeWidth={2.5}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: at, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ transformOrigin: `${x}px ${START.y}px` }}
                  />
                  <motion.text
                    x={x}
                    y={START.y + 30}
                    textAnchor="middle"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 15,
                      letterSpacing: "0.1em",
                      fill: bypassed ? line : muted,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: at + 0.1 }}
                  >
                    {b}
                  </motion.text>
                </g>
              );
            })}

            {/* Genvägen — snärtar förbi */}
            <motion.path
              d={BYPASS}
              fill="none"
              stroke={accent}
              strokeWidth={4.5}
              strokeLinecap="round"
              filter="url(#tb-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={bypassed ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
            <motion.text
              x={480}
              y={30}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                fill: accent,
              }}
              initial={{ opacity: 0 }}
              animate={bypassed ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {bypassLabel}
            </motion.text>

            {/* Ändpunkterna */}
            <Endpoint x={START.x} y={START.y} label={startLabel} align="start" accent={accent} muted={muted} />
            <Endpoint x={END.x} y={END.y} label={endLabel} align="end" accent={accent} muted={muted} />
          </svg>
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={bypassed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            style={{
              paddingTop: "clamp(0.8rem, 1.6vh, 1.3rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.35rem, 2.5vw, 2.3rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            <EditableText path="landing" value={landing} multiline block>
              {inlineMarkdown(landing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {source ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(1.4rem, 2.6vh, 2rem)",
            right: "clamp(3rem, 6vw, 7rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.8rem)",
            letterSpacing: "0.12em",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="source" value={source}>
            {source}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}

function Endpoint({
  x,
  y,
  label,
  align,
  accent,
  muted,
}: {
  x: number;
  y: number;
  label?: string;
  align: "start" | "end";
  accent: string;
  muted: string;
}) {
  return (
    <g>
      <motion.circle
        cx={x}
        cy={y}
        r={9}
        fill="var(--bg)"
        stroke={accent}
        strokeWidth={3}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: align === "start" ? 0.15 : 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
      {label ? (
        <motion.text
          x={x}
          y={y + 42}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            fill: "var(--text)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: align === "start" ? 0.25 : 0.4 }}
        >
          {label}
        </motion.text>
      ) : null}
    </g>
  );
}
