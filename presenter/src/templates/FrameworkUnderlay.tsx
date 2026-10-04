"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FrameworkUnderlay — strukturen som legat under berättelsen hela tiden.
 *
 * De fyra rollerna står överst, precis som publiken lärt känna dem. På nästa
 * klick **vecklas innehållsområdena ut under dem** — kartan som funnits där
 * hela timmen utan att någon behövt läsa den.
 *
 * Ordningen är avsiktlig: berättelsen först, ramverket sedan. Publiken ska
 * känna igen områdena som något de redan varit med om, inte möta dem som en
 * ny lista att lära sig.
 *
 * ```mdx
 * <FrameworkUnderlay
 *   kicker="§ Final · De sju områdena"
 *   roles="Oraklet · Tjänaren · Vännen · Rivalen"
 *   bottomLine="Alla områden finns med. Men eleverna behöver inte hela kartan samtidigt."
 * >
 * - Berättelsen om AI · Varifrån kommer våra föreställningar om tänkande maskiner?
 * - Vad är AI? · Mönster, data, träning och begränsningar.
 * </FrameworkUnderlay>
 * ```
 *
 * Per rad: `Områdets namn · Vad det rymmer`.
 */

interface FrameworkUnderlayProps {
  chapter?: string;
  kicker?: string;
  /** Rollerna överst, separerade med ` · `. */
  roles?: string;
  /** Slutrad — landar med områdena. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Area {
  name: string;
  body: string;
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

function parseAreas(children: ReactNode): Area[] {
  const out: Area[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: parts[0].trim(),
      body: parts.slice(1).join(" · ").trim(),
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

export function FrameworkUnderlay({
  chapter,
  kicker,
  roles,
  bottomLine,
  children,
}: FrameworkUnderlayProps) {
  const areas = useMemo(() => parseAreas(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;
  const roleList = useMemo(
    () => (roles ? roles.split(/\s*·\s*/).map((r) => r.trim()).filter(Boolean) : []),
    [roles],
  );

  // 0: bara rollerna · 1: områdena vecklas ut
  const step = useSlideSteps(2);
  const unfolded = step >= 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 12%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1rem, 2.5vh, 1.8rem)",
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

        {/* ————— Rollerna ————— */}
        {roleList.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "clamp(0.5rem, 1.2vw, 1rem)",
            }}
          >
            {roleList.map((role, i) => (
              <motion.span
                key={i}
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.1 + i * 0.09,
                  ease: EASE,
                }}
                style={{
                  padding:
                    "clamp(0.4rem, 0.9vh, 0.6rem) clamp(0.9rem, 1.8vw, 1.5rem)",
                  borderRadius: "999px",
                  border: "1.5px solid var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(0.95rem, 1.5vw, 1.45rem)",
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                }}
              >
                {role}
              </motion.span>
            ))}
          </div>
        ) : null}

        {/* Fällen som viker ut sig */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: unfolded ? 0.55 : 0, scaleY: unfolded ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
          style={{
            alignSelf: "center",
            width: "60%",
            height: "1.5px",
            background:
              "linear-gradient(to right, transparent, var(--accent), transparent)",
            transformOrigin: "top",
          }}
        />

        {/* ————— De sju områdena ————— */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
            gap: "clamp(0.5rem, 1.2vw, 1rem)",
          }}
        >
          {areas.map((area, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{
                opacity: unfolded ? 1 : 0,
                y: unfolded ? 0 : -18,
                scaleY: unfolded ? 1 : 0.7,
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.6,
                delay: reduceMotion || !unfolded ? 0 : 0.12 + i * 0.07,
                ease: EASE,
              }}
              style={{
                transformOrigin: "top",
                padding: "clamp(0.6rem, 1.2vw, 1rem)",
                borderRadius: "var(--radius)",
                border: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
                background: "color-mix(in srgb, var(--text) 3%, transparent)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(0.85rem, 1.15vw, 1.1rem)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                  color: "var(--accent)",
                  marginBottom: "0.25rem",
                }}
              >
                {area.name}
              </div>
              {area.body ? (
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.68rem, 0.92vw, 0.9rem)",
                    lineHeight: 1.35,
                    color: "var(--text-muted)",
                  }}
                >
                  {area.body}
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* ————— Slutraden ————— */}
        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: unfolded ? 1 : 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.8,
              delay: reduceMotion || !unfolded ? 0 : 0.6,
            }}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.3vw, 1.3rem)",
              color: "var(--text-muted)",
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
