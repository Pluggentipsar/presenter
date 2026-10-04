"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

/**
 * HumanLoop — syntesmodellen i ai-relationer-elevhalsa: människa → AI →
 * människa. Byggd 2026-09-03 ur Utkastet "AI kan vara en mellanlandning".
 *
 * Tre noder på en linje. Vänster: eleven. Mitten: chatten. Höger: en
 * människa igen, som vid sista klicket fläktar ut i mottagare (vän,
 * förälder, kurator, vård, socialtjänst). Under mittnoden ligger den andra
 * vägen: en sluten slinga tillbaka in i chatten. Frågan sliden ställer är
 * inte om AI är bra eller dålig, utan om vägen tillbaka till människor finns
 * kvar.
 *
 * ```mdx
 * <HumanLoop
 *   kicker="§ Mellanlandningen"
 *   title="AI kan vara en mellanlandning"
 *   startLabel="Eleven"
 *   aiLabel="Chatten"
 *   endLabel="En människa"
 *   closedLabel="…eller samtalet stannar i chatten"
 *   landing="Frågan är om vägen tillbaka till **människor, stöd och verklig handling** finns kvar."
 * >
 * - En vän
 * - En förälder
 * - Kuratorn
 * - Vården
 * - Socialtjänsten
 * </HumanLoop>
 * ```
 *
 * **Steg:** 0) eleven → chatten · 1) → en människa, mottagarna fläktar ut ·
 * 2) den slutna slingan tänds · 3) landningen.
 */

