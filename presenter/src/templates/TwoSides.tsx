"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TwoSides — två-kolumn-jämförelse med tonalitet.
 *
 * Två varianter:
 *   - `list` → kompakta listor sida vid sida (forskningsläget, vad-vi-vet vs reservationer)
 *   - `study` → två stora citat-kort med huvudpåstående + caveat (studie A vs studie B)
 *
 * MDX-format: separera vänster och höger med `---` på egen rad.
 *
 * ```mdx
 * <TwoSides
 *   variant="list"
 *   chapter="§ Forskningsläget"
 *   leftLabel="Vad vi vet"
 *   leftTone="positive"
 *   rightLabel="Reservationerna"
 *   rightTone="warning"
 * >
 * - Mest positiva fynd hittills
 * - Bäst när **eleven driver**
 * ---
 * - Få studier på unga
 * - Forskningen hinner inte med
 * </TwoSides>
 * ```
 *
 * För `variant="study"` skriver du innehållet i fri text (inte lista). Den
 * första paragrafen blir huvudpåståendet (stort), efterföljande paragrafer
 * blir caveat (mindre, dämpat). Ange `leftMeta` / `rightMeta` för
 * lärosäte-tagg uppe på varje kort.
 */

type Tone = "positive" | "warning" | "danger" | "neutral";

interface TwoSidesProps {
  chapter?: string;
  /** Liten intro-rad ovanför kolumnerna. */
  intro?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  variant?: "list" | "study";

  leftLabel: string;
  leftTone?: Tone;
  /** För variant="study": liten meta-tagg ovanför kortet (lärosäte/år). */
  leftMeta?: string;

  rightLabel: string;
  rightTone?: Tone;
  rightMeta?: string;

  /** Mittseparator-text (t.ex. "vs" eller "&"). Default ingen för list, "&" för study. */
  separator?: string;

  /** Aktivera stegvis reveal — vänster sida först, sen höger. Default true. */
  stepped?: boolean;

  children?: ReactNode;
}

// ============================================================================
// Tone → färg
// ============================================================================

function toneColors(tone: Tone, accent: string) {
  switch (tone) {
    case "positive":
      return {
        label: "#7BC474",
        accent: "#7BC474",
        marker: "✓",
        glow: "rgba(123, 196, 116, 0.18)",
      };
    case "warning":
      return {
        label: "#E8A845",
        accent: "#E8A845",
        marker: "!",
        glow: "rgba(232, 168, 69, 0.18)",
      };
    case "danger":
      return {
        label: "#E84D4D",
        accent: "#E84D4D",
        marker: "×",
        glow: "rgba(232, 77, 77, 0.18)",
      };
    default:
      return {
        label: accent,
        accent,
        marker: "·",
        glow: `${withAlpha(accent, 0.16)}`,
      };
  }
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

interface SideData {
  /** Listpunkter (för variant=list) */
  items: string[];
  /** Paragrafer (för variant=study) */
  paragraphs: string[];
}

function parseSides(children: ReactNode): { left: SideData; right: SideData } {
  const sides: SideData[] = [{ items: [], paragraphs: [] }, { items: [], paragraphs: [] }];
  let cursor = 0;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;

    if (t === "hr") {
      cursor = Math.min(1, cursor + 1);
      return;
    }
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) sides[cursor].items.push(text);
        }
      });
      return;
    }
    if (t === "p") {
      const text = extractText(el.props.children).trim();
      if (text) sides[cursor].paragraphs.push(text);
      return;
    }
    if (t === "li") {
      const text = extractText(el.props.children).trim();
      if (text) sides[cursor].items.push(text);
      return;
    }
  });

  return { left: sides[0], right: sides[1] };
}

// ============================================================================
// Inline-markup-renderare
// ============================================================================

