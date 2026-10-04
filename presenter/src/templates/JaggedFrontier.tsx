"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * JaggedFrontier — visualisering av "samma modell, olika uppgift".
 *
 * En horisontell kapacitetslinje. Varje par är en lodrät stapel:
 * dot uppåt (excellence) + label, dot neråt (weakness) + label.
 * Vid avslöjande sveps bakgrundens kapacitetslinje över skärmen,
 * sedan poppar dots och labels in i tur och ordning från vänster
 * till höger. Pulserande glöd på alla dots när de är synliga.
 *
 * MDX-format:
 * ```mdx
 * <JaggedFrontier
 *   chapter="§ Jagged Frontier"
 *   background="..."
 *   title="Samma modell. Olika uppgift."
 *   landing="Det här är jagged frontier."
 *   accent= "var(--accent)"
 * >
 * - Klarar juristexamen · Läser klockor 50,1%
 * - Skriver poesi över mänsklig nivå · Hittar på trovärdiga källor
 * - Vinner kodtävlingar · Snubblar på enkla pussel
 * </JaggedFrontier>
 * ```
 *
 * Format per rad: `Excellence · Weakness` (med " · " som separator).
 */

interface JaggedFrontierProps {
  chapter?: string;
  background?: string;
  accent?: string;
  overlay?: number;
  /** Liten titel ovanför visualiseringen. */
  title?: string;
  /** Kraftig slutsats nederst. */
  landing?: string;
  /** Visa diskreta axel-etiketter (default false — visualiseringen är självförklarande). */
  showAxisLabels?: boolean;
  /** Etikett vid övre axeln. Visas bara om showAxisLabels=true. */
  topLabel?: string;
  /** Etikett vid nedre axeln. Visas bara om showAxisLabels=true. */
  bottomLabel?: string;
  /** MDX-lista med par "Excellence · Weakness". */
  children?: ReactNode;
}

interface Pair {
  excellence: string;
  weakness: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parsePairs(children: ReactNode): Pair[] {
  const out: Pair[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!raw) return;
      const idx = raw.indexOf(" · ");
      if (idx > -1) {
        out.push({
          excellence: raw.slice(0, idx).trim(),
          weakness: raw.slice(idx + 3).trim(),
        });
      } else {
        out.push({ excellence: raw, weakness: "" });
      }
    });
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * Sant när slide-bakgrunden är ett foto med mörk scrim (eller en custom
 * icke-tema-bakgrund). Då måste texten vara fast ljus oavsett tema. När
 * bakgrunden följer temat (var(--bg)) ska texten följa temat så att den
 * blir mörk på ljusa teman som dagsljus.
 */
function hasDarkBackdrop(bg: string | undefined): boolean {
  if (!bg) return false;
  // Foto/url eller en explicit custom bakgrund (t.ex. egen gradient) som
  // inte är en ren tema-variabel → behandla som mörk backdrop.
  if (bg.startsWith("/") || bg.startsWith("http")) return true;
  return !bg.includes("var(--bg)");
}

// Fast ljus text när vi sitter ovanpå en mörk foto-scrim / custom backdrop.
const FIXED_LIGHT = "rgba(245,246,250,0.92)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

