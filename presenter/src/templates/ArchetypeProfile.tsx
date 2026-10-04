"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { EditableText } from "@/lib/inline-edit";

interface ArchetypeProfileProps {
  /** Nummer i serien — "01"..."06". */
  number: string;
  /** Arketyp-namn — "Frälsaren", "Förgöraren", etc. */
  name: string;
  /** En-mening definition under namnet. */
  tagline: string;
  /** Var berättelsen bor — t.ex. "BOR I KONFERENSTAL · REG.PROMEMORIOR" */
  habitat?: string;
  /** Vad berättelsen säger — flera meningar. */
  says: string;
  /** Vad berättelsen döljer — flera meningar. */
  hides: string;
  /** Bildplats — URL eller undefined för gradient-placeholder. */
  image?: string;
  /** Bildtext under bilden. */
  imageCaption?: string;
  /** Visa bilden "naken" — ingen ram, ingen skugga, ingen overlay-gradient, contain. Default false. */
  imageBare?: boolean;
  /** Personrad — t.ex. "ALTMAN · AMODEI · EU-TOPPMÖTET" */
  sources?: string;
  /** Bottom-marker — t.ex. "I FLÖDET: 'AI kommer lösa det.'" */
  bottomMarker?: string;
  /** Chapter/kapitel-marker uppe vänster. Default "§ KARTA · SEX BERÄTTELSER". */
  chapter?: string;
  /** Custom accent som overrider temats. */
  accentOverride?: string;
  /** Bakgrundston — mörk hex som tonar slidens bg subtilt åt arketypens håll. */
  bgTint?: string;
  /** Sektion-titel för säger-kolumnen. Default "Vad berättelsen säger". */
  saysLabel?: string;
  /** Sektion-titel för döljer-kolumnen. Default "Vad berättelsen döljer". */
  hidesLabel?: string;
}

/**
 * En arketyp i sex-serien — editorial split-layout inspirerad av Apple
 * hero-sections och Joels eget bok-kapitel "Berättelserna vi bär".
 *
 * Layout: bild eller gradient vänster (~40%), text höger med stor numerisk
 * markör, arketyp-namn som hero, tagline, två-kolumns säger/döljer-block,
 * källrad och bottom-marker.
 *
 * Premiär: en keynote 2026-05-27.
 */
