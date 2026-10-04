"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ZoneShift — fokuserad U-kurva som visar förflyttningen från Zone 2
 * (halvhjärtad, sämst utfall) till Zone 3 (engagerad, bäst utfall) plus
 * fyra didaktiska drag som hjälper eleven att flytta sig.
 *
 * Sliden återanvänder U-kurvan från Hardman-forskningen i Beat 2 men
 * fokuserar på SHIFT:en istället för helhetsbilden — en pulserande pil
 * från danger-punkten upp till success-punkten.
 *
 * MDX-format:
 * ```mdx
 * <ZoneShift
 *   chapter="§ Akt 4 · U-kurvan i klassrummet"
 *   title="Flytta eleven från Zon 2 till Zon 3."
 *   subtitle="Fyra didaktiska drag — i kombination, inte isolerat."
 *   accent= "var(--accent)"
 * >
 * - Workflow · Dela ut processen, inte bara uppgiften.
 * - Dialog · Bocka av tankegångar löpande, inte bara slutprodukten.
 * - Transparens · Synliggör vad eleven gjort vs vad AI:n gjort.
 * - Reflektion · Avsluta med "Vad lärde jag mig som AI:n inte kunde göra åt mig?"
 * </ZoneShift>
 * ```
 *
 * Per rad: `Drag · Beskrivning`.
 */

interface ZoneShiftProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Etikett för danger-punkten. Default "Halvhjärtad". */
  dangerLabel?: string;
  /** Etikett för success-punkten. Default "Engagerad". */
  successLabel?: string;
  children?: ReactNode;
}

interface Move {
  name: string;
  description: string;
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

function parseMoves(children: ReactNode): Move[] {
  const out: Move[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const name = (parts[0] ?? "").trim();
    const description = parts.slice(1).join(" · ").trim();
    if (!name) return;
    out.push({ name, description });
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
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

// Återanvänder U-kurvan-mattan från UCurveChart men förenklat
function uCurveY(x: number): number {
  if (x <= 0.3) {
    const t = x / 0.3;
    return 0.55 - 0.3 * (t * t);
  } else if (x <= 0.7) {
    const t = (x - 0.3) / 0.4;
    const eased = t * t * (3 - 2 * t);
    return 0.25 + 0.6 * eased;
  } else {
    const t = (x - 0.7) / 0.3;
    const eased = t * t;
    return 0.85 - 0.65 * eased;
  }
}

const DANGER_COLOR = "#E84D4D";

export function ZoneShift({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  dangerLabel = "Halvhjärtad",
  successLabel = "Engagerad",
  children,
}: ZoneShiftProps) {
  const moves = useMemo(() => parseMoves(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // Steg: 0 = bara kurvan, 1 = + Zon 2-punkten, 2 = + Zon 3-punkten + pil, 3..N = drag
  const step = useSlideSteps(2 + moves.length);

  // SVG-koordinater
  const vbW = 1200;
  const vbH = 480;
  const padL = 80;
  const padR = 80;
  const padT = 60;
  const padB = 80;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  const pathData = useMemo(() => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = padL + t * plotW;
      const y = padT + (1 - uCurveY(t)) * plotH;
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }, [padL, plotW, padT, plotH]);

  // Zone 2 = x ~ 0.3 (sämst), Zone 3 = x ~ 0.7 (bäst)
  const zone2X = padL + 0.3 * plotW;
  const zone2Y = padT + (1 - uCurveY(0.3)) * plotH;
  const zone3X = padL + 0.7 * plotW;
  const zone3Y = padT + (1 - uCurveY(0.7)) * plotH;

  // Showas zon 2-punkten?
  const showZone2 = step >= 1;
  const showZone3 = step >= 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
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
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.2rem, 4vw, 4rem)",
          gap: "clamp(1rem, 2vh, 1.6rem)",
          zIndex: 2,
        }}
      >
        {/* Topp — title + subtitle */}
        <div style={{ flexShrink: 0 }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.9rem, 3.4vw, 3rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                color: "var(--text)",
                marginTop: "0.4rem",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* SVG U-kurva med shift */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 0,
            flex: "0 0 auto",
            height: "clamp(220px, 38vh, 360px)",
          }}
        >
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            style={{ width: "100%", height: "100%", maxHeight: "100%" }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Axel */}
            <motion.line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke="rgba(247,241,230,0.2)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />

