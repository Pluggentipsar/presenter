"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * SlideMark — markordet: ett massivt ord som får plats i sin helhet, mätt mot
 * slidens bredd (liggande lägen) eller höjd (stående och staplade lägen).
 *
 * Joels mock 2026-09-02 avgjorde formen: massivt bläck, inte kontur; hela
 * ordet synligt, inte kapat; och där det ligger BAKOM innehåll ska det vara
 * så ljust att det läses som papperets struktur (opacity ≈ 0,05). Där ordet
 * får hela ytan för sig själv sätts opacity 1 och ordet blir bilden.
 *
 * Lägen (markAlign, Joel 2026-09-03 "välja var det är placerat"):
 *   bottom · top · center            — liggande, fyller bredden
 *   right · left                     — stående längs kanten, fyller höjden
 *   stack-right · stack-left         — en bokstav per rad längs kanten
 *
 * Renderas av withSlideBg när en slide bär `mark="…"`.
 */

import type { MarkAlign } from "@/lib/mark-align";
import { MeltFilter, MELT_FILTER_ID } from "./MeltFilter";

interface SlideMarkProps {
  text: string;
  align?: MarkAlign;
  /** 0–1. Default 0,05 = ljusgrå struktur bakom innehåll. 1 = ordet är bilden. */
  opacity?: number;
  tone?: "ink" | "accent";
  /** Ordet är bilden: lägre höjdtak (0,46 × slidhöjd) så det ryms under innehållet. */
  hero?: boolean;
  /**
   * Skrift: syr (syrisk, assyriska) · ar (arabiska) · fa (persiska) ·
   * ckb (sorani). Byter font till Noto, stänger av versaler och
   * spärrning, och ger mer radhöjd så ligaturer och diakriter inte kapas.
   * Latinska språk (kurmanji, spanska …) behöver inget.
   */
  lang?: string;
  /** Konturord: genomskinlig fyllning, bläckkontur (markStyle="outline"). */
  outline?: boolean;
  /** Storleksfaktor: >1 låter ordet växa utanför ytan och beskäras (markScale). */
  scale?: number;
  /** Smältordet: ordet rinner genom MeltFilter (markStyle="melt", betong). */
  melt?: boolean;
  /** Registerförskjutning: cyan/rött spöke åt var sitt håll (markStyle="skift",
      betong_natt). Ren CSS — se .slide-mark-word[data-mark-style="skift"]. */
  skift?: boolean;
}

/** Fontfamilj och typografi per skrift. Tomt = temats displayfont. */
function scriptStyle(lang?: string): React.CSSProperties {
  switch ((lang ?? "").toLowerCase()) {
    case "syr":
    case "syc":
      return { fontFamily: "var(--font-noto-syriac), serif", textTransform: "none", letterSpacing: 0, lineHeight: 1.1, fontWeight: 900 };
    case "ar":
    case "fa":
    case "ckb":
    case "ur":
      return { fontFamily: "var(--font-noto-naskh), serif", textTransform: "none", letterSpacing: 0, lineHeight: 1.15, fontWeight: 700 };
    default:
      return {};
  }
}

const LINE = 0.82;
// Staplade bokstäver behöver luft för Å/Ä/Ö-prickarna.
const STACK_LINE = 0.92;

