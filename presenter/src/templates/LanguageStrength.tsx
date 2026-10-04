"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * LanguageStrength — animerat stapeldiagram över AI:s träffsäkerhet per språk.
 * Staplarna krymper nedåt listan (mindre träningsdata → tunnare språk), med en
 * kvalitativ etikett per rad. Landar i en payoff: där maskinen är svagast är
 * människan starkast. Byggd för "AI talar inte alla språk lika bra".
 *
 * ```mdx
 * <LanguageStrength
 *   chapter="§ Om AI · era språk"
 *   title="AI talar inte alla språk lika bra."
 *   subtitle="Kvaliteten följer mängden träningsdata."
 *   payoff="Där maskinen är svagast — där är NI experten den saknar."
 *   source="Illustrativt · relativ träningsdata-mängd"
 * >
 * - Engelska · 100
 * - Svenska · 80
 * - Arabiska · 55
 * - Somaliska · 22
 * - Tigrinja · 10
 * </LanguageStrength>
 * ```
 */

interface LangRow {
  name: string;
  value: number;
  note?: string;
}

interface LanguageStrengthProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Payoff-rad (accent border) under staplarna. */
  payoff?: string;
  /** Liten källa/disclaimer. */
  source?: string;
  accent?: string;
  background?: string;
  /** Markdown-lista: `- Språk · värde(0-100) [· egen etikett]` */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseRows(children: ReactNode): LangRow[] {
  const out: LangRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const value = parseFloat((parts[1] ?? "").replace(",", "."));
    if (Number.isNaN(value)) return;
    out.push({ name: parts[0] ?? "", value, note: parts[2] });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") walkLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

function quality(v: number): string {
  if (v >= 80) return "träffsäker";
  if (v >= 60) return "oftast rätt";
  if (v >= 40) return "ojämn";
  if (v >= 20) return "vacklar";
  return "gissar ofta";
}

export function LanguageStrength({
  chapter,
  title,
  subtitle,
  payoff,
  source,
  accent = "var(--accent)",
  background,
  children,
}: LanguageStrengthProps) {
  const rows = parseRows(children);
  const hasPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));
  const bg = background
    ? (hasPhoto
        ? `linear-gradient(rgba(10,9,8,0.72), rgba(10,9,8,0.84)), url('${background}') center/cover no-repeat`
        : background)
    : `radial-gradient(ellipse at 28% 12%, var(--bg-elevated) 0%, var(--bg) 76%)`;

  // När en bild ligger bakom (mörk scrim för läsbarhet) ska texten vara fast ljus.
  // Utan bild följer texten temat så att den blir läsbar även på ljust tema.
  const textPrimary = hasPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = hasPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const trackBg = hasPhoto ? "rgba(255,255,255,0.08)" : "var(--bg-elevated)";

  const labelCol: CSSProperties = {
    flexShrink: 0,
    width: "clamp(6rem, 9vw, 9rem)",
    textAlign: "right",
    fontFamily: "var(--font-display)",
    fontSize: "clamp(0.95rem, 1.3vw, 1.35rem)",
    color: textPrimary,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 75% 35%, ${withAlpha(accent, 0.08)} 0%, transparent 70%)` }}
      />
      <div
        className="relative flex h-full w-full flex-col"
        style={{ padding: "clamp(2.5rem, 4.5vw, 5rem)", gap: "clamp(1rem, 2.2vh, 1.8rem)", zIndex: 2 }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.5rem", maxWidth: "44em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)", letterSpacing: "0.3em", textTransform: "uppercase", color: textMuted }}
            >
              <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(1.9rem, 3.8vw, 3.2rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: textPrimary, margin: 0 }}
            >
              <EditableText path="title" value={title}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)", color: textMuted, margin: 0, lineHeight: 1.5, maxWidth: "40em" }}
            >
              <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Bars */}
        <div className="flex-1 flex flex-col justify-center" style={{ gap: "clamp(0.5rem, 1.3vh, 1rem)", minHeight: 0 }}>
          {rows.map((r, i) => {
            const pct = Math.max(2, Math.min(100, r.value));
            return (
              <div key={i} className="flex items-center" style={{ gap: "clamp(0.75rem, 1.5vw, 1.5rem)" }}>
                <div style={labelCol}>{r.name}</div>
                <div
                  className="relative flex-1"
                  style={{ height: "clamp(1.6rem, 2.6vh, 2.3rem)", borderRadius: "var(--radius)", background: trackBg, overflow: "hidden" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.0, delay: 0.4 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: "100%",
                      borderRadius: "var(--radius)",
                      background: `linear-gradient(90deg, ${withAlpha(accent, 0.55)} 0%, ${accent} 100%)`,
                      boxShadow: `0 0 18px ${withAlpha(accent, 0.25)}`,
                    }}
                  />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.9 + i * 0.12 }}
                  style={{ flexShrink: 0, width: "clamp(5rem, 7vw, 7rem)", fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)", letterSpacing: "0.04em", color: textMuted }}
                >
                  {r.note ?? quality(r.value)}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Payoff + source */}
        <div className="flex flex-col" style={{ gap: "0.6rem" }}>
          {payoff ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 + rows.length * 0.12 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
                color: textPrimary,
                lineHeight: 1.35,
                maxWidth: "40em",
                borderLeft: `2px solid ${accent}`,
                paddingLeft: "1rem",
              }}
            >
              <EditableText path="payoff" value={payoff ?? ""}>{payoff}</EditableText>
            </motion.div>
          ) : null}
          {source ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)", letterSpacing: "0.18em", textTransform: "uppercase", color: textMuted }}>
              <EditableText path="source" value={source}>{source}</EditableText>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
