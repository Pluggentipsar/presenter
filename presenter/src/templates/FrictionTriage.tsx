"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

/**
 * FrictionTriage — friktion i tre sorter.
 *
 * `FrictionSort` sorterar i två högar: falsk friktion (låt AI ta den) och
 * meningsfull (skydda den). Den här lägger till den tredje högen som saknades
 * i katalogen: **friktion som AI TILLFÖR** — påhittade siffror att verifiera,
 * workslop att tolka, likriktade idéer, gruppen som slutar prata. Den ska
 * varken delegeras eller skyddas — den ska designas bort.
 *
 * Tre kolumner. Klick 1–3 tänder dem i tur och ordning; de otända står kvar
 * dämpade så strukturen syns från start. Tredje kolumnen bär varningsfärgen
 * (rödpennan i kobolt) — det är den nya.
 *
 * ```mdx
 * <FrictionTriage chapter="§ Friktionen" title="Friktion i tre sorter."
 *   landing="Två av tre kände ni redan till. Den tredje är ny — och den är er att designa bort.">
 * - 1 · Formatera affärsplanen efter mallen
 * - 2 · Höra ”nej” från tio kunder
 * - 3 · Verifiera påhittade marknadssiffror
 * </FrictionTriage>
 * ```
 *
 * Rad = `kolumn (1|2|3) · text`. `**fet**` → accent.
 */

interface FrictionTriageProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  col1Label?: string;
  col1Caption?: string;
  col2Label?: string;
  col2Caption?: string;
  col3Label?: string;
  col3Caption?: string;
  /** Bläcksymboler (alfa-PNG som CSS-mask) ovanför kolumnrubrikerna, i kolumnens ton. */
  col1Icon?: string;
  col2Icon?: string;
  col3Icon?: string;
  /** Symbolernas höjd. Default 9vh. */
  iconSize?: string;
  /** Slutraden — landar med tredje kolumnen. Stödjer **fet**. */
  landing?: string;
  accent?: string;
  children?: ReactNode;
}

interface Item {
  col: 1 | 2 | 3;
  text: string;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "li") return `${inner}\n`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): Item[] {
  return toText(children)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [colRaw, ...rest] = line.split("·");
      const col = Number(colRaw.trim());
      return {
        col: (col === 2 || col === 3 ? col : 1) as Item["col"],
        text: rest.join("·").trim(),
      };
    })
    .filter((it) => it.text.length > 0);
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function FrictionTriage({
  chapter,
  title = "Friktion i tre sorter.",
  subtitle,
  col1Label = "Falsk",
  col1Caption = "Låt AI ta den",
  col2Label = "Meningsfull",
  col2Caption = "Skydda den",
  col3Label = "Ny",
  col3Caption = "AI tillför den — designa bort",
  col1Icon,
  col2Icon,
  col3Icon,
  iconSize = "9vh",
  landing,
  accent = "var(--accent)",
  children,
}: FrictionTriageProps) {
  const step = useSlideSteps(3);
  const items = parseItems(children);
  const columns: { label: string; caption: string; tone: string; icon?: string; items: Item[] }[] = [
    { label: col1Label, caption: col1Caption, tone: "var(--text-muted)", icon: col1Icon, items: items.filter((i) => i.col === 1) },
    { label: col2Label, caption: col2Caption, tone: accent, icon: col2Icon, items: items.filter((i) => i.col === 2) },
    { label: col3Label, caption: col3Caption, tone: "var(--accent-alert)", icon: col3Icon, items: items.filter((i) => i.col === 3) },
  ];

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.66rem, 0.85vw, 0.9rem)",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <div
        style={{
          position: "absolute",
          inset: "clamp(2rem, 4vh, 3.2rem) clamp(2rem, 4vw, 4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.8rem, 2vh, 1.6rem)",
        }}
      >
        {chapter ? (
          <div style={{ ...mono, color: "var(--text-muted)" }}>
            <EditableText path="chapter" value={chapter}>
              {chapter}
            </EditableText>
          </div>
        ) : null}

        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
              letterSpacing: "var(--heading-tracking)",
              fontSize: "calc(clamp(1.9rem, 3.4vw, 3.4rem) * var(--display-scale, 1))",
              lineHeight: 1,
              margin: 0,
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "0.6rem 0 0",
                maxWidth: "60ch",
                fontSize: "clamp(0.95rem, 1.25vw, 1.3rem)",
                lineHeight: 1.4,
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </p>
          ) : null}
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "clamp(0.8rem, 1.6vw, 1.6rem)",
            alignItems: "start",
            minHeight: 0,
          }}
        >
          {columns.map((col, ci) => {
            const lit = step >= ci;
            return (
              <motion.div
                key={ci}
                animate={{ opacity: lit ? 1 : 0.28 }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}
              >
                <div
                  style={{
                    borderTop: `var(--border-width, 2px) solid ${col.tone}`,
                    paddingTop: "0.7rem",
                  }}
                >
                  {col.icon ? (
                    <div
                      aria-hidden
                      style={{
                        width: iconSize,
                        height: iconSize,
                        marginBottom: "0.6rem",
                        backgroundColor: ci === 0 ? "var(--text)" : col.tone,
                        WebkitMaskImage: `url(${col.icon})`,
                        maskImage: `url(${col.icon})`,
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "left center",
                        maskPosition: "left center",
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--heading-weight)" as unknown as number,
                      textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
                      fontSize: "clamp(1.4rem, 2.4vw, 2.4rem)",
                      lineHeight: 1,
                      color: ci === 0 ? "var(--text)" : col.tone,
                    }}
                  >
                    {col.label}
                  </div>
                  <div style={{ ...mono, marginTop: "0.35rem", color: col.tone }}>{col.caption}</div>
                </div>

                {col.items.map((it, ii) => (
                  <motion.div
                    key={ii}
                    initial={{ opacity: 0, y: 14 }}
                    animate={lit ? { opacity: 1, y: 0 } : { opacity: 0.55, y: 0 }}
                    transition={{ duration: 0.45, delay: lit ? 0.06 * ii : 0, ease: EASE }}
                    style={{
                      border: `var(--border-width, 1px) solid ${ci === 2 ? "var(--accent-alert)" : "var(--text)"}`,
                      borderRadius: "var(--radius)",
                      boxShadow: ci === 2 ? "var(--card-shadow-alt)" : "var(--card-shadow)",
                      background: "var(--bg-surface)",
                      padding: "clamp(0.5rem, 1vh, 0.8rem) clamp(0.7rem, 1vw, 1rem)",
                      fontSize: "clamp(0.85rem, 1.1vw, 1.15rem)",
                      lineHeight: 1.3,
                      color: "var(--text)",
                    }}
                  >
                    {renderInline(it.text, accent)}
                  </motion.div>
                ))}
              </motion.div>
            );
          })}
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={step >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(1.1rem, 1.7vw, 1.8rem)",
              lineHeight: 1.15,
              color: "var(--text)",
            }}
          >
            {renderInline(landing, accent)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
