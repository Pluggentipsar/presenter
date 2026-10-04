"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RoleOrbit — de fyra rollerna vi ger AI, i omloppsbana runt en abstrakt
 * AI-form.
 *
 * Mitten är medvetet INGEN robot och INGET ansikte: två motroterande
 * streckade ringar, ett andande accent-sken och ett stillastående punktmönster.
 * AI gestaltas som system och mönster, inte som varelse.
 *
 * Två användningslägen:
 *
 * 1. **Introduktion** (ingen `active`) — rollerna kopplas på en i taget per
 *    klick, med sin kontaktlinje in mot mitten. Underraden landar sist.
 * 2. **Kapitelnavigering** (`active="Oraklet"`) — inga steg. Den aktiva rollen
 *    lyser och förstoras, de andra tonas ned. Samma bild, ny betoning.
 *
 * ```mdx
 * <RoleOrbit
 *   kicker="Fyra roller"
 *   subline="Fyra roller vi ger AI. Fyra saker elever behöver kunna genomskåda."
 * >
 * - Oraklet · Den vet.
 * - Tjänaren · Den gör arbetet åt mig.
 * - Vännen · Den känner mig och vill mig väl.
 * - Rivalen · Den kommer att ersätta mig.
 * </RoleOrbit>
 * ```
 *
 * Per rad: `Rollnamn · Den mänskliga föreställningen`.
 */

interface RoleOrbitProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Underrad längst ned — landar på sista steget. */
  subline?: string;
  /**
   * Aktiv roll: rollnamnet (skiftlägesokänsligt) eller 1-indexerad position.
   * Sätts när bilden används som kapitelnavigering — då finns inga klick-steg.
   */
  active?: string | number;
  children?: ReactNode;
}

interface Role {
  name: string;
  belief: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Positioner i procent av ytan — diagonalerna utnyttjar 16:9 bäst. */
export const SLOTS = [
  { x: 19, y: 26 },
  { x: 81, y: 26 },
  { x: 81, y: 76 },
  { x: 19, y: 76 },
];

export const CENTER = { x: 50, y: 51 };

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseRoles(children: ReactNode): Role[] {
  const out: Role[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: parts[0].trim(),
      belief: parts.slice(1).join(" · ").trim(),
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
  return out.slice(0, 4);
}

/** Skiftlägesokänslig jämförelse som klarar å/ä/ö. */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function resolveActiveIndex(
  active: string | number | undefined,
  roles: Role[],
): number {
  if (active == null) return -1;
  if (typeof active === "number") return active - 1;
  const asNumber = Number(active);
  if (Number.isFinite(asNumber) && String(asNumber) === active.trim()) {
    return asNumber - 1;
  }
  return roles.findIndex((r) => normalize(r.name) === normalize(active));
}

/** Abstrakt AI-form: ringar, sken och punktmönster. Ingen varelse. */
export function AiForm({ reduceMotion }: { reduceMotion: boolean }) {
  // Fasta punkter — samma varje render, inget slumpmässigt flimmer.
  const dots = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let i = 0; i < 26; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const radius = 6 + Math.sqrt(i / 26) * 26;
      out.push({
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        r: 0.7 + ((i * 7) % 5) * 0.16,
        o: 0.2 + ((i * 11) % 6) * 0.06,
      });
    }
    return out;
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: "clamp(11rem, 21vw, 19rem)",
        aspectRatio: "1 / 1",
      }}
    >
      {/* Andande sken */}
      <motion.div
        // Explicit första keyframe i stället för initial={false} — det senare
        // skulle låsa värdet vid målet och döda loopen.
        initial={{ opacity: 0.55, scale: 1 }}
        animate={
          reduceMotion ? undefined : { opacity: [0.55, 0.85, 0.55], scale: [1, 1.07, 1] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "12%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, var(--accent-glow) 0%, transparent 68%)",
        }}
      />

      {/* Yttre ring — roterar medurs */}
      <motion.div
        initial={{ rotate: 0 }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "1.5px dashed color-mix(in srgb, var(--accent) 42%, transparent)",
        }}
      />

      {/* Inre ring — roterar moturs, tätare streck */}
      <motion.div
        initial={{ rotate: 0 }}
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 43, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: "17%",
          borderRadius: "50%",
          border: "1px dotted color-mix(in srgb, var(--accent) 60%, transparent)",
        }}
      />

      {/* Punktmönstret — systemet, inte varelsen */}
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="var(--accent)"
            opacity={d.o}
          />
        ))}
      </svg>

      {/* Diskret etikett — orienterar utan att bli ansikte */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(1.15rem, 2.3vw, 2.1rem)",
          letterSpacing: "0.34em",
          textIndent: "0.34em",
          fontWeight: 700,
          color: "color-mix(in srgb, var(--text) 55%, transparent)",
        }}
      >
        AI
      </div>
    </div>
  );
}

