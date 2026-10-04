"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PromptTransformProps {
  /** Liten mono-kicker överst. */
  kicker?: string;
  /** Prompten som driver förvandlingen. */
  prompt: string;
  /** Etikett för steg 1. Default "Prompten". */
  promptLabel?: string;
  /** Etikett för steg 2. Default "Uppgiften". */
  beforeLabel?: string;
  /** Rubrik på "före"-dokumentet. */
  beforeTitle?: string;
  /** Den svåra texten (väggen). */
  beforeText: string;
  /** Etikett för steg 3. Default "Resultatet". */
  afterLabel?: string;
  accent?: string;
  background?: string;
  /** "Efter"-innehållet som markdown: `# Titel`, `## Sektion`, brödtext, `- punkt`. */
  children?: ReactNode;
}

interface AfterSection {
  header?: string;
  body?: string;
  items: string[];
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

function parseAfter(children: ReactNode): { title?: string; sections: AfterSection[] } {
  let title: string | undefined;
  const sections: AfterSection[] = [];
  let current: AfterSection | null = null;

  const ensure = (): AfterSection => {
    if (!current) {
      current = { items: [] };
      sections.push(current);
    }
    return current;
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "h1") {
      title = extractText(el.props.children).trim();
      return;
    }
    if (t === "h2" || t === "h3") {
      current = { header: extractText(el.props.children).trim(), items: [] };
      sections.push(current);
      return;
    }
    if (t === "ul" || t === "ol") {
      const sec = ensure();
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const txt = extractText((li as ReactElement<{ children?: ReactNode }>).props.children).trim();
          if (txt) sec.items.push(txt);
        }
      });
      return;
    }
    if (t === "p") {
      const txt = extractText(el.props.children).trim();
      if (!txt) return;
      const sec = ensure();
      if (!sec.body && sec.items.length === 0) sec.body = txt;
      else sec.items.push(txt);
    }
  });

  return { title, sections };
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + " …" : clean;
}

const SPRING = { type: "spring" as const, stiffness: 260, damping: 30 };

/**
 * Prompt-driven förvandling som en 3-stegs fokus-reveal — byggd för digital
 * publik. Tre numrerade stadier staplade vertikalt: Prompten · Uppgiften ·
 * Resultatet. Allt kollapsat vid ankomst; varje klick fäller ut nästa stadium
 * stort och läsbart medan det förra blir en breadcrumb-rad. Resultatet staggrar
 * in sektion för sektion.
 *
 * Stegsystem: 4 steg (0 = allt kollapsat, 1 = prompt, 2 = uppgift, 3 = resultat).
 */
