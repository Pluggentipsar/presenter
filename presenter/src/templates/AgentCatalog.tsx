"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText, EditableMedia } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface AgentItem {
  name: string;
  description: string;
}

interface AgentCatalogProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  tagline?: string;
  videoSrc?: string;
  videoAspect?: string;
  background?: string;
  accent?: string;
  /**
   * Markdown-lista — varje rad är en agent:
   *   - **Namn** · Kort beskrivning
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.75)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
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

function parseAgents(children: ReactNode): AgentItem[] {
  const out: AgentItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const nameRaw = parts[0].trim();
    const nameMatch = nameRaw.match(/^\*\*(.+?)\*\*$/);
    out.push({
      name: nameMatch ? nameMatch[1] : nameRaw,
      description: parts.slice(1).join(" · ").trim(),
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
  return out;
}

export function AgentCatalog({
  kicker,
  title,
  subtitle,
  tagline,
  videoSrc,
  videoAspect = "16 / 9",
  background,
  accent = "var(--accent)",
  children,
}: AgentCatalogProps) {
  const agents = parseAgents(children);

  // En foto-/URL-bakgrund får en mörk scrim (se resolveBackground) — då måste
  // header-texten ovanpå scrimmen vara fast ljus på BÅDA teman. Utan foto följer
  // texten temat (mörk på ljust tema, ljus på mörkt).
  const onScrim = Boolean(background && (background.startsWith("/") || background.startsWith("http")));
  const headingColor = onScrim ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative grid h-full w-full"
        style={{
          gridTemplateColumns: videoSrc ? "52% 48%" : "1fr",
          zIndex: 2,
        }}
      >
        {/* VÄNSTER: header + agent-katalog */}
        <div
          className="flex flex-col"
          style={{
            padding: "clamp(2.5rem, 4vw, 4rem)",
            gap: "clamp(1rem, 1.8vh, 1.6rem)",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          {/* Header */}
          <div className="flex flex-col gap-2">
            {kicker ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: onScrim ? "rgba(245,246,250,0.92)" : accent,
                  fontWeight: 600,
                }}
              >
                <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
              </motion.div>
            ) : null}
            {title ? (
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: headingColor,
                  margin: 0,
                  textShadow: "0 8px 40px rgba(0,0,0,0.4)",
                }}
              >
                <EditableText path="title" value={title ?? ""}>{title}</EditableText>
              </motion.h2>
            ) : null}
            {subtitle ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1rem, 1.2vw, 1.3rem)",
                  color: mutedColor,
                  margin: 0,
                  lineHeight: 1.4,
                  maxWidth: "28em",
                }}
              >
                <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
              </motion.p>
            ) : null}
          </div>

          {/* Agent-lista */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.5rem, 1vh, 0.8rem)",
            }}
          >
            {agents.map((agent, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.5 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.9rem",
                  padding: "clamp(0.7rem, 1vw, 0.95rem) clamp(0.9rem, 1.3vw, 1.2rem)",
                  borderRadius: "0.65rem",
                  background: "var(--bg-surface)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  WebkitBackdropFilter: "blur(16px) saturate(140%)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow:
                    "0 8px 20px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* Nummer-bubbla */}
                <div
                  style={{
                    flexShrink: 0,
                    width: "1.9rem",
                    height: "1.9rem",
                    borderRadius: "50%",
                    background: accent,
                    color: "var(--bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    marginTop: "0.15rem",
                    boxShadow: `0 4px 12px -4px ${withAlpha(accent, 0.5)}`,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                      color: "var(--text)",
                      lineHeight: 1.25,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {agent.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.82rem, 0.95vw, 0.95rem)",
                      color: "var(--text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {agent.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {tagline ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 + agents.length * 0.12 + 0.2 }}
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1rem",
                borderLeft: `3px solid ${accent}`,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                color: onScrim ? "rgba(245,246,250,0.92)" : accent,
                lineHeight: 1.4,
                maxWidth: "30em",
              }}
            >
              <EditableText path="tagline" value={tagline ?? ""}>{tagline}</EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* HÖGER: video */}
        {videoSrc ? (
          <div
            className="relative flex items-center justify-center"
            style={{ padding: "clamp(1.5rem, 2.5vw, 2.5rem)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden"
              style={{
                aspectRatio: videoAspect,
                width: "100%",
                height: "auto",
                maxHeight: "100%",
                borderRadius: "0.9rem",
                boxShadow: `0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px ${withAlpha(accent, 0.21)} inset, 0 0 40px -10px ${withAlpha(accent, 0.25)}`,
                background: "#0a0908",
              }}
            >
              <EditableMedia path="videoSrc" value={videoSrc ?? ""} mediaType="video" label="Agent-video">
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background: "#0a0908",
                  }}
                />
              </EditableMedia>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
