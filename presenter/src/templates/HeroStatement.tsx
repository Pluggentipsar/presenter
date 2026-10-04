"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText, GhostHandle } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface HeroStatementProps {
  /** Liten mono-label uppe till höger. */
  chapter?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Accentfärg för **bold**-ord. */
  accent?: string;
  /** Ton — dark (default) eller cream. */
  theme?: "dark" | "cream";
  /**
   * Tre rader i children (separerade av blankrader). Varje rad får olika
   * typografisk behandling:
   *   Rad 1 (kicker): liten, mono, uppercase
   *   Rad 2 (whisper): medium, italic serif
   *   Rad 3 (shout): GIGANTISK bold, accent på **strong**-ord
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

interface LineChunk {
  text: string;
  emphasis: "none" | "em" | "strong";
}

function parseInline(text: string): LineChunk[] {
  const chunks: LineChunk[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      chunks.push({ text: part.slice(2, -2), emphasis: "strong" });
    } else if (part.startsWith("*") && part.endsWith("*")) {
      chunks.push({ text: part.slice(1, -1), emphasis: "em" });
    } else {
      chunks.push({ text: part, emphasis: "none" });
    }
  }
  return chunks;
}

function extractTextWithMarkup(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextWithMarkup).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractTextWithMarkup(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    if (t === "p") return inner + "\n";
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function parseLines(children: ReactNode): string[] {
  const raw = extractTextWithMarkup(children);
  return raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Renderar en sträng bokstav-för-bokstav med stagger. */
function AnimatedText({
  text,
  baseDelay,
  stagger,
  color,
  style,
}: {
  text: string;
  baseDelay: number;
  stagger: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const chars = Array.from(text);
  return (
    <span style={{ display: "inline-block", ...style, color }}>
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.65,
            delay: baseDelay + i * stagger,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            display: "inline-block",
            whiteSpace: ch === " " ? "pre" : undefined,
          }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroStatement({
  chapter,
  background,
  accent = "var(--accent)",
  theme = "dark",
  children,
}: HeroStatementProps) {
  const lines = parseLines(children);
  // Första raden = kicker (small mono), andra = whisper (italic), tredje = shout (massive)
  const kickerLine = lines[0] ?? "";
  const whisperLine = lines[1] ?? "";
  const shoutLine = lines[2] ?? "";

  // Ett foto/URL-bakgrund får alltid en mörk scrim (se resolveBackground),
  // så texten måste vara fast ljus oavsett tema. cream är en avsiktlig
  // ljus-på-cream-variant. Annars följer texten temat (var(--text)).
  const hasPhotoBackdrop =
    !!background && (background.startsWith("/") || background.startsWith("http"));
  const textColor = hasPhotoBackdrop
    ? "rgba(245,246,250,0.92)"
    : theme === "cream"
      ? "#1a1612"
      : "var(--text)";
  const subtleColor = hasPhotoBackdrop
    ? "rgba(245,246,250,0.6)"
    : theme === "cream"
      ? "rgba(26,22,18,0.55)"
      : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Chapter i övre höger */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: subtleColor,
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
          <GhostHandle path="chapter" label="+ kapitel" />
        </div>
      )}

      {/* Dekorativ linje uppe till vänster */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 7rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 3,
        }}
      />

      <EditableText
        path="content"
        block
        label="Hero-text (3 rader: kicker / whisper / shout)"
        placeholder="Rad 1: liten mono\n\nRad 2: italic medium\n\nRad 3: MEGA bold (**strong** = accent)"
        wrapperStyle={{ position: "relative", height: "100%", width: "100%", zIndex: 2 }}
      >
      <div
        className="relative flex h-full w-full flex-col justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          gap: "clamp(0.8rem, 1.8vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Rad 1: kicker — liten mono */}
        {kickerLine ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: subtleColor,
              fontWeight: 500,
            }}
          >
            <AnimatedText
              text={kickerLine.replace(/\*\*/g, "").replace(/\*/g, "")}
              baseDelay={0.35}
              stagger={0.025}
            />
          </div>
        ) : null}

        {/* Rad 2: whisper — italic medium */}
        {whisperLine ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(2.5rem, 5.5vw, 6rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: textColor,
              opacity: 0.88,
            }}
          >
            <AnimatedText
              text={whisperLine.replace(/\*\*/g, "").replace(/\*/g, "")}
              baseDelay={0.75}
              stagger={0.035}
            />
          </div>
        ) : null}

        {/* Rad 3: shout — MEGA bold, accent på **strong** */}
        {shoutLine ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(6rem, 18vw, 22rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              color: textColor,
              textShadow: hasPhotoBackdrop ? "0 8px 40px rgba(0,0,0,0.5)" : "none",
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "0.25em",
              marginTop: "0.2rem",
            }}
          >
            {parseInline(shoutLine).map((chunk, ci) => {
              const chunkDelay = 1.2 + ci * 0.1;
              return (
                <AnimatedText
                  key={ci}
                  text={chunk.text}
                  baseDelay={chunkDelay}
                  stagger={0.05}
                  color={chunk.emphasis === "strong" || chunk.emphasis === "em" ? accent : undefined}
                  style={{
                    fontStyle: chunk.emphasis === "em" ? "italic" : undefined,
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {/* Underline draw på shout-raden */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "0.5rem",
            width: "6rem",
            height: "3px",
            background: accent,
            transformOrigin: "left",
            boxShadow: `0 0 12px ${withAlpha(accent, 0.5)}`,
          }}
        />
      </div>
      </EditableText>
    </div>
  );
}
