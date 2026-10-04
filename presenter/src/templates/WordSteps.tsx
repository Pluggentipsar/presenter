"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * WordSteps — den typografiska stegaren. Orden ÄR bilden.
 *
 * Joels mock 2026-09-02 för Före · AI · Efter: faserna står som ett enda
 * massivt ord-band längst ner på sliden, satt så att bandet fyller bredden.
 * Den aktiva fasen är bläcksvart, de andra ligger kvar i ljusgrått som
 * papperets struktur. Ovanför, i linje med det aktiva ordets vänsterkant,
 * står fasens innehåll i en smal kolumn: kicker i mono, kursiv underrad och
 * några bockade punkter. Klick byter fas — ordet tänds och kolumnen glider
 * med till nästa ords kant.
 *
 * Fungerar för vilken serie som helst där stegen har korta namn:
 * FÖRE · AI · EFTER, JAG · AI · JAG, BERÄTTA · BORDET · LYFT, E · C · P · A.
 *
 * ```mdx
 * <WordSteps chapter="§ 03 · Lärarens tre faser">
 * - FÖRE · Innan momentet · Vad eleven behöver ha med sig · Begreppen: likviditet, marginal | Vad AI är — och att den håller med
 * - AI · Under momentet · Hur ni designat mötet · Rollen och reglerna i prompten | Ert utkast först
 * - EFTER · Efter momentet · Hur ni följer upp · Beslutsloggen | Tre siffror muntligt
 * </WordSteps>
 * ```
 *
 * Rad = `ORD · kicker · underrad · punkt | punkt | punkt`. Fälten är
 * frivilliga från höger: `ORD · kicker` räcker. `**fet**` i punkter → accent.
 */

interface WordStepsProps {
  chapter?: string;
  /** Explicit phase text for server-rendered MDX. Separate phases with ||. */
  steps?: string;
  /** Andel av bredden som ordbandet fyller (0–1). Default 1. */
  width?: number | string;
  /** Opacitet på de inaktiva orden. Default 0,05 — samma grå som mark-ordet. */
  dim?: number | string;
  /** Hur mycket det aktiva ordet växer (faktor). Default 1,45. 1 = ingen tillväxt. */
  grow?: number | string;
  /** Börja med alla ord tända (ingen aktiv) tills första klicket. */
  startBlank?: boolean;
  /** Större fastext i en inramad panel för läsbarhet i föreläsningssalen. */
  framed?: boolean;
  accent?: string;
  children?: ReactNode;
}

interface Phase {
  word: string;
  kicker: string;
  sub: string;
  bullets: string[];
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "li") return `${inner}\n`;
    return inner;
  }
  return "";
}

