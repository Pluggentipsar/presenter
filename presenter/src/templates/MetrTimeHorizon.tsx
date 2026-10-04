"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";

interface MetrTimeHorizonProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  source?: string;
}

interface DataPoint {
  year: number;
  hours: number; // task horizon i timmar (50%-nivå)
  label: string;
  annotation?: string;
}

const POINTS: DataPoint[] = [
  { year: 2019, hours: 0.005, label: "GPT-2" },
  { year: 2022, hours: 0.25, label: "GPT-3.5" },
  { year: 2023, hours: 1, label: "GPT-4" },
  { year: 2024, hours: 4, label: "Sonnet 3.5" },
  { year: 2025, hours: 8, label: "Sonnet 4 / Opus 4.5" },
  {
    year: 2026,
    hours: 14.5,
    label: "Opus 4.6",
    annotation: "14,5 h — feb 2026",
  },
];

// Layout: x = 2019-2026.4, y = log(hours)
const X_MIN = 2019;
const X_MAX = 2026.5;
const Y_LOG_MIN = Math.log10(0.003); // dryg
const Y_LOG_MAX = Math.log10(40); // skapa lite plats över sista punkten

const VB_WIDTH = 1000;
const VB_HEIGHT = 500;
const PAD_LEFT = 80;
const PAD_RIGHT = 60;
const PAD_TOP = 40;
const PAD_BOTTOM = 60;

function xToVB(year: number): number {
  const t = (year - X_MIN) / (X_MAX - X_MIN);
  return PAD_LEFT + t * (VB_WIDTH - PAD_LEFT - PAD_RIGHT);
}

function yToVB(hours: number): number {
  const t =
    (Math.log10(hours) - Y_LOG_MIN) / (Y_LOG_MAX - Y_LOG_MIN);
  return VB_HEIGHT - PAD_BOTTOM - t * (VB_HEIGHT - PAD_TOP - PAD_BOTTOM);
}

/**
 * METR Time Horizon-grafen — dubblingstid 89 dagar.
 * Premiär: en keynote 2026-05-27. Bygger på METR Time Horizon 1.1 (jan 2026).
 *
 * Animationssekvens:
 * 1. Axlar och axel-labels fade in
 * 2. Exponentialkurvan tecknas (stroke-dasharray)
 * 3. Datapunkter pulserar in en åt gången
 * 4. Slut-annotation och 89-dagar-callout fade in
 */
