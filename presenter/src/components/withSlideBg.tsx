/**
 * withSlideBg — gör vilken mall som helst bakgrunds-medveten.
 *
 * Får en slide en `background`-prop wrappas mallen i ett skal som målar
 * bakgrunden; mallens egen rot-bakgrund tvingas transparent via CSS-regeln
 * `.slide-bg-shell > *` i globals.css. Utan `background` är det en ren no-op —
 * mallen renderas helt orörd.
 *
 * Tre grenar, och ingen av dem behöver egen lagring i frontmattern:
 *  - `.mp4/.webm/.mov` → riktigt <video>-lager med valfri overlay
 *  - sökväg eller URL  → bild i `cover`
 *  - allt annat        → skickas rakt in som CSS `background`, vilket ger
 *                        platt färg (`background="#101418"`) gratis
 *
 * Modulen har MEDVETET ingen "use client"-direktiv: den renderas både i
 * server-trädet (PresentationRenderer/MDXRemote) och i editorns klient-träd.
 * Allt som behöver hooks ligger i SlideBgVideo.
 */

import type { ComponentType } from "react";
import "./projection.css";
import { buildBackgroundCss } from "@/lib/background";
import { SlideBgVideo } from "./SlideBgVideo";
import { SlideMark } from "./SlideMark";
import { SlideDraggable } from "./SlideDraggable";
import { normalizeMarkAlign, type MarkAlign } from "@/lib/mark-align";
import { SlideFieldStyleProvider } from "@/lib/slide-field-style";

export type SlideComponent = ComponentType<Record<string, unknown>>;

/**
 * Registren — joelsai-deckets tre bakgrundslägen som generisk prop:
 * `register="kobalt"` (massivt #1533ff, cremevit text, svart accent) och
 * `register="natt"` (nattsvart→kobalt-gradient, ljus text, ljusblå accent).
 * Papper = ingen register-prop. Samma tokens som PosterText tone=… så att
 * affisch och innehållsslide i samma register ser ut att höra ihop.
 */
