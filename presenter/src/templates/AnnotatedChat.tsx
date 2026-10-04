"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

interface Annotation {
  /** Numrering (1, 2, 3...) som visas både i bubblan och bredvid förklaring. */
  number: number;
  /** Citatdel ur AI:ns svar som ska markeras. Detta substring highligtas. */
  highlight: string;
  /** Förklaring som visas bredvid bubblan. */
  explanation: string;
}

interface AnnotatedChatProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Användarens första bubbla. */
  userMessage: string;
  /** AI:ns svar med 4 markeringar — visas i steg 2. */
  aiMessage: string;
  /**
   * Markdown-lista med markeringar/annotations.
   * Format: `- HIGHLIGHT_TEXT · FÖRKLARING`
   * HIGHLIGHT_TEXT är delsträngen i aiMessage som ska markeras.
   */
  children?: ReactNode;
  /** Footer-text längst ner — frivillig (källa, kommentar). */
  footer?: string;
  /**
   * Färg på markeringarna. `"alert"` (default) ger signal-röd, vilket är rätt
   * när markeringarna blottlägger något. `"accent"` ger temats accent — för
   * deck som medvetet kör utan alerts, där markeringarna pekar ut mönster
   * snarare än avslöjar en fälla.
   */
  tone?: "alert" | "accent";
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseAnnotations(children: ReactNode): Annotation[] {
  const out: Annotation[] = [];
  let counter = 0;
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [highlight = "", explanation = ""] = parts;
    counter += 1;
    out.push({ number: counter, highlight, explanation });
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
 * Renderar AI-bubblans text med inline-markeringar.
 * Varje gång en `highlight`-sträng hittas i texten, lindas den med en
 * markerad span med röd accent + nummer-badge.
 */
function renderAnnotatedText(
  text: string,
  annotations: Annotation[],
  markColor?: string,
  markBg?: string,
): React.ReactNode[] {
  if (annotations.length === 0) return [text];

  // Bygg en sekvens av (start, end, annotation) sorterade efter position
  type Span = { start: number; end: number; annotation: Annotation };
  const spans: Span[] = [];
  for (const a of annotations) {
    if (!a.highlight) continue;
    const idx = text.indexOf(a.highlight);
    if (idx === -1) continue;
    spans.push({ start: idx, end: idx + a.highlight.length, annotation: a });
  }
  spans.sort((a, b) => a.start - b.start);

  // Bygg renderingen
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    nodes.push(
      <HighlightedPhrase
        key={`hl-${span.annotation.number}`}
        annotation={span.annotation}
        markColor={markColor}
        markBg={markBg}
      >
        {text.slice(span.start, span.end)}
      </HighlightedPhrase>,
    );
    cursor = span.end;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

function HighlightedPhrase({
  annotation,
  children,
  markColor = "var(--accent-alert)",
  markBg = "var(--accent-alert-bg, rgba(230, 57, 70, 0.18))",
}: {
  annotation: Annotation;
  children: React.ReactNode;
  markColor?: string;
  markBg?: string;
}) {
  return (
    <motion.span
      initial={{ backgroundColor: "transparent" }}
      animate={{ backgroundColor: markBg }}
      transition={{ duration: 0.5, delay: 1.4 + annotation.number * 0.4 }}
      style={{
        position: "relative",
        padding: "0 0.2em",
        borderRadius: "0.15em",
        color: markColor,
        fontWeight: 500,
      }}
    >
      {children}
      {/* Liten numrerad badge ovanför */}
      <motion.span
        initial={{ opacity: 0, scale: 0.6, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 1.6 + annotation.number * 0.4,
          ease: [0.22, 1.3, 0.36, 1],
        }}
        style={{
          position: "absolute",
          top: "-1.4em",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1.5em",
          height: "1.5em",
          borderRadius: "50%",
          background: markColor,
          color: "var(--bg)",
          fontSize: "0.55em",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {annotation.number}
      </motion.span>
    </motion.span>
  );
}

/**
 * AnnotatedChat — chat-mockup med stegvis reveal och röda annotationer.
 *
 * Steg 1: Användarens bubbla visas.
 * Steg 2: AI-svaret animeras in. Sedan kommer 1-4 röda markeringar fram
 *         i texten med nummer-badges, plus förklaringskolumn till höger.
 *
 * Designat för slide 10-11 i en föreläsning (det
 * sykofantiska svaret). Använder accent-alert (röd) för markeringar.
 *
 * Annotation-format:
 *   `- HIGHLIGHT_TEXT · FÖRKLARING`
 * där HIGHLIGHT_TEXT är delsträngen i AI-meddelandet som ska markeras.
 */
export function AnnotatedChat({
  kicker,
  chapter,
  userMessage,
  aiMessage,
  children,
  footer,
  tone = "alert",
}: AnnotatedChatProps) {
  // Markeringsfärgen. Default är signal-röd (blottläggning); `tone="accent"`
  // låter deck utan alerts använda templaten utan att bryta färggrammatiken.
  const markColor = tone === "accent" ? "var(--accent)" : "var(--accent-alert)";
  const markBg =
    tone === "accent"
      ? "var(--accent-dim, rgba(120,120,120,0.16))"
      : "var(--accent-alert-bg, rgba(230, 57, 70, 0.18))";
  const annotations = parseAnnotations(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll: två-kolumns layout — chat vänster, annoteringar höger */}
      <div
        className="relative flex h-full w-full"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(2rem, 4vw, 4rem)",
          zIndex: 2,
          alignItems: "center",
        }}
      >
        {/* Vänster: chat */}
        <div
          style={{
            flex: "1 1 60%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
            maxWidth: "min(48rem, 100%)",
          }}
        >
          {/* User-bubblan (steg 1) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              alignSelf: "flex-end",
              maxWidth: "26em",
              padding:
                "clamp(0.9rem, 1.2vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.5rem)",
              background: "color-mix(in srgb, var(--text) 6%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
              borderRadius: "var(--radius)",
              borderTopRightRadius: "0.1rem",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
              lineHeight: 1.45,
              color: "var(--text)",
            }}
          >
            <EditableText path="userMessage" value={userMessage}>
              {userMessage}
            </EditableText>
          </motion.div>

          {/* AI-bubblan (steg 2) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
            style={{
              alignSelf: "flex-start",
              maxWidth: "30em",
              padding:
                "clamp(1.1rem, 1.6vw, 1.6rem) clamp(1.3rem, 1.8vw, 1.7rem)",
              background: "var(--accent-dim)",
              border:
                "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              borderRadius: "var(--radius)",
              borderTopLeftRadius: "0.1rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 1.25vw, 1.2rem)",
              lineHeight: 1.55,
              color: "var(--text)",
              position: "relative",
            }}
          >
            <EditableText path="aiMessage" value={aiMessage}>
              {renderAnnotatedText(aiMessage, annotations, markColor, markBg)}
            </EditableText>
          </motion.div>
        </div>

        {/* Höger: annoteringar */}
        <div
          style={{
            flex: "1 1 35%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.9rem, 1.8vh, 1.6rem)",
            maxWidth: "min(28rem, 40%)",
          }}
        >
          {annotations.map((a, i) => (
            <AnnotationCard key={i} annotation={a} delay={1.8 + i * 0.4} markColor={markColor} />
          ))}
        </div>
      </div>

      {/* Footer */}
      {footer ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 + annotations.length * 0.4 + 0.4 }}
          style={{
            position: "absolute",
            bottom: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "40em",
          }}
        >
          <EditableText path="footer" value={footer}>
            {footer}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}

function AnnotationCard({
  annotation,
  delay,
  markColor = "var(--accent-alert)",
}: {
  markColor?: string;
  annotation: Annotation;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        gap: "clamp(0.7rem, 1.1vw, 1rem)",
        alignItems: "flex-start",
      }}
    >
      {/* Nummerbadge */}
      <div
        style={{
          flexShrink: 0,
          width: "1.7rem",
          height: "1.7rem",
          borderRadius: "50%",
          background: markColor,
          color: "var(--bg)",
          fontSize: "0.85rem",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {annotation.number}
      </div>

      {/* Förklaring */}
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
          lineHeight: 1.45,
          color: "var(--text)",
          fontStyle: "italic",
          paddingTop: "0.05rem",
        }}
      >
        {annotation.explanation}
      </div>
    </motion.div>
  );
}
