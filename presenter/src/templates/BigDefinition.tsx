"use client";

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BigDefinition — definitionsslide. Stort begrepp i mitten,
 * fullt namn i italic ovanför, definition under.
 *
 * Användning:
 * ```mdx
 * <BigDefinition
 *   chapter="§ Definition"
 *   term="AGI"
 *   fullName="Artificial General Intelligence"
 *   definition="AI som matchar eller överträffar människor på i princip alla kognitiva uppgifter."
 *   accent= "var(--accent)"
 * />
 * ```
 *
 * Eller med children om definitionen är längre / behöver markdown:
 * ```mdx
 * <BigDefinition term="AGI" fullName="Artificial General Intelligence">
 * AI som matchar eller **överträffar människor** på i princip alla
 * kognitiva uppgifter.
 * </BigDefinition>
 * ```
 */

interface BigDefinitionProps {
  /** Det stora ordet — centrerat, gigantiskt, accentfärg. */
  term: string;
  /** Fullt namn ovanför termen (italic). T.ex. "Artificial General Intelligence". */
  fullName?: string;
  /** Definitionstext under termen. Kan ges som prop eller via children. */
  definition?: string;
  /** Liten chapter-tagg uppe till höger. */
  chapter?: string;
  /** Bakgrund. */
  background?: string;
  /** Accentfärg på termen. */
  accent?: string;
  /** Mörk overlay (0-1) på bakgrund. Default 0.6. */
  overlay?: number;
  /** Källhänvisning eller källram, visas litet längst ned. */
  source?: string;
  /** Definition via children (alternativ till definition-propen). Stödjer **bold**. */
  children?: ReactNode;
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
    if (t === "p") return inner + "\n";
    return inner;
  }
  return "";
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span
          key={i}
          style={{ color: accent, fontWeight: 700 }}
        >
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

function isPhotoBackground(bg: string | undefined): boolean {
  return Boolean(bg && (bg.startsWith("/") || bg.startsWith("http")));
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (isPhotoBackground(bg)) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function BigDefinition({
  term,
  fullName,
  definition,
  chapter,
  background,
  accent = "var(--accent)",
  overlay = 0.6,
  source,
  children,
}: BigDefinitionProps) {
  const definitionText = definition ?? extractText(children).trim();

  // När en foto-bakgrund används läggs en mörk scrim ovanpå (för läsbarhet).
  // Då måste texten vara fast ljus oavsett tema — annars blir tema-driven
  // mörk text (på ljusa teman som dagsljus) osynlig mot scrim:en.
  // Utan foto-bakgrund följer texten temat (var(--text)/var(--text-muted)).
  const onPhotoScrim = isPhotoBackground(background);
  const primaryColor = onPhotoScrim ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onPhotoScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

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
            color: mutedColor,
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

      {/* Stage — vertikalt centrerat innehåll */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.2rem, 2.4vh, 2rem)",
          padding: "clamp(3rem, 8vh, 6rem) clamp(3rem, 8vw, 8rem)",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        {/* Fullt namn (italic, ovanför termen) */}
        {fullName ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.2rem, 1.8vw, 1.9rem)",
              fontWeight: 400,
              color: mutedColor,
              letterSpacing: "-0.01em",
            }}
          >
            {fullName}
          </motion.div>
        ) : null}

        {/* TERM — gigantiskt, centrerat, accent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.95,
            delay: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            // Långa termer får inte skäras av kanten: 18vw är taket, men
            // ordet krymps tills det ryms i 92 vw (Archivo ≈ 0,6 em/tecken).
            fontSize: `clamp(3rem, ${Math.min(18, 92 / Math.max(term.length * 0.6, 1))}vw, 18rem)`,
            color: accent,
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            textShadow: `0 0 80px ${withAlpha(accent, 0.33)}, 0 0 200px ${withAlpha(accent, 0.13)}`,
          }}
        >
          {term}
        </motion.div>

        {/* Definition (under termen) */}
        {definitionText ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.3rem, 2vw, 2.1rem)",
              fontWeight: 400,
              lineHeight: 1.35,
              color: primaryColor,
              maxWidth: "min(48rem, 80%)",
              letterSpacing: "-0.01em",
            }}
          >
            {renderInline(definitionText, accent)}
          </motion.div>
        ) : null}

        {/* Source — diskret längst ned */}
        {source ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.4 }}
            style={{
              marginTop: "1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: mutedColor,
            }}
          >
            {source}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
