"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MediaCarousel — text-kolumn till vänster + horisontell carousel av
 * video/bild till höger. Aktiv media i mitten, övriga peekar in från
 * sidorna i mörkare/mindre format. Aktiv video spelas auto-loop muted;
 * andra pausas. Stega framåt med pil-höger för att slidea till nästa.
 *
 * Filändelser auto-detekteras: .mp4/.webm/.mov/.ogg → video, övriga → bild.
 *
 * MDX-format:
 * ```mdx
 * <MediaCarousel
 *   chapter="§ Infosfären"
 *   title="Och en del är inte propaganda."
 *   stat1="52% · av webbens artiklar är AI-genererade · Originalia 2024"
 *   stat2="20% · av Instagram-flödet är AI-content · Meta-rapporter"
 *   subtitle="AI är inte längre **något** man möter ibland. Det är **vad infosfären är.**"
 *   accent= "var(--accent)"
 *   background="..."
 * >
 * - /videos/foo.mp4 · Italian brainrot
 * - /videos/bar.mp4 · Will Smith spaghetti
 * - /bilder/jesus.png · AI-Jesus
 * </MediaCarousel>
 * ```
 *
 * Per rad: `Path · Caption(optional)`
 */

interface MediaCarouselProps {
  chapter?: string;
  title?: string;
  /** Stat 1 — format: "värde · etikett · källa". */
  stat1?: string;
  /** Stat 2 — samma format. */
  stat2?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay på bakgrundsbild (0-1). Default 0.78. */
  overlay?: number | string;
  /**
   * Card-orientering:
   * - "landscape" (default) = 16:9 (typiska desktop-/YouTube-format)
   * - "portrait" = 9:16 (Instagram-, TikTok-, Reels-format)
   */
  orientation?: "landscape" | "portrait";
  children?: ReactNode;
}

interface MediaItem {
  src: string;
  caption: string;
  isVideo: boolean;
}

const VIDEO_EXTS = ["mp4", "webm", "mov", "ogg", "m4v"];

function getExtension(src: string): string {
  const m = src.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return m ? m[1].toLowerCase() : "";
}

