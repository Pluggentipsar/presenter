"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BiestaTriad — tre cirklar/pelare i triangelformation som möts i en kärna.
 *
 * Visualiserar Gert Biestas tre skoluppdrag (Kvalificering, Socialisering,
 * Subjektifiering) — eller vilken annan triad du har — som tre överlappande
 * cirklar med en glödande kärna i mitten. Steg 1-3 tänder en cirkel i taget.
 * Steg 4 låter kärnan glöda — alla tre uppdrag samtidigt.
 *
 * Klimaxbehandling: tre uppdrag i SPÄNNING, inte i lista. En punchier
 * och mer dramaturgiskt korrekt representation av Biesta än en bullet-list.
 *
 * MDX-format — varje rad är ett uppdrag, separerat med ` · `:
 *
 * ```mdx
 * <BiestaTriad
 *   chapter="§ Biesta"
 *   title="Vad är skolan till för?"
 *   coreLabel="Skolan"
 * >
 * - Kvalificering · Kunskap och färdigheter · Läsa, skriva, räkna, förstå världen.
 * - Socialisering · Normer och gemenskaper · Samarbeta, följa regler, rätt och fel.
 * - Subjektifiering · Bli självständig och fri · Stå upp för sin åsikt, gå sin egen väg.
 * </BiestaTriad>
 * ```
 */

interface BiestaTriadProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Texten i kärnan i mitten. */
  coreLabel?: string;
  /** Avslutande mening under triaden. */
  landing?: string;
  children?: ReactNode;
}

interface Pillar {
  name: string;
  short: string;
  example: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parsePillars(children: ReactNode): Pillar[] {
  const items: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      const type = el.type;
      if (typeof type === "string" && type === "li") {
        items.push(extractText(el.props.children).trim());
      } else if (el.props.children) {
        walk(el.props.children);
      }
    });
  };
  walk(children);

  return items
    .map((raw) => {
      const parts = raw.split("·").map((p) => p.trim());
      if (parts.length < 2) return null;
      const [name, short, ...rest] = parts;
      return { name, short, example: rest.join(" · ") };
    })
    .filter((p): p is Pillar => p !== null);
}

// Positionering: triangel med spets uppåt. Index 0 = topp, 1 = nedre vänster, 2 = nedre höger.
// Triangeln ligger lägre på sliden så att titeln + 01-textens "ovanför-position"
// inte krockar med varandra.
const PILLAR_POSITIONS = [
  { x: "50%", y: "40%" },
  { x: "27%", y: "77%" },
  { x: "73%", y: "77%" },
];

// Kärnan ligger ungefär vid triangelns centroid: ((50+27+73)/3, (40+77+77)/3) = (50, 64.67).
const CORE_POSITION = { x: "50%", y: "62%" };

const ACCENT_PALETTE = [
  "#C77352", // konjak — kvalificering
  "#7A9B72", // salvia — socialisering
  "#B48A52", // guld — subjektifiering
];

