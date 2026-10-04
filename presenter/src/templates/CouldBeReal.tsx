"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { Lightbox } from "./Lightbox";
import { unwrapLazy } from "@/lib/extract-text";

interface CouldBeRealProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Stor titel som "rasar in" efter videosna. */
  title: string;
  /** Liten rad under titeln när den är revealad. */
  subtitle?: string;
  /** Visa "AI"-badge i hörnet på varje video. Default true. */
  showBadge?: boolean;
  /** Bakgrund. */
  background?: string;
  /** Accentfärg för badges & glow. */
  accent?: string;
  /** Stegvis: steg 1 = titel rasar in. Default true. */
  stepped?: boolean;
  /**
   * Markdown-lista med video-källor (5 rader). Första hamnar i den stora
   * vänstra panelen, resterande fyra i 2×2 till höger.
   *
   * Format per rad: `- /path/to/video.mp4`
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseVideos(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const url = raw.split(/\s+/)[0]; // tillåt extra text efter URL
    if (url) out.push(url);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

/**
 * CouldBeReal — bento-mosaik av fem auto-playing videos som "kunde varit
 * sanna". En stor till vänster, fyra mindre i 2×2 till höger. Stagger-
 * fade-in. Klick på en video öppnar Lightbox med fullscreen-uppspelning.
 *
 * Stegvis reveal: videosna kommer in först, sedan rasar titeln in över
 * mosaiken — för att markera "allt detta är AI".
 */
export function CouldBeReal({
  kicker,
  title,
  subtitle,
  showBadge = true,
  background,
  accent = "var(--accent)",
  stepped = true,
  children,
}: CouldBeRealProps) {
  const videos = parseVideos(children);
  // Steg 0: videos fade-in. Steg 1: titel rasar in över.
  const step = useSlideSteps(stepped ? 2 : 0);
  const titleIn = stepped ? step >= 1 : true;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const bg = background ?? "var(--slide-base, var(--bg))";

  // Bento-positioner — index 0 är "hero", resten thumbnails.
  //
  // Två uppsättningar: fem videos ligger i ett 4-kolumnersrutnät (hero 2×2 +
  // 2×2 thumbnails), sex eller sju i ett 5-kolumnersrutnät (hero 2×2 + upp
  // till sex thumbnails). Utan den andra uppsättningen faller video 6 och 7
  // tillbaka på hero-positionen och staplas ovanpå den första.
  const wide = videos.length > 5;
  const positions = wide
    ? [
        { gridColumn: "1 / span 2", gridRow: "1 / span 2" }, // hero
        { gridColumn: "3 / span 1", gridRow: "1 / span 1" },
        { gridColumn: "4 / span 1", gridRow: "1 / span 1" },
        { gridColumn: "5 / span 1", gridRow: "1 / span 1" },
        { gridColumn: "3 / span 1", gridRow: "2 / span 1" },
        { gridColumn: "4 / span 1", gridRow: "2 / span 1" },
        { gridColumn: "5 / span 1", gridRow: "2 / span 1" },
      ]
    : [
        { gridColumn: "1 / span 2", gridRow: "1 / span 2" }, // hero
        { gridColumn: "3 / span 1", gridRow: "1 / span 1" },
        { gridColumn: "4 / span 1", gridRow: "1 / span 1" },
        { gridColumn: "3 / span 1", gridRow: "2 / span 1" },
        { gridColumn: "4 / span 1", gridRow: "2 / span 1" },
      ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Kicker uppe vänster */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 6,
          }}
        >
          {kicker}
        </motion.div>
      ) : null}

      {/* Bento-grid med videos */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "clamp(3.5rem, 6vh, 5rem) clamp(2rem, 4vw, 4rem)",
          display: "grid",
          gridTemplateColumns: wide ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
          gridTemplateRows: "1fr 1fr",
          gap: "clamp(0.75rem, 1.5vw, 1.5rem)",
        }}
      >
        {videos.map((src, i) => {
          const pos = positions[i] ?? positions[0];
          return (
            <motion.button
              key={src + i}
              type="button"
              onClick={() => setLightbox(src)}
              aria-label={`Förstora video ${i + 1}`}
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.85,
                delay: 0.3 + i * 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                all: "unset",
                ...pos,
                position: "relative",
                borderRadius: "0.6rem",
                overflow: "hidden",
                background: "#0f0a08",
                border: `1px solid ${withAlpha(accent, 0.13)}`,
                boxShadow:
                  "0 30px 60px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
                cursor: "zoom-in",
                transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.012)";
                e.currentTarget.style.boxShadow = `0 40px 80px -25px rgba(0,0,0,0.8), 0 0 40px -10px ${withAlpha(accent, 0.53)}, inset 0 0 0 1px ${withAlpha(accent, 0.33)}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 30px 60px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)";
              }}
            >
              <video
                src={src}
                muted
                loop
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  position: "absolute",
                  inset: 0,
                }}
              />

              {/* Subtil mörk vinjetering i nedre kanten */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.45) 100%)",
                  pointerEvents: "none",
                }}
              />

              {/* AI-badge i nedre vänstra hörnet */}
              {showBadge ? (
                <div
                  style={{
                    position: "absolute",
                    bottom: "0.6rem",
                    left: "0.6rem",
                    padding: "0.25rem 0.55rem",
                    background: "rgba(10,9,8,0.7)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    border: `1px solid ${withAlpha(accent, 0.4)}`,
                    borderRadius: "0.3rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: accent,
                    pointerEvents: "none",
                  }}
                >
                  AI
                </div>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* Titel rasar in över mosaiken */}
      <AnimatePresence>
        {titleIn ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 55%, rgba(10,9,8,0.78) 0%, rgba(10,9,8,0.55) 45%, rgba(10,9,8,0.2) 80%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(0.8rem, 1.5vh, 1.5rem)",
              padding: "clamp(2rem, 4vw, 4rem)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <motion.h2
              initial={{ y: -36, opacity: 0, letterSpacing: "0.05em" }}
              animate={{ y: 0, opacity: 1, letterSpacing: "-0.03em" }}
              transition={{
                duration: 0.95,
                delay: 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(3rem, 7vw, 6.5rem)",
                lineHeight: 0.98,
                color: "rgba(245,246,250,0.92)",
                margin: 0,
                textAlign: "center",
                textShadow: "0 4px 40px rgba(0,0,0,0.6)",
              }}
            >
              {title}
            </motion.h2>
            {subtitle ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem, 1.3vw, 1.4rem)",
                  color: "rgba(245,246,250,0.92)",
                  margin: 0,
                  maxWidth: "32em",
                  textAlign: "center",
                  lineHeight: 1.45,
                }}
              >
                {subtitle}
              </motion.p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mosaiken är en tyst vägg — det gäller även när ett klipp öppnas i
          fullskärm mitt i en föreläsning. */}
      <Lightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        video={lightbox ?? undefined}
        muted
      />
    </div>
  );
}
