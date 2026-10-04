"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface InputHeroProps {
  /** Text över titeln. Stödjer **bold** för accent-färgade ord. */
  eyebrow?: string;
  /** Huvudrubrik — blir gigantisk. */
  title: string;
  /** Text under titeln. Stödjer **bold** för accent-färgade ord. */
  subtitle?: string;
  /** Prompten som visas i ChatGPT-input-baren. */
  prompt: string;
  /** Bild som flushar mot bottenhögre hörnet. */
  image: string;
  imageAlt?: string;
  /** Bakgrundsbild som täcker hela sliden. */
  background?: string;
  /** Accent för bold-ord och ikoner. Default cyan. */
  accent?: string;
  /** Dim-färg för otonade ord i eyebrow/subtitle. */
  dim?: string;
}

/**
 * Parsar **bold**-syntax i en sträng. Bold-delar får accent-färg,
 * resten får dim-färg.
 */
function renderBold(text: string, accent: string, dim: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: dim }}>
        {part}
      </span>
    );
  });
}

/**
 * Hero-variant med stor titel, en ChatGPT-stilad input-bar som prompt,
 * och bild flush mot bottenhögre hörnet. Tänkt som ingång till
 * "förstärka/material/verktyg"-exempel.
 */
export function InputHero({
  eyebrow,
  title,
  subtitle,
  prompt,
  image,
  imageAlt = "",
  background,
  accent = "#67D4CD",
  dim = "var(--text)",
}: InputHeroProps) {
  // När en bakgrundsbild finns sitter texten på ett foto (med mörk vignett
  // för läsbarhet) — då ska texten vara fast ljus oavsett tema. Utan foto
  // sitter texten direkt på slidens bakgrund och ska följa temat.
  const hasPhoto = Boolean(background);
  const heroText = hasPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Bakgrund */}
      {background ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={background}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {/* Vignett för text-läsbarhet till vänster — bara meningsfull över ett
          foto. Utan bakgrundsbild skulle den mörka skrimen muddra en ljus
          slide (t.ex. dagsljus), så vi renderar den bara med foto. */}
      {hasPhoto ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 20% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      ) : null}

      {/* Bild: flush bottenhögre, bakom texten */}
      <div
        className="absolute bottom-0 right-0 flex items-end justify-end pointer-events-none"
        style={{
          width: "55%",
          height: "85%",
          zIndex: 1,
        }}
      >
        <EditableMedia path="image" value={image} mediaType="image" label="Karaktärsbild">
          <motion.img
            src={image}
            alt={imageAlt}
            initial={{ x: "-180%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              x: { duration: 6, delay: 0.5, ease: [0.25, 0.7, 0.3, 1] },
              opacity: { duration: 1.2, delay: 0.5, ease: "easeOut" },
            }}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              objectPosition: "bottom right",
              display: "block",
              filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.5))",
            }}
          />
        </EditableMedia>
      </div>

      {/* Text-layout */}
      <div
        className="relative flex flex-col h-full w-full"
        style={{
          padding: "clamp(2.5rem, 4.5vw, 5rem)",
          paddingTop: "clamp(2rem, 4vh, 4rem)",
          zIndex: 2,
        }}
      >
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.4rem, 2.2vw, 2.4rem)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              maxWidth: "90%",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow ?? ""}>
              {renderBold(eyebrow, heroText, accent)}
            </EditableText>
          </motion.div>
        ) : null}

        <motion.h1
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(6rem, 17vw, 19rem)",
            lineHeight: 0.88,
            letterSpacing: "-0.045em",
            color: heroText,
            margin: "clamp(0.5rem, 1vh, 1rem) 0 0 0",
            textShadow: hasPhoto ? "0 8px 40px rgba(0,0,0,0.4)" : "none",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h1>

        {/* Input-bar — ChatGPT-stil */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "clamp(1rem, 2vh, 2rem)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "var(--text)",
            borderRadius: "2rem",
            padding: "0.85rem 1.1rem",
            maxWidth: "38em",
            boxShadow:
              "0 20px 50px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
          }}
        >
          {/* Attachment-ikon vänster */}
          <div
            aria-hidden
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "50%",
              border: "1.5px solid var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="var(--bg)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Promttext */}
          <div
            style={{
              flex: 1,
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
              color: "var(--bg)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <EditableText path="prompt" value={prompt}>
              {prompt}
            </EditableText>
          </div>

          {/* Send-ikon höger */}
          <div
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 20l18-8L3 4v7l12 1-12 1v7z"
                fill="var(--bg)"
              />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h8M4 12h16M10 17h10"
                stroke="var(--bg)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16" cy="7" r="1.4" fill="var(--bg)" />
              <circle cx="7" cy="17" r="1.4" fill="var(--bg)" />
            </svg>
          </div>
        </motion.div>

        {subtitle ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
            style={{
              marginTop: "clamp(1rem, 2vh, 1.75rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.4rem, 2.2vw, 2.4rem)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              maxWidth: "25em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {renderBold(subtitle, accent, heroText)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
