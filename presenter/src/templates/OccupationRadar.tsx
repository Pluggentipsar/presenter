"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * OccupationRadar — polärt radar-diagram som visar två lager per yrke:
 * "theoretical" (vad AI teoretiskt KAN göra) och "observed" (vad AI
 * faktiskt används till). Inspirerat av Anthropic Economic Index Figure 2.
 *
 * Den pedagogiska poängen är GAPET mellan teori och praktik. För många
 * kognitiva yrken är theoretical = hög, observed = låg. Det visar att
 * påverkan inte har "kommit än" — men kommer.
 *
 * Stega framåt:
 *   step 0 → bara grid + axlar
 *   step 1 → theoretical polygon (blått/accent-fält) tonas in
 *   step 2 → observed polygon (rött) tonas in
 *
 * MDX-format:
 * ```mdx
 * <OccupationRadar
 *   chapter="§ Yrkespåverkan"
 *   title="Vilka yrken påverkas — i teorin och i praktiken."
 *   subtitle="Anthropic Economic Index 2025."
 *   accent= "var(--accent)"
 * >
 * - Chefer · 85 · 5
 * - Företag & finans · 85 · 5
 * - IT & matematik · 85 · 40
 * - Utbildning & bibliotek · 55 · 10
 * - ...
 * </OccupationRadar>
 * ```
 *
 * Per rad: `Yrkesnamn · theoretical · observed` där värden är 0-100.
 */

interface OccupationRadarProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Färg för theoretical-fältet. Default = accent. */
  theoreticalColor?: string;
  /** Färg för observed-fältet. Default röd. */
  observedColor?: string;
  /** Etikett för theoretical i legenden. */
  theoreticalLabel?: string;
  /** Etikett för observed i legenden. */
  observedLabel?: string;
  /** Slutsats/highlight under chartet. Stödjer **bold**. */
  conclusion?: string;
  children?: ReactNode;
}

