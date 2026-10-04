"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BiasShowcase — centerstage-mode för en serie kognitiva bias med ett
 * konkret exempel per. Stega framåt för att crossfade till nästa bias.
 *
 * Varje bias visar:
 *   1. Bias-namn (stort, accent-färgat)
 *   2. Kort beskrivning (italic)
 *   3. Chat-bubble med AI:s "claim"
 *   4. Pil + reaktion (vad användarens hjärna gör automatiskt)
 *   5. Truth-reveal (vad som FAKTISKT är sant — accent-färgat)
 *
 * Animation: bias-namnet slammar in, stagger ner till truth-reveal.
 *
 * MDX-format:
 * ```mdx
 * <BiasShowcase
 *   chapter="§ Bias · Mötet med AI"
 *   title="Och våra egna bias möter AI:s."
 *   subtitle="Stega genom — varje bias har sin **scenario**."
 *   accent= "var(--accent)"
 * >
 * - Automationsbias · Vi litar mer på automatiserade system — även när de har fel. · "Datumet är torsdag den 15:e." · Du kollar inte kalendern. · Det är onsdag den 14:e.
 * - Halo-effekt · Välformulerat = sant. Hjärnan tar genvägen. · "Som Mark Twain sa: 'Sanningen är märkligare än fiktionen.'" · "Klassiskt!", tänker du. · Twain sa aldrig det. AI hittade på.
 * - Confirmation bias · Vi söker det vi redan tror. AI levererar det. · Fråga "är AI farligt?" → AI ger riskerna. Fråga "är AI bra?" → AI ger fördelarna. · Båda låter sanna. · AI bekräftar dig — oavsett vad du tror.
 * - Authority bias · AI låter som en expert — så vi behandlar den som en. · "Forskning visar att 73% av..." · Du nickar. Det låter trovärdigt. · AI har inte läst studien. Siffran är genererad.
 * </BiasShowcase>
 * ```
 *
 * Per rad: `Bias-namn · Beskrivning · AI-claim · Reaktion · Sanning`.
 */

interface BiasShowcaseProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  children?: ReactNode;
}

