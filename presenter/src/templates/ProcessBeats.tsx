"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ProcessBeatsProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Liten kicker överst, default "Delegera i steg" */
  kicker?: string;
  /**
   * Grundprompten som genererade flödet. Visas som en mono-styled
   * "DU SKICKAR"-card ovanför banan så publiken ser hur prompten är
   * disponerad. Stödjer **bold** för att markera Steg 1/2/3 etc.
   */
  prompt?: string;
  /** Etikett ovanför prompten. Default "Du skickar". */
  promptLabel?: string;
  /** Slutmening, italic, fungerar som pointe */
  closing?: string;
  /** Klickbar länkpill nere till höger (öppnas i ny flik) — t.ex.
   *  artefakten flödet producerade. Samma stil som LoopSteps uppstuds-pill. */
  link?: string;
  /** Text i länkpillen. Default "Öppna artefakten". */
  linkLabel?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista med beats. Format per rad:
   * `- label · caption · variant`
   *
   * - variant: optional. "input" | "ai" | "ai-key" | "human"
   *   påverkar färg på station-pricken.
   *   Default: "ai"
   *
   * Exempel:
   * - Du beskriver målet · Mål, kontext, begränsningar · input
   * - AI ställer frågor · Vad behöver klargöras? · ai
   * - AI strukturerar · Disposition, hypotes · ai
   * - AI bygger steg 1 · Första utkastet · ai-key
   * - Du granskar · Beslut + finputs · human
   */
  children?: ReactNode;
}

type Variant = "input" | "ai" | "ai-key" | "human";

interface Beat {
  label: string;
  caption: string;
  variant: Variant;
}

const VARIANT_COLOR: Record<Variant, string> = {
  input: "var(--text)", // cream — människan ger uppgiften
  ai: "currentAccent", // accent — ai gör jobbet
  "ai-key": "currentAccentBright", // accent ljusare — kritiskt steg
  human: "var(--text)", // cream — människan tar besluten
};

const VARIANT_LABEL: Record<Variant, string> = {
  input: "DU",
  ai: "AI",
  "ai-key": "AI",
  human: "DU",
};

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
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

