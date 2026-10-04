"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MirrorReveal — final-manifesto med spegel-effekt. Texten landar i
 * översta halvan, en (svagt distorderad och tonad) reflektion landar i
 * undre halvan. Subtil shimmer-pulse över "spegelytan" mellan dem.
 *
 * Tänkt som klimaxen i en föreläsning där spegeln är genomgående metafor.
 * Stora typografiska ord. Ingen step-reveal — sliden landar i sin egen
 * andning och föreläsaren talar fritt över den.
 *
 * MDX-format:
 * ```mdx
 * <MirrorReveal
 *   chapter="§ Akt 4 · Spegeln"
 *   accent= "var(--accent)"
 *   background="..."
 * >
 *   Frågan är inte vad **AI** är.
 *
 *   Frågan är vad **vi** är.
 * </MirrorReveal>
 * ```
 */

interface MirrorRevealProps {
  chapter?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.82. */
  overlay?: number | string;
  /** Litet ord ovanför titeln, t.ex. "Spegeln". */
  kicker?: string;
  /** Ev. final-tagline under reflektionen, t.ex. namn eller datum. */
  signature?: string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("\n");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    if (t === "p") return inner;
    if (t === "br") return "\n";
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

function renderLines(text: string, accent: string): ReactNode[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <span key={lineIdx} style={{ display: "block" }}>
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return (
              <span key={i} style={{ color: accent, fontWeight: 800 }}>
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
        })}
      </span>
    );
  });
}

export function MirrorReveal({
  chapter,
  background,
  accent = "var(--accent)",
  overlay = 0.82,
  kicker,
  signature,
  children,
}: MirrorRevealProps) {
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const text = extractText(children).trim();
  const lines = renderLines(text, accent);

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
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Subtil cirkulär ljus-puls bakom hela */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.45, scale: [0.95, 1.05, 0.95] }}
        transition={{
          opacity: { duration: 1.6, delay: 0.4 },
          scale: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
        }}
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "85vmin",
          height: "85vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.12)} 0%, transparent 60%)`,
          filter: "blur(40px)",
          zIndex: 1,
        }}
      />

      {/* Innehåll — splittat i topp + spegelyta + reflektion */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(2.5rem, 5vw, 5rem)",
          zIndex: 2,
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 1vw, 1rem)",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: accent,
              marginBottom: "clamp(2rem, 4vh, 3.5rem)",
              textAlign: "center",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </motion.div>
        ) : null}

        {/* TOPP — det riktiga innehållet */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(2.2rem, 5vw, 5rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "20em",
            textShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 80px ${withAlpha(accent, 0.13)}`,
          }}
        >
          {lines}
        </motion.div>

        {/* SPEGELYTAN — tunn rad, shimmer */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.5, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "min(70%, 800px)",
            height: "1px",
            marginTop: "clamp(2rem, 4vh, 3.5rem)",
            marginBottom: "clamp(2rem, 4vh, 3.5rem)",
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 40px ${withAlpha(accent, 0.53)}, 0 0 80px ${withAlpha(accent, 0.27)}`,
          }}
        >
          {/* Shimmer på spegelytan */}
          <motion.div
            aria-hidden
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 4,
              delay: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1.5,
            }}
            style={{
              position: "absolute",
              top: -2,
              left: 0,
              width: "30%",
              height: 5,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              filter: "blur(4px)",
            }}
          />
        </motion.div>

        {/* REFLEKTIONEN — kopia, flippad, blurrad, dimmad */}
        <motion.div
          initial={{ opacity: 0, y: -10, filter: "blur(12px)" }}
          animate={{ opacity: 0.32, y: 0, filter: "blur(2px)" }}
          transition={{ duration: 1.6, delay: 2.0, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(2.2rem, 5vw, 5rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "20em",
            transform: "scaleY(-1)",
            // Gradient-mask som låter undre delen av reflektionen fada till transparent
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 100%)",
          }}
        >
          {lines}
        </motion.div>
      </div>

      {/* Signatur längst ner (om angiven) */}
      {signature ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.8, delay: 3.5 }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
            textAlign: "center",
          }}
        >
          <EditableText path="signature" value={signature}>
            {signature}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
