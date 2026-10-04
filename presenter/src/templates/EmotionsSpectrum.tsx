"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EmotionsSpectrum — fem-stegs emotionellt spektrum med färgkodade zoner.
 *
 * Visualiserar lärares (eller annan publiks) reaktioner som en gradient
 * från ett känslotillstånd till ett annat. Varje zon har en färg, en
 * emotion, ett verb och ett citat. Stega framåt för att lyfta zonerna
 * en i taget — den aktiva zonen växer, dämpar de andra och låter
 * citatet glida in.
 *
 * Tema-agnostisk: färgerna kommer från MDX-datan (per zon), strukturen
 * från CSS-variabler. Funkar lika bra på editorial som chunky-teman.
 *
 * MDX-format — varje rad är en zon, separerad med ` · `:
 *
 * ```mdx
 * <EmotionsSpectrum
 *   kicker="§ Känslospektrum"
 *   chapter="§ Akt 3 · Reaktioner"
 *   title="AI utmanar lärarrollen."
 *   subtitle="Fem reaktioner — alla är legitima."
 * >
 * - Rädsla · Skydda · #F5C247 · "Jag vågar knappt ge skrivuppgifter längre."
 * - Sorg · Hedra · #A678D4 · "Den stunden när en elev hittade sina egna ord — den ser jag allt mer sällan nu."
 * - Reflektion · Pausa · #EC7E26 · "Innan jag bestämmer mig behöver jag förstå vad det gör med lärandet."
 * - Nyfikenhet · Utforska · #5DBE7B · "Diskussionen som följde var den bästa på hela terminen."
 * - Agens · Medskapa · #4A90D9 · "När jag designar uppgiften rätt tänker de djupare, inte mindre."
 * </EmotionsSpectrum>
 * ```
 */

interface EmotionsSpectrumProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Mörk overlay på bakgrund (0-1). */
  overlay?: number | string;
  children?: ReactNode;
}

interface Zone {
  emotion: string;
  verb: string;
  color: string;
  quote: string;
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

function parseZones(children: ReactNode): Zone[] {
  const items: string[] = [];

  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      const type = el.type;
      const tag = typeof type === "string" ? type : "";
      if (tag === "li") {
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
      if (parts.length < 4) return null;
      const [emotion, verb, color, ...rest] = parts;
      const quote = rest.join(" · ").replace(/^"|"$/g, "").replace(/^"|"$/g, "");
      return { emotion, verb, color, quote };
    })
    .filter((z): z is Zone => z !== null);
}

export function EmotionsSpectrum({
  kicker,
  chapter,
  title,
  subtitle,
  background,
  overlay,
  children,
}: EmotionsSpectrumProps) {
  const zones = useMemo(() => parseZones(children), [children]);
  const stepCount = zones.length;
  const step = useSlideSteps(stepCount + 1);

  const activeIndex = step - 1; // -1 = inget aktivt, 0..n-1 = zon

  const overlayValue =
    typeof overlay === "number"
      ? overlay
      : typeof overlay === "string"
        ? parseFloat(overlay)
        : 0.55;

  // När en bakgrundsbild med mörk overlay ligger bakom texten måste
  // primär/dämpad text vara fast ljus oavsett tema. Utan bakgrundsbild
  // ska texten följa temat (mörk på ljust tema, ljus på mörkt).
  const onDarkBg = Boolean(background);
  const textPrimary = onDarkBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = onDarkBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const quoteShadow = onDarkBg ? "0 2px 30px rgba(0,0,0,0.5)" : "none";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? "var(--slide-base, var(--bg))"
          : "radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Bakgrundsbild */}
      {background ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${background})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}
      {background ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${overlayValue})`,
          }}
        />
      ) : null}

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

      {/* Chapter */}
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
            color: textMuted,
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Topp: titel + subtitel */}
      <div
        style={{
          position: "absolute",
          top: "clamp(5rem, 11vh, 7rem)",
          left: "clamp(2rem, 5vw, 5rem)",
          right: "clamp(2rem, 5vw, 5rem)",
          textAlign: "center",
          zIndex: 4,
        }}
      >
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.9rem, 3.4vw, 3.2rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              color: textPrimary,
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            style={{
              marginTop: "clamp(0.5rem, 1vh, 0.9rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.35rem)",
              color: textMuted,
              lineHeight: 1.4,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {/* Citat-fönster — visas när en zon är aktiv */}
      <div
        style={{
          position: "absolute",
          top: "clamp(13rem, 30vh, 18rem)",
          left: "clamp(2rem, 8vw, 8rem)",
          right: "clamp(2rem, 8vw, 8rem)",
          bottom: "clamp(13rem, 26vh, 16rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {zones.map((zone, i) => (
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: activeIndex === i ? 1 : 0,
              y: activeIndex === i ? 0 : 12,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              maxWidth: "32em",
              margin: 0,
              padding: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.3rem, 2.2vw, 2.1rem)",
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              color: textPrimary,
              textAlign: "center",
              textShadow: quoteShadow,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "block",
                fontFamily: "var(--font-display)",
                fontStyle: "normal",
                fontSize: "clamp(0.85rem, 1vw, 1.05rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: zone.color,
                marginBottom: "clamp(0.6rem, 1vh, 1rem)",
                fontWeight: 600,
              }}
            >
              {zone.emotion} · {zone.verb}
            </span>
            "{zone.quote}"
          </motion.blockquote>
        ))}
      </div>

      {/* Spektrum-remsa nederst */}
      <div
        style={{
          position: "absolute",
          left: "clamp(2rem, 5vw, 5rem)",
          right: "clamp(2rem, 5vw, 5rem)",
          bottom: "clamp(3rem, 7vh, 5rem)",
          display: "flex",
          gap: "clamp(0.3rem, 0.8vw, 0.8rem)",
          zIndex: 4,
        }}
      >
        {zones.map((zone, i) => {
          const isActive = activeIndex === i;
          const isPast = activeIndex > i;
          const opacity = isActive ? 1 : isPast ? 0.55 : 0.28;
          const scale = isActive ? 1.06 : 1;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity, y: 0, scale }}
              transition={{
                duration: 0.5,
                delay: 0.9 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                flex: 1,
                aspectRatio: "3 / 4",
                maxHeight: "clamp(8rem, 16vh, 11rem)",
                borderRadius: "clamp(0.4rem, 0.6vw, 0.7rem)",
                background: `linear-gradient(160deg, ${zone.color} 0%, color-mix(in srgb, ${zone.color} 70%, #000) 100%)`,
                boxShadow: isActive
                  ? `0 8px 40px ${zone.color}, 0 0 0 2px color-mix(in srgb, ${zone.color} 60%, transparent)`
                  : `0 4px 16px rgba(0,0,0,0.3)`,
                padding: "clamp(0.8rem, 1.6vh, 1.2rem) clamp(0.6rem, 1.2vw, 1rem)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                color: "#0c0c10",
                transformOrigin: "center bottom",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                  fontWeight: 700,
                }}
              >
                0{i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {zone.emotion}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(0.75rem, 1vw, 1rem)",
                    opacity: 0.75,
                    marginTop: "0.15em",
                  }}
                >
                  {zone.verb}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
