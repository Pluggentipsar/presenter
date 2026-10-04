"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * SOLOGraph — visualiserar SOLO-taxonomin som ett växande nätverk av noder.
 *
 * Varje SOLO-nivå representeras som en stage där noder och kopplingar bygger
 * ut sig:
 *
 *  Prestructural   → Förvirrade prickar utan ordning
 *  Unistructural   → EN nod blir tydlig
 *  Multistructural → FLERA noder, men isolerade
 *  Relational      → Noder kopplas med linjer (samband synas)
 *  Extended Abstract → Hela nätverket lyser, pulser sänds mellan noder
 *
 * Klick: bygg upp en nivå åt gången. Vid varje stadium tonar nivåns namn
 * och eleven-citat fram bredvid grafen.
 *
 * MDX-format — fyra eller fem rader (en per nivå):
 *
 * ```mdx
 * <SOLOGraph chapter="§ SOLO-taxonomin" intro="Hur DJUPT förstår eleven?">
 * - Prestructural · "AI har rätt." · Inget perspektiv
 * - Unistructural · "Stämmer med boken." · En aspekt
 * - Multistructural · "Nämner X och Y, men inte Z." · Flera, isolerade
 * - Relational · "Passar i kontext A men ger fel signal i B." · Integrerat
 * - Extended Abstract · "Vad säger AI-svaret om hur kunskap formas?" · Transcendent
 * </SOLOGraph>
 * ```
 */

interface SOLOGraphProps {
  chapter?: string;
  intro?: string;
  background?: string;
  overlay?: number;
  accent?: string;
  children?: ReactNode;
}

