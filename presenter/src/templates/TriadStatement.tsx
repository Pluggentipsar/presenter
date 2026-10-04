"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TriadStatement — retorisk triad: två parallella premisser → en landning.
 *
 * Användning: när du vill visa 2-3 påståenden med gemensam struktur som
 * leder fram till en slutsats. Hanterar långa texter genom typografisk
 * hierarki (premisser mindre, slutsats större) och visuell "glue" (linje
 * + pil från premisserna → slutsatsen).
 *
 * MDX-format — varje rad blir en premiss, sista raden efter `---` blir
 * landningen. Stödjer **fet** för accent.
 *
 * ```mdx
 * <TriadStatement chapter="§ Paradox 2">
 * För att ställa **bra frågor** — krävs kunskap.
 * För att värdera **svar** — krävs kunskap.
 * ---
 * AI **förstärker** det du redan har.
 * </TriadStatement>
 * ```
 */

interface TriadStatementProps {
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Mörk overlay på bakgrund (0-1). Default 0.6. */
  overlay?: number;
  /** Accentfärg för betonade ord. Default orange. */
  accent?: string;
  /**
   * MDX-innehåll. Varje paragraf blir en premiss, och om du skriver `---`
   * på egen rad blir det som kommer efter `---` landningen (slutsatsen).
   * Om `---` saknas blir sista paragrafen automatiskt landningen.
   */
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
    if (t === "p") return inner + "\n";
    if (t === "h1" || t === "h2" || t === "h3") return inner + "\n";
    return inner;
  }
  return "";
}

interface Block {
  raw: string;
  isLanding: boolean;
}

function parseBlocks(children: ReactNode): Block[] {
  // Samla paragrafer från MDX children. En `<hr>` (från `---`) markerar gränsen
  // mellan premisser och landning.
  const paragraphs: string[] = [];
  let hasSeparator = false;
  const separatorIndex = { value: -1 };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      const text = typeof child === "string" ? child.trim() : "";
      if (text) paragraphs.push(text);
      return;
    }
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "hr") {
      hasSeparator = true;
      separatorIndex.value = paragraphs.length;
      return;
    }
    if (t === "p") {
      const text = extractText(el.props.children).trim();
      if (text) paragraphs.push(text);
      return;
    }
    // Fallback — andra element
    const text = extractText(child).trim();
    if (text) paragraphs.push(text);
  });

  if (paragraphs.length === 0) return [];

  // Markera sista paragrafen (eller efter separator) som landning.
  const landingStart = hasSeparator ? separatorIndex.value : paragraphs.length - 1;
  return paragraphs.map((raw, i) => ({
    raw,
    isLanding: i >= landingStart,
  }));
}

// Dela text i ord med emphasis-info. Stödjer **fet** och *kursiv*.
interface Word {
  text: string;
  emphasis: "none" | "strong" | "em";
}

function parseWords(text: string): Word[] {
  const out: Word[] = [];
  const chunks = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const chunk of chunks) {
    if (!chunk) continue;
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      for (const w of chunk.slice(2, -2).split(/\s+/).filter(Boolean)) {
        out.push({ text: w, emphasis: "strong" });
      }
    } else if (chunk.startsWith("*") && chunk.endsWith("*")) {
      for (const w of chunk.slice(1, -1).split(/\s+/).filter(Boolean)) {
        out.push({ text: w, emphasis: "em" });
      }
    } else {
      for (const w of chunk.split(/\s+/).filter(Boolean)) {
        out.push({ text: w, emphasis: "none" });
      }
    }
  }
  return out;
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

export function TriadStatement({
  chapter,
  background,
  overlay = 0.6,
  accent = "var(--accent)",
  children,
}: TriadStatementProps) {
  const blocks = parseBlocks(children);
  const premises = blocks.filter((b) => !b.isLanding);
  const landings = blocks.filter((b) => b.isLanding);

  // När en bakgrund passas in (foto med mörk scrim, eller en custom mörk
  // backdrop) ligger texten på ett mörkt underlag oavsett tema → fast ljus
  // text. Utan bakgrund följer texten temat (mörk på ljust tema).
  const onDark = Boolean(background);

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
            color: onDark ? "rgba(245,246,250,0.6)" : "var(--text-muted)",
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
          justifyContent: "center",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Premisserna */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
          }}
        >
          {premises.map((block, i) => (
            <PremiseLine
              key={`premise-${i}`}
              words={parseWords(block.raw)}
              delay={0.5 + i * 0.6}
              accent={accent}
              onDark={onDark}
            />
          ))}
        </div>

        {/* Visuell "glue" — konvergens-linje från premisser → landning */}
        {premises.length > 0 && landings.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "clamp(1.5rem, 3vh, 2.5rem)" }}
            transition={{
              duration: 0.6,
              delay: 0.5 + premises.length * 0.6 + 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              marginLeft: "clamp(2rem, 4vw, 4rem)",
              width: "1px",
              background: `linear-gradient(to bottom, ${withAlpha(accent, 0.53)}, ${withAlpha(accent, 0.13)})`,
            }}
          />
        ) : null}

        {/* Landningen */}
        {landings.map((block, i) => (
          <LandingLine
            key={`landing-${i}`}
            words={parseWords(block.raw)}
            delay={0.5 + premises.length * 0.6 + 0.7 + i * 0.4}
            accent={accent}
            onDark={onDark}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Premise-rad (mindre, serif, avdämpad)
// ============================================================================

function PremiseLine({
  words,
  delay,
  accent,
  onDark,
}: {
  words: Word[];
  delay: number;
  accent: string;
  onDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: "clamp(1.6rem, 2.8vw, 3rem)",
        lineHeight: 1.15,
        letterSpacing: "-0.015em",
        color: onDark ? "rgba(245,246,250,0.92)" : "var(--text)",
        maxWidth: "26em",
        textShadow: onDark ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {words.map((w, i) => (
        <span key={i}>
          <span
            style={{
              color: w.emphasis === "strong" ? accent : undefined,
              fontWeight: w.emphasis === "strong" ? 700 : undefined,
              fontStyle: w.emphasis === "em" ? "italic" : undefined,
            }}
          >
            {w.text}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.div>
  );
}

// ============================================================================
// Landing-rad (större, tyngre, ljusare)
// ============================================================================

function LandingLine({
  words,
  delay,
  accent,
  onDark,
}: {
  words: Word[];
  delay: number;
  accent: string;
  onDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "clamp(2.4rem, 4.5vw, 5rem)",
        lineHeight: 1.05,
        letterSpacing: "-0.03em",
        color: onDark ? "rgba(245,246,250,0.92)" : "var(--text)",
        maxWidth: "20em",
        textShadow: onDark ? "0 6px 30px rgba(0,0,0,0.6)" : "none",
      }}
    >
      {words.map((w, i) => (
        <span key={i}>
          <motion.span
            initial={w.emphasis === "strong" ? { scale: 0.92 } : false}
            animate={w.emphasis === "strong" ? { scale: 1 } : undefined}
            transition={{
              duration: 0.5,
              delay: delay + 0.15 + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              display: "inline-block",
              color: w.emphasis === "strong" ? accent : undefined,
              fontStyle: w.emphasis === "em" ? "italic" : undefined,
            }}
          >
            {w.text}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.div>
  );
}
