"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface PredictionOption {
  text: string;
  probability: number; // 0-100
}

interface PredictionSentence {
  prefix: string;
  options: PredictionOption[];
}

interface SentencePredictorProps {
  eyebrow?: string;
  /** Label ovanför options-listan. Default "AI:s gissningar". */
  predictionsLabel?: string;
  size?: "lg" | "xl" | "2xl";
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
  /**
   * Lista av meningar med top-N AI-fortsättningar. Format per rad:
   *
   *   - Prefix... · Option 1 (34%), Option 2 (22%), Option 3 (15%)
   *
   * Procent inom parentes är valfritt — om utelämnat beräknas en rimlig
   * fallback-ranking. Klick (space) avslöjar prefix → första option →
   * andra option → ... → nästa mening.
   */
  children?: ReactNode;
}

const SIZES: Record<NonNullable<SentencePredictorProps["size"]>, string> = {
  lg: "clamp(2.4rem, 5.4vw, 4.2rem)",
  xl: "clamp(3rem, 7.5vw, 6rem)",
  "2xl": "clamp(3.8rem, 9.5vw, 7.5rem)",
};

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

function parseSentences(children: ReactNode): PredictionSentence[] {
  const out: PredictionSentence[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    // Format: "Prefix... · Option 1 (34%), Option 2 (22%), ..."
    const dotIdx = raw.indexOf("·");
    if (dotIdx === -1) return;
    const prefix = raw.slice(0, dotIdx).trim();
    const optionsRaw = raw.slice(dotIdx + 1).trim();
    if (!prefix || !optionsRaw) return;

    const optionRegex = /\s*,\s*(?![^()]*\))/;
    const parts = optionsRaw.split(optionRegex).map((s) => s.trim()).filter(Boolean);
    const options: PredictionOption[] = parts.map((p, i) => {
      const m = p.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*%?\)\s*$/);
      if (m) {
        return { text: m[1].trim(), probability: parseFloat(m[2]) };
      }
      // Ingen procent angiven → fallback fördelar 90→10 över N options
      const fallback = parts.length > 1
        ? Math.round(90 - (i * 80) / Math.max(1, parts.length - 1))
        : 80;
      return { text: p, probability: fallback };
    });
    if (options.length === 0) return;
    out.push({ prefix, options });
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
 * Visa hur en språkmodell rankar möjliga fortsättningar.
 *
 * - Visa prefix + "..." (svart) → klassen gissar muntligt.
 * - Tryck space → AI:ns top-N fortsättningar avslöjas en åt gången,
 *   med animerad sannolikhets-bar.
 * - Tryck space igen → nästa mening.
 *
 * Pedagogisk poäng: AI rankar alternativ baserat på vad den sett mest
 * av i träningsdatan. Procenten gör det konkret att den GISSAR — inte
 * VET.
 *
 * ```mdx
 * <SentencePredictor>
 * - HV71 är världens... · Bästa lag (34%), Tuffaste hockeylag (22%), Mest älskade lag (15%)
 * - Taylor Swift är... · Världens bästa popartist (28%), Otroligt populär (24%)
 * </SentencePredictor>
 * ```
 */
