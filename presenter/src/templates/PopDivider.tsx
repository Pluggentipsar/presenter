"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PopDivider ★ — aktdivider i fyrfärgen: jättetypografi som fyller nedre
 * halvan ord för ord, sektionsnumret som kontur uppe till vänster, ett
 * mono-metablock uppe till höger och valfria stegade rader.
 *
 * Född i en föreläsning (2026-09-03) ur Joels moodboard: neo-brutalism med
 * cute-alism — beskurna versaler (ALTO ROASTERS), synligt rutnät, tejp och
 * klistermärken. Färgen och rutnätet kommer från registret (withSlideBg
 * register="gul|mint|rosa|lila|tavla"), löpremsan från `ticker=`, ordet
 * bakom från `mark=` och klistermärket från `figure=` — mallen ritar bara
 * typografin.
 *
 * ```mdx
 * <PopDivider number="01" title="Lära **OM** AI" subtitle="Vad är det för system?"
 *   kicker="§ 01 / 04 | F–9 | Stadshuset" register="gul" ticker="Lära om AI">
 * - Hittills har vi pratat om AI som ni designar. :: lead
 * - Ni hörde dem i början. :: land
 * </PopDivider>
 * ```
 */

type Weight = "lead" | "soft" | "land";
interface Line {
  text: string;
  weight: Weight;
}

interface PopDividerProps {
  number?: string;
  /** Titeln, ett ord per rad. **fet** blir accent. */
  title: string;
  subtitle?: string;
  /** Mono-metablock uppe till höger, rader åtskilda med |. */
  kicker?: string;
  /** Stegade rader (`text :: lead|soft|land`), avslöjas klick för klick. */
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
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

/** "Lära **OM** AI" → [{word, accent}] */
function titleWords(title: string): { word: string; accent: boolean }[] {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^\*\*(.+)\*\*$/);
      return m ? { word: m[1], accent: true } : { word: w, accent: false };
    });
}

export function PopDivider({ number, title, subtitle, kicker, children }: PopDividerProps) {
  const lines = parseLines(children);
  const step = useSlideSteps(lines.length + 1);
  const words = titleWords(title);
  const longest = Math.max(...words.map((w) => w.word.length), 1);
  // Archivo 76 % bredd: ett versalt tecken ≈ 0,58 em. Ordet får ta ~92 vw.
  const sizeVw = Math.min(16, 92 / (longest * 0.58));
  const kickerLines = (kicker ?? "").split("|").map((s) => s.trim()).filter(Boolean);

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.66rem, 0.9vw, 1rem)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    fontWeight: 600,
    lineHeight: 1.5,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      {/* Numret som kontur */}
      {number ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.4rem, 3.6vh, 3rem)",
            left: "clamp(1.6rem, 3.4vw, 3.4rem)",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(5rem, 11vw, 14rem)",
            lineHeight: 0.8,
            letterSpacing: "-0.02em",
            color: "transparent",
            WebkitTextStroke: "0.045em var(--accent)",
            zIndex: 2,
          }}
        >
          <EditableText path="number" value={number}>
            {number}
          </EditableText>
        </div>
      ) : null}

      {/* Metablocket */}
      {kickerLines.length ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "clamp(1.6rem, 4vh, 3.2rem)",
            right: "clamp(1.6rem, 3.4vw, 3.4rem)",
            textAlign: "right",
            color: "var(--text)",
            zIndex: 2,
          }}
        >
          {kickerLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}

      {/* Underrubriken */}
      {subtitle ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(6rem, 15vh, 10rem)",
            right: "clamp(1.6rem, 3.4vw, 3.4rem)",
            maxWidth: "36vw",
            textAlign: "left",
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.95rem, 1.4vw, 1.55rem)",
            lineHeight: 1.3,
            fontWeight: 500,
            color: "#131311",
            // Pappersetikett: läser över loopens pappersformer och markordet.
            background: "#f2f0e9",
            border: "2px solid #131311",
            boxShadow: "0.45vw 0.45vw 0 #131311",
            padding: "0.7em 0.9em",
            transform: "rotate(-1.2deg)",
            zIndex: 2,
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {subtitle}
          </EditableText>
        </div>
      ) : null}

      {/* Stegade rader, höger */}
      {lines.length ? (
        <div
          style={{
            position: "absolute",
            right: "clamp(1.6rem, 3.4vw, 3.4rem)",
            top: "clamp(12rem, 32vh, 20rem)",
            width: "38vw",
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: "0.55em",
            zIndex: 2,
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
                  fontWeight: l.weight === "soft" ? 500 : 700,
                  fontSize:
                    l.weight === "land"
                      ? "clamp(1.5rem, 2.6vw, 2.8rem)"
                      : "clamp(1.15rem, 1.9vw, 2.1rem)",
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                  letterSpacing: "-0.005em",
                  color: l.weight === "land" ? "var(--accent)" : "var(--text)",
                  opacity: shown ? (dim ? 0.38 : 1) : 0,
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

      {/* Titeln — ett ord per rad, fyller nedre halvan */}
      <div
        style={{
          position: "absolute",
          left: "clamp(1.2rem, 2.6vw, 2.6rem)",
          bottom: "clamp(3.2rem, 7.5vh, 5.2rem)",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: `${sizeVw}vw`,
          lineHeight: 0.8,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          color: "var(--text)",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ display: "block", color: w.accent ? "var(--accent)" : undefined }}>
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
}
