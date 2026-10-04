"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * JagAIJagFlow — visualiserar Joels Jag-AI-Jag-modell.
 *
 * Tre kognitiva faser horisontellt: JAG → AI → JAG. Eleven tänker själv
 * först, använder AI med avsikt, värderar sedan resultatet kritiskt.
 *
 * Centralt budskap: AI är ett verktyg som FORMAR och formas av elevens
 * tänkande — därför måste tänkandet finnas både före och efter.
 *
 * Pulserande accent-flöde rör sig kontinuerligt genom de tre faserna
 * och visualiserar att tänkandet "passerar igenom" AI utan att stanna där.
 *
 * MDX-format — varje listpunkt är en fas, format:
 *   `**Titel** · caption · item1 · item2 · item3 · ...`
 *
 * ```mdx
 * <JagAIJagFlow
 *   chapter="§ Jag-AI-Jag"
 *   closing="Du formar AI med dina frågor. AI formar dig med sina svar."
 * >
 * - **JAG** · Stanna upp. Tänk själv först. · Vad tror jag? · Vad vet jag?
 * - **AI** · Använd AI med avsikt. · Vad ber jag om? · Vilken roll ger jag AI?
 * - **JAG** · Tänk igen. Värdera. · Är svaret rimligt? · Bias?
 * </JagAIJagFlow>
 * ```
 */

interface JagAIJagFlowProps {
  chapter?: string;
  intro?: string;
  /** Avslutande mening under flödet (det stora citatet). */
  closing?: string;
  background?: string;
  overlay?: number | string;
  accent?: string;
  children?: ReactNode;
}

interface Phase {
  title: string;
  caption: string;
  items: string[];
}

// ============================================================================
// Parsing
// ============================================================================

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
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function parsePhases(children: ReactNode): Phase[] {
  const phases: Phase[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const titleMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const title = titleMatch ? titleMatch[1].trim() : parts[0].trim();
    const caption = parts[1]?.trim() ?? "";
    const items = parts.slice(2).map((s) => s.trim()).filter(Boolean);
    phases.push({ title, caption, items });
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
  return phases;
}

function renderInline(text: string, accentColor: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: accentColor, fontWeight: 700 }}>
          {chunk.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {chunk.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function JagAIJagFlow({
  chapter,
  intro,
  closing,
  background,
  overlay = 0.72,
  accent = "var(--accent)",
  children,
}: JagAIJagFlowProps) {
  const phases = parsePhases(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Innehåll */}
      <div
        className="relative flex h-full flex-col"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1.4rem, 3vh, 2.4rem)",
          zIndex: 2,
        }}
      >
        {/* Intro */}
        {intro ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              color: "var(--text-muted)",
              maxWidth: "32em",
              lineHeight: 1.3,
            }}
          >
            <EditableText path="intro" value={intro}>
              {intro}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Faser + pilar */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns:
              phases.length === 3
                ? "1fr auto 1fr auto 1fr"
                : `repeat(${phases.length}, 1fr)`,
            gap: "clamp(0.8rem, 2vw, 2rem)",
            alignItems: "stretch",
            minHeight: 0,
            position: "relative",
          }}
        >
          {phases.map((phase, i) => (
            <PhaseFragment
              key={i}
              phase={phase}
              accent={accent}
              delay={0.5 + i * 0.7}
              isLast={i === phases.length - 1}
              showArrow={phases.length === 3}
              isMiddle={i === 1}
            />
          ))}
        </div>

        {/* Closing-mening */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.5 + phases.length * 0.7 + 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
              color: "var(--text)",
              lineHeight: 1.35,
              maxWidth: "44em",
              alignSelf: "center",
              textAlign: "center",
              borderTop: `1px solid ${withAlpha(accent, 0.33)}`,
              paddingTop: "clamp(0.9rem, 1.8vh, 1.4rem)",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <EditableText path="closing" value={closing}>
              {renderInline(closing, accent)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// PhaseFragment — renderar fas + pil (om inte sista)
// ============================================================================

function PhaseFragment({
  phase,
  accent,
  delay,
  isLast,
  showArrow,
  isMiddle,
}: {
  phase: Phase;
  accent: string;
  delay: number;
  isLast: boolean;
  showArrow: boolean;
  isMiddle: boolean;
}) {
  return (
    <>
      <PhaseCard phase={phase} accent={accent} delay={delay} isMiddle={isMiddle} />
      {showArrow && !isLast ? (
        <FlowArrow accent={accent} delay={delay + 0.4} />
      ) : null}
    </>
  );
}

// ============================================================================
// Fas-kort
// ============================================================================

function PhaseCard({
  phase,
  accent,
  delay,
  isMiddle,
}: {
  phase: Phase;
  accent: string;
  delay: number;
  isMiddle: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.6rem, 1.4vh, 1.2rem)",
        padding: "clamp(1.2rem, 2.5vh, 2rem) clamp(1rem, 2vw, 1.8rem)",
        background: isMiddle
          ? `linear-gradient(160deg, ${withAlpha(accent, 0.13)} 0%, var(--bg-surface) 100%)`
          : "var(--bg-elevated)",
        border: `1px solid ${isMiddle ? accent + "66" : "rgba(0,0,0,0.1)"}`,
        borderRadius: "0.5rem",
        boxShadow: isMiddle
          ? `0 8px 40px ${withAlpha(accent, 0.2)}, inset 0 0 18px ${withAlpha(accent, 0.07)}`
          : "0 4px 20px rgba(0,0,0,0.12)",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Stor titel */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(2.5rem, 4.5vw, 4.5rem)",
          color: isMiddle ? accent : "var(--text)",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          textShadow: isMiddle ? `0 0 30px ${withAlpha(accent, 0.4)}` : "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {phase.title}
      </div>

      {/* Caption */}
      {phase.caption ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
            color: "var(--text)",
            lineHeight: 1.25,
            paddingBottom: "clamp(0.4rem, 0.8vh, 0.6rem)",
            borderBottom: `1px solid ${withAlpha(accent, 0.2)}`,
          }}
        >
          {phase.caption}
        </div>
      ) : null}

      {/* Frågor / items */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.4rem, 0.9vh, 0.7rem)",
        }}
      >
        {phase.items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.2 + i * 0.12 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
              color: "var(--text-muted)",
              lineHeight: 1.3,
              display: "flex",
              gap: "0.5rem",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                color: accent,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85em",
              }}
            >
              ›
            </span>
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Flödesspil — pulserande pil mellan faserna
// ============================================================================

function FlowArrow({ accent, delay }: { accent: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "clamp(2.5rem, 4vw, 4rem)",
        gap: "0.4rem",
      }}
    >
      <svg
        width="100%"
        height="32"
        viewBox="0 0 80 32"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: "5rem" }}
      >
        {/* Linje */}
        <motion.line
          x1="4"
          y1="16"
          x2="64"
          y2="16"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: delay + 0.1, ease: "easeOut" }}
        />
        {/* Pilspets */}
        <motion.path
          d="M 60 8 L 76 16 L 60 24"
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.9 }}
        />
        {/* Pulserande prick som rör sig genom pilen */}
        <motion.circle
          r="3.5"
          fill={accent}
          animate={{
            cx: [4, 76, 76, 4, 4],
            opacity: [0, 1, 0, 0, 0],
          }}
          transition={{
            duration: 4,
            times: [0, 0.4, 0.5, 0.95, 1],
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 1.2,
          }}
          style={{
            cy: 16,
            filter: `drop-shadow(0 0 6px ${accent})`,
          }}
        />
      </svg>
    </motion.div>
  );
}
