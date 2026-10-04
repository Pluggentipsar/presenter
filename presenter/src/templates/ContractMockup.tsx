"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ContractMockup — visar ett klassrumskontrakt som ett autentiskt dokument.
 *
 * Stiliserat som ett officiellt dokument med titel, undertitel, numrerade
 * artiklar (§ 1, § 2, ...) och signaturlinjer i botten. Designad för att
 * konkretisera "klassrumskontraktet" som ett verkligt dokument elever och
 * lärare kan skriva under tillsammans.
 *
 * Animation: dokument-kortet scale-fader in, sen tänds artiklarna i sekvens,
 * sist dyker signaturraden upp.
 *
 * MDX-format: varje listpunkt blir en artikel.
 *
 * ```mdx
 * <ContractMockup
 *   chapter="§ Klassrumskontrakt"
 *   title="KLASSRUMSKONTRAKT"
 *   subtitle="Svenska 2 · 2026/27"
 *   leftSignature="Lärare"
 *   rightSignature="Klassen"
 *   date="2026-08-22"
 * >
 * - AI är välkommet i klassrummet — som samtalspartner...
 * - AI får inte skriva slutprodukten åt dig...
 * - All AI-användning redovisas i processloggen...
 * - Fusk är att lämna in något du inte kan försvara...
 * - Om du är osäker — fråga.
 * </ContractMockup>
 * ```
 */

interface ContractMockupProps {
  chapter?: string;
  /** Stor titel överst på dokumentet. Default "KLASSRUMSKONTRAKT". */
  title?: string;
  /** Undertitel (kurs + år). */
  subtitle?: string;
  /** Etikett för vänster signaturlinje. Default "Lärare". */
  leftSignature?: string;
  /** Etikett för höger signaturlinje. Default "Klassen". */
  rightSignature?: string;
  /** Datum att visa ovanför signaturer. */
  date?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  children?: ReactNode;
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

function parseArticles(children: ReactNode): string[] {
  const articles: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) articles.push(raw);
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
  return articles;
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

export function ContractMockup({
  chapter,
  title = "KLASSRUMSKONTRAKT",
  subtitle,
  leftSignature = "Lärare",
  rightSignature = "Klassen",
  date,
  background,
  overlay = 0.78,
  accent = "var(--accent)",
  children,
}: ContractMockupProps) {
  const articles = parseArticles(children);

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

      {/* Dokument-kort centrerat */}
      <div
        className="relative flex h-full items-center justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          zIndex: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "100%",
            maxWidth: "var(--room-document-width, 60rem)",
            background: "var(--bg-surface)",
            border: `1px solid ${withAlpha(accent, 0.33)}`,
            borderRadius: "0.4rem",
            padding: "clamp(2rem, 4vh, 3.5rem) clamp(2rem, 4vw, 4rem)",
            boxShadow: `0 20px 80px rgba(0,0,0,0.28), 0 0 0 1px ${withAlpha(accent, 0.13)}, inset 0 0 30px ${withAlpha(accent, 0.03)}`,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.6rem)",
            position: "relative",
          }}
        >
          {/* Hörnornament */}
          <Ornament position="top-left" accent={accent} />
          <Ornament position="top-right" accent={accent} />
          <Ornament position="bottom-left" accent={accent} />
          <Ornament position="bottom-right" accent={accent} />

          {/* Header */}
          <div
            style={{
              textAlign: "center",
              paddingBottom: "clamp(0.6rem, 1.2vh, 1rem)",
              borderBottom: `1px solid ${withAlpha(accent, 0.2)}`,
            }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(1.6rem, 2.8vw, 2.8rem)",
                letterSpacing: "0.18em",
                color: "var(--text)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </motion.h1>
            {subtitle ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "var(--room-body, clamp(0.9rem, 1.2vw, 1.2rem))",
                  color: accent,
                  marginTop: "0.4rem",
                  letterSpacing: "0.08em",
                }}
              >
                <EditableText path="subtitle" value={subtitle}>
                  {subtitle}
                </EditableText>
              </motion.div>
            ) : null}
          </div>

          {/* Artiklar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.6rem, 1.4vh, 1rem)",
            }}
          >
            {articles.map((article, i) => (
              <Article
                key={i}
                index={i + 1}
                text={article}
                accent={accent}
                delay={1.1 + i * 0.25}
              />
            ))}
          </div>

          {/* Signaturer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.1 + articles.length * 0.25 + 0.4 }}
            style={{
              marginTop: "clamp(0.6rem, 1.5vh, 1.2rem)",
              paddingTop: "clamp(0.8rem, 1.5vh, 1.2rem)",
              borderTop: `1px solid ${withAlpha(accent, 0.2)}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "clamp(1.5rem, 3vw, 3rem)",
              alignItems: "end",
            }}
          >
            <SignatureLine label={leftSignature} accent={accent} />
            <SignatureLine label={rightSignature} accent={accent} />
          </motion.div>

          {/* Datum */}
          {date ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.1 + articles.length * 0.25 + 0.6 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.65rem, 0.78vw, 0.78rem))",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "center",
                marginTop: "0.3rem",
              }}
            >
              {date}
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// Enskild artikel
// ============================================================================

function Article({
  index,
  text,
  accent,
  delay,
}: {
  index: number;
  text: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "clamp(0.8rem, 1.5vw, 1.4rem)",
        alignItems: "baseline",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.3rem))",
          color: accent,
          letterSpacing: "0.05em",
          minWidth: "2.4rem",
          textAlign: "right",
        }}
      >
        § {index}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--room-body, clamp(0.95rem, 1.2vw, 1.2rem))",
          color: "var(--text)",
          lineHeight: 1.45,
        }}
      >
        {renderInline(text, accent)}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Signaturlinje
// ============================================================================

function SignatureLine({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
      }}
    >
      <div
        style={{
          height: "1.5rem",
          borderBottom: `1px solid ${withAlpha(accent, 0.4)}`,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--room-caption, clamp(0.65rem, 0.78vw, 0.8rem))",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ============================================================================
// Hörnornament
// ============================================================================

function Ornament({
  position,
  accent,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  accent: string;
}) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 0.55, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.55 }}
      style={{
        position: "absolute",
        [isTop ? "top" : "bottom"]: "0.6rem",
        [isLeft ? "left" : "right"]: "0.6rem",
        width: "1.4rem",
        height: "1.4rem",
        [isTop ? "borderTop" : "borderBottom"]: `1.5px solid ${accent}`,
        [isLeft ? "borderLeft" : "borderRight"]: `1.5px solid ${accent}`,
        pointerEvents: "none",
      }}
    />
  );
}
