"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EditorialColumns ★ — tidningsuppslaget (betong, 2026-09-04).
 *
 * Kartan OM · MED · MOT · GENOM som fyra numrerade spalter med tunna
 * linjaler: ett stort ord, en rad förklaring, valfritt ett svartvitt foto i
 * spalten. Spalterna tänds klick för klick. Ett **fett** ord i raden får
 * accentfärgen (MOT = där blottläggningarna bor).
 *
 * ```mdx
 * <EditorialColumns chapter="§ Kartan · fyra sätt att lära"
 *   lead="OM är grunden. MED, MOT och GENOM är tre designrörelser."
 *   foot="Med · om · mot · genom" footRight="Ofta i samma lektion" register="tavla">
 * - OM · Förstå systemet, och varför det sällan säger emot dig. :: /bilder/mitt-deck/bet-tak-963-963-1.png
 * - MED · Vilket motstånd är lärandet?
 * - **MOT** · System som ingen designat.
 * - GENOM · Ta bort friktionen. Behåll motståndet.
 * </EditorialColumns>
 * ```
 */

interface Column {
  word: string;
  accent: boolean;
  text: string;
  /** Tredje ·-delen: det som försvinner (accentruta med lossLabel). */
  loss?: string;
  /** Inledande [hakparentes]: mono-rad efter numret, t.ex. elevröstens plats. */
  kicker?: string;
  photo?: string;
}

interface EditorialColumnsProps {
  chapter?: string;
  lead?: string;
  /** Stor rubrik under bandet (**fet** = accent). Spalterna börjar lägre. */
  title?: string;
  /** Etikett i accentrutan när raderna har en tredje ·-del. Default "Det som försvinner". */
  lossLabel?: string;
  foot?: string;
  footRight?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    // <strong> från MDX ska bli **…** igen så accentmarkeringen överlever
    const inner = extractText(el.props.children);
    return el.type === "strong" ? `**${inner}**` : inner;
  }
  return "";
}

function parseColumns(children: ReactNode): Column[] {
  const out: Column[] = [];
  const add = (raw: string) => {
    const [main0, photo] = raw.split("::").map((s) => s.trim());
    if (!main0) return;
    let main = main0;
    let kicker: string | undefined;
    const k = main.match(/^\[([^\]]+)\]\s*/);
    if (k) { kicker = k[1].trim(); main = main.slice(k[0].length); }
    const parts = main.split("·").map((s) => s.trim());
    const head = parts[0] ?? "";
    const text = parts[1] ?? "";
    const loss = parts.length > 2 ? parts.slice(2).join(" · ") : undefined;
    const m = head.match(/^\*\*(.+)\*\*$/);
    out.push({ word: (m ? m[1] : head).toUpperCase(), accent: !!m, text, loss, kicker, photo: photo || undefined });
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
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

function bold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    return m ? (
      <em key={i} style={{ fontStyle: "normal", color: "var(--accent)", fontStretch: "112%" }}>
        {m[1]}
      </em>
    ) : (
      <span key={i}>{p}</span>
    );
  });
}