interface HumanLoopProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  startLabel?: string;
  aiLabel?: string;
  endLabel?: string;
  closedLabel?: string;
  /** Landningsrad. **fet** → accent. */
  landing?: string;
  accent?: string;
  /** Markdown-lista med mottagare (visas vid steg 1). */
  children?: ReactNode;
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as { props?: { children?: ReactNode } };
    return extractText(el.props?.children);
  }
  return "";
}

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object" && "props" in node) {
      const el = node as { type?: unknown; props?: { children?: ReactNode } };
      if (el.type === "li") {
        const t = extractText(el.props?.children).trim();
        if (t) out.push(t);
        return;
      }
      walk(el.props?.children);
    }
  };
  walk(children);
  return out;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HumanLoop({
  kicker,
  chapter,
  title = "AI kan vara en mellanlandning",
  startLabel = "Eleven",
  aiLabel = "Chatten",
  endLabel = "En människa",
  closedLabel = "…eller samtalet stannar i chatten",
  landing,
  accent = "var(--accent)",
  children,
}: HumanLoopProps) {
  const recipients = parseItems(children);
  const step = useSlideSteps(4);
  const onward = step >= 1;
  const closed = step >= 2;
  const landed = step >= 3;

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  };

  const node: React.CSSProperties = {
    border: "2px solid var(--text)",
    padding: "clamp(0.9rem, 1.8vh, 1.4rem) clamp(1.2rem, 2vw, 2rem)",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.01em",
    fontSize: "clamp(1.1rem, 1.9vw, 1.8rem)",
    lineHeight: 1,
    color: "var(--text)",
    background: "var(--bg-elevated, transparent)",
    boxShadow: "var(--card-shadow, none)",
    whiteSpace: "nowrap",
  };

  // Ritytan: 1000 × 420 i viewBox-enheter. Noderna ligger i HTML ovanpå
  // för att typografin ska följa temat; pilarna ligger i SVG under.
  const W = 1000;
  const H = 420;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      {kicker ? (
        <div style={{ ...mono, position: "absolute", top: "clamp(2rem, 4vh, 3.2rem)", left: "clamp(2.5rem, 6vw, 6rem)" }}>
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}
      {chapter ? (
        <div style={{ ...mono, position: "absolute", top: "clamp(2rem, 4vh, 3.2rem)", right: "clamp(2.5rem, 6vw, 6rem)" }}>
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <h2
        style={{
          position: "absolute",
          top: "clamp(4.5rem, 10vh, 7rem)",
          left: "clamp(2.5rem, 6vw, 6rem)",
          right: "clamp(2.5rem, 6vw, 6rem)",
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)",
          letterSpacing: "var(--heading-tracking)",
          textTransform: "var(--heading-case)" as "normal" | "uppercase",
          fontSize: "calc(clamp(2rem, 4vw, 3.6rem) * var(--display-scale, 1))",
          lineHeight: 0.98,
          color: "var(--text)",
        }}
      >
        <EditableText path="title" value={title}>
          {title}
        </EditableText>
      </h2>

      {/* Loopen */}
      <div
        style={{
          position: "absolute",
          left: "clamp(2.5rem, 6vw, 6rem)",
          right: "clamp(2.5rem, 6vw, 6rem)",
          top: "34%",
          height: "44%",
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* eleven → chatten */}
          <motion.line
            x1={150} y1={120} x2={430} y2={120}
            stroke="var(--text)" strokeWidth={3}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: EASE }}
          />
          <polygon points="430,112 446,120 430,128" fill="var(--text)" />
          {/* chatten → människa */}
          <motion.line
            x1={570} y1={120} x2={850} y2={120}
            stroke={accent} strokeWidth={3}
            initial={{ pathLength: 0 }} animate={{ pathLength: onward ? 1 : 0 }} transition={{ duration: 0.7, ease: EASE }}
          />
          <motion.polygon points="850,112 866,120 850,128" fill={accent} initial={{ opacity: 0 }} animate={{ opacity: onward ? 1 : 0 }} transition={{ delay: 0.5 }} />
          {/* den slutna slingan under chatten */}
          <motion.path
            d="M 540 168 C 640 300, 360 300, 460 168"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={3}
            strokeDasharray="10 8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: closed ? 1 : 0, opacity: closed ? 1 : 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
          <motion.polygon points="452,176 468,164 462,182" fill="var(--text-muted)" initial={{ opacity: 0 }} animate={{ opacity: closed ? 1 : 0 }} transition={{ delay: 0.7 }} />
        </svg>

        {/* noderna */}
        <div style={{ position: "absolute", left: 0, top: "28.5%", transform: "translate(0, -50%)", width: "15%", display: "flex", justifyContent: "center" }}>
          <div style={node}>{startLabel}</div>
        </div>
        <div style={{ position: "absolute", left: "43%", top: "28.5%", transform: "translate(0, -50%)", width: "14%", display: "flex", justifyContent: "center" }}>
          <div style={{ ...node, background: accent, color: "#f2f0e9", borderColor: accent }}>{aiLabel}</div>
        </div>
        <motion.div
          initial={false}
          animate={{ opacity: onward ? 1 : 0.25 }}
          transition={{ duration: 0.5 }}
          style={{ position: "absolute", left: "86.6%", top: "28.5%", transform: "translate(0, -50%)", width: "14%", display: "flex", justifyContent: "center" }}
        >
          <div style={node}>{endLabel}</div>
        </motion.div>

        {/* mottagarna */}
        <div style={{ position: "absolute", left: "82%", right: 0, top: "48%", display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {recipients.map((r, i) => (
            <motion.span
              key={r}
              initial={false}
              animate={{ opacity: onward ? 1 : 0, y: onward ? 0 : 8 }}
              transition={{ duration: 0.45, delay: onward ? 0.35 + i * 0.12 : 0, ease: EASE }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--text)",
                padding: "0.3rem 0.55rem",
                color: "var(--text)",
              }}
            >
              {r}
            </motion.span>
          ))}
        </div>

        {/* etiketten på den slutna slingan */}
        <motion.div
          initial={false}
          animate={{ opacity: closed ? 1 : 0 }}
          transition={{ duration: 0.5, delay: closed ? 0.6 : 0 }}
          style={{ ...mono, position: "absolute", left: "30%", width: "40%", top: "78%", textAlign: "center", color: "var(--text-muted)" }}
        >
          {closedLabel}
        </motion.div>
      </div>

      {landing ? (
        <motion.p
          initial={false}
          animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 10 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            position: "absolute",
            left: "clamp(2.5rem, 6vw, 6rem)",
            right: "clamp(2.5rem, 6vw, 6rem)",
            bottom: "clamp(2rem, 5vh, 4rem)",
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.3rem, 2.4vw, 2.3rem)",
            lineHeight: 1.1,
            color: "var(--text)",
          }}
        >
          {renderInline(landing)}
        </motion.p>
      ) : null}
    </div>
  );
}
