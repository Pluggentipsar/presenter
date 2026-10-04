"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { Lightbox } from "./Lightbox";
import { unwrapLazy } from "@/lib/extract-text";

interface ReelItem {
  src: string;
  kind: "video" | "image";
  eyebrow: string;
  caption: string;
}

interface RevealReelProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Stor titel. */
  title: string;
  /** Liten subtitel under titeln. */
  subtitle?: string;
  /** Bakgrund. */
  background?: string;
  /** Accentfärg för aktiv-indikator och glow. */
  accent?: string;
  /**
   * Pipe-separerad lista med små badges som overlay-chips i nedre vänster
   * hörn av media-rutan. Visas på ALLA klipp — bra för "samma egenskaper
   * gäller varje exempel" (t.ex. "0 min installation|Gratis|Ingen kunskap").
   */
  overlayBadges?: string;
  /**
   * Markdown-lista med items, ett per rad.
   *
   * Format: `- /path/till/media.mp4 · Eyebrow · Caption-text`
   *
   * Filändelse (.mp4/.webm/.mov vs .png/.jpg/.gif) avgör om det renderas
   * som video eller bild.
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
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): ReelItem[] {
  const items: ReelItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const src = parts[0];
    const kind: ReelItem["kind"] = /\.(mp4|webm|mov)$/i.test(src)
      ? "video"
      : "image";
    items.push({
      src,
      kind,
      eyebrow: parts[1] ?? "",
      caption: parts[2] ?? "",
    });
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
  return items;
}

/**
 * RevealReel — fokuserad sekventiell visning av ett antal video- eller
 * bildklipp. Klick avancerar till nästa item. Tänkt för "visa hur enkelt"-
 * stunder där föreläsaren vill stoppa och prata om varje exempel innan
 * nästa avtäcks.
 *
 * Ett item visas stort i centrum (16:9). Under videon syns eyebrow +
 * caption. En tracker längst ned visar 1/N progress + klickbara prickar.
 * Klick på själva mediet öppnar Lightbox för förstoring.
 */
export function RevealReel({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlayBadges,
  children,
}: RevealReelProps) {
  const items = parseItems(children);
  const total = Math.max(items.length, 1);
  const step = useSlideSteps(total);
  const activeIndex = Math.min(step, items.length - 1);
  const active = items[activeIndex];
  const [lightbox, setLightbox] = useState<ReelItem | null>(null);
  const badges = overlayBadges
    ? overlayBadges.split("|").map((s) => s.trim()).filter(Boolean)
    : [];

  const bg = background ?? "var(--slide-base, var(--bg))";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Mjuk accent-glow bakom mediarutan */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 55%, ${withAlpha(accent, 0.09)}, transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem) clamp(3rem, 6vw, 6rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.75rem)",
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "48em" }}>
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
                color: "var(--text-muted)",
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
              fontSize: "clamp(2.2rem, 4.6vw, 4.3rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "var(--text)",
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
                fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                lineHeight: 1.5,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {/* Media-scen */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr minmax(15rem, 22rem)",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {/* Stor aktiv media */}
          <button
            type="button"
            onClick={() => active && setLightbox(active)}
            aria-label="Förstora aktivt klipp"
            style={{
              all: "unset",
              position: "relative",
              borderRadius: "0.7rem",
              overflow: "hidden",
              background: "#0f0a08",
              border: `1px solid ${withAlpha(accent, 0.2)}`,
              boxShadow: `0 35px 70px -25px rgba(0,0,0,0.75), 0 0 60px -10px ${withAlpha(accent, 0.33)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
              cursor: "zoom-in",
              transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease",
              minHeight: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 45px 90px -25px rgba(0,0,0,0.85), 0 0 80px -10px ${withAlpha(accent, 0.53)}, inset 0 0 0 1px ${withAlpha(accent, 0.33)}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = `0 35px 70px -25px rgba(0,0,0,0.75), 0 0 60px -10px ${withAlpha(accent, 0.33)}, inset 0 1px 0 rgba(255,255,255,0.04)`;
            }}
          >
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key={active.src}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  {active.kind === "video" ? (
                    <video
                      src={active.src}
                      muted
                      loop
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={active.src}
                      alt={active.eyebrow || active.caption || "Visa hur enkelt"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Räknare uppe i hörnet */}
            <div
              style={{
                position: "absolute",
                top: "0.85rem",
                left: "0.85rem",
                padding: "0.3rem 0.7rem",
                background: "rgba(10,9,8,0.65)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: `1px solid ${withAlpha(accent, 0.33)}`,
                borderRadius: "0.35rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: accent,
                pointerEvents: "none",
                zIndex: 4,
              }}
            >
              {items.length > 0 ? `${activeIndex + 1} / ${items.length}` : "—"}
            </div>

            {/* Overlay-badges nere till vänster */}
            {badges.length > 0 ? (
              <div
                style={{
                  position: "absolute",
                  bottom: "0.85rem",
                  left: "0.85rem",
                  right: "0.85rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              >
                {badges.map((badge, i) => (
                  <motion.div
                    key={badge + i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.4 + i * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "rgba(10,9,8,0.78)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: `1px solid ${withAlpha(accent, 0.55)}`,
                      borderRadius: "999px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(245,246,250,0.92)",
                      fontWeight: 500,
                      boxShadow: `0 0 18px ${withAlpha(accent, 0.3)}`,
                    }}
                  >
                    {badge}
                  </motion.div>
                ))}
              </div>
            ) : null}
          </button>

          {/* Caption-panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "clamp(0.8rem, 1.5vh, 1.25rem)",
              padding: "clamp(0.5rem, 1.5vh, 1.25rem) 0",
            }}
          >
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key={active.src + "-caption"}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {active.eyebrow ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: accent,
                        marginBottom: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: "0.55rem",
                          height: "0.55rem",
                          borderRadius: "50%",
                          background: accent,
                          boxShadow: `0 0 14px ${withAlpha(accent, 0.67)}`,
                        }}
                      />
                      {active.eyebrow}
                    </div>
                  ) : null}
                  {active.caption ? (
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                        fontSize: "clamp(1.1rem, 1.5vw, 1.55rem)",
                        lineHeight: 1.35,
                        letterSpacing: "-0.012em",
                        color: "var(--text)",
                      }}
                    >
                      {active.caption}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Tracker — klickbara prickar med thumb-preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.6rem, 1vw, 0.9rem)",
            paddingTop: "0.25rem",
          }}
        >
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const isPassed = i < activeIndex;
            return (
              <div
                key={item.src + "-tracker"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  opacity: isActive ? 1 : isPassed ? 0.65 : 0.32,
                  transition: "opacity 0.4s ease",
                }}
              >
                <div
                  style={{
                    width: isActive ? "1.6rem" : "0.5rem",
                    height: "0.5rem",
                    borderRadius: "999px",
                    background: isActive
                      ? accent
                      : isPassed
                      ? "var(--text-muted)"
                      : withAlpha("var(--text)", 0.22),
                    boxShadow: isActive ? `0 0 14px ${withAlpha(accent, 0.67)}` : "none",
                    transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: isActive
                      ? "var(--text)"
                      : "var(--text-muted)",
                    transition: "color 0.4s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.eyebrow || `Klipp ${i + 1}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Lightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        image={lightbox?.kind === "image" ? lightbox.src : undefined}
        video={lightbox?.kind === "video" ? lightbox.src : undefined}
        caption={
          lightbox
            ? [lightbox.eyebrow, lightbox.caption].filter(Boolean).join(" · ")
            : undefined
        }
      />
    </div>
  );
}
