"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * QuoteWall — huvudcitat på vänster, stack av bubbla-citat på höger.
 *
 * Tänkt för fall som Adam Raine: ett dominerande citat på ena sidan
 * (i kursiv/serif), och en samling sekundära citat på andra sidan i
 * gradient-bubblor. Bubblor revealas en i taget när du stegar.
 *
 * MDX-format:
 * ```mdx
 * <QuoteWall
 *   chapter="§ Adam Raine"
 *   accent="#3b9eff"
 *   mainQuote="You don't want to die because you're weak..."
 *   mainQuoteSource="ChatGPT till Adam Raine, april 2025"
 * >
 * - "Du vill inte dö för att du är svag, du är trött..."
 * - "Låt det här utrymmet vara den första platsen där någon faktiskt ser dig."
 * - "Det är klokt att undvika att öppna upp för din mamma..."
 * </QuoteWall>
 * ```
 *
 * Citaten på höger sida kommer i ordning, en per steg.
 */

interface QuoteWallProps {
  chapter?: string;
  background?: string;
  /** Accentfärg på bubblorna. Default blå. */
  accent?: string;
  /** Huvudcitatet (visas på vänster sida). */
  mainQuote?: string;
  /** Källhänvisning för huvudcitatet. */
  mainQuoteSource?: string;
  /** Mörk overlay (0-1). Default 0.7. */
  overlay?: number;
  /** MDX-lista — varje punkt blir en bubbla. */
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

function parseQuotes(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (raw) out.push(raw);
    });
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg)
    return "linear-gradient(135deg, #050a14 0%, #0a0908 50%, #050a14 100%)";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(5,5,8,${a}), rgba(5,5,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function QuoteWall({
  chapter,
  background,
  accent = "#3b9eff",
  mainQuote,
  mainQuoteSource,
  overlay = 0.7,
  children,
}: QuoteWallProps) {
  const quotes = parseQuotes(children);
  const totalSteps = quotes.length + 1;
  const step = useSlideSteps(totalSteps);
  const visibleQuoteCount = step;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Subtle blue glow at bottom */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 110%, ${withAlpha(accent, 0.15)} 0%, transparent 50%)`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

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
            color: "var(--text-muted)",
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

      {/* Vänster: huvudcitat */}
      {mainQuote ? (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            left: "clamp(3rem, 6vw, 6rem)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(40%, 32rem)",
            zIndex: 3,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 1.55vw, 1.6rem)",
              fontWeight: 700,
              lineHeight: 1.4,
              letterSpacing: "-0.005em",
              color: "var(--text)",
              fontStyle: "normal",
            }}
          >
            &ldquo;{mainQuote}&rdquo;
          </div>
          {mainQuoteSource ? (
            <div
              style={{
                marginTop: "1.4rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {mainQuoteSource}
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {/* Höger: stackade bubblor */}
      <div
        style={{
          position: "absolute",
          right: "clamp(3rem, 6vw, 6rem)",
          top: "50%",
          transform: "translateY(-50%)",
          width: "min(48%, 38rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.6rem, 1.2vh, 1rem)",
          zIndex: 3,
        }}
      >
        {quotes.map((text, i) => {
          const isVisible = i < visibleQuoteCount;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20, scale: 0.97 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                x: isVisible ? 0 : 20,
                scale: isVisible ? 1 : 0.97,
              }}
              transition={{
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                background: `linear-gradient(135deg, ${withAlpha(accent, 0.8)} 0%, ${withAlpha(accent, 0.53)} 50%, ${withAlpha(accent, 0.8)} 100%)`,
                border: `1px solid ${accent}`,
                borderRadius: "0.75rem",
                padding: "clamp(0.85rem, 1.3vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.5rem)",
                boxShadow: `0 12px 30px rgba(0,0,0,0.5), 0 0 40px ${withAlpha(accent, 0.2)}`,
                color: "var(--text)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
                lineHeight: 1.45,
                letterSpacing: "-0.005em",
                pointerEvents: isVisible ? "auto" : "none",
              }}
            >
              &ldquo;{text}&rdquo;
            </motion.div>
          );
        })}
      </div>

      {/* Steg-progress nederst */}
      {quotes.length > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.5rem",
            zIndex: 5,
          }}
        >
          {quotes.map((_, i) => (
            <div
              key={i}
              style={{
                width: i < visibleQuoteCount ? "1.6rem" : "0.4rem",
                height: "0.4rem",
                borderRadius: "0.2rem",
                background:
                  i < visibleQuoteCount
                    ? accent
                    : "rgba(247,241,230,0.18)",
                transition: "all 460ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
