"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DemoCue — kortet som ligger uppe precis innan du lämnar decket.
 *
 * Ett demotungt pass växlar mellan deck och verktyg många gånger, och varje
 * växling är en punkt där rummet kan tappas. Kortet finns för att göra
 * växlingen till en del av dramaturgin i stället för ett avbrott i den:
 * publiken får en uppgift innan skärmen byts, och du får en sida att stå
 * still vid medan du hittar rätt flik.
 *
 * Hierarkin är medveten. Verktygets namn är INTE hjälten — det är
 * `children`, alltså vad publiken ska titta efter. Ett rum som vet vad det
 * letar efter ser saker; ett rum som bara fått ett produktnamn tittar på att
 * någon annan använder en app.
 *
 * `fallback` är diskret med flit. Den är en lapp till dig själv om demon
 * fastnar, och den ska inte läsas av publiken som att du räknar med att
 * misslyckas.
 *
 * ```mdx
 * <DemoCue
 *   chapter="§ Kapitel 1 · Det börjar i ett rum"
 *   tool="Whisper Web + Copilot"
 *   show="Ett inspelat möte blir fyra listor — och en femte som ingen bad om."
 *   duration="~5 min"
 *   fallback="Artefakten ligger sparad: mötesminne · styrgrupp 12 mars"
 * >
 * Att den ber om **fyra listor** — inte om en sammanfattning.
 * </DemoCue>
 * ```
 */

interface DemoCueProps {
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /**
   * Liten etikett över verktygsnamnet. Default "Nu lämnar vi decket" —
   * hela poängen med kortet är att signalera växlingen innan den sker.
   */
  cue?: string;
  /** Verktygets namn. Stor men underordnad "titta efter"-raden. */
  tool: string;
  /** Vad du ska visa, i EN mening. Stödjer **fet**. */
  show?: string;
  /** Ungefärlig speltid, t.ex. "~5 min". Ren mono-markering nere till vänster. */
  duration?: string;
  /**
   * Diskret lapp till dig själv: vart du hoppar om demon går i putten.
   * Renderas dämpat nere till höger — publiken ska inte läsa den som en
   * brasklapp.
   */
  fallback?: string;
  /** Accentfärg. Default temats accent. */
  accent?: string;
  /** Bakgrund — bildsökväg, video-URL eller CSS-värde. */
  background?: string;
  /** Mörk overlay på bildbakgrund (0–1). Default 0.62. */
  overlay?: number;
  /** Vad publiken ska titta efter. Hjälten på sliden. Stödjer **fet**. */
  children?: ReactNode;
}

// ============================================================================
// Parsing — samma idiom som TriadStatement/AiCompanions
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
    return inner;
  }
  return "";
}

function childrenToText(children: ReactNode): string {
  const parts: string[] = [];
  Children.forEach(children, (child) => {
    const text = extractText(child).trim();
    if (text) parts.push(text);
  });
  return parts.join(" ").trim();
}

/** Renderar **fet** och *kursiv* inline. Fet får accentfärgen. */
function renderInline(text: string, accent: string): ReactNode[] {
  const chunks = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return chunks.filter(Boolean).map((chunk, i) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 600 }}>
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith("*") && chunk.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {chunk.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{chunk}</span>;
  });
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

export function DemoCue({
  chapter,
  cue = "Nu lämnar vi decket",
  tool,
  show,
  duration,
  fallback,
  accent = "var(--accent)",
  background,
  overlay = 0.62,
  children,
}: DemoCueProps) {
  const lookFor = childrenToText(children);
  const onDark = Boolean(background);

  const textColor = onDark ? "rgba(245,246,250,0.96)" : "var(--text)";
  const mutedColor = onDark ? "rgba(245,246,250,0.62)" : "var(--text-muted)";
  const faintColor = onDark ? "rgba(245,246,250,0.38)" : "var(--text-muted)";
  const panelBg = onDark ? "rgba(245,246,250,0.06)" : "var(--surface, rgba(10,9,8,0.035))";
  const hairline = onDark ? "rgba(245,246,250,0.14)" : "rgba(10,9,8,0.10)";

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

      <div
        className="relative flex h-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          paddingBottom: "clamp(3.5rem, 7vh, 5rem)",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {/* Cue-etiketten — signalerar växlingen */}
        {cue ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "clamp(0.9rem, 1.8vh, 1.4rem)",
            }}
          >
            {/* Pulsen är inspelningslampan — den säger "något händer nu"
                utan att ta plats. Enda rörelsen på ett kort som annars
                ska ligga still medan du växlar fönster. */}
            <motion.span
              aria-hidden
              animate={{ opacity: [1, 0.25, 1], scale: [1, 0.82, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "0.4rem",
                height: "0.4rem",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 0.6rem ${accent}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              <EditableText path="cue" value={cue}>
                {cue}
              </EditableText>
            </span>
          </motion.div>
        ) : null}

        {/* Verktyget */}
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            fontWeight: 600,
            color: textColor,
            margin: 0,
          }}
        >
          <EditableText path="tool" value={tool}>
            {tool}
          </EditableText>
        </motion.h2>

        {/* Vad du visar */}
        {show ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(1.05rem, 1.7vw, 1.6rem)",
              lineHeight: 1.45,
              color: mutedColor,
              margin: "clamp(0.8rem, 1.6vh, 1.2rem) 0 0",
              maxWidth: "46ch",
            }}
          >
            <EditableText path="show" value={show} multiline>
              {renderInline(show, accent)}
            </EditableText>
          </motion.p>
        ) : null}

        {/* HJÄLTEN — vad publiken ska titta efter */}
        {lookFor ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: "clamp(1.8rem, 3.6vh, 3rem)",
              padding: "clamp(1.3rem, 2.6vh, 2rem) clamp(1.5rem, 3vw, 2.4rem)",
              background: panelBg,
              borderLeft: `2px solid ${accent}`,
              borderRadius: "0 0.5rem 0.5rem 0",
              maxWidth: "62ch",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "clamp(0.6rem, 1.2vh, 0.9rem)",
              }}
            >
              Titta efter
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(1.35rem, 2.5vw, 2.35rem)",
                lineHeight: 1.28,
                letterSpacing: "-0.01em",
                color: textColor,
              }}
            >
              <EditableText path="content" value={lookFor} multiline block>
                {renderInline(lookFor, accent)}
              </EditableText>
            </div>
          </motion.div>
        ) : null}

        {/* Fotraden — speltid och fallback */}
        {duration || fallback ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            style={{
              position: "absolute",
              left: "clamp(3rem, 6vw, 7rem)",
              right: "clamp(3rem, 6vw, 7rem)",
              bottom: "clamp(1.8rem, 3.5vh, 2.8rem)",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "2rem",
              borderTop: `1px solid ${hairline}`,
              paddingTop: "clamp(0.8rem, 1.6vh, 1.2rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
              letterSpacing: "0.12em",
            }}
          >
            <span style={{ color: mutedColor, whiteSpace: "nowrap" }}>
              {duration ? (
                <EditableText path="duration" value={duration}>
                  {duration}
                </EditableText>
              ) : null}
            </span>
            {fallback ? (
              <span
                style={{
                  color: faintColor,
                  textAlign: "right",
                  fontSize: "0.92em",
                }}
              >
                <EditableText path="fallback" value={fallback}>
                  {fallback}
                </EditableText>
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