export function MetrTimeHorizon({
  kicker = "METR · Time Horizon 1.1 · januari 2026",
  title = "Dubblingstiden är **89 dagar**.",
  subtitle = "Hur länge en AI kan arbeta autonomt på en uppgift innan den behöver mänsklig hjälp.",
  source = "Model Evaluation and Threat Research · metr.org/time-horizons",
}: MetrTimeHorizonProps) {
  const accent = "var(--accent)";
  const accentAlert = "var(--accent-alert)";

  // Build smooth curve through points
  const curveD = useMemo(() => {
    if (POINTS.length === 0) return "";
    // Sample many points for smooth curve (interpolate between data points
    // using monotone cubic — approximate via dense exponential resample)
    const samples: { x: number; y: number }[] = [];
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const year = X_MIN + t * (X_MAX - X_MIN);
      // Interpolate hours: piecewise via log-linear between adjacent points
      let h: number;
      if (year <= POINTS[0].year) {
        h = POINTS[0].hours;
      } else if (year >= POINTS[POINTS.length - 1].year) {
        h = POINTS[POINTS.length - 1].hours;
      } else {
        let p1 = POINTS[0];
        let p2 = POINTS[1];
        for (let j = 0; j < POINTS.length - 1; j++) {
          if (year >= POINTS[j].year && year <= POINTS[j + 1].year) {
            p1 = POINTS[j];
            p2 = POINTS[j + 1];
            break;
          }
        }
        const localT = (year - p1.year) / (p2.year - p1.year);
        const logH =
          Math.log10(p1.hours) +
          localT * (Math.log10(p2.hours) - Math.log10(p1.hours));
        h = Math.pow(10, logH);
      }
      samples.push({ x: xToVB(year), y: yToVB(h) });
    }
    return samples
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");
  }, []);

  // Area-fill under the curve
  const areaD = useMemo(() => {
    if (!curveD) return "";
    return `${curveD} L ${xToVB(X_MAX)} ${VB_HEIGHT - PAD_BOTTOM} L ${PAD_LEFT} ${
      VB_HEIGHT - PAD_BOTTOM
    } Z`;
  }, [curveD]);

  // Y-axis tick values (log scale: 0.01h, 0.1h, 1h, 10h)
  const yTicks = [
    { v: 0.01, label: "36 sek" },
    { v: 0.1, label: "6 min" },
    { v: 1, label: "1 tim" },
    { v: 10, label: "10 tim" },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Background accent glow on right side (where curve goes vertical) */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1.5 }}
        style={{
          position: "absolute",
          top: "10%",
          right: 0,
          bottom: 0,
          width: "45%",
          background: `radial-gradient(ellipse at 75% 65%, ${withAlpha("var(--accent)", 0.16)} 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2rem, 3.4vw, 3.4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 500,
          }}
        >
          <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title ?? ""}>
              {title.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                const m = /^\*\*(.+)\*\*$/.exec(part);
                if (m) {
                  return (
                    <span
                      key={i}
                      style={{
                        color: accent,
                        textShadow: `0 0 28px ${withAlpha(accent, 0.45)}`,
                      }}
                    >
                      {m[1]}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.6rem 0 0 0",
                maxWidth: "48em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Graph */}
        <div
          style={{
            flex: 1,
            position: "relative",
            minHeight: 0,
          }}
        >
          <svg
            viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient id="metr-curve-grad" x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity="0.5"
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity="1"
                />
              </linearGradient>
              <linearGradient id="metr-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity="0"
                />
              </linearGradient>
              <filter id="metr-glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Y-axis gridlines and labels */}
            {yTicks.map((tick, i) => {
              const y = yToVB(tick.v);
              return (
                <motion.g
                  key={tick.v}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                >
                  <line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={VB_WIDTH - PAD_RIGHT}
                    y2={y}
                    stroke="var(--text-muted)"
                    strokeOpacity="0.12"
                    strokeDasharray="3 5"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD_LEFT - 14}
                    y={y + 4}
                    textAnchor="end"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      fill: "var(--text-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {tick.label}
                  </text>
                </motion.g>
              );
            })}

            {/* X-axis years */}
            {[2019, 2021, 2023, 2025].map((year, i) => {
              const x = xToVB(year);
              return (
                <motion.text
                  key={year}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                  x={x}
                  y={VB_HEIGHT - PAD_BOTTOM + 26}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fill: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {year}
                </motion.text>
              );
            })}

            {/* Area fill */}
            <motion.path
              d={areaD}
              fill="url(#metr-area-grad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 1.8 }}
            />

            {/* The curve */}
            <motion.path
              d={curveD}
              fill="none"
              stroke="url(#metr-curve-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#metr-glow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 2.4,
                delay: 0.8,
                ease: [0.32, 0, 0.18, 1],
              }}
            />

            {/* Data points */}
            {POINTS.map((p, i) => {
              const x = xToVB(p.year);
              const y = yToVB(p.hours);
              const isLatest = i === POINTS.length - 1;
              const delay = 0.8 + (i / POINTS.length) * 2.4;
              return (
                <motion.g
                  key={p.year}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 360,
                    damping: 18,
                    delay,
                  }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                >
                  {/* Glow halo for latest point */}
                  {isLatest ? (
                    <motion.circle
                      cx={x}
                      cy={y}
                      r={20}
                      fill={accent}
                      opacity="0.25"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.35, 1] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        delay: delay + 0.3,
                        ease: "easeInOut",
                      }}
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={isLatest ? 8 : 5.5}
                    fill="var(--bg)"
                    stroke={accent}
                    strokeWidth={isLatest ? 3 : 2}
                    style={{
                      filter: isLatest
                        ? `drop-shadow(0 0 12px ${withAlpha("var(--accent)", 0.7)})`
                        : `drop-shadow(0 0 6px ${withAlpha("var(--accent)", 0.4)})`,
                    }}
                  />
                </motion.g>
              );
            })}

            {/* 89-day callout — between 2024 and 2026 */}
            <motion.g
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 3.5 }}
            >
              <text
                x={xToVB(2024.7)}
                y={yToVB(2.4)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  fill: accentAlert,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                89 dagars dubbling
              </text>
              <text
                x={xToVB(2024.7)}
                y={yToVB(2.4) + 18}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fill: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                (var 7 mån för pre-2024)
              </text>
            </motion.g>

            {/* Latest annotation — 14.5h */}
            <motion.g
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 3.2 }}
            >
              <text
                x={xToVB(2026) + 18}
                y={yToVB(14.5) + 6}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fill: accent,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                14,5 h
              </text>
              <text
                x={xToVB(2026) + 18}
                y={yToVB(14.5) + 24}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fill: "var(--text-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Opus 4.6 · feb 2026
              </text>
            </motion.g>

            {/* X- and Y-axis lines */}
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              x1={PAD_LEFT}
              y1={VB_HEIGHT - PAD_BOTTOM}
              x2={VB_WIDTH - PAD_RIGHT}
              y2={VB_HEIGHT - PAD_BOTTOM}
              stroke="var(--text-muted)"
              strokeOpacity="0.3"
              strokeWidth="1.5"
            />
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={VB_HEIGHT - PAD_BOTTOM}
              stroke="var(--text-muted)"
              strokeOpacity="0.3"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Source */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              opacity: 0.7,
              textAlign: "right",
              borderTop:
                "1px solid var(--glass-border, rgba(0,0,0,0.1))",
              paddingTop: "0.6rem",
            }}
          >
            <EditableText path="source" value={source ?? ""}>{source}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
