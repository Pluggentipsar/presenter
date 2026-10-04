"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface MetrCurveProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Y-axel-etikett, t.ex. "Tid till uppgift med 50% lyckandegrad". */
  yLabel?: string;
  /** Källa, visas litet längst ner. */
  source?: string;
  /** Avslutande mening — italic. */
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * X-axelläge. "time" (default) = linjär tidsskala 2019→2026.5.
   * "ordinal" = jämnt fördelade punkter (vart steg lika brett) — använd
   * när datan är tät i ena änden (många nya modeller) och tidsskalan
   * skulle klumpa ihop dem. Då blir x-etiketterna varje punkts datum.
   */
  xMode?: "time" | "ordinal";
  /**
   * Markdown-lista med datapunkter. Format per rad:
   * `- YYYY-MM · model name · hours`
   *
   * Hours kan vara ett decimaltal (0.083 = 5 min, 0.5 = 30 min, 12 = 12h).
   *
   * Exempel:
   * - 2019-04 · GPT-2 · 0.001
   * - 2026-04 · Claude Opus 4.6 · 12
   */
  children?: ReactNode;
}

interface DataPoint {
  dateStr: string;
  date: number; // years since 2019, decimal
  model: string;
  hours: number;
}

// Skala: log10(hours) från -2.5 (~11 sek) till 1.15 (~14h)
// Komprimerad så earliest data points (GPT-2 = 15 sek) sitter nära botten
const LOG_MIN = -2.5;
const LOG_MAX = 1.15;
// X-axel: 2019 → 2026
const YEAR_MIN = 2019;
const YEAR_MAX = 2026.5;

// Y-axelmarkörer (timmar)
const Y_TICKS: Array<{ hours: number; label: string }> = [
  { hours: 12, label: "12 h" },
  { hours: 6, label: "6 h" },
  { hours: 3, label: "3 h" },
  { hours: 1, label: "1 h" },
  { hours: 0.5, label: "30 min" },
  { hours: 0.083, label: "5 min" },
  { hours: 0.0083, label: "30 sek" },
];

