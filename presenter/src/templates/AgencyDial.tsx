"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AgencyDial — ett reglage från passivitet till kollektiv agens.
 *
 * Knappen glider mellan tre lägen: AI bestämmer, jag väljer, vi formar.
 * Skalan under fylls efterhand, och den aktiva positionens formulering byts
 * i en crossfade. Definitionen landar sist — den ska höras när publiken
 * redan sett rörelsen, inte innan.
 *
 * Reglaget är rätt bild för det här därför att agens inte är på eller av.
 * Det är en position man kan flytta sig till.
 *
 * ```mdx
 * <AgencyDial
 *   kicker="§ 4 · Agens"
 *   definition="Agens är förmågan att förstå sina handlingsalternativ — och faktiskt använda dem."
 * >
 * - AI bestämmer vad som händer.
 * - Jag väljer hur AI används.
 * - Vi formar systemen och reglerna tillsammans.
 * </AgencyDial>
 * ```
 */

interface AgencyDialProps {
  chapter?: string;
  kicker?: string;
  /** Definitionen som landar på sista steget. */
  definition?: string;
  /** Etikett vid definitionen. */
  definitionLabel?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

function parsePositions(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
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

export function AgencyDial({
  chapter,
  kicker,
  definition,
  definitionLabel = "Agens",
  children,
}: AgencyDialProps) {
  const positions = useMemo(() => parsePositions(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(positions.length + (definition ? 1 : 0));
  const index = Math.min(step, Math.max(positions.length - 1, 0));
  const landed = Boolean(definition) && step >= positions.length;
  const progress =
    positions.length > 1 ? index / (positions.length - 1) : index > 0 ? 1 : 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.6rem, 4vh, 3rem)",
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

        {/* ————— Aktuell position ————— */}
        <div
          style={{
            minHeight: "clamp(4.5rem, 12vh, 7rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: -10,
                transition: { duration: reduceMotion ? 0 : 0.22 },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
              style={{
                textAlign: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 2.9vw, 2.8rem)",
                lineHeight: 1.18,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                maxWidth: "18em",
              }}
            >
              {positions[index]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ————— Reglaget ————— */}
        <div style={{ padding: "0 clamp(1rem, 4vw, 4rem)" }}>
          <div
            style={{
              position: "relative",
              height: "4px",
              borderRadius: "2px",
              background: "color-mix(in srgb, var(--text) 14%, transparent)",
            }}
          >
            <motion.span
              initial={false}
              animate={{ scaleX: progress }}
              transition={{ duration: reduceMotion ? 0 : 0.75, ease: EASE }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "2px",
                background: "var(--accent)",
                transformOrigin: "left",
              }}
            />

            {/* Hållpunkter */}
            {positions.map((_, i) => {
              const at =
                positions.length > 1 ? (i / (positions.length - 1)) * 100 : 50;
              const passed = i <= index;
              return (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: `${at}%`,
                    top: "50%",
                    width: "0.6rem",
                    height: "0.6rem",
                    marginTop: "-0.3rem",
                    marginLeft: "-0.3rem",
                    borderRadius: "50%",
                    background: passed
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--text) 22%, transparent)",
                    transition: reduceMotion ? "none" : "background 0.5s",
                  }}
                />
              );
            })}

            {/* Knappen */}
            <motion.span
              initial={false}
              animate={{ left: `${progress * 100}%` }}
              transition={{
                type: reduceMotion ? "tween" : "spring",
                stiffness: 160,
                damping: 20,
                duration: reduceMotion ? 0 : undefined,
              }}
              style={{
                position: "absolute",
                top: "50%",
                width: "1.5rem",
                height: "1.5rem",
                marginTop: "-0.75rem",
                marginLeft: "-0.75rem",
                borderRadius: "50%",
                background: "var(--accent)",
                border: "3px solid var(--bg)",
                boxShadow: "0 0 26px var(--accent-glow)",
              }}
            />
          </div>

          {/* Ändetiketter */}
          <div
            style={{
              marginTop: "clamp(0.7rem, 1.6vh, 1.1rem)",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span>Passivitet</span>
            <span>Kollektiv agens</span>
          </div>
        </div>

        {/* ————— Definitionen ————— */}
        {definition ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 14 }}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: EASE }}
            style={{
              alignSelf: "center",
              maxWidth: "34em",
              textAlign: "center",
              padding: "clamp(0.9rem, 2vw, 1.5rem) clamp(1.1rem, 2.4vw, 2rem)",
              border: "1.5px solid var(--accent)",
              borderRadius: "var(--radius)",
              background: "color-mix(in srgb, var(--accent) 7%, transparent)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: "0.45rem",
              }}
            >
              {definitionLabel}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
                lineHeight: 1.4,
                color: "var(--text)",
              }}
            >
              <EditableText path="definition" value={definition}>
                {definition}
              </EditableText>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
