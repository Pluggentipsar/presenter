"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * InfluenceChain — horisontell pipeline av 5 (eller färre) stadier.
 * Tänkt för "kedjan av AI-påverkan på demokrati": Skapa → Sprida → Träna →
 * Tillit → Oss. Varje stadium är ett glas-kort med nummer-badge, namn,
 * mekanism och exempel. Pilar pulsar mellan korten. Stega framåt för att
 * lyfta upp ett stadium i taget.
 *
 * MDX-format:
 * ```mdx
 * <InfluenceChain
 *   chapter="§ Källkritik 2.0"
 *   title="AI-påverkan på demokratin — kedjan."
 *   accent= "var(--accent)"
 * >
 * - Skapa · Generativ AI gör desinfo billigt och oändligt · Slovakien-deepfaken 2023
 * - Sprida · Plattformar förstärker engagemang före sanning · Rumänien-TikTok 2024
 * - Träna · Påverkansaktörer planterar perspektiv för framtida modeller · Pravda-nätverket
 * - Tillit · "Det är AI" som försvar mot verkliga saker · Liar's dividend
 * - Oss · Kognitiv bias gör oss mottagliga för bekräftelse · Confirmation bias
 * </InfluenceChain>
 * ```
 *
 * Per rad: `Stadium · Mekanism · Exempel`
 */

interface InfluenceChainProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.78. */
  overlay?: number | string;
  children?: ReactNode;
}

interface Stage {
  name: string;
  mechanism: string;
  example: string;
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

function parseStages(children: ReactNode): Stage[] {
  const out: Stage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const name = (parts[0] ?? "").trim();
    const mechanism = (parts[1] ?? "").trim();
    const example = parts.slice(2).join(" · ").trim();
    if (!name) return;
    out.push({ name, mechanism, example });
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

export function InfluenceChain({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: InfluenceChainProps) {
  const stages = useMemo(() => parseStages(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // step antal = stages, så man kan stega genom dem alla
  const step = useSlideSteps(Math.max(stages.length, 1));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Chapter */}
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
          {chapter}
        </div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.5vh, 2.2rem)",
          zIndex: 2,
        }}
      >
        {/* Titel + subtitle */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
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
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Pipeline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "stretch",
            gap: "clamp(0.4rem, 0.6vw, 0.8rem)",
            minHeight: 0,
          }}
        >
          {stages.map((stage, i) => {
            const active = i <= step;
            const isLatest = i === step;
            const baseDelay = 0.7 + i * 0.16;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  flex: i < stages.length - 1 ? "1 1 0" : "0.85 1 0",
                  minWidth: 0,
                  gap: "clamp(0.4rem, 0.6vw, 0.8rem)",
                }}
              >
                {/* Card */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: baseDelay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    background: active
                      ? "var(--bg-elevated)"
                      : "var(--bg-surface)",
                    border: `1px solid ${active ? withAlpha(accent, 0.27) : "rgba(0,0,0,0.1)"}`,
                    borderTop: `3px solid ${active ? accent : `${withAlpha(accent, 0.2)}`}`,
                    borderRadius: "0.5rem",
                    padding: "clamp(0.85rem, 1.3vw, 1.3rem)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isLatest
                      ? `0 18px 40px -12px ${withAlpha(accent, 0.4)}, inset 0 1px 0 ${withAlpha(accent, 0.33)}`
                      : active
                      ? `0 12px 28px -14px rgba(0,0,0,0.55), inset 0 1px 0 ${withAlpha(accent, 0.2)}`
                      : "0 4px 12px -8px rgba(0,0,0,0.3)",
                    filter: active ? "none" : "saturate(0.6)",
                    transition: "background 0.6s, border 0.6s, box-shadow 0.6s, filter 0.6s",
                  }}
                >
                  {/* Glow ovanifrån när aktiv */}
                  {active ? (
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isLatest ? 1 : 0.5 }}
                      transition={{ duration: 0.5 }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "55%",
                        background: `radial-gradient(ellipse at top, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}

                  {/* Number badge */}
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                      letterSpacing: "0.18em",
                      color: active ? accent : `${withAlpha(accent, 0.4)}`,
                      marginBottom: "clamp(0.4rem, 0.7vh, 0.6rem)",
                      position: "relative",
                      transition: "color 0.6s",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}
                  </div>

                  {/* Stage namn */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.4rem, 2.2vw, 2.2rem)",
                      lineHeight: 1.05,
                      letterSpacing: "-0.025em",
                      color: active ? "var(--text)" : "var(--text-muted)",
                      marginBottom: "clamp(0.6rem, 1vh, 0.9rem)",
                      position: "relative",
                      transition: "color 0.6s",
                    }}
                  >
                    {stage.name}
                  </div>

                  {/* Mechanism */}
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                      lineHeight: 1.35,
                      color: active ? "var(--text)" : "var(--text-muted)",
                      position: "relative",
                      flex: 1,
                      transition: "color 0.6s",
                    }}
                  >
                    {renderInline(stage.mechanism, accent)}
                  </div>

                  {/* Divider */}
                  {stage.example ? (
                    <div
                      aria-hidden
                      style={{
                        height: 1,
                        background: active ? withAlpha(accent, 0.2) : "rgba(0,0,0,0.1)",
                        margin: "clamp(0.7rem, 1.1vh, 1rem) 0 clamp(0.5rem, 0.9vh, 0.8rem)",
                        position: "relative",
                        transition: "background 0.6s",
                      }}
                    />
                  ) : null}

                  {/* Example */}
                  {stage.example ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                        letterSpacing: "0.05em",
                        color: active ? `${withAlpha(accent, 0.87)}` : `${withAlpha(accent, 0.33)}`,
                        position: "relative",
                        lineHeight: 1.3,
                        transition: "color 0.6s",
                      }}
                    >
                      → {renderInline(stage.example, accent)}
                    </div>
                  ) : null}
                </motion.div>

                {/* Arrow till nästa */}
                {i < stages.length - 1 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: i < step ? 1 : 0.18 }}
                    transition={{
                      duration: 0.5,
                      delay: baseDelay + 0.4,
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      width: "clamp(1.2rem, 2vw, 2rem)",
                      color: i < step ? accent : `${withAlpha(accent, 0.33)}`,
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
                      transition: "color 0.6s, opacity 0.6s",
                    }}
                  >
                    →
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