export function RoleOrbit({
  chapter,
  kicker,
  subline,
  active,
  children,
}: RoleOrbitProps) {
  const roles = useMemo(() => parseRoles(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const activeIndex = resolveActiveIndex(active, roles);
  const isNavMode = activeIndex >= 0;

  // Navigeringsläget har inga steg — bilden är en påminnelse, inte ett bygge.
  const step = useSlideSteps(isNavMode ? 0 : roles.length);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, var(--bg-surface) 0%, var(--bg) 70%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 4,
          }}
        >
          {kicker ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </span>
          ) : null}
          {chapter ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "color-mix(in srgb, var(--text) 45%, transparent)",
                marginLeft: "auto",
              }}
            >
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            </span>
          ) : null}
        </motion.div>
      ) : null}

      {/* ————— Omloppsbanan ————— */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: "clamp(4rem, 9vh, 6rem)",
          paddingBottom: subline ? "clamp(4rem, 9vh, 6rem)" : "clamp(2rem, 4vh, 3rem)",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* Kontaktlinjer — preserveAspectRatio none är ofarligt för raka
              linjer och låter oss använda samma procentkoordinater som korten. */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {roles.map((_, i) => {
              const slot = SLOTS[i];
              if (!slot) return null;
              const shown = isNavMode || step >= i;
              const dim = isNavMode && i !== activeIndex;
              return (
                <motion.line
                  key={i}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  // Stannar före kortet: korten är centrerade på sin punkt, så
                  // en linje hela vägen fram skulle löpa in under texten.
                  x2={CENTER.x + (slot.x - CENTER.x) * 0.6}
                  y2={CENTER.y + (slot.y - CENTER.y) * 0.6}
                  stroke="var(--accent)"
                  strokeWidth={dim ? 0.16 : 0.3}
                  strokeDasharray="1.6 1.6"
                  vectorEffect="non-scaling-stroke"
                  initial={false}
                  animate={{
                    pathLength: shown ? 1 : 0,
                    opacity: shown ? (dim ? 0.18 : 0.6) : 0,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
                />
              );
            })}
          </svg>

          {/* Mittformen */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: EASE }}
            style={{
              position: "absolute",
              left: `${CENTER.x}%`,
              top: `${CENTER.y}%`,
              // x/y i stället för CSS-transform: framer-motion bygger sin egen
              // transform när scale animeras och skulle annars slänga
              // translate(-50%,-50%) — formen hamnade en halv bredd fel.
              x: "-50%",
              y: "-50%",
              zIndex: 2,
            }}
          >
            <AiForm reduceMotion={reduceMotion} />
          </motion.div>

          {/* Rollkorten */}
          {roles.map((role, i) => {
            const slot = SLOTS[i];
            if (!slot) return null;
            const shown = isNavMode || step >= i;
            const isActive = isNavMode && i === activeIndex;
            const dim = isNavMode && !isActive;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: shown ? (dim ? 0.26 : 1) : 0,
                  scale: shown ? (isActive ? 1.12 : 1) : 0.9,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.65,
                  delay: reduceMotion || isNavMode ? 0 : 0.12,
                  ease: EASE,
                }}
                style={{
                  position: "absolute",
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  // Se kommentaren vid mittformen — samma sak här.
                  x: "-50%",
                  y: "-50%",
                  width: "clamp(11rem, 25vw, 21rem)",
                  textAlign: "center",
                  zIndex: 3,
                }}
              >
                {/* Anslutningspunkt */}
                <span
                  aria-hidden
                  style={{
                    display: "block",
                    width: isActive ? "0.7rem" : "0.5rem",
                    height: isActive ? "0.7rem" : "0.5rem",
                    margin: "0 auto clamp(0.5rem, 1.1vh, 0.8rem)",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: isActive
                      ? "0 0 24px var(--accent-glow), 0 0 8px var(--accent)"
                      : "0 0 12px var(--accent-glow)",
                    transition: reduceMotion ? "none" : "all 0.5s",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: isActive ? 700 : 600,
                    fontSize: "clamp(1.55rem, 2.95vw, 2.85rem)",
                    lineHeight: 1.12,
                    letterSpacing: "-0.025em",
                    color: isActive ? "var(--accent)" : "var(--text)",
                    transition: reduceMotion ? "none" : "color 0.5s",
                  }}
                >
                  {role.name}
                </div>
                {role.belief ? (
                  <div
                    style={{
                      marginTop: "clamp(0.3rem, 0.75vh, 0.55rem)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
                      lineHeight: 1.35,
                      color: "var(--text-muted)",
                    }}
                  >
                    {role.belief}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ————— Underrad ————— */}
      {subline ? (
        <motion.div
          initial={false}
          animate={{
            opacity: isNavMode || step >= roles.length - 1 ? 1 : 0,
            y: isNavMode || step >= roles.length - 1 ? 0 : 10,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.35vw, 1.35rem)",
            lineHeight: 1.4,
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          <EditableText path="subline" value={subline}>
            {subline}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
