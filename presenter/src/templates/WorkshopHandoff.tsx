"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface WorkshopHandoffProps {
  chapter?: string;
  /** Stor rubrik. Default: "Skanna. Eller skriv in." */
  title?: string;
  /** Den fullständiga URL:en — används till QR-koden */
  url: string;
  /** Kortare visning, t.ex. "tinyurl.com/minworkshop". Default: url utan https:// */
  displayUrl?: string;
  /** Liten text ovanför titeln, t.ex. "§ XI · Workshop" */
  kicker?: string;
  /** Caption under URL:en — pedagogisk instruktion */
  caption?: string;
  /** Italic pointe längst ner */
  closing?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /** Hörnet uppe till höger: två ord med | emellan. Tom sträng döljer hörnet. */
  corner?: string;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * WorkshopHandoff — överlämningssliden mellan presentation och workshop.
 *
 * Stor QR-kod med accent-glow till vänster, URL stort i mono till höger.
 * Editorial zine: aurora-bakgrund, koordinatgrid-tick-markeringar,
 * mono-eyebrows, italic closing.
 *
 * Tänk: "anchor-moment" där presentationen byter karaktär från
 * lyssna-på-mig till gör-själva.
 */
export function WorkshopHandoff({
  chapter,
  title = "Skanna. Eller skriv in.",
  url,
  displayUrl,
  kicker = "Hela menyn väntar",
  caption,
  closing,
  background,
  accent = "#B4763A",
  overlay,
  corner = "handoff|↗ workshop",
}: WorkshopHandoffProps) {
  const [cornerLeft, cornerRight] = corner.split("|");
  const cleanUrl =
    displayUrl ??
    url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const onPhoto =
    !!background && (background.startsWith("/") || background.startsWith("http"));

  const [qrSrc, setQrSrc] = useState<string>();
  useEffect(() => {
    let current = true;
    QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: "M", color: { dark: "#131311", light: "#ffffff" } })
      .then(src => { if (current) setQrSrc(src); })
      .catch(() => undefined);
    return () => { current = false; };
  }, [url]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      {/* Aurora-lager 1: varm konjak från botten */}
      <div
        className="absolute inset-0 pointer-events-none ambient-accent"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 35% 75%, ${withAlpha(accent, 0.12)} 0%, ${withAlpha(accent, 0.03)} 35%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      {/* Aurora-lager 2: subtil cream wash mitten-höger */}
      <div
        className="absolute inset-0 pointer-events-none ambient-accent"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 70% 50%, color-mix(in srgb, var(--text) 4%, transparent) 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      {/* Vinjett — tema-anpassad: tonar kanterna mot textfärgen så den
          fungerar på både mörkt (mörk falloff) och ljust (svag, ren falloff). */}
      <div
        className="absolute inset-0 pointer-events-none ambient-accent"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, color-mix(in srgb, var(--text) 16%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Tick-markeringar längs övre och vänstra kanten */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 1 }}
      >
        <g opacity="0.18">
          {Array.from({ length: 9 }).map((_, i) => {
            const x = (i * 100) / 8;
            return (
              <line
                key={`tt-${i}`}
                x1={x}
                y1="0"
                x2={x}
                y2={i % 2 === 0 ? 0.6 : 0.3}
                stroke="var(--text)"
                strokeWidth="0.08"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = (i * 100) / 5;
            return (
              <line
                key={`tl-${i}`}
                x1="0"
                y1={y}
                x2={i % 2 === 0 ? 0.6 : 0.3}
                y2={y}
                stroke="var(--text)"
                strokeWidth="0.08"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
      </svg>

      {/* Header — vänsterställd editorial */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "absolute",
            top: "clamp(2.2rem, 4.5vh, 3.8rem)",
            left: "clamp(2rem, 5vw, 4.5rem)",
            zIndex: 4,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.9rem))",
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
          }}
        >
          <span
            style={{
              width: "1.6rem",
              height: "1px",
              background: "var(--text-muted)",
            }}
          />
          <EditableText path="chapter" value={chapter ?? ""}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Field-signatur uppe till höger */}
      {corner ? <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
        style={{
          position: "absolute",
          top: "clamp(2.2rem, 4.5vh, 3.8rem)",
          right: "clamp(2rem, 5vw, 4.5rem)",
          zIndex: 4,
          fontFamily: "var(--font-mono)",
          fontSize: "0.62rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
      >
        <span>{cornerLeft}</span>
        <span
          style={{
            width: "1.6rem",
            height: "1px",
            background: "var(--text-muted)",
          }}
        />
        {cornerRight ? <span style={{ fontVariantNumeric: "tabular-nums" }}>{cornerRight}</span> : null}
      </motion.div> : null}

      {/* Huvudinnehåll — centrerat split: QR vänster, URL höger */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 3, padding: "clamp(2rem, 8vh, 6rem) clamp(2rem, 6vw, 5rem)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "clamp(2rem, 5vw, 5rem)",
            alignItems: "center",
            maxWidth: "min(78em, 100%)",
          }}
        >
          {/* QR-kod med ram + glow */}
          <motion.div data-card=""
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.85,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "relative",
              padding: "clamp(0.6rem, 1vw, 1rem)",
              background: "var(--text)",
              borderRadius: "8px",
              boxShadow: `0 0 60px ${withAlpha(accent, 0.33)}, 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px ${withAlpha(accent, 0.6)}`,
            }}
          >
            <img
              src={qrSrc}
              alt={`QR-kod till ${cleanUrl}`}
              style={{
                display: "block",
                width: "clamp(13rem, 22vw, 20rem)",
                height: "clamp(13rem, 22vw, 20rem)",
                imageRendering: "pixelated",
              }}
            />
            {/* Hörn-decorationer för "fokal" känsla */}
            {[
              { top: -6, left: -6 },
              { top: -6, right: -6 },
              { bottom: -6, left: -6 },
              { bottom: -6, right: -6 },
            ].map((corner, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.95 + i * 0.06 }}
                style={{
                  position: "absolute",
                  width: "0.85rem",
                  height: "0.85rem",
                  ...corner,
                  borderColor: accent,
                  borderStyle: "solid",
                  borderWidth: 0,
                  ...(i < 2 ? { borderTopWidth: "2px" } : {}),
                  ...(i >= 2 ? { borderBottomWidth: "2px" } : {}),
                  ...(i % 2 === 0 ? { borderLeftWidth: "2px" } : {}),
                  ...(i % 2 === 1 ? { borderRightWidth: "2px" } : {}),
                }}
              />
            ))}
          </motion.div>

          {/* Höger sida: kicker + title + URL + caption */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.4vh, 1.4rem)",
              alignItems: "flex-start",
              minWidth: 0,
            }}
          >
            {kicker ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: accent,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <span data-glow=""
                  style={{
                    width: "0.45rem",
                    height: "0.45rem",
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 8px ${accent}`,
                  }}
                />
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </motion.div>
            ) : null}

            {title ? (
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(2rem, 4.4vw, 3.5rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.028em",
                  color: "var(--text)",
                  margin: 0,
                  textShadow: onPhoto ? "0 2px 28px rgba(0,0,0,0.65)" : "none",
                }}
              >
                <EditableText path="title" value={title ?? ""}>
                  {title}
                </EditableText>
              </motion.h2>
            ) : null}

            {/* URL-block */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                ↘&nbsp;&nbsp;Direktlänk
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
                  fontWeight: 500,
                  color: "var(--text)",
                  letterSpacing: "-0.005em",
                  textDecoration: "none",
                  borderBottom: `2px solid ${accent}`,
                  paddingBottom: "0.15rem",
                  whiteSpace: "nowrap",
                  textShadow: `0 0 24px ${withAlpha(accent, 0.33)}`,
                }}
              >
                {cleanUrl}
              </a>
            </motion.div>

            {caption ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.05 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.25rem))",
                  color: "var(--text-muted)",
                  margin: 0,
                  marginTop: "clamp(0.5rem, 1vh, 0.9rem)",
                  maxWidth: "26em",
                  lineHeight: 1.45,
                  textShadow: onPhoto ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
                }}
              >
                <EditableText path="caption" value={caption}>
                  {caption}
                </EditableText>
              </motion.p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Closing nere centrerat */}
      {closing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--room-body, clamp(1rem, 1.35vw, 1.35rem))",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "32em",
            lineHeight: 1.4,
            padding: "0 clamp(1rem, 3vw, 2rem)",
            textShadow: onPhoto ? "0 2px 18px rgba(0,0,0,0.55)" : "none",
          }}
        >
          <EditableText path="closing" value={closing ?? ""}>
            {closing}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
