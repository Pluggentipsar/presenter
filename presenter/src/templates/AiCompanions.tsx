"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface AiCompanionsProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor rubrik. Stöd **fet**. */
  title: string;
  /** Berättande mening — t.ex. Replika-vändningen 2023. */
  turn?: string;
  /** Landnings-statement. Stöd **fet**. */
  landing?: string;
  /** Markdown-lista: `- NAMN · BESKRIVNING` per app/kategori. */
  children?: ReactNode;
}

interface Companion {
  name: string;
  descriptor: string;
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

function parseCompanions(children: ReactNode): Companion[] {
  const out: Companion[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [name = "", descriptor = ""] = raw.split("·").map((s) => s.trim());
    out.push({ name, descriptor });
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
 * AiCompanions — AI-vänskap som produktkategori.
 *
 * Editorial katalog-uppslag: en rubrik, en rad numrerade "produkter"
 * (Replika, Character.AI, AI-partners), en berättande vändning och ett
 * landnings-statement. Ingen tech-deck-estetik — tunna accent-linjer,
 * serif, generösa marginaler.
 *
 * Designat för Replika-sliden i en föreläsning: bryggan
 * mellan dark patterns och "chattboten hackar attachment". Poängen är att
 * anknytning inte är en bieffekt — det är affärsmodellen.
 *
 * Tema-agnostisk — använder enbart CSS-variabler.
 */
export function AiCompanions({
  kicker,
  chapter,
  title,
  turn,
  landing,
  children,
}: AiCompanionsProps) {
  const companions = parseCompanions(children);
  const afterList = 0.7 + companions.length * 0.18;

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
          gap: "clamp(1.5rem, 3.2vh, 2.6rem)",
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
            fontSize: "clamp(1.9rem, 3.4vw, 3.2rem)",
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

        {/* Katalog-rad */}
        {companions.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: "clamp(1rem, 2.5vw, 2.6rem)",
              justifyContent: "center",
              flexWrap: "wrap",
              width: "100%",
              maxWidth: "var(--slide-max-width)",
            }}
          >
            {companions.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.7 + i * 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  flex: "1 1 0",
                  minWidth: "11rem",
                  maxWidth: "15rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.35rem, 0.8vh, 0.6rem)",
                  paddingTop: "clamp(0.7rem, 1.4vh, 1.1rem)",
                  borderTop:
                    "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.2em",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
                    color: "var(--text)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  {c.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontStyle: "italic",
                    fontSize: "clamp(0.85rem, 1.05vw, 1.02rem)",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {c.descriptor}
                </span>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* Vändning */}
        {turn ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: afterList + 0.4 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.45rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "32em",
              lineHeight: 1.45,
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
              delay: afterList + 1.0,
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
              maxWidth: "22em",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.5rem)",
            }}
          >
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.9,
                delay: afterList + 0.9,
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
