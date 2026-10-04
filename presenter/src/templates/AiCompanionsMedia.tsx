"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface AiCompanionsMediaProps {
  kicker?: string;
  chapter?: string;
  title: string;
  turn?: string;
  landing?: string;
  /** Bild som visas som visuell evidens (höger kolumn). */
  image?: string;
  imageAlt?: string;
  /** Bildens lilla caption under den. */
  imageCaption?: string;
  /** Video som visas under bilden — silent autoplay-loop. */
  video?: string;
  /** Videons lilla caption under den. */
  videoCaption?: string;
  /**
   * Markdown-lista: `- NAMN · BESKRIVNING`. Sista item får alert-prick
   * (matchar bevisen i höger kolumn).
   */
  children?: ReactNode;
}

interface Companion {
  name: string;
  descriptor: string;
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

function parseCompanions(children: ReactNode): Companion[] {
  const out: Companion[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const [name = "", descriptor = ""] = raw.split("·").map((s) => s.trim());
      if (name) out.push({ name, descriptor });
    });
  });
  return out;
}

function renderInlineBold(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Två-kolumns layout för AI-vänskaps-branschen. Vänster: text + branschlista.
 * Höger: bild + video som rena evidens-ramar med captions. Inget överlapp
 * mellan text och media.
 */
export function AiCompanionsMedia({
  kicker,
  chapter,
  title,
  turn,
  landing,
  image,
  imageAlt,
  imageCaption,
  video,
  videoCaption,
  children,
}: AiCompanionsMediaProps) {
  const companions = parseCompanions(children);
  const accent = "var(--accent)";
  const alert = "var(--accent-alert, #ff5c7a)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 1.8vh, 1.6rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.4rem, 3.8vw, 3.4rem)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: "var(--text)",
            margin: 0,
            maxWidth: "30em",
          }}
        >
          <EditableText path="title" value={title}>
            {renderInlineBold(title, accent)}
          </EditableText>
        </motion.h2>

        {/* Two-column body */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.85fr)",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            minHeight: 0,
          }}
        >
          {/* Vänster: turn + branschlista */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1.2rem, 2vh, 1.8rem)",
              minHeight: 0,
            }}
          >
            {turn ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.88, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                  lineHeight: 1.5,
                  color: "var(--text)",
                  margin: 0,
                  borderLeft: `2px solid ${withAlpha("var(--accent)", 0.5)}`,
                  paddingLeft: "clamp(0.9rem, 1.2vw, 1.2rem)",
                }}
              >
                <EditableText path="turn" value={turn} multiline>{turn}</EditableText>
              </motion.p>
            ) : null}

            {/* Branschlista */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.75rem, 1.2vh, 1rem)",
              }}
            >
              {companions.map((c, i) => {
                const isLast = i === companions.length - 1;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 240,
                      damping: 26,
                      delay: 0.4 + i * 0.13,
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr",
                      alignItems: "baseline",
                      gap: "clamp(0.85rem, 1.2vw, 1.1rem)",
                      padding: "clamp(0.85rem, 1.2vw, 1.15rem) clamp(1rem, 1.4vw, 1.3rem)",
                      borderRadius: "0.9rem",
                      background: isLast
                        ? `linear-gradient(135deg, ${withAlpha(alert, 0.14)} 0%, ${withAlpha(alert, 0.03)} 100%)`
                        : "var(--bg-elevated, var(--bg-surface))",
                      border: isLast
                        ? `1px solid ${withAlpha(alert, 0.4)}`
                        : "1px solid var(--glass-border, rgba(0,0,0,0.1))",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Bullet/marker */}
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: isLast ? alert : accent,
                        boxShadow: `0 0 10px ${isLast ? withAlpha(alert, 0.7) : "var(--accent-glow, rgba(0,0,0,0.4))"}`,
                        marginTop: "0.4rem",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.05rem, 1.35vw, 1.3rem)",
                          fontWeight: 600,
                          letterSpacing: "-0.018em",
                          color: "var(--text)",
                        }}
                      >
                        {c.name}
                      </div>
                      {c.descriptor ? (
                        <div
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "clamp(0.86rem, 1vw, 1rem)",
                            color: "var(--text-muted)",
                            lineHeight: 1.5,
                          }}
                        >
                          {c.descriptor}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Höger: media-evidens */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.9rem, 1.4vh, 1.2rem)",
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: alert,
                fontWeight: 600,
              }}
            >
              ★ Evidens
            </div>

            {image ? (
              <motion.figure
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "relative",
                  margin: 0,
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: `1.5px solid ${withAlpha(alert, 0.4)}`,
                  boxShadow: `0 18px 44px -14px ${withAlpha(alert, 0.3)}, 0 8px 20px rgba(0,0,0,0.4)`,
                  background: "var(--bg-elevated, var(--bg-surface))",
                  flex: video ? "0 0 auto" : "1 1 auto",
                  maxHeight: video ? "48%" : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={image}
                  alt={imageAlt ?? ""}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    maxHeight: video ? "calc(100% - 0px)" : "100%",
                    objectFit: "cover",
                  }}
                />
                {imageCaption ? (
                  <figcaption
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "0.6rem 0.9rem",
                      background:
                        "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <EditableText path="imageCaption" value={imageCaption}>{imageCaption}</EditableText>
                  </figcaption>
                ) : null}
              </motion.figure>
            ) : null}

            {video ? (
              <motion.figure
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "relative",
                  margin: 0,
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: `1.5px solid ${withAlpha(alert, 0.4)}`,
                  boxShadow: `0 18px 44px -14px ${withAlpha(alert, 0.3)}, 0 8px 20px rgba(0,0,0,0.4)`,
                  background: "var(--bg-elevated, var(--bg-surface))",
                  flex: "1 1 auto",
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoVideo src={video} />
                {videoCaption ? (
                  <figcaption
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "0.6rem 0.9rem",
                      background:
                        "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <EditableText path="videoCaption" value={videoCaption}>{videoCaption}</EditableText>
                  </figcaption>
                ) : null}
              </motion.figure>
            ) : null}
          </div>
        </div>

        {/* Landing */}
        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.4 }}
            style={{
              borderTop: "1px solid var(--glass-border, rgba(0,0,0,0.1))",
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.15rem, 1.5vw, 1.5rem)",
              color: "var(--text)",
              lineHeight: 1.35,
              fontWeight: 500,
              letterSpacing: "-0.015em",
            }}
          >
            <EditableText path="landing" value={landing} multiline>
              {renderInlineBold(landing, accent)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function AutoVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setNeedsTap(true));
    }
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={src}
        playsInline
        loop
        muted
        autoPlay
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {needsTap ? (
        <button
          type="button"
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.play();
            setNeedsTap(false);
          }}
          aria-label="Spela upp"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="18" viewBox="0 0 24 24" fill="rgba(245,246,250,0.92)">
              <path d="M6 4 L20 12 L6 20 Z" />
            </svg>
          </span>
        </button>
      ) : null}
    </>
  );
}