type RegisterName = "kobalt" | "natt" | "glod" | "barnsten" | "gul" | "mint" | "rosa" | "lila" | "tavla" | "betong" | "rott" | "sol" | "signal" | "larm";
const REGISTERS: Record<RegisterName, { background: string; vars: Record<string, string> }> = {
  kobalt: {
    background: "#1533ff",
    vars: {
      "--bg": "#1533ff",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(242,240,233,0.10)",
      "--bg-elevated": "rgba(242,240,233,0.10)",
      "--text": "#f2f0e9",
      "--text-muted": "rgba(242,240,233,0.72)",
      "--accent": "#0f0f0e",
      "--accent-ink": "#0f0f0e",
      "--accent-bright": "#f2f0e9",
      "--accent-glow": "rgba(15,15,14,0.18)",
      "--accent-dim": "rgba(242,240,233,0.14)",
      "--accent-alert": "#f2f0e9",
      "--card-shadow": "8px 8px 0 #0f0f0e",
      "--card-shadow-alt": "8px 8px 0 #0f0f0e",
      "--card-border": "2px solid #f2f0e9",
    },
  },
  natt: {
    background: "radial-gradient(ellipse 85% 70% at 74% 16%, #1f3dff 0%, #0b1c36 46%, #06101f 100%)",
    vars: {
      "--bg": "#0b1c36",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(242,240,233,0.06)",
      "--bg-elevated": "rgba(242,240,233,0.06)",
      "--text": "#f2f0e9",
      "--text-muted": "#aeaba1",
      "--accent": "#6a8aff",
      "--accent-ink": "#6a8aff",
      "--accent-bright": "#9db1ff",
      "--accent-glow": "rgba(106,138,255,0.18)",
      "--accent-dim": "rgba(106,138,255,0.16)",
      "--accent-alert": "#ff6a5a",
      "--card-shadow": "8px 8px 0 #6a8aff",
      "--card-shadow-alt": "8px 8px 0 #ff6a5a",
      "--card-border": "2px solid #f2f0e9",
    },
  },
  /* De varma registren (2026-09-03, ai-relationer-elevhalsa): kobalt och natt
     är systemets och skärmens färger; människan fick ingen. Glöd = lampan i
     det mörka rummet (bärnsten → brunsvart, cremevit text, ljus bärnsten som
     accent). Bärnsten = det massiva varma blocket, bläck som text och kobalt
     som accentord — den varma spegelbilden av kobalt. */
  glod: {
    background: "radial-gradient(ellipse 85% 70% at 26% 18%, #f08a2e 0%, #7a3a12 44%, #1a0d07 100%)",
    vars: {
      "--bg": "#4a2410",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(242,240,233,0.07)",
      "--bg-elevated": "rgba(242,240,233,0.07)",
      "--text": "#f7efe3",
      "--text-muted": "rgba(247,239,227,0.72)",
      "--accent": "#ffb75a",
      "--accent-ink": "#ffb75a",
      "--accent-bright": "#ffd28a",
      "--accent-glow": "rgba(255,183,90,0.20)",
      "--accent-dim": "rgba(255,183,90,0.16)",
      "--accent-alert": "#ff6a5a",
      "--card-shadow": "8px 8px 0 #ffb75a",
      "--card-shadow-alt": "8px 8px 0 #ff6a5a",
      "--card-border": "2px solid #f7efe3",
    },
  },
  barnsten: {
    background: "#ffb02e",
    vars: {
      "--bg": "#ffb02e",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(19,19,17,0.08)",
      "--bg-elevated": "rgba(19,19,17,0.08)",
      "--text": "#131311",
      "--text-muted": "rgba(19,19,17,0.72)",
      "--accent": "#1533ff",
      "--accent-ink": "#1533ff",
      "--accent-bright": "#131311",
      "--accent-glow": "rgba(21,51,255,0.16)",
      "--accent-dim": "rgba(19,19,17,0.12)",
      "--accent-alert": "#b92016",
      "--card-shadow": "8px 8px 0 #131311",
      "--card-shadow-alt": "8px 8px 0 #1533ff",
      "--card-border": "2px solid #131311",
    },
  },
  /* Fyrfärgen (2026-09-03): fyra pastellregister, en per lins
     i kartan — OM gul, MED mint, MOT rosa, GENOM lila — alla med bläck som
     text. Accenten är signalrött på de varma/ljusa (gul, mint) och indigo på
     de kalla (rosa, lila) där rött inte läser. Tavla = bläcksvart med gul
     accent, det mörka registret för elevrösterna och provokationerna. */
  gul: {
    background: "#ffd33d",
    vars: {
      "--bg": "#ffd33d",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(19,19,17,0.08)",
      "--bg-elevated": "rgba(242,240,233,0.55)",
      "--text": "#131311",
      "--text-muted": "rgba(19,19,17,0.72)",
      "--accent": "#ff3b1f",
      "--accent-ink": "#ff3b1f",
      "--accent-bright": "#131311",
      "--accent-glow": "rgba(19,19,17,0.14)",
      "--accent-dim": "rgba(19,19,17,0.12)",
      "--accent-alert": "#b92016",
      "--card-shadow": "8px 8px 0 #131311",
      "--card-shadow-alt": "8px 8px 0 #ff3b1f",
      "--card-border": "2px solid #131311",
      "--glass-card-bg": "#f2f0e9",
    },
  },
  mint: {
    background: "#6fe3a6",
    vars: {
      "--bg": "#6fe3a6",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(19,19,17,0.08)",
      "--bg-elevated": "rgba(242,240,233,0.55)",
      "--text": "#131311",
      "--text-muted": "rgba(19,19,17,0.72)",
      "--accent": "#ff3b1f",
      "--accent-ink": "#ff3b1f",
      "--accent-bright": "#131311",
      "--accent-glow": "rgba(19,19,17,0.14)",
      "--accent-dim": "rgba(19,19,17,0.12)",
      "--accent-alert": "#b92016",
      "--card-shadow": "8px 8px 0 #131311",
      "--card-shadow-alt": "8px 8px 0 #ff3b1f",
      "--card-border": "2px solid #131311",
      "--glass-card-bg": "#f2f0e9",
    },
  },
  rosa: {
    background: "#ff8bb5",
    vars: {
      "--bg": "#ff8bb5",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(19,19,17,0.08)",
      "--bg-elevated": "rgba(242,240,233,0.55)",
      "--text": "#131311",
      "--text-muted": "rgba(19,19,17,0.72)",
      "--accent": "#2a1a8f",
      "--accent-ink": "#2a1a8f",
      "--accent-bright": "#131311",
      "--accent-glow": "rgba(19,19,17,0.14)",
      "--accent-dim": "rgba(19,19,17,0.12)",
      "--accent-alert": "#b92016",
      "--card-shadow": "8px 8px 0 #131311",
      "--card-shadow-alt": "8px 8px 0 #2a1a8f",
      "--card-border": "2px solid #131311",
      "--glass-card-bg": "#f2f0e9",
    },
  },
  lila: {
    background: "#a48cff",
    vars: {
      "--bg": "#a48cff",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(19,19,17,0.08)",
      "--bg-elevated": "rgba(242,240,233,0.55)",
      "--text": "#131311",
      "--text-muted": "rgba(19,19,17,0.72)",
      "--accent": "#2a1a8f",
      "--accent-ink": "#2a1a8f",
      "--accent-bright": "#131311",
      "--accent-glow": "rgba(19,19,17,0.14)",
      "--accent-dim": "rgba(19,19,17,0.12)",
      "--accent-alert": "#b92016",
      "--card-shadow": "8px 8px 0 #131311",
      "--card-shadow-alt": "8px 8px 0 #2a1a8f",
      "--card-border": "2px solid #131311",
      "--glass-card-bg": "#f2f0e9",
    },
  },
  tavla: {
    background: "#131311",
    vars: {
      "--bg": "#131311",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(242,240,233,0.07)",
      "--bg-elevated": "rgba(242,240,233,0.07)",
      "--text": "#f2f0e9",
      "--text-muted": "rgba(242,240,233,0.68)",
      "--accent": "#ffd33d",
      "--accent-ink": "#ffd33d",
      "--accent-bright": "#fff0a8",
      "--accent-glow": "rgba(255,211,61,0.18)",
      "--accent-dim": "rgba(255,211,61,0.14)",
      "--accent-alert": "#ff3b1f",
      "--card-shadow": "8px 8px 0 #ffd33d",
      "--card-shadow-alt": "8px 8px 0 #ff3b1f",
      "--card-border": "2px solid #f2f0e9",
      "--glass-card-bg": "#1c1c1a",
    },
  },
  /* Betong (2026-09-04): affischens tre material. betong =
     det grå fältet under ett svartvitt rasterfoto (background= + halftone),
     papperstext, rött som accent. rott = hela ytan signalröd, bläcktext,
     papper som accent — blottläggningarna. sol = orange, bara vid landning.
     Tavla lånas från fyrfärgen; betong byter dess accent till rött
     i globals.css. */
  betong: {
    background: "#6b6963",
    vars: {
      "--bg": "#6b6963",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(231,226,214,0.10)",
      "--bg-elevated": "rgba(231,226,214,0.10)",
      "--text": "#e7e2d6",
      "--text-muted": "rgba(231,226,214,0.72)",
      "--accent": "#e3321b",
      "--accent-ink": "#e3321b",
      "--accent-bright": "#e8912f",
      "--accent-glow": "rgba(227,50,27,0.2)",
      "--accent-dim": "rgba(231,226,214,0.14)",
      "--accent-alert": "#e3321b",
      "--card-shadow": "8px 8px 0 #121210",
      "--card-shadow-alt": "8px 8px 0 #e3321b",
      "--card-border": "2px solid #e7e2d6",
      "--glass-card-bg": "rgba(18,18,16,0.84)",
    },
  },
  rott: {
    background: "#e3321b",
    vars: {
      "--bg": "#e3321b",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(18,18,16,0.08)",
      "--bg-elevated": "rgba(231,226,214,0.55)",
      "--text": "#121210",
      "--text-muted": "rgba(18,18,16,0.7)",
      "--accent": "#e7e2d6",
      "--accent-ink": "#e7e2d6",
      "--accent-bright": "#121210",
      "--accent-glow": "rgba(18,18,16,0.14)",
      "--accent-dim": "rgba(18,18,16,0.12)",
      "--accent-alert": "#121210",
      "--card-shadow": "8px 8px 0 #121210",
      "--card-shadow-alt": "8px 8px 0 #e7e2d6",
      "--card-border": "2px solid #121210",
      "--glass-card-bg": "#e7e2d6",
    },
  },
  /* betong_natt (2026-09-04): signal = hela ytan kall cyan med bläcktext —
     nattens motsvarighet till rott. larm = signalrött fält, papperstext,
     reserverat för det som faktiskt är ett larm. */
  signal: {
    background: "#22c2cc",
    vars: {
      "--bg": "#22c2cc",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(15,17,19,0.08)",
      "--bg-elevated": "rgba(15,17,19,0.06)",
      "--text": "#0f1113",
      "--text-muted": "rgba(15,17,19,0.7)",
      "--accent": "#0f1113",
      "--accent-ink": "#0f1113",
      "--accent-bright": "#e7e2d6",
      "--accent-glow": "rgba(15,17,19,0.14)",
      "--accent-dim": "rgba(15,17,19,0.12)",
      "--accent-alert": "#e3321b",
      "--card-shadow": "8px 8px 0 #0f1113",
      "--card-shadow-alt": "8px 8px 0 #e7e2d6",
      "--card-border": "2px solid #0f1113",
      "--glass-card-bg": "#e7e2d6",
    },
  },
  larm: {
    background: "#e3321b",
    vars: {
      "--bg": "#e3321b",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(15,17,19,0.10)",
      "--bg-elevated": "rgba(15,17,19,0.08)",
      "--text": "#e7e2d6",
      "--text-muted": "rgba(231,226,214,0.76)",
      "--accent": "#0f1113",
      "--accent-ink": "#0f1113",
      "--accent-bright": "#e7e2d6",
      "--accent-glow": "rgba(15,17,19,0.18)",
      "--accent-dim": "rgba(231,226,214,0.14)",
      "--accent-alert": "#0f1113",
      "--card-shadow": "8px 8px 0 #0f1113",
      "--card-shadow-alt": "8px 8px 0 #e7e2d6",
      "--card-border": "2px solid #e7e2d6",
      "--glass-card-bg": "rgba(15,17,19,0.86)",
    },
  },
  sol: {
    background: "#e8912f",
    vars: {
      "--bg": "#e8912f",
      "--slide-base": "transparent",
      "--bg-surface": "rgba(18,18,16,0.08)",
      "--bg-elevated": "rgba(231,226,214,0.55)",
      "--text": "#121210",
      "--text-muted": "rgba(18,18,16,0.7)",
      "--accent": "#121210",
      "--accent-ink": "#121210",
      "--accent-bright": "#e3321b",
      "--accent-glow": "rgba(18,18,16,0.14)",
      "--accent-dim": "rgba(18,18,16,0.12)",
      "--accent-alert": "#e3321b",
      "--card-shadow": "8px 8px 0 #121210",
      "--card-shadow-alt": "8px 8px 0 #e3321b",
      "--card-border": "2px solid #121210",
      "--glass-card-bg": "#e7e2d6",
    },
  },
};

