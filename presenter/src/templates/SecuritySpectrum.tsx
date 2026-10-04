"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type Tier = "green" | "yellow" | "red";

interface SecuritySpectrumProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Italic-citat längst ner. */
  tumregel?: string;
  background?: string;
  overlay?: number | string;
  /**
   * Markdown-lista med 3 nivåer i ordningen Grön → Gul → Röd.
   * Format per rad: `- TIER · Headline · item1; item2; item3`
   *
   * Tier: green | yellow | red
   *
   * Exempel:
   * - green · OK att skicka · Allmänna texter; Mallar; Idéer
   * - yellow · Tänk efter · Interna dokument; Bedömningar
   * - red · Aldrig · Personnummer; Sekretess; Hälsodata
   */
  children?: ReactNode;
}

interface TierData {
  tier: Tier;
  headline: string;
  items: string[];
}

const TIER_CONFIG: Record<
  Tier,
  { color: string; glow: string; label: string; bgTint: string; symbol: string }
> = {
  green: {
    color: "#5DBE7B",
    glow: "rgba(93,190,123,0.25)",
    label: "GRÖNT",
    bgTint: "rgba(93,190,123,0.06)",
    symbol: "✓",
  },
  yellow: {
    color: "#E9B36B",
    glow: "rgba(233,179,107,0.25)",
    label: "GULT",
    bgTint: "rgba(233,179,107,0.06)",
    symbol: "!",
  },
  red: {
    color: "#E84D4D",
    glow: "rgba(232,77,77,0.25)",
    label: "RÖTT",
    bgTint: "rgba(232,77,77,0.06)",
    symbol: "✕",
  },
};

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    const b = Math.min(1, a + 0.15);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseTiers(children: ReactNode): TierData[] {
  const tiers: TierData[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (parts.length < 3) return;
    const tierStr = parts[0].toLowerCase();
    if (tierStr !== "green" && tierStr !== "yellow" && tierStr !== "red") return;
    const headline = parts[1];
    const items = parts[2]
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    tiers.push({ tier: tierStr as Tier, headline, items });
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
  return tiers;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
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
 * SecuritySpectrum — trafikljus i tre kolumner för dataklassificering.
 * Grön / Gul / Röd avslöjas i sekvens via slide-steg (space). Varje kolumn
 * har egen färgtemperatur, glow och en lista av konkreta exempel. Italic
 * tumregel under kolumnerna ankrar hela slidan i en mening.
 */
export function SecuritySpectrum({
  chapter,
  title,
  subtitle,
  tumregel,
  background,
  overlay,
  children,
}: SecuritySpectrumProps) {
  const tiers = parseTiers(children);
  const activeStep = useSlideSteps(tiers.length + 1);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.55) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4vw, 4.5rem)",
          gap: "clamp(1.25rem, 2.5vh, 2.25rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.5rem", maxWidth: "44em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.85rem, 4.2vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "32em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Three-column traffic light */}
        <div
          className="flex flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
            gap: "clamp(1rem, 1.8vw, 2rem)",
            alignItems: "stretch",
          }}
        >
          {tiers.map((tier, i) => {
            const cfg = TIER_CONFIG[tier.tier];
            const visible = activeStep > i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={
                  visible
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0.1, y: 30, filter: "blur(8px)" }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: `1px solid ${cfg.color}40`,
                  background: cfg.bgTint,
                  boxShadow: visible
                    ? `0 0 60px ${cfg.glow}, inset 0 0 0 1px ${cfg.color}25`
                    : "none",
                }}
              >
                {/* Top color band with symbol */}
                <div
                  style={{
                    background: `linear-gradient(180deg, ${cfg.color}28 0%, ${cfg.color}10 100%)`,
                    borderBottom: `1px solid ${cfg.color}40`,
                    padding: "clamp(1rem, 2vw, 1.6rem)",
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(0.6rem, 1.2vw, 1rem)",
                  }}
                >
                  <div
                    style={{
                      width: "clamp(2.2rem, 3.5vw, 3rem)",
                      height: "clamp(2.2rem, 3.5vw, 3rem)",
                      borderRadius: "50%",
                      background: cfg.color,
                      color: "#0a0908",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(1.1rem, 1.8vw, 1.6rem)",
                      flexShrink: 0,
                      boxShadow: `0 0 24px ${cfg.glow}`,
                    }}
                  >
                    {cfg.symbol}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: cfg.color,
                        fontWeight: 700,
                      }}
                    >
                      {cfg.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
                        color: "var(--text)",
                        lineHeight: 1.15,
                      }}
                    >
                      <EditableText path={`tiers[${i}].headline`} value={tier.headline}>
                        {renderInline(tier.headline, cfg.color)}
                      </EditableText>
                    </div>
                  </div>
                </div>

                {/* Items list */}
                <div
                  style={{
                    flex: 1,
                    padding: "clamp(1rem, 2vw, 1.6rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(0.5rem, 1vh, 0.85rem)",
                  }}
                >
                  {tier.items.map((item, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, x: -10 }}
                      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                      transition={{ duration: 0.4, delay: 0.2 + j * 0.06 }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)",
                        color: "var(--text)",
                        lineHeight: 1.35,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: "0.4rem",
                          height: "0.4rem",
                          borderRadius: "50%",
                          background: cfg.color,
                          marginTop: "0.55em",
                          opacity: 0.8,
                        }}
                      />
                      <span style={{ flex: 1 }}>
                        <EditableText
                          path={`tiers[${i}].items[${j}]`}
                          value={item}
                        >
                          {renderInline(item, cfg.color)}
                        </EditableText>
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tumregel */}
        {tumregel ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: activeStep >= tiers.length ? 1 : 0,
              y: activeStep >= tiers.length ? 0 : 8,
            }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
              color: "var(--text-muted)",
              maxWidth: "44em",
              lineHeight: 1.4,
              borderLeft: "2px solid #B4763A",
              paddingLeft: "1rem",
            }}
          >
            <EditableText path="tumregel" value={tumregel ?? ""}>{tumregel}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
