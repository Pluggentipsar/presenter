"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface TaskConstellationProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista. Format per rad:
   * `- task-text · weight · x · y`
   *
   * - weight: sm | md | lg (påverkar fontstorlek + visuell tyngd)
   * - x, y: position 0-100 (procent av slide-canvas)
   */
  children?: ReactNode;
}

type Weight = "sm" | "md" | "lg";

interface TaskNode {
  text: string;
  weight: Weight;
  x: number;
  y: number;
}

const WEIGHT_FONT: Record<Weight, string> = {
  sm: "clamp(0.92rem, 1.25vw, 1.18rem)",
  md: "clamp(1.18rem, 1.7vw, 1.55rem)",
  lg: "clamp(1.6rem, 2.5vw, 2.45rem)",
};

const WEIGHT_DOT: Record<Weight, string> = {
  sm: "0.32rem",
  md: "0.46rem",
  lg: "0.7rem",
};

const WEIGHT_OPACITY: Record<Weight, number> = {
  sm: 0.78,
  md: 0.92,
  lg: 1,
};

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
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseTasks(children: ReactNode): TaskNode[] {
  const nodes: TaskNode[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const text = parts[0];
    if (!text) return;
    const weight = (parts[1] === "sm" || parts[1] === "md" || parts[1] === "lg")
      ? (parts[1] as Weight)
      : "md";
    const x = parseFloat(parts[2] ?? "");
    const y = parseFloat(parts[3] ?? "");
    nodes.push({
      text,
      weight,
      x: Number.isFinite(x) ? x : -1,
      y: Number.isFinite(y) ? y : -1,
    });
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

  // Auto-layout för noder utan explicit position
  const unplaced = nodes.filter((n) => n.x < 0 || n.y < 0);
  if (unplaced.length > 0) {
    const cols = Math.ceil(Math.sqrt(unplaced.length));
    const rows = Math.ceil(unplaced.length / cols);
    const xMargin = 14;
    const yMargin = 32;
    const xRange = 100 - 2 * xMargin;
    const yRange = 100 - yMargin - 18;
    let i = 0;
    for (const n of nodes) {
      if (n.x >= 0 && n.y >= 0) continue;
      const r = Math.floor(i / cols);
      const c = i % cols;
      const jitterX = ((i * 13) % 7) - 3;
      const jitterY = ((i * 7) % 5) - 2;
      n.x = xMargin + ((c + 0.5) * xRange) / cols + jitterX;
      n.y = yMargin + ((r + 0.5) * yRange) / rows + jitterY;
      i++;
    }
  }
  return nodes;
}

/**
 * TaskConstellation — handritad himlakarta över ett kognitivt arbetsfält.
 *
 * Aurora-bakgrund i lager, subtilt koordinatgrid, kompassros, ring-
 * annotationer kring primära noder, gradient-linjer som koppling.
 * Tänk: gammal stjärnatlas möter zine-typografi.
 */
export function TaskConstellation({
  chapter,
  title,
  subtitle,
  closing,
  background,
  accent = "#B4763A",
  overlay,
  children,
}: TaskConstellationProps) {
  const nodes = useMemo(() => parseTasks(children), [children]);

  // Konstellationslinjer: koppla varje nod till sina 2 närmsta grannar.
  const lines = useMemo(() => {
    const result: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      key: string;
      dashed: boolean;
    }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const distances = nodes
        .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
        .filter((x) => x.j !== i)
        .sort((x, y) => x.d - y.d);
      const neighbors = distances.slice(0, 2);
      for (const n of neighbors) {
        const key = i < n.j ? `${i}-${n.j}` : `${n.j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const b = nodes[n.j];
        // Var 4:e linje är dashed för variation
        const seed = parseInt(key.split("-")[0], 10) || 0;
        result.push({
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          key,
          dashed: seed % 4 === 3,
        });
      }
    }
    return result;
  }, [nodes]);

  const totalRevealDuration = nodes.length * 0.12 + 0.5;

  // Generera deterministisk star-dust så ingen hydration mismatch
  const stars = useMemo(() => {
    return Array.from({ length: 90 }).map((_, i) => ({
      cx: ((i * 17 + 7) % 97) + 1.5,
      cy: ((i * 31 + 13) % 96) + 2,
      r: 0.04 + ((i * 7) % 5) * 0.022,
      delay: (i * 0.05) % 2.4,
      duration: 3 + (i % 4),
    }));
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      {/* Aurora-lager 1: varm konjak från botten */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 35% 75%, ${withAlpha(accent, 0.14)} 0%, ${withAlpha(accent, 0.03)} 30%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      {/* Aurora-lager 2: kall blågrön från övre höger */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 80% 25%, rgba(94,180,200,0.10) 0%, rgba(94,180,200,0.03) 35%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      {/* Aurora-lager 3: subtil cream wash i mitten */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 40% 30% at 50% 50%, rgba(247,241,230,0.04) 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />

      {/* Vinjett — mörk inramning */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 50%, rgba(10,9,8,0.45) 100%)",
          zIndex: 1,
        }}
      />

      {/* SVG-base: koordinatgrid, stjärndamm, ring-annotationer, linjer */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 2 }}
      >
        <defs>
          {/* Gradient-stroke för linjer — fade vid endpoints */}
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="20%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="80%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Koordinatgrid — 8 kolumner x 5 rader, mycket diskret */}
        <g opacity="0.06">
          {Array.from({ length: 7 }).map((_, i) => {
            const x = ((i + 1) * 100) / 8;
            return (
              <line
                key={`gv-${i}`}
                x1={x}
                y1="0"
                x2={x}
                y2="100"
                stroke="var(--text)"
                strokeWidth="0.05"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = ((i + 1) * 100) / 5;
            return (
              <line
                key={`gh-${i}`}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="var(--text)"
                strokeWidth="0.05"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        {/* Tick-markeringar längs övre och vänstra kanten — kartografiskt */}
        <g opacity="0.18">
          {Array.from({ length: 9 }).map((_, i) => {
            const x = (i * 100) / 8;
            return (
              <line
                key={`tt-${i}`}
                x1={x}
                y1="0"
                x2={x}
                y2={i % 2 === 0 ? 0.6 : 0.3}
                stroke="var(--text)"
                strokeWidth="0.08"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = (i * 100) / 5;
            return (
              <line
                key={`tl-${i}`}
                x1="0"
                y1={y}
                x2={i % 2 === 0 ? 0.6 : 0.3}
                y2={y}
                stroke="var(--text)"
                strokeWidth="0.08"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        {/* Stjärndamm — fler nu, mer atmosfär */}
        {stars.map((s, i) => (
          <motion.circle
            key={`star-${i}`}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="var(--text)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0.22, 0.04] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Konstellationslinjer — gradient stroke, kurvade */}
        {lines.map((line, i) => {
          const mx = (line.x1 + line.x2) / 2;
          const my = (line.y1 + line.y2) / 2;
          const dx = line.x2 - line.x1;
          const dy = line.y2 - line.y1;
          const len = Math.hypot(dx, dy) || 1;
          const seed = parseInt(line.key.split("-")[0], 10) || 0;
          const offset = ((seed * 7) % 5) - 2;
          const cx = mx + (-dy / len) * offset * 0.8;
          const cy = my + (dx / len) * offset * 0.8;
          const path = `M ${line.x1} ${line.y1} Q ${cx} ${cy} ${line.x2} ${line.y2}`;
          return (
            <motion.path
              key={line.key}
              d={path}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth={line.dashed ? 0.13 : 0.16}
              strokeLinecap="round"
              strokeDasharray={line.dashed ? "0.4 0.6" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: line.dashed ? 0.45 : 0.6 }}
              transition={{
                duration: 1.4,
                delay: totalRevealDuration + i * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Ring-annotationer kring lg-noder — orbital-känsla */}
        {nodes.map((n, i) =>
          n.weight === "lg" ? (
            <g key={`rings-${i}`}>
              {[1.6, 2.8, 4.2].map((r, ri) => (
                <motion.circle
                  key={`r-${i}-${ri}`}
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill="none"
                  stroke={accent}
                  strokeWidth={0.06}
                  strokeDasharray={ri === 1 ? "0.5 0.5" : ri === 2 ? "0.2 0.4" : undefined}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 0.18 + ri * 0.06, scale: 1 }}
                  transition={{
                    duration: 1.2,
                    delay: totalRevealDuration + 0.3 + ri * 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  vectorEffect="non-scaling-stroke"
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
              ))}
            </g>
          ) : null
        )}
      </svg>

      {/* Nodlager */}
      <div className="absolute inset-0" style={{ zIndex: 3 }}>
        {nodes.map((n, i) => {
          const dotSize = WEIGHT_DOT[n.weight];
          const fontSize = WEIGHT_FONT[n.weight];
          const baseOpacity = WEIGHT_OPACITY[n.weight];
          const floatX = ((i * 7) % 5) - 2;
          const floatY = ((i * 11) % 7) - 3;
          const isPrimary = n.weight === "lg";
          const dotColor = i % 3 === 1 ? "#F2E5D0" : accent;
          const numeral = String(i + 1).padStart(2, "0");
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7, y: 8 }}
              animate={{ opacity: baseOpacity, scale: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.4 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >
              {/* Dot-cluster */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  position: "relative",
                }}
              >
                {/* Mono-numeral */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.2em",
                    color: "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {numeral}
                </span>
                {/* Dot med eventuell pulse-ring */}
                <div style={{ position: "relative" }}>
                  {isPrimary ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.7, 1],
                        opacity: [0.45, 0, 0.45],
                      }}
                      transition={{
                        duration: 3.2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: i * 0.2,
                      }}
                      style={{
                        position: "absolute",
                        inset: "-0.45rem",
                        borderRadius: "50%",
                        border: `1px solid ${dotColor}`,
                      }}
                    />
                  ) : null}
                  <motion.div
                    animate={{
                      opacity: [0.6, 1, 0.6],
                      scale: [1, 1.18, 1],
                      x: [floatX * 0.3, -floatX * 0.3, floatX * 0.3],
                      y: [floatY * 0.3, -floatY * 0.3, floatY * 0.3],
                    }}
                    transition={{
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15,
                    }}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: "50%",
                      background: dotColor,
                      boxShadow: isPrimary
                        ? `0 0 32px ${dotColor}, 0 0 12px ${dotColor}`
                        : `0 0 16px ${dotColor}80, 0 0 5px ${dotColor}`,
                    }}
                  />
                </div>
              </div>
              {/* Label */}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize,
                  fontWeight: n.weight === "lg" ? 600 : 400,
                  fontStyle: i % 4 === 2 ? "italic" : "normal",
                  letterSpacing: n.weight === "lg" ? "-0.018em" : "0.005em",
                  color: "var(--text)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 18px rgba(0,0,0,0.6), 0 0 30px rgba(0,0,0,0.3)",
                }}
              >
                <EditableText path={`tasks[${i}]`} value={n.text}>
                  {n.text}
                </EditableText>
              </div>
              {/* Underline-rule för lg-noder — markera primära visuellt */}
              {isPrimary ? (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.6, scaleX: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.6 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    width: "2.2rem",
                    height: "1px",
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    transformOrigin: "center",
                  }}
                />
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {/* Header — vänsterställd, editorial, med rule + koordinat */}
      <div
        className="absolute"
        style={{
          top: "clamp(2.2rem, 4.5vh, 3.8rem)",
          left: "clamp(2rem, 5vw, 4.5rem)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.7rem",
          textAlign: "left",
          maxWidth: "18em",
        }}
      >
        {chapter ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
            }}
          >
            <span
              style={{
                width: "1.6rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
            <EditableText path="chapter" value={chapter ?? ""}>
              {chapter}
            </EditableText>
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
              fontSize: "clamp(1.7rem, 3.6vw, 3rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.028em",
              color: "var(--text)",
              margin: 0,
              textShadow: "0 2px 28px rgba(0,0,0,0.65)",
            }}
          >
            <EditableText path="title" value={title ?? ""}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}
        {/* Hairline rule under titel */}
        {title ? (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "5rem",
              height: "1px",
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              transformOrigin: "left",
            }}
          />
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.15vw, 1.1rem)",
              color: "var(--text-muted)",
              margin: 0,
              maxWidth: "18em",
              lineHeight: 1.4,
              textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            }}
          >
            <EditableText path="subtitle" value={subtitle ?? ""}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* Field-signatur uppe till höger */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: totalRevealDuration + 0.4 }}
        style={{
          position: "absolute",
          top: "clamp(2.2rem, 4.5vh, 3.8rem)",
          right: "clamp(2rem, 5vw, 4.5rem)",
          zIndex: 4,
          fontFamily: "var(--font-mono)",
          fontSize: "0.65rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(247,241,230,0.32)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.45rem",
          textAlign: "right",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            n = {String(nodes.length).padStart(2, "0")}
          </span>
          <span
            style={{
              width: "1.6rem",
              height: "1px",
              background: "rgba(247,241,230,0.25)",
            }}
          />
          <span>fält</span>
        </div>
        <div
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: "0.58rem",
            opacity: 0.7,
          }}
        >
          57°46&apos;N · 14°09&apos;E
        </div>
      </motion.div>

      {/* Kompassros nere till höger */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, delay: totalRevealDuration + 0.7 }}
        style={{
          position: "absolute",
          bottom: "clamp(2rem, 4vh, 3.5rem)",
          right: "clamp(2rem, 5vw, 4.5rem)",
          zIndex: 4,
          width: "clamp(3rem, 5vw, 4rem)",
          height: "clamp(3rem, 5vw, 4rem)",
          opacity: 0.5,
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {/* Yttre cirkel */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={accent}
            strokeWidth="0.6"
            opacity="0.6"
          />
          {/* Inre cirkel */}
          <circle
            cx="50"
            cy="50"
            r="22"
            fill="none"
            stroke={accent}
            strokeWidth="0.4"
            opacity="0.4"
            strokeDasharray="2 2"
          />
          {/* Pilar — N stor, E/S/W mindre */}
          <polygon
            points="50,8 53,50 50,46 47,50"
            fill="var(--text)"
            opacity="0.85"
          />
          <polygon
            points="50,92 53,50 50,54 47,50"
            fill="var(--text)"
            opacity="0.55"
          />
          <polygon
            points="92,50 50,53 54,50 50,47"
            fill="var(--text)"
            opacity="0.55"
          />
          <polygon
            points="8,50 50,53 46,50 50,47"
            fill="var(--text)"
            opacity="0.55"
          />
          {/* N-text */}
          <text
            x="50"
            y="6"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="6"
            fill="var(--text)"
            opacity="0.9"
            style={{ letterSpacing: "0.2em" }}
          >
            N
          </text>
        </svg>
      </motion.div>

      {/* Closing — som kartografisk caption nere till vänster */}
      {closing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: totalRevealDuration + 0.6,
          }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 5vw, 4.5rem)",
            zIndex: 4,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
            color: "var(--text)",
            textAlign: "left",
            maxWidth: "22em",
            lineHeight: 1.4,
            textShadow: "0 2px 18px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontStyle: "normal",
              fontSize: "0.6rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            ↓ slutsats
          </span>
          <EditableText path="closing" value={closing ?? ""}>
            {closing}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
