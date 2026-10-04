"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface FeedExhibitProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  bottomLine?: string;
  /** Video som visas i högerpanelen — silent autoplay-loop. */
  video?: string;
  /** Bild som visas i högerpanelen (om ingen video). */
  image?: string;
  imageAlt?: string;
  /** Caption under media. */
  mediaCaption?: string;
  /**
   * Markdown-lista i 2x2-grid till vänster. Format: `- Titel · Beskrivning`.
   * `★ Titel` markerar central (accent-border + glow).
   */
  children?: ReactNode;
}

interface GridItem {
  title: string;
  description: string;
  starred: boolean;
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

function parseItems(children: ReactNode): GridItem[] {
  const out: GridItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const starred = raw.startsWith("★");
      const clean = raw.replace(/^★\s*/, "");
      const parts = clean.split(/\s*·\s*/);
      out.push({
        title: parts[0] ?? "",
        description: parts.slice(1).join(" · "),
        starred,
      });
    });
  });
  return out;
}

/**
 * Två-kol-layout: 2x2-grid med kort till vänster, stor media (video eller
 * bild) till höger. Tänkt för "vad finns i ditt feed"-slides där högerytan
 * blir konkret bevis som ramar in vänsterns punkter.
 */
export function FeedExhibit({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  video,
  image,
  imageAlt,
  mediaCaption,
  children,
}: FeedExhibitProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

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
          padding: "clamp(2.2rem, 3.8vw, 3.4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.2vh, 2rem)",
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "44em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 3.6vw, 3.2rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.98rem, 1.18vw, 1.18rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.6rem 0 0 0",
                maxWidth: "40em",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Body — split */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            gap: "clamp(1.4rem, 2.8vw, 2.8rem)",
            minHeight: 0,
          }}
        >
          {/* Vänster: 2x2-grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridAutoRows: "1fr",
              gap: "clamp(0.9rem, 1.5vw, 1.4rem)",
              minHeight: 0,
            }}
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 26,
                  delay: 0.3 + i * 0.1,
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "clamp(1rem, 1.4vw, 1.4rem) clamp(1.1rem, 1.5vw, 1.5rem)",
                  borderRadius: "1.1rem",
                  background: item.starred
                    ? `linear-gradient(160deg, ${withAlpha("var(--accent)", 0.2)} 0%, ${withAlpha("var(--accent)", 0.04)} 100%)`
                    : "var(--bg-surface)",
                  border: item.starred
                    ? `1.5px solid ${withAlpha("var(--accent)", 0.55)}`
                    : "1px solid rgba(0,0,0,0.08)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: item.starred
                    ? `0 18px 44px -14px var(--accent-glow, rgba(0,0,0,0.4)), inset 0 1px 0 ${withAlpha("var(--accent)", 0.35)}`
                    : "0 14px 32px -12px rgba(0,0,0,0.18)",
                  gap: "0.4rem",
                  minHeight: 0,
                }}
              >
                {item.starred ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.62rem",
                      letterSpacing: "0.32em",
                      textTransform: "uppercase",
                      color: accent,
                      fontWeight: 700,
                    }}
                  >
                    ★ Central
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.15rem, 1.55vw, 1.55rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.018em",
                    lineHeight: 1.2,
                    color: item.starred ? accent : "var(--text)",
                    textShadow: item.starred
                      ? `0 0 20px ${withAlpha("var(--accent)", 0.4)}`
                      : undefined,
                  }}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.88rem, 1.05vw, 1.05rem)",
                      lineHeight: 1.45,
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>

          {/* Höger: media (9:16 phone-format, centrerad) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <motion.figure
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                margin: 0,
                borderRadius: "1.4rem",
                overflow: "hidden",
                background: "var(--bg-elevated, var(--bg-surface))",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow:
                  "0 28px 60px -20px rgba(0,0,0,0.28), 0 12px 28px -10px var(--accent-glow, rgba(0,0,0,0.2))",
                aspectRatio: "9 / 16",
                height: "100%",
                width: "auto",
                maxWidth: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
            {video ? (
              <AutoVideo src={video} />
            ) : image ? (
              <img
                src={image}
                alt={imageAlt ?? ""}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  padding: "2rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Media saknas
              </div>
            )}
            {mediaCaption ? (
              <figcaption
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "0.7rem 1rem",
                  background:
                    "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.68rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <EditableText path="mediaCaption" value={mediaCaption}>
                  {mediaCaption}
                </EditableText>
              </figcaption>
            ) : null}
            </motion.figure>
          </div>
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.4 }}
            style={{
              borderTop: "1px solid rgba(0,0,0,0.12)",
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.35rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "62em",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine} multiline>
              {bottomLine}
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
              boxShadow: "0 12px 28px var(--accent-glow, rgba(0,0,0,0.4))",
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
