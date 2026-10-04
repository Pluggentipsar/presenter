"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TaskBucket — visualiserar ett yrke (en "behållare") som ett rutnät av
 * uppgifts-pills. Varje pill markeras som en av tre typer:
 *   - ai    → AI tar över (struken, dimmad)
 *   - mixed → människa + AI (accent-prick, men kvar)
 *   - human → endast människa (lysande accent-ram)
 *
 * Animation faseras autostagger:
 *   0s     → titel + behållare
 *   0.6s   → alla pills tonas in (cream)
 *   2.2s   → ai-pills får strikethrough + dim
 *   3.5s   → human-pills får accent-glow
 *   4.5s   → conclusion-text fadar in
 *
 * Tänkt för David Autor-poängen: "Det är inte yrken som försvinner.
 * Det är uppgifter som flyttar." Yrket finns kvar, gränsen rör sig.
 *
 * MDX-format:
 * ```mdx
 * <TaskBucket
 *   chapter="§ Akt 3 · Arbetsmarknad"
 *   title="Ett yrke är en behållare för uppgifter."
 *   subtitle="AI flyttar gränsen — den ersätter inte behållaren."
 *   jobLabel="Lärare"
 *   conclusion="Det är inte yrken som **försvinner**. Det är uppgifter som **flyttar**."
 *   accent= "var(--accent)"
 * >
 * - Rätta prov · ai
 * - Planera lektioner · mixed
 * - Skriva omdömen · ai
 * - Möta eleven · human
 * - Bära ansvar · human
 * - Skapa lärmiljö · human
 * - Bedöma processen · mixed
 * - Sammanställa data · ai
 * </TaskBucket>
 * ```
 *
 * Per rad: `Uppgift · type` där type = ai | mixed | human.
 */

type TaskKind = "ai" | "mixed" | "human";

interface TaskBucketProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Etikett för yrket — t.ex. "Lärare". Visas ovanför behållaren. */
  jobLabel?: string;
  /** Slutsats under behållaren. Stödjer **bold**-markdown. */
  conclusion?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

interface Task {
  label: string;
  kind: TaskKind;
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

function parseTasks(children: ReactNode): Task[] {
  const out: Task[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const label = (parts[0] ?? "").trim();
    const kindRaw = (parts[1] ?? "human").trim().toLowerCase();
    const kind: TaskKind =
      kindRaw === "ai" || kindRaw === "mixed" ? (kindRaw as TaskKind) : "human";
    if (!label) return;
    out.push({ label, kind });
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

export function TaskBucket({
  chapter,
  title,
  subtitle,
  jobLabel = "Yrke",
  conclusion,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: TaskBucketProps) {
  const tasks = useMemo(() => parseTasks(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  const showAllAt = 0.6;
  const aiStrikeAt = 2.2;
  const humanGlowAt = 3.5;
  const conclusionAt = 4.5;

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

        {/* Behållare med job-label */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "clamp(0.6rem, 1.2vh, 1rem)",
            minHeight: 0,
          }}
        >
          {/* Job-label */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              alignSelf: "flex-start",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: accent,
              padding: "0.35rem 0.9rem",
              border: `1px solid ${withAlpha(accent, 0.4)}`,
              borderRadius: "9999px",
              background: `${withAlpha(accent, 0.08)}`,
            }}
          >
            Yrket: {jobLabel}
          </motion.div>

          {/* Behållaren */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: 1,
              border: `2px dashed ${withAlpha(accent, 0.4)}`,
              borderRadius: "1.2rem",
              padding: "clamp(1rem, 2vw, 1.8rem)",
              background: "var(--bg-surface)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "flex",
              flexWrap: "wrap",
              gap: "clamp(0.5rem, 1vw, 0.9rem)",
              alignContent: "center",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: `0 24px 48px -16px rgba(0,0,0,0.55), inset 0 1px 0 ${withAlpha(accent, 0.13)}`,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {tasks.map((task, i) => {
              const isAi = task.kind === "ai";
              const isHuman = task.kind === "human";
              const isMixed = task.kind === "mixed";
              const pillDelay = showAllAt + (i % 8) * 0.05;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: pillDelay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: "relative",
                    padding:
                      "clamp(0.5rem, 0.9vw, 0.8rem) clamp(0.95rem, 1.5vw, 1.4rem)",
                    borderRadius: "9999px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {/* Bakgrund per typ — animeras vid faserna */}
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: isAi ? [0, 1, 0.35] : isHuman ? [0, 1, 1] : [0, 1, 1],
                    }}
                    transition={{
                      times: [0, 0.5, 1],
                      duration: aiStrikeAt + 1.5,
                      delay: pillDelay,
                      ease: "easeInOut",
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "9999px",
                      background: isHuman
                        ? "var(--text)"
                        : isMixed
                        ? `${withAlpha(accent, 0.15)}`
                        : "var(--text)",
                    }}
                  />

                  {/* Border per typ */}
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      boxShadow: isHuman
                        ? [
                            `0 0 0 1.5px ${withAlpha(accent, 0.4)}`,
                            `0 0 0 1.5px ${withAlpha(accent, 0.4)}`,
                            `0 0 0 2px ${accent}, 0 0 24px ${withAlpha(accent, 0.53)}, 0 0 48px ${withAlpha(accent, 0.2)}`,
                          ]
                        : isMixed
                        ? [
                            `0 0 0 1px ${withAlpha(accent, 0.33)}`,
                            `0 0 0 1px ${withAlpha(accent, 0.33)}`,
                            `0 0 0 1.5px ${withAlpha(accent, 0.67)}`,
                          ]
                        : [
                            `0 0 0 1px rgba(247,241,230,0.4)`,
                            `0 0 0 1px rgba(247,241,230,0.4)`,
                            `0 0 0 1px rgba(247,241,230,0.15)`,
                          ],
                    }}
                    transition={{
                      times: [0, humanGlowAt / (humanGlowAt + 0.5), 1],
                      duration: humanGlowAt + 0.5,
                      delay: pillDelay,
                      ease: "easeInOut",
                    }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "9999px",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Mixed-prick (subtil indicator) */}
                  {isMixed ? (
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: pillDelay + 1.2,
                      }}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 8,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: accent,
                        boxShadow: `0 0 8px ${accent}`,
                      }}
                    />
                  ) : null}

