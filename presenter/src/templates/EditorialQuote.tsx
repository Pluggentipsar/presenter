"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

type Style = "whisper" | "bridge" | "shout" | "landing" | "pause";

interface Segment {
  text: string;
  style: Style;
}

interface EditorialQuoteProps {
  kicker?: string;
  chapter?: string;
  background?: string;
  accent?: string;
  /** Stor dekorativ glyph bakom texten — default öppnande citattecken. */
  decoration?: string;
  /** Typografisk justering för hela texten. */
  align?: "left" | "center" | "right";
  /**
   * Markdown-lista där varje rad är ett segment.
   * Format: `- Text · style`
   * Styles: whisper | bridge | shout | landing | pause
   * Pause renderar bara ett mellanrum (tyst bokstavsbeat).
   */
  children?: ReactNode;
}

// ============================================================================
// Parsing
// ============================================================================

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

function parseSegments(children: ReactNode): Segment[] {
  const out: Segment[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    // Split på sista "·" → text | style
    const lastDot = raw.lastIndexOf("·");
    let text = raw;
    let style: Style = "bridge";
    if (lastDot > 0) {
      const candidateStyle = raw.slice(lastDot + 1).trim() as Style;
      if (
        candidateStyle === "whisper" ||
        candidateStyle === "bridge" ||
        candidateStyle === "shout" ||
        candidateStyle === "landing" ||
        candidateStyle === "pause"
      ) {
        text = raw.slice(0, lastDot).trim();
        style = candidateStyle;
      }
    }
    out.push({ text, style });
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

/** Bakgrunden använder en mörk foto-scrim (alltid mörk, oavsett tema). */
function hasPhotoScrim(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

function resolveBackground(bg: string | undefined): string {
  if (!bg)
    return "var(--slide-base, var(--bg))";
  if (hasPhotoScrim(bg)) {
    return `linear-gradient(rgba(10,9,8,0.68), rgba(10,9,8,0.82)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// Fasta ljusa textfärger när en mörk foto-scrim ligger bakom texten.
// Krävs eftersom var(--text)/var(--text-muted) blir mörka (osynliga) på
// ljusa teman som dagsljus men scrimmen alltid är mörk.
const SCRIM_TEXT = "rgba(245,246,250,0.92)";
const SCRIM_TEXT_MUTED = "rgba(245,246,250,0.6)";

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

// ============================================================================
// Style-presets
// ============================================================================

interface StylePreset {
  fontSize: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle?: string;
  color: string;
  letterSpacing: string;
  lineHeight: number;
  textTransform?: "uppercase";
  /** Extra scale-pop när segmentet kommer in. */
  scalePop?: boolean;
  /** Glow-skugga bakom texten. */
  glow?: boolean;
  /** Bastid till animationsdelay (utöver kumulativ delay). */
  beat?: number;
  /** Extra delay innan detta segment — för att skapa paus och rytm. */
  preDelay?: number;
  /** Marginal uppåt för visuell andning. */
  marginTop?: string;
  marginBottom?: string;
  maxWidth?: string;
}

function getPreset(style: Style, accent: string): StylePreset {
  switch (style) {
    case "whisper":
      return {
        fontSize: "clamp(1.25rem, 1.8vw, 1.6rem)",
        fontFamily: "var(--font-display)",
        fontWeight: 400,
        fontStyle: "italic",
        color: "var(--text-muted)",
        letterSpacing: "0.02em",
        lineHeight: 1.4,
        beat: 0.45,
        maxWidth: "32em",
      };
    case "bridge":
      return {
        fontSize: "clamp(1.75rem, 2.8vw, 2.75rem)",
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontStyle: "italic",
        color: "var(--text)",
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        beat: 0.55,
        maxWidth: "26em",
      };
    case "shout":
      return {
        fontSize: "clamp(3.5rem, 7.5vw, 8.5rem)",
        fontFamily: "var(--font-display)",
        fontWeight: 900,
        color: accent,
        letterSpacing: "-0.035em",
        lineHeight: 0.98,
        textTransform: "uppercase",
        scalePop: true,
        glow: true,
        preDelay: 0.6,
        beat: 1.1,
        marginTop: "0.4rem",
        marginBottom: "0.4rem",
        maxWidth: "18em",
      };
    case "landing":
      return {
        fontSize: "clamp(1rem, 1.4vw, 1.35rem)",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        color: "var(--text-muted)",
        letterSpacing: "0.22em",
        lineHeight: 1.3,
        textTransform: "uppercase",
        beat: 0.55,
        preDelay: 0.3,
        marginTop: "0.5rem",
        maxWidth: "28em",
      };
    case "pause":
      return {
        fontSize: "0",
        fontFamily: "inherit",
        fontWeight: 400,
        color: "transparent",
        letterSpacing: "0",
        lineHeight: 1,
        beat: 0.5,
      };
  }
}

// ============================================================================
// Template
// ============================================================================

export function EditorialQuote({
  kicker,
  chapter,
  background,
  accent = "var(--accent)",
  decoration = "\u201C",
  align = "left",
  children,
}: EditorialQuoteProps) {
  const segments = parseSegments(children);
  const onScrim = hasPhotoScrim(background);

  // Räkna ackumulerad delay för animationen
  let cumulativeDelay = 0.3; // Start-delay
  const withTiming = segments.map((s) => {
    const preset = getPreset(s.style, accent);
    // På mörk foto-scrim: ersätt tema-tokens (mörka på ljust tema) med fast ljus.
    // Lämna accent-färgen (shout) orörd — det är en varumärkesfärg.
    let color = preset.color;
    if (onScrim) {
      if (color === "var(--text)") color = SCRIM_TEXT;
      else if (color === "var(--text-muted)") color = SCRIM_TEXT_MUTED;
    }
    cumulativeDelay += preset.preDelay ?? 0;
    const delay = cumulativeDelay;
    cumulativeDelay += preset.beat ?? 0.5;
    return { segment: s, preset: { ...preset, color }, delay };
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Stor dekorativ glyph (citat) bakom */}
      {decoration ? (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.055, scale: 1 }}
          transition={{ duration: 2.2, delay: 0.2, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "5%",
            left: align === "center" ? "50%" : "4%",
            transform: align === "center" ? "translateX(-50%)" : undefined,
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(28rem, 55vw, 65rem)",
            color: accent,
            lineHeight: 0.8,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 1,
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
            color: onScrim ? SCRIM_TEXT_MUTED : "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Kicker om satt */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Dekorativ linje */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: align === "center" ? "50%" : "clamp(3rem, 6vw, 7rem)",
          transform: align === "center" ? "translateX(-50%)" : undefined,
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 3,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          justifyContent: "center",
          alignItems:
            align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
          textAlign: align,
          gap: "clamp(0.2rem, 0.6vh, 0.7rem)",
          zIndex: 2,
        }}
      >
        {withTiming.map((item, i) => {
          const { segment, preset, delay } = item;
          if (segment.style === "pause") {
            return <div key={i} style={{ height: "0.4rem" }} />;
          }
          return (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                y: 24,
                scale: preset.scalePop ? 0.88 : 1,
                filter: preset.scalePop ? "blur(14px)" : "blur(6px)",
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              }}
              transition={{
                duration: preset.scalePop ? 1.1 : 0.7,
                delay,
                ease: preset.scalePop ? [0.22, 1.3, 0.36, 1] : [0.22, 1, 0.36, 1],
              }}
              style={{
                fontSize: preset.fontSize,
                fontFamily: preset.fontFamily,
                fontWeight: preset.fontWeight,
                fontStyle: preset.fontStyle,
                color: preset.color,
                letterSpacing: preset.letterSpacing,
                lineHeight: preset.lineHeight,
                textTransform: preset.textTransform,
                marginTop: preset.marginTop,
                marginBottom: preset.marginBottom,
                maxWidth: preset.maxWidth,
                textShadow: preset.glow
                  ? `0 8px 40px ${withAlpha(accent, 0.47)}, 0 0 80px ${withAlpha(accent, 0.27)}`
                  : undefined,
              }}
            >
              {renderInline(segment.text, accent)}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
