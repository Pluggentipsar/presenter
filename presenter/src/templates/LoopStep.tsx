"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * LoopStep — ett steg i en återkommande arbetsloop, med hela loopen synlig.
 *
 * Byggd för kommunal-utveckling-v2: samma fiktiva utvecklingsuppdrag går
 * genom sju steg (Förstå → Utmana → … → Kommunicera), en slide per steg.
 * Poängen med templaten är att publiken ALDRIG tappar var i loopen de är:
 * ringen till vänster visar alla steg, det aktiva glöder, de passerade är
 * fyllda, och en progress-båge växer medurs för varje slide.
 *
 * Två steg per slide: först stegnamn + fråga (föreläsaren pratar), sedan
 * klick → promptglimt + artefaktglimt stiger in. Live-demon hör hemma i
 * uppstuds-delen — `uppstuds`-taggen längst ned pekar dit.
 *
 * ```mdx
 * <LoopStep
 *   chapter="§ Loopen · Steg 2"
 *   step={2}
 *   title="Utmana"
 *   question="Vilka antaganden gör vi? Ge **tre konkurrerande förklaringar.**"
 *   prompt='Här är vår lägesbild: [klistra in]. Agera djävulens advokat...'
 *   uppstuds="Uppstuds · djävulens advokat i två verktyg"
 * >
 * - Antagande 1 · att problemet är rekrytering — inte att folk slutar
 * - Antagande 2 · att kommunerna menar samma sak med "kompetensbrist"
 * </LoopStep>
 * ```
 *
 * `steps` (kommaseparerad) byter ut ringens etiketter; default är de sju
 * stegen i utvecklingsloopen. Per output-rad: `Etikett · beskrivning`.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DEFAULT_STEPS =
  "Fråga,Utmana,Omvärldsbevaka,Designa,Simulera,Prototypa,Kommunicera";

interface LoopStepProps {
  chapter?: string;
  /** 1-baserat: vilket av loopens steg denna slide är. */
  step: number;
  /** Kommaseparerade namn på ALLA loopens steg (ringens etiketter). */
  steps?: string;
  /** Stegets namn, stort. */
  title: string;
  /** Grepp/fråga i stegets kärna. **fet** → accent. */
  question?: string;
  /** Promptglimten som visas vid klick. */
  prompt?: string;
  /** Etikett på promptkortet. */
  promptLabel?: string;
  /** Etikett på artefaktkortet. */
  outputLabel?: string;
  /** Tagg längst ned — vilken uppstuds-demo som bevisar steget. */
  uppstuds?: string;
  /** Gör uppstuds-taggen klickbar (öppnas i ny flik) — t.ex. länken till
   *  chatten/notebooken där arbetet faktiskt gjordes. */
  uppstudsHref?: string;
  accent?: string;
  /** Output-rader som markdown-lista: `- Etikett · beskrivning`. */
  children?: ReactNode;
}

interface OutputRow {
  label: string;
  caption: string;
}

