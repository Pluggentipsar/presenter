"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * PosterText — avgångstavlan. Texten ÄR bilden.
 *
 * Varje rad MÄTS och sätts i den grad som fyller slidens bredd. En kort rad
 * blir därför enorm och en lång rad blir mindre — det är affischens logik,
 * inte typografins: "FÖRETAGANDE ÄR" ryms på en rad, "AGENS." sprängs upp
 * till kant. Höjdbudgeten håller helheten inom sliden.
 *
 * Byggd för joelsai-temat (Archivo kondenserad versal) men temaneutral —
 * den läser --font-display, --heading-weight och --heading-case.
 *
 * Markörer i raderna:
 *   `**ord**`  → accentfärg (kobalt)
 *   `~~ord~~`  → kontur — ihålig text, bara linjen (rättelsens motsats)
 *
 * ```mdx
 * <PosterText kicker="§ Landning" footnote="Skolverket · ämnet Entreprenörskap" stepped>
 * - FÖRETAGANDE ÄR
 * - **AGENS.**
 * </PosterText>
 * ```
 *
 * `fit="width"` (default) fyller varje rad var för sig. `fit="uniform"` ger
 * alla rader samma grad — den längsta bestämmer — som sajtens hero.
 * `stepped` visar en rad per klick.
 */

interface PosterTextProps {
  /** Mono-kicker uppe till vänster. */
  kicker?: string;
  /** Mono-rad nere till vänster — källa, plats, datum. */
  footnote?: string;
  /** Bisats under raderna, i samma typografi men mindre (fyller subWidth av bredden). */
  sub?: string;
  /** Andel av bredden som bisatsen fyller. Default 0,5. */
  subWidth?: number;
  /** Raderna, åtskilda med ` | `. Alternativ till children-lista. */
  lines?: string;
  /** Raderna som markdown-lista (eller rader). */
  children?: ReactNode;
  /** width = varje rad fyller bredden · uniform = samma grad på alla rader. */
  fit?: "width" | "uniform";
  align?: "left" | "center";
  /** Radhöjd. Default 1,0 — vid 0,95 nuddar Ö-prickarna raden ovanför i
   *  affischgrad (mätt 2026-09-02), så gå lägre bara utan diakriter. */
  leading?: number;
  /** Andel av bredden raderna får fylla, 0–1. */
  width?: number;
  /** En rad per klick. */
  stepped?: boolean;
  accent?: string;
  /** paper = temats ark (default). dark = det mörka registret: nattsvart →
   *  kobalt-gradient, ljus text, ljusare accent. kobalt = massivt kobaltblock
   *  med cremevit text och bläcksvart som accentord — affischens tredje
   *  register. Sätt `background` för att byta grunden mot en bild — texten
   *  förblir ljus. */
  tone?: "paper" | "dark" | "kobalt" | "glod" | "barnsten";
}

/** Sajtens elblå rök utan bild: nattsvart → marin → kobalt. Samma färger
 *  som gradientpresetet "Kobalt" i designpanelen. */
const DARK_BACKGROUND =
  "radial-gradient(ellipse 85% 70% at 74% 16%, #1f3dff 0%, #0b1c36 46%, #06101f 100%)";
/** Det varma mörka registret: lampan i rummet. Samma som withSlideBg glod. */
const GLOD_BACKGROUND =
  "radial-gradient(ellipse 85% 70% at 26% 18%, #f08a2e 0%, #7a3a12 44%, #1a0d07 100%)";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Plockar rader ur MDX-barn: en <ul>/<li>-lista blir en rad per punkt,
 *  annars delas texten på radbrytning eller ` | `. <strong> → **…**,
 *  <del> → ~~…~~ så markörerna överlever MDX-parsningen. */
