"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EvidenceConstellation — visualiserar forskningsläget som stjärnbilder.
 *
 * Varje fakta får ett kluster av stjärnor vars *densitet* visar evidensstyrkan:
 * starka fynd → tätt lysande kluster, blindfläckar → enstaka glimtar i mörker.
 * Stjärnhimlens form berättar historien: vänster är full, höger är gles.
 *
 * MDX-format: separera vänster/höger-sektion med `---`. Varje listpunkt blir
 * ett eget kluster. Stödjer **fet** för accent-ord.
 *
 * ```mdx
 * <EvidenceConstellation
 *   chapter="§ Forskningsläget"
 *   leftLabel="Vad vi vet"
 *   leftTone="positive"
 *   rightLabel="Blindfläckarna"
 *   rightTone="warning"
 * >
 * - Mest **positiva** fynd hittills
 * - Större vinster när **eleven driver**
 * ---
 * - Få studier på **unga**
 * - Forskningen hinner **inte** med tekniken
 * </EvidenceConstellation>
 * ```
 */

type Tone = "positive" | "warning" | "danger" | "neutral";

interface EvidenceConstellationProps {
  chapter?: string;
  /** Liten intro-rad ovanför kolumnerna. */
  intro?: string;
  background?: string;
  /** Mörk overlay (0-1). Default 0.85 — vi vill ha rymdsvart för stjärnorna. */
  overlay?: number;
  accent?: string;

  leftLabel: string;
  leftTone?: Tone;
  /** Antal stjärnor per fakta i vänster kolumn. Default beror på tone. */
  leftDensity?: number;

  rightLabel: string;
  rightTone?: Tone;
  rightDensity?: number;

  /** Aktivera stegvis reveal — vänster konstellationer först, sen höger. Default true. */
  stepped?: boolean;

  children?: ReactNode;
}

// ============================================================================
// Tone & densitet
// ============================================================================

function toneColor(tone: Tone, accent: string): string {
  switch (tone) {
    case "positive":
      return "#7BC474";
    case "warning":
      return "#E8A845";
    case "danger":
      return "#E84D4D";
    default:
      return accent;
  }
}

function defaultDensity(tone: Tone): number {
  // Densiteten BERÄTTAR — många stjärnor = mycket evidens, få = blindfläck.
  switch (tone) {
    case "positive":
      return 22;
    case "warning":
      return 3;
    case "danger":
      return 2;
    default:
      return 10;
  }
}

// ============================================================================
// Deterministisk pseudo-random (för SSR-stabila stjärnpositioner)
// ============================================================================

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

interface Star {
  x: number; // 0–100 (% av cluster-container)
  y: number;
  size: number; // px
  brightness: number; // 0–1
  twinkleDelay: number;
  twinkleDuration: number;
  /** Drift-amplitud i pixlar (hur långt stjärnan rör sig från sin position). */
  driftX: number;
  driftY: number;
  driftDuration: number;
  driftDelay: number;
  /** Variant av blink-mönster (0–2) — gör att olika stjärnor blinkar olika. */
  blinkVariant: number;
}

function makeStar(rnd: () => number, opts: {
  x: number;
  y: number;
  sizeMin: number;
  sizeRange: number;
  brightnessMin: number;
  brightnessRange: number;
  driftMax: number;
  twinkleSlow?: boolean;
}): Star {
  return {
    x: opts.x,
    y: opts.y,
    size: opts.sizeMin + rnd() * opts.sizeRange,
    brightness: opts.brightnessMin + rnd() * opts.brightnessRange,
    twinkleDelay: rnd() * 4,
    twinkleDuration: opts.twinkleSlow
      ? 4 + rnd() * 4
      : 1.6 + rnd() * 2.4,
    driftX: (rnd() - 0.5) * opts.driftMax * 2,
    driftY: (rnd() - 0.5) * opts.driftMax * 2,
    driftDuration: 6 + rnd() * 8,
    driftDelay: rnd() * 5,
    blinkVariant: Math.floor(rnd() * 3),
  };
}

function generateStars(seed: string, count: number): Star[] {
  const rnd = mulberry32(hashString(seed));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Elliptisk distribution med centertendens för "kluster-känsla"
    const angle = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 48;
    const cx = 50 + Math.cos(angle) * r;
    const cy = 50 + Math.sin(angle) * r;
    stars.push(
      makeStar(rnd, {
        x: Math.max(2, Math.min(98, cx)),
        y: Math.max(5, Math.min(95, cy)),
        sizeMin: 1.4,
        sizeRange: 2.4,
        brightnessMin: 0.45,
        brightnessRange: 0.55,
        driftMax: 4,
      }),
    );
  }
  return stars;
}

