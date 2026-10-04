"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DualAffordance — visualiserar att samma verktyg har två affordanser samtidigt.
 *
 * Varje rad visar ett verktyg i mitten med en vertikal "splittnings-linje" som
 * delar det i två potentialer: vad det inbjuder till för LÄRANDE (vänster) vs
 * för GENVÄG (höger). Linsen är att SE båda — inte att välja sida.
 *
 * MDX-format — varje listpunkt är ett verktyg:
 *
 * ```mdx
 * <DualAffordance
 *   chapter="§ AI-verktygens dubbla affordans"
 *   intro="Varje AI-verktyg bjuder in till två saker samtidigt."
 *   positiveLabel="Inbjuder till lärande"
 *   negativeLabel="Inbjuder till genväg"
 * >
 * - **Chattbot** · dialog & utforskande tänkande / snabba svar utan eftertanke
 * - **Bildgenerator** · visuell idéutforskning / färdig bild på knapptryck
 * </DualAffordance>
 * ```
 *
 * Format per listpunkt: `**Verktyg** · positiv affordans / negativ affordans`
 * Vi splittar på " / " för att separera de två affordanserna.
 */

interface DualAffordanceProps {
  chapter?: string;
  intro?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  /** Färg för positiv kolumn. Default success-grön. */
  positiveColor?: string;
  /** Färg för negativ kolumn. Default warning-gul. */
  negativeColor?: string;
  /** Aktivera stegvis reveal — varje klick visar ett verktyg åt gången. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface ToolRow {
  tool: string;
  positive: string;
  negative: string;
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

function parseTools(children: ReactNode): ToolRow[] {
  const tools: ToolRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    // Splitta på · för att få (tool, affordances)
    const dotParts = raw.split(/\s*·\s*/);
    if (dotParts.length < 2) return;
    const toolMatch = dotParts[0].match(/^\*\*(.+?)\*\*$/);
    const tool = toolMatch ? toolMatch[1] : dotParts[0].trim();
    // Joina rest med · ifall affordans-texten innehåller punkter
    const affordanceText = dotParts.slice(1).join(" · ");
    // Splitta affordans-texten på " / "
    const slashParts = affordanceText.split(/\s*\/\s*/);
    const positive = slashParts[0]?.trim() ?? "";
    const negative = slashParts.slice(1).join(" / ").trim();
    tools.push({ tool, positive, negative });
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
  return tools;
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

export function DualAffordance({
  chapter,
  intro,
  background,
  overlay = 0.65,
  accent = "var(--accent)",
  positiveLabel = "Inbjuder till lärande",
  negativeLabel = "Inbjuder till genväg",
  positiveColor = "#7BC474",
  negativeColor = "#E8A845",
  stepped = true,
  children,
}: DualAffordanceProps) {
  const tools = parseTools(children);
  // Stegsystem: en step per verktyg
  const totalSteps = stepped ? Math.max(1, tools.length) : 1;
  const activeStep = useSlideSteps(totalSteps);
  const visibleCount = stepped ? activeStep + 1 : tools.length;

  // När en foto-bakgrund passas läggs en mörk scrim på (för läsbarhet mot
  // bilden). Då måste texten alltid vara ljus, oavsett tema. Utan foto följer
  // texten temat (mörk på ljust tema, ljus på mörkt).
  const hasPhoto = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const textColor = hasPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

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
            color: mutedColor,
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
              color: mutedColor,
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Header rad */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr clamp(8rem, 14vw, 12rem) 1fr",
            gap: "clamp(1rem, 2vw, 2rem)",
            alignItems: "center",
            paddingBottom: "clamp(0.6rem, 1.2vh, 1rem)",
            borderBottom: `1px solid ${withAlpha(accent, 0.25)}`,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: positiveColor,
              textAlign: "right",
            }}
          >
            ← {positiveLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: mutedColor,
              textAlign: "center",
            }}
          >
            Verktyg
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: negativeColor,
              textAlign: "left",
            }}
          >
            {negativeLabel} →
          </div>
        </motion.div>

        {/* Verktygs-rader */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            gap: "clamp(1.5rem, 3.5vh, 3rem)",
            paddingBlock: "clamp(0.8rem, 1.5vh, 1.4rem)",
            minHeight: 0,
          }}
        >
          {tools.map((tool, i) => (
            <ToolRow
              key={i}
              tool={tool}
              positiveColor={positiveColor}
              negativeColor={negativeColor}
              accent={accent}
              textColor={textColor}
              delay={stepped ? 0.2 : 1.0 + i * 0.5}
              isVisible={i < visibleCount}
              stepped={stepped}
            />
          ))}
        </div>

        {/* Progress-indikator när stegvis */}
        {stepped && tools.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: mutedColor,
              marginTop: "clamp(0.4rem, 0.8vh, 0.7rem)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {tools.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep ? accent : withAlpha(accent, 0.22),
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {tools.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Verktygsrad
// ============================================================================

function ToolRow({
  tool,
  positiveColor,
  negativeColor,
  accent,
  textColor,
  delay,
  isVisible,
  stepped,
}: {
  tool: ToolRow;
  positiveColor: string;
  negativeColor: string;
  accent: string;
  textColor: string;
  delay: number;
  isVisible: boolean;
  stepped: boolean;
}) {
  const dimmed = stepped && !isVisible;
  return (
    <motion.div
      animate={{ opacity: dimmed ? 0.12 : 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr clamp(8rem, 14vw, 12rem) 1fr",
        gap: "clamp(1rem, 2vw, 2rem)",
        alignItems: "center",
        minHeight: "clamp(3rem, 6vh, 4.5rem)",
      }}
    >
      {/* Positiv affordans (vänster) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: delay + 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
          color: textColor,
          textAlign: "right",
          lineHeight: 1.3,
        }}
      >
        <span style={{ color: positiveColor, marginRight: "0.4rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>+</span>
        {renderInline(tool.positive, positiveColor)}
      </motion.div>

      {/* Verktyg + splittnings-linje (mitten) */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(0.5rem, 1vh, 0.8rem) 0",
        }}
      >
        {/* Vertikal splittnings-linje */}
        <motion.div
          aria-hidden
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 0.6 }}
          transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: "1px",
            background: `linear-gradient(to bottom, transparent, ${withAlpha(accent, 0.6)}, transparent)`,
            transformOrigin: "center",
          }}
        />

        {/* Verktygsnamn */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)",
            color: "var(--text)",
            letterSpacing: "-0.015em",
            textAlign: "center",
            background: "var(--bg-elevated)",
            padding: "0.4rem 0.8rem",
            borderRadius: "0.3rem",
            border: `1px solid ${withAlpha(accent, 0.33)}`,
            boxShadow: `0 0 20px ${withAlpha(accent, 0.2)}`,
            zIndex: 1,
          }}
        >
          {tool.tool}
        </motion.div>
      </div>

      {/* Negativ affordans (höger) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: delay + 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
          color: textColor,
          textAlign: "left",
          lineHeight: 1.3,
        }}
      >
        <span style={{ color: negativeColor, marginRight: "0.4rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>−</span>
        {renderInline(tool.negative, negativeColor)}
      </motion.div>
    </motion.div>
  );
}
