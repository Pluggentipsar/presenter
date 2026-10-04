"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { EditableText, EditableMedia } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface VibeCodingProps {
  /** Liten mono-kicker överst (t.ex. "§ XV · Exempel 02"). */
  kicker?: string;
  /** Ämne eller kategori (visas som små caps). */
  subject?: string;
  /** Ålder/avsändare (mikro-etikett under titel). */
  student?: string;
  /** Titel som visas stort — vad eleven faktiskt byggde. */
  title?: string;
  /** Caption-text under prompt-bubblan. */
  caption?: string;
  /** Video-URL som spelas autoplay/loop/muted i höger halva. */
  videoSrc?: string;
  /** 16:9, 9:16, 1:1 — påverkar aspect av video-box. Default "9 / 16". */
  videoAspect?: string;
  /** Bakgrundsbild. */
  background?: string;
  /** Accentfärg. */
  accent?: string;
  /** Elev-prompten skrivs in som children (MDX-text). */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.55), rgba(10,9,8,0.72)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

/**
 * Elev skriver ord-för-ord prompt → video av resultatet spelas upp till höger.
 * Tänkt för "vibecoding-exempel" där elever beställer fram egna pluggsidor
 * utan att kunna kod.
 */
export function VibeCoding({
  kicker,
  subject,
  student,
  title,
  caption,
  videoSrc,
  videoAspect = "9 / 16",
  background,
  accent = "var(--accent)",
  children,
}: VibeCodingProps) {
  const prompt = extractText(children).trim();

  // När en bakgrundsbild är satt läggs en mörk scrim ovanpå (se resolveBackground),
  // så texten sitter alltid på mörkt och måste vara ljus oavsett tema.
  // Utan bild följer slide:n temat och texten ska vara tema-tokens.
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http"))
  );
  const textColor = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative grid h-full w-full"
        style={{
          gridTemplateColumns: videoSrc ? "56% 44%" : "1fr",
          zIndex: 2,
        }}
      >
        {/* Vänster: elev-metadata + prompt */}
        <div
          className="flex flex-col"
          style={{
            padding: "clamp(2rem, 3.5vw, 3.5rem)",
            gap: "clamp(1rem, 1.8vh, 1.5rem)",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}

          {subject ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.75rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: mutedColor,
                fontWeight: 500,
              }}
            >
              <EditableText path="subject" value={subject ?? ""}>{subject}</EditableText>
            </motion.div>
          ) : null}

          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: textColor,
                margin: 0,
                textShadow: hasPhotoBg ? "0 8px 40px rgba(0,0,0,0.5)" : "none",
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}

          {student ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(0.85rem, 1vw, 1rem)",
                color: mutedColor,
              }}
            >
              — <EditableText path="student" value={student ?? ""}>{student}</EditableText>
            </motion.div>
          ) : null}

          {/* Prompt-bubbla */}
          {prompt ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                marginTop: "0.5rem",
                padding: "clamp(1.25rem, 1.8vw, 1.75rem) clamp(1.4rem, 2vw, 2rem)",
                borderRadius: "1.1rem",
                borderTopLeftRadius: "0.3rem",
                background: "var(--bg-elevated)",
                border: "1px solid rgba(127,127,127,0.18)",
                backdropFilter: "blur(20px) saturate(140%)",
                WebkitBackdropFilter: "blur(20px) saturate(140%)",
                boxShadow:
                  "0 20px 50px -15px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.05vw, 1.1rem)",
                lineHeight: 1.55,
                color: "var(--text)",
                maxWidth: "38em",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: "-0.4rem",
                  top: "-0.8rem",
                  fontSize: "3.5rem",
                  color: accent,
                  opacity: 0.45,
                  fontFamily: "var(--font-display)",
                  lineHeight: 1,
                }}
              >
                “
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>{prompt}</div>
            </motion.div>
          ) : null}

          {caption ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                marginTop: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "2.5rem",
                  height: "1px",
                  background: accent,
                  opacity: 0.7,
                }}
                aria-hidden
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                  color: textColor,
                }}
              >
                <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
              </span>
            </motion.div>
          ) : null}
        </div>

        {/* Höger: video */}
        {videoSrc ? (
          <div
            className="relative flex items-center justify-center"
            style={{ padding: "clamp(1.5rem, 2.5vw, 2.5rem)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden"
              style={{
                aspectRatio: videoAspect,
                width: "100%",
                height: "auto",
                maxHeight: "100%",
                borderRadius: "0.9rem",
                boxShadow: `0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px ${withAlpha(accent, 0.21)} inset, 0 0 40px -10px ${withAlpha(accent, 0.25)}`,
                background: "#0a0908",
              }}
            >
              <EditableMedia path="videoSrc" value={videoSrc ?? ""} mediaType="video" label="Demo-video">
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background: "#0a0908",
                  }}
                />
              </EditableMedia>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
