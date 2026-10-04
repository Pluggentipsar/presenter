"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * LensApplication — visa ett konkret klassrumsexempel med linskoppling.
 *
 * Designad för rapid fire-sektion: stort exempel med titel, mekanism-text,
 * bild eller video, plus taggar för vilka linser exemplet aktiverar.
 *
 * Layout: split-screen med media på en sida och text på andra. Kan flippa
 * via mediaPlacement-prop för visuell rytm mellan exempel. Om ingen media
 * finns används full-bredd text-layout.
 *
 * ```mdx
 * <LensApplication
 *   chapter="§ Rapid fire · 1/3"
 *   subject="SVENSKA · GYMNASIET"
 *   title="Diktanalys via bildgenerering"
 *   mekanism="Eleverna analyserar dikten genom att skapa bild..."
 *   imageUrl="/bilder/lara-med-ai/diktbilder.png"
 *   mediaPlacement="right"
 *   lenses={["Affordans", "Omvänd Bloom"]}
 * />
 * ```
 */

interface LensApplicationProps {
  chapter?: string;
  /** Liten ämnes-tagg (t.ex. "SVENSKA · GYMNASIET"). */
  subject?: string;
  /** Stor titel för exemplet. */
  title: string;
  /** Mekanism-text — vad eleven faktiskt gör. Stödjer **fet** och *kursiv*. */
  mekanism?: string;
  /** Stor bild-URL (eller låt videoUrl ta över). */
  imageUrl?: string;
  /** Video-URL (mp4/webm). Om angiven används denna istället för imageUrl. */
  videoUrl?: string;
  /** Var media placeras. Default "right". */
  mediaPlacement?: "left" | "right";
  /** Linskoppling — array av lins-namn som visas som taggar. */
  lenses?: string[];
  background?: string;
  overlay?: number;
  accent?: string;
  /** Ta bort ram, hörnornament och beskärning — visar hela bilden ren. */
  noFrame?: boolean;
  /** Valfri children — om angiven används istället för mekanism-prop. */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accentColor: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: accentColor, fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {chunk.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function LensApplication({
  chapter,
  subject,
  title,
  mekanism,
  imageUrl,
  videoUrl,
  mediaPlacement = "right",
  lenses = [],
  background,
  overlay = 0.65,
  accent = "var(--accent)",
  noFrame = false,
}: LensApplicationProps) {
  const hasMedia = Boolean(imageUrl || videoUrl);

  // När ett foto/URL skickas in som bakgrund lägger resolveBackground en mörk
  // scrim ovanpå för läsbarhet. Texten sitter då på mörkt oavsett tema → fast
  // ljus. Utan foto-bakgrund följer texten temat (mörk på ljust, ljus på mörkt).
  const photoBg = Boolean(background && (background.startsWith("/") || background.startsWith("http")));
  const primaryText = photoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = photoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const titleShadow = photoBg ? "0 6px 30px rgba(0,0,0,0.5)" : "none";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative h-full"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          display: "grid",
          gridTemplateColumns: hasMedia
            ? mediaPlacement === "left"
              ? "1fr 1fr"
              : "1fr 1fr"
            : "1fr",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        {/* Media — vänster om mediaPlacement="left" */}
        {hasMedia && mediaPlacement === "left" ? (
          <MediaPanel
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            accent={accent}
            delay={0.5}
            noFrame={noFrame}
          />
        ) : null}

        {/* Text-innehåll */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.6rem)",
            order: hasMedia && mediaPlacement === "left" ? 2 : 1,
          }}
        >
          {/* Subject-tagg */}
          {subject ? (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: accent,
                paddingLeft: "0.9rem",
                borderLeft: `2px solid ${accent}`,
              }}
            >
              {subject}
            </motion.div>
          ) : null}

          {/* Stor titel */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(2rem, 3.6vw, 3.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: primaryText,
              margin: 0,
              textShadow: titleShadow,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>

          {/* Mekanism-text */}
          {mekanism ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
                lineHeight: 1.4,
                color: primaryText,
                maxWidth: "32em",
                fontStyle: "normal",
              }}
            >
              <EditableText path="mekanism" value={mekanism}>
                {renderInline(mekanism, accent)}
              </EditableText>
            </motion.div>
          ) : null}

          {/* Lins-taggar */}
          {lenses.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.2 }}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(0.5rem, 1vw, 0.8rem)",
                marginTop: "clamp(0.8rem, 1.5vh, 1.2rem)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: mutedText,
                  alignSelf: "center",
                  paddingRight: "0.4rem",
                }}
              >
                Linser
              </span>
              {lenses.map((lens, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.3 + i * 0.1 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                    color: primaryText,
                    background: `linear-gradient(140deg, ${withAlpha(accent, 0.2)} 0%, ${withAlpha(accent, 0.08)} 100%)`,
                    border: `1px solid ${withAlpha(accent, 0.4)}`,
                    padding: "0.4rem 0.9rem",
                    borderRadius: "999px",
                    boxShadow: `0 0 16px ${withAlpha(accent, 0.13)}`,
                  }}
                >
                  <span style={{ color: accent }}>⊕</span> {lens}
                </motion.span>
              ))}
            </motion.div>
          ) : null}
        </div>

        {/* Media — höger om mediaPlacement="right" */}
        {hasMedia && mediaPlacement === "right" ? (
          <MediaPanel
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            accent={accent}
            delay={0.6}
            noFrame={noFrame}
          />
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Media-panel (bild eller video)
// ============================================================================

function MediaPanel({
  imageUrl,
  videoUrl,
  accent,
  delay,
  noFrame = false,
}: {
  imageUrl?: string;
  videoUrl?: string;
  accent: string;
  delay: number;
  noFrame?: boolean;
}) {
  const [videoError, setVideoError] = useState(false);
  const objectFit: "cover" | "contain" = noFrame ? "contain" : "cover";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        maxHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: noFrame ? 0 : "0.5rem",
        overflow: "hidden",
        boxShadow: noFrame
          ? "none"
          : `0 12px 50px rgba(0,0,0,0.5), 0 0 0 1px ${withAlpha(accent, 0.2)}`,
        background: noFrame ? "transparent" : "rgba(10,9,8,0.4)",
      }}
    >
      {videoUrl && !videoError ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
          }}
        />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit,
          }}
        />
      ) : (
        // Placeholder om varken video eller image laddats
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
            // Framed panel har mörk surface → fast ljus. noFrame = genomskinlig
            // → texten sitter på slide-bg och måste följa temat.
            color: noFrame ? "var(--text-muted)" : "rgba(245,246,250,0.35)",
            letterSpacing: "0.3em",
          }}
        >
          [ MEDIA ]
        </div>
      )}

      {/* Dekorativ accent-ram i hörnen — döljs när noFrame=true */}
      {!noFrame ? (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              width: "1.5rem",
              height: "1.5rem",
              borderTop: `2px solid ${accent}`,
              borderLeft: `2px solid ${accent}`,
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              width: "1.5rem",
              height: "1.5rem",
              borderBottom: `2px solid ${accent}`,
              borderRight: `2px solid ${accent}`,
              opacity: 0.7,
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}
    </motion.div>
  );
}
