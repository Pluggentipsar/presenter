"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface TierStackProps {
  /** Rubrik */
  title?: string;
  /** Liten tag (UPPERCASE) */
  tag?: string;
  /** Brödtext under titeln */
  description?: string;
  /** Layout: "horizontal" (default, side-by-side) | "vertical" (stack) */
  orientation?: "horizontal" | "vertical";
  titleSize?: Size;
  /**
   * Tiers i markdown-lista, format:
   * - **Etikett** · sub-text · longer description
   * eller
   * - **Etikett** · sub-text
   *
   * Tier 1 (första) har lägst accent-intensitet, sista har högst.
   */
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3vw, 2.25rem)",
  md: "clamp(2rem, 4vw, 3rem)",
  lg: "clamp(2.75rem, 5vw, 4.25rem)",
  xl: "clamp(3.5rem, 6.5vw, 5.5rem)",
};

interface Tier {
  label: string;
  sub?: string;
  desc?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseLi(li: ReactElement<{ children?: ReactNode }>): Tier {
  const raw = extractText(li.props.children).trim();
  const parts = raw.split("·").map((p) => p.trim());
  const label = parts[0]?.replace(/^\*\*(.*)\*\*$/, "$1") ?? "";
  const sub = parts[1];
  const desc = parts.slice(2).join(" · ");
  return { label, sub: sub || undefined, desc: desc || undefined };
}

function parseTiers(children: ReactNode): Tier[] {
  const tiers: Tier[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          tiers.push(parseLi(li as ReactElement<{ children?: ReactNode }>));
        }
      });
    } else if (el.type === "li") {
      tiers.push(parseLi(el));
    }
  });
  return tiers;
}

/**
 * TierStack — visar ett antal "nivåer" sida vid sida (eller staplade) med
 * progressivt ökande accent-intensitet. Perfekt för:
 *  - samtycke-/access-nivåer (NEJ → Anonym → Full identifiering)
 *  - severity-skalor
 *  - Bloom-taxonomi-stege
 *  - säkerhetsklassificering
 *
 * Format i children:
 * - **NEJ** · Ingen data alls · Användaren stannar helt anonym
 * - **Ja med kod** · Anonym tråd · Möjlighet att återkomma utan att avslöja vem
 * - **Ja med personuppgifter** · Full överlämning · Mänsklig handläggare tar över
 */
export function TierStack({
  title,
  tag,
  description,
  orientation = "horizontal",
  titleSize = "md",
  children,
}: TierStackProps) {
  const tiers = parseTiers(children);
  const n = Math.max(1, tiers.length);

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-8"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {(tag || title || description) && (
          <div className="flex flex-col gap-4">
            {tag && (
              <motion.span
                className="text-xs uppercase tracking-[0.35em]"
                style={{ color: "var(--accent)" }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
              </motion.span>
            )}
            {title && (
              <motion.h2
                className="leading-[1.05]"
                style={{
                  fontSize: TITLE_SIZES[titleSize],
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                  color: "var(--text)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <EditableText
                  path="title"
                  value={title ?? ""}
                  sizeControls={[
                    { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
                  ]}
                >{title}</EditableText>
              </motion.h2>
            )}
            {description && (
              <motion.p
                className="max-w-3xl leading-relaxed text-text-muted"
                style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <EditableText path="description" value={description ?? ""}>{description}</EditableText>
              </motion.p>
            )}
          </div>
        )}

        <div
          className={
            orientation === "horizontal"
              ? "grid gap-3"
              : "flex flex-col gap-3"
          }
          style={
            orientation === "horizontal"
              ? { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {tiers.map((tier, i) => {
            const intensity = (i + 1) / n; // 0..1
            const accentPct = Math.round(8 + intensity * 28); // 8% → 36%
            const borderPct = Math.round(20 + intensity * 50); // 20% → 70%
            const numberSize = orientation === "horizontal" ? "1.5rem" : "1.25rem";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.3 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative flex flex-col gap-3 p-6"
                data-card="paper"
                style={{
                  borderRadius: "var(--radius)",
                  border: `1px solid color-mix(in srgb, var(--accent) ${borderPct}%, transparent)`,
                  background: `linear-gradient(160deg, color-mix(in srgb, var(--accent) ${accentPct}%, transparent), color-mix(in srgb, var(--accent) ${Math.max(0, accentPct - 6)}%, transparent))`,
                  boxShadow:
                    intensity > 0.6
                      ? `0 30px 60px -30px color-mix(in srgb, var(--accent) ${Math.round(intensity * 50)}%, transparent)`
                      : undefined,
                }}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="leading-none"
                    style={{
                      fontSize: numberSize,
                      color: "var(--accent)",
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--heading-weight)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      background: `color-mix(in srgb, var(--accent) ${borderPct}%, transparent)`,
                    }}
                  />
                </div>
                <div
                  className="leading-tight"
                  style={{
                    fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)",
                    letterSpacing: "var(--heading-tracking)",
                    color: "var(--text)",
                  }}
                >
                  {tier.label}
                </div>
                {tier.sub && (
                  <div
                    className="text-xs uppercase tracking-[0.25em]"
                    style={{ color: "var(--accent)", opacity: 0.95 }}
                  >
                    {tier.sub}
                  </div>
                )}
                {tier.desc && (
                  <div
                    className="leading-snug text-text-muted"
                    style={{ fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)" }}
                  >
                    {tier.desc}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
