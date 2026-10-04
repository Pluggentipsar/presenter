"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * OppositionRows ★ — motsatspar som stora, läsbara konfrontationer.
 *
 * Byggd som ersättare till BildningContrast för produktion/lärande-sliden.
 * Problemet med BildningContrast: den gör två jätteord (Produktion/Lärande)
 * till hjältar och lägger de faktiska paren — som ÄR innehållet — som pyttesmå
 * rader på 0.25 opacitet i två OSAMMANHÄNGANDE spalter. Man ser aldrig att
 * "Ge svaret" står MOT "Ställa frågan".
 *
 * Här är varje par en egen rad tvärs över en mittaxel: vänstercellen (det
 * chatboten gör) tonad och högerjusterad mot mitten, högercellen (det eleven
 * behöver göra) i accent och vänsterjusterad. Konfrontationen blir läsbar på
 * en rad, och typografin är stor nog för sista bänken. Tema-medveten via
 * tokens (--text, --text-muted, --accent) — fungerar ljust och mörkt.
 *
 * Kolumnetiketterna (leftLabel/rightLabel) står som rubriker; paren avslöjas
 * en rad i taget. **Fetstil** i högercellen renderas i accent.
 *
 * MDX-format (samma `Vänster · Höger` som BildningContrast — drop-in):
 * ```mdx
 * <OppositionRows
 *   chapter="§ Mekanismen"
 *   title="En chattbot är byggd för **produktion** — inte för lärande."
 *   subtitle="AI höjer prestationen på kort sikt — men kan underminera lärandet."
 *   leftLabel="Chatboten" rightLabel="Eleven">
 * - Ge svaret · Ställa frågan
 * - Ta bort ansträngningen · Kräva ansträngningen
 * - Eleven förlitar sig · Eleven **lär sig**
 * </OppositionRows>
 * ```
 */

interface OppositionRowsProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Kolumnrubrik vänster — det systemet gör. */
  leftLabel?: string;
  /** Kolumnrubrik höger — det eleven behöver. */
  rightLabel?: string;
  accent?: string;
  /** Valfri bakgrundsbild/-video-frame. Utan denna används slide-base. */
  background?: string;
  /** Overlay-täthet 0–1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** "dark" (svart wash) eller "light" (vit wash). Default dark. */
  overlayMode?: "dark" | "light";
  children?: ReactNode;
}

interface Row {
  left: string;
  right: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseRows(children: ReactNode): Row[] {
  const out: Row[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const parts = t.split(/\s*·\s*/);
    out.push({
      left: (parts[0] ?? "").trim(),
      right: parts.slice(1).join(" · ").trim(),
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <span key={i} style={{ color: accent, fontWeight: 800 }}>
          {p.slice(2, -2)}
        </span>
      );
    if (p.startsWith("*") && p.endsWith("*"))
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    return <span key={i}>{p}</span>;
  });
}

export function OppositionRows({
  chapter,
  title,
  subtitle,
  leftLabel = "Chatboten",
  rightLabel = "Eleven",
  accent = "var(--accent)",
  background,
  overlay,
  overlayMode = "dark",
  children,
}: OppositionRowsProps) {
  const rows = useMemo(() => parseRows(children), [children]);
  // Steg 0: rubriker synliga, rader svaga. Steg 1..N: tänd rad för rad.
  const step = useSlideSteps(rows.length + 1);

  if (rows.length === 0) return null;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: buildBackgroundCss(background, overlay, overlayMode),
        padding: "clamp(2rem, 4.5vh, 3.4rem) clamp(2.5rem, 5vw, 5rem)",
      }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.2vh, 2.6rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {chapter}
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.7rem, 3.2vw, 3rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.05,
            color: "var(--text)",
            maxWidth: "30ch",
          }}
        >
          {renderInline(title, accent)}
        </motion.h2>
      ) : null}

      {subtitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            margin: "clamp(0.4rem, 0.9vh, 0.7rem) 0 0",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.9rem, 1.3vw, 1.3rem)",
            color: "var(--text-muted)",
            maxWidth: "60ch",
            lineHeight: 1.4,
          }}
        >
          {renderInline(subtitle, accent)}
        </motion.p>
      ) : null}

      {/* Konfrontationsraster */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          marginTop: "clamp(0.8rem, 2vh, 1.6rem)",
        }}
      >
        {/* Kolumnrubriker */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "clamp(1rem, 2.5vw, 2.5rem)",
            paddingBottom: "clamp(0.6rem, 1.4vh, 1rem)",
          }}
        >
          <span
            style={{
              textAlign: "right",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.85rem, 1.25vw, 1.25rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {leftLabel}
          </span>
          <span style={{ width: "clamp(1.5rem, 3vw, 3rem)" }} />
          <span
            style={{
              textAlign: "left",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.85rem, 1.25vw, 1.25rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {rightLabel}
          </span>
        </motion.div>

        {/* Raderna */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1.8vh, 1.3rem)",
          }}
        >
          {/* Mittaxel bakom raderna */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              top: "6%",
              bottom: "6%",
              width: "2px",
              transform: "translateX(-50%)",
              transformOrigin: "center",
              background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
              boxShadow: `0 0 18px ${withAlpha(accent, 0.5)}`,
            }}
          />

          {rows.map((row, i) => {
            const lit = step >= i + 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: lit ? 1 : 0.32, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: "clamp(1rem, 2.5vw, 2.5rem)",
                }}
              >
                {/* Vänster — det chatboten gör (tonat) */}
                <span
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "clamp(1.5rem, 3vw, 2.8rem)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.15,
                    color: lit
                      ? "color-mix(in srgb, var(--text) 55%, transparent)"
                      : "var(--text-muted)",
                    transition: "color 0.5s ease",
                  }}
                >
                  {row.left}
                </span>

                {/* Mittmarkör */}
                <span
                  aria-hidden
                  style={{
                    width: "clamp(1.5rem, 3vw, 3rem)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.8rem, 1.1vw, 1.1rem)",
                    color: lit ? accent : "var(--text-muted)",
                    transition: "color 0.5s ease",
                  }}
                >
                  <span
                    style={{
                      width: "clamp(0.55rem, 0.85vw, 0.8rem)",
                      height: "clamp(0.55rem, 0.85vw, 0.8rem)",
                      borderRadius: "999px",
                      background: lit
                        ? accent
                        : "color-mix(in srgb, var(--text) 20%, transparent)",
                      boxShadow: lit ? `0 0 12px ${withAlpha(accent, 0.7)}` : "none",
                      transition: "background 0.5s ease, box-shadow 0.5s ease",
                    }}
                  />
                </span>

                {/* Höger — det eleven behöver (accent, levande) */}
                <span
                  style={{
                    textAlign: "left",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1.7rem, 3.4vw, 3.2rem)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.12,
                    color: lit ? "var(--text)" : "var(--text-muted)",
                    transition: "color 0.5s ease",
                  }}
                >
                  {renderInline(row.right, accent)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
