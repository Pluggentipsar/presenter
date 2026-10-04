"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { EditableText } from "@/lib/inline-edit";

interface SpeakerIntroProps {
  /** Föreläsarens namn (huvudrubrik, gigant) */
  name: string;
  /** Roll/titel som kursiv tagline (rader separeras med \n) */
  title?: string;
  /** Liten versal-linje ovanför namnet (konjak, t.ex. "VERKSAMHETSUTVECKLARE AI") */
  eyebrow?: string;
  /** Video på föreläsaren (mp4 i /public) — startas manuellt med play-knappen */
  videoSrc: string;
  /** Valfri poster-ruta (bild) som visas innan videon startas */
  videoPoster?: string;
  /** Fotobakgrund (path i /public, t.ex. /bilder/min-bild.jpg) */
  background?: string;
  /** Valfri bok/produkt inkilad bakom polaroidens hörn */
  bookSrc?: string;
  bookAlt?: string;
  /** Social/kontakt — strings i formatet "handle" */
  linkedin?: string;
  instagram?: string;
  email?: string;
  spotify1?: string;
  spotify2?: string;
  website?: string;
}

const BRAND_COLORS = {
  linkedin: "#0A66C2",
  instagram: "#E4405F",
  email: "#EA4335",
  spotify: "#1DB954",
  website: "#B4763A",
};

function Icon({ type }: { type: keyof typeof BRAND_COLORS }) {
  const color = BRAND_COLORS[type];
  const common = {
    width: 36,
    height: 36,
    viewBox: "0 0 24 24",
    style: { flexShrink: 0 },
  } as const;

  switch (type) {
    case "linkedin":
      return (
        <svg {...common}>
          <rect width="24" height="24" rx="4" fill={color} />
          <path
            fill="#fff"
            d="M7.5 9.3h2.6V17H7.5V9.3ZM8.8 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm3.3 3.3h2.5v1.05h.04c.35-.66 1.2-1.35 2.47-1.35 2.64 0 3.13 1.74 3.13 4V17h-2.6v-3.4c0-.81-.02-1.85-1.13-1.85-1.13 0-1.3.88-1.3 1.8V17h-2.6V9.3h-.51Z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            rx="3.5"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="15.8" cy="8.2" r="0.9" fill="#fff" />
        </svg>
      );
    case "email":
      return (
        <svg {...common}>
          <rect width="24" height="24" rx="4" fill="#fff" />
          <path fill="#4285F4" d="M3.5 7v10h3V11L3.5 7Z" />
          <path fill="#34A853" d="M20.5 7v10h-3V11l3-4Z" />
          <path fill="#EA4335" d="M3.5 7l8.5 6L20.5 7v0l-8.5 6L3.5 7Z" />
          <path fill="#FBBC04" d="M17.5 7v4l3-0v-4h-3Z" />
          <path fill="#C5221F" d="M3.5 7v4l3 0V7h-3Z" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path
            fill="#000"
            d="M17.3 16.2c-.2.3-.6.4-.9.2-2.5-1.5-5.7-1.9-9.4-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4.1-.9 7.6-.5 10.4 1.2.3.2.4.6.2.9Zm1.4-3c-.3.4-.7.5-1.1.3-2.9-1.8-7.3-2.3-10.7-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 3.9-1.2 8.7-.6 12 1.5.4.2.5.7.3 1.2Zm.1-3.1c-3.4-2-9-2.2-12.3-1.2-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 3.7-1.1 9.9-.9 13.8 1.4.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.4Z"
          />
        </svg>
      );
    case "website":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} />
          <path
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
            d="M12 3v18M3 12h18M6 6c3 3 9 3 12 0M6 18c3-3 9-3 12 0"
          />
        </svg>
      );
  }
}

