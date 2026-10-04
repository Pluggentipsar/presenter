"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface CaseQuoteProps {
  /** Kicker uppe till vänster (typ "§ 10 / Spegeln"). */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /**
   * Sekundärtext — kontextstycket mellan profile-beats och citatet.
   * Bör vara 2–3 rader. Lugnt, beskrivande, kursivt.
   */
  context?: string;
  /** Huvudcitatet — den största typografin på sliden. Korall-röd. */
  quote: string;
  /**
   * Svensk översättning av citatet, valfri. Visas under huvudcitatet
   * i muted italic så talaren kan läsa båda men engelska dominerar.
   */
  quoteTranslation?: string;
  /** Attribution under citatet. Mono, accent-alert. */
  attribution?: string;
  /** Källrad nere till höger. Mono, muted. */
  source?: string;
  /**
   * Profile-beats: markdown-lista där varje rad är en kort beat.
   * Format:
   * ```
   * - 42 år.
   * - Revisor.
   * - Ingen tidigare psykos.
   * - Använde ChatGPT till Excel.
   * ```
   */
  children?: ReactNode;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseBeats(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
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

/**
 * CaseQuote — editorial profil-citat-slide för "spegel-moment".
 *
 * Designad för det dramaturgiska slag där publiken inte längre kan
 * distansera sig genom att tänka "det här gäller bara sårbara unga".
 * Profil-beats etablerar personen i staccato, kontextstycket berättar
 * vad som hände, och citatet (korall-rött, dominant) levererar
 * konsekvensen.
 *
 * Visuell hierarki:
 *  1. Profile beats (vänster-vänster, staccato fade-in)
 *  2. Context (mindre, kursiv, muted)
 *  3. Ornament-linje (smal)
 *  4. CITATET (största, accent-alert, dominerar mitten)
 *  5. Översättning (mindre kursiv, muted)
 *  6. Attribution (mono, accent-alert)
 *  7. Källa (mono, muted, nere till höger)
 *
 * Stor faded citattecken-symbol bakom citatet för editorial bok-känsla.
 *
 * Tema-agnostisk — alla färger via CSS-variabler. Använder
 * `var(--accent-alert)` för citatet och attribution.
 */
export function CaseQuote({
  kicker,
  chapter,
  context,
  quote,
  quoteTranslation,
  attribution,
  source,
  children,
  background,
  overlay,
  overlayMode = "dark",
}: CaseQuoteProps) {
  const beats = parseBeats(children);

  // Tajming-modell: bygger upp till citatet, citatet kommer som klimax.
  const beatStart = 0.4;
  const beatStep = 0.42;
  const contextDelay = beatStart + beats.length * beatStep + 0.4;
  const ornamentDelay = contextDelay + 1.4;
  const quoteDelay = ornamentDelay + 0.6;
  const translationDelay = quoteDelay + 1.5;
  const attributionDelay = translationDelay + 0.7;
  const sourceDelay = attributionDelay + 0.5;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 38%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 75%)",
      }}
    >
      {/* Stort dekorativt citat-tecken bakom — i accent-alert (korall-röd) */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 0.06, scale: 1 }}
        transition={{
          duration: 2.4,
          delay: quoteDelay - 0.6,
          ease: "easeOut",
        }}
        style={{
          position: "absolute",
          top: "8%",
          right: "6%",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "clamp(22rem, 44vw, 56rem)",
          lineHeight: 0.8,
          color: "var(--accent-alert)",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1,
          transform: "scaleX(-1)",
        }}
      >
        "
      </motion.div>

      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent-alert)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
            textAlign: "right",
            maxWidth: "min(20em, 40%)",
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll — centrerat, vänsterjusterat inom max-width */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 5vw, 6rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 7vh, 6.5rem)",
          paddingBottom: "clamp(3rem, 5vh, 4.5rem)",
          justifyContent: "center",
          alignItems: "center",
          gap: "clamp(1.2rem, 2.6vh, 2rem)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "clamp(1.2rem, 2.4vh, 1.8rem)",
            width: "100%",
            maxWidth: "min(38rem, 100%)",
          }}
        >
          {/* Profile beats — staccato */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.2rem, 0.5vh, 0.4rem)",
            }}
          >
            {beats.map((beat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.6,
                  delay: beatStart + i * beatStep,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)",
                  lineHeight: 1.25,
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                }}
              >
                {beat}
              </motion.div>
            ))}
          </div>

          {/* Context — sex veckor senare-stycket */}
          {context ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1.0,
                delay: contextDelay,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
                lineHeight: 1.55,
                letterSpacing: "0.005em",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "30em",
              }}
            >
              <EditableText path="context" value={context}>
                {context}
              </EditableText>
            </motion.p>
          ) : null}

          {/* Ornament-linje — knyter ihop med citatet visuellt */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 1.0,
              delay: ornamentDelay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              width: "clamp(3rem, 5vw, 4.5rem)",
              height: "1px",
              background: "var(--accent-alert)",
              transformOrigin: "left",
              marginTop: "clamp(0.5rem, 1vh, 0.8rem)",
              marginBottom: "clamp(0.2rem, 0.5vh, 0.4rem)",
            }}
          />

          {/* CITATET — den största typografin på sliden */}
          <motion.blockquote
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 1.4,
              delay: quoteDelay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(2rem, 3.8vw, 3.4rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
              color: "var(--accent-alert)",
              margin: 0,
              padding: 0,
              maxWidth: "20em",
            }}
          >
            <EditableText path="quote" value={quote} label="Citat">
              "{quote}"
            </EditableText>
          </motion.blockquote>

          {/* Översättning */}
          {quoteTranslation ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.9,
                delay: translationDelay,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
                lineHeight: 1.4,
                letterSpacing: "0.005em",
                color: "var(--text-muted)",
                margin: 0,
                marginTop: "clamp(-0.3rem, -0.5vh, -0.2rem)",
                maxWidth: "26em",
              }}
            >
              <EditableText
                path="quoteTranslation"
                value={quoteTranslation}
                label="Översättning"
              >
                {quoteTranslation}
              </EditableText>
            </motion.p>
          ) : null}

          {/* Attribution */}
          {attribution ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: attributionDelay }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.85rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--accent-alert)",
                fontWeight: 600,
                marginTop: "clamp(0.3rem, 0.8vh, 0.6rem)",
              }}
            >
              <EditableText path="attribution" value={attribution}>
                — {attribution}
              </EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>

      {/* Källrad — nere till höger */}
      {source ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: sourceDelay }}
          style={{
            position: "absolute",
            bottom: "clamp(1.8rem, 3vh, 2.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            textAlign: "right",
            maxWidth: "min(28em, 50%)",
            zIndex: 3,
          }}
        >
          <EditableText path="source" value={source}>
            {source}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
