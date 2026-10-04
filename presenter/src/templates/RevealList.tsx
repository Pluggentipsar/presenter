"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface RevealListProps {
  /** Persistent text ovanför listan, t.ex. "Vi skriver..." */
  prefix?: string;
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /** Bakgrund. */
  background?: string;
  /** Accentfärg för **bold**-ord. */
  accent?: string;
  /** Sekunder mellan raderna. Default 0.9. */
  stagger?: number;
  /** Mörk overlay (0-1). Default 0.55. */
  overlay?: number;
  /** Markdown-lista. **ord** blir accent-färgat. */
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
    return inner;
  }
  return "";
}

function parseLines(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
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

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span
          key={i}
          style={{
            color: accent,
            fontWeight: 700,
            textShadow: `0 0 24px ${withAlpha(accent, 0.33)}`,
          }}
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * RevealList — ackumulerande lista där rader växer in progressivt,
 * varje ny rad pulsar svagt, äldre rader blir lätt nedtonade.
 * Sista raden får kvarstående glow.
 *
 * Use case: "Vi skriver..." med 5 skäl som staplas upp.
 */
export function RevealList({
  prefix,
  chapter,
  background,
  accent = "var(--accent)",
  stagger = 0.9,
  overlay = 0.55,
  children,
}: RevealListProps) {
  const lines = parseLines(children);

  // En foto-/video-bakgrund får en mörk scrim i resolveBackground → texten
  // ovanpå måste då vara fast ljus oavsett tema. Utan sådan bg följer slide:n
  // temat (var(--bg)/var(--text)) och texten ska gå mörk på ljust tema.
  const onDark = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const primaryText = onDark ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = onDark ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const textShadow = onDark ? "0 4px 24px rgba(0,0,0,0.5)" : "none";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Accent-glow uppe — ambient-accent släcks i kobolt (rent papper) */}
      <div
        aria-hidden
        className="ambient-accent"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${withAlpha(accent, 0.07)} 0%, transparent 70%)`,
        }}
      />

      {/* Chapter */}
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
            color: mutedText,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          gap: "clamp(1rem, 2vh, 1.8rem)",
          alignItems: "flex-start",
          zIndex: 2,
        }}
      >
        {/* Prefix — persistent */}
        {prefix ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              lineHeight: 1.1,
              color: mutedText,
              marginBottom: "0.5rem",
              textShadow,
            }}
          >
            <EditableText path="prefix" value={prefix}>
              {prefix}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Listan */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.6vh, 1.5rem)",
          }}
        >
          {lines.map((line, i) => {
            const delay = 0.9 + i * stagger;
            const isLast = i === lines.length - 1;
            // Äldre rader blir svagt nedtonade när nya rader kommer
            const tieredOpacity = 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{
                  opacity: tieredOpacity,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.8,
                  delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(2.2rem, 4vw, 4rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: primaryText,
                  textShadow,
                  position: "relative",
                }}
              >
                {/* Puls-glow när raden kommer in */}
                <motion.span className="ambient-accent"
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={
                    isLast
                      ? {
                          opacity: [0, 0.5, 0.2, 0.4, 0.2],
                        }
                      : { opacity: [0, 0.6, 0] }
                  }
                  transition={
                    isLast
                      ? {
                          duration: 4,
                          delay: delay + 0.4,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }
                      : {
                          duration: 1.2,
                          delay: delay + 0.3,
                        }
                  }
                  style={{
                    position: "absolute",
                    inset: "-0.3em -0.5em",
                    background: `radial-gradient(ellipse, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
                    filter: "blur(20px)",
                    zIndex: -1,
                    pointerEvents: "none",
                  }}
                />
                {renderInline(line, accent)}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
