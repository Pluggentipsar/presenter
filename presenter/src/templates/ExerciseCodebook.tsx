"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Code {
  letter: string;
  name: string;
  description: string;
  examples: string[];
}

interface ExerciseCodebookProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor rubrik. */
  title?: string;
  /** Underrubrik / instruktion. */
  subtitle?: string;
  /**
   * Markdown-lista. En rad per kod.
   * Format: `- BOKSTAV · NAMN · BESKRIVNING · EX1 | EX2 | EX3`
   */
  children?: ReactNode;
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

function parseCodes(children: ReactNode): Code[] {
  const out: Code[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [letter = "", name = "", description = "", examplesPart = ""] = parts;
    const examples = examplesPart
      .split("|")
      .map((e) => e.trim())
      .filter(Boolean);
    out.push({ letter, name, description, examples });
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
 * ExerciseCodebook — Slide B i klassrumsövningen.
 *
 * Kodboken — varje rad är en bias-mekanism eleven ska markera i sin
 * chat-konversation. Bokstavscirkel till vänster, namn + beskrivning +
 * exempel-pills till höger. Stagger-fade-in.
 *
 * Designat som en sida i en handbok — generösa marginaler, klassisk
 * typografi, lugn rytm. Tema-agnostisk (terrakotta i bokstavscirklarna
 * i relationskritik-temat).
 */
export function ExerciseCodebook({
  kicker,
  chapter,
  title = "Markera med bokstäver.",
  subtitle,
  children,
}: ExerciseCodebookProps) {
  const codes = parseCodes(children);

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
        className="relative flex h-full w-full flex-col items-center"
        style={{
          padding: "clamp(2rem, 4vw, 4rem)",
          paddingTop: "clamp(4.5rem, 7vh, 6rem)",
          paddingBottom: "clamp(2rem, 4vh, 3rem)",
          gap: "clamp(1rem, 2vh, 1.6rem)",
          zIndex: 2,
        }}
      >
        {/* Title + subtitle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(0.4rem, 1vh, 0.8rem)",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.6rem, 2.6vw, 2.3rem)",
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
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
                color: "var(--text-muted)",
                textAlign: "center",
                margin: 0,
                maxWidth: "32em",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Kod-grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            columnGap: "clamp(1.2rem, 2.5vw, 2.2rem)",
            rowGap: "clamp(0.6rem, 1.2vh, 1rem)",
            width: "100%",
            maxWidth: "min(60rem, 100%)",
          }}
        >
          {codes.map((code, i) => (
            <CodeCard key={i} code={code} delay={0.7 + i * 0.12} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CodeCard({ code, delay }: { code: Code; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "clamp(0.7rem, 1.2vw, 1rem)",
        alignItems: "start",
        padding: "clamp(0.7rem, 1.3vh, 1rem) clamp(0.9rem, 1.5vw, 1.3rem)",
        background: "color-mix(in srgb, var(--accent) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
        borderRadius: "var(--radius)",
      }}
    >
      {/* Bokstavscirkel */}
      <div
        style={{
          flexShrink: 0,
          width: "clamp(2.4rem, 3.2vw, 3rem)",
          height: "clamp(2.4rem, 3.2vw, 3rem)",
          borderRadius: "50%",
          background: "var(--accent)",
          color: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {code.letter}
      </div>

      {/* Innehåll */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.2rem, 0.4vh, 0.35rem)",
          minWidth: 0,
        }}
      >
        {/* Namn */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
            color: "var(--text)",
            lineHeight: 1.2,
            letterSpacing: "-0.005em",
          }}
        >
          {code.name}
        </div>

        {/* Beskrivning */}
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.78rem, 0.95vw, 0.92rem)",
            color: "var(--text-muted)",
            lineHeight: 1.4,
            letterSpacing: "0.005em",
          }}
        >
          {code.description}
        </div>

        {/* Exempel-pills */}
        {code.examples.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "clamp(0.25rem, 0.5vw, 0.4rem)",
              marginTop: "clamp(0.15rem, 0.35vh, 0.3rem)",
            }}
          >
            {code.examples.map((ex, ei) => (
              <span
                key={ei}
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.82rem)",
                  color: "var(--accent)",
                  padding: "0.18em 0.6em",
                  background:
                    "color-mix(in srgb, var(--accent) 10%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                }}
              >
                "{ex}"
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
