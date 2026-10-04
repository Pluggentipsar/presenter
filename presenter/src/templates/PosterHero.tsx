"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";
import { MeltFilter, MELT_FILTER_ID } from "@/components/MeltFilter";

/**
 * PosterHero ★ — ordet som affisch (betong, 2026-09-04).
 *
 * Ett ord så stort att slidekanten skär det, i bred massiv Archivo. Figuren
 * (figure= på sliden) står FRAMFÖR ordet, texten ligger nere till vänster.
 * `wordStyle="melt"` låter ordet smälta (tesen: AI tar bort MOTSTÅND),
 * `"skift"` ger registerförskjutning (betong_natt: feltrycket som signatur),
 * `"outline"` ger kontur. En liten rad ovanför ordet med `kicker`, mono-
 * meta i hörnen med `chapter` (tl) och `meta` (tr, | = radbrytning).
 *
 * Raderna (children) avslöjas klick för klick:
 *   - Era elever pratar om AI. Men de pratar kanske inte om **samma sak.**
 *   - Ibland är det avlastning. :: l
 *   - Ibland var motståndet hela poängen. :: r
 * Utan flagga = stort block nere till vänster. `:: l` / `:: r` = två små
 * spalter längs underkanten (affischens bildtext).
 *
 * ```mdx
 * <PosterHero word="Pratar" chapter="§ Anslaget" meta="Stadshuset · 15–16 | Grundskolan F–9"
 *   strip="Detta behöver eleverna veta om AI · Konferensen · 2026"
 *   figure="/bilder/mitt-deck/bet-elev-964-964-1-cut.png" figureAlign="br" figureSize="82vh" figureX="72" figureY="52">
 * - Era elever pratar om AI. Men de pratar kanske inte om **samma sak.**
 * </PosterHero>
 * ```
 */

type Slot = "lead" | "l" | "r";
interface Line {
  text: string;
  slot: Slot;
}

