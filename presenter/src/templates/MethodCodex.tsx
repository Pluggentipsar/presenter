"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface MethodCodexProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  bottomLine?: string;
  /** Stor editorial siffra i vänsterkolumnens mellanrum (t.ex. "5 %"). */
  stat?: string;
  /** Kort rad under siffran. */
  statCaption?: string;
  /**
   * Markdown-lista. `- Titel · Beskrivning`. Lägg `★ Titel` för ett item
   * som är central (får accent-tonad bakgrund).
   */
  children?: ReactNode;
}

/** `**fet**` → accent-fet · `*kursiv*` → kursiv. */
function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
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

interface MethodRow {
  title: string;
  description: string;
  starred: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    // Bevara betoning från MDX så renderInline kan färga/kursivera den.
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): MethodRow[] {
  const out: MethodRow[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const starred = raw.startsWith("★");
      const clean = raw.replace(/^★\s*/, "");
      const parts = clean.split(/\s*·\s*/);
      out.push({
        title: parts[0] ?? "",
        description: parts.slice(1).join(" · "),
        starred,
      });
    });
  });
  return out;
}

/**
 * Editorial codex-layout: metoder listade som tidskriftsuppslag.
 * Vänster kolumn = header + subtitle + bottomLine. Höger kolumn =
 * staged-reveal lista av metoder med stort romersktalt nummer, titel
 * och beskrivning. Varje rad har en tunn accent-linje under titeln för
 * editorial-känsla.
 */
export function MethodCodex({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  stat,
  statCaption,
  children,
}: MethodCodexProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.4rem, 4vw, 3.6rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "stretch",
        }}
      >
        {/* Vänster: header + bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 1.8vh, 1.5rem)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {kicker ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 500,
                }}
              >
                {kicker}
              </motion.div>
            ) : null}
            {chapter ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {chapter}
              </motion.div>
            ) : null}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.2rem, 3.6vw, 3.2rem)",
                fontWeight: 500,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
            </h2>
            {subtitle ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.98rem, 1.18vw, 1.18rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                  margin: "0.75rem 0 0 0",
                  maxWidth: "26em",
                }}
              >
                {renderInline(subtitle, accent)}
              </p>
            ) : null}
          </motion.div>

          {/* Mellanrummet — stor editorial siffra om stat finns, annars spacer */}
          {stat ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "0.4rem",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(4rem, 8vw, 7rem)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  color: accent,
                  textShadow: `0 0 44px ${withAlpha("var(--accent)", 0.35)}`,
                }}
              >
                {stat}
              </div>
              {statCaption ? (
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                    color: "var(--text-muted)",
                    lineHeight: 1.45,
                    maxWidth: "24em",
                  }}
                >
                  {renderInline(statCaption, accent)}
                </div>
              ) : null}
            </motion.div>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          {/* Bottom-line — italic, large, lives in left column */}
          {bottomLine ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.4 }}
              style={{
                borderTop: `1px solid ${withAlpha("var(--accent)", 0.3)}`,
                paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                color: "var(--text)",
                lineHeight: 1.5,
                maxWidth: "26em",
              }}
            >
              {renderInline(bottomLine, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Höger: codex */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 1.8vh, 1.6rem)",
            justifyContent: "center",
          }}
        >
          {items.map((item, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 26,
                delay: 0.35 + i * 0.18,
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "clamp(58px, 6vw, 90px) 1fr",
                gap: "clamp(1rem, 1.6vw, 1.6rem)",
                alignItems: "start",
                padding: "clamp(0.9rem, 1.4vw, 1.3rem) clamp(1rem, 1.5vw, 1.5rem)",
                borderRadius: "1rem",
                background: item.starred
                  ? `linear-gradient(135deg, ${withAlpha("var(--accent)", 0.18)} 0%, ${withAlpha("var(--accent)", 0.02)} 100%)`
                  : "var(--bg-elevated)",
                border: item.starred
                  ? `1.5px solid ${withAlpha("var(--accent)", 0.45)}`
                  : "1px solid rgba(0,0,0,0.1)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: item.starred
                  ? `0 18px 44px -16px var(--accent-glow, rgba(0,0,0,0.4))`
                  : "0 12px 28px -12px rgba(0,0,0,0.4)",
              }}
            >
              {/* Roman number */}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.4rem, 3.8vw, 3.4rem)",
                  fontWeight: 300,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: item.starred ? accent : "var(--text-muted)",
                  opacity: item.starred ? 1 : 0.55,
                  textShadow: item.starred
                    ? `0 0 22px ${withAlpha("var(--accent)", 0.4)}`
                    : undefined,
                  fontVariantNumeric: "lining-nums",
                }}
              >
                {toRoman(i + 1)}
              </div>

              {/* Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.15rem, 1.5vw, 1.45rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.018em",
                    lineHeight: 1.2,
                    color: "var(--text)",
                  }}
                >
                  {renderInline(item.title, accent)}
                </div>
                {/* Tunn accent-linje */}
                <div
                  style={{
                    width: "clamp(28px, 4vw, 56px)",
                    height: 1,
                    background: item.starred ? accent : withAlpha("var(--accent)", 0.4),
                    margin: "0.05rem 0 0.15rem 0",
                  }}
                />
                {item.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.95rem, 1.12vw, 1.12rem)",
                      lineHeight: 1.5,
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    {renderInline(item.description, accent)}
                  </p>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let remaining = n;
  for (const [value, sym] of map) {
    while (remaining >= value) {
      out += sym;
      remaining -= value;
    }
  }
  return out;
}
