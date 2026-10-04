"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

type ZoneTone = "neutral" | "danger" | "success";

interface Zone {
  label: string;
  tone: ZoneTone;
  description: string;
}

interface UCurveChartProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  xLabel?: string;
  yLabel?: string;
  /** Etikett vid x-axelns vänstra ände. Default "Ingen". */
  xMinLabel?: string;
  /** Etikett vid x-axelns högra ände. Default "Omfattande". */
  xMaxLabel?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista med zonbeskrivningar.
   * Format: `- Label · tone · Description`
   * Tones: neutral | danger | success
   * Zonerna blir lika breda band längs x-axeln, med streckade avdelare.
   *
   * Kurvformen anpassas efter antal zoner:
   * - 3 zoner → Hardman-originalet: dipp i mitten, högst uppe till höger.
   * - 4+ zoner → U + krasch: topp i zon 3, ras i sista zonen (total delegation).
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

function parseZones(children: ReactNode): Zone[] {
  const out: Zone[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const label = parts[0].trim();
    const toneRaw = (parts[1] ?? "neutral").trim().toLowerCase() as ZoneTone;
    const tone =
      toneRaw === "danger" || toneRaw === "success" || toneRaw === "neutral"
        ? toneRaw
        : "neutral";
    const description = parts.slice(2).join(" · ").trim();
    out.push({ label, tone, description });
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

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg)
    return "radial-gradient(ellipse at 50% 30%, var(--bg-elevated, var(--bg-surface)) 0%, var(--bg) 70%)";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function toneColor(tone: ZoneTone, accent: string): string {
  switch (tone) {
    case "danger":
      return "var(--accent-alert, #E84D4D)";
    case "success":
      return accent;
    default:
      return "var(--text-muted)";
  }
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

type CurveVariant = "rise" | "crash";

/**
 * Beräkna Y-position för en given X på U-kurvan.
 * X i [0, 1] (0 = längst vänster, 1 = längst höger).
 * Returnerar Y i [0, 1] där 0 = botten, 1 = toppen.
 *
 * Två varianter:
 * - "rise" (3 zoner) — Hardman-originalet: måttligt hög start,
 *   dipp i mitten (halvhjärtat = sämst), stiger till sin högsta
 *   punkt längst till höger. Ingen krasch.
 * - "crash" (4+ zoner) — U + ras: som ovan men med topp i zon 3
 *   och ras i sista zonen (total delegation).
 */
function uCurveY(x: number, variant: CurveVariant): number {
  const smoothstep = (t: number) => t * t * (3 - 2 * t);
  if (variant === "rise") {
    // Start y=0.60 → dipp y=0.16 vid x=0.48 → topp y=0.90 vid x=1.0
    if (x <= 0.48) {
      const t = x / 0.48;
      return 0.6 - 0.44 * smoothstep(t);
    }
    const t = (x - 0.48) / 0.52;
    return 0.16 + 0.74 * smoothstep(t);
  }
  // "crash": start 0.55 → dipp 0.25 vid 0.3 → topp 0.85 vid 0.7 → ras till 0.2
  if (x <= 0.3) {
    const t = x / 0.3;
    return 0.55 - 0.3 * (t * t);
  } else if (x <= 0.7) {
    const t = (x - 0.3) / 0.4;
    return 0.25 + 0.6 * smoothstep(t);
  } else {
    const t = (x - 0.7) / 0.3;
    return 0.85 - 0.65 * (t * t);
  }
}

/**
 * UCurveChart — animerad SVG-visualisering av en U-kurva med zonindikatorer.
 *
 * Kurvan ritas fram från vänster till höger (stroke-dasharray).
 * Zoner tänds upp i sekvens med labels + beskrivningar.
 * "Danger"-zoner pulsar subtilt.
 *
 * Use case: forsknings-slides om kognitiv avlastning, skärmtid,
 * AI-användning — överallt där en U-kurva förklarar optimal punkt.
 */
export function UCurveChart({
  chapter,
  title,
  subtitle,
  xLabel = "AI-beroende →",
  yLabel = "Lärande →",
  xMinLabel = "Ingen",
  xMaxLabel = "Omfattande",
  background,
  accent = "var(--accent)",
  overlay = 0.55,
  children,
}: UCurveChartProps) {
  const zones = parseZones(children);
  const variant: CurveVariant = zones.length >= 4 ? "crash" : "rise";

  // Visningsbox — vi använder fast viewBox
  const vbW = 1200;
  const vbH = 560;
  const padL = 100;
  const padR = 80;
  const padT = 40;
  const padB = 120;
  const plotW = vbW - padL - padR;
  const plotH = vbH - padT - padB;

  // Generera path-punkter för kurvan
  const pathData = useMemo(() => {
    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = padL + t * plotW;
      const y = padT + (1 - uCurveY(t, variant)) * plotH;
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }, [padL, plotW, padT, plotH, variant]);

  // Positioner för zonmarkörer längs kurvan.
  // "rise" (Hardman-originalet): semantiska ankarpunkter som i förlagan —
  // dot 1 tidigt på nedförsbacken, dot 2 i dippens botten, dot 3 nära toppen.
  // "crash": mitt i varje zonband (som tidigare).
  const zonePositions = useMemo(() => {
    const N = zones.length;
    const riseAnchors = [0.07, 0.5, 0.93];
    return zones.map((zone, i) => {
      const curveT =
        variant === "rise" && N === 3
          ? riseAnchors[i]
          : N === 1
            ? 0.5
            : (i + 0.5) / N;
      const x = padL + curveT * plotW;
      const y = padT + (1 - uCurveY(curveT, variant)) * plotH;
      return { x, y, zone, curveT };
    });
  }, [zones, padL, plotW, padT, plotH, variant]);

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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 4vw, 4rem)",
          gap: "clamp(1rem, 2vh, 1.8rem)",
          zIndex: 2,
        }}
      >
        {/* Rubrik-sektion */}
        <div style={{ flexShrink: 0 }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2.4rem, 4.5vw, 4.2rem)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title}>
                {renderInline(title, accent)}
              </EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--room-body, clamp(1.1rem, 1.4vw, 1.5rem))",
                color: "var(--text-muted)",
                marginTop: "0.4rem",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {renderInline(subtitle, accent)}
              </EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* Zonkort — ovanför diagrammet, som i Hardman-förlagan */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(zones.length, 1)}, 1fr)`,
            gap: "clamp(0.8rem, 1.5vw, 1.5rem)",
            flexShrink: 0,
            paddingLeft: "clamp(2rem, 5vw, 5rem)",
            paddingRight: "clamp(1.5rem, 4vw, 4rem)",
          }}
        >
          {zones.map((zone, i) => {
            const color = toneColor(zone.tone, accent);
            const baseDelay = 3.8 + i * 0.6 + 0.4;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: baseDelay }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  padding: "clamp(0.7rem, 1.1vw, 1.1rem) clamp(0.8rem, 1.3vw, 1.3rem)",
                  background: `linear-gradient(${withAlpha(color, 0.08)}, ${withAlpha(color, 0.08)}), var(--bg-elevated, var(--bg-surface))`,
                  border: `var(--border-width, 1px) solid ${color}`,
                  borderRadius: "var(--radius, 0.6rem)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--room-detail, clamp(0.75rem, 1vw, 1.05rem))",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color,
                    fontWeight: 700,
                  }}
                >
                  {zone.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--room-body, clamp(0.95rem, 1.25vw, 1.35rem))",
                    color: "var(--text)",
                    lineHeight: 1.4,
                  }}
                >
                  {renderInline(zone.description, accent)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* SVG-diagram */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            style={{ width: "100%", height: "100%", maxHeight: "100%" }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Zonband — tonade fält per zon, som i Hardman-förlagan */}
            {zones.map((zone, i) => {
              const color = toneColor(zone.tone, accent);
              const bandX = padL + (i / zones.length) * plotW;
              const bandW = plotW / zones.length;
              return (
                <motion.rect
                  key={`band-${i}`}
                  x={bandX}
                  y={padT}
                  width={bandW}
                  height={plotH}
                  fill={color}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.06 }}
                  transition={{ duration: 0.8, delay: 0.6 + i * 0.15 }}
                />
              );
            })}
            {/* Streckade avdelare mellan zonbanden */}
            {zones.slice(0, -1).map((_, i) => {
              const sepX = padL + ((i + 1) / zones.length) * plotW;
              return (
                <motion.line
                  key={`sep-${i}`}
                  x1={sepX}
                  y1={padT}
                  x2={sepX}
                  y2={padT + plotH}
                  stroke={withAlpha("var(--text)", 0.25)}
                  strokeWidth="1"
                  strokeDasharray="6 6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                />
              );
            })}

            {/* Axel-linjer */}
            <motion.line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke={withAlpha("var(--text)", 0.3)}
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            />
            <motion.line
              x1={padL}
              y1={padT}
              x2={padL}
              y2={padT + plotH}
              stroke={withAlpha("var(--text)", 0.3)}
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            />

            {/* Axel-etiketter */}
            <motion.text
              x={padL + plotW / 2}
              y={vbH - 40}
              textAnchor="middle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "16px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fill: "var(--text-muted)",
              }}
            >
              {xLabel}
            </motion.text>
            {/* Ändpunktsetiketter på x-axeln (Ingen → Omfattande) */}
            <motion.text
              x={padL}
              y={padT + plotH + 36}
              textAnchor="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "17px",
                fill: "var(--text-muted)",
              }}
            >
              {xMinLabel}
            </motion.text>
            <motion.text
              x={padL + plotW}
              y={padT + plotH + 36}
              textAnchor="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "17px",
                fill: "var(--text-muted)",
              }}
            >
              {xMaxLabel}
            </motion.text>
            <motion.text
              x={-(padT + plotH / 2)}
              y={40}
              textAnchor="middle"
              transform={`rotate(-90)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "16px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fill: "var(--text-muted)",
              }}
            >
              {yLabel}
            </motion.text>

            {/* U-kurvan (glow bakom) */}
            <motion.path
              data-glow=""
              d={pathData}
              fill="none"
              stroke={accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 20px ${withAlpha(accent, 0.53)})` }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 2.5, delay: 1.2, ease: "easeInOut" }}
            />
            {/* U-kurvan (skarp linje) */}
            <motion.path
              d={pathData}
              fill="none"
              stroke="var(--text)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, delay: 1.2, ease: "easeInOut" }}
            />

            {/* Zon-markörer + labels */}
            {zonePositions.map(({ x, y, zone }, i) => {
              const color = toneColor(zone.tone, accent);
              const baseDelay = 3.8 + i * 0.6;
              const isDanger = zone.tone === "danger";
              return (
                <g key={i}>
                  {/* Vertikal stödlinje (subtil) */}
                  <motion.line
                    x1={x}
                    y1={padT + plotH}
                    x2={x}
                    y2={y}
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    opacity={0.3}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 0.6, delay: baseDelay }}
                  />
                  {/* Markör (cirkel) */}
                  <motion.circle
                    data-glow=""
                    cx={x}
                    cy={y}
                    r="14"
                    fill={color}
                    initial={{ r: 0, opacity: 0 }}
                    animate={{
                      r: isDanger ? [14, 18, 14] : 14,
                      opacity: 1,
                    }}
                    transition={{
                      r: isDanger
                        ? { duration: 2, delay: baseDelay + 0.2, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.5, delay: baseDelay },
                      opacity: { duration: 0.5, delay: baseDelay },
                    }}
                    style={{ filter: `drop-shadow(0 0 16px ${color})` }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

      </div>
    </div>
  );
}
