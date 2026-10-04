"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ChatArtifact ★ — chatt till vänster, den genererade ARTEFAKTEN stor till höger.
 *
 * Byggd för "Bildstöd på en minut": FloatingImage-overlay ovanpå ChatPreview
 * krockade med rubriken och lämnade chatten halvtom. Här är resultatet en
 * likvärdig halva av sliden: konversationen stegas fram, och när AI-svaret
 * med bilden avtäcks DIFFUSERAR artefakten in i högerpanelen (blur → skarp),
 * som en bildgenerering som blir klar.
 *
 * Återanvändbar för varje "prompt → visuell artefakt"-slide: bildstöd,
 * infografik, quiz-skärmdump, schema. Ljusa illustrationer visas hela
 * (object-contain mot ljus yta) — beskärs aldrig.
 *
 * ```mdx
 * <ChatArtifact kicker="§ Lärvux" title="Bildstöd på en minut"
 *   widgetName="Copilot"
 *   image="/bilder/.../schema.png" imageAlt="..." imageCaption="Sju steg · en minut"
 *   imageAppearsAfter={2}>
 * - **Du:** Skapa ett visuellt schema för första dagen på APL …
 * - **Copilot:** Här är schemat — sju steg, samma figur rakt igenom.
 * - **Du:** Gör en likadan serie för …
 * - **Copilot:** *[tre bilder i samma stil]*
 * </ChatArtifact>
 * ```
 */

interface ChatMessage {
  role: "user" | "ai";
  speaker: string;
  text: string;
}

