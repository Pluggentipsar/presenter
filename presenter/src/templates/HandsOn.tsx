"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * HandsOn — "prova själv"-stopp för hands-on-pass. Tydlig uppgift till vänster
 * (rubrik + mål + numrerade steg + tid/verktyg-badges) och en kopierbar
 * exempel-prompt i ett chat-input-kort till höger. [Platshållare] markeras i
 * accent. Tänk: publiken stannar och gör något på sina egna enheter.
 *
 * ```mdx
 * <HandsOn
 *   kicker="§ Prova själv · 1"
 *   title="Förklara på ditt språk"
 *   goal="Gör ett svenskt ämnesbegrepp begripligt på ditt modersmål, på rätt nivå."
 *   time="10 min"
 *   tool="Copilot / din chattbot"
 *   prompt="Förklara [begrepp] på [ditt språk], nivå A2. Lyft ut svåra ord i en ordlista."
 *   tip="Byt ut [ditt språk] mot ditt modersmål — testa två nivåer."
 *   siteNote="Finns på sajten"
 * >
 * - Välj ett begrepp du faktiskt undervisar
 * - Kör prompten — läs svaret kritiskt
 * - Be om en enklare nivå och jämför
 * </HandsOn>
 * ```
 */

interface HandsOnProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  goal?: string;
  /** Tidsangivelse. Default "10 min". */
  time?: string;
  /** Verktyg. Default "Copilot / din chattbot". */
  tool?: string;
  /** Kopierbar exempel-prompt. [Platshållare] markeras i accent. */
  prompt?: string;
  tip?: string;
  /** Not om companion-sajten. */
  siteNote?: string;
  /** Rubrik för listan (t.ex. "Titta efter"). Utan = numrerade steg. */
  listLabel?: string;
  /** Aha-insikt som avtäcks med ett klick (debrief). */
  aha?: string;
  background?: string;
  accent?: string;
  /** Steg som markdown-lista i children. */
  children?: ReactNode;
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

function parseSteps(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") walkLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

function renderPrompt(text: string, accent: string): ReactNode {
  return text.split(/(\[[^\]]+\])/g).map((p, i) =>
    p.startsWith("[") && p.endsWith("]")
      ? <span key={i} style={{ color: accent, fontWeight: 600 }}>{p}</span>
      : <span key={i}>{p}</span>,
  );
}

function badgeStyle(accent: string, textColor: string): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.72rem, 0.9vw, 0.92rem)",
    letterSpacing: "0.04em",
    color: textColor,
    border: `1px solid ${withAlpha(accent, 0.35)}`,
    borderRadius: "var(--radius)",
    padding: "0.3rem 0.7rem",
    background: withAlpha(accent, 0.08),
    whiteSpace: "nowrap",
  };
}

