"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MandateMap — koncentriska ringar runt en lärar-glödpunkt i centrum.
 * Varje ring har ett räckvidd-stat (elever/år, elever/karriär, år per liv).
 * Stega framåt för att tända ringarna en i taget — eller låt dem komma
 * automatiskt med stagger.
 *
 * MDX-format:
 * ```mdx
 * <MandateMap
 *   chapter="§ Akt 4 · Mandatet"
 *   title="Lärarens mandat."
 *   subtitle="Den enda yrkesgrupp som systematiskt möter varje barn, varje dag, i 12 år."
 *   centerLabel="Du"
 *   centerSublabel="Läraren"
 *   accent= "var(--accent)"
 * >
 * - 250 · elever per läsår
 * - 7 000+ · elever per karriär
 * - 12 år · av varje liv
 * </MandateMap>
 * ```
 *
 * Per rad: `Värde · Etikett`.
 */

interface MandateMapProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  centerLabel?: string;
  centerSublabel?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

interface Ring {
  value: string;
  label: string;
}

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
    return inner;
  }
  return "";
}

function parseRings(children: ReactNode): Ring[] {
  const out: Ring[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const value = (parts[0] ?? "").trim();
    const label = parts.slice(1).join(" · ").trim();
    if (!value) return;
    out.push({ value, label });
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
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function MandateMap({
  chapter,
  title,
  subtitle,
  centerLabel = "Du",
  centerSublabel,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: MandateMapProps) {
  const rings = useMemo(() => parseRings(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  // Stega: 0 = bara center, 1 = +ring 0, 2 = +ring 1, ...
  const step = useSlideSteps(rings.length + 1);

  // Ring-radius i % av slide-höjd (vmin-baserat)
  const ringRadii = useMemo(() => {
    const base = 14;
    const stride = 11;
    return rings.map((_, i) => base + (i + 1) * stride);
  }, [rings]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Innehåll — title vänster, ringar höger */}
      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 38%) minmax(0, 62%)",
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.5vw, 2.5rem)",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        {/* Vänster — text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 2vh, 1.4rem)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.5vw, 3.4rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
                color: "var(--text)",
                lineHeight: 1.4,
                maxWidth: "32ch",
              }}
            >
              {subtitle}
            </motion.div>
          ) : null}

          {/* Stat-lista som dim sedan tänds när motsvarande ring är på */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.6rem, 1vh, 0.9rem)",
              marginTop: "clamp(1rem, 2vh, 1.6rem)",
            }}
          >
            {rings.map((ring, i) => {
              const lit = step >= i + 1;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: lit ? 1 : 0.25, x: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderLeft: `2px solid ${lit ? accent : `${withAlpha(accent, 0.2)}`}`,
                    paddingLeft: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(1.5rem, 2.6vw, 2.4rem)",
                      letterSpacing: "-0.03em",
                      color: lit ? accent : "var(--text-muted)",
                      lineHeight: 1,
                      textShadow: lit ? `0 0 32px ${withAlpha(accent, 0.33)}` : "none",
                      transition: "color 0.6s, text-shadow 0.6s",
                    }}
                  >
                    {ring.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                      color: "var(--text-muted)",
                      marginTop: "0.2rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {ring.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Höger — radial-visualisering */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Pulse i bakgrunden */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35, scale: [1, 1.08, 1] }}
            transition={{
              opacity: { duration: 1, delay: 0.6 },
              scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
            }}
            className="ambient-accent"
            style={{
              position: "absolute",
              width: "65vmin",
              height: "65vmin",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${withAlpha(accent, 0.13)} 0%, transparent 60%)`,
              filter: "blur(20px)",
            }}
          />

          {/* Ringarna */}
          {rings.map((_, i) => {
            const lit = step >= i + 1;
            const radius = ringRadii[i];
            const delay = 0.7 + i * 0.4;
            return (
              <motion.div
                key={i}
                aria-hidden
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: lit ? 1 : 0.2,
                  scale: 1,
                }}
                transition={{
                  duration: 0.85,
                  delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  width: `${radius * 2}vmin`,
                  height: `${radius * 2}vmin`,
                  borderRadius: "50%",
                  border: `1.5px ${lit ? "solid" : "dashed"} ${lit ? accent : `${withAlpha(accent, 0.33)}`}`,
                  boxShadow: lit ? `0 0 28px ${withAlpha(accent, 0.2)}, inset 0 0 24px ${withAlpha(accent, 0.13)}` : "none",
                  transition: "border-color 0.6s, box-shadow 0.6s",
                }}
              />
            );
          })}

          {/* Center — läraren */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "clamp(7rem, 11vmin, 11rem)",
              height: "clamp(7rem, 11vmin, 11rem)",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${accent} 0%, ${withAlpha(accent, 0.87)} 50%, ${withAlpha(accent, 0.53)} 100%)`,
              boxShadow: `0 0 60px ${withAlpha(accent, 0.6)}, 0 0 120px ${withAlpha(accent, 0.33)}, inset 0 0 30px rgba(255,255,255,0.2)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.15rem",
              zIndex: 3,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.4rem, 2vw, 2rem)",
                color: "#0a0908",
                lineHeight: 1,
              }}
            >
              {centerLabel}
            </div>
            {centerSublabel ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(10,9,8,0.7)",
                }}
              >
                {centerSublabel}
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
