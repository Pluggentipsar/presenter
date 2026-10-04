"use client";

/**
 * Memphis-riso-decorations: riso-noise overlay + corner-ornaments.
 *
 * Renderas alltid i DOM:n men är gated via CSS-selektor `[data-theme="memphis_riso"]`
 * — dvs de visas bara när det aktiva temat (frontmatter ELLER M-tangent-override)
 * är memphis_riso. När användaren byter till t.ex. konjak eller minimal
 * via M-menyn försvinner alla memphis-dekorationer automatiskt eftersom
 * `data-theme`-attributet på `SlideViewer` byts.
 *
 * Användning: rendera <MemphisDecorations /> som första barn inuti slide:ns
 * relative-wrapper. variant väljer ornament-uppsättning (card/compare/grid/voice)
 * per slide så att inte alla memphis-slides ser identiska ut.
 */

const PINK = "#FF4F8B";
const BLUE = "#2E5FFF";
const INK = "#1A1A1A";
const YELLOW = "#FFD23F";

type Variant = "card" | "compare" | "grid" | "voice";

interface MemphisDecorationsProps {
  variant?: Variant;
}

export function MemphisDecorations({ variant = "card" }: MemphisDecorationsProps) {
  return (
    <div className="memphis-decorations" aria-hidden>
      {/* Riso-noise overlay — opacity styrs av --noise-opacity (0 default) */}
      <div
        className="memphis-riso-noise pointer-events-none absolute inset-0 mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Variant-specifika ornament — synliga bara på memphis_riso via globals.css */}
      <div className="memphis-ornaments pointer-events-none absolute inset-0">
        {variant === "card" && <CardOrnaments />}
        {variant === "compare" && <CompareOrnaments />}
        {variant === "grid" && <GridOrnaments />}
        {variant === "voice" && <VoiceOrnaments />}
      </div>
    </div>
  );
}

function CardOrnaments() {
  return (
    <>
      {/* Stor blå halvcirkel höger */}
      <div
        className="absolute"
        style={{
          right: "-8%",
          top: "-10%",
          width: "26%",
          aspectRatio: "1",
          background: BLUE,
          borderRadius: "50%",
          opacity: 0.1,
        }}
      />
      {/* Pink prick uppe vänster */}
      <div
        className="absolute rounded-full"
        style={{
          left: "8%",
          top: "9%",
          width: "1vw",
          aspectRatio: "1",
          background: PINK,
        }}
      />
      {/* Liten triangel nere höger */}
      <svg
        className="absolute"
        style={{ right: "4%", bottom: "8%", width: "8%" }}
        viewBox="0 0 100 100"
      >
        <polygon
          points="50,10 90,85 10,85"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          opacity="0.45"
        />
      </svg>
    </>
  );
}

function CompareOrnaments() {
  return (
    <>
      {/* Pink halvcirkel uppe vänster */}
      <div
        className="absolute"
        style={{
          left: "-6%",
          top: "-8%",
          width: "20%",
          aspectRatio: "1",
          background: PINK,
          borderRadius: "50%",
          opacity: 0.12,
        }}
      />
      {/* Blå prick uppe höger */}
      <div
        className="absolute rounded-full"
        style={{
          right: "8%",
          top: "9%",
          width: "1vw",
          aspectRatio: "1",
          background: BLUE,
        }}
      />
      {/* Zig-zag botten vänster */}
      <svg
        className="absolute"
        style={{ left: "3%", bottom: "5%", width: "9%" }}
        viewBox="0 0 100 30"
      >
        <polyline
          points="2,25 18,5 34,25 50,5 66,25 82,5 98,25"
          fill="none"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </>
  );
}

function GridOrnaments() {
  return (
    <>
      {/* Gul cirkel uppe höger */}
      <div
        className="absolute"
        style={{
          right: "-7%",
          top: "-9%",
          width: "22%",
          aspectRatio: "1",
          background: YELLOW,
          borderRadius: "50%",
          opacity: 0.18,
        }}
      />
      {/* Pink ring nere vänster */}
      <div
        className="absolute"
        style={{
          left: "-5%",
          bottom: "-10%",
          width: "18%",
          aspectRatio: "1",
          border: `8px solid ${PINK}`,
          borderRadius: "50%",
          opacity: 0.22,
        }}
      />
      {/* Blå triangel mitten höger */}
      <svg
        className="absolute"
        style={{ right: "5%", top: "44%", width: "5%" }}
        viewBox="0 0 100 100"
      >
        <polygon points="50,12 90,85 10,85" fill={BLUE} opacity="0.28" />
      </svg>
    </>
  );
}

function VoiceOrnaments() {
  return (
    <>
      {/* Pink cirkel uppe vänster */}
      <div
        className="absolute"
        style={{
          left: "-4%",
          top: "-6%",
          width: "16%",
          aspectRatio: "1",
          background: PINK,
          borderRadius: "50%",
          opacity: 0.12,
        }}
      />
      {/* Pink prick uppe höger */}
      <div
        className="absolute rounded-full"
        style={{
          right: "6%",
          top: "8%",
          width: "1vw",
          aspectRatio: "1",
          background: PINK,
        }}
      />
      {/* Triangel nere vänster */}
      <svg
        className="absolute"
        style={{ left: "4%", bottom: "10%", width: "6%" }}
        viewBox="0 0 100 100"
      >
        <polygon
          points="50,10 90,85 10,85"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          opacity="0.4"
        />
      </svg>
    </>
  );
}
