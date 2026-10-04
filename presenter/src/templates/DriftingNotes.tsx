"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DriftingNotes — korta meningar som flyter in över hela sliden, en i taget,
 * och sedan sakta rör sig kvar.
 *
 * Overlay, samma mönster som FloatingText och FloatingPhone: läggs efter en
 * slide i MDX och lägger sig ovanpå den. Tänkt för röster som ska ligga *runt*
 * ett påstående i stället för under det — barnens egna meningar runt ordet de
 * valde, publikens repliker runt en fråga, klotter runt ett manifest.
 *
 * Det är avsiktligt lågmält. Meningarna ska kunna läsas om man tittar, men de
 * ska inte konkurrera med slidens huvudtext. Håll dem korta — fyra till sex
 * ord — och lägg dem där ytan är tom.
 *
 * MDX-format:
 * ```mdx
 * <DriftingNotes delay={1400} beat={1100} opacity={0.62}>
 * - är du kvar :: 11,17 :: -6
 * - du är min bästa vän :: 71,24 :: 4
 * - godnatt :: 19,76 :: -3
 * - vi ses imorgon va :: 66,69 :: 7
 * </DriftingNotes>
 * ```
 *
 * Format per rad: `text :: x,y :: rotation`.
 * `x,y` är procent av sliden och pekar på radens vänsterkant respektive
 * baslinje. Rotationen är valfri och anges i grader. Utelämnas positionen
 * fördelas raderna jämnt längs kanterna, men handplacera hellre — poängen är
 * att de ska hitta de tomma ytorna i just den slide de ligger på.
 */

interface Note {
  text: string;
  x: number;
  y: number;
  rot: number;
}

/** Reservpositioner längs kanterna när MDX:en inte anger några. */
const FALLBACK: Array<[number, number, number]> = [
  [10, 18, -5],
  [70, 22, 4],
  [16, 74, -3],
  [66, 78, 6],
  [8, 46, 2],
  [76, 50, -4],
];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parseNotes(children: ReactNode): Note[] {
  const rows: string[] = [];
  const walk = (node: ReactNode) => {
    const n = unwrapLazy(node);
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    if (el.type === "li") {
      const t = extractText(el.props.children).trim();
      if (t) rows.push(t);
      return;
    }
    walk(el.props.children);
  };
  Children.forEach(children, walk);

  return rows.map((raw, i) => {
    const parts = raw.split(/\s*::\s*/);
    const text = (parts[0] || "").trim();
    const fb = FALLBACK[i % FALLBACK.length];
    let x = fb[0];
    let y = fb[1];
    let rot = fb[2];
    if (parts[1]) {
      const [px, py] = parts[1].split(/\s*,\s*/).map((v) => parseFloat(v));
      if (!isNaN(px)) x = px;
      if (!isNaN(py)) y = py;
    }
    if (parts[2]) {
      const pr = parseFloat(parts[2]);
      if (!isNaN(pr)) rot = pr;
    }
    return { text, x, y, rot };
  });
}

interface DriftingNotesProps {
  /** Millisekunder innan första meningen kommer. Default 1200. */
  delay?: number | string;
  /** Millisekunder mellan meningarna. Default 1000. */
  beat?: number | string;
  /** Textfärg. Default temats text. */
  color?: string;
  /** Slutopacitet, 0–1. Default 0,6 — de ska ligga under huvudtexten i styrka. */
  opacity?: number | string;
  /** Textstorlek i vw. Default 1,5. */
  size?: number | string;
  /** front = ovanpå innehållet (default) · back = under det. */
  layer?: "front" | "back";
  children?: ReactNode;
}

const num = (v: number | string | undefined, fallback: number): number => {
  if (v == null) return fallback;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? fallback : n;
};

export function DriftingNotes({
  delay = 1200,
  beat = 1000,
  color = "var(--text)",
  opacity = 0.6,
  size = 1.5,
  layer = "front",
  children,
}: DriftingNotesProps) {
  const notes = parseNotes(children);
  if (!notes.length) return null;

  const d0 = num(delay, 1200) / 1000;
  const dt = num(beat, 1000) / 1000;
  const target = num(opacity, 0.6);
  const vw = num(size, 1.5);

  return (
    <div
      aria-hidden={false}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: layer === "back" ? 0 : 6,
      }}
    >
      {notes.map((n, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
          animate={{
            opacity: target,
            // Efter inflytningen fortsätter raden att röra sig, långsamt och
            // olika långt per rad, så att bilden aldrig fryser helt.
            y: [14, 0, -5 - (i % 3) * 2, 0],
            filter: "blur(0px)",
          }}
          transition={{
            opacity: { delay: d0 + i * dt, duration: 1.1, ease: [0.22, 1, 0.36, 1] },
            filter: { delay: d0 + i * dt, duration: 1.1 },
            y: {
              delay: d0 + i * dt,
              duration: 11 + (i % 4) * 2.5,
              times: [0, 0.12, 0.56, 1],
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            },
          }}
          style={{
            position: "absolute",
            left: `${n.x}%`,
            top: `${n.y}%`,
            transform: `rotate(${n.rot}deg)`,
            transformOrigin: "left center",
            maxWidth: "26%",
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            fontSize: `clamp(0.7rem, ${vw}vw, 1.45rem)`,
            lineHeight: 1.25,
            fontWeight: 500,
            letterSpacing: "0.005em",
            color,
            whiteSpace: "pre-wrap",
          }}
        >
          {n.text}
        </motion.div>
      ))}
    </div>
  );
}

export default DriftingNotes;
