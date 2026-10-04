"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AffordanceLenses ★ — fyra linser som en optisk bänk.
 *
 * Byggd som ersättare till NumberedReveal för "Adaptiv. Assisterande.
 * Anpassande. Skapande." — passets tankemodell förtjänar mer än en
 * numrerad lista. Varje lins är en glascirkel på en gemensam skena, med
 * en abstrakt mikro-animation inuti som GÖR linsens jobb i stället för
 * att illustrera det:
 *
 *   1 Adaptiv      — en punkt som följer en ojämn kurva (möter eleven där hen står)
 *   2 Assisterande — ett hinder lyfts ur vägen, punkten passerar (hindret bort)
 *   3 Anpassande   — samma form byter skepnad (samma innehåll, ny form)
 *   4 Skapande     — block monteras ur ingenting (stödet som inte fanns)
 *
 * Linserna tänds en per klick. Den sista linsen kan markeras som ny
 * (`lastBadge`) och får en egen accent (`accent2`) — Skapande är Joels
 * tillägg till Tensettis tre.
 *
 * ```mdx
 * <AffordanceLenses
 *   kicker="§ Tankemodellen"
 *   title="Fyra linser att sortera med."
 *   lastBadge="Joels tillägg"
 * >
 * - Adaptiv · möter eleven där hen står — nivå, tempo, intresse
 * - Assisterande · tar bort hindret — uppläsning, talsyntes, transkription
 * - Anpassande · formar om materialet — samma innehåll, ny form
 * - Skapande · bygger stödet som inte fanns
 * </AffordanceLenses>
 * ```
 *
 * Tema-medveten via tokens; mikro-animationerna ärver linsens färg.
 */

interface AffordanceLensesProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  accent?: string;
  /** Accent för sista linsen (den nya). */
  accent2?: string;
  /** Liten pill ovanför sista linsen, t.ex. "Joels tillägg". Tom sträng döljer. */
  lastBadge?: string;
  children?: ReactNode;
}

