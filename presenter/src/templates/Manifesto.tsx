"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText, GhostHandle } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface ManifestoProps {
  /**
   * Texten. Stödjer *italic* och **bold** för accent-färgade ord.
   * Radbrytning med `\n` eller en blankrad i MDX.
   * Om utelämnad extraheras text från children istället.
   */
  text?: string;
  /** Typ-variant — påverkar typsnitt, vikt och case. */
  variant?: "display" | "serif" | "condensed";
  /** Text-justering. */
  align?: "left" | "center";
  /** Liten rubrik uppe till höger (t.ex. "§ III" eller "01 / 23"). */
  chapter?: string;
  /** Valfri bakgrund. Annars djup gradient-svart. */
  background?: string;
  /** Färg för betonade ord. Default konjak. */
  accent?: string;
  /** Extra dekorativt nummer eller glyph stort i bakgrunden. */
  decoration?: string;
  /**
   * Mörk overlay-styrka (0-1) på bakgrundsbild. Default 0.6.
   * Höga värden = mer dimmad bakgrund (bra när bakgrund tävlar med text).
   */
  overlay?: number | string;
  /**
   * Compact-mode = mindre font, snävare maxWidth. Bra när Manifesto
   * är på en sida tillsammans med overlay-element (FloatingChat,
   * FloatingPills) och behöver hålla sig på sin halva.
   */
  compact?: boolean | string;
  /** Alternativ input: MDX-innehåll i stället för `text`-prop. */
  children?: ReactNode;
}

function extractMdxText(node: ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractMdxText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractMdxText(el.props.children);
    if (t === "p") return inner + "\n\n";
    if (t === "br") return "\n";
    if (t === "em") return `*${inner}*`;
    if (t === "strong") return `**${inner}**`;
    if (t === "h1" || t === "h2" || t === "h3") return inner + "\n\n";
    return inner;
  }
  return "";
}

interface Word {
  text: string;
  emphasis: "none" | "em" | "strong";
}

function parseWords(text: string): Word[] {
  const lines = text.split(/\n/);
  const out: Word[] = [];
  lines.forEach((line, lineIdx) => {
    const chunks = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    for (const chunk of chunks) {
      if (!chunk) continue;
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        for (const w of chunk.slice(2, -2).split(/\s+/).filter(Boolean)) {
          out.push({ text: w, emphasis: "strong" });
        }
      } else if (chunk.startsWith("*") && chunk.endsWith("*")) {
        for (const w of chunk.slice(1, -1).split(/\s+/).filter(Boolean)) {
          out.push({ text: w, emphasis: "em" });
        }
      } else {
        for (const w of chunk.split(/\s+/).filter(Boolean)) {
          out.push({ text: w, emphasis: "none" });
        }
      }
    }
    if (lineIdx < lines.length - 1) {
      out.push({ text: "\n", emphasis: "none" });
    }
  });
  return out;
}

/**
 * Deklarativa one-liners. Ord animeras in ett i taget med blur → skarpt.
 * Betonade ord (*em*, **strong**) får accent-färg. Stor generös tomrum.
 */