// X-axelmarkörer (år)
const X_TICKS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parsePoints(children: ReactNode): DataPoint[] {
  const out: DataPoint[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (parts.length < 3) return;
    const dateStr = parts[0];
    const model = parts[1];
    const hours = parseFloat(parts[2]);
    if (Number.isNaN(hours)) return;
    // Parse YYYY-MM
    const m = dateStr.match(/^(\d{4})(?:-(\d{1,2}))?$/);
    if (!m) return;
    const year = parseInt(m[1], 10);
    const month = m[2] ? parseInt(m[2], 10) : 1;
    const dateNum = year + (month - 1) / 12;
    out.push({ dateStr, date: dateNum, model, hours });
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
  out.sort((a, b) => a.date - b.date);
  return out;
}

// Konvertera till plot-koordinater (0-100 procent)
function xPos(date: number): number {
  return ((date - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
}

function yPos(hours: number): number {
  const log = Math.log10(Math.max(hours, 0.0001));
  // Inverterad eftersom SVG y går nedåt
  return 100 - ((log - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

/**
 * MetrCurve — exponentiell kapacitetskurva i SVG. Plotter datapunkter
 * (modell vs tid till uppgift med 50% lyckandegrad) på log-y-skala.
 * Datapunkter glow:ar in sekventiellt; en smooth curve dras därefter
 * mellan dem; sista punkten pulserar för att visa "we are here".
 *
 * Inspiration: METR.org's chart om autonomous coding capability over time.
 */
export function MetrCurve({
  chapter,
  title,
  subtitle,
  yLabel,
  source,
  closing,
  background,
  accent = "#5DBE7B",
  overlay,
  xMode = "time",
  children,
}: MetrCurveProps) {
  const points = useMemo(() => parsePoints(children), [children]);

  // X-position per punkt (0-100). Time-läge: linjär datumskala. Ordinal-läge:
  // jämnt fördelat med insets så första/sista etiketten ryms.
  const ORD_LEFT = 4;
  const ORD_RIGHT = 8;
  const xs = useMemo(
    () =>
      points.map((p, i) =>
        xMode === "ordinal"
          ? points.length <= 1
            ? 50
            : ORD_LEFT + (i / (points.length - 1)) * (100 - ORD_LEFT - ORD_RIGHT)
          : xPos(p.date),
      ),
    [points, xMode],
  );

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    // Smooth curve via cardinal spline (med Catmull-Rom-aktig interpolation)
    const coords = points.map((p, i) => ({ x: xs[i], y: yPos(p.hours) }));
    if (coords.length < 2) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];
      // Catmull-Rom → cubic bezier
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points, xs]);

  const dotStaggerStart = 1.0;
  const dotStaggerStep = 0.18;
  const totalDotDuration = dotStaggerStart + points.length * dotStaggerStep;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 4rem)",
          gap: "clamp(0.75rem, 1.5vh, 1.25rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.4rem", maxWidth: "44em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.6rem, 3.6vw, 3rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "38em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Chart container */}
        <div
          className="relative flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gridTemplateRows: "1fr auto",
            gap: "0.5rem",
          }}
        >
          {/* Y-axel labels */}
          <div
            style={{
              gridColumn: 1,
              gridRow: 1,
              position: "relative",
              paddingRight: "0.6rem",
              minWidth: "clamp(3rem, 4vw, 4.5rem)",
            }}
          >
            {Y_TICKS.map((tick) => {
              const yp = yPos(tick.hours);
              if (yp < 0 || yp > 100) return null;
              return (
                <div
                  key={tick.hours}
                  style={{
                    position: "absolute",
                    top: `${yp}%`,
                    right: "0.6rem",
                    transform: "translateY(-50%)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tick.label}
                </div>
              );
            })}
            {yLabel ? (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "-0.8rem",
                  transform: "translate(-50%, -50%) rotate(-90deg)",
                  transformOrigin: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {yLabel}
              </div>
            ) : null}
          </div>

          {/* Plot area (SVG) */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 1,
              position: "relative",
              borderLeft: "1px solid rgba(0,0,0,0.18)",
              borderBottom: "1px solid rgba(0,0,0,0.18)",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              style={{ overflow: "visible" }}
            >
              {/* Y-grid lines */}
              {Y_TICKS.map((tick) => {
                const yp = yPos(tick.hours);
                if (yp < 0 || yp > 100) return null;
                return (
                  <line
                    key={`yg-${tick.hours}`}
                    x1={0}
                    y1={yp}
                    x2={100}
                    y2={yp}
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth={0.15}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {/* X-grid lines */}
              {(xMode === "ordinal"
                ? points.map((_p, i) => ({ key: `xg-${i}`, xp: xs[i] }))
                : X_TICKS.map((year) => ({ key: `xg-${year}`, xp: xPos(year) }))
              ).map(({ key, xp }) =>
                xp < 0 || xp > 100 ? null : (
                  <line
                    key={key}
                    x1={xp}
                    y1={0}
                    x2={xp}
                    y2={100}
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth={0.15}
                    vectorEffect="non-scaling-stroke"
                  />
                ),
              )}

              {/* Curve */}
              {pathD ? (
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={accent}
                  strokeWidth={0.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="1.5 1.2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{
                    duration: 2.2,
                    delay: totalDotDuration,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    filter: `drop-shadow(0 0 6px ${accent})`,
                  }}
                />
              ) : null}

              {/* Datapoints */}
              {points.map((p, i) => {
                const cx = xs[i];
                const cy = yPos(p.hours);
                const isLast = i === points.length - 1;
                return (
                  <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={isLast ? 1.4 : 0.95}
                    fill={accent}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: dotStaggerStart + i * dotStaggerStep,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      filter: isLast
                        ? `drop-shadow(0 0 8px ${accent}) drop-shadow(0 0 3px ${accent})`
                        : `drop-shadow(0 0 4px ${withAlpha(accent, 0.56)})`,
                    }}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Final-point pulse halo */}
              {points.length > 0 ? (
                <motion.circle
                  cx={xs[xs.length - 1]}
                  cy={yPos(points[points.length - 1].hours)}
                  r={1.4}
                  fill="none"
                  stroke={accent}
                  strokeWidth={0.3}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{
                    opacity: [0, 0.6, 0],
                    scale: [1, 4, 5],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: totalDotDuration + 1.0,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {/* Datapoint-labels (HTML overlays för clean text) */}
            {points.map((p, i) => {
              const cx = xs[i];
              const cy = yPos(p.hours);
              const isLast = i === points.length - 1;
              const isEarly = i < 4;
              return (
                <motion.div
                  key={`label-${i}`}
                  initial={{ opacity: 0, y: isEarly ? 4 : -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: dotStaggerStart + i * dotStaggerStep + 0.15,
                  }}
                  style={{
                    position: "absolute",
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform:
                      xMode === "ordinal"
                        ? cy > 50
                          ? "translate(-50%, -1.6rem)"
                          : "translate(-50%, 0.6rem)"
                        : isEarly
                          ? "translate(-50%, 0.6rem)"
                          : "translate(0.7rem, -50%)",
                    fontFamily: "var(--font-display)",
                    fontSize: isLast
                      ? "clamp(0.85rem, 1.1vw, 1.1rem)"
                      : "clamp(0.7rem, 0.9vw, 0.92rem)",
                    fontWeight: isLast ? 700 : 500,
                    color: isLast ? "var(--text)" : "var(--text)",
                    whiteSpace: "nowrap",
                    textShadow: "0 0 8px var(--bg), 0 0 8px var(--bg)",
                    pointerEvents: "none",
                  }}
                >
                  {p.model}
                </motion.div>
              );
            })}
          </div>

          {/* X-axel labels */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 2,
              position: "relative",
              height: "1.5rem",
            }}
          >
            {(xMode === "ordinal"
              ? points.map((p, i) => ({ key: `xl-${i}`, xp: xs[i], label: p.dateStr }))
              : X_TICKS.map((year) => ({ key: `xl-${year}`, xp: xPos(year), label: String(year) }))
            ).map(({ key, xp, label }) =>
              xp < 0 || xp > 100 ? null : (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: `${xp}%`,
                    top: "0.4rem",
                    transform: "translateX(-50%)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Footer: source + closing */}
        <div className="flex flex-col" style={{ gap: "0.4rem" }}>
          {closing ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: totalDotDuration + 1.6,
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text)",
                lineHeight: 1.4,
                maxWidth: "44em",
                borderLeft: `2px solid ${accent}`,
                paddingLeft: "1rem",
              }}
            >
              <EditableText path="closing" value={closing ?? ""}>{closing}</EditableText>
            </motion.div>
          ) : null}
          {source ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: totalDotDuration + 2.0 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Källa · <EditableText path="source" value={source ?? ""}>{source}</EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
