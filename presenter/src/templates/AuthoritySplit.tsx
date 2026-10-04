"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Stance = "yes" | "no" | "unclear";

interface AuthorityVoice {
  name: string;
  role: string;
  position: string;
  stance: Stance;
  image?: string;
  source?: string;
}

interface AuthoritySplitProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  /**
   * Markdown-lista med en röst per rad.
   * Format: `- NAME · ROLE · POSITION · STANCE · SOURCE`
   * STANCE = yes | no | unclear
   * SOURCE är valfri.
   */
  children?: ReactNode;
  coda?: string;
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

function parseVoices(children: ReactNode): AuthorityVoice[] {
  const out: AuthorityVoice[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [name = "—", role = "", position = "", stanceRaw = "unclear", source] = parts;
    const stance: Stance =
      stanceRaw === "yes" || stanceRaw === "no" || stanceRaw === "unclear"
        ? stanceRaw
        : "unclear";
    out.push({
      name,
      role,
      position,
      stance,
      source: source || undefined,
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
  return out;
}

const STANCE_COLORS = {
  yes: {
    bg: "var(--accent-dim)",
    border: "var(--accent)",
    text: "var(--accent)",
  },
  no: {
    bg: "color-mix(in srgb, var(--text) 4%, transparent)",
    border: "color-mix(in srgb, var(--text) 35%, transparent)",
    text: "var(--text)",
  },
  unclear: {
    bg: "color-mix(in srgb, var(--accent) 6%, transparent)",
    border: "color-mix(in srgb, var(--accent) 40%, transparent)",
    text: "color-mix(in srgb, var(--accent) 85%, transparent)",
  },
};

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span
          key={i}
          style={{ color: "var(--accent)", fontWeight: 700 }}
        >
          {p.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/**
 * AuthoritySplit — tre paneler i kontrast.
 *
 * Visar splittringen i AI-medvetande-debatten:
 * Hinton (yes) | Suleyman (no) | Anthropic (unclear).
 *
 * Eller andra triangulära kontraster där tre auktoritetsröster säger
 * olika saker om samma fråga.
 */
export function AuthoritySplit({
  kicker,
  chapter,
  title,
  children,
  coda,
}: AuthoritySplitProps) {
  const safeVoices = parseVoices(children).slice(0, 3);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 70%)",
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
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
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
        className="relative flex h-full w-full flex-col items-center"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(2rem, 4vh, 3.5rem)",
          zIndex: 2,
          justifyContent: "center",
        }}
      >
        {/* Title */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "32em",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Voices grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(1.2rem, 2.5vw, 2.4rem)",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
          }}
        >
          {safeVoices.map((voice, i) => {
            const colors = STANCE_COLORS[voice.stance] ?? STANCE_COLORS.unclear;
            const delay = 0.7 + i * 0.25;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.7rem, 1.2vw, 1.1rem)",
                  padding: "clamp(1.5rem, 2.5vw, 2.2rem)",
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "var(--radius)",
                  minHeight: "clamp(18rem, 30vh, 24rem)",
                  position: "relative",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Top stance-marker */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.8vw, 0.78rem)",
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: colors.text,
                    fontWeight: 700,
                  }}
                >
                  {voice.stance === "yes"
                    ? "● Är medveten"
                    : voice.stance === "no"
                      ? "○ Är inte"
                      : "◐ Vet inte"}
                </div>

                {/* Portrait placeholder */}
                <div
                  style={{
                    width: "clamp(3.5rem, 5.5vw, 5rem)",
                    height: "clamp(3.5rem, 5.5vw, 5rem)",
                    borderRadius: "50%",
                    background: voice.image
                      ? `url('${voice.image}') center/cover no-repeat`
                      : `linear-gradient(135deg, ${colors.border}55 0%, ${colors.border}22 100%)`,
                    border: `1px solid ${colors.border}`,
                    flexShrink: 0,
                  }}
                />

                {/* Name + role */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 500,
                      fontSize: "clamp(1.1rem, 1.5vw, 1.4rem)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.01em",
                      color: "var(--text)",
                    }}
                  >
                    {voice.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.75rem, 0.95vw, 0.9rem)",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {voice.role}
                  </div>
                </div>

                {/* Position quote */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "clamp(1.15rem, 1.7vw, 1.6rem)",
                    lineHeight: 1.25,
                    letterSpacing: "-0.01em",
                    color: colors.text,
                    minHeight: "4rem",
                  }}
                >
                  <span>"{voice.position}"</span>
                </div>

                {/* Source */}
                {voice.source ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.6rem, 0.75vw, 0.72rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "color-mix(in srgb, var(--text) 45%, transparent)",
                      marginTop: "auto",
                      flexShrink: 0,
                    }}
                  >
                    {voice.source}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Coda */}
        {coda ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.6 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.4rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "40em",
              margin: 0,
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="coda" value={coda}>
              {renderInline(coda)}
            </EditableText>
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