/**
 * Nästlade databärare — komponenter vars förälder läser props direkt av dem
 * i stället för att rendera dem.
 *
 * Comparison hämtar title och children ur varje ComparisonColumn, Timeline ur
 * sina TimelineEvent, och så vidare. Lägger man ett extra element runt dem
 * får föräldern wrappern i handen i stället för barnet, och renderar tomt.
 *
 * De här får därför aldrig någon fältfärg-provider. Kostar ingenting: deras
 * text ritas ändå av föräldern, så en egen färg på dem hade inte gjort något.
 */
const DATA_HOLDERS = new Set([
  "ComparisonColumn",
  "TimelineEvent",
  "TeamMember",
  "SpotlightCard",
  "AiArLabel",
]);

/**
 * Symbolen — en enfärgad bläckillustration (linoleumsnitt-stil, genererad
 * lokalt) som CSS-mask. Färgen kommer
 * från registret: bläck på papper, cremevitt på natt, svart på kobalt. Därför
 * behövs bara EN fil per motiv, aldrig en per färg. Filen ska ha alfa
 * (`*-mask.png`, luminans → alfa) — RGB ignoreras.
 */
const SYMBOL_ALIGN: Record<string, React.CSSProperties> = {
  r: { right: "5vw", top: "50%", transform: "translateY(-50%)" },
  l: { left: "5vw", top: "50%", transform: "translateY(-50%)" },
  tr: { right: "5vw", top: "8vh" },
  tl: { left: "5vw", top: "8vh" },
  br: { right: "5vw", bottom: "8vh" },
  bl: { left: "5vw", bottom: "8vh" },
  c: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
};
/**
 * Symbolen och figuren ligger i SlideDraggable (klientkomponent): utanför
 * R-läget en ren positionering, i R-läget dra-och-släpp som skriver
 * symbolX/symbolY resp. figureX/figureY (mittpunkt i procent av sliden) och
 * ett hörnhandtag som skriver *Size. Finns X/Y vinner de över Align.
 */
