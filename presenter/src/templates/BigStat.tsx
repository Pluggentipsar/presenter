"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { withAlpha } from "@/lib/gradient-presets";

interface BigStatProps {
  /** Siffran att räkna upp till */
  value: number | string;
  /** Suffix, t.ex. "%", " miljoner" */
  suffix?: string;
  /** Prefix, t.ex. "$", "+" */
  prefix?: string;
  /** Label/beskrivning ovanför siffran (UPPERCASE eyebrow) */
  eyebrow?: string;
  /** Längre kontext OVANFÖR siffran (t.ex. "I Sverige idag...") */
  contextAbove?: string;
  /** Längre kontext UNDER siffran (huvudbudskapet) */
  contextBelow?: string;
  /** Källa (visas litet längst ned, UPPERCASE) */
  source?: string;
  /** Animationstid i sekunder (default 2) */
  duration?: number | string;
  /** Decimaler */
  decimals?: number | string;
  /**
   * Layout-stil:
   * - "editorial" (default): vänsterjusterat, eyebrow → siffra → kontext → källa
   * - "centered": symmetrisk, allt centrerat
   * - "frame": siffran sitter i en accent-färgad ram med kontext bredvid
   */
  layout?: "editorial" | "centered" | "frame";
  /** Färg på själva siffran (default = accent) */
  color?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Om true: suffix renderas på egen rad UNDER siffran istället för
   * inline. Använd när suffix är ett långt ord (typ " människor") som
   * spiller över ytan när siffran är stor.
   */
  wrapSuffix?: boolean;
  /**
   * Om true: rita en accent-färgad bakgrundsbar som växer från 0 till
   * `value`% av slidens bredd, synkat med räkne-animationen. Bra för
   * andelar/procent där bilden förstärker siffran visuellt.
   */
  fillBar?: boolean;
}

/**
 * BigStat — editorial-typografi för en chock-siffra med rik kontext.
 * Mer berättande än StatCounter, mer flexibel än Callout.
 *
 * <BigStat
 *   eyebrow="Siffran ingen vill prata om"
 *   contextAbove="Just nu, i Sverige,"
 *   value={240000}
 *   contextBelow="barn och unga lever under hedersrelaterat förtryck."
 *   source="Stiftelsen Allmänna Barnhuset, 2018"
 * />
 */