export function SentencePredictor({
  eyebrow,
  predictionsLabel = "AI:n gissar",
  size = "xl",
  background,
  overlay,
  overlayMode = "light",
  children,
}: SentencePredictorProps) {
  const reduce = useReducedMotion();
  const sentences = useMemo(() => parseSentences(children), [children]);

  // Total steg: per mening = 1 (prefix synligt, inga options) + N options.
  // Det betyder steg 0 = mening 0 utan options, steg 1..N = options
  // avslöjade en åt gången, steg N+1 = mening 1 utan options, osv.
  const stepsPerSentence = sentences.map((s) => s.options.length + 1);
  const totalSteps = stepsPerSentence.reduce((a, b) => a + b, 0);
  const step = useSlideSteps(Math.max(totalSteps, 1));

  // Konvertera step → {sentenceIdx, optionsRevealed}
  let sentenceIdx = 0;
  let optionsRevealed = 0;
  {
    let cum = 0;
    for (let i = 0; i < sentences.length; i++) {
      const sSteps = stepsPerSentence[i];
      if (step < cum + sSteps) {
        sentenceIdx = i;
        optionsRevealed = step - cum; // 0 .. options.length
        break;
      }
      cum += sSteps;
      if (i === sentences.length - 1) {
        sentenceIdx = i;
        optionsRevealed = sentences[i].options.length;
      }
    }
  }

  const active = sentences[sentenceIdx] ?? { prefix: "...", options: [] };

  // Sortera options efter probability desc — top syns först
  const sortedOptions = useMemo(
    () => [...active.options].sort((a, b) => b.probability - a.probability),
    [active.options],
  );

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      {/* Subtila gradienter för djup */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(239,79,143,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-10 lg:px-24 lg:pt-14">
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            <EditableText path="eyebrow" value={eyebrow}>{eyebrow}</EditableText>
          </motion.div>
        ) : null}

        {/* Prefix (svart, stor) + sentence-counter */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10">
          <AnimatePresence mode="wait">
            <motion.h1
              key={`prefix-${sentenceIdx}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-center leading-[0.96] tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                fontSize: SIZES[size],
                color: "var(--text)",
                textShadow: "var(--title-shadow, none)",
                margin: 0,
                maxWidth: "94%",
              }}
            >
              {active.prefix}
              <ThinkingDots />
            </motion.h1>
          </AnimatePresence>

          {/* Predictions-label + cards */}
          <motion.div
            key={`predictions-${sentenceIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: optionsRevealed > 0 ? 1 : 0.35 }}
            transition={{ duration: 0.35 }}
            className="flex w-full max-w-[56rem] flex-col items-center gap-3"
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                opacity: optionsRevealed > 0 ? 1 : 0.5,
              }}
            >
              ↓ {predictionsLabel} ↓
            </div>

            <div className="flex w-full flex-col gap-2.5">
              {sortedOptions.map((option, i) => {
                const revealed = i < optionsRevealed;
                const isTop = i === 0 && revealed;
                return (
                  <PredictionCard
                    key={`${sentenceIdx}-${i}`}
                    option={option}
                    revealed={revealed}
                    isTop={isTop}
                    rank={i + 1}
                    reduce={!!reduce}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Sentence-counter — diskret nere till höger */}
        {sentences.length > 1 ? (
          <div
            className="absolute bottom-6 right-8"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              opacity: 0.6,
            }}
          >
            {String(sentenceIdx + 1).padStart(2, "0")} / {String(sentences.length).padStart(2, "0")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PredictionCard({
  option,
  revealed,
  isTop,
  rank,
  reduce,
}: {
  option: PredictionOption;
  revealed: boolean;
  isTop: boolean;
  rank: number;
  reduce: boolean;
}) {
  const tilt = reduce ? 0 : isTop ? -0.6 : 0.4;
  return (
    <motion.div
      initial={false}
      animate={
        revealed
          ? { opacity: 1, y: 0, scale: 1, rotate: tilt }
          : { opacity: 0, y: 16, scale: 0.96, rotate: tilt - 1 }
      }
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: isTop
          ? "var(--card-border-thick, 4px solid #1A1A1A)"
          : "var(--card-border, 3px solid #1A1A1A)",
        borderRadius: "var(--radius)",
        boxShadow: isTop
          ? "var(--card-shadow-alt, 8px 8px 0 #1A1A1A)"
          : "var(--card-shadow, 6px 6px 0 #1A1A1A)",
        padding: "clamp(0.85rem, 1.4vw, 1.3rem) clamp(1.15rem, 1.8vw, 1.8rem)",
        display: "flex",
        alignItems: "center",
        gap: "clamp(0.8rem, 1.4vw, 1.4rem)",
        overflow: "hidden",
      }}
    >
      {/* Rang-nummer */}
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)" as unknown as number,
          fontSize: "clamp(1.4rem, 2.2vw, 2.2rem)",
          color: isTop ? "var(--accent)" : "var(--text-muted)",
          width: "clamp(2rem, 3vw, 3rem)",
          textAlign: "center",
          textShadow: isTop ? "var(--title-shadow, none)" : "none",
        }}
      >
        {rank}
      </span>

      {/* Text — i rosa accent (AI:s svar) */}
      <span
        style={{
          flex: 1,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)" as unknown as number,
          fontSize: "clamp(1.1rem, 1.9vw, 1.9rem)",
          color: "var(--accent)",
          lineHeight: 1.1,
          minWidth: 0,
        }}
      >
        {option.text}
      </span>

      {/* Procent — stort, bold */}
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)" as unknown as number,
          fontSize: "clamp(1.3rem, 2.4vw, 2.4rem)",
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {revealed ? `${Math.round(option.probability)}%` : "—"}
      </span>

      {/* Animerad procent-bar längst ner */}
      <motion.div
        initial={false}
        animate={{ scaleX: revealed ? option.probability / 100 : 0 }}
        transition={{
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
          delay: revealed ? 0.15 : 0,
        }}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: "5px",
          background: "var(--accent)",
          transformOrigin: "left center",
          opacity: isTop ? 1 : 0.7,
        }}
      />
    </motion.div>
  );
}

/** Pulserande "..." för att signalera "AI tänker / väntar". */
function ThinkingDots() {
  return (
    <span style={{ display: "inline-block", color: "var(--text-muted)" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
          style={{ display: "inline-block" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

export default SentencePredictor;
