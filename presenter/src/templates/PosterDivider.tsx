"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PosterDivider ★ — aktdividern i betong (2026-09-04).
 *
 * Affischen: ett svartvitt rasterfoto fyller ytan (background= + halftone på
 * sliden, register="betong"), aktens ord i kontur skär genom övre högra
 * kanten, numret massivt i accent uppe till vänster, och titeln med
 * underrubrik på ett vridet accentblock som en klistrad remsa. Mono-meta i
 * hörnen. Valfria stegade rader nere till höger (`text :: lead|soft|land`).
 *
 * ```mdx
 * <PosterDivider number="01" title="Lära **OM** AI" word="OM"
 *   subtitle="Vad är det för system, och varför säger det så sällan emot dig?"
 *   kicker="§ 01 / 04 | Grunden | F–9" meta="Konferensen · Stadshuset"
 *   background="/bilder/mitt-deck/bet-torn-961-961-1.png" halftone="true" register="betong" />
 * ```
 */

type Weight = "lead" | "soft" | "land";
interface Line {
  text: string;
  weight: Weight;
}

interface PosterDividerProps {
  number?: string;
  /** "Lära **OM** AI" — fet = aktens ord, blir också konturordet om `word` saknas. */
  title: string;
  subtitle?: string;
  /** Mono-metablock uppe till höger, rader åtskilda med |. */
  kicker?: string;
  /** Mono-rad nere till höger. */
  meta?: string;
  /** Konturordet. Default: det feta ordet i titeln. */
  word?: string;
  /** Konturordets storlek i vw. Default 40. */
  wordSize?: string | number;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function parseLines(children: ReactNode): Line[] {
  const out: Line[] = [];
  const add = (raw: string) => {
    const p = raw.split("::").map((s) => s.trim());
    if (!p[0]) return;
    const w = (p[1] as Weight) || "lead";
    out.push({ text: p[0], weight: ["lead", "soft", "land"].includes(w) ? w : "lead" });
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

function titleWords(title: string): { word: string; accent: boolean }[] {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^\*\*(.+)\*\*$/);
      return m ? { word: m[1], accent: true } : { word: w, accent: false };
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

export function PosterDivider({ number, title, subtitle, kicker, meta, word, wordSize = 40, children }: PosterDividerProps) {
  const lines = parseLines(children);
  const step = useSlideSteps(lines.length + 1);
  const words = titleWords(title);
  const outlineWord = (word ?? words.find((w) => w.accent)?.word ?? words[words.length - 1]?.word ?? "").toUpperCase();
  const kickerLines = (kicker ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const size = typeof wordSize === "string" ? parseFloat(wordSize) || 40 : wordSize;
  const paper = "var(--slide-paper, #e7e2d6)";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      {/* Skuggning så meta och block läser över fotot */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(18,18,16,0.28) 0%, rgba(18,18,16,0) 38%, rgba(18,18,16,0.36) 100%)",
          zIndex: 1,
        }}
      />

      {/* Konturordet — skär genom övre högra kanten */}
      {outlineWord ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "-1.5vw",
            top: "-7vh",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "110%",
            fontSize: `${size}vw`,
            lineHeight: 0.85,
            letterSpacing: "-0.05em",
            textTransform: "uppercase",
            color: "transparent",
            WebkitTextStroke: "0.45vw var(--text)",
            opacity: 0.9,
            zIndex: 2,
            whiteSpace: "nowrap",
          }}
        >
          {outlineWord}
        </div>
      ) : null}

      {/* Numret — massivt, smalt, i accent */}
      {number ? (
        <div
          style={{
            position: "absolute",
            left: "2vw",
            top: "-2vh",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "62%",
            fontSize: "34vw",
            lineHeight: 0.9,
            letterSpacing: "-0.06em",
            color: "var(--accent)",
            zIndex: 3,
          }}
        >
          <EditableText path="number" value={number}>
            {number}
          </EditableText>
        </div>
      ) : null}

      {/* Metablocket */}
      {kickerLines.length ? (
        <div style={{ ...mono, position: "absolute", top: "3vh", right: "3vw", textAlign: "right", color: "var(--text)", zIndex: 5 }}>
          {kickerLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}
      {meta ? (
        <div style={{ ...mono, position: "absolute", bottom: "3vh", right: "3vw", textAlign: "right", color: "var(--text)", zIndex: 5 }}>
          <EditableText path="meta" value={meta}>
            {meta}
          </EditableText>
        </div>
      ) : null}

      {/* Det vridna blocket */}
      <div
        style={{
          position: "absolute",
          left: "8vw",
          bottom: "10vh",
          width: "48vw",
          background: "var(--accent)",
          color: paper,
          padding: "2.4vw 2.8vw",
          transform: "rotate(-5deg)",
          transformOrigin: "left bottom",
          zIndex: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "110%",
            fontSize: "5.4vw",
            lineHeight: 0.88,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            marginBottom: subtitle ? "1.4vw" : 0,
          }}
        >
          <EditableText path="title" value={title}>
            {words.map((w, i) => (
              <span key={i} style={{ fontStretch: w.accent ? "125%" : undefined }}>
                {w.word}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </EditableText>
        </div>
        {subtitle ? (
          <div style={{ ...mono, fontSize: "clamp(0.7rem, 1.25vw, 1.4rem)", letterSpacing: "0.06em", lineHeight: 1.45 }}>
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </div>
        ) : null}
      </div>

      {/* Stegade rader, nere till höger */}
      {lines.length ? (
        <div
          style={{
            position: "absolute",
            right: "3vw",
            bottom: meta ? "9vh" : "4vh",
            width: "34vw",
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: "0.5em",
            zIndex: 5,
          }}
        >
          {lines.map((l, i) => {
            const shown = i < step;
            const landed = lines[lines.length - 1].weight === "land" && step >= lines.length;
            const dim = landed && l.weight !== "land";
            return (
              <div
                key={i}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: l.weight === "soft" ? 500 : 800,
                  fontSize: l.weight === "land" ? "clamp(1.4rem, 2.4vw, 2.6rem)" : "clamp(1.05rem, 1.7vw, 1.9rem)",
                  lineHeight: 1.08,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  color: l.weight === "land" ? "var(--accent)" : "var(--text)",
                  textShadow: "0 0 1.2vw rgba(18,18,16,0.45)",
                  opacity: shown ? (dim ? 0.42 : 1) : 0,
                  transform: shown ? "none" : "translateY(14px)",
                  transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
                }}
              >
                {l.text}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Skärmärken */}
      <i aria-hidden style={{ position: "absolute", top: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: "1px solid var(--text)", borderRight: "1px solid var(--text)", zIndex: 5 }} />
      <i aria-hidden style={{ position: "absolute", bottom: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderBottom: "1px solid var(--text)", borderRight: "1px solid var(--text)", zIndex: 5 }} />
    </div>
  );
}