interface Occupation {
  name: string;
  theoretical: number; // 0-100
  observed: number; // 0-100
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

function parseOccupations(children: ReactNode): Occupation[] {
  const out: Occupation[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const name = (parts[0] ?? "").trim();
    const theoretical = parseFloat((parts[1] ?? "0").trim());
    const observed = parseFloat((parts[2] ?? "0").trim());
    if (!name || !Number.isFinite(theoretical) || !Number.isFinite(observed))
      return;
    out.push({ name, theoretical, observed });
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

export function OccupationRadar({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  theoreticalColor,
  observedColor = "#E84D4D",
  theoreticalLabel = "AI:s teoretiska kapacitet",
  observedLabel = "Faktisk användning",
  conclusion,
  children,
}: OccupationRadarProps) {
  const occupations = useMemo(() => parseOccupations(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const tColor = theoreticalColor ?? accent;
  const step = useSlideSteps(3); // 0=grid, 1=+theoretical, 2=+observed

  // SVG-geometri
  const size = 800;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 240;
  const labelR = 285; // hur långt ut etiketterna sitter

  const N = occupations.length;
  const angleAt = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;

  const pointAt = (i: number, value: number) => {
    const θ = angleAt(i);
    const r = (value / 100) * maxR;
    return [cx + Math.cos(θ) * r, cy + Math.sin(θ) * r];
  };

  const polygonPath = (values: number[]) => {
    if (values.length === 0) return "";
    return (
      values
        .map((v, i) => {
          const [x, y] = pointAt(i, v);
          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    );
  };

  const theoreticalPath = useMemo(
    () => polygonPath(occupations.map((o) => o.theoretical)),
    [occupations, cx, cy, maxR, N] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const observedPath = useMemo(
    () => polygonPath(occupations.map((o) => o.observed)),
    [occupations, cx, cy, maxR, N] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

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
          padding: "clamp(2rem, 4vw, 4rem)",
          gap: "clamp(1rem, 1.8vh, 1.4rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
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
                fontSize: "clamp(0.9rem, 1.2vw, 1.2rem)",
                color: "var(--text)",
                marginTop: "0.4rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Chart-yta */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
            position: "relative",
          }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{
              width: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              height: "100%",
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid-cirklar */}
            {gridLevels.map((level, i) => (
              <motion.circle
                key={`grid-${i}`}
                cx={cx}
                cy={cy}
                r={level * maxR}
                fill="none"
                stroke="rgba(247,241,230,0.1)"
                strokeWidth={1}
                strokeDasharray={level === 1 ? undefined : "3 4"}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.4 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            ))}

            {/* Axel-linjer */}
            {occupations.map((_, i) => {
              const [x, y] = pointAt(i, 100);
              return (
                <motion.line
                  key={`axis-${i}`}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="rgba(247,241,230,0.08)"
                  strokeWidth={1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.85 + i * 0.012,
                  }}
                />
              );
            })}

            {/* Theoretical polygon (glow + fill) */}
            <motion.path
              d={theoreticalPath}
              fill={`${tColor}33`}
              stroke={tColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.3 }}
              transition={{
                duration: 1.0,
                delay: 1.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                filter: `drop-shadow(0 0 18px ${tColor}88)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
            {/* Theoretical-vertices */}
            {step >= 1
              ? occupations.map((o, i) => {
                  const [x, y] = pointAt(i, o.theoretical);
                  return (
                    <motion.circle
                      key={`t-vertex-${i}`}
                      cx={x}
                      cy={y}
                      r={5}
                      fill={tColor}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: 1.4 + i * 0.015,
                      }}
                      style={{ filter: `drop-shadow(0 0 6px ${tColor})` }}
                    />
                  );
                })
              : null}

            {/* Observed polygon */}
            <motion.path
              d={observedPath}
              fill={`${observedColor}40`}
              stroke={observedColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{
                opacity: step >= 2 ? 1 : 0,
                scale: step >= 2 ? 1 : 0.3,
              }}
              transition={{
                duration: 1.0,
                delay: step >= 2 ? 0.4 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                filter: `drop-shadow(0 0 18px ${observedColor}AA)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
            {/* Observed-vertices */}
            {step >= 2
              ? occupations.map((o, i) => {
                  const [x, y] = pointAt(i, o.observed);
                  return (
                    <motion.circle
                      key={`o-vertex-${i}`}
                      cx={x}
                      cy={y}
                      r={5}
                      fill={observedColor}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.5 + i * 0.015,
                      }}
                      style={{ filter: `drop-shadow(0 0 6px ${observedColor})` }}
                    />
                  );
                })
              : null}

            {/* Etiketter på perimetern */}
            {occupations.map((o, i) => {
              const θ = angleAt(i);
              const x = cx + Math.cos(θ) * labelR;
              const y = cy + Math.sin(θ) * labelR;
              // Anchor baseras på horisontell position
              const cosθ = Math.cos(θ);
              let anchor: "start" | "middle" | "end" = "middle";
              if (cosθ > 0.2) anchor = "start";
              else if (cosθ < -0.2) anchor = "end";
              // Vertikal alignment
              const sinθ = Math.sin(θ);
              let dy = 0;
              if (sinθ > 0.3) dy = 12;
              else if (sinθ < -0.3) dy = -4;
              else dy = 4;

              return (
                <motion.text
                  key={`label-${i}`}
                  x={x}
                  y={y}
                  dy={dy}
                  textAnchor={anchor}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{
                    duration: 0.5,
                    delay: 1.0 + i * 0.02,
                  }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "16px",
                    fill: "var(--text)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {o.name}
                </motion.text>
              );
            })}
          </svg>

          {/* Legend - nere i högra hörnet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.6 }}
            style={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "clamp(0.6rem, 1vw, 0.9rem) clamp(0.9rem, 1.4vw, 1.3rem)",
              background: "rgba(20, 18, 15, 0.85)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(247,241,230,0.1)",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.08em",
              color: "var(--text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: `${tColor}66`,
                  border: `1.5px solid ${tColor}`,
                  flexShrink: 0,
                  opacity: step >= 1 ? 1 : 0.3,
                  transition: "opacity 0.5s",
                }}
              />
              <span>{theoreticalLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: `${observedColor}66`,
                  border: `1.5px solid ${observedColor}`,
                  flexShrink: 0,
                  opacity: step >= 2 ? 1 : 0.3,
                  transition: "opacity 0.5s",
                }}
              />
              <span>{observedLabel}</span>
            </div>
          </motion.div>
        </div>

        {/* Conclusion */}
        {conclusion ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: step >= 2 ? 1 : 0, y: 0 }}
            transition={{ duration: 0.7, delay: step >= 2 ? 1.5 : 0 }}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              color: "var(--text)",
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              maxWidth: "75ch",
              paddingTop: "clamp(0.5rem, 0.8vh, 0.8rem)",
              borderTop: `1px solid ${withAlpha(accent, 0.33)}`,
            }}
          >
            {renderInline(conclusion, accent)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
