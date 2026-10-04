"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface SamrStep {
  word: string;
  hint: string;
  color: string;
}

const DEFAULT_STEPS: SamrStep[] = [
  { word: "Ersätta", hint: "Samma uppgift — bara digitalt.", color: "#6F8A7E" },
  { word: "Förstärka", hint: "AI lägger till något pappret inte klarar.", color: "#B4763A" },
  { word: "Omforma", hint: "Uppgiften byter karaktär.", color: "#9A3A2A" },
  { word: "Omdefiniera", hint: "Något som inte gick innan. Alls.", color: "#5B3A6B" },
];

interface SamrLadderProps {
  /** Video som spelas i höger halva. */
  videoSrc?: string;
  /** Bakgrundsbild som täcker hela sliden bakom innehållet. */
  background?: string;
  /** Liten tag ovanför titeln (default "SAMR"). */
  eyebrow?: string;
  /** Huvudrubrik på vänster sida. */
  title?: string;
  /** Underrubrik under titeln. */
  subtitle?: string;
  /** Egna steg — default är SAMR på svenska. */
  steps?: SamrStep[];
  /**
   * Vertikal fokuspunkt i videon (0–100). 0 = toppen av källan, 100 = botten.
   * Videon fyller boxen (object-fit: cover) och cropas naturligt av aspect-
   * skillnaden; detta värde styr VILKEN del av källan som centreras. Högre
   * värde = visa lägre del av källan (döljer titeltext/chromet högst upp).
   * Default 62 — funkar bra för Instagram-reels med titelband i toppen.
   */
  videoFocusY?: number;
  /**
   * Extra förstoring utöver object-fit cover. Default 1.0.
   * Höj till 1.15–1.3 för att dölja svarta band som finns inbakade i
   * source-videon (typiskt för IG-reels).
   */
  videoZoom?: number;
}

/**
 * SAMR-modellen visualiserad som en färgkodad trappa som stiger upp och höger.
 * Varje steg animeras in via space-tryck (stepped reveal). Höger halva är en
 * video (samr.mp4 eller liknande). Bakgrund täcker hela sliden.
 */
export function SamrLadder({
  videoSrc,
  background,
  eyebrow = "SAMR",
  title = "Fyra sätt att använda AI.",
  subtitle = "Från att ersätta pappret — till att göra något som inte gick innan.",
  steps = DEFAULT_STEPS,
  videoFocusY = 62,
  videoZoom = 1.4,
}: SamrLadderProps) {
  // +1 så första "steget" är bara titel, sedan avslöjas ett åt gången
  const activeStep = useSlideSteps(steps.length + 1);

  // När en bakgrundsbild täcker hela sliden sitter texten på fotot och måste
  // vara fast ljus (oavsett tema). Utan bild följer texten temat via CSS-vars
  // så den blir mörk på ljust tema (dagsljus) och ljus på mörkt (nattglas).
  const onPhoto = Boolean(background);
  const eyebrowColor = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const titleColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const subtitleColor = onPhoto ? "rgba(245,246,250,0.78)" : "var(--text-muted)";

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

      {/* 2-kolumns split */}
      <div className="relative grid h-full w-full grid-cols-2 gap-0">
        {/* Vänster: titel + trappa */}
        <div
          className="flex flex-col justify-center gap-10"
          style={{ padding: "clamp(2rem, 4vw, 4.5rem)" }}
        >
          <div>
            <div
              className="mb-4"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: eyebrowColor,
              }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(2rem, 3.6vw, 3.4rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                color: titleColor,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h1>
            {subtitle ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem, 1.2vw, 1.25rem)",
                  color: subtitleColor,
                  marginTop: "0.8rem",
                  maxWidth: "30em",
                  lineHeight: 1.4,
                }}
              >
                <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
              </motion.p>
            ) : null}
          </div>

          {/* Trappan */}
          <div className="relative flex flex-col-reverse gap-3">
            {steps.map((step, i) => {
              const revealed = i < activeStep;
              // Trappan stiger uppåt-höger: senare steg indenteras längre
              const indent = i * 3.2; // rem
              return (
                <motion.div
                  key={step.word}
                  initial={false}
                  animate={{
                    opacity: revealed ? 1 : 0,
                    x: revealed ? `${indent}rem` : `-1.5rem`,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: step.color,
                    color: "rgba(245,246,250,0.92)",
                    padding: "0.9rem 1.3rem",
                    borderRadius: "0.4rem",
                    boxShadow:
                      "0 8px 24px -12px rgba(0,0,0,0.4), 0 2px 6px -2px rgba(0,0,0,0.2)",
                    width: "fit-content",
                    maxWidth: "100%",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.9rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      letterSpacing: "0.15em",
                    }}
                  >
                    0{i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.2rem, 1.8vw, 1.75rem)",
                    }}
                  >
                    {step.word}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.85rem, 1vw, 1rem)",
                      opacity: 0.88,
                    }}
                  >
                    {step.hint}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Höger: video i en 16:9-box med skugga. Instagram-källvideon cropas
            20% topp + 20% botten för att dölja UI-chromet. */}
        <div
          className="relative flex items-center justify-center"
          style={{ padding: "clamp(1.5rem, 3vw, 3rem)" }}
        >
          {videoSrc ? (
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                width: "100%",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 40px 80px -20px rgba(0,0,0,0.55), 0 20px 40px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06) inset",
                background: "#0a0908",
              }}
            >
              <EditableMedia path="videoSrc" value={videoSrc ?? ""} mediaType="video" label="SAMR-video">
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: `center ${videoFocusY}%`,
                    transform: videoZoom !== 1 ? `scale(${videoZoom})` : undefined,
                    transformOrigin: "center center",
                    display: "block",
                  }}
                />
              </EditableMedia>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
