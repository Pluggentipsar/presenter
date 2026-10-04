"use client";

import { motion } from "framer-motion";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface EditorialHeroProps {
  /** Liten mono-tagg överst (t.ex. "§ IV · Lärande"). */
  kicker?: string;
  /** Nummerdekoration — stor, ligger som bakgrund (t.ex. "04"). */
  number?: string;
  /** Huvudordet — massiv serif/italic-display. */
  word: string;
  /** Kort brödtext under — 1–2 meningar. */
  body?: string;
  /** En bildkälla för editorial-spread (valfri). */
  image?: string;
  imageAlt?: string;
  /** Placering av bild. */
  imagePlacement?: "right" | "bottom-right" | "full-bleed-right";
  /** Bakgrundsstil. */
  background?: string;
  /** Accentfärg för dekoration. Default konjak. */
  accent?: string;
  /** Bakgrundston. Default mörk. "cream" = ljus editorial. */
  theme?: "dark" | "cream";
}

/**
 * Magazine-style section opener. Gigantiskt italic-ord, liten mono-kicker,
 * kort brödtext, och ett stort dekorativt nummer i bakgrunden.
 * Asymmetrisk grid-brytande layout. Valfri bild till höger.
 */
function resolveBackground(bg: string | undefined, fallback: string): string {
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.55), rgba(10,9,8,0.7)), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

export function EditorialHero({
  kicker,
  number,
  word,
  body,
  image,
  imageAlt = "",
  imagePlacement = "right",
  background,
  accent = "#B4763A",
  theme = "dark",
}: EditorialHeroProps) {
  // En foto-/URL-bakgrund får en mörk scrim (se resolveBackground) — då måste
  // texten vara fast ljus oavsett globalt tema, annars blir den osynlig på ljust tema.
  const hasPhotoScrim = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const onDarkSurface = theme === "cream" ? false : hasPhotoScrim;

  const textColor = theme === "cream"
    ? "#1a1612"
    : onDarkSurface
      ? "rgba(245,246,250,0.92)"
      : "var(--text)";
  const subtleColor = theme === "cream"
    ? "rgba(26,22,18,0.6)"
    : onDarkSurface
      ? "rgba(245,246,250,0.6)"
      : "var(--text-muted)";
  const bodyColor = theme === "cream"
    ? "rgba(26,22,18,0.78)"
    : onDarkSurface
      ? "rgba(245,246,250,0.78)"
      : "var(--text)";
  const decorationColor = theme === "cream"
    ? "rgba(26,22,18,0.035)"
    : onDarkSurface
      ? "rgba(245,246,250,0.05)"
      : "color-mix(in srgb, var(--text) 5%, transparent)";
  const defaultBg =
    theme === "cream"
      ? "radial-gradient(ellipse at 30% 20%, #f5efe3 0%, #ebe4d3 70%)"
      : "var(--slide-base, var(--bg))";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, defaultBg) }}
    >
      {/* Mega-nummer som sätter scenen */}
      {number ? (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            position: "absolute",
            right: "-3%",
            bottom: "-18%",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(28rem, 70vw, 85rem)",
            color: decorationColor,
            letterSpacing: "-0.08em",
            lineHeight: 0.8,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {number}
        </motion.div>
      ) : null}

      {/* Hårkorslinje */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 7rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
        }}
      />

      {/* Innehållsgrid */}
      <div
        className="relative grid h-full w-full"
        style={{
          gridTemplateColumns: image ? "55% 45%" : "1fr",
          zIndex: 2,
        }}
      >
        {/* Vänster: text */}
        <div
          className="flex flex-col justify-center"
          style={{
            padding: "clamp(3rem, 6vw, 7rem)",
            gap: "clamp(1rem, 1.5vw, 1.75rem)",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: subtleColor,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>
                {kicker}
              </EditableText>
            </motion.div>
          ) : null}

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
              // Adaptiv font-size baserat på ordlängd
              fontSize:
                word.length <= 5
                  ? "clamp(5rem, 13vw, 15rem)"
                  : word.length <= 8
                    ? "clamp(4.5rem, 10vw, 11rem)"
                    : word.length <= 10
                      ? "clamp(3.5rem, 7.5vw, 8.5rem)"
                      : word.length <= 12
                        ? "clamp(2.8rem, 5.2vw, 6rem)"
                        : "clamp(2.2rem, 4vw, 4.5rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.04em",
              color: textColor,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            <EditableText path="word" value={word}>
              {word}
            </EditableText>
          </motion.h1>

          {body ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.25vw, 1.35rem)",
                lineHeight: 1.5,
                color: bodyColor,
                maxWidth: "30em",
                margin: 0,
                marginTop: "0.5rem",
              }}
            >
              <EditableText path="body" value={body}>
                {body}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Höger: bild */}
        {image ? (
          <div
            className="relative flex items-center justify-center"
            style={{
              overflow: "hidden",
              padding:
                imagePlacement === "full-bleed-right"
                  ? 0
                  : "clamp(2rem, 4vw, 4rem)",
            }}
          >
            <EditableMedia path="image" value={image} mediaType="image" label="Editorial-bild">
              <motion.img
                src={image}
                alt={imageAlt}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit:
                    imagePlacement === "full-bleed-right" ? "cover" : "contain",
                  objectPosition:
                    imagePlacement === "bottom-right" ? "bottom right" : "center",
                  display: "block",
                  borderRadius:
                    imagePlacement === "full-bleed-right" ? 0 : "0.9rem",
                  boxShadow:
                    imagePlacement === "full-bleed-right"
                      ? undefined
                      : "0 30px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset",
                }}
              />
            </EditableMedia>
          </div>
        ) : null}
      </div>
    </div>
  );
}