export function PromptTransform({
  kicker,
  prompt,
  promptLabel = "Prompten",
  beforeLabel = "Uppgiften",
  beforeTitle,
  beforeText,
  afterLabel = "Resultatet",
  accent = "var(--accent)",
  background,
  children,
}: PromptTransformProps) {
  const step = useSlideSteps(4);
  const activeIndex = step - 1; // -1 = allt kollapsat
  const { title: afterTitle, sections } = parseAfter(children);

  const rows = [
    { key: "prompt", label: promptLabel, teaser: truncate(prompt, 64) },
    { key: "uppgift", label: beforeLabel, teaser: truncate(beforeTitle || beforeText, 64) },
    { key: "result", label: afterLabel, teaser: truncate(afterTitle || "Den tillgängliga versionen", 64) },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2rem, 3.4vw, 3.2rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {kicker}
          </motion.div>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1.1vh, 0.95rem)",
          }}
        >
          {rows.map((row, i) => {
            const active = i === activeIndex;
            const done = i < activeIndex;
            return (
              <motion.div
                key={row.key}
                layout
                transition={{ layout: SPRING }}
                style={{
                  flex: active ? "1 1 0%" : "0 0 auto",
                  minHeight: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: active
                    ? "clamp(1.1rem, 1.7vw, 1.6rem)"
                    : "clamp(0.75rem, 1.1vw, 1.05rem) clamp(1.1rem, 1.7vw, 1.6rem)",
                  borderRadius: "1.1rem",
                  background: active
                    ? "var(--glass-card-bg, rgba(255,255,255,0.055))"
                    : "var(--glass-card-bg, rgba(255,255,255,0.03))",
                  backdropFilter: "blur(16px) saturate(150%) brightness(var(--glass-card-brightness, 100%))",
                  WebkitBackdropFilter: "blur(16px) saturate(150%) brightness(var(--glass-card-brightness, 100%))",
                  border: active
                    ? `1px solid ${withAlpha(accent, 0.55)}`
                    : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                  boxShadow: active
                    ? `var(--glass-card-shadow, 0 22px 60px -20px rgba(0,0,0,0.6)), 0 0 34px ${withAlpha(accent, 0.18)}`
                    : "var(--glass-card-shadow, 0 12px 30px -16px rgba(0,0,0,0.45))",
                  opacity: i > activeIndex && activeIndex >= 0 ? 0.55 : 1,
                }}
              >
                {/* Rad-header */}
                <motion.div layout="position" style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0 }}>
                  <StepBadge n={i + 1} active={active} done={done} accent={accent} />
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.72rem, 0.9vw, 0.92rem)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: active ? accent : "var(--text-muted)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {row.label}
                  </div>
                  {!active ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: done ? 0.9 : 0.6,
                      }}
                    >
                      {row.teaser}
                    </div>
                  ) : null}
                </motion.div>

                {/* Aktivt innehåll */}
                {active ? (
                  <motion.div
                    key={`content-${row.key}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      marginTop: "clamp(0.9rem, 1.6vh, 1.3rem)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {row.key === "prompt" ? (
                      <PromptContent prompt={prompt} accent={accent} />
                    ) : null}
                    {row.key === "uppgift" ? (
                      <UppgiftContent title={beforeTitle} text={beforeText} />
                    ) : null}
                    {row.key === "result" ? (
                      <ResultContent title={afterTitle} sections={sections} accent={accent} />
                    ) : null}
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepBadge({ n, active, done, accent }: { n: number; active: boolean; done: boolean; accent: string }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: "2.1rem",
        height: "2.1rem",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: "0.85rem",
        fontWeight: 700,
        background: active ? accent : done ? withAlpha(accent, 0.16) : "var(--glass-card-bg, rgba(255,255,255,0.05))",
        color: active ? "var(--bg)" : done ? accent : "var(--text-muted)",
        border: active ? "none" : `1px solid ${done ? withAlpha(accent, 0.5) : "var(--glass-border, rgba(255,255,255,0.14))"}`,
        boxShadow: active ? `0 0 22px ${withAlpha(accent, 0.6)}` : "none",
        transition: "background 0.4s, color 0.4s, box-shadow 0.4s, border 0.4s",
      }}
    >
      {done ? "✓" : String(n).padStart(2, "0")}
    </div>
  );
}

function PromptContent({ prompt, accent }: { prompt: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", maxWidth: "52em" }}>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: "2.4rem",
          height: "2.4rem",
          borderRadius: "50%",
          background: accent,
          color: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
      >
        DU
      </span>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.25rem, 2vw, 1.85rem)",
          fontWeight: 500,
          lineHeight: 1.4,
          letterSpacing: "-0.01em",
          color: "var(--text)",
        }}
      >
        {prompt}
      </p>
    </div>
  );
}

function UppgiftContent({ title, text }: { title?: string; text: string }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {title ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
            color: "var(--text)",
            marginBottom: "0.6rem",
            flexShrink: 0,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.78rem, 1vw, 1rem)",
            lineHeight: 1.55,
            textAlign: "justify",
            color: "var(--text-muted)",
            columnCount: 2,
            columnGap: "2.2rem",
          }}
        >
          {text}
        </p>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "3.5rem",
            background: "linear-gradient(to bottom, transparent, var(--bg))",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

function ResultContent({
  title,
  sections,
  accent,
}: {
  title?: string;
  sections: AfterSection[];
  accent: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
      style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      {title ? (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1.15rem, 1.7vw, 1.7rem)",
            letterSpacing: "-0.015em",
            color: "var(--text)",
            lineHeight: 1.1,
            marginBottom: "0.3rem",
            flexShrink: 0,
          }}
        >
          {title}
        </motion.div>
      ) : null}
      <div style={{ columnCount: 2, columnGap: "2.4rem", minHeight: 0 }}>
        {sections.map((sec, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            style={{
              breakInside: "avoid",
              marginBottom: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.22rem",
            }}
          >
            {sec.header ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.76vw, 0.76rem)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 700,
                }}
              >
                {sec.header}
              </div>
            ) : null}
            {sec.body ? (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.78rem, 0.98vw, 0.98rem)",
                  lineHeight: 1.4,
                  color: "var(--text)",
                }}
              >
                {sec.body}
              </div>
            ) : null}
            {sec.items.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.16rem" }}>
                {sec.items.map((it, j) => (
                  <li
                    key={j}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.76rem, 0.95vw, 0.95rem)",
                      lineHeight: 1.35,
                      color: "var(--text)",
                    }}
                  >
                    <span aria-hidden style={{ color: accent, flexShrink: 0 }}>·</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
