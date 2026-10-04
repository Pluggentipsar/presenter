"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { Lightbox } from "./Lightbox";

interface TruthVacuumProps {
  /** Kicker uppe i vänstra hörnet, t.ex. "§ Flöde · Sanningsvakuum". */
  kicker?: string;
  /** Stor central rubrik. Default "Vilken är riktig?". */
  title?: string;
  /** Liten instruktion under rubriken. */
  subtitle?: string;
  /** Bild A — uri. */
  imageA: string;
  /** Bild B — uri. */
  imageB: string;
  /** Vilken är fejk? "A" eller "B". Avgör vilket kort som får röd FEJK-stämpel. */
  fakeSide: "A" | "B";
  /** Label på A-stämpeln när reveal sker. Default "Foto · AP" / "AI · Midjourney". */
  realLabel?: string;
  fakeLabel?: string;
  /** Källcitat under bilderna (t.ex. "AP Photo, Business Insider · Midjourney v8.1"). */
  sourceLine?: string;
  /** Bakgrundsfärg/uri (CSS). */
  background?: string;
  /** Accentfärg för "ÄKTA"-sidan. Default temats accent. */
  accent?: string;
  /** Röd för FEJK-stämpel. Default temats accentAlert. */
  alert?: string;
  /** Stegvis reveal. Default true. */
  stepped?: boolean;
}

/**
 * TruthVacuum — Vilken är riktig? Två bilder sida vid sida, staged reveal.
 *
 * Tänkt blottläggningsögonblick: publiken gissar vilken som är AI, klick
 * → röd FEJK-stämpel rasar in på den ena, accentfärgad ÄKTA-tagg på
 * den andra. Båda bilder klickbara för förstoring (Lightbox).
 *
 * Designintention: detta är *blottläggning*. Använd `alert` (röd) enligt
 * DESIGN.md §3 — endast när något blottläggs.
 */
export function TruthVacuum({
  kicker,
  title = "Vilken är riktig?",
  subtitle,
  imageA,
  imageB,
  fakeSide,
  realLabel = "ÄKTA",
  fakeLabel = "FEJK",
  sourceLine,
  background,
  accent = "var(--accent)",
  alert = "var(--accent-alert)",
  stepped = true,
}: TruthVacuumProps) {
  // Steg 0: båda bilderna in. Steg 1: stämplarna rasar in.
  const step = useSlideSteps(stepped ? 1 : 0);
  const revealed = stepped ? step >= 1 : true;
  const [lightbox, setLightbox] = useState<{ image: string; caption: string } | null>(null);

  // Om en custom background passas in (foto/uri/mörk backdrop) behandlar vi
  // ytan som mörk och låser text till ljus. Annars följer slidens rot temat.
  const customBg = background != null;
  const bg = background ?? "var(--slide-base, var(--bg))";
  const introPrimary = customBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const introMuted = customBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  const cards = [
    { key: "A" as const, image: imageA, isFake: fakeSide === "A" },
    { key: "B" as const, image: imageB, isFake: fakeSide === "B" },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Pulserande röd glow när blottläggning sker */}
      <AnimatePresence>
        {revealed ? (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at 50% 50%, ${withAlpha(alert, 0.07)}, transparent 65%)`,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem) clamp(3rem, 6vw, 6rem)",
          zIndex: 2,
          gap: "clamp(1.25rem, 2.5vh, 2rem)",
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "44em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: introMuted,
              }}
            >
              {kicker}
            </motion.div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(2.4rem, 5.5vw, 5rem)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: introPrimary,
              margin: 0,
            }}
          >
            {title}
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.2vw, 1.25rem)",
                lineHeight: 1.5,
                color: introMuted,
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {/* Bildpar */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            paddingTop: "clamp(0.25rem, 1vh, 1rem)",
          }}
        >
          {cards.map((card, i) => {
            const label = card.isFake ? fakeLabel : realLabel;
            const tone = card.isFake ? alert : accent;
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.85,
                  delay: 0.4 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.7rem",
                  minHeight: 0,
                }}
              >
                {/* A / B-etikett uppe */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.8rem, 1vw, 1.05rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: revealed ? tone : introMuted,
                    transition: "color 0.6s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: "0.55rem",
                      height: "0.55rem",
                      borderRadius: "50%",
                      background: revealed ? tone : introMuted,
                      boxShadow: revealed ? `0 0 14px ${withAlpha(tone, 0.67)}` : "none",
                      transition: "background 0.6s ease, box-shadow 0.6s ease",
                    }}
                  />
                  Bild {card.key}
                </div>

                {/* Klickbart bildkort */}
                <button
                  type="button"
                  onClick={() =>
                    setLightbox({
                      image: card.image,
                      caption: `Bild ${card.key}${revealed ? ` · ${label}` : ""}`,
                    })
                  }
                  aria-label={`Förstora bild ${card.key}`}
                  style={{
                    all: "unset",
                    flex: 1,
                    minHeight: "clamp(16rem, 50vh, 36rem)",
                    borderRadius: "0.6rem",
                    // Fotobehållare: bilden täcker hela ytan (inset:0), så detta
                    // är bara en platshållare bakom fotot — neutral surface funkar
                    // på både ljust och mörkt tema.
                    background: "var(--bg-elevated)",
                    border: `1px solid ${revealed ? withAlpha(tone, 0.33) : "rgba(0,0,0,0.12)"}`,
                    boxShadow: revealed
                      ? `0 30px 60px -25px rgba(0,0,0,0.4), 0 0 50px -8px ${withAlpha(tone, 0.33)}`
                      : "0 30px 60px -25px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "zoom-in",
                    transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={`Bild ${card.key}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      position: "absolute",
                      inset: 0,
                      filter: revealed && card.isFake ? "saturate(0.92)" : undefined,
                      transition: "filter 0.6s ease",
                    }}
                  />

                  {/* Stämpel — rasar in vid reveal */}
                  <AnimatePresence>
                    {revealed ? (
                      <motion.div
                        initial={{
                          opacity: 0,
                          scale: 1.8,
                          rotate: card.isFake ? -14 : 8,
                          y: -40,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          rotate: card.isFake ? -10 : 5,
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          duration: 0.6,
                          delay: 0.1 + i * 0.08,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          padding: "0.55rem 1.5rem",
                          border: `4px solid ${tone}`,
                          borderRadius: "0.3rem",
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(1.4rem, 2.2vw, 2.6rem)",
                          fontWeight: 800,
                          letterSpacing: "0.28em",
                          textTransform: "uppercase",
                          color: tone,
                          background: "rgba(10,9,8,0.7)",
                          backdropFilter: "blur(3px)",
                          pointerEvents: "none",
                          boxShadow: `0 0 50px ${withAlpha(tone, 0.53)}, inset 0 0 20px ${withAlpha(tone, 0.2)}`,
                        }}
                      >
                        {label}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Källcitat */}
        {sourceLine ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: revealed ? 1 : 0.5 }}
            transition={{ duration: 0.8, delay: revealed ? 0.7 : 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: introMuted,
              textAlign: "center",
            }}
          >
            {sourceLine}
          </motion.div>
        ) : null}
      </div>

      <Lightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        image={lightbox?.image}
        caption={lightbox?.caption}
      />
    </div>
  );
}
