"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * NarrativeFrames — fyra berättelser om AI, avslöjas en i taget.
 *
 * Tänkt för "Berättelsen om AI"-beatet. Visar 4 paralella narrativ
 * (förgörare / frälsare / verktyg / spegel etc) som horisontell rad.
 * I steg 0 är ett kort aktivt och övriga dimmade. Stega framåt
 * (space/pil) för att aktivera nästa kort. Sista kortet kan markeras
 * som "primary" via prefix `★ ` på namnet — det får accentstroke och
 * extra glow när det är aktivt.
 *
 * MDX-format:
 * ```mdx
 * <NarrativeFrames
 *   chapter="§ Berättelsen om AI"
 *   title="Berättelsen om AI"
 *   accent= "var(--accent)"
 * >
 * - Förgörare · Terminator, jobbkris, kontrollproblemet
 * - Frälsare · AGI löser klimatet, botar cancer
 * - Verktyg · Bara en hammare. Ingen magi, ingen risk.
 * - ★ Spegel · Vad vi ser oss själva i
 * </NarrativeFrames>
 * ```
 *
 * Format per rad: `Namn · Beskrivning`. Prefix `★ ` markerar primary.
 */

interface NarrativeFramesProps {
  /** Chapter-tagg uppe till höger. */
  chapter?: string;
  /** Stor titel. */
  title?: string;
  /** Underrubrik / framing. */
  subtitle?: string;
  /** Accent-färg. */
  accent?: string;
  /** Bakgrund. */
  background?: string;
  /** Mörk overlay (0-1). Default 0.6. */
  overlay?: number;
  /** Hint nederst när alla kort är synliga. */
  hint?: string;
  /** MDX-lista. Format: "Namn · Beskrivning", med prefix `★ ` för primary. */
  children?: ReactNode;
}

interface Frame {
  name: string;
  description: string;
  primary: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseFrames(children: ReactNode): Frame[] {
  const frames: Frame[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!raw) return;
      let working = raw;
      let primary = false;
      if (working.startsWith("★ ") || working.startsWith("★")) {
        primary = true;
        working = working.replace(/^★\s*/, "");
      }
      const idx = working.indexOf(" · ");
      if (idx > -1) {
        frames.push({
          name: working.slice(0, idx).trim(),
          description: working.slice(idx + 3).trim(),
          primary,
        });
      } else {
        frames.push({ name: working, description: "", primary });
      }
    });
  });
  return frames;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function NarrativeFrames({
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  background,
  overlay = 0.62,
  hint,
  children,
}: NarrativeFramesProps) {
  const frames = parseFrames(children);
  // Stegen är: 0 = inget aktivt (alla dimmade), 1..N = aktivera kort N-1.
  // Vi ger N+1 steg (initial + ett per kort).
  const totalSteps = frames.length + 1;
  const step = useSlideSteps(totalSteps);
  const activeIndex = step === 0 ? -1 : step - 1;

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
            color: "var(--text-muted)",
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
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Titel + subtitle */}
      <div
        style={{
          position: "absolute",
          top: "clamp(8vh, 12vh, 16vh)",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          zIndex: 4,
        }}
      >
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 4.4vw, 4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0.8rem 0 0",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              fontWeight: 400,
              color: "var(--text-muted)",
              maxWidth: "60ch",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* Kort-rad */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          display: "grid",
          gridTemplateColumns: `repeat(${frames.length}, 1fr)`,
          gap: "clamp(1rem, 2vw, 1.8rem)",
          zIndex: 3,
        }}
      >
        {frames.map((frame, i) => {
          const isActive = i === activeIndex;
          const isFuture = activeIndex < i;
          return (
            <FrameCard
              key={i}
              index={i}
              frame={frame}
              isActive={isActive}
              isFuture={isFuture}
              accent={accent}
            />
          );
        })}
      </div>

      {/* Hint nederst */}
      {hint && step >= totalSteps - 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            bottom: "clamp(3rem, 6vh, 5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
            fontStyle: "italic",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "70%",
          }}
        >
          <EditableText path="hint" value={hint}>
            {hint}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}

// ============================================================================
// FrameCard
// ============================================================================

interface FrameCardProps {
  index: number;
  frame: Frame;
  isActive: boolean;
  isFuture: boolean;
  accent: string;
}

function FrameCard({ index, frame, isActive, isFuture, accent }: FrameCardProps) {
  const baseDelay = 0.55 + index * 0.12;
  const isPrimary = frame.primary;

  // Visuella varianter
  const cardOpacity = isActive ? 1 : isFuture ? 0.32 : 0.5;
  const cardScale = isActive ? 1 : 0.96;
  const borderColor = isActive
    ? isPrimary
      ? accent
      : `${withAlpha(accent, 0.67)}`
    : "rgba(247,241,230,0.12)";
  const cardBg = isActive
    ? isPrimary
      ? `linear-gradient(165deg, ${withAlpha(accent, 0.12)}, rgba(20,17,14,0.85) 70%)`
      : `linear-gradient(165deg, ${withAlpha(accent, 0.06)}, rgba(20,17,14,0.78))`
    : "rgba(20,17,14,0.55)";
  const nameColor = isActive
    ? isPrimary
      ? accent
      : "var(--text)"
    : "var(--text-muted)";
  const descColor = isActive
    ? "var(--text)"
    : "var(--text-muted)";

  const cardStyle: CSSProperties = {
    position: "relative",
    padding: "clamp(1.4rem, 2vw, 2rem)",
    borderRadius: "0.7rem",
    border: `1px solid ${borderColor}`,
    background: cardBg,
    minHeight: "clamp(11rem, 18vh, 16rem)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    boxShadow: isActive
      ? isPrimary
        ? `0 12px 50px ${withAlpha(accent, 0.2)}, 0 0 0 1px ${withAlpha(accent, 0.33)} inset`
        : `0 8px 40px rgba(0,0,0,0.4)`
      : "none",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    overflow: "hidden",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: cardOpacity,
        y: 0,
        scale: cardScale,
      }}
      transition={{
        duration: 0.7,
        delay: baseDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={cardStyle}
    >
      {/* Nummer i hörnet */}
      <span
        style={{
          position: "absolute",
          top: "clamp(0.9rem, 1.4vw, 1.3rem)",
          left: "clamp(1.2rem, 1.8vw, 1.7rem)",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.85vw, 0.8rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: isActive ? `${withAlpha(accent, 0.8)}` : "rgba(247,241,230,0.35)",
          transition: "color 360ms ease",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Stjärna för primary */}
      {isPrimary ? (
        <span
          style={{
            position: "absolute",
            top: "clamp(0.9rem, 1.4vw, 1.3rem)",
            right: "clamp(1.2rem, 1.8vw, 1.7rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
            color: isActive ? accent : `${withAlpha(accent, 0.33)}`,
            transition: "color 360ms ease",
          }}
        >
          ★
        </span>
      ) : null}

      {/* Lins-namn */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: nameColor,
          textShadow: isActive
            ? isPrimary
              ? `0 0 30px ${withAlpha(accent, 0.33)}`
              : "none"
            : "none",
          transition: "color 360ms ease, text-shadow 360ms ease",
          marginBottom: "0.5rem",
        }}
      >
        AI som <span style={{ color: nameColor }}>{frame.name.toLowerCase()}</span>
      </div>

      {/* Beskrivning */}
      {frame.description ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
            lineHeight: 1.4,
            color: descColor,
            transition: "color 360ms ease",
          }}
        >
          {frame.description}
        </div>
      ) : null}
    </motion.div>
  );
}
