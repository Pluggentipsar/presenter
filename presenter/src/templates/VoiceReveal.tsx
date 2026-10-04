"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * VoiceReveal — flera citat som tonas in en i taget på presenter-stegning.
 *
 * Tänkt för "wall of voices"-moment där föreläsaren vill prata om varje
 * röst innan nästa kommer in. Aktuell röst lyser upp; tidigare röster
 * stannar kvar dimmade.
 *
 * MDX-format:
 * ```mdx
 * <VoiceReveal
 *   chapter="§ Sama, Nairobi"
 *   title="Vad de faktiskt såg."
 *   subtitle="Citat från arbetare som modererade träningsdata för ChatGPT."
 *   accent= "var(--accent)"
 *   background="..."
 * >
 * - Det var tortyr. · Sama-arbetare · Time, jan 2023
 * - Jag fick mardrömmar i månader. · Mophat Okinyi · NPR 2024
 * - ...
 * </VoiceReveal>
 * ```
 *
 * Format per rad: `Citat · Attribution · Källa` (källa optional).
 */

interface VoiceRevealProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.78. */
  overlay?: number | string;
  children?: ReactNode;
}

interface Voice {
  text: string;
  attribution: string;
  source: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
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

function parseVoices(children: ReactNode): Voice[] {
  const out: Voice[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const text = (parts[0] ?? "").trim();
    const attribution = (parts[1] ?? "").trim();
    const source = parts.slice(2).join(" · ").trim();
    if (!text) return;
    out.push({ text, attribution, source });
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
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

export function VoiceReveal({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: VoiceRevealProps) {
  const voices = useMemo(() => parseVoices(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(Math.max(voices.length, 1));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Chapter */}
      {chapter ? (
        <div
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
          {chapter}
        </div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          zIndex: 2,
        }}
      >
        {/* Titel + subtitle */}
        {(title || subtitle) && (
          <div style={{ flexShrink: 0, marginBottom: "clamp(1.5rem, 3vh, 2.5rem)", maxWidth: "min(1100px, 88%)" }}>
            {title ? (
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {renderInline(title, accent)}
              </motion.h2>
            ) : null}
            {subtitle ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                  color: "var(--text-muted)",
                  marginTop: "0.6rem",
                  lineHeight: 1.4,
                }}
              >
                {renderInline(subtitle, accent)}
              </motion.div>
            ) : null}
          </div>
        )}

        {/* Citat-vägg */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.5vh, 1.4rem)",
            minHeight: 0,
            justifyContent: "center",
            maxWidth: "min(1100px, 88%)",
          }}
        >
          {voices.map((voice, i) => {
            const visible = i <= step;
            const isLatest = i === step;
            // Subtil horisontell stagger för "voices"-känsla
            const xOffset = (i % 2 === 0 ? -1 : 1) * (i % 3) * 14;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: xOffset, y: 24, scale: 0.96 }}
                animate={{
                  opacity: visible ? (isLatest ? 1 : 0.5) : 0,
                  x: 0,
                  y: 0,
                  scale: visible ? (isLatest ? 1 : 0.985) : 0.96,
                  filter: visible
                    ? isLatest
                      ? "blur(0px)"
                      : "blur(0.3px)"
                    : "blur(8px)",
                }}
                transition={{
                  duration: 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  padding: "clamp(0.9rem, 1.5vw, 1.5rem) clamp(1.2rem, 2vw, 2rem)",
                  borderLeft: `3px solid ${isLatest ? accent : `${withAlpha(accent, 0.47)}`}`,
                  background: isLatest
                    ? "rgba(20, 18, 15, 0.65)"
                    : "rgba(20, 18, 15, 0.45)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: "0 0.4rem 0.4rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                  boxShadow: isLatest
                    ? `0 12px 32px -16px ${withAlpha(accent, 0.4)}`
                    : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.15rem, 1.75vw, 1.7rem)",
                    lineHeight: 1.32,
                    color: "var(--text)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  „{renderInline(voice.text, accent)}"
                </div>
                {(voice.attribution || voice.source) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem 0.9rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {voice.attribution ? <span>— {voice.attribution}</span> : null}
                    {voice.source ? <span style={{ color: "var(--text-muted)" }}>{voice.source}</span> : null}
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
