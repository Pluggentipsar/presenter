"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * NegotiationStory — visualiserar klassrumskontraktet som en faktisk
 * förhandling mellan lärare och elev, en punkt åt gången.
 *
 * Vi ser scenen från ovan: lärare-figur till vänster, elev-figur till
 * höger. Mellan dem materialiseras varje förhandlingspunkt:
 *
 *  1. Båda figurerna tonar in.
 *  2. Klick → en ord-bubbla flyger ut från läraren med "vad säger du?"-fras
 *  3. Klick → ord-bubblor möts i mitten — en överenskommelse bildas
 *  4. Klick → överenskommelsen materialiseras som en post-it i mitten
 *  5. Repeat för 5 punkter
 *
 * MDX-format — varje listpunkt är en överenskommelse:
 *
 * ```mdx
 * <NegotiationStory chapter="§ Förhandlingen">
 * - Vad AI **får** vara · samtalspartner, granskare
 * - Vad AI **inte får** vara · färdig text för bedömning
 * - Hur AI redovisas · processlogg, citat
 * - Vad räknas som **fusk** · definieras tillsammans
 * - Vad är **konsekvensen** · samtal, inte bestraffning
 * </NegotiationStory>
 * ```
 *
 * Format per listpunkt: `Titel · beskrivning`
 */

interface NegotiationStoryProps {
  chapter?: string;
  intro?: string;
  /** Avslutande mening under hela scenen. */
  landing?: string;
  /** Etikett för vänster figur (default "Lärare"). */
  leftLabel?: string;
  /** Etikett för höger figur (default "Klassen"). */
  rightLabel?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  children?: ReactNode;
}