interface BiasItem {
  name: string;
  description: string;
  claim: string;
  reaction: string;
  truth: string;
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

function parseBiases(children: ReactNode): BiasItem[] {
  const out: BiasItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    out.push({
      name: (parts[0] ?? "").trim(),
      description: (parts[1] ?? "").trim(),
      claim: (parts[2] ?? "").trim(),
      reaction: (parts[3] ?? "").trim(),
      truth: parts.slice(4).join(" · ").trim(),
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
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function BiasShowcase({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: BiasShowcaseProps) {
  const biases = useMemo(() => parseBiases(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(Math.max(biases.length, 1));
  const current = biases[step];

  // När en foto-/url-bakgrund sätts läggs ett mörkt scrim på (resolveBackground).
  // Då måste texten vara fast ljus oavsett tema — annars blir var(--text) nära
  // svart på dagsljus och försvinner mot scrimmet.
  const hasPhotoBg = Boolean(
    background && (background.startsWith("/") || background.startsWith("http"))
  );
  const textColor = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
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
            color: mutedColor,
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Subtil radial-glow bakom centerstage */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "75vmin",
          height: "55vmin",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${withAlpha(accent, 0.16)} 0%, transparent 65%)`,
          filter: "blur(40px)",
          zIndex: 1,
        }}
      />

      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.2rem, 4vw, 4rem)",
          gap: "clamp(1rem, 2vh, 1.6rem)",
          zIndex: 2,
        }}
      >
        {/* Title + subtitle */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: textColor,
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
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
                fontSize: "clamp(0.9rem, 1.2vw, 1.2rem)",
                color: textColor,
                marginTop: "0.4rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Centerstage — crossfade per bias */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
            position: "relative",
          }}
        >
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.6rem, 1.4vh, 1.1rem)",
                  width: "100%",
                  maxWidth: "min(1100px, 90%)",
                }}
              >
                {/* Bias-namn — huge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1,
                    ease: [0.22, 1.05, 0.36, 1],
                  }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(2.2rem, 4.5vw, 4.4rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: accent,
                    textAlign: "center",
                    textShadow: `0 0 50px ${withAlpha(accent, 0.33)}`,
                    margin: 0,
                  }}
                >
                  {current.name}
                </motion.div>

                {/* Beskrivning */}
                {current.description ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 0.85, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                      lineHeight: 1.4,
                      color: textColor,
                      textAlign: "center",
                      maxWidth: "30em",
                      marginBottom: "clamp(0.4rem, 1vh, 0.8rem)",
                    }}
                  >
                    {renderInline(current.description, accent)}
                  </motion.div>
                ) : null}

                {/* Scenario-låda: AI-claim → reaktion */}
                {current.claim ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.95 }}
                    style={{
                      width: "100%",
                      maxWidth: "min(900px, 90%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: "clamp(0.5rem, 1vh, 0.8rem)",
                    }}
                  >
                    {/* AI-bubbla */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: "clamp(2rem, 2.6vw, 2.6rem)",
                          height: "clamp(2rem, 2.6vw, 2.6rem)",
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${accent} 0%, ${withAlpha(accent, 0.67)} 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-mono)",
                          fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                          fontWeight: 700,
                          color: "#0a0908",
                          boxShadow: `0 0 18px ${withAlpha(accent, 0.4)}`,
                        }}
                      >
                        AI
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding:
                            "clamp(0.7rem, 1.2vw, 1.1rem) clamp(1rem, 1.6vw, 1.5rem)",
                          background:
                            "linear-gradient(135deg, rgba(247,241,230,0.96) 0%, rgba(247,241,230,0.92) 100%)",
                          color: "#0a0908",
                          borderRadius:
                            "0.2rem 0.85rem 0.85rem 0.85rem",
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
                          lineHeight: 1.35,
                          letterSpacing: "-0.005em",
                          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)",
                        }}
                      >
                        "{current.claim}"
                      </div>
                    </div>

                    {/* Reaktion — pil + tankbubbla */}
                    {current.reaction ? (
                      <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 1.55 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7rem",
                          paddingLeft:
                            "calc(clamp(2rem, 2.6vw, 2.6rem) + 0.6rem)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "clamp(1rem, 1.4vw, 1.3rem)",
                            color: withAlpha(accent, 0.6),
                          }}
                        >
                          →
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            fontSize: "clamp(0.95rem, 1.25vw, 1.2rem)",
                            color: textColor,
                            lineHeight: 1.35,
                          }}
                        >
                          {renderInline(current.reaction, accent)}
                        </span>
                      </motion.div>
                    ) : null}
                  </motion.div>
                ) : null}

                {/* Truth-reveal */}
                {current.truth ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.7,
                      delay: 2.15,
                      ease: [0.22, 1.05, 0.36, 1],
                    }}
                    style={{
                      marginTop: "clamp(0.6rem, 1.2vh, 1rem)",
                      padding:
                        "clamp(0.8rem, 1.4vw, 1.3rem) clamp(1.1rem, 2vw, 1.8rem)",
                      background: `linear-gradient(90deg, ${withAlpha(accent, 0.1)} 0%, ${withAlpha(accent, 0.16)} 100%)`,
                      border: `1.5px solid ${withAlpha(accent, 0.53)}`,
                      borderRadius: "0.5rem",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                      lineHeight: 1.35,
                      letterSpacing: "-0.005em",
                      color: textColor,
                      boxShadow: `0 0 30px ${withAlpha(accent, 0.2)}, inset 0 1px 0 ${withAlpha(accent, 0.27)}`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.7rem",
                      maxWidth: "min(900px, 90%)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: accent,
                        fontWeight: 700,
                        flexShrink: 0,
                        paddingTop: "0.15em",
                      }}
                    >
                      Sanning
                    </span>
                    <span style={{ flex: 1 }}>
                      {renderInline(current.truth, accent)}
                    </span>
                  </motion.div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Stega-indikator */}
        {biases.length > 1 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{
              flexShrink: 0,
              alignSelf: "center",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: withAlpha(accent, 0.67),
            }}
          >
            <span>← →</span>
            <span style={{ color: mutedColor }}>
              {String(step + 1).padStart(2, "0")} /{" "}
              {String(biases.length).padStart(2, "0")}
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