function SlideSymbol({ src, align, size, tone, opacity, x, y }: { src: string; align: string; size: string; tone: string; opacity: number; x?: number; y?: number }) {
  const color = tone === "accent" ? "var(--accent)" : tone === "paper" ? "var(--bg)" : "var(--text)";
  // Omslutande div: skalets regel `.slide-bg-shell > *` tömmer direkta barn
  // på bakgrund, och masken ÄR sin bakgrundsfärg — så den får inte ligga direkt
  // i skalet.
  return (
    <div aria-hidden className="slide-symbol-wrap" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <SlideDraggable kind="symbol" presetStyle={SYMBOL_ALIGN[align] ?? SYMBOL_ALIGN.r} x={x} y={y} size={size}>
        <div
          className="slide-symbol"
          style={{
            width: size,
            height: "100%",
            aspectRatio: "1 / 1",
            backgroundColor: color,
            opacity,
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      </SlideDraggable>
    </div>
  );
}

/**
 * Figuren — ett stort fotografiskt urklipp (PNG med alfa) i lager på sliden:
 * bakom innehållet (default) eller framför (figureFront), i registrets ljus.
 * Kollaget: objektet får blöda ut över kanten (figureBleed), texten får ligga
 * över det. Till skillnad från symbolen behåller figuren sina egna färger.
 */
const FIGURE_ALIGN: Record<string, React.CSSProperties> = {
  r: { right: "0", top: "50%", transform: "translateY(-50%)" },
  l: { left: "0", top: "50%", transform: "translateY(-50%)" },
  tr: { right: "0", top: "0" },
  tl: { left: "0", top: "0" },
  br: { right: "0", bottom: "0" },
  bl: { left: "0", bottom: "0" },
  c: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
};
function SlideFigure({ src, align, size, front, bleed, opacity, rotate, x, y }: { src: string; align: string; size: string; front: boolean; bleed: string; opacity: number; rotate: number; x?: number; y?: number }) {
  const pos = { ...(FIGURE_ALIGN[align] ?? FIGURE_ALIGN.r) };
  // bleed: negativ marginal så urklippet får gå utanför kanten
  for (const k of ["right", "left", "top", "bottom"] as const) if (pos[k] === "0") (pos as Record<string, string>)[k] = `calc(0px - ${bleed})`;
  const base = pos.transform ? String(pos.transform) : "";
  pos.transform = `${base} rotate(${rotate}deg)`.trim();
  return (
    <div aria-hidden className="slide-figure-wrap" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: front ? 2 : 0, overflow: "hidden" }}>
      <SlideDraggable kind="figure" presetStyle={pos} x={x} y={y} rotate={rotate} size={size}>
        <img
          src={src}
          alt=""
          className="slide-figure"
          style={{
            display: "block",
            height: "100%",
            width: "auto",
            maxWidth: "none",
            opacity,
            objectFit: "contain",
            filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.18))",
          }}
        />
      </SlideDraggable>
    </div>
  );
}

/**
 * Tejpen — etiketten som en färgad remsa, lätt roterad, uppe i hörnet.
 * Fyrfärgens kickerröst (2026-09-03): kapitel, stadium,
 * "live", "reserv". Typografin i globals.css (.slide-tape).
 */
function SlideTape({ text, align, tone }: { text: string; align: "tl" | "tr"; tone: string }) {
  const colors: React.CSSProperties =
    tone === "ink"
      ? { background: "var(--text)", color: "var(--bg)" }
      : tone === "paper"
        ? { background: "var(--bg)", color: "var(--text)", border: "2px solid var(--text)" }
        : { background: "var(--accent)", color: "var(--bg)" };
  // Omslutande div: skalets regel `.slide-bg-shell > *` tömmer direkta barn
  // på bakgrund — remsan skulle annars bli osynlig text med bara skuggan kvar.
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <div className="slide-tape" data-align={align} style={colors}>
        {text}
      </div>
    </div>
  );
}

/**
 * Löpremsan — samma ord om och om igen, rullande. Cute-alismens
 * "CURRENTLY OPEN ● CURRENTLY OPEN". Spåret dubbleras så loopen är skarvfri
 * (animationen flyttar exakt halva bredden).
 */
function SlideTicker({ text, align }: { text: string; align: "top" | "bottom" }) {
  const items = Array.from({ length: 10 }, () => text);
  const track = (key: string) => (
    <span key={key} className="slide-ticker-track" aria-hidden>
      {items.map((t, i) => (
        <span key={i}>
          {t}
          <span className="slide-ticker-dot">●</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <div className="slide-ticker" data-align={align}>
        <div className="slide-ticker-run">
          {track("a")}
          {track("b")}
        </div>
      </div>
    </div>
  );
}

/**
 * Remsan — föreläsningens titel som vertikal accentremsa längs en kant
 * (betong: affischens rygg). strip="…" stripAlign="l|r".
 */
function SlideStrip({ text, align }: { text: string; align: "l" | "r" }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <div className="slide-strip" data-align={align}>
        <span>{text}</span>
      </div>
    </div>
  );
}

/**
 * Skivan — en enfärgad cirkel bakom innehållet (betong: solen). disc="sol|rott|ink"
 * discSize="72vh" discX="38" discY="50" (procent av ytan, mittpunkt).
 */
function SlideDisc({ tone, size, x, y }: { tone: string; size: string; x: number; y: number }) {
  const color = tone === "rott" ? "var(--accent)" : tone === "ink" ? "var(--text)" : "var(--accent-bright)";
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: -2, overflow: "hidden" }}>
      <div
        className="slide-disc"
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: color,
        }}
      />
    </div>
  );
}