export function ArchetypeProfile({
  number,
  name,
  tagline,
  habitat,
  says,
  hides,
  image,
  imageCaption,
  sources,
  bottomMarker,
  chapter = "§ Karta · Sex berättelser om AI",
  accentOverride,
  bgTint,
  imageBare,
  saysLabel = "Vad berättelsen säger",
  hidesLabel = "Vad berättelsen döljer",
}: ArchetypeProfileProps) {
  const accent = accentOverride ?? "var(--accent)";
  // bgTint är en MÖRK arketyp-hex (t.ex. "#1f1a0d"). Lägg den som en
  // genomskinlig tonande wash OVANPÅ var(--bg) — aldrig som opak heltäckande
  // färg. På nattglas blir det mörkt + tonat (oförändrad känsla); på
  // dagsljus lyser den ljusa var(--bg) igenom så texten förblir läsbar.
  const slideBg = bgTint
    ? `radial-gradient(ellipse 120% 100% at 25% 25%, ${withAlpha(
        bgTint,
        0.5,
      )} 0%, ${withAlpha(bgTint, 0.32)} 45%, transparent 100%), var(--slide-base, var(--bg))`
    : "var(--slide-base, var(--bg))";
  const ambientBg = bgTint
    ? `radial-gradient(ellipse 90% 70% at 25% 25%, ${withAlpha(
        bgTint,
        0.6,
      )} 0%, ${withAlpha(bgTint, 0.4)} 30%, transparent 85%), var(--bg)`
    : undefined;

  // Vänster-panelens overlay-text (siffra, habitat, bildtext) ligger antingen
  // PÅ ett foto (image satt) eller på en tema-följande gradient-placeholder.
  // Foto = behandla som mörkt element → fast ljus text + mörk skugga, oavsett
  // tema. Ingen bild = följ temat (var(--text)), så det funkar på dagsljus.
  const onImage = Boolean(image);
  const panelText = onImage ? "rgba(245,246,250,0.92)" : "var(--text)";
  const panelTextMuted = onImage ? "rgba(245,246,250,0.7)" : "var(--text-muted)";
  const panelShadow = onImage
    ? "0 2px 16px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)"
    : "none";

  // Render text with **bold** → accent
  const renderRich = (text: string): ReactNode => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        return (
          <span
            key={i}
            style={{
              color: accent,
              fontWeight: 500,
            }}
          >
            {m[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: slideBg }}
    >
      <AmbientBackdrop background={ambientBg} accent={accent} />

      {/* Top bar — chapter + arketyp-marker */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "clamp(1.4rem, 2vw, 2rem) clamp(2rem, 3vw, 3rem)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 5,
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ color: "var(--text-muted)" }}
        >
          <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          style={{ color: accent }}
        >
          Arketyp {number} / 06
        </motion.div>
      </div>

      {/* Main grid */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          paddingTop: "clamp(4.5rem, 7vh, 6rem)",
          paddingBottom: "clamp(1.8rem, 2.6vh, 2.4rem)",
          paddingLeft: "clamp(2rem, 3vw, 3rem)",
          paddingRight: "clamp(2rem, 3vw, 3rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.72fr) minmax(0, 1fr)",
          gap: "clamp(1.6rem, 3vw, 2.8rem)",
          minHeight: 0,
        }}
      >
        {/* LEFT: image / hero panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.9,
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            position: "relative",
            borderRadius: imageBare && image ? 0 : "1.5rem",
            overflow: "hidden",
            background: image
              ? "transparent"
              : `linear-gradient(135deg, ${withAlpha(
                  accent,
                  0.32,
                )} 0%, ${withAlpha("var(--bg-elevated)", 0.6)} 65%, ${withAlpha(
                  accent,
                  0.08,
                )} 100%)`,
            border:
              imageBare && image
                ? "none"
                : `1px solid ${withAlpha("var(--accent)", 0.18)}`,
            boxShadow:
              imageBare && image
                ? "none"
                : `0 24px 64px -16px rgba(0,0,0,0.5), inset 0 1px 0 ${withAlpha("var(--accent)", 0.15)}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "16rem",
          }}
        >
          {/* Bakgrundsbild eller fallback-pattern */}
          {image ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${image})`,
                backgroundSize: imageBare ? "contain" : "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 30% 70%, ${withAlpha(accent, 0.2)} 0%, transparent 55%), radial-gradient(circle at 75% 25%, ${withAlpha(accent, 0.12)} 0%, transparent 55%)`,
              }}
            />
          )}

          {/* Subtle inner gradient overlay för läsbarhet — skippas i bare-läge */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                image && !imageBare
                  ? "linear-gradient(180deg, rgba(6,7,12,0.25) 0%, transparent 35%, transparent 60%, rgba(6,7,12,0.7) 100%)"
                  : undefined,
            }}
          />

          {/* Stor numerisk markör */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              position: "relative",
              zIndex: 2,
              padding: "clamp(1.6rem, 2.4vw, 2.4rem)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(5rem, 9vw, 9rem)",
                fontWeight: 300,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                color: panelText,
                textShadow: onImage
                  ? "0 0 32px rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.65)"
                  : `0 0 32px ${withAlpha("var(--bg)", 0.8)}`,
                opacity: 1,
              }}
            >
              {number}
            </div>
            {habitat ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                style={{
                  marginTop: "0.6rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: panelTextMuted,
                  opacity: 1,
                  maxWidth: "20em",
                  lineHeight: 1.6,
                  textShadow: panelShadow,
                }}
              >
                <EditableText path="habitat" value={habitat ?? ""}>{habitat}</EditableText>
              </motion.div>
            ) : null}
          </motion.div>

          {/* Bildtext nederst */}
          {imageCaption ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              style={{
                position: "relative",
                zIndex: 2,
                padding: "clamp(1.4rem, 2vw, 2rem)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: panelTextMuted,
                opacity: 1,
                textShadow: panelShadow,
              }}
            >
              <EditableText path="imageCaption" value={imageCaption ?? ""}>{imageCaption}</EditableText>
            </motion.div>
          ) : null}
        </motion.div>

        {/* RIGHT: text-content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
            minHeight: 0,
            justifyContent: "space-between",
          }}
        >
          {/* Arketyp-namn (hero) + tagline */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.6rem, 4.6vw, 4.4rem)",
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.028em",
                lineHeight: 1,
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="name" value={name}>{name}</EditableText>
            </motion.h2>
            <motion.div
              aria-hidden
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              style={{
                width: "3rem",
                height: "2px",
                background: accent,
                marginTop: "0.7rem",
                marginBottom: "0.9rem",
                transformOrigin: "left",
                boxShadow: `0 0 12px ${withAlpha("var(--accent)", 0.5)}`,
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.15rem, 1.55vw, 1.55rem)",
                fontWeight: 400,
                lineHeight: 1.35,
                letterSpacing: "-0.018em",
                color: "var(--text)",
                opacity: 0.92,
                margin: 0,
                maxWidth: "26em",
              }}
            >
              <EditableText path="tagline" value={tagline}>{renderRich(tagline)}</EditableText>
            </motion.p>
          </div>

          {/* Säger / döljer i två-kolumns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "clamp(1.2rem, 2vw, 1.8rem)",
              flex: 1,
              minHeight: 0,
              alignContent: "start",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.85 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 500,
                }}
              >
                {saysLabel}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.88rem, 1.05vw, 1.05rem)",
                  lineHeight: 1.55,
                  color: "var(--text)",
                  margin: 0,
                  opacity: 0.92,
                }}
              >
                <EditableText path="says" value={says} multiline>{renderRich(says)}</EditableText>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
                paddingLeft: "clamp(0.9rem, 1.4vw, 1.4rem)",
                borderLeft: `1px solid ${withAlpha("var(--accent)", 0.18)}`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {hidesLabel}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.88rem, 1.05vw, 1.05rem)",
                  lineHeight: 1.55,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                <EditableText path="hides" value={hides} multiline>{renderRich(hides)}</EditableText>
              </p>
            </motion.div>
          </div>

          {/* Bottom row — sources + bottom-marker */}
          {(sources || bottomMarker) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1.5rem",
                paddingTop: "clamp(0.8rem, 1.4vh, 1.2rem)",
                borderTop: `1px solid var(--glass-border, rgba(255,255,255,0.06))`,
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {sources ? (
                <div style={{ color: accent, fontWeight: 500 }}>
                  <EditableText path="sources" value={sources}>{sources}</EditableText>
                </div>
              ) : <span />}
              {bottomMarker ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    opacity: 0.8,
                    textAlign: "right",
                    maxWidth: "26em",
                  }}
                >
                  <EditableText path="bottomMarker" value={bottomMarker}>{bottomMarker}</EditableText>
                </div>
              ) : null}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
