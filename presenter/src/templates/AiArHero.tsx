"use client";

import { motion } from "framer-motion";
import { AiArBackdrop } from "./AiArMedia";

/**
 * Öppningsslide för AI-är-sektionen. "AI är…" i gigantisk storlek,
 * centrerad, med tre pulserande prickar som antyder "många möjliga
 * fortsättningar". Använd som första slide i sektionen; de följande
 * sliderna håller "AI är…" kvar i top-left som visuellt ankare.
 */
export function AiArHero() {
  return (
    <div
      className="relative h-full w-full flex items-center justify-center"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)", overflow: "hidden" }}
    >
      <AiArBackdrop />

      <motion.h1
        initial={{ opacity: 0, y: 30, letterSpacing: "0.04em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "-0.025em" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(5.5rem, 18vw, 17rem)",
          lineHeight: 1,
          color: "var(--text)",
          margin: 0,
          display: "flex",
          alignItems: "baseline",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span>AI är</span>
        <span style={{ display: "inline-flex", marginLeft: "0.08em" }}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: 0.9 + i * 0.22,
                ease: "easeInOut",
              }}
              style={{ display: "inline-block", color: "#B4763A" }}
            >
              .
            </motion.span>
          ))}
        </span>
      </motion.h1>
    </div>
  );
}