interface Level {
  name: string;
  quote: string;
  hint: string;
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

function parseLevels(children: ReactNode): Level[] {
  const levels: Level[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 1) return;
    levels.push({
      name: parts[0]?.trim() ?? "",
      quote: parts[1]?.trim() ?? "",
      hint: parts.slice(2).join(" · ").trim(),
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
  return levels;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(5,3,8,${a}), rgba(5,3,8,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

// ============================================================================
// Pseudo-random för deterministiska node-positioner
// ============================================================================

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface NodePos {
  x: number;
  y: number;
  size: number;
}

function generateNodes(count: number, centerX: number, centerY: number, spread: number): NodePos[] {
  const rnd = mulberry32(42);
  const nodes: NodePos[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * spread;
    nodes.push({
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      size: 6 + rnd() * 4,
    });
  }
  return nodes;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function SOLOGraph({
  chapter,
  intro,
  background,
  overlay = 0.78,
  accent = "var(--accent)",
  children,
}: SOLOGraphProps) {
  const levels = useMemo(() => parseLevels(children), [children]);
  // Stegsystem: en step per nivå
  const totalSteps = Math.max(1, levels.length);
  const activeStep = useSlideSteps(totalSteps);

  // När en foto-/URL-bakgrund anges läggs en mörk scrim på (se resolveBackground),
  // så texten måste då vara fast ljus oavsett tema. Utan bild följer texten temat.
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const textColor = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  // Nodernas positions för max-stadium (Extended Abstract)
  // Vi använder samma noder genom alla stadier — bara fler tänds
  const allNodes = useMemo(() => generateNodes(12, 300, 250, 180), []);

  // Vilka noder lyser per stadium?
  // 0 (Prestructural): 4 svaga prickar utan ordning
  // 1 (Unistructural): 1 stark nod (mitten)
  // 2 (Multistructural): 4 noder, isolerade
  // 3 (Relational): 8 noder + linjer
  // 4 (Extended Abstract): alla 12 noder + alla linjer + pulser
  const visibleNodeCount = (() => {
    switch (activeStep) {
      case 0:
        return 0; // bara svaga prickar
      case 1:
        return 1;
      case 2:
        return 4;
      case 3:
        return 8;
      default:
        return 12;
    }
  })();

  // Vilka linjer ritas?
  const showRelations = activeStep >= 3;
  const showAllRelations = activeStep >= 4;
  const showPulses = activeStep >= 4;

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
            color: mutedColor,
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

      {/* Innehåll: split-layout med graf till vänster, nivå-info till höger */}
      <div
        className="relative flex h-full"
        style={{
          padding: "clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(2rem, 4vw, 4rem)",
          alignItems: "stretch",
          zIndex: 2,
        }}
      >
        {/* Graf-panel */}
        <div
          style={{
            flex: "1 1 55%",
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg
            viewBox="0 0 600 500"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", maxHeight: "70vh" }}
          >
            {/* Bakgrundsnoder (Prestructural-stadium): svaga prickar utan ordning */}
            {activeStep === 0 ? (
              <PrestructuralChaos accent={accent} />
            ) : null}

            {/* Linjer (Relational + Extended Abstract) */}
            {showRelations
              ? allNodes.slice(0, visibleNodeCount).map((nodeA, i) =>
                  allNodes
                    .slice(0, visibleNodeCount)
                    .map((nodeB, j) => {
                      if (j <= i) return null;
                      // Ej alla linjer i stadium 3 — mer i stadium 4
                      const distance = Math.hypot(
                        nodeA.x - nodeB.x,
                        nodeA.y - nodeB.y,
                      );
                      const threshold = showAllRelations ? 220 : 130;
                      if (distance > threshold) return null;
                      return (
                        <RelationLine
                          key={`${i}-${j}`}
                          x1={nodeA.x}
                          y1={nodeA.y}
                          x2={nodeB.x}
                          y2={nodeB.y}
                          accent={accent}
                          delay={0.3 + (i + j) * 0.05}
                          showPulse={showPulses}
                        />
                      );
                    }),
                )
              : null}

            {/* Synliga noder */}
            {allNodes.slice(0, visibleNodeCount).map((node, i) => (
              <SOLONode
                key={i}
                node={node}
                index={i}
                accent={accent}
                isCenter={activeStep === 1 && i === 0}
                pulse={showPulses}
              />
            ))}

            {/* Center-nod för Unistructural-stadium */}
            {activeStep === 1 ? (
              <motion.circle
                cx={300}
                cy={250}
                r={14}
                fill={accent}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 12px ${accent})` }}
              />
            ) : null}
          </svg>
        </div>

        {/* Nivå-panel: namn + citat + hint för aktuell nivå */}
        <div
          style={{
            flex: "0 0 36%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "clamp(0.8rem, 1.5vh, 1.4rem)",
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
                fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
                color: mutedColor,
                lineHeight: 1.3,
                paddingBottom: "clamp(0.4rem, 0.8vh, 0.7rem)",
                borderBottom: `1px solid ${withAlpha(accent, 0.2)}`,
              }}
            >
              <EditableText path="intro" value={intro}>
                {intro}
              </EditableText>
            </motion.div>
          ) : null}

          {/* Aktuell nivå */}
          {levels[activeStep] ? (
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.6rem, 1.2vh, 1rem)",
              }}
            >
              {/* Stage-räknare */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 700,
                }}
              >
                Nivå {activeStep + 1} / {levels.length}
              </div>

              {/* Nivå-namn */}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(1.6rem, 2.6vw, 2.6rem)",
                  color: textColor,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                }}
              >
                {levels[activeStep].name}
              </div>

              {/* Citat (elevens svar) */}
              {levels[activeStep].quote ? (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                    color: textColor,
                    lineHeight: 1.35,
                    paddingLeft: "0.9rem",
                    borderLeft: `2px solid ${withAlpha(accent, 0.53)}`,
                  }}
                >
                  {levels[activeStep].quote}
                </div>
              ) : null}

              {/* Hint */}
              {levels[activeStep].hint ? (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(0.85rem, 1.1vw, 1.1rem)",
                    color: mutedColor,
                    lineHeight: 1.35,
                    marginTop: "0.3rem",
                  }}
                >
                  — {levels[activeStep].hint}
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {/* Progress-indikator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: mutedColor,
              marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {levels.map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background:
                      i <= activeStep
                        ? accent
                        : hasPhotoBg
                          ? "rgba(245,246,250,0.35)"
                          : withAlpha(accent, 0.25),
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Förvirrade prickar (Prestructural-stadium)
// ============================================================================

function PrestructuralChaos({ accent }: { accent: string }) {
  const dots = useMemo(() => {
    const rnd = mulberry32(99);
    return Array.from({ length: 14 }, () => ({
      x: 100 + rnd() * 400,
      y: 100 + rnd() * 300,
      size: 2 + rnd() * 3,
      twinkleDelay: rnd() * 2,
    }));
  }, []);

  return (
    <>
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.size}
          fill={accent}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 2.5,
            delay: d.twinkleDelay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
        />
      ))}
    </>
  );
}

// ============================================================================
// SOLO-nod
// ============================================================================

function SOLONode({
  node,
  index,
  accent,
  isCenter,
  pulse,
}: {
  node: NodePos;
  index: number;
  accent: string;
  isCenter: boolean;
  pulse: boolean;
}) {
  return (
    <motion.circle
      cx={node.x}
      cy={node.y}
      r={isCenter ? 14 : node.size}
      fill={accent}
      initial={{ opacity: 0, scale: 0 }}
      animate={
        pulse
          ? {
              opacity: [0.7, 1, 0.7],
              scale: [1, 1.15, 1],
            }
          : { opacity: 1, scale: 1 }
      }
      transition={
        pulse
          ? {
              duration: 2 + (index % 3) * 0.5,
              delay: 0.2 + index * 0.08,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : {
              duration: 0.6,
              delay: 0.2 + index * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      style={{
        filter: `drop-shadow(0 0 ${pulse ? 14 : 8}px ${accent})`,
      }}
    />
  );
}

// ============================================================================
// Relations-linje (med valfri puls)
// ============================================================================

function RelationLine({
  x1,
  y1,
  x2,
  y2,
  accent,
  delay,
  showPulse,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent: string;
  delay: number;
  showPulse: boolean;
}) {
  return (
    <>
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={accent}
        strokeWidth="1.5"
        strokeOpacity={showPulse ? 0.6 : 0.4}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {showPulse ? (
        <motion.circle
          r={3}
          fill={accent}
          initial={{ opacity: 0 }}
          animate={{
            cx: [x1, x2, x2],
            cy: [y1, y2, y2],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            delay: delay + 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 2,
          }}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />
      ) : null}
    </>
  );
}
