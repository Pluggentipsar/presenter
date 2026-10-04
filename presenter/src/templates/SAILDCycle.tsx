"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface SAILDPhase {
  number: string;
  name: string;
  description: string;
  caseStudy: string;
}

interface SAILDCycleProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Etikett för fallstudiekolumnen (default "Klassrumsexempel"). */
  caseLabel?: string;
  /** Rubrik för fallstudien (default "Eleverna designar X"). */
  caseTitle: string;
  /** Liten payoff-rad längst ned. */
  bottomLine?: string;
  /** Källrad — visas som mono i nederkant. */
  source?: string;
  /**
   * Pipe-separerad lista med 3 principer som fadar in efter cykeln är
   * komplett. Format per cell: `Namn · Kort beskrivning`. Använd en `★`
   * framför namnet på den principen som ska markeras som central.
   * Ex: "Agens · Eleven styr AI:n|Ansvar · Eleven äger resultatet|★ Transparens · Eleven öppen med hur den tänkte"
   */
  payoffTriad?: string;
  /** Rubrik över triaden. Default: "Det vi vill fostra." */
  payoffTriadTitle?: string;
  background?: string;
  accent?: string;
  /**
   * Markdown-lista, en rad per fas (exakt 4 förväntas).
   * Format: `- **Fas-namn** · Kort beskrivning · Fallstudie-text för denna fas`
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
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

function parsePhases(children: ReactNode): SAILDPhase[] {
  const phases: SAILDPhase[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return;
    const labelMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const name = labelMatch ? labelMatch[1] : parts[0];
    phases.push({
      number: String(phases.length + 1).padStart(2, "0"),
      name,
      description: parts[1] ?? "",
      caseStudy: parts.slice(2).join(" · "),
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
  return phases;
}

/**
 * SAILDCycle — visualiserar SAILD-cykeln (Students as AI Literate Designers,
 * Yue, Jong, Dai & Lau 2025) som en levande iterativ loop. Fyra faser ligger
 * runt en cirkel; pilarna mellan dem ritas allt eftersom man stegar framåt.
 * Till höger följer en panel som visar klassrumsexemplet — vad eleverna
 * GÖR i varje fas.
 *
 * Pedagogisk intention: eleven som **designer** av lösningar, inte konsument
 * av svar. AI-litteracitet byggs när lärandet drivs av en riktig design­uppgift.
 *
 * Stegvis reveal: klicka fram en fas i taget. När alla fyra syns ritas
 * iterations­pilen runt cykeln för att markera "och tillbaka till början".
 */
