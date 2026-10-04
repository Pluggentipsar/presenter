"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import {
  AmbientBackdrop,
  glassCardStyle,
  SpecularHighlight,
} from "./_decorations/GlassDecorations";

interface LiquidSpeakerIntroProps {
  name: string;
  title?: string;
  eyebrow?: string;
  videoSrc: string;
  videoPoster?: string;
  background?: string;
  bookSrc?: string;
  bookAlt?: string;
  linkedin?: string;
  instagram?: string;
  email?: string;
  spotify1?: string;
  spotify2?: string;
  website?: string;
  /** Sekundär accent för ambient orb (default violett). */
  accent2?: string;
}

// Tema-medveten (var-driven) — funkar på alla teman, inte bara nattglas.
const DARKAPPLE = {
  bg: "var(--slide-base, var(--bg))",
  text: "var(--text)",
  textMuted: "var(--text-muted)",
  accent: "var(--accent)",
  accent2: "var(--accent-bright)",
  accentGlow: "var(--accent-glow)",
};

type SocialType = "linkedin" | "instagram" | "email" | "spotify" | "website";

const BRAND_COLORS: Record<SocialType, string> = {
  linkedin: "#0A66C2",
  instagram: "#E4405F",
  email: "#EA4335",
  spotify: "#1DB954",
  website: "var(--accent)",
};