export function EditorialColumns({ chapter, lead, title, lossLabel = "Det som försvinner", foot, footRight, children }: EditorialColumnsProps) {
  const cols = parseColumns(children);
  const step = useSlideSteps(Math.max(cols.length, 1));
  // Ordstorlek: inget ord får beskäras. Spaltbredden viktas efter ordet
  // (nedan), och graden sänks tills det längsta ordet ryms i sin spalt.
  const weights = cols.map((c) => Math.max(c.word.length, 2) + 1.6);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const wordVw = cols.length
    ? Math.min(10.2, ...cols.map((c, i) => ((92 * weights[i]) / total - 3.2) / (Math.max(c.word.length, 1) * 0.5)))
    : 10.2;
  const colsTop = title ? "30vh" : "16vh";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}>
      {/* Bandet */}
      <div
        style={{
          ...mono,
          position: "absolute",
          left: "4vw",
          right: "4vw",
          top: "6vh",
          display: "flex",
          justifyContent: "space-between",
          gap: "2vw",
          borderBottom: "1px solid var(--text)",
          paddingBottom: "1.2vh",
        }}
      >
        <span>{chapter ? <EditableText path="chapter" value={chapter}>{chapter}</EditableText> : null}</span>
        <span style={{ textAlign: "right" }}>{lead ? <EditableText path="lead" value={lead}>{lead}</EditableText> : null}</span>
      </div>

      {title ? (
        <div
          style={{
            position: "absolute",
            left: "4vw",
            right: "4vw",
            top: "13vh",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "110%",
            fontSize: "clamp(1.6rem, 4.2vw, 4.8rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
          }}
        >
          <EditableText path="title" value={title}>{bold(title)}</EditableText>
        </div>
      ) : null}

      {/* Spalterna */}
      <div
        style={{
          position: "absolute",
          left: "4vw",
          right: "4vw",
          top: colsTop,
          bottom: "12vh",
          display: "grid",
          // Spaltbredd efter ordet: OM smal, GENOM bred — så att inget ord
          // beskärs. Kartan är stället där de fyra orden ska läsas som en
          // uppsättning (Joel 2026-09-04), inte ett affischgrepp.
          gridTemplateColumns: cols.length ? cols.map((c) => `${Math.max(c.word.length, 2) + 1.6}fr`).join(" ") : "1fr",
        }}
      >
        {cols.map((c, i) => {
          const shown = i <= step;
          return (
            <div
              key={i}
              style={{
                borderRight: i < cols.length - 1 ? "1px solid var(--text)" : "none",
                padding: "1.4vw 1.6vw 1.4vw 1.4vw",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                opacity: shown ? 1 : 0.14,
                transform: shown ? "none" : "translateY(10px)",
                transition: `opacity 0.55s ${EASE}, transform 0.55s ${EASE}`,
              }}
            >
              <span style={{ ...mono, opacity: 0.75 }}>
                {String(i + 1).padStart(2, "0")}
                {c.kicker ? <span style={{ color: "var(--accent)", marginLeft: "1.2em" }}>{c.kicker}</span> : null}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontStretch: "72%",
                  fontSize: `${wordVw}vw`,
                  lineHeight: 0.86,
                  letterSpacing: "-0.03em",
                  margin: "0.8vw 0 1.2vw -0.03em",
                  color: c.accent ? "var(--accent)" : "var(--text)",
                  whiteSpace: "nowrap",
                }}
              >
                {c.word}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.9rem, 1.5vw, 1.7rem)",
                  lineHeight: 1.3,
                  fontWeight: 500,
                  opacity: 0.92,
                  maxWidth: "20ch",
                  textWrap: "pretty",
                }}
              >
                {c.text}
              </span>
              {c.loss ? (
                <div
                  style={{
                    marginTop: c.photo ? "1.2vw" : "auto",
                    background: "var(--accent)",
                    color: "var(--slide-paper, #e7e2d6)",
                    padding: "1vw 1.2vw 1.1vw",
                    transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)`,
                  }}
                >
                  <div style={{ ...mono, fontSize: "clamp(0.55rem, 0.85vw, 0.95rem)", opacity: 0.85, marginBottom: "0.4vw" }}>{lossLabel}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStretch: "96%", fontSize: "clamp(0.9rem, 1.7vw, 1.9rem)", lineHeight: 1.1, textTransform: "uppercase" }}>{c.loss}</div>
                </div>
              ) : null}
              {c.photo ? (
                <div style={{ marginTop: c.loss ? "1.2vw" : "auto", height: "20vh", position: "relative", overflow: "hidden", border: "1px solid var(--text)" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: "-3%",
                      backgroundImage: `url(${c.photo})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "grayscale(1) contrast(1.35) brightness(0.9)",
                    }}
                  />
                  <div className="slide-halftone" style={{ position: "absolute", inset: 0 }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Foten */}
      <div
        style={{
          ...mono,
          position: "absolute",
          left: "4vw",
          right: "4vw",
          bottom: "4vh",
          borderTop: "1px solid var(--text)",
          paddingTop: "1vh",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{foot ? <EditableText path="foot" value={foot}>{foot}</EditableText> : null}</span>
        <span>{footRight ? <EditableText path="footRight" value={footRight}>{footRight}</EditableText> : null}</span>
      </div>
    </div>
  );
}
