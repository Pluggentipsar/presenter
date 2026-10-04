"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TimeHorizons — visualiserar tre framtida tidshorisonter med konkreta
 * handlingsförslag.
 *
 * Designad för "vad gör du imorgon"-typ av sektioner. Skiljer sig från
 * BeforeAfterPhases genom att vara FRAMÅTBLICKANDE (inte process). Kortare
 * texter, mer luft, kraftfullare typografi i tidsetiketterna.
 *
 * Format per listpunkt: `**Tidsetikett** · Scope · Action 1 · Action 2 · ...`
 *
 * ```mdx
 * <TimeHorizons chapter="§ Tre vägar framåt">
 * - **Imorgon** · Lektionen · Designa en uppgift med en lins
 * - **I månaden** · Klassen · Förhandla klassrumskontraktet
 * - **I terminen** · Kursen · Bygg in processloggar
 * </TimeHorizons>
 * ```
 */

interface TimeHorizonsProps {
  chapter?: string;
  intro?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  /** Aktivera stegvis reveal — varje klick visar en till horisont. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface Horizon {
  time: string;
  scope: string;
  actions: string[];
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

function parseHorizons(children: ReactNode): Horizon[] {
  const horizons: Horizon[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const timeMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const time = timeMatch ? timeMatch[1].trim() : parts[0].trim();
    const scope = parts[1]?.trim() ?? "";
    const actions = parts.slice(2).map((s) => s.trim()).filter(Boolean);
    horizons.push({ time, scope, actions });
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
  return horizons;
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

export function TimeHorizons({
  chapter,
  intro,
  background,
  overlay = 0.7,
  accent = "var(--accent)",
  stepped = true,
  children,
}: TimeHorizonsProps) {
  const horizons = parseHorizons(children);
  // Stegsystem: en step per horisont (visar dem en i taget)
  const totalSteps = stepped ? Math.max(1, horizons.length) : 1;
  const activeStep = useSlideSteps(totalSteps);
  const visibleCount = stepped ? activeStep + 1 : horizons.length;

  // När en foto-/custom-bakgrund läggs på får slide:n en mörk scrim (se
  // resolveBackground). Då måste texten vara fast ljus oavsett tema. Utan
  // foto-bakgrund följer texten temat (mörk på ljust, ljus på mörkt).
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const textPrimary = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

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
            color: textMuted,
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
          gap: "clamp(2rem, 4vh, 3rem)",
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
              color: textPrimary,
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Horisonter i grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${horizons.length}, 1fr)`,
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* Framåtpekande pil under hela griden */}
          <ForwardArrow accent={accent} delay={0.5 + horizons.length * 0.4} />

          {horizons.map((horizon, i) => (
            <HorizonCard
              key={i}
              horizon={horizon}
              accent={accent}
              delay={stepped ? 0.2 : 0.5 + i * 0.4}
              progressFraction={(i + 1) / horizons.length}
              isVisible={i < visibleCount}
              stepped={stepped}
              hasPhotoBg={hasPhotoBg}
              textPrimary={textPrimary}
            />
          ))}
        </div>

        {/* Progress-indikator när stegvis */}
        {stepped && horizons.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: textMuted,
              marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {horizons.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background:
                      i <= activeStep
                        ? accent
                        : hasPhotoBg
                          ? "rgba(245,246,250,0.3)"
                          : "rgba(0,0,0,0.14)",
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {horizons.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Horisontkort
// ============================================================================

function HorizonCard({
  horizon,
  accent,
  delay,
  progressFraction,
  isVisible,
  stepped,
  hasPhotoBg,
  textPrimary,
}: {
  horizon: Horizon;
  accent: string;
  delay: number;
  progressFraction: number;
  isVisible: boolean;
  stepped: boolean;
  hasPhotoBg: boolean;
  textPrimary: string;
}) {
  // Mer dramatik desto längre fram i tiden
  const intensity = 0.45 + progressFraction * 0.4;
  // I stepped-läge: dim ner kort som ännu inte är "aktiva"
  const targetOpacity = stepped && !isVisible ? 0.12 : 1;
  const targetY = stepped && !isVisible ? 0 : 0;
  // Kortets bottenton: mörk scrim över foto, annars temats lyfta yta.
  // Texten är mörk på ljust tema → behöver inte tung svart text-skugga där.
  const cardBase = hasPhotoBg ? "rgba(20,18,15,0.4)" : "var(--bg-elevated)";
  const timeTextShadow = hasPhotoBg
    ? `0 4px 20px rgba(0,0,0,0.5), 0 0 30px ${withAlpha(accent, 0.2)}`
    : `0 0 30px ${withAlpha(accent, 0.18)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: targetOpacity, y: targetY }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
        padding: "clamp(1.4rem, 2.5vh, 2.2rem) clamp(1.2rem, 2vw, 1.8rem)",
        background: `linear-gradient(160deg, ${accent}${Math.round(intensity * 28).toString(16).padStart(2, "0")} 0%, ${cardBase} 100%)`,
        border: `1px solid ${accent}${Math.round(intensity * 100).toString(16).padStart(2, "0")}`,
        borderRadius: "0.5rem",
        boxShadow: `0 8px 30px rgba(0,0,0,0.18), inset 0 0 18px ${withAlpha(accent, 0.07)}`,
        minHeight: 0,
        position: "relative",
      }}
    >
      {/* Stor tidsetikett */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: delay + 0.15 }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(1.8rem, 3vw, 3rem)",
          color: textPrimary,
          letterSpacing: "-0.03em",
          lineHeight: 0.95,
          textShadow: timeTextShadow,
        }}
      >
        {horizon.time}
      </motion.div>

      {/* Scope */}
      {horizon.scope ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: accent,
            paddingBottom: "clamp(0.5rem, 1vh, 0.8rem)",
            borderBottom: `1px solid ${withAlpha(accent, 0.2)}`,
          }}
        >
          {horizon.scope}
        </div>
      ) : null}

      {/* Konkreta handlingar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.5rem, 1.1vh, 0.9rem)",
        }}
      >
        {horizon.actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.3 + i * 0.12 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
              color: textPrimary,
              lineHeight: 1.35,
              display: "flex",
              gap: "0.6rem",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                color: accent,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85em",
              }}
            >
              →
            </span>
            <span>{action}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Framåtpekande pil under griden
// ============================================================================

function ForwardArrow({ accent, delay }: { accent: string; delay: number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      style={{
        position: "absolute",
        bottom: "calc(-1 * clamp(2rem, 4vh, 3rem))",
        left: "8%",
        right: "8%",
        height: "1px",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          height: "1px",
          background: `linear-gradient(to right, transparent 0%, ${withAlpha(accent, 0.33)} 30%, ${withAlpha(accent, 0.53)} 90%, ${accent} 100%)`,
          transformOrigin: "left",
          position: "relative",
        }}
      >
        {/* Pilspets längst till höger */}
        <div
          style={{
            position: "absolute",
            right: "-2px",
            top: "-5px",
            width: 0,
            height: 0,
            borderLeft: `8px solid ${accent}`,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
