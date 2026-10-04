"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface FrictionContrastProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Rubrik. Stöd **fet**. */
  title: string;
  /** Liten etikett ovanför listan. */
  label?: string;
  /** AI-vändningen — kontrasten. Stöd **fet**. */
  turn?: string;
  /** Landnings-statement. Stöd **fet**. */
  landing?: string;
  /** Markdown-lista: `- KÄLLA · FRIKTIONEN DEN GER`. */
  children?: ReactNode;
}

interface FrictionRow {
  source: string;
  friction: string;
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

function parseRows(children: ReactNode): FrictionRow[] {
  const out: FrictionRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [source = "", friction = ""] = raw.split("·").map((s) => s.trim());
    out.push({ source, friction });
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

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/**
 * FrictionContrast — bryggan mellan systemkritiken och relationskritiken.
 *
 * Tre källor till friktion (en vän, en lärare, lärande) ställs upp som en
 * editorial lista — var och en med det motstånd den ger. Sedan kontrasten:
 * AI är designad utan friktion. Landningen ramar om friktion som något
 * värdefullt, inte ett fel.
 *
 * Typografin bär slidet — ingen generativ viz, men orkestrerad reveal.
 * Tema-agnostisk.
 */
export function FrictionContrast({
  kicker,
  chapter,
  title,
  label,
  turn,
  landing,
  children,
}: FrictionContrastProps) {
  const rows = parseRows(children);
  const afterRows = 0.9 + rows.length * 0.45;

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
          gap: "clamp(1.3rem, 2.8vh, 2.3rem)",
          zIndex: 2,
        }}
      >
        {/* Rubrik */}
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.9rem, 3.3vw, 3.1rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "20em",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {renderInline(title)}
          </EditableText>
        </motion.h2>

        {/* Friktionskällor */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.5vh, 1.2rem)",
            width: "100%",
            maxWidth: "min(40rem, 100%)",
            marginTop: "clamp(0.2rem, 0.8vh, 0.7rem)",
          }}
        >
          {label ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.82vw, 0.82rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                alignSelf: "center",
              }}
            >
              <EditableText path="label" value={label}>
                {label}
              </EditableText>
            </motion.div>
          ) : null}

          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.9 + i * 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "clamp(0.6rem, 1.4vw, 1.1rem)",
                paddingBottom: "clamp(0.5rem, 1.1vh, 0.9rem)",
                borderBottom:
                  "1px solid color-mix(in srgb, var(--text) 11%, transparent)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.2rem, 1.9vw, 1.75rem)",
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                  flexShrink: 0,
                }}
              >
                {row.source}
              </span>
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: "1px",
                  background:
                    "color-mix(in srgb, var(--text) 14%, transparent)",
                  alignSelf: "center",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.35,
                  textAlign: "right",
                }}
              >
                {row.friction}
              </span>
            </motion.div>
          ))}
        </div>

        {/* AI-vändningen */}
        {turn ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: afterRows + 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 1.7vw, 1.6rem)",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "26em",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="turn" value={turn}>
              {renderInline(turn)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Landning */}
        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: afterRows + 1.0,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "relative",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.6rem, 2.7vw, 2.5rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "24em",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.4rem)",
            }}
          >
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.9,
                delay: afterRows + 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "clamp(5rem, 10vw, 9rem)",
                height: "1.5px",
                background: "var(--accent)",
                transformOrigin: "center",
              }}
            />
            <EditableText path="landing" value={landing}>
              {renderInline(landing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
