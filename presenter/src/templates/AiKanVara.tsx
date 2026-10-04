"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg";

interface AiKanVaraProps {
  /** Det centrala ordet (t.ex. "Skruvdragaren") */
  word: string;
  /** Transparent PNG som illustrerar ordet */
  image?: string;
  alt?: string;
  /** Storleksskala — växer skala mellan sliderna (verktyg → person → system) */
  size?: Size;
  /** Label uppe till vänster — default "AI kan vara…" */
  label?: string;
  /** Ms per tecken i typewriter-animationen — default 55 (medvetet lugnt) */
  typeSpeed?: number;
  /** Rotation på bilden i grader */
  imageRotation?: number;
  /** Skjut bilden nedåt i pixlar så den "bleeder" under skärmkanten
   * och den hårda avklippningen i botten döljs */
  imageOffsetY?: number;
  /** Fotobakgrund (path), t.ex. /bilder/min-bild.jpg */
  background?: string;
}

const SIZE_MAP: Record<
  Size,
  { word: string; image: string; accent: string; grid: string }
> = {
  sm: {
    word: "clamp(3.5rem, 7.5vw, 8rem)",
    image: "clamp(320px, 62vh, 720px)",
    accent: "clamp(90px, 10vw, 150px)",
    grid: "1fr 1.1fr",
  },
  md: {
    word: "clamp(4rem, 9vw, 10rem)",
    image: "clamp(480px, 92vh, 1100px)",
    accent: "clamp(120px, 13vw, 200px)",
    grid: "0.8fr 1.3fr",
  },
  lg: {
    word: "clamp(5rem, 11vw, 12rem)",
    image: "clamp(480px, 86vh, 1000px)",
    accent: "clamp(150px, 16vw, 260px)",
    grid: "0.8fr 1.3fr",
  },
};

const ACCENT = "#B4763A";
/** Fast mörk text när en fotobakgrund med kräm-overlay ligger under texten —
 * den ytan är alltid ljus oavsett tema, så texten ska vara mörk på båda. */
const TEXT_ON_PHOTO = "#10141c";

/**
 * Bryter med "AI är…"-sektionens snabba media-tempo: kräm-bakgrund, mörk
 * text, stort typewriter-typsatt nyckelord till vänster, ett PNG-objekt
 * till höger. Ordet typas långsamt — detta är punkten föreläsaren landar i.
 * Storleksskalan (sm/md/lg) växer mellan sliderna för att underförstått
 * markera skalan: verktyg → person → system.
 */
export function AiKanVara({
  word,
  image,
  alt = "",
  size = "md",
  label = "AI kan vara…",
  typeSpeed = 55,
  imageRotation = -3,
  imageOffsetY = 0,
  background,
}: AiKanVaraProps) {
  const sizes = SIZE_MAP[size];
  // Med fotobakgrund ligger en ljus kräm-overlay under texten på alla teman →
  // fast mörk text. Utan foto följer ytan temat (var(--bg)) → var(--text).
  const textColor = background ? TEXT_ON_PHOTO : "var(--text)";
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    setTypedCount(0);
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startTimeout = setTimeout(() => {
      if (cancelled) return;
      intervalId = setInterval(() => {
        setTypedCount((prev) => {
          if (prev >= word.length) {
            if (intervalId) clearInterval(intervalId);
            return word.length;
          }
          return prev + 1;
        });
      }, typeSpeed);
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [word, typeSpeed]);

  const typed = word.slice(0, typedCount);
  const done = typedCount >= word.length;

  return (
    <div
      className="relative h-full w-full"
      style={{
        background: background ? "var(--bg-surface)" : "var(--slide-base, var(--bg))",
        color: textColor,
        padding: "clamp(2rem, 3.5vw, 3.5rem)",
        overflow: "hidden",
      }}
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

      {/* Mjuk kräm-overlay för läsbarhet mot text */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: background
            ? "linear-gradient(135deg, rgba(247,241,230,0.55) 0%, rgba(247,241,230,0.3) 45%, rgba(247,241,230,0.55) 100%)"
            : "radial-gradient(ellipse at 25% 25%, rgba(180,118,58,0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(63,84,74,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* AI kan vara… label top-left */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(1.4rem, 2.3vw, 2.1rem)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: textColor,
          display: "inline-flex",
          alignItems: "baseline",
          position: "relative",
          zIndex: 2,
        }}
      >
        <span><EditableText path="label" value={label ?? ""}>{String(label).replace(/…|\.\.\./g, "")}</EditableText></span>
        <span style={{ color: ACCENT, marginLeft: "0.06em" }}>…</span>
      </motion.div>

      {/* Split-layout: ord till vänster, bild till höger */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "calc(100% - 3rem)",
          display: "grid",
          gridTemplateColumns: image ? sizes.grid : "1fr",
          alignItems: "center",
          gap: "clamp(2rem, 4vw, 5rem)",
          marginTop: "1rem",
        }}
      >
        {/* Ord + accent-linje */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: sizes.word,
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
              color: textColor,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            <EditableText
              path="word"
              value={word ?? ""}
              label="Ord (efter AI kan vara…)"
              sizeControls={[
                { prop: "size", current: size, options: ["sm", "md", "lg"], label: "Storlek" },
              ]}
            >{typed}</EditableText>
            {!done ? (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "inline-block",
                  width: "0.08em",
                  height: "0.82em",
                  background: ACCENT,
                  marginLeft: "0.04em",
                  verticalAlign: "text-bottom",
                }}
              />
            ) : null}
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: sizes.accent,
              height: "3px",
              background: ACCENT,
              marginTop: "clamp(1.2rem, 2vw, 1.8rem)",
              transformOrigin: "left",
            }}
          />
        </div>

        {/* Bild-kolumn */}
        {image ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: imageRotation - 3, y: 40 + imageOffsetY }}
            animate={{
              opacity: done ? 1 : 0,
              scale: done ? 1 : 0.92,
              rotate: done ? imageRotation : imageRotation - 3,
              y: done ? imageOffsetY : 40 + imageOffsetY,
            }}
            transition={{ duration: 0.9, delay: done ? 0.15 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              alignItems: imageOffsetY > 0 ? "flex-end" : "center",
              justifyContent: "center",
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <img
              src={image}
              alt={alt}
              style={{
                height: sizes.image,
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                filter:
                  "drop-shadow(0 30px 40px rgba(17,17,17,0.28)) drop-shadow(0 12px 18px rgba(154,58,42,0.15))",
              }}
            />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
