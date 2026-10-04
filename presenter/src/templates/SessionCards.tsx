"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { glassCardStyle } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * SessionCards — en fråga per träff, satt som en innehållsförteckning.
 *
 * Sex frågor är för många för en punktlista: den blir en vägg och publiken
 * läser ingen av dem. Som numrerade kort blir samma innehåll ett schema —
 * något man tar med sig och betar av, inte något man ska hinna läsa nu.
 *
 * Siffrorna är den bärande grafiken. De sätts stort och mycket ljust bakom
 * texten, som på ett tidskriftsuppslag, och gör att ytan läses som "sex
 * saker" långt innan någon hunnit läsa en enda fråga.
 *
 * Korten kommer in i följd av sig själva — ingen klickning. Det här är en
 * avslutsslide man pratar över, inte en man bygger upp.
 *
 * MDX-format — `etikett · fråga`:
 * ```mdx
 * <SessionCards chapter="§ Avslut" prefix="Sex frågor — en per träff:">
 * - Om · Hur skiljer sig kunskap som *genereras* från kunskap som *förstås*?
 * - Med · Hur påverkas mitt tänkande när en maskin svarar?
 * </SessionCards>
 * ```
 * Text mellan asterisker får accentfärg.
 */

interface SessionCardsProps {
  chapter?: string;
  /** Raden som ramar in korten. */
  prefix?: string;
  /** Sekunder mellan korten. Default 0.13. */
  stagger?: number;
  /** Antal kolumner. Default 3. */
  columns?: number;
  accent?: string;
  children?: ReactNode;
}

interface Item {
  label: string;
  question: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "em") return `*${inner}*`;
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): Item[] {
  const out: Item[] = [];
  const add = (raw: string) => {
    // Tål både "Om · fråga" och den äldre formen "**Om:** fråga".
    const cleaned = raw.replace(/\*\*/g, "").trim();
    const bySep = cleaned.split("·");
    if (bySep.length > 1) {
      out.push({ label: bySep[0].trim(), question: bySep.slice(1).join("·").trim() });
      return;
    }
    const byColon = /^([^:]{1,24}):\s*(.+)$/.exec(cleaned);
    if (byColon) out.push({ label: byColon[1].trim(), question: byColon[2].trim() });
    else if (cleaned) out.push({ label: "", question: cleaned });
  };

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/** Betonad text (mellan asterisker) får accenten. */
function emphasised(text: string, accent: string) {
  const parts: ReactNode[] = [];
  const re = /\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    parts.push(
      <span key={k++} style={{ color: accent, fontWeight: 700 }}>
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

export function SessionCards({
  chapter,
  prefix,
  stagger = 0.13,
  columns = 3,
  accent = "var(--accent)",
  children,
}: SessionCardsProps) {
  const items = parseItems(children);
  if (items.length === 0) return null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(58% 60% at 14% 18%, ${withAlpha(accent, 0.13)} 0%, transparent 62%),
            radial-gradient(52% 56% at 88% 84%, ${withAlpha(accent, 0.1)} 0%, transparent 60%)
          `,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.8rem, 3.6vh, 2.8rem) clamp(2.2rem, 4.5vw, 4.5rem)",
        }}
      >
        {chapter ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="chapter" value={chapter}>
              {chapter}
            </EditableText>
          </div>
        ) : null}

        {prefix ? (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.35rem, 2.3vw, 2.3rem)",
              letterSpacing: "var(--heading-tracking)",
              lineHeight: 1.15,
              color: "var(--text)",
              margin: "clamp(0.4rem, 1vh, 0.7rem) 0 0",
              maxWidth: "38ch",
            }}
          >
            <EditableText path="prefix" value={prefix}>
              {prefix}
            </EditableText>
          </h2>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: "clamp(0.9rem, 2.2vh, 1.6rem)",
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "clamp(0.7rem, 1.6vw, 1.5rem)",
            alignItems: "stretch",
          }}
        >
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.25 + i * stagger,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                ...glassCardStyle({
                  radius: "1.1rem",
                  blur: 22,
                  padding: "clamp(0.8rem, 1.5vw, 1.3rem)",
                }),
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                minHeight: 0,
              }}
            >
              {/* Siffran är grafiken. Stor och nästan genomskinlig bakom
                  texten — ytan läses som "sex saker" innan någon hunnit
                  läsa en enda fråga. */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: "-0.12em",
                  right: "0.12em",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(3.4rem, 6.2vw, 6.2rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                  color: accent,
                  opacity: 0.11,
                  pointerEvents: "none",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {it.label ? (
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.66rem, 0.9vw, 0.88rem)",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: accent,
                    marginBottom: "clamp(0.35rem, 0.9vh, 0.6rem)",
                  }}
                >
                  {it.label}
                </div>
              ) : null}

              <p
                style={{
                  position: "relative",
                  zIndex: 1,
                  margin: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.95rem, 1.45vw, 1.35rem)",
                  lineHeight: 1.36,
                  color: "var(--text)",
                }}
              >
                {emphasised(it.question, accent)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
