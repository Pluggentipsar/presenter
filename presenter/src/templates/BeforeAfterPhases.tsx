"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BeforeAfterPhases — visualiserar lärarens designram (Före → AI → Efter).
 *
 * Tre stora fas-kolumner med fas-nummer, tidsmarkör, caption och frågor/komponenter.
 * Under kolumnerna ritas en tidslinje med pulserande prick som rör sig genom
 * faserna — visualiserar att det är ETT FLÖDE över tid.
 *
 * Sista fasen (Efter) får en subtil "länk åt höger"-effekt som indikerar att
 * den leder vidare till nästa akt (bedömning).
 *
 * Skiljer sig visuellt från JagAIJagFlow — denna är "lärarens arbetsbänk"
 * (planering, checklist) medan JagAIJagFlow är "kognitivt mikroflöde".
 *
 * MDX-format — varje listpunkt är en fas:
 *   `**Fas** · tidsmarkör · caption · item1 · item2 · item3 · ...`
 *
 * ```mdx
 * <BeforeAfterPhases chapter="§ Lärarens designram">
 * - **Före** · Innan lektionen · Vad eleven behöver med sig · Begrepp · Ämneskunskap · AI-medvetenhet
 * - **AI** · Under lektionen · Hur designar jag momentet · Agent · Prompt · Instruktioner
 * - **Efter** · Efter lektionen · Hur bedömer vi · Processlogg · Muntligt försvar · Prov
 * </BeforeAfterPhases>
 * ```
 */

interface BeforeAfterPhasesProps {
  chapter?: string;
  intro?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  /** Markera sista fasen som länk till nästa akt. Default true. */
  highlightLast?: boolean;
  /** Aktivera stegvis reveal — varje klick visar en fas åt gången. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface Phase {
  title: string;
  timeMark: string;
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
    if (parts.length < 3) return;
    const titleMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const title = titleMatch ? titleMatch[1].trim() : parts[0].trim();
    const timeMark = parts[1]?.trim() ?? "";
    const caption = parts[2]?.trim() ?? "";
    const items = parts.slice(3).map((s) => s.trim()).filter(Boolean);
    phases.push({ title, timeMark, caption, items });
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.06)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function BeforeAfterPhases({
  chapter,
  intro,
  background,
  overlay = 0.7,
  accent = "var(--accent)",
  highlightLast = true,
  stepped = true,
  children,
}: BeforeAfterPhasesProps) {
  const phases = parsePhases(children);
  // Stegsystem: en step per fas
  const totalSteps = stepped ? Math.max(1, phases.length) : 1;
  const activeStep = useSlideSteps(totalSteps);
  const visibleCount = stepped ? activeStep + 1 : phases.length;

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

        {/* Faser i grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${phases.length}, 1fr)`,
            gap: "clamp(1rem, 2vw, 2rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {phases.map((phase, i) => (
            <PhaseColumn
              key={i}
              phase={phase}
              index={i}
              total={phases.length}
              accent={accent}
              delay={stepped ? 0.2 : 0.5 + i * 0.4}
              isLast={i === phases.length - 1}
              highlightLast={highlightLast}
              isVisible={i < visibleCount}
              stepped={stepped}
            />
          ))}
        </div>

        {/* Tidslinje under alla faser */}
        <Timeline phaseCount={phases.length} accent={accent} delay={0.5 + phases.length * 0.4 + 0.3} />

        {/* Progress-indikator när stegvis */}
        {stepped && phases.length > 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              alignSelf: "center",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {phases.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep ? accent : "rgba(128,128,128,0.35)",
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {phases.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Fas-kolumn
// ============================================================================

function PhaseColumn({
  phase,
  index,
  total,
  accent,
  delay,
  isLast,
  highlightLast,
  isVisible,
  stepped,
}: {
  phase: Phase;
  index: number;
  total: number;
  accent: string;
  delay: number;
  isLast: boolean;
  highlightLast: boolean;
  isVisible: boolean;
  stepped: boolean;
}) {
  const isHighlighted = isLast && highlightLast;
  const phaseNumber = String(index + 1).padStart(2, "0");
  const dimmed = stepped && !isVisible;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: dimmed ? 0.12 : 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
        padding: "clamp(1.4rem, 2.5vh, 2.2rem) clamp(1.2rem, 2vw, 1.8rem)",
        background: isHighlighted
          ? `linear-gradient(160deg, ${withAlpha(accent, 0.12)} 0%, var(--bg-surface) 100%)`
          : "var(--bg-elevated)",
        border: `1px solid ${isHighlighted ? accent + "66" : "rgba(0,0,0,0.1)"}`,
        borderRadius: "0.5rem",
        boxShadow: isHighlighted
          ? `0 8px 40px ${withAlpha(accent, 0.2)}, inset 0 0 18px ${withAlpha(accent, 0.07)}, 12px 0 30px ${withAlpha(accent, 0.13)}`
          : "0 4px 20px rgba(0,0,0,0.12)",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Fas-nummer */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: accent,
        }}
      >
        Fas {phaseNumber} / {String(total).padStart(2, "0")}
      </div>

      {/* Stor titel */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(2rem, 3.2vw, 3.4rem)",
          color: "var(--text)",
          letterSpacing: "-0.03em",
          lineHeight: 0.95,
          textShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {phase.title}
      </div>

      {/* Tidsmarkör */}
      {phase.timeMark ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {phase.timeMark}
        </div>
      ) : null}

      {/* Caption */}
      {phase.caption ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
            color: "var(--text)",
            lineHeight: 1.3,
            paddingBottom: "clamp(0.4rem, 0.8vh, 0.7rem)",
            borderBottom: `1px solid ${withAlpha(accent, 0.2)}`,
          }}
        >
          {phase.caption}
        </div>
      ) : null}

      {/* Items */}
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
              fontSize: "clamp(0.9rem, 1.15vw, 1.2rem)",
              color: "var(--text)",
              lineHeight: 1.3,
              display: "flex",
              gap: "0.55rem",
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
              ✓
            </span>
            <span>{item}</span>
          </motion.div>
        ))}
      </div>

      {/* "Länk till akt 3"-pil för sista fasen */}
      {isHighlighted ? (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: delay + 1.0 }}
          style={{
            position: "absolute",
            top: "1.4rem",
            right: "1.2rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
            opacity: 0.85,
          }}
        >
          → Akt 3
        </motion.div>
      ) : null}
    </motion.div>
  );
}

