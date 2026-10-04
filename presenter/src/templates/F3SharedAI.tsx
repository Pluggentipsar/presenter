"use client";

import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { glassCardStyle, AmbientBackdrop } from "./_decorations/GlassDecorations";

/**
 * F3SharedAI ★ — Jag–AI–Jag för de yngsta. Färgskiftet är hela poängen.
 *
 * Tre artefakter i följd, byggda som EN teckning som förändras:
 *
 *   0 · Första teckningen RITAS fram i blyerts — sol, moln, regn, pöl.
 *       Barnet vet att regnet faller NER. Vägen upp finns inte.
 *   1 · Tavelkortet: klassens gemensamma fråga till AI:n typas fram.
 *   2 · Den andra pennan: nya streck ritas OVANPÅ i grön tusch —
 *       avdunstningspilarna som sluter cirkeln. Samma papper, ny färg.
 *   3 · Payoff-raden landar: den andra färgen är beviset.
 *
 * Teckningen är inbyggd (vattnets kretslopp) — det är templatets identitet.
 * Blyerts = --text-muted, tuschpennan = --accent. Allt tecknande går via
 * CSS-transitions på pathLength-normaliserad dashoffset, så det överlever
 * uteblivna rAF-bildrutor.
 *
 * ```mdx
 * <F3SharedAI
 *   kicker="F–3 · Vattnets kretslopp"
 *   boardQuestion="Vart tar vattenpölen vägen när den försvinner?"
 *   payoff="Den andra färgen är **beviset** — eleven ser sitt eget tänkande före och efter."
 * />
 * ```
 */

