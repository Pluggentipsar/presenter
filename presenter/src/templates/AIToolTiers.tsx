"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

type TierKey = "secure" | "moderate" | "open";

interface AIToolTiersProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  closing?: string;
  background?: string;
  overlay?: number | string;
  /**
   * Markdown-lista — varje rad är en tier:
   * `- TIER · NAMN · headline · attribut1; attribut2; ...`
   *
   * TIER: secure | moderate | open
   *
   * Exempel:
   * - secure · Copilot Arbete · Säkraste valet · Inloggad med jobbkonto; Avtal med Microsoft; Tillgång till intern data
   */
  children?: ReactNode;
}

interface Tier {
  key: TierKey;
  name: string;
  headline: string;
  attributes: string[];
}

const TIER_CONFIG: Record<
  TierKey,
  { label: string; numeral: string; color: string; bgTint: string; safetyLabel: string }
> = {
  secure: {
    label: "Säker zon",
    numeral: "I",
    color: "#5DBE7B",
    bgTint: "rgba(93,190,123,0.07)",
    safetyLabel: "Avtalad behandling · OK för internt arbete",
  },
  moderate: {
    label: "Mellan-zon",
    numeral: "II",
    color: "#E9B36B",
    bgTint: "rgba(233,179,107,0.07)",
    safetyLabel: "Avtal — men begränsad åtkomst till data",
  },
  open: {
    label: "Öppen zon",
    numeral: "III",
    color: "#E84D4D",
    bgTint: "rgba(232,77,77,0.06)",
    safetyLabel: "Ingen avtalsrelation · endast öppen info",
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

function parseTiers(children: ReactNode): Tier[] {
  const tiers: Tier[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (parts.length < 4) return;
    const key = parts[0].toLowerCase();
    if (key !== "secure" && key !== "moderate" && key !== "open") return;
    tiers.push({
      key: key as TierKey,
      name: parts[1],
      headline: parts[2],
      attributes: parts[3]
        .split(/\s*;\s*/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
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
 * AIToolTiers — tre tier-kort sida vid sida för "Vilken AI får jag använda när?".
 * Färgkodade per säkerhetsnivå (grön/gul/röd), stora romerska siffror, animerade
 * accent-staplar i sidan av varje kort. Stagger-reveal.
 *
 * Tänkt för slidet "Tre nivåer av AI på din dator" där Comparison-mallen
 * inte räcker till.
 */
export function AIToolTiers({
  chapter,
  title,
  subtitle,
  closing,
  background,
  overlay,
  children,
}: AIToolTiersProps) {
  const tiers = parseTiers(children);
  const activeStep = useSlideSteps(tiers.length + 1);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 4rem)",
          gap: "clamp(1rem, 2vh, 1.8rem)",
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
                maxWidth: "44em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Tier cards */}
        <div
          className="flex flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
            gap: "clamp(1rem, 1.6vw, 1.6rem)",
            alignItems: "stretch",
          }}
        >
          {tiers.map((tier, i) => {
            const cfg = TIER_CONFIG[tier.key];
            const visible = activeStep > i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={
                  visible
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0.08, y: 24, filter: "blur(8px)" }
                }
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "0.85rem",
                  overflow: "hidden",
                  border: `1px solid ${cfg.color}45`,
                  background: cfg.bgTint,
                  boxShadow: visible
                    ? `0 22px 50px -28px rgba(0,0,0,0.5), 0 0 50px ${cfg.color}20, inset 0 0 0 1px ${cfg.color}28`
                    : "none",
                  minHeight: 0,
                }}
              >
                {/* Vertical accent strip (left edge) */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "5px",
                    background: `linear-gradient(180deg, ${cfg.color} 0%, ${cfg.color}88 100%)`,
                    boxShadow: `0 0 16px ${cfg.color}80`,
                  }}
                />

                {/* Big roman numeral as background ornament */}
                <div
                  style={{
                    position: "absolute",
                    top: "-1.5rem",
                    right: "0.5rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(8rem, 14vw, 13rem)",
                    color: cfg.color,
                    opacity: 0.08,
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {cfg.numeral}
                </div>

                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: "clamp(1.4rem, 2.2vw, 2rem)",
                    paddingLeft: "clamp(1.6rem, 2.6vw, 2.4rem)",
                    gap: "clamp(0.85rem, 1.5vh, 1.2rem)",
                  }}
                >
                  {/* Tier label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div
                      style={{
                        width: "0.55rem",
                        height: "0.55rem",
                        borderRadius: "50%",
                        background: cfg.color,
                        boxShadow: `0 0 12px ${cfg.color}`,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: cfg.color,
                        fontWeight: 700,
                      }}
                    >
                      {cfg.label}
                    </div>
                  </div>

                  {/* Tool name */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.4rem, 2vw, 1.85rem)",
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                    }}
                  >
                    <EditableText path={`tiers[${i}].name`} value={tier.name}>
                      {tier.name}
                    </EditableText>
                  </div>

                  {/* Headline */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
                      lineHeight: 1.35,
                      color: "var(--text-muted)",
                    }}
                  >
                    <EditableText path={`tiers[${i}].headline`} value={tier.headline}>
                      {renderInline(tier.headline, cfg.color)}
                    </EditableText>
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: "1px",
                      background: `linear-gradient(90deg, ${cfg.color}50 0%, transparent 100%)`,
                      margin: "0.2rem 0",
                    }}
                  />

                  {/* Attributes */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "clamp(0.5rem, 1vh, 0.8rem)",
                      flex: 1,
                    }}
                  >
                    {tier.attributes.map((attr, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, x: -8 }}
                        animate={
                          visible
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0, x: -8 }
                        }
                        transition={{ duration: 0.4, delay: 0.2 + j * 0.06 }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(0.92rem, 1.15vw, 1.1rem)",
                          lineHeight: 1.4,
                          color: "var(--text)",
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            marginTop: "0.55em",
                            width: "0.32rem",
                            height: "0.32rem",
                            borderRadius: "50%",
                            background: cfg.color,
                            opacity: 0.85,
                          }}
                        />
                        <span style={{ flex: 1 }}>
                          <EditableText path={`tiers[${i}].attributes[${j}]`} value={attr}>
                            {renderInline(attr, cfg.color)}
                          </EditableText>
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Safety footer */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "0.8rem",
                      borderTop: `1px solid ${cfg.color}28`,
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.62rem, 0.75vw, 0.72rem)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: cfg.color,
                      opacity: 0.85,
                      lineHeight: 1.4,
                    }}
                  >
                    {cfg.safetyLabel}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Closing */}
        {closing ? (
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
              fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
              color: "var(--text)",
              maxWidth: "44em",
              lineHeight: 1.4,
              borderLeft: "2px solid var(--accent)",
              paddingLeft: "1rem",
            }}
          >
            <EditableText path="closing" value={closing ?? ""}>{closing}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
