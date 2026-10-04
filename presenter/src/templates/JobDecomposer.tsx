"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * JobDecomposer — ett jobb är inte en sak, det är många uppgifter.
 *
 * Yrket står överst. Vid varje klick faller en arbetsuppgift ner i en av tre
 * banor: vad AI kan göra mycket av, vad människa och AI gör tillsammans, och
 * vad en människa måste bära. Banorna fylls ojämnt — det är poängen.
 *
 * Flyttar samtalet från "försvinner yrket?" till "vilka delar förändras, och
 * vilka nya förmågor behövs?". Fungerar för vilket yrke som helst.
 *
 * ```mdx
 * <JobDecomposer
 *   kicker="§ 4 · Ett jobb är många uppgifter"
 *   job="Designer"
 *   aiLabel="AI kan göra mycket"
 *   bothLabel="Människa och AI tillsammans"
 *   humanLabel="Människan måste bära ansvaret"
 * >
 * - Research · ai
 * - Skissande · bada
 * - Ansvar för resultatet · manniska
 * </JobDecomposer>
 * ```
 *
 * Per rad: `Arbetsuppgift · bana`. Banor: `ai`, `bada`, `manniska`.
 */

interface JobDecomposerProps {
  chapter?: string;
  kicker?: string;
  /** Yrket som delas upp. */
  job?: string;
  /** Rubrik för AI-banan. */
  aiLabel?: string;
  /** Rubrik för den delade banan. */
  bothLabel?: string;
  /** Rubrik för människo-banan. */
  humanLabel?: string;
  /** Slutrad — landar när alla uppgifter fördelats. */
  bottomLine?: string;
  children?: ReactNode;
}

type Lane = "ai" | "bada" | "manniska";

interface Task {
  name: string;
  lane: Lane;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LANES: Lane[] = ["ai", "bada", "manniska"];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseTasks(children: ReactNode): Task[] {
  const out: Task[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const lane = parts.find((p) => (LANES as string[]).includes(p.toLowerCase()));
    out.push({
      name: parts[0],
      lane: (lane?.toLowerCase() as Lane) ?? "bada",
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

export function JobDecomposer({
  chapter,
  kicker,
  job,
  aiLabel = "AI kan göra mycket",
  bothLabel = "Människa och AI tillsammans",
  humanLabel = "Människan måste bära ansvaret",
  bottomLine,
  children,
}: JobDecomposerProps) {
  const tasks = useMemo(() => parseTasks(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(tasks.length + (bottomLine ? 1 : 0));
  const placed = Math.min(step + 1, tasks.length);
  const landed = Boolean(bottomLine) && step >= tasks.length;

  const laneLabels: Record<Lane, string> = {
    ai: aiLabel,
    bada: bothLabel,
    manniska: humanLabel,
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 10%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(0.9rem, 2.2vh, 1.6rem)",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ————— Yrket ————— */}
        {job ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7 }}
              style={{
                padding: "clamp(0.45rem, 1vh, 0.7rem) clamp(1.1rem, 2.2vw, 1.9rem)",
                border: "1.5px solid var(--accent)",
                borderRadius: "999px",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.1rem, 1.9vw, 1.85rem)",
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              <EditableText path="job" value={job}>
                {job}
              </EditableText>
            </motion.div>
            <span
              aria-hidden
              style={{
                width: "1.5px",
                height: "clamp(0.7rem, 1.8vh, 1.2rem)",
                background:
                  "linear-gradient(to bottom, var(--accent), transparent)",
              }}
            />
          </div>
        ) : null}

        {/* ————— De tre banorna ————— */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(0.7rem, 1.8vw, 1.6rem)",
            alignItems: "start",
          }}
        >
          {LANES.map((lane) => {
            const laneTasks = tasks
              .map((t, i) => ({ ...t, i }))
              .filter((t) => t.lane === lane);
            const isHuman = lane === "manniska";
            return (
              <div
                key={lane}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.4rem, 1vh, 0.7rem)",
                  padding: "clamp(0.7rem, 1.4vw, 1.2rem)",
                  minHeight: "clamp(9rem, 26vh, 15rem)",
                  borderRadius: "var(--radius)",
                  border: `1px solid ${
                    isHuman
                      ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                      : "color-mix(in srgb, var(--text) 10%, transparent)"
                  }`,
                  background: isHuman
                    ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                    : "color-mix(in srgb, var(--text) 3%, transparent)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.88vw, 0.9rem)",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: isHuman ? "var(--accent)" : "var(--text-muted)",
                    marginBottom: "0.2rem",
                    // Reserverar plats för TVÅ rader. De längre etiketterna
                    // bryter på två rader, och utan reservationen startar
                    // banornas kort på olika höjd.
                    minHeight: "3.1em",
                  }}
                >
                  {laneLabels[lane]}
                </div>

                {laneTasks.map((t) => {
                  const shown = t.i < placed;
                  return (
                    <motion.div
                      key={t.i}
                      initial={false}
                      animate={{
                        opacity: shown ? 1 : 0,
                        y: shown ? 0 : -14,
                        scale: shown ? 1 : 0.92,
                      }}
                      transition={{
                        type: reduceMotion ? "tween" : "spring",
                        stiffness: 240,
                        damping: 22,
                        duration: reduceMotion ? 0 : undefined,
                      }}
                      style={{
                        padding:
                          "clamp(0.5rem, 1.1vh, 0.72rem) clamp(0.75rem, 1.35vw, 1.1rem)",
                        borderRadius: "calc(var(--radius) * 0.7)",
                        background: "var(--bg-elevated)",
                        border:
                          "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(0.92rem, 1.32vw, 1.3rem)",
                        lineHeight: 1.3,
                        color: "var(--text)",
                      }}
                    >
                      {t.name}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              paddingTop: "clamp(0.6rem, 1.4vh, 1rem)",
              borderTop: "2px solid var(--accent)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.2rem, 1.9vw, 1.95rem)",
              lineHeight: 1.35,
              color: "var(--text)",
              textAlign: "center",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {bottomLine}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
