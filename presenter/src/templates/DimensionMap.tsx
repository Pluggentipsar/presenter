"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DimensionMap — visualisering av ett N-dimensionellt ramverk som karta.
 *
 * Tänkt för "7 dimensioner av AI-litteracitet" och liknande karta-bryggor.
 * Renderar dimensionerna som horisontell rad av numrerade kort, kopplade
 * av en topplinje. Ett kort kan markeras som "nuvarande" (där vi är nu)
 * via `activeIndex`-propen.
 *
 * MDX-format:
 * ```mdx
 * <DimensionMap
 *   chapter="§ Karta"
 *   title="Sju dimensioner"
 *   subtitle="..."
 *   activeIndex="0"
 *   accent= "var(--accent)"
 * >
 * - Berättelsen om AI · Hur den berättas styr vad vi gör
 * - Vad är AI? · Teknisk förståelse
 * - Använda AI · Praktik och strategier
 * - Etik · Ansvar och värdering
 * - Kritiskt granska · Källkritik och faktakontroll
 * - Människa & maskin · Relation, autenticitet
 * - Framtid & samhälle · Demokrati, arbete, kultur
 * </DimensionMap>
 * ```
 *
 * Format per rad: `Namn · Beskrivning`.
 */

interface DimensionMapProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  accent?: string;
  background?: string;
  overlay?: number;
  /** Index för det "nuvarande"-kortet — fås extra glow + label "Här är vi". */
  activeIndex?: number | string;
  /** Egen text under det aktiva kortet (default "Här är vi"). */
  activeLabel?: string;
  /** MDX-lista. Format: "Namn · Beskrivning". */
  children?: ReactNode;
}

interface Dimension {
  name: string;
  description: string;
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

function parseDimensions(children: ReactNode): Dimension[] {
  const dims: Dimension[] = [];
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
      const idx = raw.indexOf(" · ");
      if (idx > -1) {
        dims.push({
          name: raw.slice(0, idx).trim(),
          description: raw.slice(idx + 3).trim(),
        });
      } else {
        dims.push({ name: raw, description: "" });
      }
    });
  });
  return dims;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function DimensionMap({
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  background,
  overlay = 0.6,
  activeIndex,
  activeLabel = "Här är vi",
  children,
}: DimensionMapProps) {
  const dimensions = parseDimensions(children);
  const activeIdx =
    activeIndex === undefined
      ? -1
      : typeof activeIndex === "string"
        ? parseInt(activeIndex, 10)
        : activeIndex;

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
          {chapter}
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
          top: "clamp(8vh, 11vh, 14vh)",
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
              fontSize: "clamp(2.2rem, 3.8vw, 3.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
            }}
          >
            {title}
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: "0.7rem 0 0",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
              fontWeight: 400,
              color: "var(--text-muted)",
              maxWidth: "70ch",
            }}
          >
            {subtitle}
          </motion.p>
        ) : null}
      </div>

      {/* Topplinjen — visar att dimensionerna är delar av ett helt */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.5 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "47%",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          height: "1px",
          background: `linear-gradient(to right, transparent, ${withAlpha(accent, 0.33)}, ${accent}, ${withAlpha(accent, 0.33)}, transparent)`,
          transformOrigin: "left",
          zIndex: 2,
        }}
      />

      {/* Dimensions-kort */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          display: "grid",
          gridTemplateColumns: `repeat(${dimensions.length}, 1fr)`,
          gap: "clamp(0.6rem, 1vw, 1rem)",
          zIndex: 3,
        }}
      >
        {dimensions.map((dim, i) => (
          <DimensionCard
            key={i}
            index={i}
            dim={dim}
            isActive={i === activeIdx}
            accent={accent}
            activeLabel={activeLabel}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DimensionCard
// ============================================================================

interface DimensionCardProps {
  index: number;
  dim: Dimension;
  isActive: boolean;
  accent: string;
  activeLabel: string;
}

function DimensionCard({
  index,
  dim,
  isActive,
  accent,
  activeLabel,
}: DimensionCardProps) {
  const baseDelay = 0.7 + index * 0.08;

  const cardStyle: CSSProperties = {
    position: "relative",
    padding: "clamp(0.8rem, 1.2vw, 1.2rem) clamp(0.7rem, 1vw, 1rem)",
    borderRadius: "0.5rem",
    border: isActive
      ? `1.5px solid ${accent}`
      : "1px solid rgba(0,0,0,0.1)",
    background: isActive
      ? `linear-gradient(165deg, ${withAlpha(accent, 0.1)}, var(--bg-elevated))`
      : "var(--bg-surface)",
    minHeight: "clamp(8rem, 14vh, 12rem)",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    boxShadow: isActive
      ? `0 8px 30px ${withAlpha(accent, 0.2)}, 0 0 0 1px ${withAlpha(accent, 0.2)} inset`
      : "none",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: isActive ? 1 : 0.6,
        y: 0,
      }}
      transition={{
        duration: 0.6,
        delay: baseDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={cardStyle}
    >
      {/* Liten dot på topplinjen */}
      <div
        style={{
          position: "absolute",
          top: "-5px",
          left: "50%",
          transform: "translateX(-50%)",
          width: isActive ? "10px" : "6px",
          height: isActive ? "10px" : "6px",
          borderRadius: "50%",
          background: isActive ? accent : `${withAlpha(accent, 0.4)}`,
          boxShadow: isActive
            ? `0 0 16px ${withAlpha(accent, 0.67)}, 0 0 32px ${withAlpha(accent, 0.4)}`
            : "none",
          transition: "all 360ms ease",
        }}
      />

      {/* Nummer */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
          letterSpacing: "0.32em",
          color: isActive ? `${withAlpha(accent, 0.8)}` : "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {String(index).padStart(2, "0")}
      </div>

      {/* Namn */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: isActive ? "var(--text)" : "var(--text)",
        }}
      >
        {dim.name}
      </div>

      {/* Beskrivning */}
      {dim.description ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            lineHeight: 1.35,
            color: isActive
              ? "var(--text-muted)"
              : "var(--text-muted)",
          }}
        >
          {dim.description}
        </div>
      ) : null}

      {/* "Här är vi"-pil under aktivt kort */}
      {isActive ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: baseDelay + 0.4 }}
          style={{
            position: "absolute",
            top: "calc(100% + 0.9rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.3rem",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
              color: accent,
              textShadow: `0 0 20px ${withAlpha(accent, 0.33)}`,
            }}
          >
            ↑ {activeLabel}
          </span>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