function parsePhases(children: ReactNode): Phase[] {
  return toText(children)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s·\s/).map((p) => p.trim());
      const [word = "", kicker = "", sub = "", bulletsRaw = ""] = parts;
      const bullets = bulletsRaw
        ? bulletsRaw.split(/\s\|\s|\s\|$|^\|\s/).map((b) => b.trim()).filter(Boolean)
        : [];
      return { word: word.replace(/\*\*/g, ""), kicker, sub, bullets };
    })
    .filter((p) => p.word.length > 0);
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function WordSteps({
  chapter,
  steps,
  width = 1,
  dim = 0.05,
  grow = 1.45,
  startBlank = false,
  framed = false,
  accent = "var(--accent)",
  children,
}: WordStepsProps) {
  const phases = parsePhases(steps !== undefined ? steps.replace(/\s*\|\|\s*/g, "\n") : children);
  const n = phases.length;
  const step = useSlideSteps(startBlank ? n + 1 : n);
  // startBlank: steg 0 = inget aktivt, steg k = fas k−1. Annars: steg k = fas k.
  const active = startBlank ? step - 1 : step;
  const reducedMotion = useReducedMotion();

  const bandRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const measureWordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [size, setSize] = useState(0);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [bandLeft, setBandLeft] = useState(0);

  const widthNum = Math.min(1, Math.max(0.3, typeof width === "string" ? parseFloat(width) || 1 : width));
  const dimNum = Math.min(1, Math.max(0, typeof dim === "string" ? parseFloat(dim) : dim));
  const growNum = Math.min(3, Math.max(1, typeof grow === "string" ? parseFloat(grow) || 1 : grow));
  const joined = phases.map((p) => p.word).join("  ");

  useLayoutEffect(() => {
    const band = bandRef.current;
    const m = measureRef.current;
    if (!band || !m) return;
    const compute = () => {
      const w = band.getBoundingClientRect().width;
      const h = band.parentElement?.getBoundingClientRect().height ?? 0;
      const mw = m.getBoundingClientRect().width;
      if (w <= 0 || mw <= 0) return;
      // Det aktiva ordet växer med growNum — bandet dimensioneras så att det
      // bredaste ordet får plats i växt storlek, då byter grundgraden aldrig
      // mellan stegen och bara det aktiva ordet rör sig.
      const widest = Math.max(0, ...measureWordRefs.current.map((el) => (el ? el.getBoundingClientRect().width : 0)));
      const need = mw + (growNum - 1) * widest;
      const fit = ((w * widthNum) / need) * 100 * 0.985;
      const cap = h > 0 ? (h * 0.5) / growNum : Infinity;
      setSize(Math.min(fit, cap));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(band);
    ro.observe(m);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(compute).catch(() => undefined);
    }
    return () => ro.disconnect();
  }, [joined, widthNum, growNum]);

  // Ordens vänsterkanter — kolumnen ovanför följer det aktiva ordet, även
  // medan det växer (ResizeObserver på varje ord).
  useLayoutEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const measure = () => {
      const bandBox = band.getBoundingClientRect();
      const parentBox = band.parentElement?.getBoundingClientRect();
      setBandLeft(parentBox ? bandBox.left - parentBox.left : 0);
      setOffsets(
        wordRefs.current.map((el) => (el ? el.getBoundingClientRect().left - bandBox.left : 0)),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    wordRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [size, joined]);

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.66rem, 0.85vw, 0.9rem)",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
  };

  const phase = active >= 0 && active < n ? phases[active] : null;
  const colLeft = phase ? bandLeft + (offsets[active] ?? 0) : bandLeft;
  const contentWidth = framed ? "min(58vw, 65rem)" : "min(34vw, 30rem)";
  const contentAccent = framed ? `color-mix(in srgb, ${accent} 65%, var(--text) 35%)` : accent;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-wordsteps={framed ? "framed" : "plain"}
      data-phase={active}
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Ordbandet */}
      <div
        ref={bandRef}
        data-wordsteps-band
        aria-hidden={false}
        style={{
          position: "absolute",
          left: "clamp(2rem, 4vw, 4rem)",
          right: "clamp(2rem, 4vw, 4rem)",
          bottom: "clamp(1.4rem, 3vh, 2.6rem)",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "baseline",
          gap: "0.16em",
          fontSize: size ? `${size}px` : "1px",
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)" as unknown as number,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          lineHeight: 0.82,
          whiteSpace: "nowrap",
        }}
      >
        <div
          ref={measureRef}
          aria-hidden
          style={{ position: "absolute", visibility: "hidden", fontSize: "100px", letterSpacing: "-0.02em", whiteSpace: "nowrap", left: 0, top: 0, display: "flex", gap: "0.16em" }}
        >
          {phases.map((p, i) => (
            <span
              key={i}
              ref={(el) => {
                measureWordRefs.current[i] = el;
              }}
              style={{ display: "inline-block" }}
            >
              {p.word}
            </span>
          ))}
        </div>
        {phases.map((p, i) => (
          <motion.span
            key={i}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
            animate={{
              opacity: i === active ? 1 : dimNum,
              fontSize: size ? `${i === active ? size * growNum : size}px` : "1px",
            }}
            transition={{ duration: reducedMotion ? 0 : 0.6, ease: EASE }}
            style={{ color: "var(--text)", display: "inline-block", lineHeight: 0.82 }}
          >
            {p.word}
          </motion.span>
        ))}
      </div>

      {/* Fasens kolumn — glider till det aktiva ordets vänsterkant */}
      <AnimatePresence mode="wait">
        {phase ? (
          <motion.div
            key={active}
            data-wordsteps-panel
            initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: EASE }}
            style={{
              position: "absolute",
              top: "clamp(5rem, 13vh, 8rem)",
              left: `min(${colLeft}px, calc(100% - clamp(2rem, 4vw, 4rem) - ${contentWidth}))`,
              width: contentWidth,
              ...(framed ? {
                padding: "clamp(1.2rem, 2.6vh, 2rem) clamp(1.4rem, 2.2vw, 3rem)",
                border: "2px solid var(--text)",
                borderLeft: `6px solid ${accent}`,
                boxShadow: `8px 8px 0 ${accent}`,
                background: "var(--slide-base, var(--bg))",
              } : {}),
              display: "flex",
              flexDirection: "column",
              gap: framed ? "clamp(0.8rem, 1.8vh, 1.4rem)" : "clamp(0.6rem, 1.4vh, 1.1rem)",
            }}
          >
            {phase.kicker ? (
              <div style={{
                ...mono,
                ...(framed ? { fontSize: "clamp(0.9rem, 1.2vw, 1.5rem)", letterSpacing: "0.14em", fontWeight: 600 } : {}),
                color: "var(--text)",
              }}>{phase.kicker}</div>
            ) : null}
            {phase.sub ? (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: framed ? "clamp(1.4rem, 2.7vw, 3.2rem)" : "clamp(1.1rem, 1.7vw, 1.75rem)",
                  lineHeight: 1.2,
                  color: "var(--text)",
                }}
              >
                {phase.sub}
              </div>
            ) : null}
            {phase.bullets.length > 0 ? (
              <ul style={{ listStyle: "none", margin: "0.2rem 0 0", padding: 0, display: "flex", flexDirection: "column", gap: framed ? "clamp(0.65rem, 1.3vh, 1rem)" : "0.5rem" }}>
                {phase.bullets.map((b, bi) => (
                  <motion.li
                    key={bi}
                    initial={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.12 + bi * 0.08, ease: EASE }}
                    style={{
                      display: "flex",
                      gap: "0.7rem",
                      alignItems: "baseline",
                      fontSize: framed ? "clamp(1.15rem, 2vw, 2.4rem)" : "clamp(0.95rem, 1.25vw, 1.3rem)",
                      lineHeight: 1.3,
                      color: "var(--text)",
                    }}
                  >
                    <span style={{ color: contentAccent, fontFamily: "var(--font-mono)", fontWeight: 600, flex: "0 0 auto" }}>✓</span>
                    <span>{renderInline(b, contentAccent)}</span>
                  </motion.li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
