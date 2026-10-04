"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * DualityReveal — hero-bild (tvåpanels-serie) som "växer fram" och sedan
 * utvecklas panel för panel via staged reveal, för att landa AI:ns dualitet:
 * genial över mänsklig nivå OCH fullständigt aningslös — och låter exakt
 * likadant i båda fallen.
 *
 *   Steg 0  Kicker + bild växer fram; översta panelen syns (det tvärsäkra svaret).
 *   Steg 1  (klick) Nedre panelen UTVECKLAS (täckskärmen glider undan) —
 *           konsekvensen. Stämningen kallnar (varm → kall bakgrund).
 *   Steg 2  (klick) Dualiteten kristalliseras: två chips (genial | aningslös)
 *           + payoff-rad.
 *
 * Mörk cinematisk botten (medvetet moment). Byggd för skärm/online.
 */

interface DualityRevealProps {
  image: string;
  alt?: string;
  /** Var de två panelerna delas (procent av bildhöjden). Default 50. */
  splitPercent?: number | string;
  kicker?: string;
  /** Vänster chip — det geniala. */
  brilliant?: string;
  /** Höger chip — det aningslösa. */
  clueless?: string;
  payoff?: string;
}

export function DualityReveal({
  image,
  alt = "",
  splitPercent = 50,
  kicker = "Samma modell. Samma självsäkerhet.",
  brilliant = "Över mänsklig nivå — juristexamen, kod, proteinveckning",
  clueless = "Ingen aning om den har rätt — och låter lika säker",
  payoff = "Den vet inte skillnaden.",
}: DualityRevealProps) {
  const step = useSlideSteps(3);
  const split =
    typeof splitPercent === "string" ? parseFloat(splitPercent) : splitPercent;
  const revealed = step >= 1;
  const dualityOn = step >= 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        // Stämning: varm (tvärsäkert) → kall (konsekvensen landat)
        background: revealed
          ? "radial-gradient(ellipse 120% 90% at 50% 40%, #12131f 0%, #070810 70%)"
          : "radial-gradient(ellipse 120% 90% at 50% 40%, #1b1710 0%, #0a0805 72%)",
        transition: "background 1.1s ease",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(1.8rem, 5vh, 3.2rem)",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.72rem, 1vw, 1rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(240,238,230,0.62)",
            zIndex: 5,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Bild som växer fram */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1rem, 2.4vh, 1.8rem)",
          padding: "clamp(4.5rem, 9vh, 6.5rem) 1rem clamp(2.5rem, 6vh, 4rem)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.86, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            // Wrappern krymper runt bilden (bilden är enda in-flow-barnet;
            // täckskärm + scanline är absolut) → täckskärmens `%` mappar
            // EXAKT mot bildens innehåll, ingen objectFit-beskärning som
            // förskjuter koordinaterna. `splitPercent` = faktisk bild-%.
            position: "relative",
            lineHeight: 0,
            borderRadius: "0.9rem",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: revealed
              ? "0 40px 90px -30px rgba(0,0,0,0.85), 0 0 60px -20px rgba(120,140,255,0.28)"
              : "0 40px 90px -30px rgba(0,0,0,0.8), 0 0 60px -20px rgba(255,180,90,0.28)",
            transition: "box-shadow 1.1s ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={alt}
            style={{
              // Storlek på bilden direkt (naturlig aspect, ingen objectFit) →
              // wrappern krymper runt den och täckskärmens % mappar exakt.
              // Dubbel-constraint: höjd i 16:9, bredd-cap för smala vyer.
              display: "block",
              height: "min(58vh, 46vw)",
              width: "auto",
              maxWidth: "92vw",
            }}
          />

          {/* Täckskärm över nedre panelen — glider undan vid steg 1 */}
          <motion.div
            aria-hidden
            initial={false}
            animate={{
              opacity: revealed ? 0 : 1,
              y: revealed ? "18%" : "0%",
            }}
            transition={{ duration: 0.95, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${100 - split}%`,
              background:
                "linear-gradient(180deg, rgba(8,8,12,0.7) 0%, #06060a 14%, #06060a 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Luminös scanline vid täckskärmens kant under avtäckningen */}
          <motion.div
            aria-hidden
            initial={false}
            animate={{ opacity: revealed ? 0 : 0.9 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${split}%`,
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, rgba(255,210,140,0.9), transparent)",
              boxShadow: "0 0 24px 3px rgba(255,190,110,0.55)",
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* Dualiteten: två chips + payoff (steg 2) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(0.6rem, 1.4vw, 1.1rem)",
            justifyContent: "center",
            alignItems: "stretch",
            maxWidth: "min(1000px, 94%)",
          }}
        >
          <DualChip
            on={dualityOn}
            delay={0.05}
            tone="brilliant"
            text={brilliant}
            path="brilliant"
          />
          <DualChip
            on={dualityOn}
            delay={0.18}
            tone="clueless"
            text={clueless}
            path="clueless"
          />
        </div>

        {payoff ? (
          <motion.div
            initial={false}
            animate={{
              opacity: dualityOn ? 1 : 0,
              y: dualityOn ? 0 : 8,
            }}
            transition={{ duration: 0.7, delay: dualityOn ? 0.32 : 0 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.15rem, 2.3vw, 2rem)",
              letterSpacing: "-0.015em",
              color: "rgba(244,242,236,0.96)",
              textAlign: "center",
              textShadow: "0 2px 30px rgba(0,0,0,0.6)",
            }}
          >
            <EditableText path="payoff" value={payoff}>
              {payoff}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function DualChip({
  on,
  delay,
  tone,
  text,
  path,
}: {
  on: boolean;
  delay: number;
  tone: "brilliant" | "clueless";
  text: string;
  path: string;
}) {
  const brilliant = tone === "brilliant";
  const color = brilliant ? "#5EE6A8" : "#F2955A";
  return (
    <motion.div
      initial={false}
      animate={{ opacity: on ? 1 : 0, x: on ? 0 : brilliant ? -16 : 16 }}
      transition={{ duration: 0.6, delay: on ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.7rem 1.05rem",
        borderRadius: "999px",
        border: `1px solid ${color}55`,
        background: `${color}14`,
        maxWidth: "clamp(18rem, 40%, 26rem)",
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: "1.5rem",
          height: "1.5rem",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          background: `${color}22`,
          color,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: "0.95rem",
        }}
      >
        {brilliant ? "✓" : "✕"}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.82rem, 1.1vw, 1.02rem)",
          lineHeight: 1.3,
          color: "rgba(244,242,236,0.92)",
        }}
      >
        <EditableText path={path} value={text}>
          {text}
        </EditableText>
      </span>
    </motion.div>
  );
}
