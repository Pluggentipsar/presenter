"use client";

import { motion } from "framer-motion";

interface NamedPortraitProps {
  /** Porträttets bildpath */
  image: string;
  /** Alt-text */
  alt?: string;
  /** Namn som rullar långsamt i bakgrunden */
  name: string;
  /** Fotobakgrund (path) — t.ex. /bilder/min-bild.jpg */
  background?: string;
  /** Mörk overlay 0-1, default 0.55 */
  darken?: number;
  /** Sekunder per rullning — default 40 (lugnt) */
  scrollDuration?: number;
  /** Rullningsriktning */
  direction?: "left" | "right";
}

/**
 * Porträtt centrerat, med namnet gigantiskt rullande som ambient vattenstämpel
 * bakom. Fotobakgrund med mjuk mörk overlay. Bra för att introducera en
 * person som sedan återkommer i flera slides — namnet "ekar" som en
 * igenkänningssignal.
 */
export function NamedPortrait({
  image,
  alt = "",
  name,
  background = "",
  darken = 0.55,
  scrollDuration = 40,
  direction = "left",
}: NamedPortraitProps) {
  // Upprepa namnet så det alltid är synligt på skärmen under loopen
  const repeatedName = Array(8).fill(name).join(" · ") + " · ";

  // För sömlös loop: animera exakt -50% (halva den dubblerade texten)
  const scrollFrom = direction === "left" ? "0%" : "-50%";
  const scrollTo = direction === "left" ? "-50%" : "0%";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Fotobakgrund */}
      {background ? (
        <img
          src={background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: "cover" }}
        />
      ) : null}

      {/* Mörk overlay för läsbarhet och atmosfär */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(10,9,8,${Math.max(0, darken - 0.15)}) 0%, rgba(10,9,8,${darken}) 65%, rgba(10,9,8,${Math.min(0.9, darken + 0.12)}) 100%)`,
        }}
      />

      {/* Namnet som rullar i bakgrunden */}
      <motion.div
        initial={{ x: scrollFrom }}
        animate={{ x: scrollTo }}
        transition={{
          duration: scrollDuration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(14rem, 44vh, 30rem)",
          lineHeight: 0.85,
          letterSpacing: "-0.04em",
          color: "rgba(247,241,230,0.12)",
          pointerEvents: "none",
          zIndex: 1,
          willChange: "transform",
        }}
      >
        <span style={{ display: "inline-block", paddingRight: "2rem" }}>
          {repeatedName}
        </span>
        <span style={{ display: "inline-block", paddingRight: "2rem" }}>
          {repeatedName}
        </span>
      </motion.div>

      {/* Porträtt botten-justerat, kant i kant med nedre skärmkanten */}
      <div
        className="relative h-full w-full flex items-end justify-center"
        style={{ zIndex: 2 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src={image}
            alt={alt || name}
            style={{
              display: "block",
              maxHeight: "95vh",
              maxWidth: "min(90vw, 900px)",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
