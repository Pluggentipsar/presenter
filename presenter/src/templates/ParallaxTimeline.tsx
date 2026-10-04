"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ParallaxTimeline — staged-reveal timeline med kort som byter plats med parallax.
 *
 * Aktivt kort står centrerat och fullt synligt. Tidigare och kommande kort
 * ligger på sidorna med minskad scale, opacity och blur (djupkänsla). När
 * publiken stegar fram så glider alla kort åt vänster — parallax-effekten
 * uppstår av att kort på olika "djup" rör sig olika långt visuellt.
 *
 * Användning:
 * ```mdx
 * <ParallaxTimeline
 *   chapter="§ Berättelsen om AI"
 *   background="https://cdn.midjourney.com/151fcf68-f588-4142-b106-a2388d9d6ce0/0_0.png"
 *   accent= "var(--accent)"
 * >
 * - 2019 · Modeller som knappt kan räkna till 10
 * - 2022 · GPT-3.5 — smart mellanstadieelev
 * - 2023 · GPT-4 — klarar juristexamen och högskoleprovet
 * - 2024 · Doktorandnivå
 * - 2025 · IMO-guld · Bättre poesi · Deep research · Diagnoser
 * - 2026 · ?
 * </ParallaxTimeline>
 * ```
 *
 * Format på varje rad: `år · text` — separatorn är " · " (mellanslag-bullet-mellanslag).
 * Allt efter första " · " blir beskrivningstext.
 */

interface ParallaxTimelineProps {
  /** Chapter-tagg uppe till höger. */
  chapter?: string;
  /** Bakgrundsbild eller färg. URL ger bild med dark overlay. */
  background?: string;
  /** Accentfärg för aktivt år och prick-indikator. */
  accent?: string;
  /** Mörk overlay (0-1) på bakgrunden. Default 0.55. */
  overlay?: number | string;
  /**
   * Extra "payoff"-steg efter sista året: aktiveras när `payoffImage` är satt.
   * Året glider åt vänster (samma parallax-rörelse som de andra) och payoff-
   * bilden glider in från höger. `payoffStamp` fades in uppe till vänster
   * för att signalera att vi fortfarande är i samma år.
   */
  payoffImage?: string;
  /** Caption-rubrik under payoff-bilden. */
  payoffTitle?: string;
  /** Stamp-text uppe till vänster när payoff är aktiv. Default: sista årets `year`. */
  payoffStamp?: string;
  /** Markdown-lista. Format per rad: "år · text". */
  children?: ReactNode;
}

interface YearItem {
  year: string;
  text: string;
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

function parseItems(children: ReactNode): YearItem[] {
  const items: YearItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag === "ul" || tag === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (!isValidElement(li)) return;
        if ((li as ReactElement).type !== "li") return;
        const raw = extractText(
          (li as ReactElement<{ children?: ReactNode }>).props.children,
        ).trim();
        if (!raw) return;
        const idx = raw.indexOf(" · ");
        if (idx > -1) {
          items.push({
            year: raw.slice(0, idx).trim(),
            text: raw.slice(idx + 3).trim(),
          });
        } else {
          items.push({ year: raw, text: "" });
        }
      });
    }
  });
  return items;
}