interface Agreement {
  title: string;
  description: string;
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

function parseAgreements(children: ReactNode): Agreement[] {
  const items: Agreement[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    items.push({
      title: parts[0]?.trim() ?? "",
      description: parts.slice(1).join(" · ").trim(),
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
  return items;
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
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function NegotiationStory({
  chapter,
  intro,
  landing,
  leftLabel = "Lärare",
  rightLabel = "Klassen",
  background,
  overlay = 0.75,
  accent = "var(--accent)",
  children,
}: NegotiationStoryProps) {
  const agreements = useMemo(() => parseAgreements(children), [children]);
  // Stegsystem: en step per agreement (visar dem en i taget)
  const totalSteps = Math.max(1, agreements.length);
  const activeStep = useSlideSteps(totalSteps);
  const visibleAgreements = agreements.slice(0, activeStep + 1);

  // Foto-bakgrund lägger en mörk scrim över hela slidens rot (på ALLA teman).
  // Text som ligger direkt på roten måste då vara fast ljus, annars blir den
  // osynlig mot scrimen på ljusa teman som dagsljus.
  const hasMedia = !!background && (background.startsWith("/") || background.startsWith("http"));
  const rootText = hasMedia ? "rgba(245,246,250,0.92)" : "var(--text)";
  const rootTextMuted = hasMedia ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

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
            color: rootTextMuted,
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

      <div
        className="relative flex h-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1.2rem, 2.5vh, 2rem)",
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
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              color: rootTextMuted,
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Scen: lärare | post-its | elev */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "center",
            minHeight: 0,
            position: "relative",
          }}
        >
          {/* Lärar-figur */}
          <Figure label={leftLabel} side="left" accent={accent} delay={0.5} />

          {/* Anslagstavla med post-its */}
          <div
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "clamp(0.5rem, 1vh, 1rem)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "clamp(20rem, 50vw, 44rem)",
                minHeight: "clamp(14rem, 40vh, 26rem)",
                background: withAlpha(accent, 0.04),
                border: `1px dashed ${withAlpha(accent, 0.33)}`,
                borderRadius: "0.5rem",
                padding: "clamp(1rem, 2vh, 1.6rem)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "clamp(0.6rem, 1.2vw, 1rem)",
                alignContent: "center",
                justifyContent: "center",
              }}
            >
              <AnimatePresence>
                {visibleAgreements.map((agreement, i) => (
                  <PostIt
                    key={i}
                    agreement={agreement}
                    index={i}
                    accent={accent}
                  />
                ))}
              </AnimatePresence>

              {/* Tom hint när inga post-its */}
              {visibleAgreements.length === 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: rootTextMuted,
                    textAlign: "center",
                    gridColumn: "1 / -1",
                  }}
                >
                  Klicka för att förhandla fram
                </div>
              ) : null}
            </div>
          </div>

          {/* Elev-figur */}
          <Figure label={rightLabel} side="right" accent={accent} delay={0.7} />
        </div>

        {/* Landing-mening */}
        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              color: rootText,
              textAlign: "center",
              borderTop: `1px solid ${withAlpha(accent, 0.2)}`,
              paddingTop: "clamp(0.7rem, 1.4vh, 1.2rem)",
              maxWidth: "44em",
              alignSelf: "center",
              lineHeight: 1.35,
            }}
          >
            <EditableText path="landing" value={landing}>
              {renderInline(landing, accent)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Progress-indikator */}
        {agreements.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: rootTextMuted,
              alignSelf: "center",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {agreements.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep
                      ? accent
                      : hasMedia
                        ? "rgba(245,246,250,0.25)"
                        : "rgba(0,0,0,0.18)",
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {agreements.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Figur (lärare/elev)
// ============================================================================

function Figure({
  label,
  side,
  accent,
  delay,
}: {
  label: string;
  side: "left" | "right";
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(0.6rem, 1.2vh, 1rem)",
        minWidth: "clamp(8rem, 12vw, 11rem)",
      }}
    >
      {/* Avatar — abstrakt cirkel + halvcirkel (huvud + axlar) */}
      <div
        style={{
          position: "relative",
          width: "clamp(4rem, 7vw, 6.5rem)",
          height: "clamp(5rem, 8vw, 7.5rem)",
        }}
      >
        {/* Halvcirkel = axlar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            height: "60%",
            borderRadius: "50% 50% 0 0",
            background: `linear-gradient(180deg, ${withAlpha(accent, 0.2)} 0%, ${withAlpha(accent, 0.07)} 100%)`,
            border: `1.5px solid ${withAlpha(accent, 0.53)}`,
          }}
        />
        {/* Cirkel = huvud */}
        <motion.div
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 3 + (side === "left" ? 0 : 1),
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60%",
            aspectRatio: 1,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${withAlpha(accent, 0.33)} 0%, ${withAlpha(accent, 0.13)} 100%)`,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 16px ${withAlpha(accent, 0.33)}`,
          }}
        />
      </div>

      {/* Etikett */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Post-it (en överenskommelse)
// ============================================================================

function PostIt({
  agreement,
  index,
  accent,
}: {
  agreement: Agreement;
  index: number;
  accent: string;
}) {
  // Liten random rotation för organisk känsla
  const rotation = ((index * 17) % 7) - 3; // -3° till +3°

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: -30, rotate: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: rotation }}
      exit={{ opacity: 0, scale: 0.6, y: 30 }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        type: "spring",
        stiffness: 180,
        damping: 18,
      }}
      style={{
        background: `linear-gradient(160deg, ${withAlpha(accent, 0.13)} 0%, var(--bg-surface) 100%)`,
        border: `1px solid ${withAlpha(accent, 0.4)}`,
        borderRadius: "0.3rem",
        padding: "clamp(0.7rem, 1.4vh, 1rem)",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 0 12px ${withAlpha(accent, 0.07)}`,
        minHeight: "5rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.55rem, 0.7vw, 0.7rem)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        § {index + 1}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
          color: "var(--text)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}
      >
        {renderInline(agreement.title, accent)}
      </div>
      {agreement.description ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
            color: "var(--text-muted)",
            lineHeight: 1.3,
            fontStyle: "italic",
          }}
        >
          {agreement.description}
        </div>
      ) : null}
    </motion.div>
  );
}
