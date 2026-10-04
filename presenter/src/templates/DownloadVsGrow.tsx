"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DownloadVsGrow — det som går att hämta mot det som måste växa.
 *
 * Skillnaden mellan intelligens och agens är inte en gradskillnad, och
 * därför duger ingen jämförelsetabell. Den är en skillnad i TID: det ena
 * är färdigt innan du hunnit blinka och ligger sedan stilla, det andra
 * håller på under hela sliden och blir aldrig klart.
 *
 * Hela poängen ligger i asymmetrin. Vänsterspalten fyller sin mätare på
 * åtta tiondelar och slocknar till en avbockad rad. Högerspalten ritar
 * fortfarande sin stjälk när du gått vidare i talet. Säg ingenting om
 * det — publiken ser det.
 *
 * ```mdx
 * <DownloadVsGrow
 *   chapter="§ Agens > intelligens"
 *   leftLabel="Intelligens"
 *   leftVerb="Laddas ner"
 *   leftFile="intelligens.model"
 *   leftDuration="0,8 s"
 *   rightLabel="Agens"
 *   rightVerb="Växer"
 *   rightMeta="pågår"
 *   landing="Det ena kan man hämta. Det andra kan bara **växa i en människa.**"
 * >
 * - vilja
 * - välja
 * - handla
 * </DownloadVsGrow>
 * ```
 */

interface DownloadVsGrowProps {
  chapter?: string;
  kicker?: string;
  /** Rubrik över vänsterspalten. */
  leftLabel?: string;
  /** Vad som händer där — liten versal etikett. */
  leftVerb?: string;
  /** Filnamnet i mätaren. Rent rekvisita, men det säljer bilden. */
  leftFile?: string;
  /** Tiden som visas när mätaren är full. */
  leftDuration?: string;
  /** Raden som står kvar när nedladdningen är klar. */
  leftDone?: string;
  rightLabel?: string;
  rightVerb?: string;
  /** Statusraden under stjälken. Blinkar vidare — den blir aldrig klar. */
  rightMeta?: string;
  /** Landningsraden under båda spalterna. Stödjer **fet**. */
  landing?: string;
  accent?: string;
  /** Markdown-lista: det som växer fram längs stjälken. Tre rader är optimum. */
  children?: ReactNode;
}

const STEM =
  "M 150 404 C 150 344 118 322 132 268 C 146 212 178 198 166 146 C 156 102 138 90 148 40";

/** Ungefärliga punkter längs STEM, nerifrån och upp. */
const NODES = [
  { x: 132, y: 268 },
  { x: 166, y: 146 },
  { x: 148, y: 46 },
];

const DRAW_SECONDS = 7;

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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const text = extractText(el.props.children).trim();
        if (text) out.push(text);
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out.slice(0, NODES.length);
}

