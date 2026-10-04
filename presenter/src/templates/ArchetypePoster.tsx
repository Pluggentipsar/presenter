"use client";

import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * ArchetypePoster ★ — en arketyp som affisch (betong_natt, 2026-09-04).
 *
 * Nattversionen av `ArchetypeProfile` från en keynote. Samma innehållsfält, men
 * i affischgrammatiken: numret som jättekontur, namnet med registerförskjutning,
 * säger/döljer som två tryckta block, rasterfoto till höger. Nytt fält är
 * `echo` — en röst ur juli-incidenten som visar arketypen i vilt tillstånd. Det
 * är den som binder ihop akt 1 med öppningssliden.
 *
 * Fyra klick: namnet ligger, sedan säger, sedan döljer, sedan ekot.
 *
 * ```mdx
 * <ArchetypePoster
 *   number="01" name="Frälsaren"
 *   tagline="AI ska lösa de stora problemen — klimatet, cancern, framtiden själv."
 *   habitat="Bor i konferenstal · regeringspromemorior"
 *   says="Altmans magic intelligence in the sky…"
 *   hides="Vem räddningen är till för. Vem som betalar."
 *   echo="OpenAI om Astra: the world's most intelligent and aligned model."
 *   echoLabel="I juli lät den så här"
 *   image="/bilder/mitt-deck/fralsaren.png"
 *   imageCaption="Dario Amodei · Anthropic"
 *   sources="Altman · Amodei · EU-toppmötet"
 * />
 * ```
 */

interface ArchetypePosterProps {
  /** "01"…"06". Sätts som jättekontur bakom namnet. */
  number: string;
  name: string;
  /** En mening under namnet. */
  tagline?: string;
  /** Mono-rad uppe till höger — var berättelsen bor. */
  habitat?: string;
  says: string;
  hides: string;
  /** Rösten ur juli-incidenten. Kommer sist, i accentfärg. */
  echo?: string;
  /** Etikett över ekot. Default "Så lät den i juli". */
  echoLabel?: string;
  /** Rad om vad arketypen gör med en lektion — den pedagogiska nyttolasten. */
  lesson?: string;
  image?: string;
  imageCaption?: string;
  sources?: string;
  /** Mono-etikett uppe till vänster. Default "§ Sex berättelser". */
  chapter?: string;
  saysLabel?: string;
  hidesLabel?: string;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.58rem, 0.95vw, 1rem)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

/** "**ord**" → fetare snitt OCH accent — aldrig bara färg. */
function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    return m ? (
      <strong key={i} style={{ color: "var(--accent)", fontWeight: 700, fontStretch: "112%" }}>
        {m[1]}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    );
  });
}