function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "del") return `~~${inner}~~`;
    if (el.type === "li") return `${inner}\n`;
    return inner;
  }
  return "";
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\n|\s\|\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return (
        <span
          key={i}
          style={{
            color: "transparent",
            WebkitTextStroke: "0.028em var(--text)",
          }}
        >
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function PosterText({
  kicker,
  footnote,
  sub,
  subWidth = 0.5,
  lines: linesProp,
  children,
  fit = "width",
  align = "left",
  leading = 1,
  width = 1,
  stepped = false,
  accent = "var(--accent)",
  tone = "paper",
}: PosterTextProps) {
  const mainLines = splitLines(linesProp ?? toText(children));
  // Bisatsen mäts som en rad till, men mot en smalare målbredd — så blir den
  // mindre av sig själv och följer samma höjdbudget som resten.
  const subIndex = sub && sub.trim() ? mainLines.length : -1;
  const lines = subIndex >= 0 ? [...mainLines, sub!.trim()] : mainLines;
  const step = useSlideSteps(stepped ? mainLines.length : 0);

  const boxRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [sizes, setSizes] = useState<number[]>([]);
  const key = lines.join("\n");

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const compute = () => {
      const rect = box.getBoundingClientRect();
      const availW = rect.width * Math.min(Math.max(width, 0.2), 1);
      const availH = rect.height;
      if (!availW || !availH) return;
      // Varje rad mäts i 100 px och skalas till bredden.
      let px = lines.map((_, i) => {
        const w = measureRefs.current[i]?.getBoundingClientRect().width ?? 0;
        const target = i === subIndex ? availW * Math.min(Math.max(subWidth, 0.2), 1) : availW;
        return w > 0 ? (target / w) * 100 : 0;
      });
      if (fit === "uniform") {
        const m = Math.min(...px.filter((v, i) => v > 0 && i !== subIndex));
        px = px.map((v, i) => (i === subIndex ? v : isFinite(m) ? m : 0));
      }
      // Höjdbudgeten: krymp allt proportionellt om raderna inte ryms.
      const total = px.reduce((a, b) => a + b * leading, 0);
      if (total > availH) {
        const k = availH / total;
        px = px.map((v) => v * k);
      }
      setSizes(px);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    // Fallback-fonten mäter annorlunda än Archivo — mät om när den landat.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(compute).catch(() => undefined);
    }
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fit, leading, width, subWidth, subIndex]);

  const lineStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: "var(--heading-weight)" as unknown as number,
    textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
    letterSpacing: "-0.012em",
    lineHeight: leading,
    whiteSpace: "nowrap",
    color: "var(--text)",
  };

  const monoStyle: React.CSSProperties = {
    position: "absolute",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    zIndex: 3,
  };

  // Mörkt register: variablerna byts på roten så att allt under — rader,
  // kontur, kickers — följer med utan egna prop-vägar.
  const rootStyle: React.CSSProperties =
    tone === "dark"
      ? ({
          background: DARK_BACKGROUND,
          "--text": "#f2f0e9",
          "--text-muted": "#aeaba1",
          "--accent": "#6a8aff",
        } as React.CSSProperties)
      : tone === "kobalt"
        ? ({
            background: "#1533ff",
            "--text": "#f2f0e9",
            "--text-muted": "rgba(242, 240, 233, 0.72)",
            "--accent": "#0f0f0e",
          } as React.CSSProperties)
        : tone === "glod"
          ? ({
              background: GLOD_BACKGROUND,
              "--text": "#f7efe3",
              "--text-muted": "rgba(247, 239, 227, 0.72)",
              "--accent": "#ffb75a",
            } as React.CSSProperties)
          : tone === "barnsten"
            ? ({
                background: "#ffb02e",
                "--text": "#131311",
                "--text-muted": "rgba(19, 19, 17, 0.72)",
                "--accent": "#1533ff",
              } as React.CSSProperties)
            : { background: "var(--slide-base, var(--bg))" };

  return (
    <div className="relative h-full w-full overflow-hidden" style={rootStyle}>
      {kicker ? (
        <div style={{ ...monoStyle, top: "clamp(2rem, 4vh, 3.2rem)", left: "clamp(2rem, 4vw, 4rem)" }}>
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}
      {footnote ? (
        <div style={{ ...monoStyle, bottom: "clamp(2rem, 4vh, 3.2rem)", left: "clamp(2rem, 4vw, 4rem)" }}>
          <EditableText path="footnote" value={footnote}>
            {footnote}
          </EditableText>
        </div>
      ) : null}

      {/* Mätspannen — osynliga, i exakt samma typografi som raderna. */}
      <div aria-hidden style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", left: 0, top: 0 }}>
        {lines.map((line, i) => (
          <span
            key={i}
            ref={(el) => {
              measureRefs.current[i] = el;
            }}
            style={{ ...lineStyle, fontSize: "100px", position: "absolute" }}
          >
            {renderInline(line, accent)}
          </span>
        ))}
      </div>

      <div
        ref={boxRef}
        style={{
          position: "absolute",
          top: "clamp(4rem, 9vh, 6rem)",
          bottom: "clamp(4rem, 9vh, 6rem)",
          left: "clamp(2rem, 4vw, 4rem)",
          right: "clamp(2rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: align === "center" ? "center" : "flex-start",
        }}
      >
        {lines.map((line, i) => {
          const isSub = i === subIndex;
          const shown = !stepped || (isSub ? step >= mainLines.length - 1 : i <= step);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 48 }}
              animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
              transition={{ duration: 0.75, delay: stepped ? 0 : 0.1 * i, ease: EASE }}
              style={{
                ...lineStyle,
                fontSize: sizes[i] ? `${sizes[i]}px` : "1px",
                ...(isSub ? { color: "var(--text-muted)", marginTop: "0.12em" } : {}),
              }}
            >
              {renderInline(line, accent)}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
