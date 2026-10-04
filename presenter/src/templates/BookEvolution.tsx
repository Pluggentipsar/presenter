"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface BookEntry {
  title: string;
  author?: string;
  year: string;
  image?: string;
  category?: string;
  color?: string;
}

interface BookEvolutionProps {
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. Default radial-gradient. */
  background?: string;
  /** Mörk overlay (0-1). Default 0.7. */
  overlay?: number | string;
  /** Kicker uppe till vänster (t.ex. "RICHARD DAWKINS"). */
  kicker?: string;
  /**
   * Markdown-lista med en bok per rad.
   * Format: `- TITLE · AUTHOR · YEAR · CATEGORY · COLOR`
   * (Author, Category och Color är valfria — använd "" eller hoppa över för default.)
   */
  children?: ReactNode;
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

function parseBooks(children: ReactNode): BookEntry[] {
  const out: BookEntry[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [title = "—", author, year = "—", category, color] = parts;
    out.push({
      title,
      author: author || undefined,
      year,
      category: category || undefined,
      color: color || undefined,
    });
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

// Sista boken är "kulminationen" — använder temats accent (violet i midnatt,
// ember i berattelser, etc) så bok-evolutionen fungerar för alla teman.
const DEFAULT_COLORS = ["#3a4a6b", "#1a1a2e", "var(--accent)"];

function resolveBackground(
  bg: string | undefined,
  overlay: number | string,
): string {
  // var(--slide-base, …) gör att en per-slide-gradient från frontmatter syns
  // igenom. Utan den målade radial-gradienten över den med temats egen färg.
  if (!bg)
    return "var(--slide-base, radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--bg) 70%))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7;
    return `linear-gradient(rgba(7,8,24,${a}), rgba(7,8,24,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function CssBookCover({
  book,
  color,
  isClimax,
}: {
  book: BookEntry;
  color: string;
  isClimax: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2/3",
        background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -20)} 100%)`,
        boxShadow: isClimax
          ? `0 30px 60px rgba(0,0,0,0.6), 0 0 80px ${withAlpha(color, 0.53)}, inset 0 0 0 1px rgba(255,255,255,0.06)`
          : "0 24px 48px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)",
        borderRadius: "2px 4px 4px 2px",
        padding: "clamp(1.2rem, 1.8vw, 2rem)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {/* Spine highlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)",
        }}
      />
      {/* Subtle texture */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)",
          mixBlendMode: "overlay",
          opacity: 0.5,
        }}
      />

      {/* Top: kategori */}
      {book.category ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.55rem, 0.75vw, 0.75rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            fontWeight: 500,
          }}
        >
          {book.category}
        </div>
      ) : (
        <div />
      )}

      {/* Mitten: titel */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.96)",
          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {book.title.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Botten: författare */}
      {book.author ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.7rem, 0.95vw, 0.95rem)",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.01em",
          }}
        >
          {book.author}
        </div>
      ) : null}
    </div>
  );
}

/**
 * BookEvolution — tre böcker som reveals i sekvens.
 *
 * Bygger en visuell evolution-narrativ där sista boken är "kulminationen".
 * Använd för Dawkins-historien (Selfish Gene → God Delusion → Claude Delusion)
 * eller andra tre-stegs-narrativ med tidsperspektiv.
 */
export function BookEvolution({
  chapter,
  background,
  overlay = 0.7,
  kicker,
  children,
}: BookEvolutionProps) {
  const safeBooks = parseBooks(children).slice(0, 3);
  while (safeBooks.length < 3) {
    safeBooks.push({ title: "—", year: "—" });
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Subtil accent-glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 35% at 75% 60%, var(--accent-dim) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Kicker uppe vänster */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter uppe höger */}
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
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Decorative line */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 7rem)",
          width: "3rem",
          height: "1px",
          background: "var(--accent)",
          transformOrigin: "left",
          zIndex: 3,
        }}
      />

      {/* Books-grid */}
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{
          padding: "clamp(2rem, 5vw, 6rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(1.5rem, 4vw, 4.5rem)",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
            alignItems: "end",
          }}
        >
          {safeBooks.map((book, i) => {
            const color = book.color ?? DEFAULT_COLORS[i] ?? DEFAULT_COLORS[0];
            const isClimax = i === safeBooks.length - 1;
            const baseDelay = 0.5 + i * 0.7;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.8rem, 1.5vw, 1.4rem)",
                }}
              >
                {/* Bok */}
                <motion.div
                  initial={{ opacity: 0, y: 40, rotateY: -15, scale: 0.92 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateY: isClimax ? -3 : 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 1.0,
                    delay: baseDelay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    width: "100%",
                    maxWidth: "16rem",
                    transformOrigin: "center bottom",
                    transformStyle: "preserve-3d",
                    perspective: "800px",
                  }}
                >
                  {book.image ? (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "2/3",
                        background: `url('${book.image}') center/cover no-repeat`,
                        boxShadow: isClimax
                          ? `0 30px 60px rgba(0,0,0,0.6), 0 0 80px ${withAlpha(color, 0.53)}`
                          : "0 24px 48px rgba(0,0,0,0.55)",
                        borderRadius: "2px 4px 4px 2px",
                      }}
                    />
                  ) : (
                    <CssBookCover
                      book={book}
                      color={color}
                      isClimax={isClimax}
                    />
                  )}
                </motion.div>

                {/* Årtal */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: baseDelay + 0.4,
                  }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
                    letterSpacing: "0.18em",
                    color: isClimax
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--text) 55%, transparent)",
                    fontWeight: isClimax ? 700 : 500,
                    textTransform: "uppercase",
                  }}
                >
                  {book.year}
                </motion.div>

                {/* Connector arrow (only between books) */}
                {i < safeBooks.length - 1 ? (
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.4, x: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: baseDelay + 0.6,
                    }}
                    style={{
                      position: "absolute",
                      right: "calc(-2vw - 0.5rem)",
                      top: "40%",
                      fontFamily: "var(--font-mono)",
                      fontSize: "1.5rem",
                      color: "color-mix(in srgb, var(--text) 30%, transparent)",
                      pointerEvents: "none",
                    }}
                  >
                    →
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Lägg till svart-procent (negative = mörkare). */
function shade(hex: string, percent: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const factor = (100 + percent) / 100;
  const adj = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * factor)))
      .toString(16)
      .padStart(2, "0");
  return `#${adj(r)}${adj(g)}${adj(b)}`;
}
