"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * HopeMontage — spektakulär climax-slide där en glödande titel ("Ge dem
 * hopp") sitter som central ankare medan upp till 4 media-kort arriverar
 * som "polaroids" i slidens fyra hörn med staged reveal.
 *
 * Varje kort kommer in med blur-clear + scale-up + subtil rotation. Det
 * senast revealade kortet får en accent-glow-ring som markerar att det
 * är "i fokus". Tidigare kort stannar synliga med mjuk skugga.
 *
 * Auto-detect video vs bild från filändelse. Videos spelar muted, looped,
 * autoplay direkt vid mount.
 *
 * MDX-format:
 * ```mdx
 * <HopeMontage
 *   chapter="§ Avslutning · Hopp"
 *   title="Ge dem hopp."
 *   subtitle="Det är vårt mandat."
 *   accent= "var(--accent)"
 *   background="..."
 * >
 * - /bilder/.../alspatient.mp4 · AI hjälper ALS-patient kommunicera
 * - /bilder/.../neuralink.mp4 · Neuralink — BCI-genombrott
 * - /bilder/.../solvesmathproblem.png · AI vinner IMO-guld
 * - /bilder/.../virtuellcell.png · Virtuella celler för biologi
 * </HopeMontage>
 * ```
 *
 * Per rad: `Path · Caption`.
 */

interface HopeMontageProps {
  chapter?: string;
  /** Stora titel-anchorn. */
  title?: string;
  /** Subtil undertitel under titel. */
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.8. */
  overlay?: number | string;
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

/**
 * 4-hörns-positioner runt titeln. Varje slot:
 *   - top, left (procent av slide)
 *   - width, height (procent)
 *   - rotation (grader)
 */
interface Slot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  rotation: number;
}

const SLOT_POSITIONS: Slot[] = [
  // Övre vänster
  { top: "8%", left: "5%", width: "30%", rotation: -3 },
  // Övre höger
  { top: "8%", right: "5%", width: "30%", rotation: 2.5 },
  // Nedre vänster
  { bottom: "8%", left: "5%", width: "30%", rotation: -2 },
  // Nedre höger
  { bottom: "8%", right: "5%", width: "30%", rotation: 3 },
];

export function HopeMontage({
  chapter,
  title = "Ge dem hopp.",
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.8,
  children,
}: HopeMontageProps) {
  const items = useMemo(() => parseMedia(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // Steps: 0 = bara titel, 1..N = + N-te kortet
  const step = useSlideSteps(items.length + 1);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  // Säkerställ att videos spelar när de blir synliga
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const visible = step > i;
      if (visible) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      }
    });
  }, [step]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
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
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Stort accent-halo bakom titeln, andas */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.55, scale: [0.95, 1.08, 0.95] }}
        transition={{
          opacity: { duration: 1.6, delay: 0.4 },
          scale: {
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          },
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70vmin",
          height: "70vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.27)} 0%, transparent 65%)`,
          filter: "blur(45px)",
          zIndex: 1,
        }}
      />

      {/* Sekundär ljusstripa horisontellt */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 0.5, scaleX: 1 }}
        transition={{ duration: 1.8, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "50%",
          left: "10%",
          right: "10%",
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          boxShadow: `0 0 30px ${withAlpha(accent, 0.67)}, 0 0 80px ${withAlpha(accent, 0.33)}`,
          zIndex: 2,
          transformOrigin: "center",
        }}
      />

      {/* Central titel med subtitle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(0.5rem, 1.4vh, 1rem)",
          zIndex: 4,
          textAlign: "center",
          maxWidth: "min(900px, 90%)",
          padding: "0 clamp(2rem, 4vw, 4rem)",
        }}
      >
        <motion.h2
          initial={{ opacity: 0, scale: 0.7, filter: "blur(18px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.4,
            delay: 0.3,
            ease: [0.22, 1.05, 0.36, 1],
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(3.5rem, 7vw, 7.5rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.04em",
            color: "var(--text)",
            margin: 0,
            textShadow: `0 0 60px ${withAlpha(accent, 0.53)}, 0 0 120px ${withAlpha(accent, 0.27)}, 0 0 200px ${withAlpha(accent, 0.13)}`,
          }}
        >
          <EditableText path="title" value={title}>
            {renderInline(title, accent)}
          </EditableText>
        </motion.h2>
        {subtitle ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
              color: "var(--text)",
              letterSpacing: "-0.005em",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {renderInline(subtitle, accent)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {/* Media-korten i 4 hörn */}
      {items.map((item, i) => {
        const slot = SLOT_POSITIONS[i % SLOT_POSITIONS.length];
        const visible = step > i;
        const isLatest = step === i + 1;
        const slotPos: React.CSSProperties = {
          ...(slot.top !== undefined ? { top: slot.top } : {}),
          ...(slot.bottom !== undefined ? { bottom: slot.bottom } : {}),
          ...(slot.left !== undefined ? { left: slot.left } : {}),
          ...(slot.right !== undefined ? { right: slot.right } : {}),
        };

        return (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              scale: 0.65,
              filter: "blur(24px)",
              rotate: 0,
            }}
            animate={{
              opacity: visible ? 1 : 0,
              scale: visible ? 1 : 0.65,
              filter: visible ? "blur(0px)" : "blur(24px)",
              rotate: visible ? slot.rotation : 0,
            }}
            transition={{
              duration: 1.0,
              ease: [0.22, 1.05, 0.36, 1],
            }}
            style={{
              position: "absolute",
              ...slotPos,
              width: slot.width,
              zIndex: isLatest ? 10 : 3,
              pointerEvents: visible ? "auto" : "none",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 10",
                borderRadius: "0.6rem",
                overflow: "hidden",
                background: "#0a0908",
                border: isLatest
                  ? `2px solid ${accent}`
                  : `1px solid ${withAlpha(accent, 0.33)}`,
                boxShadow: isLatest
                  ? `0 32px 70px -16px ${withAlpha(accent, 0.67)}, 0 0 80px ${withAlpha(accent, 0.33)}, inset 0 1px 0 ${withAlpha(accent, 0.4)}`
                  : `0 22px 50px -12px rgba(0,0,0,0.65), 0 0 30px ${withAlpha(accent, 0.13)}`,
                transition: "border 0.6s, box-shadow 0.6s",
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
                /* eslint-disable-next-line @next/next/no-img-element */
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
              {/* Caption-gradient overlay */}
              {item.caption ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
                  transition={{ duration: 0.5, delay: visible ? 0.6 : 0 }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background:
                      "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)",
                    padding: "1.4rem 0.85rem 0.7rem",
                    color: "rgba(245,246,250,0.92)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.005em",
                    textShadow: "0 2px 8px rgba(0,0,0,0.85)",
                  }}
                >
                  {item.caption}
                </motion.div>
              ) : null}

              {/* Latest-glow accent-ring */}
              {isLatest ? (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "0.8rem",
                    border: `2px solid ${accent}`,
                    pointerEvents: "none",
                    boxShadow: `0 0 30px ${withAlpha(accent, 0.67)}`,
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        );
      })}

      {/* Stega-indikator */}
      {items.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.7, delay: 1.5 }}
          style={{
            position: "absolute",
            bottom: "clamp(0.8rem, 1.5vh, 1.4rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: `${withAlpha(accent, 0.67)}`,
            zIndex: 6,
          }}
        >
          <span>← →</span>
          <span style={{ color: "var(--text-muted)" }}>
            {String(step).padStart(2, "0")} /{" "}
            {String(items.length).padStart(2, "0")}
          </span>
        </motion.div>
      ) : null}
    </div>
  );
}