function parseBeats(children: ReactNode): Beat[] {
  const beats: Beat[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    // Parsa baklänges: sista delen kan vara variant. Näst sista är caption.
    // Resten (joined med ·) är label. Det låter dig skriva
    // "Steg 1 · Frågor · Lång beskrivning · ai" och få Steg 1 · Frågor som label.
    const VALID_VARIANTS: Variant[] = ["input", "ai", "ai-key", "human"];
    let variant: Variant = "ai";
    let cursor = parts.length;
    const last = parts[cursor - 1];
    if (last && VALID_VARIANTS.includes(last as Variant)) {
      variant = last as Variant;
      cursor--;
    }
    let caption = "";
    if (cursor >= 2) {
      caption = parts[cursor - 1];
      cursor--;
    }
    const label = parts.slice(0, cursor).join(" · ");
    if (!label) return;
    beats.push({ label, caption, variant });
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
  return beats;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.6;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * ProcessBeats — visualiserar en process som flöder genom flera steg.
 *
 * Editorial zine-meets-metroline: en horisontal kurvad bana med
 * station-prickar som lyser upp i sekvens. Varje station har label
 * ovanför och caption nedanför. Färgkodning: cream för människan
 * (input/output), accent för AI-steg.
 *
 * Tänk: sektionsöppning för "delegera i steg".
 */
export function ProcessBeats({
  chapter,
  title,
  subtitle,
  kicker = "Delegera i steg",
  prompt,
  promptLabel = "Du skickar",
  closing,
  link,
  linkLabel = "Öppna artefakten",
  background,
  accent = "#B4763A",
  overlay,
  children,
}: ProcessBeatsProps) {
  const beats = parseBeats(children);
  const accentBright = lighten(accent, 0.18);
  const onPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));

  // Stegvis reveal: ett extra steg + 1 för att alla beats + closing ska
  // synas på sista klicket (off-by-one i useSlideSteps).
  const activeStep = useSlideSteps(beats.length + 2);
  // activeStep 0 = bara titel + kicker
  // activeStep 1 = beat[0] visible
  // activeStep N = beat[N-1] visible
  // activeStep N+1 = closing visible

  // Beräkna positioner längs banan — banan är curved, ~y=58 till y=62
  // Y oscillerar lätt så banan känns levande.
  const beatPositions = beats.map((_, i) => {
    const totalSpan = beats.length > 1 ? beats.length - 1 : 1;
    const t = totalSpan === 0 ? 0.5 : i / totalSpan;
    const x = 12 + t * 76; // 12% till 88%
    const y = 60 + Math.sin((t * Math.PI * 2 - 0.5) * 1) * 2.5;
    return { x, y };
  });

  // SVG path som binder ihop alla beats — Catmull-Rom-likt
  const pathD = beatPositions.length > 1
    ? buildSmoothPath(beatPositions)
    : "";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{ background: resolveBackground(background, overlay ?? 0.6) }}
    >
      {/* Aurora-bakgrundslager — märkta som ambient så att kobolt kan släcka dem */}
      <div
        data-ambient-bg=""
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 65%, ${withAlpha(accent, 0.11)} 0%, ${withAlpha(accent, 0.025)} 35%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      <div
        data-ambient-bg=""
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, color-mix(in srgb, var(--text) 4%, transparent) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />
      {/* Vinjett */}
      <div
        data-ambient-bg=""
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, color-mix(in srgb, var(--text) 16%, transparent) 100%)",
          zIndex: 1,
        }}
      />

      {/* Header — centrerad, editorial */}
      <div
        className="absolute"
        style={{
          top: "clamp(3rem, 8vh, 6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.85rem",
          textAlign: "center",
          maxWidth: "44em",
          padding: "0 clamp(1rem, 3vw, 2rem)",
        }}
      >
        {chapter ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
            }}
          >
            <span
              style={{
                width: "1.6rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
            <EditableText path="chapter" value={chapter ?? ""}>
              {chapter}
            </EditableText>
            <span
              style={{
                width: "1.6rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
          </motion.div>
        ) : null}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(2rem, 4.6vw, 3.8rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.028em",
              color: "var(--text)",
              margin: 0,
              textShadow: onPhoto ? "0 2px 28px rgba(0,0,0,0.65)" : "none",
            }}
          >
            <EditableText path="title" value={title ?? ""}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
              color: "var(--text-muted)",
              margin: 0,
              maxWidth: "32em",
              lineHeight: 1.4,
              textShadow: onPhoto ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
            }}
          >
            <EditableText path="subtitle" value={subtitle ?? ""}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* Prompt-card — visar grundprompten som DU skickade. Alltid synlig. */}
      {prompt ? (
        // Centreringen ligger i ett OANIMERAT omslag — samma skäl som för
        // stationerna: framer-motion bygger om transform när y animeras och
        // slänger translateX(-50%), så kortet hängde med vänsterkanten på 50 %.
        <div
          style={{
            position: "absolute",
            top: "clamp(15rem, 30vh, 21rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            width: "min(64em, 86vw)",
          }}
        >
        <motion.div
          data-card=""
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "100%",
            background: "var(--bg-elevated)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${withAlpha(accent, 0.4)}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: "4px",
            padding: "0.85rem 1.4rem 1rem",
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          }}
        >
          {/* Etikett */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              marginBottom: "0.55rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <span
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
              }}
            />
            <span>{promptLabel}</span>
          </div>
          {/* Prompttext med bold-rendering */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.85vw, 0.88rem)",
              lineHeight: 1.5,
              color: "var(--text)",
              whiteSpace: "pre-wrap",
              maxHeight: "clamp(8rem, 18vh, 12rem)",
              overflowY: "auto",
            }}
          >
            {renderPromptInline(prompt, accent)}
          </div>
        </motion.div>
        </div>
      ) : null}

      {/* Kicker-rubrik strax ovanför banan — försvinner när första klicket trycks */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: activeStep === 0 ? 0.7 : 0,
          y: 0,
        }}
        transition={{ duration: 0.45, delay: activeStep === 0 ? 0.45 : 0 }}
        style={{
          position: "absolute",
          top: prompt ? "49%" : "44%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: accent,
          pointerEvents: "none",
        }}
      >
        ↓&nbsp;&nbsp;{prompt ? "AI gör" : kicker}&nbsp;&nbsp;↓
      </motion.div>

      {/* SVG-banan */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 2 }}
      >
        <defs>
          <linearGradient id="beats-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="8%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="92%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Bakgrund: enkel rät linje som "spår" */}
        <line
          x1="6"
          y1="60"
          x2="94"
          y2="60"
          stroke="color-mix(in srgb, var(--text) 8%, transparent)"
          strokeWidth="0.08"
          strokeDasharray="0.4 0.6"
          vectorEffect="non-scaling-stroke"
        />
        {/* Curved path som binder ihop beats — drar sig fram steg för steg */}
        {pathD ? (
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#beats-line)"
            strokeWidth={0.32}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{
              // Banan ritas fram till och med aktuell beat
              pathLength:
                beats.length === 0
                  ? 0
                  : Math.min(activeStep, beats.length) / beats.length,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {/* Tick-markeringar längs banan i bakgrunden */}
        {Array.from({ length: 32 }).map((_, i) => {
          const t = i / 31;
          const x = 6 + t * 88;
          return (
            <line
              key={`tick-${i}`}
              x1={x}
              y1={59.4}
              x2={x}
              y2={i % 4 === 0 ? 60.7 : 60.3}
              stroke="color-mix(in srgb, var(--text) 22%, transparent)"
              strokeWidth="0.05"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Beats — station-prickar med labels */}
      <div className="absolute inset-0" style={{ zIndex: 3 }}>
        {beats.map((beat, i) => {
          const pos = beatPositions[i];
          const colorRaw = VARIANT_COLOR[beat.variant];
          const dotColor =
            colorRaw === "currentAccent"
              ? accent
              : colorRaw === "currentAccentBright"
                ? accentBright
                : colorRaw;
          const variantBadge = VARIANT_LABEL[beat.variant];
          const isAi = beat.variant === "ai" || beat.variant === "ai-key";
          const isKey = beat.variant === "ai-key";
          const numeral = String(i + 1).padStart(2, "0");
          // Beat är synlig när activeStep > i (1-indexed klick).
          const isRevealed = activeStep > i;

          return (
            // Centreringen ligger i ett OANIMERAT omslag. Beaten animerar y,
            // och framer-motion bygger då om transform och slänger
            // translate(-50%,-50%) — stationerna hängde med sin vänsterkant
            // på 12/50/88 %, så den sista klistrade sig mot högerkanten.
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                width: "clamp(8rem, 13vw, 14rem)",
              }}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 6 }}
              animate={{
                opacity: isRevealed ? 1 : 0,
                scale: isRevealed ? 1 : 0.8,
                y: isRevealed ? 0 : 6,
              }}
              transition={{
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
                width: "100%",
              }}
            >
              {/* Label ovanför */}
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 1.2rem)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    // 0.58rem var 9 px på en 1280-scen — oläsligt bortom
                    // tredje bänkraden. Stegmärket säger VEM som gör steget
                    // (DU eller AI) och är halva poängen med sliden.
                    fontSize: "clamp(0.68rem, 0.95vw, 0.92rem)",
                    letterSpacing: "0.26em",
                    color: isAi ? accent : "var(--text-muted)",
                    marginBottom: "0.35rem",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ opacity: 0.55 }}>{numeral}</span>
                  <span
                    style={{
                      margin: "0 0.5em",
                      opacity: 0.4,
                      letterSpacing: 0,
                    }}
                  >
                    ·
                  </span>
                  {variantBadge}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isKey
                      ? "clamp(1.25rem, 1.95vw, 1.85rem)"
                      : "clamp(1.15rem, 1.75vw, 1.65rem)",
                    fontWeight: isKey ? 600 : 500,
                    fontStyle: beat.variant === "input" || beat.variant === "human" ? "italic" : "normal",
                    color: "var(--text)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    textShadow: onPhoto ? "0 2px 18px rgba(0,0,0,0.6)" : "none",
                  }}
                >
                  {beat.label}
                </div>
              </div>

              {/* Station-pricken */}
              <div style={{ position: "relative" }}>
                {/* Pulse-ring för key-steg */}
                {isKey ? (
                  <motion.div
                    animate={{
                      scale: [1, 2.2, 1],
                      opacity: [0.55, 0, 0.55],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.4,
                    }}
                    style={{
                      position: "absolute",
                      inset: "-0.45rem",
                      borderRadius: "50%",
                      border: `1px solid ${dotColor}`,
                    }}
                  />
                ) : null}
                {/* Yttre ring för AI-steg */}
                {isAi ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: "-0.4rem",
                      borderRadius: "50%",
                      border: `1px solid ${dotColor}`,
                      opacity: 0.32,
                    }}
                  />
                ) : null}
                {/* Själva pricken */}
                <motion.div
                  data-glow
                  animate={{
                    opacity: [0.85, 1, 0.85],
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 3 + (i % 2),
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1,
                  }}
                  style={{
                    width: isKey ? "0.85rem" : isAi ? "0.65rem" : "0.55rem",
                    height: isKey ? "0.85rem" : isAi ? "0.65rem" : "0.55rem",
                    borderRadius: "50%",
                    background: dotColor,
                    boxShadow: isKey
                      ? `0 0 24px ${dotColor}, 0 0 8px ${dotColor}`
                      : isAi
                        ? `0 0 16px ${dotColor}80, 0 0 5px ${dotColor}`
                        : `0 0 14px color-mix(in srgb, var(--text) 40%, transparent)`,
                  }}
                />
              </div>

              {/* Caption nedanför */}
              {beat.caption ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 1.2rem)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    textAlign: "center",
                    width: "100%",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    // Beskrivningen låg på 12 px medan rubriken fick 59.
                    // Stegen ÄR innehållet — de ska bära till bortre raden
                    // i en biosalong, inte bara till första bänkraden.
                    fontSize: "clamp(1.05rem, 1.58vw, 1.48rem)",
                    color: onPhoto ? "var(--text)" : "var(--text-muted)",
                    lineHeight: 1.4,
                    textShadow: onPhoto ? "0 1px 10px rgba(0,0,0,0.5)" : "none",
                  }}
                >
                  {beat.caption}
                </div>
              ) : null}
            </motion.div>
            </div>
          );
        })}
      </div>

      {/* Closing — visas när alla beats revealats */}
      {closing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: activeStep > beats.length ? 1 : 0,
            y: activeStep > beats.length ? 0 : 8,
          }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: "clamp(2.2rem, 5vh, 4rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 1.35vw, 1.35rem)",
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "32em",
            lineHeight: 1.4,
            padding: "0 clamp(1rem, 3vw, 2rem)",
            textShadow: onPhoto ? "0 2px 18px rgba(0,0,0,0.55)" : "none",
          }}
        >
          <EditableText path="closing" value={closing ?? ""}>
            {closing}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Länkpill — samma visuella språk som LoopSteps uppstuds-pill */}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "clamp(1.4rem, 3.4vh, 2.4rem)",
            right: "clamp(2rem, 4.5vw, 4.5rem)",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.45rem 0.9rem",
            borderRadius: 999,
            background: "var(--bg-surface)",
            border: `1.5px solid ${withAlpha(accent, 0.45)}`,
            boxShadow: `0 10px 26px -16px ${withAlpha(accent, 0.5)}`,
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.14em",
            color: "var(--text)",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 0,
              height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderLeft: `8px solid ${withAlpha(accent, 0.75)}`,
            }}
          />
          <EditableText path="linkLabel" value={linkLabel}>
            {linkLabel}
          </EditableText>
          <span aria-hidden style={{ color: accent, fontSize: "0.9em" }}>
            ↗
          </span>
        </a>
      ) : null}
    </div>
  );
}

/** Bygg en mjuk SVG-path genom punkterna med Catmull-Rom-liknande kurva. */
function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    // Catmull-Rom till Bezier
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Rendera prompttext med stöd för **bold** (markeras med accent-färg).
 * Newlines bevaras eftersom container har white-space: pre-wrap.
 */
function renderPromptInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** Lighten en hex-färg med en faktor 0-1. */
function lighten(hex: string, factor: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return hex;
  const [r, g, b] = m.map((s) => parseInt(s, 16));
  const lr = Math.min(255, Math.round(r + (255 - r) * factor));
  const lg = Math.min(255, Math.round(g + (255 - g) * factor));
  const lb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${[lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