const HALFTONE_FILTER = "grayscale(1) contrast(1.28) brightness(0.96)";

export function withSlideBg(Component: SlideComponent): SlideComponent {
  const componentName = Component.displayName ?? Component.name ?? "";
  const isDataHolder = DATA_HOLDERS.has(componentName);
  const Wrapped = (props: Record<string, unknown>) => {
    const projectorId = typeof props.slideId === "string" && props.slideId.startsWith("sl_uf_") ? props.slideId : undefined;
    // cutSkip styr versioner/cuts (läses server-side via extractSlideMetas) och
    // ska aldrig nå mallen/DOM:en — strippa den här.
    const rest = { ...props };
    delete rest.cutSkip;
    delete rest.slideId;
    // Klickstegen per slide (stegAv, hoppaSteg) läses av stegkontexten — se
    // lib/step-config.ts. Mallen ska inte se dem.
    delete rest.stegAv;
    delete rest.hoppaSteg;
    // Markordet — ett massivt ord som får plats i sin helhet bakom (eller
    // bredvid) innehållet. Läses ur props här och når aldrig mallen.
    // markAlign: bottom (default) | top. markOpacity: 0–1 (default 0,05 =
    // ljusgrå struktur; 1 = ordet är bilden). markTone: ink | accent.
    // Av/på per slide (R-lägets designflik): markHidden / symbolHidden /
    // figureHidden="true" släcker lagret utan att radera ordet eller bilden.
    const hiddenFlag = (v: unknown) => v === true || v === "true";
    const markHidden = hiddenFlag(rest.markHidden);
    const symbolHidden = hiddenFlag(rest.symbolHidden);
    const figureHidden = hiddenFlag(rest.figureHidden);
    delete rest.markHidden;
    delete rest.symbolHidden;
    delete rest.figureHidden;
    const mark = typeof rest.mark === "string" && !markHidden ? rest.mark.trim() : "";
    // bottom | top | center | right | left | stack-right | stack-left (se SlideMark)
    const markAlign: MarkAlign = normalizeMarkAlign(rest.markAlign);
    const markOpacityRaw = rest.markOpacity;
    const markOpacityNum =
      typeof markOpacityRaw === "string" ? parseFloat(markOpacityRaw) : (markOpacityRaw as number | undefined);
    const markOpacity =
      typeof markOpacityNum === "number" && !isNaN(markOpacityNum) ? Math.min(1, Math.max(0, markOpacityNum)) : 0.05;
    const markTone: "ink" | "accent" = rest.markTone === "accent" ? "accent" : "ink";
    // markLang: syr | ar | fa | ckb — markordet i rummets skrift (SlideMark).
    const markLang = typeof rest.markLang === "string" ? rest.markLang.trim() : undefined;
    // markStyle: solid (default) | outline — konturord (fyrfärgen: klotterkänsla).
    const markOutline = rest.markStyle === "outline";
    // markStyle="melt" — smältordet (betong): ordet rinner genom ett
    // förskjutningsfilter (MeltFilter). Tesen som form.
    const markMelt = rest.markStyle === "melt";
    // markStyle="skift" — registerförskjutningen (betong_natt): ordet trycks
    // tre gånger, cyan åt vänster och rött åt höger. Feltrycket som signatur.
    const markSkift = rest.markStyle === "skift";
    delete rest.markStyle;
    // Remsan: strip="Detta behöver eleverna veta om AI" stripAlign="l|r".
    const strip = typeof rest.strip === "string" ? rest.strip.trim() : "";
    const stripAlign = rest.stripAlign === "r" ? "r" : "l";
    delete rest.strip;
    delete rest.stripAlign;
    const stripNode = strip ? <SlideStrip text={strip} align={stripAlign} /> : null;
    // Skivan: disc="sol" discSize="72vh" discX="38" discY="50".
    const disc = typeof rest.disc === "string" ? rest.disc.trim() : rest.disc === true ? "sol" : "";
    const discSize = typeof rest.discSize === "string" ? rest.discSize : "72vh";
    const discX = typeof rest.discX === "string" ? parseFloat(rest.discX) : typeof rest.discX === "number" ? rest.discX : 38;
    const discY = typeof rest.discY === "string" ? parseFloat(rest.discY) : typeof rest.discY === "number" ? rest.discY : 50;
    for (const k of ["disc", "discSize", "discX", "discY"]) delete rest[k];
    const discNode = disc ? <SlideDisc tone={disc} size={discSize} x={Number.isFinite(discX) ? discX : 38} y={Number.isFinite(discY) ? discY : 50} /> : null;
    // Rastret: halftone="true" — bakgrundsbilden/videon i svartvitt med
    // hög kontrast och ett punktraster ovanpå (betong: affischtrycket).
    const halftone = rest.halftone === true || rest.halftone === "true";
    delete rest.halftone;
    const halftoneNode = halftone ? <div aria-hidden className="slide-halftone" style={{ position: "absolute", inset: 0, zIndex: -3 }} /> : null;
    // markScale: >1 gör ordet större än ytan så det beskärs av kanten
    // (fyrfärgen: jättetypografi à la ALTO ROASTERS). Default 1.
    const markScaleRaw = rest.markScale;
    const markScaleNum = typeof markScaleRaw === "string" ? parseFloat(markScaleRaw) : (markScaleRaw as number | undefined);
    const markScale = typeof markScaleNum === "number" && !isNaN(markScaleNum) && markScaleNum > 0 ? markScaleNum : 1;
    delete rest.markScale;
    // Löpremsan: ticker="Lära OM AI" — texten upprepad i en remsa som rullar
    // längs nederkanten (tickerAlign="top" för överkanten). Bläck på registrets
    // färg. Typografi och animation i globals.css (.slide-ticker).
    const ticker = typeof rest.ticker === "string" ? rest.ticker.trim() : "";
    const tickerAlign = rest.tickerAlign === "top" ? "top" : "bottom";
    delete rest.ticker;
    delete rest.tickerAlign;
    const tickerNode = ticker ? <SlideTicker text={ticker} align={tickerAlign} /> : null;
    // Tejpen: tape="§ OM · Under huven" — en färgad, lätt roterad remsa med
    // monotext uppe i hörnet. tapeAlign="tl|tr" · tapeTone="accent|ink|paper".
    const tape = typeof rest.tape === "string" ? rest.tape.trim() : "";
    const tapeAlign = rest.tapeAlign === "tr" ? "tr" : "tl";
    const tapeTone = typeof rest.tapeTone === "string" ? rest.tapeTone : "accent";
    delete rest.tape;
    delete rest.tapeAlign;
    delete rest.tapeTone;
    const tapeNode = tape ? <SlideTape text={tape} align={tapeAlign} tone={tapeTone} /> : null;
    // Ordet som bild (opacitet ≥ 0,5): innehållet får den övre delen av
    // sliden för sig själv, ordet den nedre — annars ligger de i varandra.
    const markHero = markOpacity >= 0.5;
    delete rest.mark;
    delete rest.markAlign;
    delete rest.markOpacity;
    delete rest.markTone;
    delete rest.markLang;
    // Registret — vilken mall som helst på kobalt eller natt. Tokens byts
    // via CSS-variabler på ett skal runt sliden; mallar som läser
    // var(--text)/var(--accent)/var(--bg-surface) följer med automatiskt.
    // PosterText bär sitt register som tone="kobalt|dark" på mallroten — men
    // mark/symbol/figure-skalet tömmer roten på bakgrund. Därför tolkas tone
    // som register här, så kobalten/natten målas på skalet i stället och
    // symboler får registrets färg. tone lämnas kvar till mallen.
    const toneRegister: RegisterName | null =
      rest.tone === "kobalt" ? "kobalt" : rest.tone === "dark" ? "natt" : rest.tone === "glod" ? "glod" : rest.tone === "barnsten" ? "barnsten" : null;
    const register: RegisterName | null =
      typeof rest.register === "string" && rest.register in REGISTERS ? (rest.register as RegisterName) : toneRegister;
    delete rest.register;
    // Symbolen: symbol="/bilder/symboler/x-mask.png" symbolAlign="r|l|tr|tl|br|bl|c"
    // symbolSize="40vh" symbolTone="ink|accent|paper" symbolOpacity="1"
    const symbol = typeof rest.symbol === "string" && !symbolHidden ? rest.symbol.trim() : "";
    const symbolAlign = typeof rest.symbolAlign === "string" ? rest.symbolAlign : "r";
    const symbolSize = typeof rest.symbolSize === "string" ? rest.symbolSize : "40vh";
    const symbolTone = typeof rest.symbolTone === "string" ? rest.symbolTone : "ink";
    const symbolOpacityRaw = rest.symbolOpacity;
    const symbolOpacityNum = typeof symbolOpacityRaw === "string" ? parseFloat(symbolOpacityRaw) : (symbolOpacityRaw as number | undefined);
    const symbolOpacity = typeof symbolOpacityNum === "number" && !isNaN(symbolOpacityNum) ? symbolOpacityNum : 1;
    delete rest.symbol;
    delete rest.symbolAlign;
    delete rest.symbolSize;
    delete rest.symbolTone;
    delete rest.symbolOpacity;
    const symbolX = typeof rest.symbolX === "string" ? parseFloat(rest.symbolX) : typeof rest.symbolX === "number" ? rest.symbolX : undefined;
    delete rest.symbolX;
    const symbolY = typeof rest.symbolY === "string" ? parseFloat(rest.symbolY) : typeof rest.symbolY === "number" ? rest.symbolY : undefined;
    delete rest.symbolY;
    // Figuren: figure="/bilder/…-cut.png" figureAlign="r|l|tr|tl|br|bl|c" figureSize="90vh"
    // figureFront (över innehållet) figureBleed="6vw" figureOpacity="1" figureRotate="-8"
    const figure = typeof rest.figure === "string" && !figureHidden ? rest.figure.trim() : "";
    const figureAlign = typeof rest.figureAlign === "string" ? rest.figureAlign : "r";
    const figureSize = typeof rest.figureSize === "string" ? rest.figureSize : "90vh";
    const figureFront = rest.figureFront === true || rest.figureFront === "true";
    const figureBleed = typeof rest.figureBleed === "string" ? rest.figureBleed : "0px";
    const figureOpacity = typeof rest.figureOpacity === "string" ? parseFloat(rest.figureOpacity) || 1 : typeof rest.figureOpacity === "number" ? rest.figureOpacity : 1;
    const figureRotate = typeof rest.figureRotate === "string" ? parseFloat(rest.figureRotate) || 0 : typeof rest.figureRotate === "number" ? rest.figureRotate : 0;
    for (const k of ["figure", "figureAlign", "figureSize", "figureFront", "figureBleed", "figureOpacity", "figureRotate"]) delete rest[k];
    const figureX = typeof rest.figureX === "string" ? parseFloat(rest.figureX) : typeof rest.figureX === "number" ? rest.figureX : undefined;
    delete rest.figureX;
    const figureY = typeof rest.figureY === "string" ? parseFloat(rest.figureY) : typeof rest.figureY === "number" ? rest.figureY : undefined;
    delete rest.figureY;
    const figureNode = figure ? (
      <SlideFigure src={figure} align={figureAlign} size={figureSize} front={figureFront} bleed={figureBleed} opacity={figureOpacity} rotate={figureRotate} x={Number.isFinite(figureX) ? figureX : undefined} y={Number.isFinite(figureY) ? figureY : undefined} />
    ) : null;
    const symbolNode = symbol ? (
      <SlideSymbol src={symbol} align={symbolAlign} size={symbolSize} tone={symbolTone} opacity={symbolOpacity} x={Number.isFinite(symbolX) ? symbolX : undefined} y={Number.isFinite(symbolY) ? symbolY : undefined} />
    ) : null;

    // Slidens props görs tillgängliga för EditableText, som slår upp
    // <fält>Color och sätter om --text för just sitt fält.
    //
    // MEN bara när sliden faktiskt HAR en fältfärg, och det är inte en
    // optimering. Providern byter elementets identitet: mallar som läser
    // props direkt av sina barn — Comparison hämtar title och children ur
    // varje ComparisonColumn — får då en provider i handen i stället för
    // kolumnen, och renderar tomma rutor. Utan färg satt lämnas trädet
    // exakt som det såg ut innan fältfärgerna fanns.
    const hasFieldColor =
      !isDataHolder &&
      Object.keys(rest).some(
        (k) => k.endsWith("Color") && typeof rest[k] === "string" && rest[k] !== "",
      );
    const slide = (node: React.ReactNode) => {
      const room = (content: React.ReactNode) => projectorId ? <div data-projector={projectorId} style={{ display: "contents" }}>{content}</div> : content;
      const inner = hasFieldColor ? (
        <SlideFieldStyleProvider props={rest}>{node}</SlideFieldStyleProvider>
      ) : (
        node
      );
      if (!register) return room(inner);
      return room(
        <div
          data-register={register}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            color: "var(--text)",
            ...(REGISTERS[register].vars as React.CSSProperties),
          }}
        >
          {/* Lagerordning på slidenivå (temaroten är stackningskontexten):
              register -4 · bild/video -3 · tint -2 · markord -1 ·
              FloatingImage layer="back" -1 (senare i DOM, alltså över ordet) ·
              innehåll i normalfas · symbol/figur 0 · figureFront 2 ·
              FloatingImage framför 10. Skalen får därför INTE isolera, och
              inga bakgrunder får ligga direkt på skalen (blockbakgrunder
              målas över negativa lager). */}
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -4 }}>
            <div className="register-fill" style={{ position: "absolute", inset: 0, background: REGISTERS[register].background }} />
            {/* Kornet — teman som vill ha risokorn på sina register sätter
                --register-noise/--register-noise-opacity (fyrfarg). */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "var(--register-noise, none)",
                backgroundSize: "160px",
                opacity: "var(--register-noise-opacity, 0)" as unknown as number,
                mixBlendMode: "multiply",
              }}
            />
            {/* Rutnätet — räknehäftet under cute-alismen. Färgen sätts av
                temat per register (--register-grid-ink), annars osynligt. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(var(--register-grid-ink, transparent) 1px, transparent 1px), linear-gradient(90deg, var(--register-grid-ink, transparent) 1px, transparent 1px)",
                backgroundSize: "var(--register-grid-size, 4vw) var(--register-grid-size, 4vw)",
                backgroundPosition: "center",
              }}
            />
          </div>
          {inner}
        </div>
      );
    };

    // Opt-in continuous rooms need the same shell even in windows without a
    // background. Otherwise image → no image changes the component's parent
    // and remounts its persistent objects despite the player's stable key.
    const bg = rest.background || (rest.sceneGroup ? "transparent" : undefined);
    // Konturordet utan bild: samma dubbla skal som suddgrenen, så att
    // mallrotens egen botten töms (CSS-regeln på data-slide-content) och
    // ordet får ligga mellan temats ark och innehållet. Med bild läggs
    // ordet ovanpå bilden i skalet nedan.
    if ((mark || symbol || figure || tape || ticker || strip || disc) && (typeof bg !== "string" || bg.trim() === "")) {
      return slide(
        <div
          className="slide-bg-shell slide-bg-video-shell"
          data-mark-shell=""
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -3 }}>
            <div style={{ position: "absolute", inset: 0, background: "var(--slide-base, var(--bg))" }} />
          </div>
          {mark ? <SlideMark text={mark} align={markAlign} opacity={markOpacity} tone={markTone} hero={markHero} lang={markLang} outline={markOutline} melt={markMelt}
              skift={markSkift} scale={markScale} /> : null}
          {discNode}
          {symbolNode}
          {figureNode}
          {tapeNode}
          {tickerNode}
          {stripNode}
          <div
            data-slide-content
            data-mark-hero={markHero ? "" : undefined}
            style={{
              // Ingen z-index: innehållet får inte bilda en egen stackningskontext,
              // så att en FloatingImage med layer="back" (z -1) kan lägga sig
              // under texten men över markordet. Symbol/figur (z 0) och
              // figureFront (z 2) ligger kvar där de låg.
              position: "relative",
              // Hero-läge delar ytan bara i de liggande lägena; stående/staplade
              // ord ligger längs kanten och behöver ingen egen zon.
              height: markHero && markAlign === "bottom" ? "60%" : markHero && markAlign === "top" ? "40%" : "100%",
              marginTop: markHero && markAlign === "top" ? "60%" : undefined,
            }}
          >
            <Component {...rest} />
          </div>
        </div>,
      );
    }
    if (typeof bg !== "string" || bg.trim() === "") {
      return slide(<Component {...rest} />);
    }
    // Oskärpa på bakgrunden (backgroundBlur, px). Bara bakgrundslagret
    // suddas — innehållet ligger alltid skarpt ovanpå. Lagret dras ut med
    // negativ inset så blur-kanternas genomskinlighet hamnar utanför sliden.
    const blurRaw = rest.backgroundBlur as number | string | undefined;
    const blurNum = typeof blurRaw === "string" ? parseFloat(blurRaw) : blurRaw;
    const hasBlur =
      typeof blurNum === "number" && !isNaN(blurNum) && blurNum > 0;
    const blurBleed = hasBlur ? `-${Math.ceil(blurNum * 2)}px` : "0";
    // Video-bakgrund: ingen mörk scrim, ingen tvingad textfärg — så mörk
    // slide-text läser på ljusa dagsljus-loopar.
    if (/\.(mp4|webm|mov)(\?|$)/i.test(bg)) {
      const ovRaw = rest.overlay as number | string | undefined;
      const ov = typeof ovRaw === "string" ? parseFloat(ovRaw) : ovRaw;
      const hasOv = typeof ov === "number" && !isNaN(ov) && ov > 0;
      const light = rest.overlayMode === "light";
      return slide(
        <div
          className="slide-bg-video-shell"
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          {/* Lagerordning i skalet: video -3, tint -2, back-overlays -1,
              innehåll i normalfas, figureFront 2. */}
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -3, filter: halftone ? HALFTONE_FILTER : undefined }}>
            {hasBlur ? (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: blurBleed,
                  filter: `blur(${blurNum}px)`,
                }}
              >
                <SlideBgVideo src={bg} poster={typeof rest.backgroundPoster === "string" ? rest.backgroundPoster : undefined} />
              </div>
            ) : (
              <SlideBgVideo src={bg} poster={typeof rest.backgroundPoster === "string" ? rest.backgroundPoster : undefined} />
            )}
          </div>
          {halftoneNode}
          {discNode}
          {hasOv ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: -2,
                background: light
                  ? `rgba(255,255,255,${ov})`
                  : `rgba(0,0,0,${ov})`,
              }}
            />
          ) : null}
          {/* Markordet saknades i videogrenen fram till 2026-09-03 (en föreläsning:
              OM-konturen på dividern med loop). */}
          {mark ? <SlideMark text={mark} align={markAlign} opacity={markOpacity} tone={markTone} hero={markHero} lang={markLang} outline={markOutline} melt={markMelt}
              skift={markSkift} scale={markScale} /> : null}
          <div data-slide-content style={{ position: "relative", height: "100%" }}>
            <Component {...rest} />
          </div>
          {/* Symbol och figur (z 0 / figureFront 2) saknades i videogrenen
              fram till 2026-09-03 (en föreläsning: skolbänken på rök-loopen). */}
          {symbolNode}
          {figureNode}
          {tapeNode}
          {tickerNode}
          {stripNode}
        </div>,
      );
    }
    // Suddad bild/färg: bakgrunden flyttas till ett eget lager (barnbarn, så
    // `.slide-bg-shell > *`-regeln inte nollar dess background) och innehållet
    // får en data-slide-content-wrapper vars barn töms på bakgrund via egen
    // CSS-regel — samma mönster som videogrenen.
    if (hasBlur) {
      // Dubbla skalklasser: video-klassens befintliga regel
      // `.slide-bg-video-shell [data-slide-content] > *` tömmer mallroten på
      // bakgrund — samma behov, noll ny CSS.
      return slide(
        <div
          className="slide-bg-shell slide-bg-video-shell"
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -3 }}>
            <div
              style={{
                position: "absolute",
                inset: blurBleed,
                background: buildBackgroundCss(
                  bg,
                  rest.overlay as number | string | undefined,
                  rest.overlayMode === "light" ? "light" : "dark",
                ),
                filter: `blur(${blurNum}px)`,
              }}
            />
          </div>
          <div
            data-slide-content
            style={{ position: "relative", height: "100%" }}
          >
            <Component {...rest} />
          </div>
        </div>,
      );
    }
    return slide(
      <div
        className="slide-bg-shell"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -3 }}>
          <div
            style={{
              position: "absolute",
              inset: halftone ? "-2.5%" : 0,
              background: buildBackgroundCss(
                bg,
                rest.overlay as number | string | undefined,
                rest.overlayMode === "light" ? "light" : "dark",
              ),
              filter: halftone ? HALFTONE_FILTER : undefined,
            }}
          />
        </div>
        {halftoneNode}
        {discNode}
        {mark ? (
          <SlideMark text={mark} align={markAlign} opacity={markOpacity} tone={markTone} hero={markHero} lang={markLang} outline={markOutline} melt={markMelt}
              skift={markSkift} scale={markScale} />
        ) : null}
        {symbolNode}
        {figureNode}
        {tapeNode}
        {tickerNode}
        {stripNode}
        <Component {...rest} />
      </div>,
    );
  };
  Wrapped.displayName = `withSlideBg(${Component.displayName ?? Component.name ?? "Component"})`;
  return Wrapped;
}

/**
 * Memoiserad variant för uppslagning under render.
 *
 * Cachen är funktionalitet, inte optimering: skapas en ny wrapper-komponent
 * vid varje render byter React identitet på hela slide-trädet, och då
 * remountas allt — videor startar om, framer-motion spelar om sina
 * entrances och inline-redigering tappar fokus mitt i en mening.
 */
const wrappedCache = new Map<SlideComponent, SlideComponent>();

export function wrapWithSlideBg(Component: SlideComponent): SlideComponent {
  const cached = wrappedCache.get(Component);
  if (cached) return cached;
  const wrapped = withSlideBg(Component);
  wrappedCache.set(Component, wrapped);
  return wrapped;
}
