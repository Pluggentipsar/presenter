"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TimelineCompression — dramatisk visualisering av "den forskning som skulle
 * tagit X år sker nu på Y år". Stort ankarord (t.ex. "AGI"), subtitel
 * (t.ex. "Kunskapsexplosion"), animerad tidslinje som komprimeras från
 * lång till kort, och en humble caveat sist.
 *
 * Tänkt för pivotala moment där tidskomprimering är poängen — AGI,
 * vetenskapliga genombrott, accelererande utveckling.
 *
 * MDX-format:
 * ```mdx
 * <TimelineCompression
 *   chapter="§ Akt 1 · Kunskapsexplosion"
 *   anchor="AGI"
 *   subtitle="Kunskapsexplosion"
 *   startYear="2025"
 *   normalEndYear="2100"
 *   compressedEndLabel="2030–2035"
 *   explanation="Den forskning som skulle tagit fram till **år 2100** går på **5-10 år.**"
 *   caveat="(Obs! stort OM!)"
 *   accent= "var(--accent)"
 * />
 * ```
 */

interface TimelineCompressionProps {
  chapter?: string;
  /** Stora ankarordet, t.ex. "AGI". */
  anchor?: string;
  /** Subtitel, t.ex. "Kunskapsexplosion". */
  subtitle?: string;
  /** Startår på tidslinjen (default "2025"). */
  startYear?: string;
  /** Det "normala" slutåret som forskningen skulle nå (default "2100"). */
  normalEndYear?: string;
  /** Etikett för det komprimerade slutet, t.ex. "2030–35" eller "5-10 år". */
  compressedEndLabel?: string;
  /** Förklaringsparagraf. **bold** ger accent. */
  explanation?: string;
  /** Humble caveat, t.ex. "(Obs! stort OM!)". */
  caveat?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
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

export function TimelineCompression({
  chapter,
  anchor = "AGI",
  subtitle,
  startYear = "2025",
  normalEndYear = "2100",
  compressedEndLabel = "5-10 år",
  explanation,
  caveat,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: TimelineCompressionProps) {
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // Om explanation inte angetts, fall tillbaka till children
  const explanationText = explanation ?? extractText(children).trim();

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
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Subtil radial-glow bakom anchor-ordet */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.4, scale: [0.95, 1.05, 0.95] }}
        transition={{
          opacity: { duration: 1.2, delay: 0.6 },
          scale: {
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          },
        }}
        style={{
          position: "absolute",
          top: "28%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70vmin",
          height: "70vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.19)} 0%, transparent 60%)`,
          filter: "blur(40px)",
          zIndex: 1,
        }}
      />

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.8vh, 2.2rem)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {/* ANKAR-ord (AGI) */}
        {anchor ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, filter: "blur(18px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              duration: 1.0,
              delay: 0.3,
              ease: [0.22, 1.05, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(5rem, 14vw, 14rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              color: "var(--text)",
              textAlign: "center",
              textShadow: `0 0 80px ${withAlpha(accent, 0.33)}, 0 0 160px ${withAlpha(accent, 0.13)}`,
              margin: 0,
            }}
          >
            {anchor}
          </motion.div>
        ) : null}

        {/* Subtitle */}
        {subtitle ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)",
              color: accent,
              textAlign: "center",
              letterSpacing: "-0.015em",
              textShadow: `0 0 30px ${withAlpha(accent, 0.4)}`,
              margin: 0,
            }}
          >
            {subtitle}
          </motion.div>
        ) : null}

        {/* Tidslinje-visualisering */}
        <div
          style={{
            position: "relative",
            width: "min(80%, 900px)",
            height: "clamp(120px, 18vh, 180px)",
            marginTop: "clamp(0.5rem, 1.5vh, 1.2rem)",
            marginBottom: "clamp(0.5rem, 1.5vh, 1.2rem)",
          }}
        >
          {/* Original linje (lång, dimmad efter komprimering) */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.35, scaleX: 1 }}
            transition={{
              duration: 1.4,
              delay: 1.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "absolute",
              top: "30%",
              left: 0,
              right: 0,
              height: "2px",
              background: `linear-gradient(90deg, ${withAlpha(accent, 0.53)}, ${withAlpha(accent, 0.27)})`,
              transformOrigin: "left center",
            }}
          />
          {/* Original startår */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0.55, y: 0 }}
            transition={{ duration: 0.6, delay: 2.0 }}
            style={{
              position: "absolute",
              top: "calc(30% - 28px)",
              left: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 1vw, 1rem)",
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
            }}
          >
            {startYear}
          </motion.div>
          {/* Original slutår — fadar in sen blir dimmad */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.35] }}
            transition={{
              times: [0, 0.5, 1],
              duration: 3.0,
              delay: 2.2,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              top: "calc(30% - 28px)",
              right: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 1vw, 1rem)",
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
              textAlign: "right",
            }}
          >
            {normalEndYear}
          </motion.div>

          {/* Komprimerings-pil */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.6, delay: 3.6 }}
            style={{
              position: "absolute",
              top: "45%",
              left: "12%",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(1rem, 1.3vw, 1.3rem)",
              color: accent,
              letterSpacing: "0.2em",
            }}
          >
            ↓
          </motion.div>

          {/* Komprimerad linje — kort, glödande, accent */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{
              duration: 1.0,
              delay: 4.0,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "absolute",
              top: "75%",
              left: 0,
              width: "16%",
              height: "5px",
              background: `linear-gradient(90deg, ${accent}, ${withAlpha(accent, 0.87)})`,
              borderRadius: "2px",
              boxShadow: `0 0 20px ${withAlpha(accent, 0.67)}, 0 0 40px ${withAlpha(accent, 0.33)}`,
              transformOrigin: "left center",
            }}
          />
          {/* Komprimerat startår */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 4.2 }}
            style={{
              position: "absolute",
              top: "calc(75% + 14px)",
              left: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.78rem, 1vw, 1rem)",
              letterSpacing: "0.18em",
              color: accent,
              fontWeight: 600,
            }}
          >
            {startYear}
          </motion.div>
          {/* Komprimerat slut */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 4.4 }}
            style={{
              position: "absolute",
              top: "calc(75% - 16px)",
              left: "16%",
              marginLeft: "0.6rem",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(1.2rem, 1.8vw, 1.8rem)",
              color: accent,
              letterSpacing: "-0.02em",
              textShadow: `0 0 22px ${withAlpha(accent, 0.53)}`,
              whiteSpace: "nowrap",
            }}
          >
            {compressedEndLabel}
          </motion.div>

          {/* Liten markör som "krymper" från 100% till 16% — extra emfas */}
          <motion.div
            aria-hidden
            initial={{ left: 0, width: "100%" }}
            animate={{ left: 0, width: ["100%", "100%", "16%"] }}
            transition={{
              times: [0, 0.55, 1],
              duration: 2.2,
              delay: 3.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "absolute",
              top: "52%",
              height: "1px",
              background: `linear-gradient(90deg, ${withAlpha(accent, 0.33)}, transparent)`,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Förklaring */}
        {explanationText ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 4.8 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.6vw, 1.55rem)",
              lineHeight: 1.4,
              letterSpacing: "-0.005em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "30em",
              margin: 0,
            }}
          >
            {renderInline(explanationText, accent)}
          </motion.div>
        ) : null}

        {/* Caveat — humble disclaimer */}
        {caveat ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            transition={{ duration: 0.7, delay: 5.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontStyle: "italic",
              fontSize: "clamp(0.8rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: "clamp(0.4rem, 1vh, 0.8rem)",
            }}
          >
            {caveat}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