function resolveBackground(
  bg: string | undefined,
  fallback: string,
  overlay: number | string = 0.6,
): string {
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const safe = Number.isFinite(n) ? n : 0.6;
    const a = Math.max(0, Math.min(1, safe));
    const b = Math.min(1, a + 0.1);
    return `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${b})), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

export function Manifesto({
  text,
  variant = "display",
  align = "left",
  chapter,
  background,
  accent = "#B4763A",
  decoration,
  overlay,
  compact,
  children,
}: ManifestoProps) {
  const resolvedText =
    (typeof text === "string" && text.length > 0
      ? text
      : extractMdxText(children).trim()) || "";
  const words = parseWords(resolvedText);

  const overlayNum =
    overlay === undefined
      ? 0.6
      : typeof overlay === "string"
        ? parseFloat(overlay)
        : overlay;
  const compactBool =
    typeof compact === "string" ? compact !== "false" : !!compact;

  const fullVariantStyle = {
    display: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "clamp(3.5rem, 8vw, 9.5rem)",
      lineHeight: 1.02,
      letterSpacing: "-0.035em",
    },
    serif: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: "clamp(3.5rem, 8vw, 9rem)",
      lineHeight: 1.08,
      letterSpacing: "-0.025em",
    },
    condensed: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: "clamp(3rem, 7.5vw, 8.5rem)",
      lineHeight: 1,
      letterSpacing: "-0.04em",
      textTransform: "uppercase" as const,
    },
  }[variant];

  const compactVariantStyle = {
    display: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "clamp(2rem, 4vw, 4.4rem)",
      lineHeight: 1.08,
      letterSpacing: "-0.025em",
    },
    serif: {
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: "clamp(2rem, 4vw, 4.2rem)",
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    condensed: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: "clamp(1.8rem, 3.6vw, 4rem)",
      lineHeight: 1.05,
      letterSpacing: "-0.03em",
      textTransform: "uppercase" as const,
    },
  }[variant];

  const variantStyle = compactBool ? compactVariantStyle : fullVariantStyle;
  const maxWidthValue = compactBool
    ? align === "center"
      ? "16em"
      : "11em"
    : align === "center"
      ? "22em"
      : "18em";

  // När en egen bakgrund (bild med scrim, eller egen mörk gradient) skickas in
  // är ytan mörk oavsett tema → texten måste tvingas ljus. Utan background-prop
  // följer ytan temat (var(--bg)) och texten följer temat (var(--text)).
  const hasCustomBackground = !!background;
  const primaryTextColor = hasCustomBackground ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedTextColor = hasCustomBackground ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const decorationColor = hasCustomBackground ? "rgba(245,246,250,0.92)" : "var(--text)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: resolveBackground(
          background,
          "radial-gradient(ellipse at 30% 20%, var(--bg-elevated) 0%, var(--bg) 70%)",
          overlayNum,
        ),
      }}
    >
      {/* Subtil vignett + accent-glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${withAlpha(accent, 0.07)} 0%, transparent 60%)`,
        }}
      />

      {/* Decoration glyph/nummer bakom texten */}
      {decoration ? (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.045, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(20rem, 50vw, 60rem)",
            color: decorationColor,
            letterSpacing: "-0.08em",
            lineHeight: 0.85,
            userSelect: "none",
          }}
        >
          {decoration}
        </motion.div>
      ) : null}

      {/* Chapter-markör */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedTextColor,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            zIndex: 3,
          }}
        >
          <GhostHandle path="chapter" label="+ kapitel" placeholder="T.ex. § III · Titel" />
        </div>
      )}

      {/* Hårkorsmarkör, extra editorial detail */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: align === "center" ? "50%" : "clamp(3rem, 6vw, 7rem)",
          transform: align === "center" ? "translateX(-50%)" : undefined,
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
        }}
      />

      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          justifyContent: "center",
          alignItems: align === "center" ? "center" : "flex-start",
          textAlign: align,
          zIndex: 2,
        }}
      >
        <EditableText
          path="content"
          value={resolvedText}
          block
          label="Manifesto-text"
          placeholder="Skriv kort. **fet** för accent, *kursiv* för kursivering. Tom rad = ny strof."
          wrapperStyle={{
            ...variantStyle,
            maxWidth: maxWidthValue,
            color: primaryTextColor,
          }}
        >
          <div
            style={{
              ...variantStyle,
              maxWidth: maxWidthValue,
              color: primaryTextColor,
            }}
          >
            {words.map((w, i) => {
              if (w.text === "\n") return <br key={i} />;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.85,
                    delay: 0.35 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: "inline-block",
                    marginRight: "0.28em",
                    color:
                      w.emphasis === "strong" || w.emphasis === "em"
                        ? accent
                        : undefined,
                    fontStyle: w.emphasis === "em" ? "italic" : undefined,
                  }}
                >
                  {w.text}
                </motion.span>
              );
            })}
          </div>
        </EditableText>
      </div>
    </div>
  );
}