interface PosterHeroProps {
  word: string;
  wordStyle?: "solid" | "outline" | "melt" | "skift";
  /** Ordets storlek i vw. Default 27 (solid), 15.5 (melt). */
  wordSize?: string | number;
  /** Ordets överkant i vh. Default 12 (solid), 33 (melt). */
  wordTop?: string | number;
  /** Ordets vänsterkant i vw. Default 1.2 — 5 om sliden har strip=. */
  wordLeft?: string | number;
  /** Liten rad ovanför ordet ("AI tar bort"). */
  kicker?: string;
  chapter?: string;
  meta?: string;
  /** Promptkort: papper, bläckkant, accentskugga. Ligger under ordet till vänster. */
  prompt?: string;
  /** Etikett på promptkortet, t.ex. "Prompt · Suno". Default "Prompt". */
  promptModel?: string;
  /** Kortets överkant i vh. Default 52. */
  promptTop?: string | number;
  /** Bildpanel till höger, framför ordet: bläckkant, accentskugga, behåller färg. Kommer på första klicket. */
  image?: string;
  imageAlt?: string;
  /** Panelens aspect-ratio. Default "5 / 4". */
  imageAspect?: string;
  /** Mono-etikett under bilden. */
  imageLabel?: string;
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

function parseLines(children: ReactNode): Line[] {
  const out: Line[] = [];
  const add = (raw: string) => {
    const [text, flag] = raw.split("::").map((s) => s.trim());
    if (!text) return;
    out.push({ text, slot: flag === "l" || flag === "r" ? flag : "lead" });
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

/** "… om **samma sak.**" → spans; fett = accent OCH bredare snitt (aldrig bara färg). */
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

const num = (v: string | number | undefined, d: number) => {
  if (v === undefined) return d;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : d;
};

export function PosterHero({ word, wordStyle = "solid", wordSize, wordTop, wordLeft, kicker, chapter, meta, prompt, promptModel = "Prompt", promptTop, image, imageAlt, imageAspect = "5 / 4", imageLabel, children }: PosterHeroProps) {
  const lines = parseLines(children);
  const hasImage = !!image;
  // Med bild: klick 1 = bilden, sedan raderna.
  const step = useSlideSteps(lines.length + 1 + (hasImage ? 1 : 0));
  const lineOffset = hasImage ? 1 : 0;
  const imageShown = hasImage && step >= 1;
  const melt = wordStyle === "melt";
  const outline = wordStyle === "outline";
  // Registerförskjutningen (betong_natt): ordet trycks tre gånger, cyan åt
  // vänster och rött åt höger. Ren CSS — .poster-word-skift i globals.css.
  // På de ljusa temana gör klassen ingenting, så propen är ofarlig.
  const skift = wordStyle === "skift";
  const size = num(wordSize, melt ? 15.5 : 23);
  const top = num(wordTop, melt ? 33 : 12);
  const left = num(wordLeft, melt ? 3.6 : 1.2);
  const metaLines = (meta ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const lead = lines.filter((l) => l.slot === "lead");
  const cols = lines.filter((l) => l.slot !== "lead");
  // Spalterna är två bottenförankrade flexkolumner — rader som radbryts kan
  // därför aldrig lägga sig på varandra. Ledblocket lyfts ovanför den högsta
  // spalten; höjden uppskattas ur teckenantalet eftersom vi inte kan mäta.
  // Kolumnen är 22 vw bred, vilket rymmer ungefär 26 tecken per rad.
  const colHeight = (slot: "l" | "r") =>
    cols
      .filter((c) => c.slot === slot)
      .reduce((sum, c) => sum + Math.ceil(c.text.replace(/\*/g, "").length / 26) * 3.3 + 1.4, 0);
  const colsBlock = cols.length ? Math.max(colHeight("l"), colHeight("r")) : 0;
  const leadBase = colsBlock > 0 ? 8 + colsBlock + 3 : 9;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}>
      {melt ? <MeltFilter /> : null}

      {chapter ? (
        <div style={{ ...mono, position: "absolute", top: "3vh", left: "5vw", zIndex: 5 }}>
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}
      {metaLines.length ? (
        <div style={{ ...mono, position: "absolute", top: "3vh", right: "3vw", textAlign: "right", zIndex: 5 }}>
          {metaLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}

      {kicker ? (
        <div
          style={{
            position: "absolute",
            left: `${left + 1.4}vw`,
            top: `${Math.max(top - 20, chapter ? 9 : 4)}vh`,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontStretch: "100%",
            fontSize: "3.8vw",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}

      {/* Ordet */}
      <div
        aria-hidden
        className={skift ? "poster-word-skift" : undefined}
        data-word={skift ? word : undefined}
        style={{
          position: "absolute",
          left: `${left}vw`,
          top: `${top}vh`,
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontStretch: melt ? "108%" : "125%",
          fontSize: `${size}vw`,
          lineHeight: melt ? 0.85 : 0.8,
          letterSpacing: "-0.05em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: outline ? "transparent" : skift ? undefined : "var(--text)",
          WebkitTextStroke: outline ? "0.35vw var(--text)" : undefined,
          filter: melt ? `url(#${MELT_FILTER_ID})` : undefined,
          zIndex: 1,
        }}
      >
        {word}
      </div>

      {/* Bildpanelen */}
      {hasImage ? (
        <div
          style={{
            position: "absolute",
            right: "5vw",
            top: "14vh",
            width: "38vw",
            zIndex: 3,
            opacity: imageShown ? 1 : 0,
            transform: imageShown ? "none" : "translateY(16px)",
            transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}`,
          }}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: imageAspect, border: "2px solid var(--text)", boxShadow: "0.6vw 0.6vw 0 var(--accent)", overflow: "hidden", background: "var(--bg-surface)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-keep-color="" src={image} alt={imageAlt ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {imageLabel ? <div style={{ ...mono, marginTop: "0.8vh", textAlign: "right", opacity: 0.7 }}>{imageLabel}</div> : null}
        </div>
      ) : null}

      {/* Promptkortet */}
      {prompt ? (
        <div
          style={{
            position: "absolute",
            left: "8vw",
            top: `${num(promptTop, 52)}vh`,
            width: "40vw",
            background: "var(--slide-paper, #e7e2d6)",
            color: "var(--slide-ink, #121210)",
            border: "2px solid var(--slide-ink, #121210)",
            boxShadow: "0.5vw 0.5vw 0 var(--accent)",
            padding: "1.1vw 1.4vw 1.2vw",
            zIndex: 3,
          }}
        >
          <div style={{ ...mono, fontSize: "clamp(0.55rem, 0.85vw, 0.95rem)", marginBottom: "0.5vw", display: "flex", alignItems: "center", gap: "0.6em" }}>
            <span aria-hidden style={{ width: "0.6em", height: "0.6em", background: "var(--accent)", display: "inline-block" }} />
            {promptModel}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 1.5vw, 1.7rem)", lineHeight: 1.3, fontWeight: 500 }}>
            <EditableText path="prompt" value={prompt}>
              {prompt}
            </EditableText>
          </div>
        </div>
      ) : null}

      {/* Ledblocket */}
      {lead.map((l, i) => {
        const shown = i + lineOffset < step;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "8vw",
              bottom: `${leadBase + i * 14}vh`,
              width: "44vw",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontStretch: "92%",
              // Långa ledrader (över ~90 tecken) går ned en grad så de inte
              // kolliderar med promptkortet.
              fontSize: l.text.length > 90 ? "2.4vw" : "3.1vw",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              textWrap: "balance",
              zIndex: 3,
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(14px)",
              transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
            }}
          >
            {bold(l.text)}
          </div>
        );
      })}

      {/* Spalterna längs underkanten — en flexkolumn per sida */}
      {(["l", "r"] as const).map((slot) =>
        cols.some((c) => c.slot === slot) ? (
          <div
            key={slot}
            style={{
              position: "absolute",
              bottom: "8vh",
              left: slot === "l" ? "5vw" : "32vw",
              width: "22vw",
              display: "flex",
              flexDirection: "column",
              gap: "1.4vh",
              zIndex: 4,
            }}
          >
            {cols.map((l, i) => {
              if (l.slot !== slot) return null;
              const shown = lead.length + i + lineOffset < step;
              return (
                <div
                  key={`c${i}`}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.85rem, 1.55vw, 1.7rem)",
                    lineHeight: 1.3,
                    fontWeight: 600,
                    opacity: shown ? 1 : 0,
                    transform: shown ? "none" : "translateY(10px)",
                    transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
                  }}
                >
                  {bold(l.text)}
                </div>
              );
            })}
          </div>
        ) : null,
      )}

      <i aria-hidden style={{ position: "absolute", top: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: "1px solid currentColor", borderRight: "1px solid currentColor", zIndex: 5 }} />
      <i aria-hidden style={{ position: "absolute", bottom: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderBottom: "1px solid currentColor", borderRight: "1px solid currentColor", zIndex: 5 }} />
    </div>
  );
}