function renderInline(text: string, accentColor: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(
        <strong
          key={key++}
          style={{ color: accentColor, fontWeight: 700 }}
        >
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
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function TwoSides({
  chapter,
  intro,
  background,
  overlay = 0.62,
  accent = "var(--accent)",
  variant = "list",
  leftLabel,
  leftTone = "positive",
  leftMeta,
  rightLabel,
  rightTone = "warning",
  rightMeta,
  separator,
  stepped = true,
  children,
}: TwoSidesProps) {
  const { left, right } = parseSides(children);
  const leftColors = toneColors(leftTone, accent);
  const rightColors = toneColors(rightTone, accent);
  // Bakgrund med fotoscrim → texten ligger på mörk yta oavsett tema, så
  // primärtext måste vara fast ljus (inte var(--text) som blir mörk på ljust tema).
  const onPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));
  const textPrimary = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const middle = separator ?? (variant === "study" ? "&" : "");
  // Stegsystem: 2 steps — vänster först, sen båda
  const totalSteps = stepped ? 2 : 1;
  const activeStep = useSlideSteps(totalSteps);
  const leftVisible = true; // alltid synlig
  const rightVisible = stepped ? activeStep >= 1 : true;

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
            zIndex: 3,
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
          zIndex: 3,
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
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              color: textMuted,
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Två kolumner + middle separator */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: middle ? "1fr auto 1fr" : "1fr 1fr",
            gap: middle ? "clamp(1rem, 2.5vw, 2.5rem)" : "clamp(2rem, 4vw, 4rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <SideColumn
            label={leftLabel}
            meta={leftMeta}
            colors={leftColors}
            data={left}
            variant={variant}
            delay={0.5}
            from="left"
            isVisible={leftVisible}
            stepped={stepped}
            textPrimary={textPrimary}
            textMuted={textMuted}
            onPhoto={onPhoto}
          />

          {middle ? (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{
                opacity: stepped && !rightVisible ? 0.15 : 1,
                scaleY: 1,
              }}
              transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "3rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  fontSize: "clamp(2rem, 4vw, 4rem)",
                  color: textMuted,
                  opacity: 0.7,
                  fontStyle: "italic",
                }}
              >
                {middle}
              </div>
            </motion.div>
          ) : null}

          <SideColumn
            label={rightLabel}
            meta={rightMeta}
            colors={rightColors}
            data={right}
            variant={variant}
            delay={stepped ? 0.2 : 0.7}
            from="right"
            isVisible={rightVisible}
            stepped={stepped}
            textPrimary={textPrimary}
            textMuted={textMuted}
            onPhoto={onPhoto}
          />
        </div>

        {/* Progress-indikator när stegvis */}
        {stepped ? (
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
              marginTop: "clamp(0.4rem, 0.8vh, 0.7rem)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {[0, 1].map((i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep ? accent : textMuted,
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / 2
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Kolumn
// ============================================================================

interface SideColumnProps {
  label: string;
  meta?: string;
  colors: ReturnType<typeof toneColors>;
  data: SideData;
  variant: "list" | "study";
  delay: number;
  from: "left" | "right";
  isVisible: boolean;
  stepped: boolean;
  textPrimary: string;
  textMuted: string;
  onPhoto: boolean;
}

function SideColumn({ label, meta, colors, data, variant, delay, from, isVisible, stepped, textPrimary, textMuted, onPhoto }: SideColumnProps) {
  const dimmed = stepped && !isVisible;
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "left" ? -16 : 16 }}
      animate={{ opacity: dimmed ? 0.12 : 1, x: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: variant === "study" ? "clamp(1rem, 2vh, 1.6rem)" : "clamp(0.7rem, 1.4vh, 1.1rem)",
        padding: variant === "study" ? "clamp(1.5rem, 3vh, 2.4rem)" : "0",
        background: variant === "study"
          ? `linear-gradient(140deg, ${colors.glow} 0%, ${onPhoto ? "rgba(20,18,15,0.4)" : "var(--bg-elevated)"} 100%)`
          : "transparent",
        borderLeft: variant === "study" ? `1px solid ${colors.label}55` : "none",
        borderRadius: variant === "study" ? "0.4rem" : 0,
        boxShadow: variant === "study"
          ? `0 8px 40px rgba(0,0,0,${onPhoto ? 0.35 : 0.18}), inset 0 0 0 1px ${colors.label}22`
          : undefined,
        minHeight: 0,
      }}
    >
      {/* Meta-tagg (variant=study) */}
      {meta ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: textMuted,
          }}
        >
          {meta}
        </div>
      ) : null}

      {/* Label */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: variant === "study"
            ? "clamp(1.4rem, 2.2vw, 2.2rem)"
            : "clamp(1.3rem, 2.2vw, 2rem)",
          color: colors.label,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: variant === "list" ? "clamp(0.4rem, 1vh, 0.8rem)" : 0,
        }}
      >
        {label}
      </div>

      {/* Innehåll */}
      {variant === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.6rem, 1.2vh, 1rem)" }}>
          {data.items.map((item, i) => (
            <ListRow
              key={i}
              text={item}
              colors={colors}
              delay={delay + 0.4 + i * 0.15}
              textPrimary={textPrimary}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vh, 1.2rem)", flex: 1 }}>
          {data.paragraphs.map((para, i) => (
            <StudyParagraph
              key={i}
              text={para}
              colors={colors}
              delay={delay + 0.5 + i * 0.3}
              isHero={i === 0}
              textPrimary={textPrimary}
              textMuted={textMuted}
              onPhoto={onPhoto}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// List-rad (variant=list)
// ============================================================================

function ListRow({
  text,
  colors,
  delay,
  textPrimary,
}: {
  text: string;
  colors: ReturnType<typeof toneColors>;
  delay: number;
  textPrimary: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "0.9rem",
        alignItems: "baseline",
      }}
    >
      <div
        aria-hidden
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(1rem, 1.4vw, 1.3rem)",
          fontWeight: 700,
          color: colors.accent,
          width: "1.5rem",
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {colors.marker}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
          color: textPrimary,
          lineHeight: 1.35,
        }}
      >
        {renderInline(text, colors.accent)}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Study-paragraf (variant=study)
// ============================================================================

function StudyParagraph({
  text,
  colors,
  delay,
  isHero,
  textPrimary,
  textMuted,
  onPhoto,
}: {
  text: string;
  colors: ReturnType<typeof toneColors>;
  delay: number;
  isHero: boolean;
  textPrimary: string;
  textMuted: string;
  onPhoto: boolean;
}) {
  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
          color: textPrimary,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          textShadow: `0 4px 20px rgba(0,0,0,${onPhoto ? 0.5 : 0.15})`,
        }}
      >
        {renderInline(text, colors.accent)}
      </motion.div>
    );
  }
  // Caveat
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "0.6rem",
        alignItems: "baseline",
        marginTop: "auto",
        paddingTop: "clamp(0.6rem, 1.2vh, 1rem)",
        borderTop: `1px solid ${onPhoto ? "rgba(245,246,250,0.18)" : "rgba(0,0,0,0.12)"}`,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.55rem, 0.7vw, 0.7rem)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: textMuted,
          lineHeight: 1.4,
        }}
      >
        Caveat
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.8rem, 1vw, 1rem)",
          color: textMuted,
          lineHeight: 1.4,
          fontStyle: "italic",
        }}
      >
        {renderInline(text, colors.accent)}
      </div>
    </motion.div>
  );
}
