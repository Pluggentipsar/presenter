"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PosterCompare ★ — två kolumner, jättesiffror (betong, 2026-09-04).
 *
 * Bastani-tabellen som affisch: två kolumner med mono-rubrik, siffrorna i
 * samma grad som BleedStat, en linjal mellan, och ramen (★-raden) som en
 * vriden accentremsa längst ned. Raderna tänds klick för klick.
 *
 * Rader (children):
 *   - Med stödet · +48 % · +127 %
 *   - Utan stödet · −17 % | mot kontrollgruppen · ±0 | ingen negativ effekt
 *   - ★ Ramen · kampen med uppgiften togs bort — kampen VAR matematiken · att fastna helt togs bort — tänkandet behölls
 * `|` i en cell skiljer den stora siffran från en mono-underrad. ★-raden
 * blir remsan: vänster och höger text i varsin halva.
 *
 * ```mdx
 * <PosterCompare kicker="Bastani m.fl. · PNAS 2025" title="Sedan togs AI **bort**."
 *   subtitle="Samma elever, självständigt prov utan stöd."
 *   leftHeader="GPT Base" leftSubLabel="generell chatt"
 *   rightHeader="GPT Tutor" rightSubLabel="lärardesignade ledtrådar"
 *   source="Preregistrerad RCT · gymnasiematematik · Turkiet" register="tavla">
 * - …
 * </PosterCompare>
 * ```
 */

interface Cell {
  big: string;
  sub?: string;
}
interface Row {
  label: string;
  left: Cell;
  right: Cell;
  frame: boolean;
}

interface PosterCompareProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  leftHeader?: string;
  leftSubLabel?: string;
  rightHeader?: string;
  rightSubLabel?: string;
  source?: string;
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
    const inner = extractText(el.props.children);
    return el.type === "strong" ? `**${inner}**` : inner;
  }
  return "";
}

function cell(raw: string): Cell {
  const [big, sub] = raw.split("|").map((s) => s.trim());
  return { big, sub: sub || undefined };
}

function parseRows(children: ReactNode): Row[] {
  const out: Row[] = [];
  const add = (raw: string) => {
    const parts = raw.split("·").map((s) => s.trim());
    if (parts.length < 3) return;
    const frame = parts[0].startsWith("★");
    out.push({ label: parts[0].replace(/^★\s*/, ""), left: cell(parts[1]), right: cell(parts.slice(2).join(" · ")), frame });
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

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.62rem, 1.05vw, 1.15rem)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

export function PosterCompare({ kicker, title, subtitle, leftHeader, leftSubLabel, rightHeader, rightSubLabel, source, children }: PosterCompareProps) {
  const rows = parseRows(children);
  const step = useSlideSteps(rows.length + 1);
  const data = rows.filter((r) => !r.frame);
  const frame = rows.find((r) => r.frame);
  const paper = "var(--slide-paper, #e7e2d6)";

  const column = (side: "left" | "right", header?: string, sub?: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", padding: side === "right" ? "0 0 0 3vw" : "0 3vw 0 0" }}>
      <div style={{ ...mono, borderBottom: "1px solid var(--text)", paddingBottom: "0.8vh", display: "flex", justifyContent: "space-between", gap: "1vw" }}>
        <span>{header}</span>
        <span style={{ opacity: 0.65 }}>{sub}</span>
      </div>
      {data.map((r, i) => {
        const shown = i < step;
        const c = r[side];
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "baseline",
              gap: "1vw",
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(12px)",
              transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontStretch: "118%",
                  fontSize: "clamp(3rem, 7.8vw, 9.6rem)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.05em",
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  color: side === "right" ? "var(--accent)" : "var(--text)",
                }}
              >
                {c.big}
              </div>
              {c.sub ? <div style={{ ...mono, marginTop: "0.6vh", opacity: 0.75 }}>{c.sub}</div> : null}
            </div>
            <div style={{ ...mono, textAlign: "right", opacity: 0.75, writingMode: "vertical-rl", transform: "rotate(180deg)", alignSelf: "center" }}>{r.label}</div>
          </div>
        );
      })}
    </div>
  );

  const frameShown = step >= rows.length;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}>
      <div style={{ position: "absolute", left: "5vw", right: "5vw", top: "5vh" }}>
        {kicker ? (
          <div style={{ ...mono, color: "var(--accent)", marginBottom: "1.2vh" }}>
            <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
          </div>
        ) : null}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "110%",
            fontSize: "clamp(2rem, 5.2vw, 6rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
          }}
        >
          <EditableText path="title" value={title}>{bold(title)}</EditableText>
        </div>
        {subtitle ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem, 1.5vw, 1.7rem)", marginTop: "1vh", opacity: 0.85 }}>
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          left: "5vw",
          right: "5vw",
          top: "27vh",
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          alignItems: "start",
        }}
      >
        {column("left", leftHeader, leftSubLabel)}
        <div style={{ background: "var(--text)", alignSelf: "stretch", opacity: 0.6, minHeight: "38vh" }} />
        {column("right", rightHeader, rightSubLabel)}
      </div>

      {frame ? (
        <div
          style={{
            position: "absolute",
            left: "4vw",
            right: "4vw",
            bottom: "8vh",
            background: "var(--accent)",
            color: paper,
            padding: "1.6vw 2.4vw",
            transform: "rotate(-1.5deg)",
            transformOrigin: "left bottom",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3vw",
            zIndex: 3,
            opacity: frameShown ? 1 : 0,
            transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}`,
          }}
        >
          <div style={{ ...mono, gridColumn: "1 / -1", opacity: 0.85 }}>★ {frame.label}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStretch: "96%", fontSize: "clamp(0.95rem, 1.7vw, 1.9rem)", lineHeight: 1.1, textTransform: "uppercase" }}>{frame.left.big}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontStretch: "96%", fontSize: "clamp(0.95rem, 1.7vw, 1.9rem)", lineHeight: 1.1, textTransform: "uppercase" }}>{frame.right.big}</div>
        </div>
      ) : null}

      {source ? (
        <div style={{ ...mono, position: "absolute", left: "5vw", bottom: "2.6vh", opacity: 0.6, fontSize: "clamp(0.55rem, 0.85vw, 0.95rem)" }}>
          <EditableText path="source" value={source}>{source}</EditableText>
        </div>
      ) : null}
    </div>
  );
}