// Bakgrundsstjärnor (utanför kluster — hela canvas)
function generateAmbientStars(seed: string, count: number): Star[] {
  const rnd = mulberry32(hashString(seed));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push(
      makeStar(rnd, {
        x: rnd() * 100,
        y: rnd() * 100,
        sizeMin: 0.6,
        sizeRange: 1.1,
        brightnessMin: 0.15,
        brightnessRange: 0.4,
        driftMax: 6,
        twinkleSlow: true,
      }),
    );
  }
  return stars;
}

// ============================================================================
// Tre olika blink-mönster (gör att stjärnorna inte pulserar synkront)
// ============================================================================

function blinkPattern(variant: number, brightness: number) {
  const dim = brightness * 0.18;
  const half = brightness * 0.55;
  const full = brightness;
  switch (variant) {
    case 0:
      // Mjuk pulse
      return {
        opacity: [half, full, dim, full, half],
        scale: [1, 1.35, 0.85, 1.25, 1],
      };
    case 1:
      // Hård flicker — snabba blinkningar
      return {
        opacity: [full, dim, full, half, full, dim, full],
        scale: [1, 0.7, 1.4, 1, 1.2, 0.8, 1],
      };
    default:
      // Långsam vågrörelse
      return {
        opacity: [dim, full, half, full, dim],
        scale: [0.9, 1.5, 1.1, 1.3, 0.9],
      };
  }
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

function parseSides(children: ReactNode): { left: string[]; right: string[] } {
  const sides: string[][] = [[], []];
  let cursor = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "hr") {
      cursor = Math.min(1, cursor + 1);
      return;
    }
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) sides[cursor].push(text);
        }
      });
    } else if (t === "li") {
      const text = extractText(el.props.children).trim();
      if (text) sides[cursor].push(text);
    }
  });
  return { left: sides[0], right: sides[1] };
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  // Default: temats slide-bakgrund (mörk eller ljus beroende på tema)
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(5,3,8,${a}), rgba(5,3,8,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat, ${fallback}`;
  }
  return bg;
}

// ============================================================================
// Huvud-template
// ============================================================================

export function EvidenceConstellation({
  chapter,
  intro,
  background,
  overlay = 0.85,
  accent = "var(--accent)",
  leftLabel,
  leftTone = "positive",
  leftDensity,
  rightLabel,
  rightTone = "warning",
  rightDensity,
  stepped = true,
  children,
}: EvidenceConstellationProps) {
  const { left, right } = parseSides(children);
  const leftColor = toneColor(leftTone, accent);
  const rightColor = toneColor(rightTone, accent);
  const leftN = leftDensity ?? defaultDensity(leftTone);
  const rightN = rightDensity ?? defaultDensity(rightTone);

  // Bakgrundsstjärnor (en gång, deterministisk)
  const ambientStars = useMemo(() => generateAmbientStars("ambient-bg", 80), []);

  // Stegsystem: en step per fakta totalt (vänster + höger)
  const totalFacts = left.length + right.length;
  const totalSteps = stepped ? Math.max(1, totalFacts) : 1;
  const activeStep = useSlideSteps(totalSteps);
  const visibleCount = stepped ? activeStep + 1 : totalFacts;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Ambient star field */}
      <div className="absolute inset-0 pointer-events-none">
        {ambientStars.map((s, i) => (
          <motion.div
            key={i}
            // Drift-loop — stjärnan glider sakta i sin egen bana
            animate={{
              x: [0, s.driftX, -s.driftX * 0.6, s.driftX * 0.3, 0],
              y: [0, -s.driftY, s.driftY * 0.7, -s.driftY * 0.4, 0],
            }}
            transition={{
              duration: s.driftDuration,
              delay: s.driftDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
            }}
          >
            <motion.div
              animate={blinkPattern(s.blinkVariant, s.brightness)}
              transition={{
                duration: s.twinkleDuration,
                delay: s.twinkleDelay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: "50%",
                background: "white",
                boxShadow: `0 0 ${s.size * 3}px rgba(255,255,255,0.6)`,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Mittlinje (subtil) */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "50%",
          top: "12%",
          bottom: "8%",
          width: "1px",
          background: `linear-gradient(to bottom, transparent 0%, ${withAlpha(
            accent,
            0.18,
          )} 30%, ${withAlpha(accent, 0.28)} 50%, ${withAlpha(
            accent,
            0.18,
          )} 70%, transparent 100%)`,
          transformOrigin: "center",
          zIndex: 1,
        }}
      />

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
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
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
              fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
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

        {/* Två sidor */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(2rem, 4vw, 4rem)",
            minHeight: 0,
          }}
        >
          <ConstellationColumn
            label={leftLabel}
            color={leftColor}
            facts={left}
            starsPerFact={leftN}
            seedPrefix="L"
            startDelay={0.6}
            firstFactIndex={0}
            visibleCount={visibleCount}
            stepped={stepped}
          />
          <ConstellationColumn
            label={rightLabel}
            color={rightColor}
            facts={right}
            starsPerFact={rightN}
            seedPrefix="R"
            startDelay={1.0}
            firstFactIndex={left.length}
            visibleCount={visibleCount}
            stepped={stepped}
          />
        </div>

        {/* Progress-indikator när stegvis */}
        {stepped && totalFacts > 1 ? (
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
              marginTop: "clamp(0.4rem, 0.8vh, 0.7rem)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {Array.from({ length: totalFacts }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: "2px",
                    width: i === activeStep ? "1.6rem" : "0.4rem",
                    background: i <= activeStep ? accent : withAlpha(accent, 0.25),
                    transition: "all 300ms ease",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: "0.6rem" }}>
              {activeStep + 1} / {totalFacts}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Kolumn med constellations
// ============================================================================

interface ConstellationColumnProps {
  label: string;
  color: string;
  facts: string[];
  starsPerFact: number;
  seedPrefix: string;
  startDelay: number;
  firstFactIndex: number;
  visibleCount: number;
  stepped: boolean;
}

function ConstellationColumn({
  label,
  color,
  facts,
  starsPerFact,
  seedPrefix,
  startDelay,
  firstFactIndex,
  visibleCount,
  stepped,
}: ConstellationColumnProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 2vh, 1.6rem)",
        minHeight: 0,
      }}
    >
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: startDelay - 0.3 }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.75rem, 0.95vw, 1rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          fontWeight: 700,
          color,
          paddingBottom: "clamp(0.5rem, 1vh, 0.8rem)",
          borderBottom: `1px solid ${withAlpha(color, 0.2)}`,
        }}
      >
        {label}
      </motion.div>

      {/* Constellations */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          gap: "clamp(0.8rem, 1.5vh, 1.4rem)",
        }}
      >
        {facts.map((fact, i) => {
          const globalIndex = firstFactIndex + i;
          const isVisible = stepped ? globalIndex < visibleCount : true;
          return (
            <Constellation
              key={i}
              text={fact}
              color={color}
              starCount={starsPerFact}
              seed={`${seedPrefix}-${i}-${fact}`}
              delay={stepped ? 0.2 : startDelay + i * 0.5}
              isVisible={isVisible}
              stepped={stepped}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Enskild constellation: stjärnkluster + text
// ============================================================================

interface ConstellationProps {
  text: string;
  color: string;
  starCount: number;
  seed: string;
  delay: number;
  isVisible: boolean;
  stepped: boolean;
}

function Constellation({ text, color, starCount, seed, delay, isVisible, stepped }: ConstellationProps) {
  const stars = useMemo(() => generateStars(seed, starCount), [seed, starCount]);
  const dimmed = stepped && !isVisible;

  return (
    <motion.div
      animate={{ opacity: dimmed ? 0.12 : 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "grid",
        gridTemplateColumns: "clamp(8rem, 14vw, 12rem) 1fr",
        gap: "clamp(0.8rem, 1.6vw, 1.4rem)",
        alignItems: "center",
      }}
    >
      {/* Stjärnkluster */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.4",
          minHeight: "clamp(4rem, 9vh, 7rem)",
        }}
      >
        {stars.map((s, i) => {
          const popDelay = delay + i * 0.025;
          return (
            <motion.div
              key={i}
              // Drift-wrapper — stjärnan glider sakta i sin egen bana
              animate={{
                x: [0, s.driftX, -s.driftX * 0.6, s.driftX * 0.3, 0],
                y: [0, -s.driftY, s.driftY * 0.7, -s.driftY * 0.4, 0],
              }}
              transition={{
                duration: s.driftDuration,
                delay: popDelay + s.driftDelay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Pop-in stjärna */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: s.brightness, scale: 1 }}
                transition={{
                  duration: 1.2,
                  delay: popDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 ${s.size * 4}px ${color}, 0 0 ${s.size * 8}px ${withAlpha(color, 0.53)}`,
                }}
              >
                {/* Stark twinkle-loop med varierande mönster */}
                <motion.div
                  animate={blinkPattern(s.blinkVariant, 1)}
                  transition={{
                    duration: s.twinkleDuration,
                    delay: popDelay + s.twinkleDelay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 ${s.size * 3}px ${color}, 0 0 ${s.size * 6}px ${withAlpha(color, 0.67)}`,
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.7,
          delay: delay + Math.min(0.6, starCount * 0.025) + 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
          color: "var(--text)",
          lineHeight: 1.3,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        }}
      >
        {renderInline(text, color)}
      </motion.div>
    </motion.div>
  );
}
