"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CoreInsight — filosofisk slide med build-up + punchline.
 *
 * Setup-texten tonas in i mindre format (dimmad, italic), tar en
 * dramaturgisk paus, sen LANDAR punchlinen i stor skala med accent-glow
 * och en svag breathing-pulse. Tänkt för aforismer och kärnpoänger som
 * "Agens > intelligens" där två meningar bygger upp och en tredje
 * cementerar.
 *
 * MDX-format:
 * ```mdx
 * <CoreInsight
 *   chapter="§ Akt 3 · Filosofisk kärna"
 *   setup="AI gör intelligens till en råvara vi får i överflöd. Frågan är vad vi vill göra med den."
 *   punchline="Agens > intelligens."
 *   accent= "var(--accent)"
 *   background="..."
 * />
 * ```
 *
 * **bold** i punchline = accent-färg.
 * Symbolen `>` i punchline renderas som accent-färgad om den står ensam mellan
 * ord (fungerar för "X > Y"-mönster).
 */

interface CoreInsightProps {
  chapter?: string;
  /** Build-up-text (kan vara 1-3 meningar). */
  setup?: string;
  /** Stora punchlinen. **bold** ger accent-färg. */
  punchline: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.78. */
  overlay?: number | string;
  /** Litet eyebrow ovanför setupen. */
  kicker?: string;
  /**
   * Textens placering. Default "center" (hero-läge). "left" trycker
   * texten till vänster halva och smalnar maxWidth — passar när
   * högerhalvan är upptagen av en overlay (t.ex. FloatingPhone).
   */
  align?: "center" | "left";
  /** Om children skickas, används de istället för setup-prop. */
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
  if (!bg)
    return "radial-gradient(ellipse at 50% 30%, var(--bg-elevated, var(--bg-surface)) 0%, var(--bg) 70%)";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * Renderar punchlinen med smart formattering:
 * - **bold** → accent-färg
 * - " > " (mellanrum runt) → accent-färgad större symbol
 */
function renderPunchline(text: string, accent: string): ReactNode {
  // Splitta på **bold** först
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 800 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    // För icke-bold-delar, hantera ` > ` specially
    const greaterSplit = part.split(/(\s+>\s+)/g);
    return (
      <span key={i}>
        {greaterSplit.map((seg, j) => {
          if (/\s+>\s+/.test(seg)) {
            return (
              <span
                key={j}
                style={{
                  color: accent,
                  fontWeight: 800,
                  margin: "0 0.15em",
                  display: "inline-block",
                  textShadow: `0 0 24px ${withAlpha(accent, 0.67)}`,
                }}
              >
                {">"}
              </span>
            );
          }
          return <span key={j}>{seg}</span>;
        })}
      </span>
    );
  });
}

function renderSetup(text: string, accent: string): ReactNode {
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

export function CoreInsight({
  chapter,
  setup,
  punchline,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  kicker,
  align = "center",
  children,
}: CoreInsightProps) {
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const setupText = setup ?? extractText(children).trim();
  // När en bakgrund skickas in är ytan inte längre tema-bunden: foto-bakgrunder
  // får en mörk scrim (resolveBackground) och custom-bakgrunder är konventionellt
  // mörka (se GRADIENT_PRESETS). Då måste texten vara fast ljus så den syns även
  // på ljusa teman (dagsljus). Utan bakgrund följer ytan temat → var(--text).
  const onDarkSurface = !!background;
  const primaryColor = onDarkSurface ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDarkSurface ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const isLeft = align === "left";
  const textAlign = isLeft ? "left" : "center";
  const itemsAlign = isLeft ? "flex-start" : "center";
  const setupMax = isLeft ? "18em" : "30em";
  const punchMax = isLeft ? "13em" : "18em";

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
            color: mutedColor,
            zIndex: 4,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Subtil cirkulär ljus-puls bakom punchline */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.45, scale: [0.95, 1.05, 0.95] }}
        transition={{
          opacity: { duration: 1.2, delay: 2.0 },
          scale: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3.0,
          },
        }}
        style={{
          position: "absolute",
          top: "62%",
          left: isLeft ? "26%" : "50%",
          transform: "translate(-50%, -50%)",
          width: "75vmin",
          height: "55vmin",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${withAlpha(accent, 0.16)} 0%, transparent 65%)`,
          filter: "blur(40px)",
          zIndex: 1,
        }}
      />

      {/* Layout: setup uppe, punchline större nere. Centrum eller vänster. */}
      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 6rem)",
          paddingRight: isLeft ? "clamp(3rem, 45vw, 50vw)" : "clamp(3rem, 6vw, 6rem)",
          alignItems: itemsAlign,
          justifyContent: "center",
          gap: "clamp(2rem, 5vh, 4rem)",
          zIndex: 2,
        }}
      >
        {/* Kicker */}
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              textAlign,
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Setup — build-up */}
        {setupText ? (
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 0.85, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.0, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.2rem, 2vw, 1.95rem)",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              color: primaryColor,
              textAlign,
              maxWidth: setupMax,
              margin: 0,
            }}
          >
            <EditableText path="setup" value={setupText}>
              {renderSetup(setupText, accent)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Punchline — landar med impact */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.92, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 1.8,
            ease: [0.22, 1.05, 0.36, 1],
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(2.6rem, 5.5vw, 5.6rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: primaryColor,
            textAlign,
            maxWidth: punchMax,
            textShadow: onDarkSurface
              ? `0 0 60px rgba(0,0,0,0.6), 0 0 90px ${withAlpha(accent, 0.2)}`
              : `0 0 90px ${withAlpha(accent, 0.2)}`,
            margin: 0,
          }}
        >
          <EditableText path="punchline" value={punchline}>
            {renderPunchline(punchline, accent)}
          </EditableText>
        </motion.div>

        {/* Tunn underrad — accent-streck */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 2.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "min(40%, 480px)",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 20px ${withAlpha(accent, 0.53)}`,
            transformOrigin: "center",
          }}
        />
      </div>
    </div>
  );
}
