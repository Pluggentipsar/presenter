"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * SAMRSpectrum — visualiserar SAMR-modellen som ett HORISONTELLT spektrum,
 * inte som en hierarkisk stege.
 *
 * Pedagogisk princip: alla fyra positioner är giltiga val. Substitution är
 * inte "lägre" än Redefinition — det handlar om medvetet val. Designen
 * undviker:
 *   - Vertikal stege-känsla
 *   - Färg-toner som implicerar värdering (alla får samma accent)
 *   - "Pilar uppåt" mot R
 *
 * Layout per station: stor bokstav i cirkel + modellnamn + exempel-kort.
 * En tunn horisontell linje binder samman dem som ett spektrum (inte stege).
 *
 * MDX-format:
 * ```mdx
 * <SAMRSpectrum
 *   chapter="§ SAMR med AI"
 *   intro="Samma uppgift — fyra olika designval."
 *   task="Att skriva en text om miljöpolitik"
 * >
 * - **S** · Substitution · AI rättar stavning
 * - **A** · Augmentation · AI ger kommentarer + uppläsning
 * - **M** · Modification · Eleverna har dialog där AI motargumenterar
 * - **R** · Redefinition · Eleverna skapar interaktivt klimatmuseum
 * </SAMRSpectrum>
 * ```
 *
 * Format per listpunkt: `**Bokstav** · Namn · Exempel`
 * Lämna exempel tomt för "definitions-läge" (slide 30 typ).
 */

interface SAMRSpectrumProps {
  chapter?: string;
  intro?: string;
  /** Uppgiften som bedöms — visas som en tagg ovanför skalan. */
  task?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  /** Aktivera stegvis reveal — varje klick visar en station åt gången. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface Position {
  letter: string;
  name: string;
  example: string;
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
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function parsePositions(children: ReactNode): Position[] {
  const positions: Position[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const letterMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const letter = letterMatch ? letterMatch[1].trim() : parts[0].trim();
    const name = parts[1]?.trim() ?? "";
    const example = parts.slice(2).join(" · ").trim();
    positions.push({ letter, name, example });
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
  return positions;
}

function renderInline(text: string, accentColor: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: accentColor, fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {chunk.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function SAMRSpectrum({
  chapter,
  intro,
  task,
  background,
  overlay = 0.7,
  accent = "var(--accent)",
  stepped = true,
  children,
}: SAMRSpectrumProps) {
  const positions = parsePositions(children);
  const hasExamples = positions.some((p) => p.example.length > 0);
  // Stegsystem: en step per station
  const totalSteps = stepped ? Math.max(1, positions.length) : 1;
  const activeStep = useSlideSteps(totalSteps);
  const visibleCount = stepped ? activeStep + 1 : positions.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
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
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Innehåll */}
      <div
        className="relative flex h-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Intro */}
        {intro ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.2rem, 1.7vw, 1.7rem)",
              color: "var(--text)",
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Task — visas som en sträv tagg */}
        {task ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.7rem",
              alignSelf: "flex-start",
              padding: "0.4rem 1rem 0.4rem 0",
              borderLeft: `2px solid ${accent}`,
              paddingLeft: "0.9rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
              }}
            >
              Uppgift
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text)",
                fontStyle: "italic",
              }}
            >
              {task}
            </span>
          </motion.div>
        ) : null}

        {/* Spektrum: 4 stationer + linje */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          <SpectrumScale
            positions={positions}
            accent={accent}
            hasExamples={hasExamples}
            startDelay={0.9}
            visibleCount={visibleCount}
            stepped={stepped}
          />
        </div>

        {/* Progress-indikator när stegvis */}
        {stepped && positions.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {positions.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep ? accent : withAlpha(accent, 0.25),
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {positions.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Den horisontella skalan med 4 stationer
// ============================================================================

function SpectrumScale({
  positions,
  accent,
  hasExamples,
  startDelay,
  visibleCount,
  stepped,
}: {
  positions: Position[];
  accent: string;
  hasExamples: boolean;
  startDelay: number;
  visibleCount: number;
  stepped: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${positions.length}, 1fr)`,
        gap: "clamp(0.8rem, 2vw, 2rem)",
        alignItems: "stretch",
        paddingBlock: "clamp(1rem, 2vh, 2rem)",
      }}
    >
      {/* Horisontell linje genom alla stationer (i höjd med cirklarna) */}
      <SpectrumLine accent={accent} delay={startDelay} hasExamples={hasExamples} />

      {/* Spektrum-etiketter under linjen */}
      <SpectrumLabels accent={accent} delay={startDelay + 0.2} />

      {positions.map((pos, i) => (
        <SpectrumStation
          key={i}
          position={pos}
          accent={accent}
          delay={stepped ? 0.2 : startDelay + 0.4 + i * 0.35}
          hasExamples={hasExamples}
          isVisible={i < visibleCount}
          stepped={stepped}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Linjen — visualiserar att SAMR är ett spektrum, inte en stege
// ============================================================================

function SpectrumLine({
  accent,
  delay,
  hasExamples,
}: {
  accent: string;
  delay: number;
  hasExamples: boolean;
}) {
  // Linjen ligger i höjd med stationscirklarna
  const top = hasExamples ? "clamp(1.6rem, 3vh, 2.5rem)" : "50%";

  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        top,
        left: "8%",
        right: "8%",
        height: "2px",
        transformOrigin: "left center",
        zIndex: 0,
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(to right, transparent, ${withAlpha(accent, 0.4)} 8%, ${withAlpha(accent, 0.53)} 50%, ${withAlpha(accent, 0.4)} 92%, transparent)`,
        }}
      />
    </motion.div>
  );
}

// ============================================================================
// Spektrum-etiketter ("ersätter" → "skapar nytt")
// ============================================================================

function SpectrumLabels({ accent, delay }: { accent: string; delay: number }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 0.55, y: 0 }}
        transition={{ duration: 0.7, delay }}
        style={{
          position: "absolute",
          bottom: 0,
          left: "0%",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: accent,
          zIndex: 1,
        }}
      >
        ← Ersätter
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 0.55, y: 0 }}
        transition={{ duration: 0.7, delay }}
        style={{
          position: "absolute",
          bottom: 0,
          right: "0%",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: accent,
          zIndex: 1,
          textAlign: "right",
        }}
      >
        Skapar nytt →
      </motion.div>
    </>
  );
}