function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { props?: { children?: ReactNode }; type?: unknown };
    const inner = toText(el.props?.children);
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseRows(children: ReactNode): OutputRow[] {
  const rows: OutputRow[] = [];
  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "ul" || el.type === "ol") {
        visit(el.props.children);
        return;
      }
      if (el.type === "li") {
        const raw = toText(el.props.children);
        const [label, ...rest] = raw.split("·");
        rows.push({
          label: (label ?? "").trim(),
          caption: rest.join("·").trim(),
        });
        return;
      }
      visit(el.props?.children);
    });
  };
  visit(children);
  return rows;
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Polär hjälpare för ringen. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function LoopStep({
  chapter,
  step,
  steps = DEFAULT_STEPS,
  title,
  question,
  prompt,
  promptLabel = "Prompten",
  outputLabel = "Ur svaret",
  uppstuds,
  uppstudsHref,
  accent = "var(--accent)",
  children,
}: LoopStepProps) {
  const slideStep = useSlideSteps(prompt ? 2 : 1);
  const revealed = slideStep >= 1;

  const names = useMemo(
    () => steps.split(",").map((s) => s.trim()).filter(Boolean),
    [steps],
  );
  const total = names.length || 7;
  const active = Math.min(Math.max(step, 1), total) - 1;
  const outputs = useMemo(() => parseRows(children), [children]);

  // Ring-geometri (viewBox 440×440)
  const CX = 220;
  const CY = 220;
  const R = 150;
  const nodes = names.map((name, i) => {
    const deg = -90 + (i * 360) / total;
    return { name, deg, ...polar(CX, CY, R, deg) };
  });

  // Progress-båge från klockan tolv till det aktiva steget.
  const arcPath = useMemo(() => {
    const startDeg = -90;
    const endDeg = -90 + (active * 360) / total;
    const start = polar(CX, CY, R, startDeg);
    const end = polar(CX, CY, R, endDeg);
    if (active === 0) return "";
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }, [active, total]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Mjuk grund bakom ringen */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-8%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "56vw",
          height: "56vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.09)} 0%, transparent 62%)`,
          pointerEvents: "none",
        }}
      />

      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
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
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "clamp(1.5rem, 3vw, 3rem)",
          padding:
            "clamp(4.5rem, 9vh, 6.5rem) clamp(2.5rem, 5.5vw, 5.5rem) clamp(2.6rem, 6vh, 4rem)",
        }}
      >
        {/* ── Ringen ── */}
        <div
          style={{
            flexShrink: 0,
            width: "clamp(17rem, 30vw, 27rem)",
            alignSelf: "center",
          }}
        >
          <svg viewBox="0 0 440 440" style={{ width: "100%", height: "auto", overflow: "visible" }}>
            {/* Spår */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--text-muted)"
              strokeOpacity={0.28}
              strokeWidth={1.5}
              strokeDasharray="3 7"
            />
            {/* Progress-båge */}
            {arcPath ? (
              <motion.path
                d={arcPath}
                fill="none"
                stroke={accent}
                strokeWidth={3.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
              />
            ) : null}

            {/* Noder + etiketter */}
            {nodes.map((n, i) => {
              const isActive = i === active;
              const isDone = i < active;
              const cos = Math.cos((n.deg * Math.PI) / 180);
              const sin = Math.sin((n.deg * Math.PI) / 180);
              const labelPos = polar(CX, CY, R + 30, n.deg);
              const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
              return (
                <g key={i}>
                  {isActive ? (
                    <motion.circle
                      cx={n.x}
                      cy={n.y}
                      r={17}
                      fill={withAlpha(accent, 0.18)}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.25, 0.7] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                    />
                  ) : null}
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={isActive ? 11 : 6.5}
                    fill={
                      isActive
                        ? accent
                        : isDone
                          ? withAlpha(accent, 0.45)
                          : "var(--bg-surface)"
                    }
                    stroke={isActive || isDone ? accent : "var(--text-muted)"}
                    strokeOpacity={isActive ? 1 : isDone ? 0.6 : 0.45}
                    strokeWidth={isActive ? 0 : 1.5}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.08 * i }}
                    style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                  />
                  <motion.text
                    x={labelPos.x}
                    y={labelPos.y + (Math.abs(sin) > 0.8 ? (sin > 0 ? 10 : -4) : 4)}
                    textAnchor={anchor}
                    fontFamily="var(--font-mono)"
                    fontSize={13.5}
                    letterSpacing="0.08em"
                    fill={isActive ? accent : "var(--text-muted)"}
                    fillOpacity={isActive ? 1 : isDone ? 0.85 : 0.6}
                    fontWeight={isActive ? 700 : 400}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.08 * i + 0.15 }}
                  >
                    {n.name}
                  </motion.text>
                </g>
              );
            })}

            {/* Centrum: stegräknare */}
            <motion.text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight={700}
              fontSize={78}
              fill="var(--text)"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            >
              {String(active + 1).padStart(2, "0")}
            </motion.text>
            <motion.text
              x={CX}
              y={CY + 34}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={15}
              letterSpacing="0.3em"
              fill="var(--text-muted)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.45 }}
            >
              AV {String(total).padStart(2, "0")}
            </motion.text>
          </svg>
        </div>

        {/* ── Innehållet ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "clamp(1rem, 2.4vh, 1.8rem)",
            paddingBottom: uppstuds ? "clamp(1.6rem, 4vh, 2.6rem)" : 0,
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: revealed
                ? "clamp(2rem, 3.4vw, 3.2rem)"
                : "clamp(2.8rem, 5vw, 4.6rem)",
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              transition: "font-size 0.6s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>

          {question ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
              style={{
                display: "flex",
                gap: "clamp(0.9rem, 1.4vw, 1.3rem)",
                alignItems: "stretch",
                maxWidth: "44rem",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 3,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: `linear-gradient(180deg, ${withAlpha(accent, 0.9)}, ${withAlpha(accent, 0.2)})`,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.2rem, 1.9vw, 1.8rem)",
                  lineHeight: 1.35,
                  color: "var(--text)",
                }}
              >
                <EditableText path="question" value={question}>
                  {renderInline(question, accent)}
                </EditableText>
              </p>
            </motion.div>
          ) : null}

          {/* Klick 1: prompt + artefakt */}
          {revealed && prompt ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: outputs.length ? "1.1fr 1fr" : "1fr",
                gap: "clamp(0.9rem, 1.6vw, 1.5rem)",
                alignItems: "stretch",
                maxWidth: "56rem",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: EASE }}
                style={{
                  background: "var(--bg-surface)",
                  border: `1px solid ${withAlpha(accent, 0.3)}`,
                  borderRadius: "1rem",
                  padding: "clamp(1rem, 1.8vw, 1.5rem)",
                  boxShadow: `0 14px 40px -22px ${withAlpha(accent, 0.45)}`,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: accent,
                    marginBottom: "0.7rem",
                  }}
                >
                  {promptLabel}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.82rem, 1vw, 1rem)",
                    lineHeight: 1.55,
                    color: "var(--text)",
                    whiteSpace: "pre-line",
                  }}
                >
                  <EditableText path="prompt" block value={prompt}>
                    {prompt}
                  </EditableText>
                </div>
              </motion.div>

              {outputs.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: EASE, delay: 0.18 }}
                  style={{
                    background: withAlpha(accent, 0.06),
                    border: "1px solid var(--text-muted)",
                    borderRadius: "1rem",
                    padding: "clamp(1rem, 1.8vw, 1.5rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginBottom: "0.15rem",
                    }}
                  >
                    {outputLabel}
                  </div>
                  {outputs.map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.14 }}
                      style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: accent,
                          flexShrink: 0,
                          transform: "translateY(-1px)",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                          lineHeight: 1.4,
                          color: "var(--text)",
                        }}
                      >
                        {row.label ? (
                          <span style={{ fontWeight: 700 }}>{row.label}</span>
                        ) : null}
                        {row.caption ? (
                          <span style={{ color: "var(--text-muted)" }}>
                            {row.label ? " — " : ""}
                            {row.caption}
                          </span>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Uppstuds-tagg — klickbar när uppstudsHref finns */}
      {uppstuds ? (
        (() => {
          const inner = (
            <>
              <span
                aria-hidden
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: `8px solid ${withAlpha(accent, 0.75)}`,
                }}
              />
              <EditableText path="uppstuds" value={uppstuds}>
                {uppstuds}
              </EditableText>
              {uppstudsHref ? (
                <span aria-hidden style={{ color: accent, fontSize: "0.9em" }}>
                  ↗
                </span>
              ) : null}
            </>
          );
          const baseStyle: CSSProperties = {
            position: "absolute",
            bottom: "clamp(1.4rem, 3.4vh, 2.4rem)",
            right: "clamp(2.5rem, 5.5vw, 5.5rem)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.14em",
            color: uppstudsHref ? "var(--text)" : "var(--text-muted)",
            zIndex: 5,
          };
          return uppstudsHref ? (
            <a
              href={uppstudsHref}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                ...baseStyle,
                textDecoration: "none",
                padding: "0.45rem 0.9rem",
                borderRadius: 999,
                background: "var(--bg-surface)",
                border: `1.5px solid ${withAlpha(accent, 0.45)}`,
                boxShadow: `0 10px 26px -16px ${withAlpha(accent, 0.5)}`,
                cursor: "pointer",
              }}
            >
              {inner}
            </a>
          ) : (
            <div style={baseStyle}>{inner}</div>
          );
        })()
      ) : null}
    </div>
  );
}
