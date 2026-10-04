"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PossibilityCanvas — bilden där föreläsningen får luft under vingarna.
 *
 * Först står påståendet ensamt. På nästa klick vänder det, och fyra
 * elevprojekt växer ut från mitten samtidigt — inte i en lista, utan utåt
 * åt fyra håll, med bågar som fortsätter förbi kortens kant. Rörelsen ska
 * kännas expansiv snarare än ordnad: det finns mer där ute än vad som ryms.
 *
 * Detta är kapitlets motvikt. Allt annat handlar om att skydda tänkandet;
 * här handlar det om vad som blir möjligt.
 *
 * ```mdx
 * <PossibilityCanvas
 *   kicker="§ 2 · AI som kreativ hävstång"
 *   statement="AI ska inte bara göra det enklare att **bli klar**."
 *   reveal="Den kan göra det lättare att **börja** något du annars inte hade vågat."
 * >
 * - En elev gör musik av ett NO-innehåll · ljud
 * - En elev bygger en enkel simulering · kod
 * </PossibilityCanvas>
 * ```
 *
 * Per rad: `Projektet · liten etikett`.
 */

interface PossibilityCanvasProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Första påståendet. `**fet**` blir accent. */
  statement?: string;
  /** Vändningen — kommer på nästa klick, tillsammans med projekten. */
  reveal?: string;
  children?: ReactNode;
}

interface Project {
  text: string;
  label: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Medvetet oregelbundna — ett rutnät skulle döda expansionskänslan. */
const SLOTS = [
  { x: 15, y: 19 },
  { x: 85, y: 25 },
  { x: 13, y: 80 },
  { x: 87, y: 74 },
];

const CENTER = { x: 50, y: 50 };

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

function parseProjects(children: ReactNode): Project[] {
  const out: Project[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      text: parts[0].trim(),
      label: parts.slice(1).join(" · ").trim(),
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
  return out.slice(0, 4);
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
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

export function PossibilityCanvas({
  chapter,
  kicker,
  statement,
  reveal,
  children,
}: PossibilityCanvasProps) {
  const projects = useMemo(() => parseProjects(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(reveal ? 2 : 1);
  const opened = !reveal || step >= 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      {/* Sken som växer när ytan öppnar sig */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: opened ? 1 : 0, scale: opened ? 1 : 0.6 }}
        transition={{ duration: reduceMotion ? 0 : 1.6, ease: EASE }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, var(--accent-glow) 0%, transparent 62%)",
          pointerEvents: "none",
        }}
      />

      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 5,
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

      {/* ————— Bågarna utåt ————— */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      >
        {projects.map((_, i) => {
          const slot = SLOTS[i];
          if (!slot) return null;
          // Kontrollpunkten böjer bågen så den inte pekar rakt — organiskt.
          const cx = (CENTER.x + slot.x) / 2 + (i % 2 === 0 ? -8 : 8);
          const cy = (CENTER.y + slot.y) / 2 + (i < 2 ? 6 : -6);
          return (
            <motion.path
              key={i}
              d={`M ${CENTER.x} ${CENTER.y} Q ${cx} ${cy} ${slot.x} ${slot.y}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              initial={false}
              animate={{ pathLength: opened ? 1 : 0, opacity: opened ? 0.35 : 0 }}
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                delay: reduceMotion ? 0 : 0.2 + i * 0.1,
                ease: EASE,
              }}
            />
          );
        })}
      </svg>

      {/* ————— Projekten ————— */}
      {projects.map((project, i) => {
        const slot = SLOTS[i];
        if (!slot) return null;
        return (
          // Centreringen ligger i ett OANIMERAT omslag. Kortet animerar y,
          // så x/y kan inte användas till centrering här — och en CSS-transform
          // på själva motion-elementet hade framer-motion skrivit över.
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: "translate(-50%, -50%)",
              width: "clamp(9rem, 19vw, 15rem)",
              zIndex: 3,
            }}
          >
          <motion.div
            initial={false}
            animate={{
              opacity: opened ? 1 : 0,
              scale: opened ? 1 : 0.7,
              y: opened ? 0 : 14,
            }}
            transition={{
              type: reduceMotion ? "tween" : "spring",
              stiffness: 180,
              damping: 20,
              delay: reduceMotion ? 0 : 0.35 + i * 0.12,
              duration: reduceMotion ? 0 : undefined,
            }}
            style={{
              padding: "clamp(0.75rem, 1.4vw, 1.15rem)",
              background: "var(--bg-elevated)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              borderRadius: "var(--radius)",
              boxShadow: "0 18px 45px -28px var(--accent-glow)",
            }}
          >
            {project.label ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.52rem, 0.7vw, 0.7rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: "0.35rem",
                }}
              >
                {project.label}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.82rem, 1.1vw, 1.05rem)",
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              {project.text}
            </div>
          </motion.div>
          </div>
        );
      })}

      {/* ————— Påståendet i mitten ————— */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.7rem, 1.8vh, 1.3rem)",
          padding: "clamp(3rem, 7vw, 7rem)",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {statement ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: opened ? 0.45 : 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              maxWidth: "15em",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.25rem, 2.2vw, 2.1rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              padding: "clamp(0.8rem, 1.6vw, 1.4rem)",
              background:
                "radial-gradient(ellipse at 50% 50%, var(--bg) 44%, transparent 80%)",
            }}
          >
            <EditableText path="statement" value={statement}>
              {renderInline(statement)}
            </EditableText>
          </motion.div>
        ) : null}

        {reveal ? (
          <motion.div
            initial={false}
            animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : 16 }}
            transition={{
              duration: reduceMotion ? 0 : 0.85,
              delay: reduceMotion ? 0 : 0.15,
              ease: EASE,
            }}
            style={{
              maxWidth: "16em",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 2.7vw, 2.6rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              padding: "clamp(0.9rem, 1.8vw, 1.6rem)",
              background:
                "radial-gradient(ellipse at 50% 50%, var(--bg) 48%, transparent 82%)",
            }}
          >
            <EditableText path="reveal" value={reveal}>
              {renderInline(reveal)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