// ============================================================================
// En enskild station
// ============================================================================

function SpectrumStation({
  position,
  accent,
  delay,
  hasExamples,
  isVisible,
  stepped,
}: {
  position: Position;
  accent: string;
  delay: number;
  hasExamples: boolean;
  isVisible: boolean;
  stepped: boolean;
}) {
  const dimmed = stepped && !isVisible;
  return (
    <motion.div
      animate={{ opacity: dimmed ? 0.18 : 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Letter-cirkel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          width: "clamp(3.2rem, 5vw, 5rem)",
          height: "clamp(3.2rem, 5vw, 5rem)",
          borderRadius: "50%",
          background: "var(--bg-elevated)",
          border: `2px solid ${accent}`,
          boxShadow: `0 0 30px ${withAlpha(accent, 0.4)}, inset 0 0 12px ${withAlpha(accent, 0.2)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pulserande halo */}
        <motion.div
          aria-hidden
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 3 + (position.letter.charCodeAt(0) % 5) * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 0.5,
          }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `1px solid ${accent}`,
            pointerEvents: "none",
          }}
        />

        {/* Bokstav */}
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
            color: accent,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {position.letter}
        </span>
      </motion.div>

      {/* Modellnamn */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.2 }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
          color: "var(--text)",
          textAlign: "center",
          letterSpacing: "-0.015em",
          lineHeight: 1.1,
        }}
      >
        {position.name}
      </motion.div>

      {/* Exempel-kort (valfri) */}
      {hasExamples && position.example ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: delay + 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "var(--bg-elevated)",
            border: `1px solid ${withAlpha(accent, 0.2)}`,
            borderRadius: "0.4rem",
            padding: "clamp(0.8rem, 1.4vh, 1.2rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
            color: "var(--text)",
            lineHeight: 1.35,
            textAlign: "left",
            width: "100%",
            flex: 1,
            boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 0 20px ${withAlpha(accent, 0.07)}`,
          }}
        >
          {renderInline(position.example, accent)}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
