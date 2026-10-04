"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * WordAudit ★ — ordlistan (betong_natt, 2026-09-04).
 *
 * Ett ord i taget: vad ordet antyder, och vad som faktiskt händer. Byggd för
 * "Vem skrev din kurs?" akt 3 — AI-läraren är den enda i skolan som har
 * mandatet att lära ut precision i de här orden, och sliden är den övningen
 * gjord live.
 *
 * Raderna skrivs som en punktlista i tre delar separerade med ` · `:
 *
 *   ordet · vad det antyder · vad som händer
 *
 * ```mdx
 * <WordAudit kicker="§ 03 · Orden" title="Fem ord ni äger">
 * - hallucinerar · ett undantag, ett fel · samma process som när det blir rätt
 * - lär sig · den lär av mig · vikterna är frysta, ditt samtal ändrar dem inte
 * </WordAudit>
 * ```
 */

interface Row {
  word: string;
  implies: string;
  actual: string;
}

interface WordAuditProps {
  kicker?: string;
  title?: string;
  /** Mono-rad uppe till höger. */
  meta?: string;
  /** Kolumnrubrik ett. Default "Vad ordet antyder". */
  impliesLabel?: string;
  /** Kolumnrubrik två. Default "Vad som händer". */
  actualLabel?: string;
  /** Rad som ligger kvar längst ned. */
  footer?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.56rem, 0.92vw, 0.98rem)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseRows(children: ReactNode): Row[] {
  const out: Row[] = [];
  const add = (raw: string) => {
    const parts = raw.split(" · ").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    out.push({ word: parts[0], implies: parts[1] ?? "", actual: parts.slice(2).join(" · ") });
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

export function WordAudit({
  kicker,
  title,
  meta,
  impliesLabel = "Vad ordet antyder",
  actualLabel = "Vad som händer",
  footer,
  children,
}: WordAuditProps) {
  const rows = parseRows(children);
  const step = useSlideSteps(rows.length + 1);
  // Raderna krymper när listan växer, så femrader ryms utan att texten dör.
  const bodySize = rows.length > 5 ? "clamp(0.72rem, 1.02vw, 1.1rem)" : "clamp(0.8rem, 1.2vw, 1.3rem)";
  const wordSize = rows.length > 5 ? "clamp(1rem, 1.85vw, 2rem)" : "clamp(1.15rem, 2.2vw, 2.4rem)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {kicker ? (
        <div style={{ ...mono, position: "absolute", top: "4.5vh", left: "5vw", zIndex: 6, color: "var(--accent)" }}>
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}
      {meta ? (
        <div style={{ ...mono, position: "absolute", top: "4.5vh", right: "5vw", zIndex: 6, opacity: 0.62, textAlign: "right" }}>
          {meta}
        </div>
      ) : null}

      <div style={{ position: "absolute", left: "5vw", right: "5vw", top: "12vh", bottom: "9vh", zIndex: 5, display: "flex", flexDirection: "column" }}>
        {title ? (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontStretch: "115%",
              fontSize: "clamp(1.6rem, 3.6vw, 4rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              margin: 0,
              marginBottom: "2.6vh",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        {/* Kolumnrubrikerna */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "22% 34% 44%",
            gap: "1.6vw",
            paddingBottom: "1.1vh",
            borderBottom: "2px solid var(--accent)",
          }}
        >
          <span style={{ ...mono, color: "var(--accent)" }}>Ordet</span>
          <span style={{ ...mono, opacity: 0.6 }}>{impliesLabel}</span>
          <span style={{ ...mono, color: "var(--accent-alert)" }}>{actualLabel}</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
          {rows.map((r, i) => {
            const shown = i < step;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22% 34% 44%",
                  gap: "1.6vw",
                  alignItems: "baseline",
                  padding: "1.5vh 0",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--accent-dim)" : "none",
                  opacity: shown ? 1 : 0,
                  transform: shown ? "none" : "translateY(12px)",
                  transition: `opacity 0.45s ${EASE}, transform 0.45s ${EASE}`,
                }}
              >
                <span
                  className="poster-word-skift"
                  data-word={r.word}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    fontStretch: "112%",
                    fontSize: wordSize,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    textTransform: "uppercase",
                  }}
                >
                  {r.word}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: bodySize, lineHeight: 1.36, opacity: 0.66 }}>
                  {r.implies}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: bodySize,
                    lineHeight: 1.36,
                    fontWeight: 500,
                  }}
                >
                  {r.actual}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {footer ? (
        <div style={{ ...mono, position: "absolute", left: "5vw", bottom: "4vh", opacity: 0.55, zIndex: 6, letterSpacing: "0.14em", textTransform: "none" }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
