"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface LixPanel {
  level: string;
  label: string;
  text: string;
}

interface LixPanelsProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  /** Prompten som visas överst som ChatGPT-bar. */
  prompt?: string;
  background?: string;
  accent?: string;
  /** ms per tecken i typewriter. Default 12. */
  typeSpeed?: number;
  /**
   * Markdown-lista — varje rad är en panel:
   *   - **Nivå** · Etikett · Texten
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
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

function parsePanels(children: ReactNode): LixPanel[] {
  const out: LixPanel[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 3) return;
    const levelRaw = parts[0].trim();
    const m = levelRaw.match(/^\*\*(.+?)\*\*$/);
    out.push({
      level: m ? m[1] : levelRaw,
      label: parts[1].trim(),
      text: parts.slice(2).join(" · ").trim(),
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

function TypewriterText({
  text,
  speed,
  start,
}: {
  text: string;
  speed: number;
  start: boolean;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!start) return;
    setTyped("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i > text.length) {
        clearInterval(iv);
        return;
      }
      setTyped(text.slice(0, i));
    }, speed);
    return () => clearInterval(iv);
  }, [start, text, speed]);

  return <>{typed}</>;
}

export function LixPanels({
  kicker,
  title,
  subtitle,
  prompt,
  background,
  accent = "var(--accent)",
  typeSpeed = 12,
  children,
}: LixPanelsProps) {
  const panels = parsePanels(children);
  const activeStep = useSlideSteps(Math.max(panels.length + 1, 1));
  // Step 0: prompt visible. Step 1+: panels revealed one by one.

  // När en foto-/URL-bakgrund sätts läggs en mörk scrim på (se resolveBackground),
  // så text ovanpå måste vara fast ljus oavsett tema. Utan foto följer texten temat.
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const textPrimary = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 3.5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.6rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5" style={{ flexShrink: 0 }}>
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
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3.2vw, 2.7rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: textPrimary,
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
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                color: textMuted,
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* ChatGPT-prompt-bar */}
        {prompt ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: "60em",
              background: "var(--text)",
              borderRadius: "1.1rem",
              padding: "0.9rem 1.15rem",
              boxShadow: "0 18px 50px -15px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              aria-hidden
              style={{
                width: "1.8rem",
                height: "1.8rem",
                borderRadius: "50%",
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(245,246,250,0.92)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ↳
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                color: "var(--bg)",
                lineHeight: 1.4,
              }}
            >
              <EditableText path="prompt" value={prompt ?? ""}>{prompt}</EditableText>
            </div>
          </motion.div>
        ) : null}

        {/* 3 Lix-paneler */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${panels.length}, 1fr)`,
            gap: "clamp(0.8rem, 1.3vw, 1.3rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {panels.map((panel, i) => {
            const revealed = i < activeStep;
            const revealDelay = 0.2 + i * 0.3;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={
                  revealed
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 30, scale: 0.96 }
                }
                transition={{
                  duration: 0.8,
                  delay: revealDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.9rem",
                  padding: "clamp(1.1rem, 1.5vw, 1.5rem) clamp(1.2rem, 1.6vw, 1.6rem)",
                  borderRadius: "0.8rem",
                  background: hasPhotoBg ? "rgba(247,241,230,0.07)" : "var(--bg-surface)",
                  backdropFilter: "blur(18px) saturate(140%)",
                  WebkitBackdropFilter: "blur(18px) saturate(140%)",
                  border: `1px solid ${withAlpha(accent, 0.25)}`,
                  boxShadow: `0 16px 40px -12px rgba(0,0,0,0.45), inset 0 1px 0 ${hasPhotoBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}, 0 0 30px -15px ${withAlpha(accent, 0.31)}`,
                  overflow: "hidden",
                }}
              >
                {/* Level badge */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(1.8rem, 2.8vw, 2.5rem)",
                      color: accent,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {panel.level}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {panel.label}
                  </div>
                </div>

                {/* Separator */}
                <div
                  aria-hidden
                  style={{
                    width: "2.5rem",
                    height: "2px",
                    background: accent,
                    opacity: 0.7,
                  }}
                />

                {/* Text med typewriter */}
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.85rem, 1vw, 1rem)",
                    lineHeight: 1.5,
                    color: textPrimary,
                    flex: 1,
                  }}
                >
                  <TypewriterText
                    text={panel.text}
                    speed={typeSpeed}
                    start={revealed}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
