"use client";

import { Children, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TornStack ★ — rivet papper över fotot (betong, 2026-09-04).
 *
 * Stadietrappan: en pappersbit med riven högerkant (clip-path, ingen bild)
 * täcker vänstra halvan av ett svartvitt foto (background= + halftone på
 * sliden). I pappret staplas raderna i smal, massiv Archivo med en mono-
 * etikett bredvid varje; `:: now` gör raden röd (stadiet vi står på).
 * Pappret rivs in från vänster vid uppslag, raderna tänds klick för klick.
 *
 * ```mdx
 * <TornStack chapter="§ Vem håller i AI:n?" caption="Handen flyttas, stadium för stadium."
 *   meta="Inte ett påstående om | kommunens riktlinjer"
 *   background="/bilder/mitt-deck/bet-trappa-962-962-1.png" halftone="true" register="betong">
 * - F–3 · Läraren styr
 * - 4–6 · Gemensamt och lärarlett
 * - 7–9 · Elevanvändning inom ram :: now
 * </TornStack>
 * ```
 */

interface Row {
  big: string;
  label: string;
  now: boolean;
}

interface TornStackProps {
  chapter?: string;
  caption?: string;
  /** Mono-rad nere till höger på fotot (| = radbrytning). */
  meta?: string;
  /** Pappersbitens bredd. Default 50vw. */
  width?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const INK = "var(--slide-ink, #121210)";
const PAPER = "var(--slide-paper, #e7e2d6)";
const RED = "var(--slide-red, #e3321b)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function parseRows(children: ReactNode): Row[] {
  const out: Row[] = [];
  const add = (raw: string) => {
    const [main, flag] = raw.split("::").map((s) => s.trim());
    if (!main) return;
    const sep = main.indexOf("·");
    out.push({
      big: (sep >= 0 ? main.slice(0, sep) : main).trim(),
      label: sep >= 0 ? main.slice(sep + 1).trim() : "",
      now: flag === "now",
    });
  };
  const walk = (node: ReactNode) => {
    const n = unwrapLazy(node);
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    if (el.type === "li") return add(extractText(el.props.children));
    Children.forEach(el.props.children, walk);
  };
  walk(children);
  return out;
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.62rem, 1.05vw, 1.15rem)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.4,
};

export function TornStack({ chapter, caption, meta, width = "50vw", children }: TornStackProps) {
  const rows = parseRows(children);
  const step = useSlideSteps(Math.max(rows.length, 1));
  const [torn, setTorn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setTorn(true), 60);
    return () => window.clearTimeout(t);
  }, []);
  const metaLines = (meta ?? "").split("|").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      {/* Pappersbiten */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width,
          background: PAPER,
          clipPath: "polygon(0 0, 86% 0, 92% 9%, 84% 18%, 93% 31%, 86% 44%, 96% 56%, 88% 70%, 94% 84%, 86% 100%, 0 100%)",
          transform: torn ? "translateX(0)" : "translateX(-104%)",
          transition: `transform 0.9s ${EASE}`,
          zIndex: 2,
        }}
      />

      {chapter ? (
        <div style={{ ...mono, position: "absolute", left: "5vw", top: "4vh", color: INK, zIndex: 3 }}>
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Staplarna */}
      <div style={{ position: "absolute", left: "5vw", top: "11vh", zIndex: 3, display: "flex", flexDirection: "column", gap: "0.4vw" }}>
        {rows.map((r, i) => {
          const shown = i <= step;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "1.6vw",
                opacity: shown ? 1 : 0,
                transform: shown ? "none" : "translateX(-16px)",
                transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontStretch: "62%",
                  fontSize: "12vw",
                  lineHeight: 0.8,
                  letterSpacing: "-0.04em",
                  color: r.now ? RED : INK,
                  whiteSpace: "nowrap",
                }}
              >
                {r.big}
              </span>
              <span style={{ ...mono, color: INK, maxWidth: "16ch" }}>{r.label}</span>
            </div>
          );
        })}
      </div>

      {caption ? (
        <div
          style={{
            position: "absolute",
            left: "5vw",
            bottom: "4vh",
            width: "36vw",
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.9rem, 1.55vw, 1.75rem)",
            lineHeight: 1.3,
            fontWeight: 600,
            color: INK,
            zIndex: 3,
          }}
        >
          <EditableText path="caption" value={caption}>
            {caption}
          </EditableText>
        </div>
      ) : null}

      {metaLines.length ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            right: "3vw",
            bottom: "3vh",
            textAlign: "right",
            color: PAPER,
            background: INK,
            padding: "0.5vw 0.8vw",
            zIndex: 3,
          }}
        >
          {metaLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}

      <i aria-hidden style={{ position: "absolute", top: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: `1px solid ${PAPER}`, borderRight: `1px solid ${PAPER}`, zIndex: 3 }} />
    </div>
  );
}
