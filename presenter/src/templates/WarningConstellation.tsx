"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface WarningConstellationProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  bottomLine?: string;
  /**
   * Markdown-lista. `- Titel · Beskrivning`. Lägg `★ Titel` för det
   * tecken som är "centrum" — det får alert-färg + största nod.
   */
  /**
   * Färg på centrumnoden. `"alert"` (default) ger signal-röd, vilket är rätt
   * när noden faktiskt blottlägger något. `"accent"` ger temats accent — för
   * deck som medvetet kör utan alerts, där konstellationen ska leda till
   * professionell nyfikenhet snarare än larm.
   */
  centerTone?: "alert" | "accent";
  /** Etikett ovanför centrumnoden. Default "★ Allvarligast". */
  centerLabel?: string;
  children?: ReactNode;
}

interface WarningNode {
  title: string;
  description: string;
  starred: boolean;
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

function parseItems(children: ReactNode): WarningNode[] {
  const out: WarningNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const starred = raw.startsWith("★");
      const clean = raw.replace(/^★\s*/, "");
      const parts = clean.split(/\s*·\s*/);
      out.push({
        title: parts[0] ?? "",
        description: parts.slice(1).join(" · "),
        starred,
      });
    });
  });
  return out;
}

/**
 * Varningstecken som konstellation. Den ★-markerade noden ligger i
 * centrum med alert-glow; övriga noder ligger i en cirkel runt och
 * kopplas till centrum med tunna linjer som tecknas in. Varje nod
 * får en pulserande puls för "warning"-känslan. Inte en checklista —
 * ett observationsfält där flera samtidiga tecken förstärker varandra.
 */
export function WarningConstellation({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  children,
  centerTone = "alert",
  centerLabel = "★ Allvarligast",
}: WarningConstellationProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";
  // Centrumfärgen. Default är signal-röd (blottläggning); `centerTone="accent"`
  // låter deck utan alerts använda konstellationen utan att bryta sin egen
  // färggrammatik.
  const alert =
    centerTone === "accent" ? accent : "var(--accent-alert, #ff5c7a)";

  // Sortera: ★ först (centrum), sen övriga runtom
  const center = items.find((i) => i.starred) ?? items[items.length - 1];
  const orbit = items.filter((i) => i !== center);

  // Stepped reveal: centrum syns alltid, orbit-noder klickas fram
  const step = useSlideSteps(orbit.length + 1);
  const visibleOrbitCount = Math.min(step, orbit.length);

  // Centrum-position i % av konstellation-ytan
  const cx = 50;
  const cy = 50;

  // Beräkna positioner i en cirkel runt centrum
  const positions = orbit.map((_, i) => {
    const angle = (i / orbit.length) * Math.PI * 2 - Math.PI / 2;
    const r = 36; // radius i %
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.2vh, 2rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Title-block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "44em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.6rem, 4.4vw, 4rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.6rem 0 0 0",
                maxWidth: "42em",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* Constellation field */}
        <div
          style={{
            flex: 1,
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* SVG-linjer från centrum till varje orbit-nod */}
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
            {positions.map((p, i) => {
              const isVisible = i < visibleOrbitCount;
              return (
                <motion.line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={p.x}
                  y2={p.y}
                  stroke={withAlpha("var(--accent)", 0.35)}
                  strokeWidth={0.18}
                  strokeDasharray="0.5 0.6"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isVisible ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.9, delay: isVisible ? 0.2 : 0 }}
                />
              );
            })}
          </svg>

          {/* Centrum-nod */}
          <motion.div
            data-card=""
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 24,
              delay: 0.35,
            }}
            style={{
              position: "absolute",
              left: `${cx}%`,
              top: `${cy}%`,
              transform: "translate(-50%, -50%)",
              width: "clamp(230px, 22vw, 310px)",
              padding: "clamp(1.2rem, 1.6vw, 1.6rem)",
              borderRadius: "1.2rem",
              background: `linear-gradient(160deg, ${withAlpha(alert, 0.25)} 0%, ${withAlpha(alert, 0.06)} 100%)`,
              border: `1.5px solid ${withAlpha(alert, 0.6)}`,
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: `0 24px 60px -16px ${withAlpha(alert, 0.45)}, inset 0 1px 0 ${withAlpha(alert, 0.35)}`,
              zIndex: 3,
            }}
          >
            {/* Pulserande ring runt centrum */}
            <motion.div
              aria-hidden
              animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "var(--radius, 1.2rem)",
                border: `2px solid ${alert}`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: alert,
                fontWeight: 600,
                marginBottom: "0.45rem",
              }}
            >
              {centerLabel}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 1.95vw, 1.85rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: "var(--text)",
              }}
            >
              {center.title}
            </div>
            {center.description ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.9rem, 1.08vw, 1.08rem)",
                  lineHeight: 1.45,
                  color: "var(--text-muted)",
                  margin: "0.5rem 0 0 0",
                }}
              >
                {center.description}
              </p>
            ) : null}
          </motion.div>

          {/* Orbit-noder */}
          {orbit.map((item, i) => {
            const p = positions[i];
            const isVisible = i < visibleOrbitCount;
            return (
              <motion.div
                key={i}
                data-card=""
                initial={{ opacity: 0, scale: 0.7 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 24,
                  delay: isVisible ? 0.1 : 0,
                }}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: "clamp(180px, 18vw, 240px)",
                  padding: "clamp(0.9rem, 1.2vw, 1.2rem)",
                  borderRadius: "1rem",
                  background: "var(--bg-surface)",
                  border: `1px solid ${withAlpha("var(--accent)", 0.18)}`,
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: "0 12px 32px -10px rgba(0,0,0,0.18)",
                  zIndex: 2,
                }}
              >
                {/* Liten pulserande prick som visuell "warning blip" */}
                <motion.div
                  aria-hidden
                  data-glow=""
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
                  transition={{
                    duration: 2.5 + (i % 3) * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.2 + i * 0.18,
                  }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "9999px",
                    background: accent,
                    boxShadow: `0 0 12px ${accent}`,
                    marginBottom: "0.5rem",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.15rem, 1.35vw, 1.32rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.018em",
                    lineHeight: 1.18,
                    color: "var(--text)",
                  }}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 0.98vw, 0.98rem)",
                      lineHeight: 1.4,
                      color: "var(--text-muted)",
                      margin: "0.35rem 0 0 0",
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.4 }}
            style={{
              borderTop: "1px solid rgba(0,0,0,0.1)",
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.35rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "62em",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