export function BigStat({
  value,
  suffix = "",
  prefix = "",
  eyebrow,
  contextAbove,
  contextBelow,
  source,
  duration = 2,
  decimals = 0,
  layout = "editorial",
  color,
  background,
  overlay,
  overlayMode = "dark",
  wrapSuffix = false,
  fillBar = false,
}: BigStatProps) {
  const hasBackground = Boolean(background);
  const containerStyle = hasBackground
    ? { background: buildBackgroundCss(background, overlay, overlayMode) }
    : undefined;
  const targetValue = Number(value);
  const decimalsNum =
    typeof decimals === "string" ? parseInt(decimals, 10) : decimals;
  const durationNum =
    typeof duration === "string" ? parseFloat(duration) : duration;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(targetValue)) return;
    let cancelled = false;
    const delayMs = 450;
    const totalMs = durationNum * 1000;
    const tickMs = 1000 / 60; // ~16ms
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    let timer: ReturnType<typeof setTimeout> | null = null;
    let startMs = 0;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startMs - delayMs;
      if (elapsed < 0) {
        timer = setTimeout(tick, tickMs);
        return;
      }
      if (elapsed >= totalMs) {
        setDisplayValue(targetValue);
        return;
      }
      const progress = elapsed / totalMs;
      setDisplayValue(targetValue * easeOut(progress));
      timer = setTimeout(tick, tickMs);
    };

    startMs = performance.now();
    timer = setTimeout(tick, tickMs);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [targetValue, durationNum]);

  const formatted = displayValue.toLocaleString("sv-SE", {
    minimumFractionDigits: decimalsNum,
    maximumFractionDigits: decimalsNum,
  });

  const numColor = color ?? "var(--accent)";

  // När en bild/CSS-bakgrund (ej tema-bg) ligger under texten kan vi inte lita
  // på tema-tokens — på ljust tema blir var(--text) nästan svart och försvinner
  // mot ett mörkt foto. Lås då texten till ljus; annars följ temat.
  const textPrimary = hasBackground ? "rgba(245,246,250,0.92)" : "var(--text)";
  const textMutedColor = hasBackground
    ? "rgba(245,246,250,0.6)"
    : "var(--text-muted)";

  const numberBlock = (
    <div
      className={
        wrapSuffix
          ? "flex flex-col items-start leading-[0.9]"
          : "flex items-baseline leading-[0.85]"
      }
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: "var(--heading-weight)",
        letterSpacing: "-0.04em",
      }}
    >
      <div className="flex items-baseline">
        {prefix && (
          <span
            className="mr-2"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              color: textMutedColor,
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            fontSize: "var(--room-stat-number, clamp(7rem, 22vw, 18rem))",
            color: numColor,
            textShadow: "0 0 60px var(--accent-glow)",
          }}
        >
          {formatted}
        </span>
        {suffix && !wrapSuffix && (
          <span
            className="ml-2 font-semibold"
            style={{
              fontSize: "clamp(3rem, 9vw, 7rem)",
              color: textPrimary,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {suffix && wrapSuffix && (
        <span
          className="font-semibold"
          style={{
            fontSize: "clamp(2.4rem, 6vw, 5rem)",
            color: textPrimary,
            marginTop: "0.2em",
          }}
        >
          {suffix.trim()}
        </span>
      )}
    </div>
  );

  if (layout === "frame") {
    return (
      <div className="slide-container" data-no-avsandar-footer style={containerStyle}>
        <div
          className="grid w-full items-center gap-10"
          style={{
            maxWidth: "var(--slide-max-width)",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          }}
        >
          <motion.div
            className="flex flex-col items-start gap-4 border p-10"
            style={{
              borderRadius: "var(--radius)",
              borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)",
              borderWidth: "2px",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              boxShadow: "0 0 60px color-mix(in srgb, var(--accent) 18%, transparent)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {eyebrow && (
              <span
                className="text-xs uppercase tracking-[0.35em]"
                style={{ color: textMutedColor }}
              >
                <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
              </span>
            )}
            {numberBlock}
            {source && (
              <span
                className="text-[0.7rem] uppercase tracking-[0.25em]"
                style={{ color: textMutedColor }}
              >
                {source}
              </span>
            )}
          </motion.div>
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {contextAbove && (
              <p
                className="leading-snug"
                style={{ fontSize: "var(--room-body, clamp(1rem, 1.5vw, 1.25rem))", color: textMutedColor }}
              >
                {contextAbove}
              </p>
            )}
            {contextBelow && (
              <p
                className="leading-snug"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                  color: textPrimary,
                }}
              >
                {contextBelow}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const isCentered = layout === "centered";
  const fillBarStyle = fillBar
    ? {
        ...containerStyle,
        position: "relative" as const,
        overflow: "hidden" as const,
      }
    : containerStyle;
  return (
    <div className="slide-container" data-no-avsandar-footer style={fillBarStyle}>
      {fillBar && (
        <>
          <motion.div
            aria-hidden
            initial={{ width: "0%" }}
            animate={{ width: `${targetValue}%` }}
            transition={{
              duration: durationNum,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              background: `linear-gradient(90deg, ${withAlpha(numColor, 0.22)} 0%, ${withAlpha(numColor, 0.1)} 65%, transparent 100%)`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <motion.div
            aria-hidden
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: `${targetValue}%`, opacity: [0, 1, 1] }}
            transition={{
              duration: durationNum,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.15, 1],
            }}
            style={{
              position: "absolute",
              top: "12%",
              bottom: "12%",
              width: "2px",
              background: numColor,
              boxShadow: `0 0 28px ${numColor}, 0 0 8px ${numColor}`,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        </>
      )}
      <div
        className={`flex w-full flex-col gap-6 ${isCentered ? "items-center text-center" : "items-start text-left"}`}
        style={{ maxWidth: "var(--slide-max-width)", position: "relative", zIndex: 2 }}
      >
        {eyebrow && (
          <motion.span
            className="text-xs uppercase tracking-[0.35em]"
            style={{ color: "var(--accent)" }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
          </motion.span>
        )}
        {contextAbove && (
          <motion.p
            className="leading-snug"
            style={{ fontSize: "var(--room-body, clamp(1.125rem, 2vw, 1.625rem))", maxWidth: "44rem", color: textMutedColor }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {contextAbove}
          </motion.p>
        )}
        {numberBlock}
        {contextBelow && (
          <motion.p
            className="leading-snug"
            style={{
              fontSize: "clamp(1.5rem, 3.2vw, 2.75rem)",
              maxWidth: "48rem",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
              color: textPrimary,
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: durationNum * 0.6 }}
          >
            {contextBelow}
          </motion.p>
        )}
        {source && (
          <motion.span
            className="text-[0.7rem] uppercase tracking-[0.3em]"
            style={{ color: textMutedColor, fontSize: "var(--room-caption, .7rem)", letterSpacing: "var(--room-source-spacing, .3em)", maxWidth: "var(--room-stat-source-width, 100%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: durationNum * 0.8 }}
          >
            {source}
          </motion.span>
        )}
      </div>
    </div>
  );
}