export function BiestaTriad({
  kicker,
  chapter,
  title,
  subtitle,
  coreLabel = "Skolan",
  landing,
  children,
}: BiestaTriadProps) {
  const pillars = useMemo(() => parsePillars(children).slice(0, 3), [children]);
  // Steps: 0 = title only, 1-3 = tänd pelare i ordning, 4 = kärnan glöder
  const step = useSlideSteps(pillars.length + 2);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 55%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 75%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 5,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
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

      {/* Titel högst upp */}
      {title ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "clamp(5rem, 10vh, 7rem)",
            left: "clamp(2rem, 5vw, 5rem)",
            right: "clamp(2rem, 5vw, 5rem)",
            textAlign: "center",
            zIndex: 4,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
          {subtitle ? (
            <div
              style={{
                marginTop: "clamp(0.4rem, 0.8vh, 0.7rem)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.3vw, 1.2rem)",
                color: "var(--text-muted)",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {/* Triangel-visualisering */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
        }}
      >
        {/* SVG — triangelsidor mellan pelarna */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {/* Svag stomme — triangeln syns från start */}
          <motion.polygon
            points={pillars
              .map((_, i) => {
                const p = PILLAR_POSITIONS[i];
                return `${parseFloat(p.x)},${parseFloat(p.y)}`;
              })
              .join(" ")}
            fill="none"
            stroke="color-mix(in srgb, var(--text) 22%, transparent)"
            strokeWidth={0.12}
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1, delay: 0.5 }}
          />

          {/* Färgade segment — tänds när motsvarande pelare aktiveras */}
          {[
            { from: 0, to: 1, color: ACCENT_PALETTE[0] },
            { from: 1, to: 2, color: ACCENT_PALETTE[1] },
            { from: 2, to: 0, color: ACCENT_PALETTE[2] },
          ].map((side, i) => {
            const p1 = PILLAR_POSITIONS[side.from];
            const p2 = PILLAR_POSITIONS[side.to];
            // Sidan tänds när båda anslutande pelare är aktiva
            const active = step >= Math.max(side.from, side.to) + 1;
            return (
              <motion.line
                key={i}
                x1={parseFloat(p1.x)}
                y1={parseFloat(p1.y)}
                x2={parseFloat(p2.x)}
                y2={parseFloat(p2.y)}
                stroke={side.color}
                strokeWidth={0.28}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: active ? 1 : 0,
                  opacity: active ? 0.85 : 0,
                }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </svg>

        {/* Kärnan — placerad vid triangelns centroid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: 1,
            scale: step >= pillars.length + 1 ? 1.18 : 1,
          }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: CORE_POSITION.y,
            left: CORE_POSITION.x,
            transform: "translate(-50%, -50%)",
            width: "clamp(7rem, 13vw, 11rem)",
            height: "clamp(7rem, 13vw, 11rem)",
            borderRadius: "9999px",
            background:
              step >= pillars.length + 1
                ? "radial-gradient(circle, var(--accent) 0%, color-mix(in srgb, var(--accent) 30%, var(--bg)) 70%, transparent 100%)"
                : "radial-gradient(circle, color-mix(in srgb, var(--text) 22%, var(--bg)) 0%, transparent 75%)",
              boxShadow:
              step >= pillars.length + 1
                ? "0 0 80px var(--accent-glow), 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent)"
                : "0 0 0 1px color-mix(in srgb, var(--text) 14%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.8s, box-shadow 0.8s",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1rem, 1.5vw, 1.4rem)",
              color: "var(--text)",
              letterSpacing: "-0.01em",
              textAlign: "center",
              opacity: step >= pillars.length + 1 ? 1 : 0.55,
              transition: "opacity 0.8s",
            }}
          >
            {coreLabel}
          </div>
        </motion.div>

        {/* Pelarna — TVÅ-LAGER:
            - Outer STATISK div med CSS transform: translate(-50%, -50%) för
              anchoring. Framer-motion's scale-animation kan trampa över CSS
              transform när de delar element, så vi separerar dem.
            - Inner motion.div tar emot scale/opacity-animation utan transform.
            Resultat: wrapperns mittpunkt låses exakt vid pos, oberoende av
            animationsfas. */}
        {pillars.map((pillar, i) => {
          const pos = PILLAR_POSITIONS[i];
          const active = step >= i + 1;
          const accent = ACCENT_PALETTE[i];
          const isTop = i === 0;
          const gap = "0.9rem";

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: pos.y,
                left: pos.x,
                // Statisk CSS-transform — låst, ingen framer-motion här.
                transform: "translate(-50%, -50%)",
                width: "clamp(5rem, 8vw, 7rem)",
                height: "clamp(5rem, 8vw, 7rem)",
                zIndex: 3,
              }}
            >
              {/* Motion-lager — bara scale + opacity, ingen positions-transform. */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{
                  opacity: active ? 1 : 0.22,
                  scale: active ? 1 : 0.85,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                }}
              >
                {/* CIRKELN — fyller motion-elementet */}
                <div
                  aria-hidden
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "9999px",
                    background: `radial-gradient(circle, ${accent} 0%, color-mix(in srgb, ${accent} 30%, var(--bg)) 80%)`,
                    boxShadow: active
                      ? `0 0 50px color-mix(in srgb, ${accent} 80%, transparent), 0 0 0 1px color-mix(in srgb, ${accent} 50%, transparent)`
                      : "0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent)",
                    transition: "box-shadow 0.7s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.8rem, 1.1vw, 1.1rem)",
                    fontWeight: 700,
                    color: "#0c0c10",
                  }}
                >
                  0{i + 1}
                </div>

                {/* TEXT — absolut INOM motion-elementet. Ankrat med top/bottom
                    = 100% + gap så det ligger direkt utanför cirkelns kant. */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    top: isTop ? "auto" : `calc(100% + ${gap})`,
                    bottom: isTop ? `calc(100% + ${gap})` : "auto",
                    width: "max(11rem, 18vw)",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.05rem, 1.6vw, 1.5rem)",
                      color: active ? "var(--text)" : "var(--text-muted)",
                      lineHeight: 1.15,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {pillar.name}
                  </div>
                  <div
                    style={{
                      marginTop: "clamp(0.2rem, 0.5vh, 0.4rem)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
                      color: active ? accent : "var(--text-muted)",
                      lineHeight: 1.3,
                    }}
                  >
                    {pillar.short}
                  </div>
                  {pillar.example ? (
                    <div
                      style={{
                        marginTop: "clamp(0.4rem, 0.8vh, 0.6rem)",
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.75rem, 0.95vw, 0.9rem)",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                        opacity: active ? 0.95 : 0.5,
                      }}
                    >
                      {pillar.example}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Landing nederst */}
      {landing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: step >= pillars.length + 1 ? 1 : 0,
            y: step >= pillars.length + 1 ? 0 : 8,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            bottom: "clamp(2.5rem, 5vh, 4rem)",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
            color: "var(--text)",
            zIndex: 4,
            padding: "0 clamp(2rem, 5vw, 5rem)",
            lineHeight: 1.4,
          }}
        >
          <EditableText path="landing" value={landing}>
            {landing}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
