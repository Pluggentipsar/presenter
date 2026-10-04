"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { AiArBackdrop, AiArLabel, Spotlight } from "./AiArMedia";

interface RealOrFakeProps {
  leftImage: string;
  leftName: string;
  rightImage: string;
  rightName: string;
  /** Vilken sida är den faktiska personen (den som gråas ut) */
  realSide: "left" | "right";
  /** Frågan som visas överst på step 0 */
  question?: string;
  /** Text under den riktiga personen efter reveal */
  realLabel?: string;
  /** Text under AI-influencern efter reveal */
  fakeLabel?: string;
  /** "AI är…"-ankare, default "AI är…" */
  label?: string;
}

/**
 * Två porträtt sida vid sida. Publiken gissar vilken som är på riktigt;
 * vid stega-framåt gråas den riktiga ner och AI-influencern förstoras med
 * avslöjande etiketter. 2 steg.
 */
export function RealOrFake({
  leftImage,
  leftName,
  rightImage,
  rightName,
  realSide,
  question = "Vilken är på riktigt?",
  realLabel = "Faktisk person",
  fakeLabel = "Syntetisk · AI",
  label = "AI är…",
}: RealOrFakeProps) {
  const step = useSlideSteps(2);
  const revealed = step >= 1;

  const leftIsReal = realSide === "left";
  const leftRevealed = leftIsReal ? { text: realLabel, isReal: true } : { text: fakeLabel, isReal: false };
  const rightRevealed = leftIsReal ? { text: fakeLabel, isReal: false } : { text: realLabel, isReal: true };

  return (
    <div
      className="relative h-full w-full flex flex-col"
      style={{
        background: "var(--slide-base, var(--bg))",
        color: "var(--text)",
        padding: "clamp(2.5rem, 4vw, 4rem)",
        overflow: "hidden",
      }}
    >
      <AiArBackdrop />

      <div style={{ position: "relative", zIndex: 2 }}>
        <AiArLabel>{label}</AiArLabel>
      </div>

      {/* Fråga som växlas ut mot reveal */}
      <div
        style={{
          marginTop: "1rem",
          minHeight: "3.5rem",
          display: "flex",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <motion.p
          key={revealed ? "revealed" : "question"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: revealed ? "italic" : "normal",
            fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
            color: revealed ? "#B4763A" : "var(--text)",
            opacity: 1,
            margin: 0,
          }}
        >
          {revealed ? "En av dem finns inte." : question}
        </motion.p>
      </div>

      {/* Bild-paret */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ minHeight: 0, marginTop: "0.5rem", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(2rem, 4vw, 4rem)",
            width: "100%",
            maxWidth: "1400px",
          }}
        >
          <Portrait
            image={leftImage}
            name={leftName}
            revealText={leftRevealed.text}
            isReal={leftRevealed.isReal}
            revealed={revealed}
            delay={0.15}
          />
          <Portrait
            image={rightImage}
            name={rightName}
            revealText={rightRevealed.text}
            isReal={rightRevealed.isReal}
            revealed={revealed}
            delay={0.3}
          />
        </div>
      </div>
    </div>
  );
}

function Portrait({
  image,
  name,
  revealText,
  isReal,
  revealed,
  delay,
}: {
  image: string;
  name: string;
  revealText: string;
  isReal: boolean;
  revealed: boolean;
  delay: number;
}) {
  // Den riktiga personen gråas ut, AI:n förstoras.
  const scale = revealed ? (isReal ? 0.92 : 1.08) : 1;
  const opacity = revealed && isReal ? 0.4 : 1;
  const filter = revealed && isReal ? "grayscale(1) brightness(0.7)" : "grayscale(0)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div style={{ position: "relative" }}>
        <Spotlight
          color={isReal && revealed ? "rgba(63,84,74,0.35)" : "rgba(180,118,58,0.55)"}
          delay={delay}
        />
        <motion.div
        animate={{ scale, opacity, filter }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          borderRadius: "0.75rem",
          overflow: "hidden",
          boxShadow:
            "0 30px 60px -15px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.4)",
          zIndex: 1,
        }}
      >
        <img
          src={image}
          alt={name}
          style={{
            display: "block",
            width: "clamp(240px, 30vw, 440px)",
            height: "auto",
            maxHeight: "60vh",
            objectFit: "cover",
          }}
        />
      </motion.div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
          minHeight: "3.5rem",
        }}
      >
        <motion.p
          animate={{ opacity: revealed && isReal ? 0.5 : 1 }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
            letterSpacing: "-0.01em",
            margin: 0,
            color: "var(--text)",
          }}
        >
          {name}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: revealed ? 1 : 0,
            y: revealed ? 0 : 6,
          }}
          transition={{ duration: 0.5, delay: revealed ? 0.45 : 0 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.75rem, 0.9vw, 0.88rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: isReal ? "var(--accent)" : "var(--accent-alert)",
            margin: 0,
          }}
        >
          {revealText}
        </motion.p>
      </div>
    </motion.div>
  );
}
