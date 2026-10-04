"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { EditableText } from "@/lib/inline-edit";

interface AiHyperobjectProps {
  /** Huvudrubrik — default "AI är inte en sak till!" */
  title?: string;
  /** Ord inom titeln som ska färgas konjak (första träffen) */
  emphasis?: string;
  /** Taggarna — comma-separerad sträng eller array */
  tags?: string | string[];
  /** Fotobakgrund — standard ingen. `"none"` = temats bakgrund utan foto/scrim */
  background?: string;
  /** Mörk overlay-opacity (0-1), default 0.72 */
  darken?: number;
}

/**
 * Hyperobjekt-slide: AI är inte en enskild sak utan en kraft som
 * genomsyrar allt vi gör i skolan. Fotobakgrund med kraftig mörk overlay,
 * stor deklarativ titel, och en hoptrasslad uppsättning taggar som
 * samtidigt landar i rutan och drar sedan långsamt sina egna bogar.
 */
export function AiHyperobject({
  title = "AI är inte en sak till!",
  emphasis = "inte",
  tags,
  background = "",
  darken = 0.72,
}: AiHyperobjectProps) {
  // Temaläge: ingen fotobakgrund, ingen mörk scrim — sliden vilar på temats
  // egna bakgrund (t.ex. dagsljus) och färgas av dess tokens.
  const noPhoto = !background || background === "none";

  const tagList = useMemo(() => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tags]);

  const titleParts = useMemo(() => {
    if (!emphasis) return [title];
    // Case-insensitive split som behåller matchad del
    const regex = new RegExp(`(${emphasis})`, "i");
    return title.split(regex);
  }, [title, emphasis]);

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Fotobakgrund */}
      {!noPhoto ? (
        <img
          src={background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full"
          // position/zIndex inline för att överstyra den globala regeln
          // [data-theme=...] [class*="h-full w-full"] { position:relative; z-index:3 }
          // som annars gör bakgrundsbilden till ett in-flow-element och
          // trycker ner titeln/taggarna under sliden.
          style={{ position: "absolute", inset: 0, zIndex: 0, objectFit: "cover" }}
        />
      ) : null}

      {/* Mörk gradient-overlay — djupare i kanterna, ljusare i mitten (bara ovanpå foto) */}
      {!noPhoto ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(10,9,8,${Math.max(0, darken - 0.12)}) 0%, rgba(10,9,8,${darken}) 60%, rgba(10,9,8,${Math.min(0.92, darken + 0.1)}) 100%)`,
          }}
        />
      ) : null}

      {/* Subtil glow bakom titeln — konjak på foto, temats accent i temaläge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: noPhoto ? 0.5 : 0.22, scale: 1 }}
        transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
        style={{
          position: "absolute",
          top: "22%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70vmin",
          height: "70vmin",
          borderRadius: "9999px",
          background: noPhoto
            ? "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(180,118,58,0.55) 0%, rgba(180,118,58,0) 65%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 5vw, 5rem)",
          gap: "clamp(2rem, 3.5vw, 4rem)",
          zIndex: 2,
        }}
      >
        {/* Titel */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2.8rem, 6.5vw, 6.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            // På foto: fast ljus (sitter på den mörka scrimen, rgba(10,9,8,~0.72)).
            // I temaläge: temats textfärg — annars osynlig på ljusa teman.
            color: noPhoto ? "var(--text)" : "rgba(245,246,250,0.92)",
            margin: 0,
            textAlign: "center",
            maxWidth: "19em",
          }}
        >
          <EditableText path="title" value={title ?? ""}>
            {titleParts.map((part, i) => {
              if (emphasis && part.toLowerCase() === emphasis.toLowerCase()) {
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    style={{
                      color: noPhoto ? "var(--accent)" : "#B4763A",
                      fontStyle: "italic",
                    }}
                  >
                    {part}
                  </motion.span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </EditableText>
        </motion.h1>

        {/* Taggarna */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(0.7rem, 1.1vw, 1.1rem)",
            justifyContent: "center",
            maxWidth: "min(1150px, 92%)",
          }}
        >
          {tagList.map((tag, i) => {
            // Psuedo-random men deterministisk rotation (-3 till +3 grader)
            const rot = ((i * 37) % 7) - 3;
            const inDelay = 0.85 + i * 0.095;
            const floatDuration = 4.5 + ((i * 7) % 4);
            const floatDelay = inDelay + 1 + (i % 3) * 0.25;
            return (
              <motion.span
                key={tag}
                initial={{ opacity: 0, y: 30, scale: 0.82, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: [0, -5, 0],
                  scale: 1,
                  rotate: rot,
                }}
                transition={{
                  opacity: { duration: 0.6, delay: inDelay },
                  scale: { duration: 0.7, delay: inDelay, ease: [0.22, 1, 0.36, 1] },
                  rotate: { duration: 0.7, delay: inDelay, ease: [0.22, 1, 0.36, 1] },
                  y: {
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: floatDelay,
                  },
                }}
                style={{
                  display: "inline-block",
                  padding: "clamp(0.65rem, 0.9vw, 0.85rem) clamp(1.2rem, 1.7vw, 1.7rem)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  border: noPhoto
                    ? "1.5px solid var(--accent-bright, var(--accent))"
                    : "1.5px solid #B4763A",
                  borderRadius: "9999px",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.95rem, 1.3vw, 1.25rem)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  // Foto-lägets tunga skuggor ser smutsiga ut på ljus tema-bakgrund
                  boxShadow: noPhoto
                    ? "0 10px 22px -10px rgba(16,20,28,0.28), 0 4px 10px -5px rgba(16,20,28,0.14)"
                    : "0 14px 28px -8px rgba(0,0,0,0.55), 0 6px 12px -3px rgba(154,58,42,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