function isVideoFile(src: string): boolean {
  return VIDEO_EXTS.includes(getExtension(src));
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseMedia(children: ReactNode): MediaItem[] {
  const out: MediaItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const src = (parts[0] ?? "").trim();
    const caption = parts.slice(1).join(" · ").trim();
    if (!src) return;
    out.push({ src, caption, isVideo: isVideoFile(src) });
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

interface ParsedStat {
  value: string;
  label: string;
  source: string;
}

function parseStat(raw: string | undefined): ParsedStat | null {
  if (!raw) return null;
  const parts = raw.split(/\s*·\s*/);
  return {
    value: (parts[0] ?? "").trim(),
    label: (parts[1] ?? "").trim(),
    source: parts.slice(2).join(" · ").trim(),
  };
}

export function MediaCarousel({
  chapter,
  title,
  stat1,
  stat2,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  orientation = "landscape",
  children,
}: MediaCarouselProps) {
  const items = useMemo(() => parseMedia(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(Math.max(items.length, 1));
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const isPortrait = orientation === "portrait";

  // Spela aktiv video, pausa övriga
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === step) {
        // Starta från början varje gång den blir aktiv
        try {
          video.currentTime = 0;
        } catch {
          /* ignore — vissa codecs stödjer inte set currentTime före loaded */
        }
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            /* autoplay rejection — strunta i */
          });
        }
      } else {
        video.pause();
      }
    });
  }, [step]);

  const stat1Parsed = parseStat(stat1);
  const stat2Parsed = parseStat(stat2);

  // Carousel-geometri — absolut positionering så centreringen är deterministisk
  // Portrait (9:16) cards är smalare → fler peeks synliga
  // Landscape (16:9) cards är bredare → en med små peeks
  const cardWidthPct = isPortrait ? 42 : 70; // % av carousel-container
  const gapPct = 4;
  const stepWidthPct = cardWidthPct + gapPct;
  // Med absolut positionering: card 0 är centrerad vid step 0, varje step skiftar -stepWidth
  const translatePct = -step * stepWidthPct;
  const cardAspect = isPortrait ? "9 / 16" : "16 / 9";
  // Card 0:s startposition (centrerad i carousel-container)
  const card0LeftPct = 50 - cardWidthPct / 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 38%) minmax(0, 62%)",
          paddingTop: "clamp(2.2rem, 4vh, 4rem)",
          paddingBottom: "clamp(2.2rem, 4vh, 4rem)",
          paddingLeft: "clamp(2.5rem, 5vw, 5rem)",
          paddingRight: 0,
          gap: "clamp(1.4rem, 2.5vw, 2.5rem)",
          zIndex: 2,
          alignItems: "stretch",
        }}
      >
        {/* Vänsterkolumn — text + stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.6rem)",
            minWidth: 0,
            justifyContent: "center",
          }}
        >
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.7rem, 2.8vw, 2.7rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
            </motion.h2>
          ) : null}

          {/* Stats */}
          {stat1Parsed || stat2Parsed ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.7rem, 1.4vh, 1.1rem)",
              }}
            >
              {stat1Parsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(2.4rem, 4.6vw, 3.8rem)",
                      color: accent,
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                      textShadow: `0 0 60px ${withAlpha(accent, 0.33)}`,
                    }}
                  >
                    {stat1Parsed.value}
                  </div>
                  {stat1Parsed.label ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                        color: "var(--text)",
                        lineHeight: 1.35,
                        marginTop: "0.3rem",
                      }}
                    >
                      {renderInline(stat1Parsed.label, accent)}
                    </div>
                  ) : null}
                  {stat1Parsed.source ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {stat1Parsed.source}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
              {stat2Parsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(2.4rem, 4.6vw, 3.8rem)",
                      color: accent,
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                      textShadow: `0 0 60px ${withAlpha(accent, 0.33)}`,
                    }}
                  >
                    {stat2Parsed.value}
                  </div>
                  {stat2Parsed.label ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                        color: "var(--text)",
                        lineHeight: 1.35,
                        marginTop: "0.3rem",
                      }}
                    >
                      {renderInline(stat2Parsed.label, accent)}
                    </div>
                  ) : null}
                  {stat2Parsed.source ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {stat2Parsed.source}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </div>
          ) : null}

          {subtitle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                color: "var(--text)",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}

          {/* Stega-hint */}
          {items.length > 1 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: `${withAlpha(accent, 0.67)}`,
                marginTop: "1rem",
              }}
            >
              <span>← →</span>
              <span style={{ color: "var(--text-muted)" }}>
                {String(step + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </span>
            </motion.div>
          ) : null}
        </div>

        {/* Höger — carousel */}
        <div
          style={{
            position: "relative",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ x: `${translatePct}%` }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {items.map((item, i) => {
              const isActive = i === step;
              const distance = Math.abs(i - step);
              const cardLeftPct = card0LeftPct + i * stepWidthPct;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${cardLeftPct}%`,
                    top: "50%",
                    width: `${cardWidthPct}%`,
                    aspectRatio: cardAspect,
                    maxHeight: "94%",
                    transition: "opacity 0.6s, transform 0.6s, filter 0.6s",
                    opacity: isActive ? 1 : Math.max(0.18, 0.5 - distance * 0.12),
                    transform: isActive
                      ? "translateY(-50%) scale(1)"
                      : `translateY(-50%) scale(${Math.max(0.82, 0.94 - distance * 0.06)})`,
                    filter: isActive
                      ? "none"
                      : `saturate(0.4) brightness(0.5) blur(${distance > 1 ? 1 : 0}px)`,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "0.75rem",
                      overflow: "hidden",
                      background: "#0a0908",
                      border: isActive
                        ? `2px solid ${withAlpha(accent, 0.67)}`
                        : "1px solid rgba(247,241,230,0.10)",
                      boxShadow: isActive
                        ? `0 28px 64px -12px ${withAlpha(accent, 0.4)}, 0 0 0 1px ${withAlpha(accent, 0.2)}`
                        : "0 14px 32px -10px rgba(0,0,0,0.55)",
                      position: "relative",
                    }}
                  >
                    {item.isVideo ? (
                      <video
                        ref={(el) => {
                          videoRefs.current[i] = el;
                        }}
                        src={item.src}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <img
                        src={item.src}
                        alt={item.caption || ""}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}
                    {/* Caption-overlay */}
                    {item.caption ? (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background:
                            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)",
                          padding: "1.8rem 1.1rem 0.85rem",
                          color: "rgba(245,246,250,0.92)",
                          fontFamily: "var(--font-body)",
                          fontWeight: 500,
                          fontSize: "clamp(0.85rem, 1.05vw, 1.1rem)",
                          textShadow: "0 2px 8px rgba(0,0,0,0.85)",
                          opacity: isActive ? 1 : 0,
                          transition: "opacity 0.6s",
                          pointerEvents: "none",
                        }}
                      >
                        {item.caption}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
