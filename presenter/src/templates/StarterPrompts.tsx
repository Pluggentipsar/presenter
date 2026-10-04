"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";
import { useSlideSteps } from "@/lib/slide-steps";

interface StarterPromptsProps {
  projector?: boolean;
  kicker?: string;
  title?: string;
  subtitle?: string;
  /** Antal kolumner. Default 3. */
  columns?: number;
  accent?: string;
  background?: string;
  /** Markdown-lista: `- Kategori :: Prompt-text` (en rad per kort). */
  children?: ReactNode;
}

interface PromptCard {
  category: string;
  text: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parsePrompts(children: ReactNode): PromptCard[] {
  const out: PromptCard[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText((li as ReactElement<{ children?: ReactNode }>).props.children).trim();
      const idx = raw.indexOf("::");
      if (idx === -1) {
        out.push({ category: "", text: raw });
      } else {
        out.push({ category: raw.slice(0, idx).trim(), text: raw.slice(idx + 2).trim() });
      }
    });
  });
  return out;
}

/**
 * Ett rutnät av steal-bara prompt-kort för läraren som vill komma igång.
 * Varje kort: kategori-chip + prompten i en chat-input-stil med send-pil.
 * Staggrad entré. För "avlastning som skapar värde"-beats.
 */
export function StarterPrompts({
  projector = false,
  kicker,
  title = "Sex prompter att stjäla — redan imorgon",
  subtitle,
  columns = 3,
  accent = "var(--accent)",
  background,
  children,
}: StarterPromptsProps) {
  const prompts = parsePrompts(children);
  const step = useSlideSteps(projector ? Math.max(prompts.length, 1) : 1);

  if (projector) return <section className="projection-prompts" data-projection-scene="prompts" data-phase={step}>
    <header><span className="projection-caption">{kicker}</span><h2>{title}</h2><p>{subtitle}</p></header>
    <div className="projection-prompt-tabs">{prompts.map((p, i) => <div key={p.category} data-active={i === step}><b>{String(i + 1).padStart(2, "0")}</b>{p.category}</div>)}</div>
    <article key={step} className="projection-prompt-text"><span className="projection-caption">PROMPT · {prompts[step]?.category}</span><p>{prompts[step]?.text}</p></article>
    <footer>Tre sätt att möta samma idé. <strong>Vilket ger eleverna något att göra?</strong></footer>
  </section>;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      <AmbientBackdrop background={background} accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.6vw, 3.4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2vh, 1.6rem)",
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          {kicker ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--room-caption, clamp(0.7rem, 0.88vw, 0.9rem))", letterSpacing: "0.32em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.35rem" }}>{kicker}</div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.9rem, 3.1vw, 3rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.04, color: "var(--text)", margin: 0 }}
          >
            {title}
          </motion.h2>
          {subtitle ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.35rem))", color: "var(--text-muted)", margin: "0.5rem 0 0", maxWidth: "46em" }}>{subtitle}</motion.p>
          ) : null}
        </div>

        {/* Rutnät av prompt-kort */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: "1fr",
            gap: "clamp(0.7rem, 1.3vw, 1.2rem)",
          }}
        >
          {prompts.map((p, i) => (
            <motion.div data-card=""
              key={i}
              variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
                minHeight: 0,
                padding: "clamp(1rem, 1.5vw, 1.4rem)",
                borderRadius: "1.1rem",
                background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 60%, " + withAlpha(accent, 0.08) + " 100%)",
                backdropFilter: "blur(18px) saturate(160%)",
                WebkitBackdropFilter: "blur(18px) saturate(160%)",
                border: `1px solid ${withAlpha(accent, 0.28)}`,
                boxShadow: `0 20px 50px -24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {p.category ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--room-caption, clamp(0.58rem, 0.74vw, 0.74rem))", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color: accent, padding: "0.22rem 0.6rem", borderRadius: "999px", background: withAlpha(accent, 0.14), border: `1px solid ${withAlpha(accent, 0.4)}` }}>
                    {p.category}
                  </span>
                </div>
              ) : null}

              {/* Prompt i input-stil */}
              <div data-card="flat"
                style={{
                  position: "relative",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "flex-start",
                  background: "var(--bg)",
                  border: `1px solid ${withAlpha(accent, 0.18)}`,
                  borderRadius: "0.8rem",
                  padding: "0.75rem 2.6rem 0.75rem 0.85rem",
                }}
              >
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: "var(--room-body, clamp(0.9rem, 1.08vw, 1.12rem))", lineHeight: 1.45, color: "var(--text)" }}>
                  {p.text}
                </p>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: "0.6rem",
                    bottom: "0.6rem",
                    width: "1.8rem",
                    height: "1.8rem",
                    borderRadius: "50%",
                    background: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 16px ${withAlpha(accent, 0.5)}`,
                  }}
                >
                  <svg width="48%" height="48%" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="rgba(245,246,250,0.95)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