export function HandsOn({
  kicker,
  title,
  subtitle,
  goal,
  time = "10 min",
  tool = "Copilot / din chattbot",
  prompt,
  tip,
  siteNote,
  listLabel,
  aha,
  background,
  accent = "var(--accent)",
  children,
}: HandsOnProps) {
  const steps = parseSteps(children);
  const activeStep = useSlideSteps(aha ? 2 : 1);
  const ahaVisible = !!aha && activeStep >= 1;
  // Foto-bakgrund får en mörk scrim för läsbarhet → texten ligger då på mörkt
  // oavsett tema, så den måste låsas till ljus. Default-bakgrunden följer temat.
  const onDarkScrim = !!background && (background.startsWith("/") || background.startsWith("http"));
  const bg = background
    ? (onDarkScrim
        ? `linear-gradient(rgba(10,9,8,0.7), rgba(10,9,8,0.82)), url('${background}') center/cover no-repeat`
        : background)
    : "var(--slide-base, var(--bg))";
  // Textfärger: följ temat på normal bakgrund, lås till ljus över foto-scrim.
  const textColor = onDarkScrim ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDarkScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 82% 28%, ${withAlpha(accent, 0.1)} 0%, transparent 70%)` }}
      />

      <div
        className="relative flex h-full w-full flex-col"
        style={{ padding: "clamp(2.5rem, 4.5vw, 5rem)", gap: "clamp(1rem, 2.2vh, 1.9rem)", zIndex: 2 }}
      >
        {/* PROVA SJÄLV-badge + kicker */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
          style={{ gap: "0.9rem", flexShrink: 0, flexWrap: "wrap" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.92rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--bg)",
              background: accent,
              padding: "0.4rem 0.95rem",
              borderRadius: "var(--radius)",
            }}
          >
            ● Prova själv
          </span>
          {kicker ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: mutedColor,
              }}
            >
              <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
            </span>
          ) : null}
        </motion.div>

        <div
          className="flex-1"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(1.5rem, 3vw, 3.5rem)", alignItems: "center", minHeight: 0 }}
        >
          {/* VÄNSTER: uppgift + steg */}
          <div className="flex flex-col" style={{ gap: "clamp(0.75rem, 1.6vh, 1.3rem)" }}>
            {title ? (
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(2rem, 4vw, 3.4rem)", lineHeight: 1.04, letterSpacing: "-0.02em", color: textColor, margin: 0 }}
              >
                <EditableText path="title" value={title}>{title}</EditableText>
              </motion.h2>
            ) : null}
            {subtitle ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)", color: accent, margin: 0, lineHeight: 1.2 }}
              >
                {subtitle}
              </motion.p>
            ) : null}
            {goal ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                style={{ fontFamily: "var(--font-body)", fontSize: "clamp(1rem, 1.3vw, 1.3rem)", color: mutedColor, margin: 0, lineHeight: 1.5, maxWidth: "26em" }}
              >
                <EditableText path="goal" value={goal}>{goal}</EditableText>
              </motion.p>
            ) : null}
            {steps.length > 0 ? (
              <div style={{ marginTop: "0.2rem" }}>
                {listLabel ? (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: mutedColor, marginBottom: "0.55rem" }}>{listLabel}</div>
                ) : null}
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {steps.map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.35 + i * 0.1 }}
                      style={{ display: "flex", gap: "0.7rem", alignItems: "baseline", fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 1.1vw, 1.12rem)", color: textColor, lineHeight: 1.4 }}
                    >
                      <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontWeight: 700, color: accent, minWidth: listLabel ? "1em" : "1.4em" }}>{listLabel ? "→" : `${i + 1}.`}</span>
                      <span>{s}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="flex items-center" style={{ gap: "0.6rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
              <span style={badgeStyle(accent, textColor)}>⏱ {time}</span>
              <span style={badgeStyle(accent, textColor)}>{tool}</span>
            </div>
          </div>

          {/* HÖGER: prompt-kort */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {prompt ? (
              <div
                style={{
                  borderRadius: "var(--radius)",
                  border: `1px solid ${withAlpha(accent, 0.45)}`,
                  background: "color-mix(in srgb, var(--bg-surface) 70%, transparent)",
                  backdropFilter: "blur(8px)",
                  boxShadow: `0 24px 60px -28px ${withAlpha(accent, 0.4)}`,
                  padding: "clamp(1.1rem, 1.8vw, 1.8rem)",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                  Prompt att utgå från
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)", lineHeight: 1.55, color: "var(--text)" }}>
                  {renderPrompt(prompt, accent)}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.9rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "2.2rem", height: "2.2rem", borderRadius: "999px", background: accent, color: "var(--bg)", fontWeight: 700 }}>↵</span>
                </div>
              </div>
            ) : null}
            {tip ? (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)", color: mutedColor, lineHeight: 1.45 }}>
                <span style={{ color: accent, fontWeight: 700 }}>Tips · </span>
                <EditableText path="tip" value={tip}>{tip}</EditableText>
              </div>
            ) : null}
            {siteNote ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", letterSpacing: "0.05em", color: mutedColor }}>
                → <EditableText path="siteNote" value={siteNote}>{siteNote}</EditableText>
              </div>
            ) : null}
          </motion.div>
        </div>

        {ahaVisible ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flexShrink: 0,
              borderRadius: "var(--radius)",
              border: `1px solid ${withAlpha(accent, 0.5)}`,
              background: "color-mix(in srgb, var(--bg-surface) 88%, transparent)",
              boxShadow: `0 20px 50px -28px ${withAlpha(accent, 0.5)}`,
              padding: "clamp(0.85rem, 1.5vw, 1.3rem) clamp(1.1rem, 2vw, 1.6rem)",
              display: "flex",
              gap: "1rem",
              alignItems: "baseline",
            }}
          >
            <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.24em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>Aha</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.92rem, 1.2vw, 1.2rem)", lineHeight: 1.45, color: "var(--text)" }}>{aha}</span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
