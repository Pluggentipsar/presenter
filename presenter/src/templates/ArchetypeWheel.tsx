"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  GlassCard,
} from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface ArchetypeWheelProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Linje längst nere — t.ex. "Vi bär flera samtidigt." */
  bottomLine?: string;
  background?: string;
  accent2?: string;
  /**
   * Markdown-lista med arketyper. Format: `- Namn · Beskrivning`
   * Använd `★ Namn` för att markera en arketyp som central (accent-border).
   */
  children?: ReactNode;
}

interface ArchetypeItem {
  name: string;
  description: string;
  starred: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseItems(children: ReactNode): ArchetypeItem[] {
  const out: ArchetypeItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          const starred = text.startsWith("★");
          const clean = text.replace(/^★\s*/, "");
          const parts = clean.split(/\s*·\s*/);
          out.push({
            name: parts[0] ?? "",
            description: parts.slice(1).join(" · "),
            starred,
          });
        }
      });
    }
  });
  return out;
}

/**
 * Sex arketyper i hexagonal 3x2-grid med subtle radial connection i bakgrunden.
 * Tänkt för nattglas-temat (premiärad maj 2026 i kallkritik-mellanstadielarare).
 *
 * Användning:
 * ```mdx
 * <ArchetypeWheel
 *   kicker="§ Sex berättelser"
 *   title="Vi möter inte AI neutralt. Vi möter vår berättelse om AI."
 * >
 * - Frälsaren · AI som ska lösa allt
 * - Förgöraren · AI som existentiellt hot
 * - Guden · AI som digital gudomlighet
 * - ★ Tjänaren · AI som verktyg (svensk skolans default)
 * - Spegeln · AI som mänsklighetens sammanställning
 * - Partnern · AI som någon att tänka med
 * </ArchetypeWheel>
 * ```
 */
export function ArchetypeWheel({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  background,
  accent2,
  children,
}: ArchetypeWheelProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop background={background} accent2={accent2} />

      {/* Subtle radial connection lines bakom korten */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id="archetype-halo" cx="50%" cy="55%" r="60%">
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity="0.45"
            />
            <stop
              offset="50%"
              stopColor="var(--accent)"
              stopOpacity="0.1"
            />
            <stop
              offset="100%"
              stopColor="var(--accent)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>
        <circle cx="50" cy="55" r="42" fill="url(#archetype-halo)" />
      </svg>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.6vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.4vh, 2rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : <span />}
          {chapter ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </div>
          ) : null}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ maxWidth: "44em", textAlign: "center", margin: "0 auto" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 3.4vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.7rem 0 0 0",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </p>
          ) : null}
        </motion.div>

        {/* Hexagonal-feel 3x2 grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            gap: "clamp(1rem, 1.8vw, 1.5rem)",
            alignItems: "stretch",
            minHeight: 0,
            position: "relative",
          }}
        >
          {items.slice(0, 6).map((item, i) => {
            // Stagger: cards på övre raden tidigare, mittenkort först
            const row = Math.floor(i / 3);
            const col = i % 3;
            const distanceFromCenter = Math.abs(col - 1) + row * 0.5;
            const delay = 0.25 + distanceFromCenter * 0.12;

            // Offset: andra raden får liten horisontell offset för hex-känsla
            const xOffset = row === 1 ? "5%" : "0";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 22, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 30,
                  delay,
                  mass: 0.9,
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  transform: `translateX(${xOffset})`,
                }}
              >
                <GlassCard
                  size="md"
                  options={{
                    radius: "1.25rem",
                    padding: "clamp(1.2rem, 2vw, 1.8rem)",
                  }}
                  style={
                    item.starred
                      ? {
                          border: `2px solid ${accent}`,
                          background: `linear-gradient(135deg, ${withAlpha(
                            "var(--accent)",
                            0.18,
                          )} 0%, ${withAlpha("var(--accent)", 0.05)} 100%)`,
                          boxShadow: `0 18px 52px -14px var(--accent-glow), 0 6px 18px rgba(0,0,0,0.4), inset 0 1px 0 ${withAlpha(
                            "var(--accent)",
                            0.42,
                          )}`,
                          height: "100%",
                        }
                      : { height: "100%" }
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.55rem",
                      height: "100%",
                    }}
                  >
                    {item.starred ? (
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.65rem",
                          letterSpacing: "0.32em",
                          textTransform: "uppercase",
                          color: accent,
                          fontWeight: 600,
                          marginBottom: "0.2rem",
                        }}
                      >
                        ★ Central
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1.4rem, 2vw, 2rem)",
                        fontWeight: 500,
                        letterSpacing: "-0.022em",
                        color: item.starred ? accent : "var(--text)",
                        lineHeight: 1.15,
                        textShadow: item.starred
                          ? `0 0 24px ${withAlpha("var(--accent)", 0.42)}`
                          : `0 0 18px ${withAlpha("var(--accent)", 0.12)}`,
                      }}
                    >
                      {item.name}
                    </div>
                    {item.description ? (
                      <p
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.85rem, 1vw, 1rem)",
                          color: "var(--text-muted)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.25 + Math.min(items.length, 6) * 0.12 + 0.2,
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.4rem)",
              color: "var(--text)",
              opacity: 1,
              textAlign: "center",
              maxWidth: "44em",
              margin: "0 auto",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="bottomLine" value={bottomLine ?? ""}>{bottomLine}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
