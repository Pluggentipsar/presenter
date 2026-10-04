"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * BleedStat ★ — siffran som skärs av kanten (betong, 2026-09-04).
 *
 * Blottläggningen: hela ytan i registrets färg (register="rott"), siffran så
 * stor att underkanten tar den, förklaringen i en spalt uppe till höger,
 * källan i mono under. Siffran räknas upp vid uppslag; texten kommer på
 * klick. `word` är konturordet uppe till vänster (MOT). Figuren (hand,
 * spegel …) läggs på sliden med figure= och multipliceras in i det röda av
 * temat.
 *
 * ```mdx
 * <BleedStat value="49" unit="%" word="MOT" chapter="§ Sykofanti · blottläggning"
 *   text="oftare bekräftade elva AI-modeller användarens handlande, jämfört med människor i samma material."
 *   source="Science 2026 · Cheng m.fl." register="rott"
 *   figure="/bilder/mitt-deck/bet-hand-966-966-1-cut.png" figureAlign="br" figureSize="74vh" figureX="78" figureY="56" />
 * ```
 */

interface BleedStatProps {
  value: string;
  unit?: string;
  text?: string;
  source?: string;
  word?: string;
  chapter?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function bold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    return m ? (
      <em key={i} style={{ fontStyle: "normal", color: "var(--text)", fontStretch: "112%" }}>
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
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

export function BleedStat({ value, unit, text, source, word, chapter }: BleedStatProps) {
  const step = useSlideSteps(text ? 2 : 1);
  const target = parseFloat(String(value).replace(",", "."));
  const numeric = Number.isFinite(target);
  const decimals = numeric && String(value).includes(",") ? String(value).split(",")[1].length : 0;
  const [shown, setShown] = useState(numeric ? 0 : target);

  useEffect(() => {
    if (!numeric) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(target * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, target]);

  const display = numeric ? shown.toFixed(decimals).replace(".", ",") : value;
  const textShown = step >= 1;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}>
      {word ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "3vw",
            top: "4vh",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "62%",
            fontSize: "9vw",
            lineHeight: 0.85,
            textTransform: "uppercase",
            color: "transparent",
            WebkitTextStroke: "0.22vw var(--text)",
            zIndex: 3,
          }}
        >
          {word}
        </div>
      ) : null}

      {/* Siffran */}
      <div
        style={{
          position: "absolute",
          left: "-1.5vw",
          bottom: "-11vh",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontStretch: "125%",
          fontSize: "52vw",
          lineHeight: 0.8,
          letterSpacing: "-0.07em",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          zIndex: 1,
        }}
      >
        <EditableText path="value" value={value}>
          {display}
        </EditableText>
        {unit ? (
          <sup style={{ fontSize: "0.36em", verticalAlign: "top", position: "relative", top: "0.55em", letterSpacing: 0, marginLeft: "-0.05em" }}>
            {unit}
          </sup>
        ) : null}
      </div>

      {text ? (
        <div
          style={{
            position: "absolute",
            right: "4vw",
            top: "10vh",
            width: "36vw",
            color: "var(--accent)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontStretch: "96%",
            fontSize: "2.7vw",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            textWrap: "balance",
            zIndex: 3,
            opacity: textShown ? 1 : 0,
            transform: textShown ? "none" : "translateY(14px)",
            transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
          }}
        >
          <EditableText path="text" value={text}>
            {bold(text)}
          </EditableText>
          {source ? (
            <div style={{ ...mono, marginTop: "1.4vw", color: "var(--text)" }}>
              <EditableText path="source" value={source}>
                {source}
              </EditableText>
            </div>
          ) : null}
        </div>
      ) : null}

      {chapter ? (
        <div style={{ ...mono, position: "absolute", bottom: "3vh", left: "5.5vw", zIndex: 3 }}>
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <i aria-hidden style={{ position: "absolute", top: "1.6vw", left: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: "1px solid currentColor", borderLeft: "1px solid currentColor", zIndex: 3 }} />
      <i aria-hidden style={{ position: "absolute", top: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: "1px solid currentColor", borderRight: "1px solid currentColor", zIndex: 3 }} />
    </div>
  );
}