            {/* Kurvan, glow */}
            <motion.path
              d={pathData}
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 16px ${withAlpha(accent, 0.4)})` }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1.6, delay: 0.6, ease: "easeInOut" }}
            />
            {/* Kurvan, skarp */}
            <motion.path
              d={pathData}
              fill="none"
              stroke="var(--text)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, delay: 0.6, ease: "easeInOut" }}
            />

            {/* Axel-etiketter */}
            <text
              x={padL + plotW / 2}
              y={vbH - 30}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "16px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fill: "var(--text-muted)",
              }}
            >
              AI-användning →
            </text>

            {/* Zon 2 — danger-punkt */}
            {showZone2 ? (
              <g>
                <motion.circle
                  cx={zone2X}
                  cy={zone2Y}
                  r="14"
                  fill={DANGER_COLOR}
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: [14, 18, 14], opacity: 1 }}
                  transition={{
                    r: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.5 },
                  }}
                  style={{ filter: `drop-shadow(0 0 18px ${DANGER_COLOR})` }}
                />
                <motion.text
                  x={zone2X}
                  y={zone2Y + 50}
                  textAnchor="middle"
                  initial={{ opacity: 0, y: zone2Y + 60 }}
                  animate={{ opacity: 1, y: zone2Y + 50 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "22px",
                    fill: DANGER_COLOR,
                  }}
                >
                  {dangerLabel}
                </motion.text>
                <motion.text
                  x={zone2X}
                  y={zone2Y + 72}
                  textAnchor="middle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    letterSpacing: "0.12em",
                    fill: `${DANGER_COLOR}DD`,
                  }}
                >
                  ZON 2 · sämst
                </motion.text>
              </g>
            ) : null}

            {/* Pil från Zon 2 till Zon 3 — pulserar */}
            {showZone2 && showZone3 ? (
              <g>
                <defs>
                  <marker
                    id="zoneshift-arrow"
                    viewBox="0 0 12 12"
                    refX="6"
                    refY="6"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 12 6 L 0 12 z" fill={accent} />
                  </marker>
                </defs>
                {/* Båge från zon 2 till zon 3 */}
                <motion.path
                  d={`M ${zone2X} ${zone2Y - 30} Q ${(zone2X + zone3X) / 2} ${Math.min(zone2Y, zone3Y) - 110} ${zone3X} ${zone3Y - 30}`}
                  fill="none"
                  stroke={accent}
                  strokeWidth="4"
                  strokeLinecap="round"
                  markerEnd="url(#zoneshift-arrow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.0, delay: 0.4, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 14px ${withAlpha(accent, 0.67)})` }}
                />
                {/* Pulse-glöd kring båge */}
                <motion.path
                  d={`M ${zone2X} ${zone2Y - 30} Q ${(zone2X + zone3X) / 2} ${Math.min(zone2Y, zone3Y) - 110} ${zone3X} ${zone3Y - 30}`}
                  fill="none"
                  stroke={accent}
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.35, 0] }}
                  transition={{
                    duration: 2.2,
                    delay: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ filter: "blur(6px)" }}
                />
              </g>
            ) : null}

            {/* Zon 3 — success-punkt */}
            {showZone3 ? (
              <g>
                <motion.circle
                  cx={zone3X}
                  cy={zone3Y}
                  r="16"
                  fill={accent}
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: [16, 22, 16], opacity: 1 }}
                  transition={{
                    r: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.5, delay: 0.7 },
                  }}
                  style={{ filter: `drop-shadow(0 0 22px ${accent})` }}
                />
                <motion.text
                  x={zone3X}
                  y={zone3Y - 40}
                  textAnchor="middle"
                  initial={{ opacity: 0, y: zone3Y - 30 }}
                  animate={{ opacity: 1, y: zone3Y - 40 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "26px",
                    fill: accent,
                  }}
                >
                  {successLabel}
                </motion.text>
                <motion.text
                  x={zone3X}
                  y={zone3Y - 18}
                  textAnchor="middle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    letterSpacing: "0.12em",
                    fill: accent,
                  }}
                >
                  ZON 3 · bäst
                </motion.text>
              </g>
            ) : null}
          </svg>
        </div>

        {/* Didaktiska drag */}
        {moves.length > 0 ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(moves.length, 1)}, 1fr)`,
              gap: "clamp(0.6rem, 1vw, 1rem)",
              minHeight: 0,
              alignContent: "end",
            }}
          >
            {moves.map((move, i) => {
              const lit = step >= 2 + i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: lit ? 1 : 0.3, y: 0 }}
                  transition={{ duration: 0.55 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    padding: "clamp(0.7rem, 1.2vw, 1.1rem)",
                    borderLeft: `2px solid ${lit ? accent : `${withAlpha(accent, 0.2)}`}`,
                    background: "rgba(20, 18, 15, 0.45)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0 0.4rem 0.4rem 0",
                    transition: "all 0.5s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: lit ? accent : `${withAlpha(accent, 0.4)}`,
                      fontWeight: 700,
                      transition: "color 0.5s",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")} · {move.name}
                  </div>
                  {move.description ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                        color: lit
                          ? "var(--text)"
                          : "var(--text-muted)",
                        lineHeight: 1.4,
                        transition: "color 0.5s",
                      }}
                    >
                      {renderInline(move.description, accent)}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