                  {/* Strikethrough för AI-tasks */}
                  {isAi ? (
                    <motion.div
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: pillDelay + aiStrikeAt - showAllAt,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        position: "absolute",
                        left: "10%",
                        right: "10%",
                        top: "50%",
                        height: "2.5px",
                        background: accent,
                        boxShadow: `0 0 10px ${accent}`,
                        transformOrigin: "left center",
                        borderRadius: "2px",
                      }}
                    />
                  ) : null}

                  {/* Etikett */}
                  <span
                    style={{
                      position: "relative",
                      color: isHuman ? "var(--bg)" : isMixed ? "var(--text)" : "var(--bg)",
                      fontWeight: isHuman ? 700 : isMixed ? 600 : 500,
                    }}
                  >
                    {task.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Conclusion */}
          {conclusion ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: conclusionAt }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.1rem, 1.8vw, 1.7rem)",
                color: "var(--text)",
                lineHeight: 1.3,
                letterSpacing: "-0.015em",
                marginTop: "clamp(0.4rem, 0.8vh, 0.8rem)",
                paddingTop: "clamp(0.6rem, 1vh, 1rem)",
                borderTop: `1px solid ${withAlpha(accent, 0.33)}`,
                maxWidth: "70ch",
              }}
            >
              {renderInline(conclusion, accent)}
            </motion.div>
          ) : null}

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            transition={{ duration: 0.6, delay: humanGlowAt + 0.6 }}
            style={{
              display: "flex",
              gap: "clamp(0.8rem, 1.6vw, 1.6rem)",
              flexWrap: "wrap",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginTop: "0.2rem",
            }}
          >
            <span>
              <span style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "var(--text-muted)",
                marginRight: 6,
                verticalAlign: "middle",
                position: "relative",
                top: -1,
              }}>
                <span style={{
                  position: "absolute",
                  left: 1,
                  right: 1,
                  top: "50%",
                  height: 1.5,
                  background: accent,
                  transform: "translateY(-50%)",
                }} />
              </span>
              AI tar över
            </span>
            <span>
              <span style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 6,
                background: `${withAlpha(accent, 0.15)}`,
                border: `1px solid ${withAlpha(accent, 0.67)}`,
                marginRight: 6,
                verticalAlign: "middle",
                position: "relative",
                top: -1,
              }} />
              Människa + AI
            </span>
            <span>
              <span style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "var(--text)",
                boxShadow: `0 0 8px ${withAlpha(accent, 0.53)}`,
                marginRight: 6,
                verticalAlign: "middle",
                position: "relative",
                top: -1,
              }} />
              Endast människa
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