// Sant när bakgrunden är ett foto med mörk overlay-scrim — då är ytan mörk
// oavsett tema, så texten ovanpå måste hållas fast ljus.
function isPhotoBackdrop(bg: string | undefined): boolean {
  return Boolean(bg && (bg.startsWith("/") || bg.startsWith("http")));
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) {
    return "var(--slide-base, var(--bg))";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// Visuell ramp baserat på avstånd från aktivt kort.
// abs: 0 (aktiv), 1 (granne), 2 (utkant), 3+ (off-stage).
function styleForOffset(abs: number) {
  switch (abs) {
    case 0:
      return { scale: 1, opacity: 1, blur: 0 };
    case 1:
      return { scale: 0.6, opacity: 0.4, blur: 2 };
    case 2:
      return { scale: 0.42, opacity: 0.18, blur: 4 };
    default:
      return { scale: 0.32, opacity: 0, blur: 6 };
  }
}

export function ParallaxTimeline({
  chapter,
  background,
  accent = "var(--accent)",
  overlay = 0.55,
  payoffImage,
  payoffTitle,
  payoffStamp,
  children,
}: ParallaxTimelineProps) {
  const items = parseItems(children);
  // När bakgrunden är ett foto med mörk scrim ligger all text på mörk yta
  // oavsett tema — håll den fast ljus. Annars följer texten temat.
  const onDark = isPhotoBackdrop(background);
  const textPrimary = onDark ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMuted = onDark ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const hasPayoff = Boolean(payoffImage);
  const totalSteps = items.length + (hasPayoff ? 1 : 0);
  const activeStep = useSlideSteps(totalSteps);
  const isPayoffActive = hasPayoff && activeStep >= items.length;
  const stampText = payoffStamp ?? items[items.length - 1]?.year ?? "";

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
            color: textMuted,
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Stamp — uppe till vänster, syns bara i payoff-läge */}
      {hasPayoff && stampText ? (
        <motion.div
          initial={false}
          animate={{
            opacity: isPayoffActive ? 1 : 0,
            y: isPayoffActive ? 0 : -8,
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
            delay: isPayoffActive ? 0.2 : 0,
          }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.75rem, 1vw, 1.05rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: accent,
            zIndex: 5,
          }}
        >
          {stampText}
        </motion.div>
      ) : null}

      {/* Stage med korten */}
      <div style={{ position: "absolute", inset: 0 }}>
        {items.map((item, i) => {
          const offset = i - activeStep;
          const abs = Math.abs(offset);
          const { scale, opacity, blur } = styleForOffset(abs);
          // Horisontellt avstånd per steg, i % av slide-canvas. Ger
          // parallax-känslan eftersom djupare kort skalar ner snabbare.
          const xPct = offset * 24;
          const cardStyle: CSSProperties = {
            position: "absolute",
            left: `calc(50% + ${xPct}%)`,
            top: "50%",
            translate: "-50% -50%",
            width: "min(640px, 36%)",
            textAlign: "left",
            pointerEvents: "none",
            // CSS-transition för left (parent-relativ), framer-motion för
            // transform (scale/opacity/filter). Båda matchar 700 ms.
            transition:
              "left 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          };
          const isActive = abs === 0;

          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                scale,
                opacity,
                filter: `blur(${blur}px)`,
              }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={cardStyle}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(5.5rem, 11vw, 11rem)",
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: isActive ? accent : textPrimary,
                  textShadow: isActive ? `0 0 60px ${withAlpha(accent, 0.2)}` : "none",
                  marginBottom: item.text ? "1.4rem" : 0,
                }}
              >
                {item.year}
              </div>
              {item.text ? (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.1rem, 1.6vw, 1.7rem)",
                    lineHeight: 1.35,
                    color: textPrimary,
                    maxWidth: "32ch",
                    fontWeight: 400,
                  }}
                >
                  {item.text}
                </div>
              ) : null}
            </motion.div>
          );
        })}

        {/* Payoff — glider in från höger när sista steget passeras */}
        {hasPayoff ? (
          <motion.div
            initial={false}
            animate={{
              x: isPayoffActive ? "0%" : "35%",
              opacity: isPayoffActive ? 1 : 0,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              translate: "-50% -50%",
              width: "min(1100px, 78%)",
              pointerEvents: "none",
            }}
          >
            <img
              src={payoffImage}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "0.75rem",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              }}
            />
            {payoffTitle ? (
              <div
                style={{
                  marginTop: "1.4rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.3rem, 1.9vw, 2rem)",
                  lineHeight: 1.25,
                  color: textPrimary,
                  textAlign: "center",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {payoffTitle}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      {/* Steg-indikator nederst */}
      {totalSteps > 1 ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(2.4rem, 5vh, 4rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.7rem",
            alignItems: "center",
            zIndex: 5,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isActive = i === activeStep;
            const label = items[i]?.year ?? stampText;
            return (
              <div
                key={i}
                style={{
                  width: isActive ? "2.6rem" : "0.5rem",
                  height: "0.5rem",
                  borderRadius: "0.3rem",
                  background: isActive
                    ? accent
                    : onDark
                      ? "rgba(247,241,230,0.22)"
                      : withAlpha(accent, 0.28),
                  transition:
                    "all 480ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                aria-label={label}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