function SocialIcon({ type }: { type: SocialType }) {
  const color = BRAND_COLORS[type];
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    style: { flexShrink: 0, display: "block" },
  } as const;

  switch (type) {
    case "linkedin":
      return (
        <svg {...common}>
          <rect width="24" height="24" rx="5" fill={color} />
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
            <linearGradient id="lsi-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#lsi-ig-grad)" />
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
          <rect width="24" height="24" rx="5" fill="#fff" />
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

function DockChip({
  type,
  label,
  delay,
}: {
  type: SocialType;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 26,
        delay,
      }}
      whileHover={{
        y: -6,
        scale: 1.06,
        transition: { type: "spring", stiffness: 400, damping: 22 },
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        padding: "0.5rem 0.85rem 0.5rem 0.55rem",
        background:
          "var(--glass-card-bg, linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%))",
        backdropFilter:
          "blur(20px) saturate(180%) brightness(var(--glass-card-brightness, 115%))",
        WebkitBackdropFilter:
          "blur(20px) saturate(180%) brightness(var(--glass-card-brightness, 115%))",
        border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
        borderTopColor: "var(--glass-border-top, rgba(255,255,255,0.18))",
        borderRadius: "12px",
        boxShadow:
          "var(--glass-card-shadow, 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08))",
        cursor: "default",
        overflow: "hidden",
      }}
    >
      <SpecularHighlight intensity={0.12} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "0.55rem" }}>
        <SocialIcon type={type} />
        <span
          style={{
            fontFamily: '"SF Pro Text", "Inter", -apple-system, system-ui, sans-serif',
            fontSize: "0.88rem",
            color: DARKAPPLE.text,
            letterSpacing: "-0.01em",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export function LiquidSpeakerIntro({
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
  accent2 = DARKAPPLE.accent2,
}: LiquidSpeakerIntroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Staged reveal: step 0 = paused (play-knapp synlig), step 1 = video spelar
  const step = useSlideSteps(2);

  // Autoplay vid step >= 1 (triggas av piltryck/mellanslag)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (step >= 1 && v.paused) {
      v.play().catch(() => {
        /* Browser autoplay-policy kan blockera — knappen är fortfarande synlig */
      });
    }
    if (step === 0) v.pause();
    return () => { v.pause(); };
  }, [step]);

  function handlePlayClick(e: React.MouseEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  const socials: Array<{ type: SocialType; label: string }> = [];
  if (linkedin) socials.push({ type: "linkedin", label: linkedin });
  if (instagram) socials.push({ type: "instagram", label: instagram });
  if (email) socials.push({ type: "email", label: email });
  if (spotify1) socials.push({ type: "spotify", label: spotify1 });
  if (spotify2) socials.push({ type: "spotify", label: spotify2 });
  if (website) socials.push({ type: "website", label: website });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: DARKAPPLE.bg,
        color: DARKAPPLE.text,
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <AmbientBackdrop
        background={background}
        overlay={0.78}
        accent={DARKAPPLE.accent}
        accent2={accent2}
      />

      {/* Subtle drifting specular sweep — Apple signature */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.4, 0],
          x: ["-30%", "60%", "120%"],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          repeatDelay: 6,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "30%",
          background:
            "linear-gradient(110deg, transparent 0%, rgba(122,168,255,0.06) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
          mixBlendMode: "screen",
        }}
      />

      {/* Main grid */}
      <div
        className="relative h-full"
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gridTemplateRows: "auto 1fr auto",
          rowGap: "1.25rem",
          columnGap: "clamp(2rem, 4vw, 4rem)",
          padding: "clamp(2.25rem, 4vw, 3.75rem) clamp(2.5rem, 5vw, 5rem) clamp(1.5rem, 3vh, 2.25rem)",
          zIndex: 4,
        }}
      >
        {/* Eyebrow */}
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              gridColumn: "1 / span 2",
              gridRow: "1",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.85rem))",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: DARKAPPLE.accent,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "2.5rem",
                height: "1px",
                background: `linear-gradient(90deg, transparent 0%, ${DARKAPPLE.accent} 100%)`,
              }}
            />
            <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {/* Left: Hero typography */}
        <div
          style={{
            gridColumn: "1",
            gridRow: "2",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "1.4rem",
            minWidth: 0,
            paddingRight: "1rem",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.95,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              fontFamily:
                '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: "clamp(3rem, 8.2vw, 10rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: DARKAPPLE.text,
              margin: 0,
              textShadow: `0 0 80px rgba(122,168,255,0.22)`,
            }}
          >
            <EditableText path="name" value={name ?? ""}>{name}</EditableText>
          </motion.h1>

          {/* Subtle accent line — Apple-style underline that draws in */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "7rem", opacity: 1 }}
            transition={{
              duration: 0.9,
              delay: 0.65,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              height: "2px",
              background: `linear-gradient(90deg, ${DARKAPPLE.accent} 0%, ${accent2} 100%)`,
              borderRadius: "2px",
              boxShadow: `0 0 14px ${DARKAPPLE.accentGlow}`,
            }}
          />

          {title ? (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.75,
                delay: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                fontFamily:
                  '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 400,
                fontSize: "var(--room-body, clamp(1.05rem, 1.4vw, 1.4rem))",
                lineHeight: 1.45,
                color: DARKAPPLE.text,
                opacity: 0.82,
                margin: 0,
                maxWidth: "30em",
                whiteSpace: "pre-line",
                letterSpacing: "-0.005em",
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Right: Glass-framed video + peeking book */}
        <div
          style={{
            gridColumn: "2",
            gridRow: "2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            position: "relative",
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: "min(740px, 96%)" }}>
            {/* Book — floating glass card peeking from bottom-right */}
            {bookSrc ? (
              <motion.div
                initial={{ opacity: 0, x: 50, y: 40, rotate: 0 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: -7 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 28,
                  delay: 0.85,
                }}
                style={{
                  position: "absolute",
                  width: "clamp(100px, 11vw, 150px)",
                  right: "-9%",
                  bottom: "-14%",
                  zIndex: 3,
                  filter:
                    "drop-shadow(0 28px 56px rgba(0,0,0,0.6)) drop-shadow(0 10px 18px rgba(122,168,255,0.22))",
                  transformOrigin: "bottom right",
                }}
              >
                {/* Glass frame around book */}
                <div
                  style={{
                    padding: "8px",
                    background:
                      "var(--glass-card-bg, linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%))",
                    backdropFilter:
                      "blur(16px) saturate(160%) brightness(var(--glass-card-brightness, 100%))",
                    WebkitBackdropFilter:
                      "blur(16px) saturate(160%) brightness(var(--glass-card-brightness, 100%))",
                    border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
                    borderTopColor: "var(--glass-border-top, rgba(255,255,255,0.22))",
                    borderRadius: "10px",
                    boxShadow:
                      "var(--glass-card-shadow, 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08))",
                  }}
                >
                  <img
                    src={bookSrc}
                    alt={bookAlt}
                    className="h-auto w-full"
                    style={{
                      borderRadius: "4px",
                      display: "block",
                    }}
                  />
                </div>
              </motion.div>
            ) : null}

            {/* Video — main glass-frame */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 26,
                delay: 0.35,
              }}
              style={{
                position: "relative",
                zIndex: 2,
                ...glassCardStyle({
                  radius: "24px",
                  blur: 28,
                  padding: "10px",
                }),
                boxShadow:
                  "0 32px 80px rgba(0,0,0,0.55), 0 14px 32px rgba(122,168,255,0.15), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}
            >
              <SpecularHighlight intensity={0.20} />

              <div
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "16 / 9",
                  background: "#000",
                  borderRadius: "16px",
                  zIndex: 1,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={videoPoster}
                  playsInline
                  preload="auto"
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
                      background:
                        "linear-gradient(180deg, rgba(6,7,12,0.15) 0%, rgba(6,7,12,0.35) 100%)",
                      cursor: "pointer",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <motion.span
                      animate={{
                        scale: [1, 1.06, 1],
                        boxShadow: [
                          `0 16px 40px rgba(122,168,255,0.45), 0 0 0 6px rgba(122,168,255,0.12)`,
                          `0 18px 48px rgba(122,168,255,0.6), 0 0 0 10px rgba(122,168,255,0.18)`,
                          `0 16px 40px rgba(122,168,255,0.45), 0 0 0 6px rgba(122,168,255,0.12)`,
                        ],
                      }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        width: "clamp(64px, 6.5vw, 88px)",
                        height: "clamp(64px, 6.5vw, 88px)",
                        borderRadius: "9999px",
                        background:
                          "linear-gradient(135deg, #8fb6ff 0%, #7aa8ff 50%, #6b95f0 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      <svg
                        width="36%"
                        height="40%"
                        viewBox="0 0 24 24"
                        fill="#fff"
                        style={{ marginLeft: "12%", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                      >
                        <path d="M6 4 L20 12 L6 20 Z" />
                      </svg>
                    </motion.span>
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom: Apple Dock-inspired social cluster (spans both cols) */}
        {socials.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.9,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              gridColumn: "1 / span 2",
              gridRow: "3",
              display: "flex",
              justifyContent: "center",
              paddingTop: "clamp(1rem, 2vh, 1.5rem)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                gap: "0.65rem",
                padding: "0.7rem",
                background:
                  "var(--glass-card-bg, linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%))",
                backdropFilter:
                  "blur(28px) saturate(180%) brightness(var(--glass-card-brightness, 115%))",
                WebkitBackdropFilter:
                  "blur(28px) saturate(180%) brightness(var(--glass-card-brightness, 115%))",
                border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                borderTopColor: "var(--glass-border-top, rgba(255,255,255,0.20))",
                borderRadius: "20px",
                boxShadow:
                  "var(--glass-card-shadow, 0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2))",
                overflow: "hidden",
              }}
            >
              <SpecularHighlight intensity={0.14} />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  gap: "0.55rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {socials.map((s, i) => (
                  <DockChip
                    key={`${s.type}-${i}`}
                    type={s.type}
                    label={s.label}
                    delay={1.0 + i * 0.06}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