export function SlideMark({ text, align = "bottom", opacity = 0.05, tone = "ink", hero = false, lang, outline = false, scale = 1, melt = false, skift = false }: SlideMarkProps) {
  const script = scriptStyle(lang);
  const scriptLine = typeof script.lineHeight === "number" ? script.lineHeight : LINE;
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(0);

  const standing = align === "right" || align === "left";
  const stacked = align === "stack-right" || align === "stack-left";
  const letters = stacked ? Array.from(text.replace(/\s+/g, "")) : [];

  useLayoutEffect(() => {
    const box = boxRef.current;
    const m = measureRef.current;
    if (!box || !m) return;
    const compute = () => {
      const slide = box.parentElement?.getBoundingClientRect();
      const W = slide?.width ?? 0;
      const H = slide?.height ?? 0;
      const mw = m.getBoundingClientRect().width; // ordets (eller bredaste bokstavens) bredd i 100 px
      if (W <= 0 || H <= 0 || mw <= 0) return;
      const availW = W * 0.96;
      const availH = H * 0.96;
      let px: number;
      if (stacked) {
        // Staplat: n bokstäver på höjden, bredaste bokstaven får inte överstiga en tredjedel av bredden.
        const byHeight = availH / (Math.max(letters.length, 1) * STACK_LINE);
        // mw är hela ordets bredd; bredaste bokstaven uppskattas som 1,3 × snittet.
        const widest = (mw / Math.max(letters.length, 1)) * 1.3;
        const byWidth = ((W * 0.33) / widest) * 100;
        px = Math.min(byHeight, byWidth);
      } else if (standing) {
        // Stående: ordets längd mäts mot höjden, grovleken får ta högst 40 % av bredden.
        const fit = (availH / mw) * 100;
        const cap = W * 0.4;
        px = Math.min(fit, cap);
      } else {
        const fit = (availW / mw) * 100;
        const cap = H * (hero ? 0.46 : 0.62);
        px = Math.min(fit, cap);
      }
      setSize(px * scale);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    ro.observe(m);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(compute).catch(() => undefined);
    }
    return () => ro.disconnect();
  }, [text, hero, standing, stacked, letters.length, lang, scale]);

  const inkColor = tone === "accent" ? "var(--accent)" : "var(--text)";
  const color = outline && !melt ? "transparent" : inkColor;
  const strokeStyle: React.CSSProperties = outline && !melt ? { WebkitTextStroke: `0.035em ${inkColor}` } : {};
  const meltStyle: React.CSSProperties = melt ? { filter: `url(#${MELT_FILTER_ID})` } : {};

  // Placering av behållaren
  const pos: React.CSSProperties = (() => {
    switch (align) {
      case "top":
        return { left: "2vw", right: "2vw", top: "2vh", justifyContent: "flex-start" };
      case "center":
        return { left: "2vw", right: "2vw", top: "50%", transform: "translateY(-50%)", justifyContent: "flex-start" };
      case "right":
      case "stack-right":
        return { right: "2vw", top: "2vh", bottom: "2vh", alignItems: "center", justifyContent: "center" };
      case "left":
      case "stack-left":
        return { left: "2vw", top: "2vh", bottom: "2vh", alignItems: "center", justifyContent: "center" };
      default:
        return { left: "2vw", right: "2vw", bottom: "2vh", justifyContent: "flex-start" };
    }
  })();

  // Mätspannet mäter alltid hela ordet liggande i 100 px.
  const measureText = text;

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="slide-mark"
      data-mark-align={align}
      style={{
        position: "absolute",
        display: "flex",
        pointerEvents: "none",
        // Negativt z: ordet ligger under allt som ritas i normalfas, också
        // under en FloatingImage med layer="back" (z -1, senare i DOM).
        // Skalet har isolation: isolate så att negativa lager ändå hamnar
        // ovanpå skalets egen bakgrund.
        zIndex: -1,
        ...pos,
      }}
    >
      {melt ? <MeltFilter /> : null}
      <span
        ref={measureRef}
        className="slide-mark-word"
        style={{ position: "absolute", visibility: "hidden", fontSize: "100px", whiteSpace: "nowrap", ...script, lineHeight: undefined }}
      >
        {stacked ? letters.join("") : measureText}
      </span>
      {stacked ? (
        <span
          className="slide-mark-word"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: size ? `${size}px` : "1px",
            color,
            opacity,
            ...strokeStyle,
            ...script,
            lineHeight: Math.max(STACK_LINE, scriptLine),
          }}
        >
          {letters.map((l, i) => (
            <span key={i} style={{ display: "block" }}>
              {l}
            </span>
          ))}
        </span>
      ) : (
        <span
          className="slide-mark-word"
          data-mark-style={skift ? "skift" : undefined}
          data-word={skift ? text : undefined}
          style={{
            fontSize: size ? `${size}px` : "1px",
            color,
            opacity,
            ...strokeStyle,
            ...meltStyle,
            whiteSpace: "nowrap",
            ...script,
            lineHeight: scriptLine,
            ...(standing
              ? {
                  writingMode: align === "right" ? "vertical-rl" : ("sideways-lr" as React.CSSProperties["writingMode"]),
                  textOrientation: "mixed",
                }
              : {}),
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}
