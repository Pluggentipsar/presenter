"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AnnexIIIComparison — dramatisk uppdelning mellan vad EU AI Act:s Annex III
 * fångar (högrisk) och vad det INTE fångar i utbildningssammanhang.
 *
 * Pedagogiskt grepp: skillnaden i visuell vikt MELLAN sidorna är poängen.
 * Högrisk-sidan ser tung ut — paragraf-stämplar i röd, formell typografi,
 * sigill-känsla. Inte-högrisk-sidan är lätta pillar i grön ton, lekfull layout.
 * Slutsats-raden binder ihop: "Skilj på de två. Det räcker långt."
 *
 * Stegsystem:
 * - Steg 0: Bara badge + rubriker
 * - Steg 1..N: Items revealas alternerande (vänster, höger, vänster, höger…)
 * - Sista steg: closing-rad lyfts in
 *
 * MDX-format:
 *   <AnnexIIIComparison
 *     badgeLabel="Annex III · §3 · Utbildning"
 *     title="Vad fångas av AI-förordningen — och vad gör det inte?"
 *     leftTitle="Högrisk"
 *     leftSubtitle="Kräver fullständig compliance"
 *     rightTitle="Inte högrisk"
 *     rightSubtitle="90 % av lärarvardagen"
 *     closing="Skilj på de två. Det räcker långt."
 *   >
 *   - Antagningsbeslut med AI · Lärare omformulerar text med Copilot
 *   - Bedömning av elevers prestation · Sammanfatta styrdokument
 *   - Nivåplaceringsbeslut · Studiehjälp utan bedömningskoppling
 *   - AI-proctoring under prov · Mötesprotokoll genereras
 *   </AnnexIIIComparison>
 */

interface AnnexIIIComparisonProps {
  chapter?: string;
  /** Mono-badge överst i mitten. */
  badgeLabel?: string;
  /** Underrubrik under badge. */
  title?: string;
  /** Rubrik vänster kolumn. */
  leftTitle?: string;
  /** Liten underrubrik vänster. */
  leftSubtitle?: string;
  /** Rubrik höger kolumn. */
  rightTitle?: string;
  /** Liten underrubrik höger. */
  rightSubtitle?: string;
  /** Slutsats-mening som visas i sista steget. */
  closing?: string;
  background?: string;
  overlay?: number | string;
  /** Markdown-lista. Varje rad: `Vänster · Höger`. */
  children?: ReactNode;
}

const RED = "#E15B4F";
const RED_GLOW = "rgba(225,91,79,0.45)";
const GREEN = "#67D49A";
const GREEN_GLOW = "rgba(103,212,154,0.40)";
const ACCENT = "#B4763A";

interface PairedRow {
  left: string;
  right: string;
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

function parseRows(children: ReactNode): PairedRow[] {
  const rows: PairedRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length >= 2) {
      rows.push({
        left: parts[0].trim(),
        right: parts.slice(1).join(" · ").trim(),
      });
    } else {
      rows.push({ left: raw, right: "" });
    }
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
  return rows;
}