export function JaggedFrontier({
  chapter,
  background,
  accent = "var(--accent)",
  overlay = 0.6,
  title,
  landing,
  showAxisLabels = false,
  topLabel = "Excellence",
  bottomLabel = "Weakness",
  children,
}: JaggedFrontierProps) {
  const pairs = parsePairs(children);
  const n = pairs.length || 1;

  // På mörk foto-scrim / custom backdrop måste texten vara fast ljus.
  // Annars följer den temat (mörk på dagsljus, ljus på nattglas).
  const onDark = hasDarkBackdrop(background);
  const primaryColor = onDark ? FIXED_LIGHT : "var(--text)";
  const mutedColor = onDark ? FIXED_LIGHT_MUTED : "var(--text-muted)";
  // Textskugga bara meningsfull mot ett foto — på platt tema-bakgrund ger
  // en mörk skugga bakom mörk text bara grumlighet.
  const labelShadow = onDark ? "0 4px 18px rgba(0,0,0,0.65)" : "none";

  // Position varje stapel jämnt fördelat på bredd 70% (centrerat).
  // 70% padding: 15% vänster + 15% höger ger bra läsbarhet.
  const startX = 18;
  const endX = 82;
  const stepX = n > 1 ? (endX - startX) / (n - 1) : 0;
  const pillarPositions = pairs.map((_, i) =>
    n === 1 ? 50 : startX + i * stepX,
  );

  // Stagger: hela revealet ska kännas koreograferat
  const baseDelay = 0.2;
  const lineDuration = 1.3;
  const pairStagger = 0.45;
  const pairStartAfter = baseDelay + lineDuration - 0.4; // börja innan linjen är klar
  const landingDelay = pairStartAfter + n * pairStagger + 0.6;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter — uppe till höger */}
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
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Titel uppe — sätter framing. Vänsterställd så vi inte krockar med
          mittersta pillaren. */}
      {title ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "clamp(4vh, 5.5vh, 7vh)",
            left: "clamp(3rem, 6vw, 6rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 2.6vw, 2.6rem)",
            fontWeight: 500,
            fontStyle: "italic",
            letterSpacing: "-0.015em",
            color: primaryColor,
            maxWidth: "60%",
            zIndex: 4,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Landning nere — slogan */}
      {landing ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: landingDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: "clamp(6vh, 9vh, 12vh)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 2.6vw, 2.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: primaryColor,
            textAlign: "center",
            maxWidth: "80%",
            zIndex: 4,
          }}
        >
          <EditableText path="landing" value={landing}>
            <span
              dangerouslySetInnerHTML={{ __html: renderInline(landing, accent) }}
            />
          </EditableText>
        </motion.div>
      ) : null}

      {/* Stage med visualiseringen */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {/* Kapacitetslinjen — horisontellt mitten, sveps från vänster */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: lineDuration,
            delay: baseDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "10%",
            right: "10%",
            height: "1px",
            background: `linear-gradient(to right, transparent 0%, ${withAlpha(accent, 0.33)} 8%, ${accent} 50%, ${withAlpha(accent, 0.33)} 92%, transparent 100%)`,
            transformOrigin: "left",
          }}
        />
        {/* Mjuk glöd kring linjen */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: baseDelay + 0.3 }}
          style={{
            position: "absolute",
            top: "50%",
            left: "10%",
            right: "10%",
            height: "60px",
            transform: "translateY(-50%)",
            background: `radial-gradient(ellipse at center, ${withAlpha(accent, 0.13)} 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        {/* Axel-etiketter — bara om explicit påslagen. Default off för
            renare look (visualiseringen är självförklarande). */}
        {showAxisLabels ? (
          <>
            <AxisLabel
              text={topLabel}
              editPath="topLabel"
              y="11%"
              delay={baseDelay + 0.7}
              accent={accent}
            />
            <AxisLabel
              text={bottomLabel}
              editPath="bottomLabel"
              y="89%"
              delay={baseDelay + 0.7}
              accent={accent}
            />
          </>
        ) : null}

        {/* Varje par */}
        {pairs.map((pair, i) => {
          const x = pillarPositions[i];
          const delay = pairStartAfter + i * pairStagger;
          return (
            <Pillar
              key={i}
              x={x}
              excellence={pair.excellence}
              weakness={pair.weakness}
              delay={delay}
              accent={accent}
              onDark={onDark}
              primaryColor={primaryColor}
              mutedColor={mutedColor}
              labelShadow={labelShadow}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Pillar (en kolumn med excellence + weakness)
// ============================================================================

interface PillarProps {
  x: number;
  excellence: string;
  weakness: string;
  delay: number;
  accent: string;
  onDark: boolean;
  primaryColor: string;
  mutedColor: string;
  labelShadow: string;
}

function Pillar({
  x,
  excellence,
  weakness,
  delay,
  accent,
  onDark,
  primaryColor,
  mutedColor,
  labelShadow,
}: PillarProps) {
  const stemDuration = 0.55;
  const dotDelay = delay + stemDuration - 0.05;
  const labelDelay = dotDelay + 0.1;

  return (
    <>
      {/* Övre stam — växer uppåt från mitt-linjen */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: stemDuration, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: "22%",
          width: "1.5px",
          height: "28%",
          marginLeft: "-0.75px",
          background: `linear-gradient(to top, ${accent}, ${withAlpha(accent, 0.2)} 90%, transparent)`,
          transformOrigin: "bottom",
        }}
      />
      {/* Övre dot */}
      <Dot
        x={x}
        y={22}
        delay={dotDelay}
        accent={accent}
        kind="excellence"
        onDark={onDark}
      />
      {/* Övre label */}
      <Label
        x={x}
        y="18%"
        text={excellence}
        delay={labelDelay}
        align="bottom"
        accent={accent}
        kind="excellence"
        primaryColor={primaryColor}
        mutedColor={mutedColor}
        labelShadow={labelShadow}
      />

      {/* Nedre stam — växer neråt från mitt-linjen */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: stemDuration,
          delay: delay + 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: "50%",
          width: "1.5px",
          height: "26%",
          marginLeft: "-0.75px",
          background: `linear-gradient(to bottom, ${accent}, ${withAlpha(accent, 0.2)} 90%, transparent)`,
          transformOrigin: "top",
        }}
      />
      {/* Nedre dot */}
      <Dot
        x={x}
        y={76}
        delay={dotDelay + 0.1}
        accent={accent}
        kind="weakness"
        onDark={onDark}
      />
      {/* Nedre label */}
      <Label
        x={x}
        y="80%"
        text={weakness}
        delay={labelDelay + 0.1}
        align="top"
        accent={accent}
        kind="weakness"
        primaryColor={primaryColor}
        mutedColor={mutedColor}
        labelShadow={labelShadow}
      />
    </>
  );
}

// ============================================================================
// Dot — pulserande punkt på axeln
// ============================================================================

interface DotProps {
  x: number;
  y: number;
  delay: number;
  accent: string;
  kind: "excellence" | "weakness";
  onDark: boolean;
}

function Dot({ x, y, delay, accent, kind, onDark }: DotProps) {
  const size = kind === "excellence" ? 18 : 14;
  // Ring runt punkten ska separera den från bakgrunden. På mörk
  // backdrop: ljus cream-ring (originalkänslan). På ljust tema: nästan-vit
  // ring i bakgrundens ton så att accent-punkten läses som en ren cirkel.
  const ringStrong = onDark ? "#F7F1E6" : "rgba(255,255,255,0.9)";
  const ringSoft = onDark
    ? "rgba(247,241,230,0.6)"
    : "rgba(255,255,255,0.7)";
  return (
    <>
      {/* Glöd */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.8, 0.4], scale: [0.6, 1.4, 1.2] }}
        transition={{
          duration: 1.6,
          delay,
          times: [0, 0.4, 1],
          ease: "easeOut",
        }}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${size * 3}px`,
          height: `${size * 3}px`,
          marginLeft: `-${(size * 3) / 2}px`,
          marginTop: `-${(size * 3) / 2}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.33)} 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      {/* Själva punkten */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 18,
          delay,
        }}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          marginLeft: `-${size / 2}px`,
          marginTop: `-${size / 2}px`,
          borderRadius: "50%",
          background:
            kind === "excellence"
              ? accent
              : `linear-gradient(135deg, ${accent}, ${withAlpha(accent, 0.53)})`,
          boxShadow:
            kind === "excellence"
              ? `0 0 24px ${withAlpha(accent, 0.67)}, 0 0 60px ${withAlpha(accent, 0.33)}`
              : `0 0 16px ${withAlpha(accent, 0.47)}`,
          border:
            kind === "excellence"
              ? `2px solid ${ringStrong}`
              : `1.5px solid ${ringSoft}`,
        }}
      />
      {/* Pulserande ring efter intro — ger "levande" känsla */}
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: [0, 0.4, 0],
          scale: [1, 2.4, 2.4],
        }}
        transition={{
          duration: 2.6,
          delay: delay + 0.4,
          repeat: Infinity,
          repeatDelay: 1.6,
          ease: "easeOut",
        }}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          marginLeft: `-${size / 2}px`,
          marginTop: `-${size / 2}px`,
          borderRadius: "50%",
          border: `1.5px solid ${accent}`,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ============================================================================
// Label — text vid en peak/valley
// ============================================================================

interface LabelProps {
  x: number;
  y: string;
  text: string;
  delay: number;
  align: "top" | "bottom"; // "top" = label sits ABOVE the y-position growing down
  accent: string;
  kind: "excellence" | "weakness";
  primaryColor: string;
  mutedColor: string;
  labelShadow: string;
}

function Label({
  x,
  y,
  text,
  delay,
  align,
  kind,
  primaryColor,
  mutedColor,
  labelShadow,
}: LabelProps) {
  const style: CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: y,
    transform:
      align === "top"
        ? "translateX(-50%)"
        : "translate(-50%, -100%)",
    fontFamily: "var(--font-display)",
    fontSize: "clamp(0.95rem, 1.4vw, 1.45rem)",
    fontWeight: kind === "excellence" ? 600 : 500,
    lineHeight: 1.2,
    color: kind === "excellence" ? primaryColor : mutedColor,
    textAlign: "center",
    maxWidth: "min(280px, 22vw)",
    letterSpacing: "-0.005em",
    pointerEvents: "none",
    textShadow: labelShadow,
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: align === "top" ? -8 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {text}
    </motion.div>
  );
}

// ============================================================================
// AxisLabel — diskret etikett vid övre/nedre axeln
// ============================================================================

interface AxisLabelProps {
  text: string;
  editPath?: string;
  y: string;
  delay: number;
  accent: string;
}

function AxisLabel({ text, editPath, y, delay, accent }: AxisLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay }}
      style={{
        position: "absolute",
        top: y,
        right: "clamp(2rem, 4vw, 4rem)",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: `${withAlpha(accent, 0.67)}`,
        pointerEvents: "none",
      }}
    >
      {editPath ? (
        <EditableText path={editPath} value={text}>
          {text}
        </EditableText>
      ) : (
        text
      )}
    </motion.div>
  );
}

// ============================================================================
// Inline render — för landing-text med **bold**
// ============================================================================

function renderInline(text: string, accent: string): string {
  // Escape HTML, sedan ersätt **...** med <span style="color:accent">...</span>
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(text).replace(
    /\*\*([^*]+)\*\*/g,
    (_, inner) =>
      `<span style="color:${accent};font-weight:700">${inner}</span>`,
  );
}