export function ArchetypePoster({
  number,
  name,
  tagline,
  habitat,
  says,
  hides,
  echo,
  echoLabel = "Så lät den i juli",
  lesson,
  image,
  imageCaption,
  sources,
  chapter = "§ Sex berättelser",
  saysLabel = "Vad berättelsen säger",
  hidesLabel = "Vad berättelsen döljer",
}: ArchetypePosterProps) {
  // 0 namnet · 1 säger · 2 döljer · 3 ekot (och lektionsraden)
  const step = useSlideSteps(4);

  const block = (
    label: string,
    body: string,
    shown: boolean,
    alert: boolean,
  ): React.ReactNode => (
    <div
      style={{
        border: `2px solid ${alert ? "var(--accent-alert)" : "var(--text)"}`,
        background: alert ? "color-mix(in srgb, var(--accent-alert) 10%, transparent)" : "transparent",
        padding: "1.6vh 1.3vw 1.9vh",
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`,
      }}
    >
      <div style={{ ...mono, color: alert ? "var(--accent-alert)" : "var(--accent)", marginBottom: "1.1vh" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: body.length > 340 ? "clamp(0.72rem, 1.02vw, 1.1rem)" : "clamp(0.78rem, 1.15vw, 1.25rem)",
          lineHeight: 1.42,
        }}
      >
        {bold(body)}
      </div>
    </div>
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Numret som jättekontur, bakom allt */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: image ? "31vw" : "4vw",
          top: "-6vh",
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontStretch: "125%",
          fontSize: "42vh",
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: "2px var(--text)",
          opacity: 0.16,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        {number}
      </div>

      {/* Mono-hörnen */}
      <div style={{ ...mono, position: "absolute", top: "4.5vh", left: "5vw", zIndex: 6, color: "var(--accent)" }}>
        <EditableText path="chapter" value={chapter}>
          {chapter}
        </EditableText>
      </div>
      {habitat ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "4.5vh",
            right: "5vw",
            maxWidth: "44vw",
            textAlign: "right",
            opacity: 0.6,
            zIndex: 6,
          }}
        >
          {habitat}
        </div>
      ) : null}

      {/* Vänsterspalten */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          top: "13vh",
          width: image ? "58vw" : "90vw",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "2.2vh",
        }}
      >
        <div>
          <div
            className="poster-word-skift"
            data-word={name}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontStretch: "118%",
              fontSize: `${Math.min(8.6, 52 / Math.max(name.length * 0.66, 1))}vw`,
              lineHeight: 0.86,
              letterSpacing: "-0.035em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          {tagline ? (
            <div
              style={{
                marginTop: "1.5vh",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.9rem, 1.42vw, 1.6rem)",
                lineHeight: 1.3,
                maxWidth: "46ch",
                opacity: 0.88,
              }}
            >
              {tagline}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4vw" }}>
          {block(saysLabel, says, step >= 1, false)}
          {block(hidesLabel, hides, step >= 2, true)}
        </div>

        {lesson ? (
          <div
            style={{
              ...mono,
              letterSpacing: "0.14em",
              textTransform: "none",
              fontSize: "clamp(0.66rem, 1.02vw, 1.08rem)",
              opacity: step >= 3 ? 0.72 : 0,
              transition: `opacity 0.5s ${EASE}`,
            }}
          >
            I klassrummet: {lesson}
          </div>
        ) : null}
      </div>

      {/* Bildpanelen */}
      {image ? (
        <div style={{ position: "absolute", right: "5vw", top: "15vh", width: "26vw", zIndex: 4 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 5",
              border: "2px solid var(--text)",
              boxShadow: "0.55vw 0.55vw 0 var(--accent)",
              overflow: "hidden",
              background: "var(--bg-surface)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={imageCaption ?? name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.15) brightness(0.9)" }}
            />
            <div aria-hidden className="slide-halftone" style={{ position: "absolute", inset: 0 }} />
          </div>
          {imageCaption ? (
            <div style={{ ...mono, marginTop: "1vh", opacity: 0.6, textAlign: "right", letterSpacing: "0.14em" }}>
              {imageCaption}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Ekot ur juli-incidenten */}
      {echo ? (
        <div
          style={{
            position: "absolute",
            left: "5vw",
            right: "5vw",
            bottom: "5vh",
            zIndex: 6,
            borderTop: "2px solid var(--accent)",
            paddingTop: "1.5vh",
            opacity: step >= 3 ? 1 : 0,
            transform: step >= 3 ? "none" : "translateY(12px)",
            transition: `opacity 0.55s ${EASE}, transform 0.55s ${EASE}`,
          }}
        >
          <div style={{ ...mono, color: "var(--accent)", marginBottom: "0.7vh" }}>{echoLabel}</div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.86rem, 1.32vw, 1.45rem)",
              lineHeight: 1.34,
              maxWidth: "82ch",
            }}
          >
            {bold(echo)}
          </div>
        </div>
      ) : sources ? (
        <div style={{ ...mono, position: "absolute", left: "5vw", bottom: "5vh", opacity: 0.5, zIndex: 6 }}>
          {sources}
        </div>
      ) : null}
    </div>
  );
}
