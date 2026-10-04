"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText, EditableMedia } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface PromptHeroProps {
  /** Kort fråga/tag i toppen (cyan accent). Stödjer **bold**. */
  eyebrow?: string;
  /** Huvudrubrik — blir gigantisk. */
  title: string;
  /** Storlek på titeln. Default "xl". Längre titlar mår bra av "lg" eller "md". */
  titleSize?: "md" | "lg" | "xl";
  /** Undertitel under huvudrubriken. Stödjer **bold**. */
  subtitle?: string;
  /** Bild som läggs i höger sida. */
  image: string;
  imageAlt?: string;
  /** Bakgrundsbild som täcker hela sliden. */
  background?: string;
  /** Texten som visas i chattbubblan. */
  prompt?: string;
  /** Avsändarens namn i chattbubblan. Default "ChatGPT". */
  promptModel?: string;
  /** Accentfärg för eyebrow och chatt-glöd. Default cyan. */
  accent?: string;
  /** Vertikal förskjutning av bilden (CSS translateY-värde). T.ex. "10%" eller "4rem". */
  imageOffsetY?: string;
}

function renderBold(text: string | undefined, boldColor: string, normalColor: string): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: boldColor, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: normalColor }}>
        {part}
      </span>
    );
  });
}

const TITLE_SIZES = {
  md: "clamp(3.5rem, 8vw, 8rem)",
  lg: "clamp(4.5rem, 12vw, 13rem)",
  xl: "clamp(6rem, 17vw, 19rem)",
};

/**
 * Hero-slide med stor titeltext, en exempel-prompt i chattbubbla och en
 * karaktärsbild till höger. Tänkt som ingång till exempel-sektioner
 * ("Vad vill vi förstärka?" etc).
 */
export function PromptHero({
  eyebrow,
  title,
  titleSize = "xl",
  subtitle,
  image,
  imageAlt = "",
  background,
  prompt,
  promptModel = "ChatGPT",
  accent = "#67D4CD",
  imageOffsetY,
}: PromptHeroProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Bakgrund */}
      {background ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-keep-color=""
            src={background}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {/* Subtil vignett så texten står ut */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 20% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      <div className="relative grid h-full w-full" style={{ gridTemplateColumns: "58% 42%" }}>
        {/* Vänster: text + prompt */}
        <div
          className="flex flex-col justify-center"
          style={{
            padding: "clamp(2.5rem, 4.5vw, 5rem)",
            gap: "clamp(1.25rem, 1.8vw, 2rem)",
            position: "relative",
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
                fontStyle: "italic",
                fontSize: "clamp(1.25rem, 2vw, 2rem)",
                letterSpacing: "-0.01em",
              }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>
                {renderBold(eyebrow, accent, accent)}
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
              fontSize: TITLE_SIZES[titleSize],
              lineHeight: 0.88,
              letterSpacing: "-0.045em",
              color: "var(--text)",
              margin: 0,
              textShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <EditableText
              path="title"
              value={title}
              sizeControls={[
                { prop: "titleSize", current: titleSize, options: ["md", "lg", "xl"], label: "Titel" },
              ]}
            >
              {title}
            </EditableText>
          </motion.h1>

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.25rem, 1.8vw, 1.8rem)",
                margin: 0,
                lineHeight: 1.2,
                maxWidth: "22em",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {renderBold(subtitle, accent, "var(--text)")}
              </EditableText>
            </motion.p>
          ) : null}

          {/* Chattbubbla */}
          {prompt ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                marginTop: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.9rem",
                maxWidth: "36em",
              }}
            >
              {/* Liten avatar med OpenAI-cirkel */}
              <div
                style={{
                  flexShrink: 0,
                  width: "2.3rem",
                  height: "2.3rem",
                  borderRadius: "50%",
                  background: "#0a0908",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 6px 20px -6px ${withAlpha(accent, 0.5)}`,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M22.28 9.82a5.83 5.83 0 0 0-.5-4.79 5.9 5.9 0 0 0-6.36-2.83A5.86 5.86 0 0 0 11.13 0a5.9 5.9 0 0 0-5.62 4.1A5.89 5.89 0 0 0 1.58 6.97a5.9 5.9 0 0 0 .73 6.93 5.83 5.83 0 0 0 .5 4.79 5.9 5.9 0 0 0 6.36 2.83 5.85 5.85 0 0 0 4.41 1.97 5.9 5.9 0 0 0 5.62-4.1 5.89 5.89 0 0 0 3.94-2.86 5.9 5.9 0 0 0-.73-6.93z"
                    fill={accent}
                  />
                </svg>
              </div>
              <div
                style={{
                  background: "rgba(32, 34, 40, 0.92)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderRadius: "1.1rem",
                  borderTopLeftRadius: "0.35rem",
                  padding: "0.95rem 1.2rem",
                  color: "rgba(245,246,250,0.92)",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.85rem, 1.02vw, 1rem)",
                  lineHeight: 1.5,
                  boxShadow:
                    "0 20px 40px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(245,246,250,0.6)",
                    marginBottom: "0.4rem",
                  }}
                >
                  <EditableText path="promptModel" value={promptModel}>
                    {promptModel}
                  </EditableText>
                </div>
                <EditableText path="prompt" value={prompt}>
                  {prompt}
                </EditableText>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Höger: bild med glöd */}
        <div
          className="relative flex items-center justify-center"
          style={{ padding: "clamp(1rem, 2vw, 2.5rem)" }}
        >
          {/* Bakomliggande glöd */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.3 }}
            className="absolute"
            style={{
              width: "85%",
              height: "85%",
              background: `radial-gradient(circle at 50% 50%, ${withAlpha(accent, 0.21)} 0%, ${withAlpha(accent, 0.06)} 40%, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
          {/* Långsam rotation för liv */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EditableMedia path="image" value={image} mediaType="image" label="Karaktärsbild">
              <motion.img
                src={image}
                alt={imageAlt}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  filter: `drop-shadow(0 30px 60px rgba(0,0,0,0.5)) drop-shadow(0 0 40px ${withAlpha(accent, 0.25)})`,
                  transform: imageOffsetY ? `translateY(${imageOffsetY})` : undefined,
                }}
              />
            </EditableMedia>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