function Row({
  type,
  label,
  delay,
  textColor,
}: {
  type: keyof typeof BRAND_COLORS;
  label: string;
  delay: number;
  /** Fast ljus när ett foto/scrim ligger bakom, annars temats text-färg. */
  textColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3"
      style={{ justifyContent: "flex-end" }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
          color: textColor,
          lineHeight: 1.2,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <Icon type={type} />
    </motion.div>
  );
}

export function SpeakerIntro({
  name,
  title,
  eyebrow,
  videoSrc,
  videoPoster,
  background,
  bookSrc,
  bookAlt = "Bok",
  linkedin,
  instagram,
  email,
  spotify1,
  spotify2,
  website,
}: SpeakerIntroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // När ett foto + scrim ligger bakom texten är ytan alltid mörk (på båda
  // teman). Då måste texten vara fast ljus. Utan foto följer texten temat
  // (mörk på dagsljus, ljus på nattglas).
  const onDarkBackdrop = Boolean(background);
  const primaryText = onDarkBackdrop ? "rgba(245,246,250,0.92)" : "var(--text)";

  function handlePlayClick(e: React.MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Fotobakgrund */}
      {background ? (
        <img
          src={background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.92)" }}
        />
      ) : null}

      {/* Riktad gradient: mörk vänster (text), ljusare höger (media), djup vinjett.
          Endast när det finns ett foto bakom — annars skulle scrimmen mörklägga
          den ljusa temabakgrunden och dölja temafärgad text. */}
      {background ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(10,9,8,0.82) 0%, rgba(10,9,8,0.55) 35%, rgba(10,9,8,0.2) 60%, rgba(10,9,8,0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 65% 52%, transparent 0%, transparent 40%, rgba(10,9,8,0.35) 100%)",
            }}
          />
        </>
      ) : null}

      {/* Typografi- och media-grid */}
      <div
        className="relative h-full"
        style={{
          display: "grid",
          gridTemplateColumns: "0.85fr 1.15fr",
          gridTemplateRows: "auto 1fr auto",
          rowGap: "1.5rem",
          columnGap: "2.5rem",
          padding: "clamp(2.75rem, 4.5vw, 4.5rem)",
          zIndex: 4,
        }}
      >
        {/* Eyebrow (spans both cols) */}
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              gridColumn: "1 / span 2",
              gridRow: "1",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.72rem, 0.9vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#B4763A",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "3rem",
                height: "1.5px",
                background: "#B4763A",
              }}
            />
            <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {/* Namn + tagline (col 1, row 2), stackade */}
        <div
          style={{
            gridColumn: "1",
            gridRow: "2",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "1.1rem",
            minWidth: 0,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(2.8rem, 7.6vw, 7rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.025em",
              color: primaryText,
              margin: 0,
            }}
          >
            <EditableText path="name" value={name ?? ""}>{name}</EditableText>
          </motion.h1>
          {title ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(1rem, 1.45vw, 1.35rem)",
                lineHeight: 1.4,
                color: onDarkBackdrop ? "rgba(245,246,250,0.82)" : "var(--text)",
                opacity: onDarkBackdrop ? 1 : 0.88,
                margin: 0,
                maxWidth: "26em",
                whiteSpace: "pre-line",
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Media-kolumn (col 2, row 2): polaroid + bok */}
        <div
          style={{
            gridColumn: "2",
            gridRow: "2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Bok — lutar mot polaroidens vänstra nedre hörn, fullt synlig */}
            {bookSrc ? (
              <motion.div
                initial={{ opacity: 0, rotate: 0, x: 24, y: 12 }}
                animate={{ opacity: 1, rotate: -8, x: 0, y: 0 }}
                transition={{ duration: 0.95, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute",
                  width: "clamp(150px, 17vw, 220px)",
                  right: "calc(100% - 36px)",
                  top: "38%",
                  transformOrigin: "bottom right",
                  zIndex: 1,
                  filter:
                    "drop-shadow(0 22px 32px rgba(0,0,0,0.55)) drop-shadow(0 8px 12px rgba(0,0,0,0.3))",
                }}
              >
                <img
                  src={bookSrc}
                  alt={bookAlt}
                  className="h-auto w-full"
                  style={{ borderRadius: "3px", display: "block" }}
                />
              </motion.div>
            ) : null}

            {/* Polaroid-kort (landscape 16:9) */}
            <motion.div
              initial={{ opacity: 0, y: 28, rotate: 0, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, rotate: -2.5, scale: 1 }}
              transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                zIndex: 2,
                width: "clamp(400px, 45vw, 660px)",
                background: "var(--text)",
                padding: "16px 16px 60px 16px",
                boxShadow:
                  "0 42px 72px -18px rgba(154, 58, 42, 0.48), 0 20px 32px -12px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "16 / 9", background: "#0a0908" }}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={videoPoster}
                  playsInline
                  preload="metadata"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  className="h-full w-full object-cover"
                />
                {!playing ? (
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    aria-label="Spela video"
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: "rgba(10,9,8,0.18)",
                      cursor: "pointer",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        width: "clamp(56px, 6vw, 82px)",
                        height: "clamp(56px, 6vw, 82px)",
                        borderRadius: "9999px",
                        background: "#B4763A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow:
                          "0 10px 28px rgba(180,118,58,0.55), 0 0 0 5px rgba(247,241,230,0.22)",
                      }}
                    >
                      <svg
                        width="38%"
                        height="42%"
                        viewBox="0 0 24 24"
                        fill="rgba(245,246,250,0.92)"
                        style={{ marginLeft: "10%" }}
                      >
                        <path d="M6 4 L20 12 L6 20 Z" />
                      </svg>
                    </motion.span>
                  </button>
                ) : null}
              </div>
              {/* Polaroid-caption (handskriven känsla) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "14px",
                  right: "14px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: '"Caveat", "Fraunces", serif',
                  fontSize: "1.2rem",
                  color: "var(--bg)",
                  letterSpacing: "0.01em",
                }}
              >
                {name}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Ikonkluster (col 2, row 3) — under videon, höger-justerat */}
        <div
          style={{
            gridColumn: "2",
            gridRow: "3",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            alignItems: "flex-end",
            justifyContent: "flex-end",
          }}
        >
          {linkedin ? <Row type="linkedin" label={linkedin} delay={0.85} textColor={primaryText} /> : null}
          {instagram ? <Row type="instagram" label={instagram} delay={0.95} textColor={primaryText} /> : null}
          {email ? <Row type="email" label={email} delay={1.05} textColor={primaryText} /> : null}
          {spotify1 ? <Row type="spotify" label={spotify1} delay={1.15} textColor={primaryText} /> : null}
          {spotify2 ? <Row type="spotify" label={spotify2} delay={1.25} textColor={primaryText} /> : null}
          {website ? <Row type="website" label={website} delay={1.35} textColor={primaryText} /> : null}
        </div>
      </div>
    </div>
  );
}