export function SAILDCycle({
  kicker,
  title,
  subtitle,
  caseLabel = "Klassrumsexempel",
  caseTitle,
  bottomLine,
  source,
  payoffTriad,
  payoffTriadTitle = "Det vi vill fostra.",
  background,
  accent = "var(--accent)",
  children,
}: SAILDCycleProps) {
  const phases = parsePhases(children).slice(0, 4);
  // Steg 0 = inget revealat. Steg 4 = alla faser + iterationspil.
  const step = useSlideSteps(phases.length + 1);
  const iterationVisible = step >= phases.length;

  // När ett custom-bakgrund skickas in (ofta en mörk gradient/foto) ska texten
  // hållas ljus. Utan custom-bakgrund följer slide:n temat (var(--bg)).
  const hasCustomBg = Boolean(background);
  const bg = background ?? "var(--slide-base, var(--bg))";

  // Text-färger: fasta ljusa när ett (typiskt mörkt) custom-bakgrund finns,
  // annars temats tokens så att de blir mörka på ljust tema.
  const textColor = hasCustomBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasCustomBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  // Neutrala hårlinjer som syns på både ljust och mörkt.
  const hairline = hasCustomBg
    ? "rgba(245,246,250,0.18)"
    : "rgba(0,0,0,0.12)";
  const hairlineFaint = hasCustomBg
    ? "rgba(245,246,250,0.08)"
    : "rgba(0,0,0,0.08)";
  // Fyllning för inaktiva noder/kort.
  const surfaceFill = hasCustomBg
    ? "rgba(245,246,250,0.06)"
    : "var(--bg-surface)";

  // Cirkelpositioner — 4 noder på en 12 / 3 / 6 / 9-klocka
  const nodePositions = [
    { angle: -90, label: "12" }, // top
    { angle: 0, label: "3" }, // right
    { angle: 90, label: "6" }, // bottom
    { angle: 180, label: "9" }, // left
  ];

  // Cirkelns rendering — vi använder SVG. Cirkelns radie = 38% av container-bredden
  const VIEW = 400; // viewBox
  const CENTER = VIEW / 2;
  const RADIUS = 130;

  const phaseNodes = phases.map((phase, i) => {
    const pos = nodePositions[i % 4];
    const rad = (pos.angle * Math.PI) / 180;
    const x = CENTER + RADIUS * Math.cos(rad);
    const y = CENTER + RADIUS * Math.sin(rad);
    return { ...phase, x, y, position: pos.label };
  });

  // Båglinjer mellan på varandra följande noder — ritas allt eftersom step växer
  const arcs = phaseNodes.map((from, i) => {
    const to = phaseNodes[(i + 1) % phaseNodes.length];
    // SVG-arc: stora arc=0, sweep=1 (clockwise)
    const d = `M ${from.x},${from.y} A ${RADIUS},${RADIUS} 0 0 1 ${to.x},${to.y}`;
    return { d, fromIdx: i };
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem) clamp(2.5rem, 5vw, 5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.75rem)",
          minHeight: 0,
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "54em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: mutedColor,
              }}
            >
              {kicker}
            </motion.div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.9rem, 3.8vw, 3.4rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: textColor,
              margin: 0,
            }}
          >
            {title}
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                lineHeight: 1.5,
                color: mutedColor,
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {/* Split: cykel + case-panel */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
            gap: "clamp(1.5rem, 2.5vw, 2.5rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {/* SAILD-cykel */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
            }}
          >
            <svg
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              style={{
                width: "100%",
                maxWidth: "min(100%, 38rem)",
                height: "auto",
                aspectRatio: "1",
              }}
            >
              {/* Subtil cirkelguidning */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={hairlineFaint}
                strokeWidth={1}
                strokeDasharray="3 5"
              />

              {/* Pil-definitioner */}
              <defs>
                <marker
                  id="saild-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                </marker>
              </defs>

              {/* Bågar mellan faser — ritas när nästa fas avtäcks */}
              {arcs.map((arc, i) => {
                const visible = i + 1 < step; // arc i visas när step > i+1
                const isIterationArc = i === arcs.length - 1; // sista bågen = tillbaka till start
                return (
                  <motion.path
                    key={`arc-${i}`}
                    d={arc.d}
                    fill="none"
                    stroke={isIterationArc && iterationVisible ? accent : "currentColor"}
                    strokeWidth={isIterationArc && iterationVisible ? 2.5 : 2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      visible
                        ? { pathLength: 1, opacity: 1 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{
                      duration: 1.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      color: isIterationArc ? accent : mutedColor,
                    }}
                    markerEnd="url(#saild-arrow)"
                  />
                );
              })}

              {/* Center-label */}
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <text
                  x={CENTER}
                  y={CENTER - 4}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "30px",
                    fontWeight: 700,
                    fill: textColor,
                    letterSpacing: "-0.02em",
                  }}
                >
                  SAILD
                </text>
                <text
                  x={CENTER}
                  y={CENTER + 18}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "8px",
                    letterSpacing: "0.25em",
                    fill: mutedColor,
                    textTransform: "uppercase",
                  }}
                >
                  iterativt
                </text>
              </motion.g>

              {/* Fas-noder */}
              {phaseNodes.map((node, i) => {
                const active = i < step;
                const isCurrent = i === Math.min(step - 1, phases.length - 1);
                return (
                  <motion.g
                    key={node.name}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={
                      active
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0.2, scale: 0.85 }
                    }
                    transition={{
                      duration: 0.6,
                      delay: 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {/* Outer glow för aktiv */}
                    {isCurrent ? (
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={42}
                        fill="none"
                        stroke={accent}
                        strokeWidth={1}
                        opacity={0.35}
                        animate={{ r: [40, 48, 40] }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ) : null}

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={32}
                      fill={active ? accent : surfaceFill}
                      stroke={active ? accent : hairline}
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y - 4}
                      textAnchor="middle"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        fontWeight: 700,
                        // Aktiv nod fylls med accent (mörk på båda teman) → fast ljus text.
                        fill: active ? "rgba(245,246,250,0.95)" : accent,
                        letterSpacing: "0.18em",
                      }}
                    >
                      {node.number}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 9}
                      textAnchor="middle"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "11px",
                        fontWeight: 700,
                        fill: active ? "rgba(245,246,250,0.95)" : mutedColor,
                      }}
                    >
                      {node.name}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Case-panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.5vh, 1.25rem)",
              minHeight: 0,
            }}
          >
            {/* Label + case-titel */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: accent,
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 12px ${withAlpha(accent, 0.67)}`,
                  }}
                />
                {caseLabel}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(1.15rem, 1.55vw, 1.55rem)",
                  lineHeight: 1.15,
                  color: textColor,
                  letterSpacing: "-0.015em",
                }}
              >
                {caseTitle}
              </div>
            </div>

            {/* Fas-cards som avtäcks i takt med cykeln */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                overflow: "auto",
                minHeight: 0,
              }}
            >
              {phases.map((phase, i) => {
                const revealed = i < step;
                const isCurrent = i === Math.min(step - 1, phases.length - 1);
                return (
                  <motion.div
                    key={phase.name + "-case"}
                    initial={{ opacity: 0, x: 16 }}
                    animate={
                      revealed
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0.18, x: 8 }
                    }
                    transition={{
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      display: "flex",
                      gap: "0.85rem",
                      padding: "0.85rem 1rem",
                      borderRadius: "0.55rem",
                      background: isCurrent
                        ? `linear-gradient(135deg, ${withAlpha(accent, 0.08)}, ${withAlpha(accent, 0.02)})`
                        : surfaceFill,
                      border: `1px solid ${isCurrent ? withAlpha(accent, 0.33) : hairlineFaint}`,
                      transition: "all 0.5s ease",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: isCurrent ? accent : mutedColor,
                        letterSpacing: "0.18em",
                        paddingTop: "0.2rem",
                        minWidth: "1.8rem",
                      }}
                    >
                      {phase.number}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "clamp(0.9rem, 1.05vw, 1.08rem)",
                          color: textColor,
                          marginBottom: "0.2rem",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {phase.name}
                        <span
                          style={{
                            fontWeight: 400,
                            color: mutedColor,
                            marginLeft: "0.5rem",
                            fontSize: "0.92em",
                          }}
                        >
                          — {phase.description}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontStyle: "italic",
                          fontSize: "clamp(0.82rem, 0.95vw, 0.98rem)",
                          lineHeight: 1.45,
                          color: textColor,
                        }}
                      >
                        {phase.caseStudy}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payoff-triad — agens / ansvar / transparens */}
        {payoffTriad ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: iterationVisible ? 1 : 0,
              y: iterationVisible ? 0 : 12,
            }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              alignItems: "center",
            }}
          >
            {payoffTriadTitle ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 600,
                }}
              >
                {payoffTriadTitle}
              </div>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "clamp(0.7rem, 1.4vw, 1.2rem)",
                width: "100%",
                maxWidth: "62rem",
              }}
            >
              {payoffTriad.split("|").map((cell, i) => {
                const trimmed = cell.trim();
                const isStar = trimmed.startsWith("★");
                const clean = trimmed.replace(/^★\s*/, "");
                const [name, ...rest] = clean.split("·").map((s) => s.trim());
                const desc = rest.join(" · ");
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: iterationVisible ? 1 : 0,
                      y: iterationVisible ? 0 : 10,
                    }}
                    transition={{
                      duration: 0.7,
                      delay: 0.6 + i * 0.18,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "0.55rem",
                      border: isStar
                        ? `2px solid ${accent}`
                        : `1px solid ${
                            hasCustomBg
                              ? "rgba(245,246,250,0.12)"
                              : "color-mix(in srgb, var(--text) 12%, transparent)"
                          }`,
                      background: isStar
                        ? `linear-gradient(135deg, ${withAlpha(accent, 0.18)} 0%, ${withAlpha(accent, 0.05)} 100%)`
                        : hasCustomBg
                          ? "rgba(245,246,250,0.04)"
                          : "color-mix(in srgb, var(--text) 3%, transparent)",
                      boxShadow: isStar
                        ? `0 0 32px -8px ${withAlpha(accent, 0.55)}, inset 0 1px 0 ${withAlpha(accent, 0.35)}`
                        : undefined,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
                        color: isStar ? accent : textColor,
                        letterSpacing: "-0.012em",
                      }}
                    >
                      {name}
                    </div>
                    {desc ? (
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
                          color: mutedColor,
                          lineHeight: 1.4,
                        }}
                      >
                        {desc}
                      </div>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : null}

        {/* Bottom-line + källa */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {bottomLine ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: iterationVisible ? 1 : 0.4 }}
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                lineHeight: 1.4,
                color: textColor,
                textAlign: "center",
              }}
            >
              {bottomLine}
            </motion.div>
          ) : null}
          {source ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: mutedColor,
                textAlign: "center",
              }}
            >
              {source}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