function resolveBackground(
  bg: string | undefined,
  overlay: number | string
): string {
  if (!bg) {
    return "var(--slide-base, var(--bg))";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.65;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(
      1,
      a + 0.15
    )})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function AnnexIIIComparison({
  chapter,
  badgeLabel = "Annex III · §3 · Utbildning",
  title,
  leftTitle = "Högrisk",
  leftSubtitle,
  rightTitle = "Inte högrisk",
  rightSubtitle,
  closing,
  background,
  overlay = 0.65,
  children,
}: AnnexIIIComparisonProps) {
  const rows = useMemo(() => parseRows(children), [children]);
  // Steg: 0 = bara badge + titlar. Sen ett steg per rad. Sista steget = closing.
  const totalSteps = rows.length + 1;
  const step = useSlideSteps(totalSteps);
  const isFinal = step >= totalSteps;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Atmosfär: dubbel glow — röd vänster, grön höger */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 50% 60% at 25% 50%, rgba(225,91,79,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 75% 50%, rgba(103,212,154,0.10) 0%, transparent 60%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(247,241,230,0.025) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(1.75rem, 3.5vw, 3rem)",
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
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
        </div>
      ) : null}

      {/* Centerblock */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding:
            "clamp(4rem, 8vh, 6rem) clamp(2rem, 4vw, 4rem) clamp(2rem, 4vh, 3rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Top: badge + titel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem",
          }}
        >
          {badgeLabel ? (
            <motion.div
              initial={{ opacity: 0, y: -10, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.32em" }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                fontSize: "clamp(0.7rem, 0.95vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: ACCENT,
                fontWeight: 600,
                padding: "0.5rem 1.1rem",
                border: `1px solid ${ACCENT}66`,
                borderRadius: "999px",
                background: `linear-gradient(180deg, ${ACCENT}14 0%, ${ACCENT}06 100%)`,
                boxShadow: `0 0 24px ${ACCENT}33`,
              }}
            >
              <EditableText path="badgeLabel" value={badgeLabel}>
                {badgeLabel}
              </EditableText>
            </motion.div>
          ) : null}

          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display, Fraunces, serif)",
                fontWeight: 500,
                fontStyle: "italic",
                fontSize: "clamp(1.4rem, 2.4vw, 2.4rem)",
                lineHeight: 1.2,
                color: "var(--text)",
                margin: 0,
                textAlign: "center",
                maxWidth: "44rem",
                letterSpacing: "-0.015em",
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </motion.h2>
          ) : null}
        </div>

        {/* Två kolumner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "clamp(1.25rem, 2.5vw, 2.5rem)",
            alignItems: "start",
            flex: 1,
          }}
        >
          {/* VÄNSTER · Högrisk */}
          <ColumnHeader
            kind="risk"
            title={leftTitle}
            subtitle={leftSubtitle}
            delay={0.7}
            editPathTitle="leftTitle"
            editPathSubtitle="leftSubtitle"
          />

          {/* Divider */}
          <DividerLine />

          {/* HÖGER · Inte högrisk */}
          <ColumnHeader
            kind="ok"
            title={rightTitle}
            subtitle={rightSubtitle}
            delay={0.85}
            editPathTitle="rightTitle"
            editPathSubtitle="rightSubtitle"
          />

          {/* Vänster items — appears alternerande */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              gridColumn: "1",
              gridRow: "2",
            }}
          >
            {rows.map((row, i) => {
              // Vänster item visas vid step >= i*2+1
              const revealed = step >= i * 2 + 1;
              return (
                <RiskStamp
                  key={`L-${i}`}
                  text={row.left}
                  index={i}
                  revealed={revealed}
                />
              );
            })}
          </div>

          {/* Divider fortsätter */}
          <div style={{ gridColumn: "2", gridRow: "2" }} />

          {/* Höger items — appears alternerande */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              gridColumn: "3",
              gridRow: "2",
            }}
          >
            {rows.map((row, i) => {
              // Höger item visas vid step >= i*2+2
              const revealed = step >= i * 2 + 2;
              return (
                <OkPill
                  key={`R-${i}`}
                  text={row.right}
                  index={i}
                  revealed={revealed}
                />
              );
            })}
          </div>
        </div>

        {/* Closing */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={
              isFinal
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 14 }
            }
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "44rem",
              alignSelf: "center",
              padding: "1.1rem 1.5rem",
              borderTop: "1px solid rgba(247,241,230,0.15)",
              borderBottom: "1px solid rgba(247,241,230,0.15)",
              marginTop: "auto",
            }}
          >
            <EditableText path="closing" value={closing}>
              {closing}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Subcomponents ----------