export function DownloadVsGrow({
  chapter,
  kicker,
  leftLabel = "Intelligens",
  leftVerb = "Laddas ner",
  leftFile = "intelligens.model",
  leftDuration = "0,8 s",
  leftDone = "Klart. Ingenting mer händer.",
  rightLabel = "Agens",
  rightVerb = "Växer",
  rightMeta = "pågår",
  landing,
  accent = "var(--accent)",
  children,
}: DownloadVsGrowProps) {
  const items = parseItems(children);

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
            color: "var(--text-muted)",
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
          padding: "clamp(2.5rem, 5vh, 4.5rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(4.5rem, 8vh, 6rem)",
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
              marginBottom: "clamp(1rem, 2vh, 1.6rem)",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        <div
          style={{
            flex: "1 1 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr",
            gap: "clamp(1.5rem, 4vw, 4rem)",
            alignItems: "center",
            minHeight: 0,
          }}
        >
          {/* ══ VÄNSTER · hämtas ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.8vh, 1.4rem)" }}>
            <ColumnHead label={leftLabel} verb={leftVerb} accent={accent} path="left" />

            <div
              style={{
                border: "1px solid rgba(128,128,128,0.22)",
                borderRadius: "var(--radius, 0.6rem)",
                padding: "clamp(1rem, 2.2vh, 1.6rem)",
                background: "var(--bg-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.9vw, 0.88rem)",
                  color: "var(--text-muted)",
                  marginBottom: "0.7rem",
                }}
              >
                <span>{leftFile}</span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15, duration: 0.3 }}
                  style={{ color: accent }}
                >
                  {leftDuration}
                </motion.span>
              </div>

              {/* Mätaren — full på åtta tiondelar */}
              <div
                style={{
                  height: "0.55rem",
                  borderRadius: 999,
                  background: "rgba(128,128,128,0.18)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.35, ease: "linear" }}
                  style={{ height: "100%", background: accent, borderRadius: 999 }}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.35, duration: 0.5 }}
                style={{
                  marginTop: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.85vw, 0.85rem)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ color: accent }}>✓</span>
                <EditableText path="leftDone" value={leftDone}>
                  {leftDone}
                </EditableText>
              </motion.div>
            </div>
          </div>

          {/* Hårfin skiljelinje */}
          <div style={{ width: 1, height: "72%", background: "rgba(128,128,128,0.2)", justifySelf: "center" }} />

          {/* ══ HÖGER · växer ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.8vh, 1.4rem)", minHeight: 0 }}>
            <ColumnHead label={rightLabel} verb={rightVerb} accent={accent} path="right" />

            <div style={{ position: "relative", display: "flex", justifyContent: "center", minHeight: 0 }}>
              <svg
                viewBox="0 0 300 430"
                style={{ width: "100%", maxHeight: "clamp(11rem, 34vh, 20rem)", overflow: "visible" }}
                aria-hidden
              >
                <defs>
                  <filter id="dg-glow" x="-70%" y="-70%" width="240%" height="240%">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Marklinjen */}
                <line
                  x1={70}
                  y1={406}
                  x2={230}
                  y2={406}
                  stroke="rgba(128,128,128,0.28)"
                  strokeWidth={1.5}
                />

                {/* Stjälken — ritas långsamt och blir klar långt efter vänsterspalten */}
                <motion.path
                  d={STEM}
                  fill="none"
                  stroke={accent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  filter="url(#dg-glow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: DRAW_SECONDS, delay: 0.35, ease: "easeInOut" }}
                />

                {/* Noderna — det som faktiskt växer fram */}
                {NODES.map((n, i) => {
                  const at = 0.35 + ((i + 1) / (NODES.length + 0.35)) * DRAW_SECONDS;
                  const label = items[i];
                  return (
                    <g key={i}>
                      <motion.circle
                        cx={n.x}
                        cy={n.y}
                        r={7}
                        fill="var(--bg)"
                        stroke={accent}
                        strokeWidth={2.5}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: at, ease: [0.34, 1.56, 0.64, 1] }}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                      />
                      {label ? (
                        <motion.text
                          x={n.x + 18}
                          y={n.y}
                          dominantBaseline="middle"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 17,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            fill: "var(--text)",
                          }}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: at + 0.15 }}
                        >
                          {label}
                        </motion.text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Statusraden som aldrig blir klar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.85vw, 0.85rem)",
                color: "var(--text-muted)",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: "0.4rem",
                  height: "0.4rem",
                  borderRadius: "50%",
                  background: accent,
                  display: "inline-block",
                }}
              />
              <EditableText path="rightMeta" value={rightMeta}>
                {rightMeta}
              </EditableText>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                …
              </motion.span>
            </div>
          </div>
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: DRAW_SECONDS * 0.72 }}
            style={{
              marginTop: "clamp(1.2rem, 2.6vh, 2.2rem)",
              paddingTop: "clamp(1rem, 2vh, 1.6rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
              lineHeight: 1.24,
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
    </div>
  );
}

function ColumnHead({
  label,
  verb,
  accent,
  path,
}: {
  label?: string;
  verb?: string;
  accent: string;
  path: string;
}) {
  return (
    <div>
      {verb ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: "0.35rem",
          }}
        >
          <EditableText path={`${path}Verb`} value={verb}>
            {verb}
          </EditableText>
        </div>
      ) : null}
      {label ? (
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: "clamp(1.5rem, 2.8vw, 2.6rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          <EditableText path={`${path}Label`} value={label}>
            {label}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}
