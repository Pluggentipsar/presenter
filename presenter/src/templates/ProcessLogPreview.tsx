"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ProcessLogPreview — visualiserar SKILLNADEN mellan AI-redovisning och
 * tänkande-redovisning genom två mock-up loggar sida vid sida.
 *
 * Vänster (warning): "Vad det INTE är" — typisk AI-redovisning där eleven
 *                   listar vad hen bett ChatGPT om.
 * Höger (positive): "Vad det ÄR" — tänkande-redovisning där eleven visar
 *                   sitt egna tankearbete och hur AI påverkade det.
 *
 * Format per logg-rad: `type · tid · text`. Type är `ai` eller `thought`.
 * Separera vänster och höger med `---`.
 *
 * ```mdx
 * <ProcessLogPreview chapter="§ Processlogg">
 * - ai · 14:23 · Bad ChatGPT skriva analys
 * - ai · 14:25 · Kopierade in svaret
 * ---
 * - thought · 14:23 · Trodde först att Doktor Glas är cyniker
 * - ai · 14:25 · Frågade AI om hans relation till Helga
 * - thought · 14:30 · AI sa något jag inte tänkt på
 * - thought · 14:35 · Förändrade min ursprungstes
 * </ProcessLogPreview>
 * ```
 */

interface ProcessLogPreviewProps {
  chapter?: string;
  intro?: string;
  caveat?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  /** Färg för "INTE"-sidan. Default warning-gul. */
  notColor?: string;
  /** Färg för "ÄR"-sidan. Default positive-grön. */
  isColor?: string;
  /** Etiketter för kolumnerna. */
  leftLabel?: string;
  leftLabelMeta?: string;
  rightLabel?: string;
  rightLabelMeta?: string;
  children?: ReactNode;
}

interface LogRow {
  type: "ai" | "thought";
  time: string;
  text: string;
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

function parseSides(children: ReactNode): { left: LogRow[]; right: LogRow[] } {
  const sides: LogRow[][] = [[], []];
  let cursor = 0;

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 3) return;
    const typeRaw = parts[0].trim().toLowerCase();
    const type: "ai" | "thought" = typeRaw === "ai" ? "ai" : "thought";
    const time = parts[1].trim();
    const text = parts.slice(2).join(" · ").trim();
    sides[cursor].push({ type, time, text });
  };

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
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });

  return { left: sides[0], right: sides[1] };
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

