"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FloatingPills — overlay med små pill-formade stat-chips.
 *
 * Tänkt för att lägga supporting-statistik på en slide där huvud-siffran
 * redan är annan (typ Manifesto-headline). Pills revealas med stagger
 * vid mount.
 *
 * MDX-format:
 * ```mdx
 * <FloatingPills
 *   x="6%"
 *   y="68%"
 *   width="56%"
 *   accent="#ff6b9d"
 * >
 * - Replika · 40M+ registrerade
 * - Candy.ai · 50M+ registrerade
 * - 19% av amerikanska vuxna · Match/Kinsey 2025
 * - 31% unga män / 23% unga kvinnor · IFS 2025
 * </FloatingPills>
 * ```
 *
 * Format per pill: `Huvudtext · Källa` (separator " · "). Källan visas
 * mindre och dimmade under huvudtexten. Om ingen separator finns blir
 * hela texten huvudtexten.
 */

interface FloatingPillsProps {
  /** Horisontell position. */
  x?: string;
  /** Vertikal position. */
  y?: string;
  /** Bredd — pillsen wrappar inom denna. */
  width?: string;
  /** Rotation. */
  rotation?: number;
  /** Opacitet. */
  opacity?: number;
  /** Z-index. */
  zIndex?: number;
  /** Accentfärg på pill-kanter och accent-text. */
  accent?: string;
  /** Layout — "wrap" (flex-wrap, fritt placerade) eller "stack" (vertikal kolumn). Default "wrap". */
  layout?: "wrap" | "stack";
  /** Initial fördröjning innan första pillet (ms). Default 600. */
  initialDelay?: number | string;
  /** ms mellan pills. Default 180. */
  stagger?: number | string;
  /** MDX-lista med pills. Format: "Text · Källa". */
  children?: ReactNode;
}

interface Pill {
  text: string;
  source: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parsePills(children: ReactNode): Pill[] {
  const out: Pill[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!raw) return;
      // Splitta på SISTA " · " så texten kan innehålla bullets fritt
      const lastSep = raw.lastIndexOf(" · ");
      if (lastSep === -1) {
        out.push({ text: raw, source: "" });
        return;
      }
      out.push({
        text: raw.slice(0, lastSep).trim(),
        source: raw.slice(lastSep + 3).trim(),
      });
    });
  });
  return out;
}

export function FloatingPills({
  x = "6%",
  y = "70%",
  width = "50%",
  rotation = 0,
  opacity = 1,
  zIndex = 9,
  accent = "var(--accent)",
  layout = "wrap",
  initialDelay = 600,
  stagger = 180,
  children,
}: FloatingPillsProps) {
  const pills = parsePills(children);
  const initialDelayNum =
    typeof initialDelay === "string"
      ? parseInt(initialDelay, 10)
      : initialDelay;
  const staggerNum =
    typeof stagger === "string" ? parseInt(stagger, 10) : stagger;

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    transform: `rotate(${rotation}deg)`,
    opacity,
    zIndex,
    pointerEvents: "none",
    display: "flex",
    flexDirection: layout === "stack" ? "column" : "row",
    flexWrap: layout === "wrap" ? "wrap" : "nowrap",
    gap: "clamp(0.45rem, 0.7vw, 0.7rem)",
  };

  return (
    <div style={wrapperStyle}>
      {pills.map((pill, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.55,
            delay: (initialDelayNum + i * staggerNum) / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.15rem",
            padding: "0.55rem 1rem",
            borderRadius: "999px",
            background: `linear-gradient(135deg, ${withAlpha(accent, 0.15)}, ${withAlpha(accent, 0.08)})`,
            border: `1px solid ${withAlpha(accent, 0.53)}`,
            boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 24px ${withAlpha(accent, 0.13)}`,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.005em",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
            }}
          >
            {pill.text}
          </span>
          {pill.source ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.7vw, 0.7rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: `${withAlpha(accent, 0.8)}`,
                lineHeight: 1.2,
              }}
            >
              {pill.source}
            </span>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
