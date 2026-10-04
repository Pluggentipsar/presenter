"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * HumanCapacities — tre eller fyra mänskliga förmågor som vinner i AI-eran.
 *
 * Stora editorial-kort i en horisontell rad. Varje kort har en egen
 * färg, ett accent-nummer, ett stort förmåge-ord och en poetisk underrad.
 * Korten är synliga från start men dämpade. Stega framåt → aktivt kort
 * skalas upp, får färg-glow och full opacity. Övriga dämpas ytterligare.
 *
 * Klimax-moment för avslutningsakten — när AI har gjort intelligens till
 * en råvara, är dessa förmågor vad som blir kvar. Sliden ska kännas som
 * en deklaration, inte en lista.
 *
 * MDX-format — varje rad är ett kort, separerade med ` · `:
 *
 * ```mdx
 * <HumanCapacities
 *   chapter="§ Det enda människan har"
 *   title="Skola är viktigare än någonsin."
 *   subtitle="Det är där lärarens roll blir oersättlig."
 * >
 * - Empati · Att se en annan människa — verkligen se. Att känna med, inte bara om.
 * - Meningsfullhet · Att vara närvarande i sammanhang som spelar roll. Att veta varför.
 * - Social kompetens · Att navigera mellanrummet mellan människor. Att skapa tillsammans.
 * </HumanCapacities>
 * ```
 */

interface HumanCapacitiesProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Mörk overlay (0-1). */
  overlay?: number | string;
  children?: ReactNode;
}

interface Capacity {
  word: string;
  body: string;
}

// Editorial, jordnära färgpalett — konjak / salvia / guld / dov blå
const CARD_COLORS = ["#C77352", "#7A9B72", "#B48A52", "#5E7C99"];

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

function parseCapacities(children: ReactNode): Capacity[] {
  const items: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      const t = el.type;
      if (typeof t === "string" && t === "li") {
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
      if (parts.length < 1) return null;
      const [word, ...rest] = parts;
      return { word, body: rest.join(" · ") };
    })
    .filter((c): c is Capacity => c !== null && c.word.length > 0)
    .slice(0, 6);
}

export function HumanCapacities({
  kicker,
  chapter,
  title,
  subtitle,
  background,
  overlay,
  children,
}: HumanCapacitiesProps) {
  const capacities = useMemo(() => parseCapacities(children), [children]);
  // Steps: 0 = alla dämpade, 1-3 = ett kort i fokus åt gången, 4 = alla aktiva symmetriskt
  const step = useSlideSteps(capacities.length + 2);
  const activeIndex = step >= 1 && step <= capacities.length ? step - 1 : -1;
  const allActive = step >= capacities.length + 1;

  const overlayValue =
    typeof overlay === "number"
      ? overlay
      : typeof overlay === "string"
        ? parseFloat(overlay)
        : 0.55;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, color-mix(in srgb, var(--bg-surface) 78%, var(--accent)) 0%, var(--bg) 75%)",
      }}
    >
      {background ? (
        <>
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
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `rgba(0,0,0,${overlayValue})`,
            }}
          />
        </>
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

      {/* Topp: titel + subtitel */}
      <div
        style={{
          position: "absolute",
          top: "clamp(6rem, 12vh, 8rem)",
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
              fontSize: "clamp(2.1rem, 3.8vw, 3.6rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              color: "var(--text)",
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
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              maxWidth: "44em",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.div>
        ) : null}
      </div>

      {/* Kort-rad */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          transform: "translateY(-42%)",
          display: "flex",
          // Wrap så sex förmågor kan ligga 3+3 i stället för att klämmas
          // ihop på en rad. Fyra eller färre wrappar aldrig.
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "stretch",
          gap: "clamp(1rem, 2.4vw, 2.4rem)",
          padding: "0 clamp(2rem, 5vw, 5rem)",
          zIndex: 3,
        }}
      >
        {capacities.map((capacity, i) => {
          const color = CARD_COLORS[i % CARD_COLORS.length];
          const isActive = activeIndex === i;
          const isDimmed = activeIndex !== -1 && !isActive;
          const opacity = allActive ? 1 : isActive ? 1 : isDimmed ? 0.32 : 0.6;
          const scale = isActive ? 1.04 : isDimmed ? 0.95 : 1;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28, scale: 0.92 }}
              animate={{
                opacity,
                y: 0,
                scale,
              }}
              transition={{
                duration: 0.8,
                delay: 0.9 + i * 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              data-hc-card=""
              data-active={isActive ? "true" : "false"}
              style={{
                flex: 1,
                maxWidth: "22rem",
                minWidth: "0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding:
                  "clamp(2rem, 4vh, 3rem) clamp(1.5rem, 2.4vw, 2.4rem)",
                background: isActive
                  ? `linear-gradient(180deg, color-mix(in srgb, ${color} 18%, var(--bg-surface)) 0%, var(--bg-surface) 100%)`
                  : "color-mix(in srgb, var(--bg-surface) 88%, transparent)",
                borderRadius: "clamp(0.5rem, 0.8vw, 0.9rem)",
                border: isActive
                  ? `1px solid color-mix(in srgb, ${color} 55%, transparent)`
                  : `1px solid color-mix(in srgb, var(--text) 8%, transparent)`,
                boxShadow: isActive
                  ? `0 0 0 1px color-mix(in srgb, ${color} 35%, transparent), 0 30px 80px -20px color-mix(in srgb, ${color} 55%, transparent), 0 4px 30px color-mix(in srgb, ${color} 25%, transparent)`
                  : "0 20px 50px -25px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.15)",
                transition:
                  "background 0.8s, border-color 0.8s, box-shadow 0.8s",
                position: "relative",
              }}
            >
              {/* Numerisk accent uppe */}
              <div
                aria-hidden
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.9vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: isActive
                    ? color
                    : "color-mix(in srgb, var(--text) 45%, transparent)",
                  fontWeight: 700,
                  transition: "color 0.8s",
                }}
              >
                0{i + 1}
              </div>

              {/* Tunn accent-linje */}
              <motion.div
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.9,
                  delay: 1.3 + i * 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  height: "2px",
                  width: "clamp(2.5rem, 4vw, 3.5rem)",
                  background: color,
                  marginTop: "clamp(1rem, 2vh, 1.5rem)",
                  marginBottom: "clamp(1.2rem, 2.4vh, 1.8rem)",
                  opacity: isActive ? 1 : 0.55,
                  transformOrigin: "center",
                  transition: "opacity 0.8s",
                }}
              />

              {/* Stora ordet */}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.8rem, 2.8vw, 2.6rem)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  color: isActive ? "var(--text)" : "var(--text)",
                  textAlign: "center",
                  textShadow: isActive
                    ? `0 0 30px color-mix(in srgb, ${color} 35%, transparent)`
                    : "none",
                  transition: "text-shadow 0.8s",
                }}
              >
                {capacity.word}
              </div>

              {/* Brödtext */}
              {capacity.body ? (
                <div
                  style={{
                    marginTop: "clamp(0.8rem, 1.6vh, 1.2rem)",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(0.9rem, 1.15vw, 1.05rem)",
                    lineHeight: 1.45,
                    color: isActive
                      ? "var(--text)"
                      : "var(--text-muted)",
                    textAlign: "center",
                    opacity: isActive ? 0.92 : 0.78,
                    transition: "color 0.8s, opacity 0.8s",
                  }}
                >
                  {capacity.body}
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
