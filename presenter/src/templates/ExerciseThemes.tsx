"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ExerciseThemesProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stora rubrik. Default: "Välj ett tema." */
  title?: string;
  /** Underrubrik / instruktion. */
  subtitle?: string;
  /**
   * Markdown-lista med tema-alternativ. En rad per kort.
   */
  children?: ReactNode;
  /** Diskret etisk anmärkning under korten. */
  caveat?: string;
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

function parseThemes(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (raw) out.push(raw);
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
 * ExerciseThemes — Slide A i klassrumsövningen.
 *
 * Tre tema-kort som eleven kan välja mellan. Vardagliga teman, inte
 * skola — för att blottlägga den relationella dimensionen som ELEPHANT
 * mäter (sykofant rate är högre i sociala/emotionella domäner).
 *
 * Bok-uppslag-stil. Korten har subtila ramar och stegvis fade-in.
 */
export function ExerciseThemes({
  kicker,
  chapter,
  title = "Välj ett tema.",
  subtitle,
  children,
  caveat,
}: ExerciseThemesProps) {
  const themes = parseThemes(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
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

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            textAlign: "center",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>

        {/* Subtitle */}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
              lineHeight: 1.45,
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "32em",
              margin: 0,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}

        {/* Tema-kort */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              themes.length === 3
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(min(18rem, 100%), 1fr))",
            gap: "clamp(1rem, 2vw, 1.8rem)",
            width: "100%",
            maxWidth: "min(64rem, 100%)",
            marginTop: "clamp(0.5rem, 1.5vh, 1.5rem)",
          }}
        >
          {themes.map((theme, i) => (
            <ThemeCard key={i} text={theme} delay={0.8 + i * 0.18} />
          ))}
        </div>

        {/* Caveat */}
        {caveat ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.8 + themes.length * 0.18 + 0.4,
            }}
            style={{
              marginTop: "clamp(0.5rem, 1.5vh, 1.5rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "40em",
            }}
          >
            <EditableText path="caveat" value={caveat}>
              {caveat}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function ThemeCard({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        padding: "clamp(1.4rem, 2.2vw, 2rem) clamp(1.2rem, 1.8vw, 1.6rem)",
        background: "color-mix(in srgb, var(--accent) 5%, transparent)",
        border:
          "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
        borderRadius: "var(--radius)",
        minHeight: "clamp(7rem, 12vh, 9rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Citationsdekoration */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "0.5rem",
          left: "0.8rem",
          fontFamily: "var(--font-display)",
          fontSize: "2.2rem",
          color: "var(--accent)",
          opacity: 0.25,
          lineHeight: 1,
        }}
      >
        “
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "clamp(1.05rem, 1.4vw, 1.25rem)",
          lineHeight: 1.4,
          color: "var(--text)",
          textAlign: "center",
          letterSpacing: "-0.005em",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}