interface Lens {
  name: string;
  definition: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseLenses(children: ReactNode): Lens[] {
  const out: Lens[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const parts = t.split(/\s*·\s*/);
    out.push({ name: (parts[0] ?? "").trim(), definition: parts.slice(1).join(" · ").trim() });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/** Mikro-animationerna. viewBox 0 0 100 100, ritar i currentColor. */
function LensViz({ kind, lit, still }: { kind: number; lit: boolean; still: boolean }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const loop = lit && !still;

  if (kind === 0) {
    // Adaptiv — punkten följer den ojämna kurvan.
    const xs = [12, 22, 32, 42, 52, 62, 72, 82, 90];
    const ys = [58, 42, 54, 62, 48, 38, 50, 55, 44];
    return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        <motion.path
          {...stroke}
          strokeWidth={2}
          opacity={0.45}
          d="M12,58 C18,46 26,38 32,54 C38,68 44,66 52,48 C58,36 64,32 72,50 C78,62 84,58 90,44"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: lit ? 1 : 0 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        <motion.circle
          r={5}
          fill="currentColor"
          initial={false}
          animate={
            loop
              ? { cx: xs, cy: ys, opacity: 1 }
              : { cx: xs[0], cy: ys[0], opacity: lit ? 1 : 0 }
          }
          transition={
            loop
              ? { duration: 3.4, repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        />
      </svg>
    );
  }

  if (kind === 1) {
    // Assisterande — hindret lyfts, punkten tar sig fram.
    return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        <path {...stroke} strokeWidth={2} opacity={0.45} d="M10,62 H90" />
        <motion.rect
          width={13}
          height={22}
          x={43.5}
          rx={2.5}
          {...stroke}
          strokeWidth={2.4}
          initial={false}
          animate={
            loop
              ? { y: [40, 40, 14, 14, 40], opacity: [1, 1, 0.25, 0.25, 1] }
              : { y: lit ? 14 : 40, opacity: lit ? 0.25 : 1 }
          }
          transition={
            loop
              ? { duration: 3.2, times: [0, 0.12, 0.32, 0.88, 1], repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }
              : { duration: 0.6, ease: EASE }
          }
        />
        <motion.circle
          cy={62}
          r={5}
          fill="currentColor"
          initial={false}
          animate={
            loop
              ? { cx: [13, 13, 87, 87], opacity: [0, 1, 1, 0] }
              : { cx: 87, opacity: lit ? 1 : 0 }
          }
          transition={
            loop
              ? { duration: 3.2, times: [0, 0.3, 0.82, 1], repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        />
      </svg>
    );
  }

  if (kind === 2) {
    // Anpassande — samma form, ny skepnad.
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          initial={false}
          animate={
            loop
              ? {
                  scaleX: [1, 0.55, 1.35, 1],
                  scaleY: [1, 1.55, 0.62, 1],
                  borderRadius: ["14%", "50%", "22%", "14%"],
                }
              : { scaleX: 1, scaleY: 1, borderRadius: lit ? "38%" : "14%" }
          }
          transition={
            loop
              ? { duration: 3.6, times: [0, 0.35, 0.7, 1], repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }
              : { duration: 0.6, ease: EASE }
          }
          style={{
            width: "38%",
            height: "38%",
            border: "3px solid currentColor",
            background: "color-mix(in srgb, currentColor 16%, transparent)",
          }}
        />
      </div>
    );
  }

  // Skapande — block monteras ur ingenting.
  const blocks = [
    { x: 30, y: 60, delay: 0 },
    { x: 52, y: 60, delay: 0.1 },
    { x: 41, y: 42, delay: 0.2 },
  ];
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
      {blocks.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          width={17}
          height={15}
          rx={2.5}
          {...stroke}
          strokeWidth={2.6}
          fill="color-mix(in srgb, currentColor 14%, transparent)"
          initial={false}
          animate={
            loop
              ? { y: [b.y - 16, b.y, b.y, b.y - 16], opacity: [0, 1, 1, 0] }
              : { y: b.y, opacity: lit ? 1 : 0 }
          }
          transition={
            loop
              ? { duration: 3.4, times: [0.05 + b.delay, 0.2 + b.delay, 0.85, 1], repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }
              : { duration: 0.5, delay: i * 0.12, ease: EASE }
          }
        />
      ))}
      <motion.path
        {...stroke}
        strokeWidth={2.6}
        d="M50 22 v9 M45.5 26.5 h9"
        initial={false}
        animate={
          loop
            ? { opacity: [0, 0, 1, 1, 0], scale: [0.6, 0.6, 1, 1, 0.6] }
            : { opacity: lit ? 1 : 0, scale: 1 }
        }
        style={{ transformOrigin: "50px 26.5px" }}
        transition={
          loop
            ? { duration: 3.4, times: [0, 0.4, 0.55, 0.85, 1], repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }
            : { duration: 0.4 }
        }
      />
    </svg>
  );
}

export function AffordanceLenses({
  kicker,
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  accent2 = "#9D7AFF",
  lastBadge = "den fjärde",
  children,
}: AffordanceLensesProps) {
  const lenses = useMemo(() => parseLenses(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;
  // Steg 0: rubrik + släckta linser. Steg 1..N: tänd lins för lins.
  const step = useSlideSteps(lenses.length + 1);

  if (lenses.length === 0) return null;
  const lastIndex = lenses.length - 1;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 24%, var(--bg-surface) 0%, var(--bg) 74%)",
        padding: "clamp(2.2rem, 4.5vh, 3.4rem) clamp(2.5rem, 5vw, 5rem)",
      }}
    >
      {/* Topprad */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
        {kicker ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: accent,
            }}
          >
            {kicker}
          </span>
        ) : <span />}
        {chapter ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {chapter}
          </span>
        ) : null}
      </div>

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{
            margin: "clamp(0.5rem, 1.2vh, 0.9rem) 0 0",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.8rem, 3.4vw, 3.2rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.05,
            color: "var(--text)",
            maxWidth: "26ch",
          }}
        >
          {title}
        </motion.h2>
      ) : null}

      {subtitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            margin: "clamp(0.4rem, 0.9vh, 0.7rem) 0 0",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
            color: "var(--text-muted)",
            maxWidth: "56ch",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </motion.p>
      ) : null}

      {/* Den optiska bänken */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${lenses.length}, 1fr)`,
            gap: "clamp(0.8rem, 2vw, 2rem)",
            ["--lens-size" as string]: "clamp(7rem, 11.5vw, 10.5rem)",
            ["--lens-badge" as string]: "clamp(1.7rem, 2.6vh, 2.2rem)",
          }}
        >
          {/* Skenan bakom linserna — växer med stegen */}
          <motion.span
            aria-hidden
            initial={false}
            animate={{ scaleX: Math.max(0.05, Math.min(step, lenses.length) / lenses.length) }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
            style={{
              position: "absolute",
              left: "4%",
              right: "4%",
              top: "calc(var(--lens-badge) + var(--lens-size) / 2)",
              height: "2px",
              background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 55%, transparent), color-mix(in srgb, ${accent2} 55%, transparent))`,
              transformOrigin: "left",
              zIndex: 0,
            }}
          />

          {lenses.map((lens, i) => {
            const lit = step >= i + 1;
            const isLast = i === lastIndex;
            const lensColor = isLast ? accent2 : accent;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: lit ? 1 : 0.22, y: lit ? 0 : 10 }}
                transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.5rem, 1.2vh, 0.9rem)",
                  zIndex: 1,
                }}
              >
                {/* Badge-raden — reserverad höjd så alla kolumner linjerar */}
                <div style={{ height: "var(--lens-badge)", display: "flex", alignItems: "center" }}>
                  {isLast && lastBadge ? (
                    <motion.span
                      initial={false}
                      animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.9 }}
                      transition={{ duration: reduceMotion ? 0 : 0.5, delay: 0.15 }}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.6rem, 0.78vw, 0.78rem)",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: accent2,
                        padding: "0.28em 0.85em",
                        borderRadius: "999px",
                        border: `1.5px solid color-mix(in srgb, ${accent2} 55%, transparent)`,
                        background: `color-mix(in srgb, ${accent2} 10%, transparent)`,
                      }}
                    >
                      {lastBadge}
                    </motion.span>
                  ) : null}
                </div>

                {/* Linsen */}
                <div
                  style={{
                    width: "var(--lens-size)",
                    aspectRatio: "1",
                    borderRadius: "50%",
                    color: lensColor,
                    border: `2px solid color-mix(in srgb, ${lensColor} ${lit ? 62 : 30}%, transparent)`,
                    background:
                      "radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--bg-surface) 55%, white) 0%, var(--bg-surface) 62%)",
                    boxShadow: lit
                      ? `0 22px 44px -20px rgba(0,0,0,0.3), 0 0 34px -14px color-mix(in srgb, ${lensColor} 65%, transparent), inset 0 1px 0 rgba(255,255,255,0.35)`
                      : "0 14px 30px -18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
                    padding: "12%",
                    transition: "border-color 0.5s ease, box-shadow 0.5s ease",
                  }}
                >
                  <LensViz kind={i} lit={lit} still={reduceMotion} />
                </div>

                {/* Nummer + namn */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.68rem, 0.9vw, 0.9rem)",
                      letterSpacing: "0.26em",
                      color: lit ? lensColor : "var(--text-muted)",
                      fontWeight: 700,
                      transition: "color 0.5s ease",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.25rem, 2vw, 1.9rem)",
                      letterSpacing: "-0.015em",
                      color: lit ? "var(--text)" : "var(--text-muted)",
                      transition: "color 0.5s ease",
                    }}
                  >
                    {lens.name}
                  </span>
                </div>

                {/* Definition */}
                <div
                  style={{
                    textAlign: "center",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.92rem, 1.15vw, 1.15rem)",
                    lineHeight: 1.4,
                    color: "var(--text-muted)",
                    maxWidth: "17em",
                    minHeight: "2.8em",
                  }}
                >
                  {lens.definition}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