interface F3SharedAIProps {
  kicker?: string;
  firstCaption?: string;
  boardCaption?: string;
  /** Klassens fråga på tavlan — typas fram tecken för tecken. */
  boardQuestion: string;
  secondCaption?: string;
  /** Landningsraden. **fet** blir accent. */
  payoff?: string;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Blyertsstrecken — medvetet skakiga, som en sexårings säkra hand. */
const PENCIL: string[] = [
  // Solen (uppe vänster): kropp + sex strålar
  "M76 58 C 66 44, 78 30, 93 33 C 108 36, 112 52, 102 62 C 92 72, 82 70, 76 58 Z",
  "M89 16 L 90 27",
  "M118 26 L 111 35",
  "M129 52 L 118 52",
  "M62 30 L 69 38",
  "M52 55 L 63 54",
  "M116 74 L 108 67",
  // Molnet (uppe höger): tre puffar
  "M268 52 C 262 36, 282 28, 292 38 C 296 24, 320 24, 324 40 C 340 34, 352 48, 342 60 C 348 70, 330 78, 318 72 C 310 82, 286 80, 282 68 C 268 72, 258 62, 268 52 Z",
  // Regnet: sex sneda streck
  "M282 88 L 276 104",
  "M300 90 L 294 108",
  "M318 88 L 312 104",
  "M292 112 L 287 126",
  "M310 114 L 304 130",
  "M328 108 L 322 122",
  // Pölen (nere mitten-höger): vinglig oval + två småvågor
  "M244 178 C 258 166, 330 164, 348 176 C 364 188, 344 200, 300 202 C 262 204, 232 192, 244 178 Z",
  "M270 184 C 278 180, 288 180, 294 184",
  "M306 190 C 314 186, 324 186, 330 190",
  // Gräset (nere vänster): fem strån + en blomma
  "M60 202 L 58 182",
  "M74 202 L 76 180",
  "M90 202 L 87 184",
  "M104 202 L 108 182",
  "M124 200 L 122 186",
  "M122 186 C 114 180, 118 168, 128 170 C 138 166, 144 176, 136 182 C 142 190, 130 196, 126 188",
  // Marklinjen
  "M36 204 C 120 198, 280 210, 372 202",
];

/** Tuschpennans nya streck — vägen UPP, som sluter cirkeln. */
const PEN: string[] = [
  // Tre vågiga avdunstningslinjer från pölen mot molnet
  "M280 168 C 272 156, 288 150, 280 138 C 272 126, 288 120, 282 108",
  "M300 164 C 292 152, 308 146, 300 134 C 292 122, 308 116, 302 102",
  "M320 166 C 312 154, 328 148, 320 136 C 312 124, 328 118, 322 106",
  // Pilspets på mittlinjen
  "M295 112 L 302 100 L 310 110",
  // Cykelpil: en stor båge från molnet runt tillbaka mot pölen
  "M348 64 C 388 92, 388 150, 356 176",
  "M362 164 L 354 178 L 340 172",
  // Ånga-krumelur ovanför pölen
  "M254 148 C 250 142, 258 138, 262 142",
];

function renderRich(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: "var(--accent-ink, var(--accent))", fontWeight: 650 }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function F3SharedAI({
  kicker,
  firstCaption = "1 · Barnen ritar först",
  boardCaption = "2 · Klassen frågar tillsammans",
  boardQuestion,
  secondCaption = "3 · Rita om — med annan färg",
  payoff,
}: F3SharedAIProps) {
  // Läge 0: teckningen ritas · 1: tavlan · 2: tuschpennan · 3: payoff
  const step = useSlideSteps(4);
  const boardOn = step >= 1;
  const penOn = step >= 2;
  const landed = step >= 3;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    const fallback = setTimeout(() => setMounted(true), 120);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(fallback);
    };
  }, []);

  const boardChars = Array.from(boardQuestion);

  const stroke = (on: boolean, i: number, dur: number, gap: number, base: number) => ({
    strokeDasharray: 1,
    strokeDashoffset: on ? 0 : 1,
    opacity: on ? 1 : 0,
    transition: on
      ? `stroke-dashoffset ${dur}s ease-out ${base + i * gap}s, opacity 0.01s linear ${base + i * gap}s`
      : "stroke-dashoffset 0.2s ease, opacity 0.15s ease",
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.8rem, 3.6vh, 2.8rem) clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(0.8rem, 1.8vh, 1.3rem)",
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
            gap: "clamp(1.4rem, 3vw, 3rem)",
            alignItems: "center",
            minHeight: 0,
          }}
        >
          {/* ─── Pappret — teckningen som förändras ─── */}
          <div
            style={{
              ...glassCardStyle({ padding: "clamp(1rem, 2vh, 1.6rem)" }),
              background: "var(--bg-surface)",
              alignSelf: "center",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "rotate(-1.2deg) translateY(0)" : "rotate(-1.6deg) translateY(16px)",
              transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
            }}
          >
            <svg
              viewBox="0 0 400 224"
              style={{ width: "100%", height: "auto", display: "block" }}
              role="img"
              aria-label="Barnteckning av vattnets kretslopp — regnet i blyerts, avdunstningen tillagd med grön penna"
            >
              {/* Blyertsen — ritas fram vid mount */}
              {PENCIL.map((d, i) => (
                <path
                  key={`pencil-${i}`}
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={stroke(mounted, i, 0.5, 0.11, 0.25)}
                />
              ))}
              {/* Tuschpennan — de nya strecken, i accent */}
              {PEN.map((d, i) => (
                <path
                  key={`pen-${i}`}
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={stroke(penOn, i, 0.45, 0.16, 0.15)}
                />
              ))}
            </svg>
            {/* Bildtexten byter när pennan bytt färg */}
            <div
              style={{
                marginTop: "0.7rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.76vw, 0.76rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: penOn ? "var(--accent-ink, var(--accent))" : "var(--text-muted)",
                transition: "color 0.6s ease",
              }}
            >
              {penOn ? secondCaption : firstCaption}
            </div>
          </div>

          {/* ─── Tavlan — klassens gemensamma fråga ─── */}
          <div
            style={{
              ...glassCardStyle({ padding: "clamp(1.2rem, 2.4vh, 1.9rem)" }),
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
              opacity: boardOn ? 1 : 0,
              transform: boardOn ? "translateY(0) scale(1)" : "translateY(22px) scale(0.96)",
              transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.76vw, 0.76rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: "var(--accent-bright, var(--accent))",
                }}
              />
              {boardCaption}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(1.25rem, 2.3vw, 2.1rem)",
                lineHeight: 1.3,
                color: "var(--text)",
              }}
            >
              {boardChars.map((ch, i) => (
                <span
                  key={i}
                  style={{
                    opacity: boardOn ? 1 : 0,
                    transition: boardOn
                      ? `opacity 0.04s linear ${0.3 + i * 0.022}s`
                      : "opacity 0.1s linear",
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.78rem, 1vw, 1rem)",
                color: "var(--text-muted)",
              }}
            >
              — på storbild, med läraren vid ratten. Inga elevkonton.
            </div>
          </div>
        </div>

        {/* ─── Payoff ─── */}
        {payoff ? (
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.15rem, 2vw, 1.9rem)",
              lineHeight: 1.35,
              color: "var(--text)",
              paddingBottom: "0.4rem",
              opacity: landed ? 1 : 0,
              transform: landed ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
            }}
          >
            <EditableText path="payoff" value={payoff}>
              {renderRich(payoff)}
            </EditableText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