// ============================================================================
// Tidslinje under alla faser
// ============================================================================

function Timeline({
  phaseCount,
  accent,
  delay,
}: {
  phaseCount: number;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      style={{
        position: "relative",
        height: "clamp(1.5rem, 3vh, 2.5rem)",
        margin: "0 clamp(2rem, 4vw, 4rem)",
      }}
    >
      {/* Horisontell linje */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background: `linear-gradient(to right, transparent 0%, ${withAlpha(accent, 0.4)} 8%, ${withAlpha(accent, 0.53)} 50%, ${withAlpha(accent, 0.4)} 92%, transparent 100%)`,
          transformOrigin: "left",
        }}
      />

      {/* Fasnoder */}
      {Array.from({ length: phaseCount }).map((_, i) => {
        const left = ((i + 0.5) / phaseCount) * 100;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.4 + i * 0.15 }}
            style={{
              position: "absolute",
              top: "50%",
              left: `${left}%`,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: accent,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 12px ${accent}, 0 0 4px ${accent}`,
            }}
          />
        );
      })}

      {/* Pulserande prick som rör sig genom tidslinjen */}
      <motion.div
        aria-hidden
        animate={{
          left: ["2%", "98%", "98%", "2%", "2%"],
          opacity: [0, 1, 0, 0, 0],
        }}
        transition={{
          duration: 6,
          times: [0, 0.45, 0.55, 0.95, 1],
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 1.2,
        }}
        style={{
          position: "absolute",
          top: "50%",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: accent,
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 16px ${accent}, 0 0 32px ${withAlpha(accent, 0.6)}`,
        }}
      />

      {/* Etiketter under linjen */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 0.8rem)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        <span>Tid →</span>
      </div>
    </motion.div>
  );
}