export function ProcessLogPreview({
  chapter,
  intro,
  caveat,
  background,
  overlay = 0.7,
  accent = "var(--accent)",
  notColor = "#E8A845",
  isColor = "#7BC474",
  leftLabel = "Vad det INTE är",
  leftLabelMeta = "AI-redovisning",
  rightLabel = "Vad det ÄR",
  rightLabelMeta = "Tänkande-redovisning",
  children,
}: ProcessLogPreviewProps) {
  const { left, right } = parseSides(children);

  // När en foto-/url-bakgrund anges läggs en mörk scrim på (se
  // resolveBackground). Då ska text och paneler vara ljusa oavsett tema.
  // Utan foto-bg följer slidan temat (ljus på dagsljus, mörk på dark).
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
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
              fontSize: "var(--room-body, clamp(1.1rem, 1.6vw, 1.6rem))",
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

        {/* Två kolumner med loggar */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          <LogColumn
            label={leftLabel}
            meta={leftLabelMeta}
            color={notColor}
            rows={left}
            startDelay={0.6}
            onPhoto={hasPhotoBg}
          />
          <LogColumn
            label={rightLabel}
            meta={rightLabelMeta}
            color={isColor}
            rows={right}
            startDelay={1.2}
            onPhoto={hasPhotoBg}
          />
        </div>

        {/* Caveat-rad */}
        {caveat ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 2.5 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--room-body, clamp(0.95rem, 1.2vw, 1.2rem))",
              color: textMuted,
              borderTop: `1px solid ${withAlpha(accent, 0.2)}`,
              paddingTop: "clamp(0.6rem, 1.2vh, 1rem)",
              maxWidth: "60em",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="caveat" value={caveat}>
              {renderInline(caveat, accent)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Loggkolumn
// ============================================================================

function LogColumn({
  label,
  meta,
  color,
  rows,
  startDelay,
  onPhoto,
}: {
  label: string;
  meta: string;
  color: string;
  rows: LogRow[];
  startDelay: number;
  onPhoto: boolean;
}) {
  // På foto-bakgrund (scrim) hålls panelen mörk-glas och rubriken ljus.
  // Annars följer panelen temat: ljus yta + var(--text) på dagsljus,
  // mörk yta + var(--text) på nattglas.
  const labelColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  return (
    <div data-card=""
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.6vh, 1.2rem)",
        background: onPhoto ? "rgba(20,18,15,0.4)" : "var(--bg-elevated)",
        border: `1px solid ${withAlpha(color, 0.2)}`,
        borderRadius: "0.5rem",
        padding: "clamp(1.2rem, 2.5vh, 2rem) clamp(1rem, 2vw, 1.6rem)",
        boxShadow: `0 4px 20px rgba(0,0,0,0.18), inset 0 0 18px ${withAlpha(color, 0.07)}`,
        minHeight: 0,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: startDelay - 0.2 }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.3rem",
          paddingBottom: "clamp(0.5rem, 1vh, 0.8rem)",
          borderBottom: `1px solid ${withAlpha(color, 0.2)}`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.65rem, 0.78vw, 0.78rem))",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: `${withAlpha(color, 0.8)}`,
            fontWeight: 700,
          }}
        >
          {meta}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "var(--room-body, clamp(1.2rem, 1.7vw, 1.7rem))",
            color: labelColor,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {label}
        </div>
      </motion.div>

      {/* Loggrader */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.55rem, 1.1vh, 0.9rem)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {rows.map((row, i) => (
          <LogRowRender
            key={i}
            row={row}
            color={color}
            delay={startDelay + 0.2 + i * 0.25}
            onPhoto={onPhoto}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Enskild loggrad
// ============================================================================

function LogRowRender({
  row,
  color,
  delay,
  onPhoto,
}: {
  row: LogRow;
  color: string;
  delay: number;
  onPhoto: boolean;
}) {
  const isAI = row.type === "ai";
  // På foto-scrim hålls all text ljus; annars följer den temat.
  const mutedColor = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const primaryColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const typeColor = isAI ? mutedColor : color;
  const typeLabel = isAI ? "AI" : "JAG";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        gap: "0.7rem",
        alignItems: "baseline",
        paddingLeft: isAI ? "0.5rem" : 0,
        opacity: isAI ? 0.7 : 1,
      }}
    >
      {/* Type-badge */}
      <span
        data-tag={isAI ? "outline" : "solid"}
        style={{
          fontSize: "var(--room-caption, clamp(0.55rem, 0.7vw, 0.7rem))",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: typeColor,
          background: isAI ? "transparent" : `${typeColor}22`,
          padding: isAI ? 0 : "0.15rem 0.4rem",
          borderRadius: "0.2rem",
          border: isAI ? "none" : `1px solid ${typeColor}55`,
          fontFamily: "var(--font-mono)",
          minWidth: "2.5rem",
          textAlign: "center",
          alignSelf: "center",
        }}
      >
        {typeLabel}
      </span>

      {/* Tidsstämpel */}
      <span
        style={{
          fontSize: "var(--room-caption, clamp(0.65rem, 0.78vw, 0.78rem))",
          color: mutedColor,
          fontFamily: "var(--font-mono)",
        }}
      >
        {row.time}
      </span>

      {/* Text */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--room-body, clamp(0.9rem, 1.1vw, 1.1rem))",
          color: isAI ? mutedColor : primaryColor,
          lineHeight: 1.35,
          fontStyle: isAI ? "italic" : "normal",
        }}
      >
        {row.text}
      </span>
    </motion.div>
  );
}