function ColumnHeader({
  kind,
  title,
  subtitle,
  delay,
  editPathTitle,
  editPathSubtitle,
}: {
  kind: "risk" | "ok";
  title: string;
  subtitle?: string;
  delay: number;
  editPathTitle: string;
  editPathSubtitle: string;
}) {
  const color = kind === "risk" ? RED : GREEN;
  const glow = kind === "risk" ? RED_GLOW : GREEN_GLOW;
  const symbol = kind === "risk" ? "✕" : "✓";
  const gridColumn = kind === "risk" ? "1" : "3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      style={{
        gridColumn,
        gridRow: "1",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        alignItems: kind === "risk" ? "flex-start" : "flex-end",
        textAlign: kind === "risk" ? "left" : "right",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexDirection: kind === "risk" ? "row" : "row-reverse",
        }}
      >
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "999px",
            border: `2px solid ${color}`,
            background: `radial-gradient(circle at 30% 30%, ${withAlpha(color, 0.33)}, ${withAlpha(color, 0.07)})`,
            boxShadow: `0 0 18px ${glow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            fontWeight: 800,
            fontSize: "1rem",
            fontFamily: "var(--font-display, Fraunces, serif)",
          }}
        >
          {symbol}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color,
            fontWeight: 700,
          }}
        >
          <EditableText path={editPathTitle} value={title}>
            {title}
          </EditableText>
        </div>
      </div>
      {subtitle ? (
        <div
          style={{
            fontFamily: "var(--font-display, Fraunces, serif)",
            fontStyle: "italic",
            fontSize: "clamp(0.85rem, 1.05vw, 1.1rem)",
            color: "var(--text-muted)",
            letterSpacing: "-0.005em",
          }}
        >
          <EditableText path={editPathSubtitle} value={subtitle}>
            {subtitle}
          </EditableText>
        </div>
      ) : null}
    </motion.div>
  );
}

function DividerLine() {
  return (
    <div
      style={{
        gridColumn: "2",
        gridRow: "1 / span 2",
        position: "relative",
        width: "2px",
        alignSelf: "stretch",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(247,241,230,0.06)",
        }}
      />
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, ${RED}aa 0%, ${RED}40 35%, ${GREEN}40 65%, ${GREEN}aa 100%)`,
          transformOrigin: "top",
          boxShadow: `0 0 12px ${RED}40`,
        }}
      />
    </div>
  );
}

function RiskStamp({
  text,
  index,
  revealed,
}: {
  text: string;
  index: number;
  revealed: boolean;
}) {
  // Lite olika rotation för organisk stämpel-känsla
  const rotations = [-1.2, 0.8, -0.6, 1.0, -0.9];
  const rotate = rotations[index % rotations.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.92, rotate: rotate * 3 }}
      animate={
        revealed
          ? { opacity: 1, x: 0, scale: 1, rotate }
          : { opacity: 0, x: -20, scale: 0.92, rotate: rotate * 3 }
      }
      transition={{
        duration: 0.55,
        ease: [0.22, 1.2, 0.36, 1],
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        padding: "0.7rem 1rem 0.7rem 0.85rem",
        border: `1.5px solid ${RED}55`,
        borderRadius: "0.4rem",
        background: `linear-gradient(180deg, ${RED}14 0%, ${RED}06 100%)`,
        boxShadow: `0 4px 18px rgba(0,0,0,0.45), inset 0 0 0 1px ${RED}22`,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: RED,
          marginTop: "0.2rem",
          flexShrink: 0,
        }}
      >
        §{String(index + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display, Fraunces, serif)",
          fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
          lineHeight: 1.3,
          color: "var(--text)",
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

function OkPill({
  text,
  index,
  revealed,
}: {
  text: string;
  index: number;
  revealed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
      animate={
        revealed
          ? { opacity: 1, x: 0, filter: "blur(0px)" }
          : { opacity: 0, x: 20, filter: "blur(4px)" }
      }
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
        padding: "0.55rem 1rem 0.55rem 0.85rem",
      }}
    >
      <motion.div
        animate={{
          opacity: revealed ? [0.6, 1, 0.6] : 0.4,
          scale: revealed ? [0.85, 1, 0.85] : 0.85,
        }}
        transition={{
          duration: 2.4,
          delay: index * 0.3,
          repeat: revealed ? Infinity : 0,
          ease: "easeInOut",
        }}
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "999px",
          background: GREEN,
          boxShadow: `0 0 10px ${GREEN_GLOW}`,
          marginTop: "0.55rem",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-display, Fraunces, serif)",
          fontStyle: "italic",
          fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)",
          lineHeight: 1.35,
          color: "var(--text)",
          letterSpacing: "-0.005em",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}
