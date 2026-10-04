"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * SkillStack — horisontell stapel-visualisering där varje rad är en
 * förmåga och stapelns längd visar tillväxt-procent (% av arbetsgivare
 * som ser den växa, från WEF Future of Jobs eller liknande). Staplarna
 * växer in med stagger; siffran räknas upp parallellt.
 *
 * Avsedd för "vad arbetsgivare ser växa"-poäng — en visualisering som
 * cementerar att de växande förmågorna är det skolan REDAN gör (kreativt
 * tänkande, resiliens, social förmåga, omdöme).
 *
 * MDX-format:
 * ```mdx
 * <SkillStack
 *   chapter="§ Akt 3 · Färdigheter"
 *   title="Vad arbetsgivare ser **växa** 2025–2030."
 *   subtitle="Topp-rankade förmågor enligt WEF Future of Jobs Report 2025."
 *   xMaxLabel="% arbetsgivare ser växa"
 *   conclusion="Det här — det är vad **skolan** redan gör. Bildning är arbetsmarknadsförberedelse."
 *   accent= "var(--accent)"
 * >
 * - Kreativt tänkande · 73
 * - Resiliens & flexibilitet · 67
 * - Nyfikenhet & livslångt lärande · 65
 * - Ledarskap & social påverkan · 62
 * - Empati & aktivt lyssnande · 56
 * - Analytiskt tänkande · 60
 * </SkillStack>
 * ```
 *
 * Per rad: `Förmåga · värde` där värde är heltal 0-100.
 */

interface SkillStackProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Källa/etikett ovanför staplarna. */
  xMaxLabel?: string;
  /** Slutsats under stapelchart:en. Stödjer **bold**. */
  conclusion?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

interface Skill {
  name: string;
  value: number;
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

function parseSkills(children: ReactNode): Skill[] {
  const out: Skill[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const name = (parts[0] ?? "").trim();
    const valueRaw = (parts[1] ?? "0").trim();
    const value = parseFloat(valueRaw);
    if (!name || !Number.isFinite(value)) return;
    out.push({ name, value });
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

export function SkillStack({
  chapter,
  title,
  subtitle,
  xMaxLabel = "% arbetsgivare ser tillväxt",
  conclusion,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: SkillStackProps) {
  const skills = useMemo(() => parseSkills(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  // Sortera staplarna efter värde, störst först
  const sorted = useMemo(() => [...skills].sort((a, b) => b.value - a.value), [
    skills,
  ]);
  const max = useMemo(
    () => Math.max(100, ...sorted.map((s) => s.value)),
    [sorted]
  );

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
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.5vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Title + subtitle */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
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
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                color: "var(--text)",
                marginTop: "0.5rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* X-axel-etikett */}
        {xMaxLabel ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              alignSelf: "flex-end",
              marginRight: "clamp(0rem, 1vw, 1rem)",
            }}
          >
            → {xMaxLabel}
          </motion.div>
        ) : null}

        {/* Bars */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1.1vh, 1rem)",
            minHeight: 0,
            justifyContent: "center",
          }}
        >
          {sorted.map((skill, i) => {
            const widthPct = (skill.value / max) * 100;
            const baseDelay = 0.8 + i * 0.18;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 28%) 1fr auto",
                  alignItems: "center",
                  gap: "clamp(0.8rem, 1.4vw, 1.4rem)",
                }}
              >
                {/* Förmåga-namn */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: baseDelay }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                    color: "var(--text)",
                    letterSpacing: "-0.015em",
                    textAlign: "right",
                    lineHeight: 1.2,
                  }}
                >
                  {skill.name}
                </motion.div>

                {/* Stapel-track + bar */}
                <div
                  style={{
                    position: "relative",
                    height: "clamp(1.4rem, 2.4vh, 2rem)",
                    background: "rgba(247,241,230,0.07)",
                    borderRadius: "0.4rem",
                    overflow: "hidden",
                    border: "1px solid rgba(247,241,230,0.06)",
                  }}
                >
                  {/* Bar */}
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{
                      duration: 1.4,
                      delay: baseDelay + 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: "0.4rem",
                      background: `linear-gradient(90deg, ${withAlpha(accent, 0.33)}, ${accent} 70%, ${withAlpha(accent, 0.87)})`,
                      boxShadow: `0 0 16px ${withAlpha(accent, 0.4)}, inset 0 0 12px ${withAlpha(accent, 0.4)}`,
                    }}
                  />
                  {/* Subtle shine */}
                  <motion.div
                    aria-hidden
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "100%", opacity: [0, 0.6, 0] }}
                    transition={{
                      duration: 1.6,
                      delay: baseDelay + 0.6,
                      times: [0, 0.5, 1],
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: "30%",
                      background: `linear-gradient(90deg, transparent, rgba(247,241,230,0.5), transparent)`,
                    }}
                  />
                </div>

                {/* Värde */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: baseDelay + 1.4 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
                    color: accent,
                    letterSpacing: "-0.02em",
                    minWidth: "3.5em",
                    textAlign: "right",
                    textShadow: `0 0 18px ${withAlpha(accent, 0.4)}`,
                  }}
                >
                  {skill.value}%
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Conclusion */}
        {conclusion ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.8 + sorted.length * 0.18 + 1.6,
            }}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.7vw, 1.65rem)",
              color: "var(--text)",
              lineHeight: 1.3,
              letterSpacing: "-0.015em",
              paddingTop: "clamp(0.7rem, 1.2vh, 1rem)",
              borderTop: `1px solid ${withAlpha(accent, 0.33)}`,
              maxWidth: "75ch",
            }}
          >
            {renderInline(conclusion, accent)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
