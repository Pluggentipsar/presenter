"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface LiveDemoEmbedProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Prompt-texten som visas i vänster panel. Stödjer radbrytning och **bold**. */
  prompt?: string;
  /** Etikett för prompt-panelen. Default "PROMPT". */
  promptLabel?: string;
  /** Modellnamn (visas under prompt-panelen). Default "Microsoft Copilot". */
  modelLabel?: string;
  /** URL till embed (typiskt /embeds/foo.html för en static fil i public). */
  embedSrc?: string;
  /** Etikett ovan iframen. Default "INTERAKTIV DEMO". */
  embedLabel?: string;
  /** Subtitel under embed-label (kort beskrivning av outputen). */
  embedSubtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
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
    // Preserve line breaks
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>
        {p}
      </span>
    );
  });
}

/**
 * LiveDemoEmbed — split-layout med prompt till vänster och en interaktiv
 * iframe-embed till höger. Tänkt för att visa "AI som verktygsbyggare" —
 * du visar prompten du skickade och resultatet är klickbart, scrollbart,
 * fungerande i realtid.
 *
 * embedSrc pekar typiskt på en static HTML-fil i `public/embeds/`. Iframen
 * har inga sandbox-begränsningar by default — content körs som vanlig
 * webbsida (kan klicka, scrolla, interagera).
 *
 * Knappar:
 * - "Öppna i nytt fönster" — öppnar embedSrc i ny tab för helskärm
 * - Subtil "klicka för att fokusera"-state om iframe
 */
export function LiveDemoEmbed({
  chapter,
  title,
  subtitle,
  prompt,
  promptLabel = "Prompt",
  modelLabel = "Microsoft Copilot",
  embedSrc,
  embedLabel = "Resultat",
  embedSubtitle,
  background,
  accent = "#B4763A",
  overlay,
}: LiveDemoEmbedProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(1.75rem, 3vw, 3rem)",
          gap: "clamp(0.85rem, 1.6vh, 1.4rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.35rem", maxWidth: "60em" }}>
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
                opacity: 0.85,
              }}
            >
              <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.5rem, 3vw, 2.6rem)",
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "44em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Split panel: prompt | iframe */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 38fr) minmax(0, 62fr)",
            gap: "clamp(0.85rem, 1.6vw, 1.4rem)",
            minHeight: 0,
          }}
        >
          {/* Prompt panel */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "0.75rem",
              border: `1px solid ${withAlpha(accent, 0.21)}`,
              background: "var(--bg-elevated)",
              boxShadow: `0 0 40px ${withAlpha(accent, 0.08)}, inset 0 0 0 1px ${withAlpha(accent, 0.08)}`,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {/* Prompt header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                padding: "clamp(0.7rem, 1.2vw, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
                borderBottom: `1px solid ${withAlpha(accent, 0.19)}`,
                background: `linear-gradient(90deg, ${withAlpha(accent, 0.09)} 0%, transparent 100%)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 12px ${accent}`,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: accent,
                    fontWeight: 700,
                  }}
                >
                  <EditableText path="promptLabel" value={promptLabel}>{promptLabel}</EditableText>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.72vw, 0.72rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                <EditableText path="modelLabel" value={modelLabel}>{modelLabel}</EditableText>
              </div>
            </div>

            {/* Prompt body */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "clamp(1rem, 1.6vw, 1.4rem)",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
                lineHeight: 1.55,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              <EditableText path="prompt" value={prompt ?? ""}>
                {renderInline(prompt ?? "", accent)}
              </EditableText>
            </div>
          </motion.div>

          {/* Embed panel */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "0.75rem",
              border: focused
                ? `2px solid ${accent}`
                : `1px solid ${withAlpha(accent, 0.31)}`,
              background: "var(--bg-elevated)",
              boxShadow: focused
                ? `0 0 60px ${withAlpha(accent, 0.31)}, inset 0 0 0 1px ${withAlpha(accent, 0.19)}`
                : `0 0 40px ${withAlpha(accent, 0.12)}, inset 0 0 0 1px ${withAlpha(accent, 0.12)}`,
              overflow: "hidden",
              minHeight: 0,
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
          >
            {/* Embed header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                padding: "clamp(0.7rem, 1.2vw, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
                borderBottom: `1px solid ${withAlpha(accent, 0.19)}`,
                background: `linear-gradient(90deg, ${withAlpha(accent, 0.09)} 0%, transparent 100%)`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                {/* Window dots */}
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <div style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: "#FF5F57" }} />
                  <div style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: "#FEBC2E" }} />
                  <div style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: "#28C840" }} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: accent,
                    fontWeight: 700,
                    marginLeft: "0.4rem",
                  }}
                >
                  <EditableText path="embedLabel" value={embedLabel}>{embedLabel}</EditableText>
                </div>
                {embedSubtitle ? (
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                      color: "var(--text-muted)",
                      marginLeft: "0.4rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <EditableText path="embedSubtitle" value={embedSubtitle ?? ""}>
                      · {embedSubtitle}
                    </EditableText>
                  </div>
                ) : null}
              </div>
              {embedSrc ? (
                <a
                  href={embedSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.72vw, 0.72rem)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    border: `1px solid ${withAlpha(accent, 0.25)}`,
                    borderRadius: "0.3rem",
                    padding: "0.3rem 0.55rem",
                    flexShrink: 0,
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = accent;
                    e.currentTarget.style.borderColor = accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.borderColor = `${withAlpha(accent, 0.25)}`;
                  }}
                >
                  Öppna ↗
                </a>
              ) : null}
            </div>

            {/* Iframe */}
            {embedSrc ? (
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  background: "#fff",
                  minHeight: 0,
                }}
                onMouseEnter={() => setFocused(true)}
                onMouseLeave={() => setFocused(false)}
              >
                <iframe
                  src={embedSrc}
                  title="Live demo"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: 0,
                    display: "block",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                }}
              >
                Ingen embedSrc angiven
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
