"use client";

import { EditableText } from "@/lib/inline-edit";

/**
 * PosterQuote ★ — citatet som klistrad remsa (betong, 2026-09-04).
 *
 * Elevrösterna och AGI-citatet: ett vridet accentblock med citatet i papper,
 * attributionen i mono under, kickern uppe till vänster. Samma remsa som på
 * PosterDivider, så förspelet hänger ihop med akterna. Figuren (eleven,
 * megafonen) läggs på sliden med figure= och står till höger om blocket.
 *
 * ```mdx
 * <PosterQuote kicker="Skolgården · måndag"
 *   quote="Min storebror sa det var AI men det såg ju riktigt ut alltså."
 *   attribution="Pojke, åk 5 · till sin kompis" register="tavla"
 *   figure="/bilder/mitt-deck/bet-megafon-986-986-1-cut.png" figureAlign="r" figureSize="44vh" figureX="84" figureY="62" />
 * ```
 */

interface PosterQuoteProps {
  kicker?: string;
  quote: string;
  attribution?: string;
  /** Mono-rad uppe till höger (| = radbrytning). */
  meta?: string;
  /** Blockets bredd. Default 60vw. */
  width?: string;
  /** Lutning i grader. Default −3. */
  tilt?: string | number;
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.62rem, 1.05vw, 1.15rem)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

export function PosterQuote({ kicker, quote, attribution, meta, width = "60vw", tilt = -3 }: PosterQuoteProps) {
  const paper = "var(--slide-paper, #e7e2d6)";
  const deg = typeof tilt === "string" ? parseFloat(tilt) || 0 : tilt;
  const metaLines = (meta ?? "").split("|").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}>
      {kicker ? (
        <div style={{ ...mono, position: "absolute", top: "4vh", left: "4vw", zIndex: 5, color: "var(--accent)" }}>
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}
      {metaLines.length ? (
        <div style={{ ...mono, position: "absolute", top: "4vh", right: "3vw", textAlign: "right", zIndex: 5 }}>
          {metaLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}

      {/* Remsan */}
      <div
        style={{
          position: "absolute",
          left: "6vw",
          top: "50%",
          width,
          transform: `translateY(-50%) rotate(${deg}deg)`,
          transformOrigin: "left center",
          background: "var(--accent)",
          color: paper,
          padding: "2.8vw 3.2vw 2.4vw",
          zIndex: 3,
        }}
      >
        <div
          aria-hidden
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontStretch: "125%",
            fontSize: "7vw",
            lineHeight: 0.5,
            letterSpacing: "-0.04em",
            opacity: 0.55,
            marginBottom: "0.6vw",
          }}
        >
          ”
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontStretch: "96%",
            fontSize: "clamp(1.4rem, 3.4vw, 3.8rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          <EditableText path="quote" value={quote}>
            {quote}
          </EditableText>
        </div>
        {attribution ? (
          <div style={{ ...mono, marginTop: "1.6vw", opacity: 0.85 }}>
            — <EditableText path="attribution" value={attribution}>{attribution}</EditableText>
          </div>
        ) : null}
      </div>

      <i aria-hidden style={{ position: "absolute", top: "1.6vw", right: "1.6vw", width: "2.2vw", height: "2.2vw", borderTop: "1px solid currentColor", borderRight: "1px solid currentColor", zIndex: 5 }} />
      <i aria-hidden style={{ position: "absolute", bottom: "1.6vw", left: "1.6vw", width: "2.2vw", height: "2.2vw", borderBottom: "1px solid currentColor", borderLeft: "1px solid currentColor", zIndex: 5 }} />
    </div>
  );
}