interface ChatArtifactProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Appnamn i fönsterlisten. Default "Copilot". */
  widgetName?: string;
  /** Artefakten — bilden som genereras. */
  image: string;
  imageAlt?: string;
  /** Caption under artefakten. */
  imageCaption?: string;
  /** Efter vilket meddelande (1-baserat) artefakten visas. Default 2. */
  imageAppearsAfter?: number | string;
  accent?: string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseMessages(children: ReactNode): ChatMessage[] {
  const out: ChatMessage[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const m = t.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
    if (!m) return;
    const speaker = m[1].trim();
    const isUser = /^(du|jag|elev|läraren|lärare|user)\b/i.test(speaker);
    out.push({ role: isUser ? "user" : "ai", speaker, text: m[2].trim() });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*[^*]+\*)/g).map((p, i) =>
    p.startsWith("*") && p.endsWith("*") ? (
      <em key={i} style={{ opacity: 0.75 }}>{p.slice(1, -1)}</em>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ChatArtifact({
  kicker,
  chapter,
  title,
  subtitle,
  widgetName = "Copilot",
  image,
  imageAlt,
  imageCaption,
  imageAppearsAfter = 2,
  accent = "var(--accent)",
  children,
}: ChatArtifactProps) {
  const messages = parseMessages(children);
  const step = useSlideSteps(messages.length);
  const shown = Math.min(step + 1, messages.length);
  const imageAfter = Number(imageAppearsAfter) || 2;
  const artifactVisible = shown >= imageAfter;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 24% 20%, var(--bg-surface) 0%, var(--bg) 70%)",
        padding: "clamp(1.8rem, 3.5vh, 3rem) clamp(2.2rem, 4vw, 4.2rem)",
        gap: "clamp(0.9rem, 2vh, 1.4rem)",
      }}
    >
      {/* Topprad */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
          {kicker ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: accent,
              }}
            >
              <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
            </span>
          ) : <span />}
          {chapter ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.8vw, 0.82rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
            </span>
          ) : null}
        </div>
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              margin: "0.3rem 0 0",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.8rem, 3.2vw, 3rem)",
              letterSpacing: "var(--heading-tracking)",
              lineHeight: 1.05,
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              margin: "0.35rem 0 0",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
              color: "var(--text-muted)",
              maxWidth: "52ch",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* Två paneler */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 11fr) minmax(0, 9fr)",
          gap: "clamp(1.4rem, 2.6vw, 2.6rem)",
          alignItems: "stretch",
        }}
      >
        {/* Chatten */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "1rem",
            overflow: "hidden",
            background: "var(--bg-elevated)",
            border: `1px solid ${withAlpha(accent, 0.2)}`,
            boxShadow: "0 18px 44px -18px rgba(0,0,0,0.35)",
            minHeight: 0,
          }}
        >
          {/* Fönsterlist */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              padding: "0.7rem 1.1rem",
              borderBottom: `1px solid ${withAlpha(accent, 0.15)}`,
              background: "color-mix(in srgb, var(--bg-surface) 70%, transparent)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }} aria-hidden>
              {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                <span key={c} style={{ width: "0.65rem", height: "0.65rem", borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "clamp(0.85rem, 1vw, 1rem)", color: "var(--text)", lineHeight: 1.1 }}>
                {widgetName}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.62rem, 0.75vw, 0.75rem)", color: "var(--text-muted)" }}>
                <span style={{ color: "#28C840" }}>●</span> Online nu
              </div>
            </div>
          </div>

          {/* Meddelanden */}
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: "clamp(0.6rem, 1.4vh, 1rem)",
              padding: "clamp(0.9rem, 1.6vh, 1.4rem) clamp(0.9rem, 1.4vw, 1.4rem)",
            }}
          >
            {messages.map((msg, i) => {
              const on = i < shown;
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, y: on ? 0 : 14, scale: on ? 1 : 0.97 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    padding: "clamp(0.65rem, 1.2vh, 0.95rem) clamp(0.9rem, 1.3vw, 1.2rem)",
                    borderRadius: isUser ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                    background: isUser
                      ? accent
                      : "color-mix(in srgb, var(--text) 7%, var(--bg-surface))",
                    color: isUser ? "var(--bg)" : "var(--text)",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.92rem, 1.15vw, 1.15rem)",
                    lineHeight: 1.45,
                    boxShadow: isUser ? `0 8px 20px -8px ${withAlpha(accent, 0.5)}` : "0 4px 14px -8px rgba(0,0,0,0.25)",
                  }}
                >
                  {renderInline(msg.text)}
                </motion.div>
              );
            })}
          </div>

          {/* Inmatningsrad (dekor) */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              gap: "0.7rem",
              alignItems: "center",
              padding: "0.7rem 1rem",
              borderTop: `1px solid ${withAlpha(accent, 0.12)}`,
            }}
          >
            <div
              style={{
                flex: 1,
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
                color: "var(--text-muted)",
                background: "color-mix(in srgb, var(--text) 5%, transparent)",
                borderRadius: "999px",
                padding: "0.5em 1em",
              }}
            >
              Skriv ditt meddelande…
            </div>
            <div
              aria-hidden
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--bg)",
                fontSize: "0.85rem",
              }}
            >
              ➤
            </div>
          </div>
        </div>

        {/* Artefakten */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: 0 }}>
          <motion.div
            initial={false}
            animate={{
              opacity: artifactVisible ? 1 : 0.25,
              scale: artifactVisible ? 1 : 0.98,
            }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              borderRadius: "1rem",
              background: "#FCFAF4",
              border: `1.5px solid ${artifactVisible ? withAlpha(accent, 0.45) : "color-mix(in srgb, var(--text) 12%, transparent)"}`,
              boxShadow: artifactVisible
                ? `0 24px 55px -22px rgba(0,0,0,0.45), 0 0 34px -18px ${withAlpha(accent, 0.4)}`
                : "0 12px 30px -20px rgba(0,0,0,0.3)",
              padding: "clamp(0.7rem, 1.3vh, 1.1rem)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.6s ease, box-shadow 0.6s ease",
            }}
          >
            {/* Platshållare innan genereringen */}
            {!artifactVisible ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  color: "#9AA39E",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  ▨
                </motion.div>
                Väntar på prompten…
              </div>
            ) : null}
            <motion.img
              src={image}
              alt={imageAlt ?? ""}
              initial={false}
              animate={
                artifactVisible
                  ? { opacity: 1, filter: "blur(0px)", scale: 1 }
                  : { opacity: 0, filter: "blur(22px)", scale: 1.05 }
              }
              transition={{ duration: 1.1, ease: EASE }}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "0.4rem",
              }}
            />
          </motion.div>
          {imageCaption ? (
            <motion.div
              initial={false}
              animate={{ opacity: artifactVisible ? 1 : 0, y: artifactVisible ? 0 : 6 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              style={{
                flexShrink: 0,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="imageCaption" value={imageCaption}>{imageCaption}</EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
