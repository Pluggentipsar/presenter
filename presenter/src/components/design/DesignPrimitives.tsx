"use client";

/**
 * Delade design-primitiver för M-lägets meny och R-lägets designpanel.
 *
 * Flyttade ORDAGRANT ur MenuOverlay.tsx. Poängen är att det ska finnas exakt
 * en definition av varje kontroll i kodbasen — annars glider lägena isär och
 * samma slide ser olika ut beroende på var man råkar öppna den.
 *
 * Ingen komponent här känner till hur värden sparas. De tar `value` +
 * `onChange` och inget annat; commit, optimistic state och timers ägs av
 * respektive värd (MenuOverlay via server actions, EditorView via setParsed).
 */

import type React from "react";
import type { SlideEffect } from "../SlideEffectLayer";

/** Liten segmenterad toggle (2+ ömsesidigt uteslutande alternativ). */
export function Segmented({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/15 bg-white/[0.03] p-0.5">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className={`rounded-md px-2.5 py-1 text-xs transition-all ${
              active
                ? "bg-accent/[0.18] text-accent"
                : "text-white/60 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Liten slider med label, värdesvisning och "Återställ"-länk när användaren
 * har dragit slidern bort från default (1.0). Stöder optimistic update via
 * onInput (fires on every drag-tick) — föräldern debouncar disk-skrivningen.
 */
export function EffectSlider({
  label,
  min,
  max,
  step = 0.05,
  value,
  isCustom,
  format,
  onInput,
  onReset,
  resetTitle = "Återställ till default",
  disabled,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  isCustom: boolean;
  format: (v: number) => string;
  onInput: (v: number) => void;
  onReset: () => void;
  resetTitle?: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-16 text-[10px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onInput(parseFloat(e.currentTarget.value))}
        disabled={disabled}
        className="effect-slider flex-1 cursor-pointer accent-accent"
        style={{ accentColor: "var(--accent)" }}
        aria-label={label}
      />
      <div
        className={`w-12 text-right font-mono text-xs tabular-nums ${
          isCustom ? "text-accent" : "text-white/55"
        }`}
      >
        {format(value)}
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled || !isCustom}
        className={`w-16 text-right text-[10px] uppercase tracking-[0.18em] transition-colors ${
          isCustom
            ? "text-white/55 hover:text-white"
            : "pointer-events-none text-white/15"
        }`}
        title={resetTitle}
      >
        Återställ
      </button>
    </div>
  );
}

export function getEffectSwatchStyle(
  effect: SlideEffect,
  color: string | null,
): React.CSSProperties {
  // Använd vald färg om angiven, annars temats accent via CSS-variabel
  const c = color ?? "var(--accent, #EF4F8F)";
  switch (effect) {
    case "dots":
      return {
        background: `radial-gradient(circle at 20% 30%, ${c} 1px, transparent 2px), radial-gradient(circle at 70% 60%, ${c} 1px, transparent 2px), radial-gradient(circle at 40% 80%, ${c} 1px, transparent 2px), #1a1a24`,
        opacity: 0.95,
      };
    case "flow":
      return {
        background: `radial-gradient(circle at 30% 40%, ${c} 0%, transparent 60%), radial-gradient(circle at 75% 60%, ${c} 0%, transparent 55%), #1a1a24`,
        opacity: 0.7,
      };
    case "aurora":
      return {
        background: `linear-gradient(180deg, ${c}66 0%, ${c}33 50%, ${c}11 100%), #0a0a18`,
      };
    case "grain":
      return {
        background: `repeating-linear-gradient(45deg, ${c}22 0px, ${c}22 1px, transparent 1px, transparent 3px), #1a1a24`,
      };
    case "stardust":
      return {
        background: `linear-gradient(135deg, transparent 40%, ${c} 50%, transparent 60%), linear-gradient(135deg, transparent 60%, ${c} 70%, transparent 80%), #0a0a18`,
        opacity: 0.7,
      };
    case "mesh":
      return {
        background: `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 50%), radial-gradient(circle at 75% 60%, ${c}99 0%, transparent 50%), radial-gradient(circle at 50% 80%, ${c}66 0%, transparent 45%), #1a1a24`,
        opacity: 0.9,
      };
    case "constellation":
      return {
        background: `radial-gradient(circle at 22% 35%, ${c} 1.2px, transparent 2.5px), radial-gradient(circle at 65% 25%, ${c} 1.2px, transparent 2.5px), radial-gradient(circle at 45% 70%, ${c} 1.2px, transparent 2.5px), radial-gradient(circle at 80% 65%, ${c} 1.2px, transparent 2.5px), linear-gradient(45deg, transparent 48%, ${c}44 49%, ${c}44 51%, transparent 52%), #1a1a24`,
      };
    case "ribbon":
      return {
        background: `linear-gradient(180deg, transparent 30%, ${c}88 50%, transparent 70%), linear-gradient(180deg, transparent 40%, ${c}55 55%, transparent 70%), #1a1a24`,
        opacity: 0.85,
      };
  }
}

/* ── Färg-swatches ─────────────────────────────────────────────────────── */

// Curerade swatches per kategori. Räcker för 90 % av justeringar; custom
// hex-input täcker resten.
export const ACCENT_SWATCHES = [
  "#EC7E26", // terrakotta
  "#E63946", // signal-röd
  "#22D3EE", // cyan
  "#EF4F8F", // magenta
  "#A78BFA", // violett
  "#10B981", // mint
  "#F59E0B", // amber
  "#3B82F6", // royal-blå
];
export const TEXT_SWATCHES = [
  "#F7F1E6", // cream (default editorial)
  "#FFFFFF", // ren vit
  "#E8E2D4", // varm cream
  "#D6D2C7", // dim cream
  "#1A1410", // mörk plommon
  "#0A0908", // nästan svart
];
export const MUTED_SWATCHES = [
  "rgba(247,241,230,0.65)", // default editorial muted
  "rgba(247,241,230,0.45)", // svagare
  "rgba(247,241,230,0.85)", // nästan full text
  "#A09290", // varmt grått
  "#8a85b8", // dämpat violett
  "#666666", // neutralt grått
].filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));

/* ── Kontrast ──────────────────────────────────────────────────────────── */

// Räkna relativ luminans enligt WCAG (0–1).
export function luminance(hex: string): number {
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return 0;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Medelfärg av en palett. Används för att mäta kontrast mot en gradient:
 * ett exakt värde finns inte, men medelfärgen ligger nära det ögat upplever
 * och är oändligt mycket bättre än att mäta mot temats --bg, som inte längre
 * syns någonstans på sliden.
 */
export function averageHexColor(colors: string[]): string | undefined {
  const valid = colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
  if (valid.length === 0) return undefined;
  const sum = valid.reduce(
    (acc, hex) => {
      const n = parseInt(hex.slice(1, 7), 16);
      return {
        r: acc.r + ((n >> 16) & 255),
        g: acc.g + ((n >> 8) & 255),
        b: acc.b + (n & 255),
      };
    },
    { r: 0, g: 0, b: 0 },
  );
  const toHex = (v: number) =>
    Math.round(v / valid.length)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(sum.r)}${toHex(sum.g)}${toHex(sum.b)}`;
}

export function contrastRatio(c1: string, c2: string): number {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── Källa-badge ───────────────────────────────────────────────────────── */

/**
 * Var kommer det värde som syns på duken ifrån? Override-ordningen är
 * tema → hela presentationen → denna slide (se EditorPreview).
 *
 * Utan den här badgen ser × ut som att den inte tar: raderar man slidens egen
 * färg och en global override finns, landar man på den globala — inte på
 * temat. Joel klickar då en gång till och tror att knappen är trasig.
 */
export type ValueSource = "theme" | "global" | "slide";

const SOURCE_LABEL: Record<ValueSource, string> = {
  theme: "tema",
  global: "hela presentationen",
  slide: "denna slide",
};

export function SourceBadge({ source }: { source: ValueSource }) {
  const isOverride = source !== "theme";
  return (
    <span
      title={`Värdet kommer från ${SOURCE_LABEL[source]}`}
      className="shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] uppercase tracking-[0.16em]"
      style={{
        borderColor: isOverride
          ? "color-mix(in srgb, var(--accent) 45%, transparent)"
          : "rgba(255,255,255,0.12)",
        color: isOverride ? "var(--accent)" : "rgba(255,255,255,0.4)",
        background: isOverride
          ? "color-mix(in srgb, var(--accent) 10%, transparent)"
          : "transparent",
      }}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

/* ── Färg-rad ──────────────────────────────────────────────────────────── */

export function ColorRow({
  label,
  currentValue,
  swatches,
  hexInput,
  onHexInput,
  onApplySwatch,
  onApplyCustom,
  onReset,
  busy,
  cssVar,
  contrastAgainst,
  contrastApproximate = false,
  source,
  onQuickContrast,
}: {
  label: string;
  currentValue?: string;
  swatches: string[];
  hexInput: string;
  onHexInput: (v: string) => void;
  onApplySwatch: (hex: string) => void;
  onApplyCustom: () => void;
  onReset: () => void;
  busy: boolean;
  cssVar: string;
  /** Hex att räkna kontrast mot (oftast slidens bakgrund). Om satt visas varning vid låg kontrast. */
  contrastAgainst?: string;
  /** Märk siffran "ungefärlig" — t.ex. när bakgrunden är en gradient. */
  contrastApproximate?: boolean;
  /** Var det synliga värdet kommer ifrån. Utelämnad → ingen badge. */
  source?: ValueSource;
  /** Ett-klicks-åtgärd vid låg kontrast: sätt texten ljus eller mörk. */
  onQuickContrast?: (hex: string) => void;
}) {
  const isHex = currentValue && /^#[0-9a-fA-F]{6}$/.test(currentValue);
  // Utan egen färg mäter vi mot det tema/globala värde som faktiskt renderas.
  const measured = isHex ? currentValue : undefined;
  const ratio =
    measured && contrastAgainst && /^#[0-9a-fA-F]{6}$/.test(contrastAgainst)
      ? contrastRatio(measured, contrastAgainst)
      : null;
  const lowContrast = ratio != null && ratio < 3;
  // Ljus bakgrund → föreslå mörk text, och tvärtom.
  const suggestLight =
    contrastAgainst && /^#[0-9a-fA-F]{6}$/.test(contrastAgainst)
      ? luminance(contrastAgainst) < 0.5
      : true;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-md border bg-white/[0.04] px-2 py-1"
          style={{
            minWidth: "10rem",
            borderColor: currentValue
              ? "color-mix(in srgb, var(--accent) 60%, transparent)"
              : "rgba(255,255,255,0.10)",
            background: currentValue
              ? "color-mix(in srgb, var(--accent) 8%, rgba(255,255,255,0.03))"
              : undefined,
          }}
        >
          <span
            aria-hidden
            className="h-4 w-4 rounded-full"
            style={{
              background: currentValue ?? `var(${cssVar})`,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
            }}
          />
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/70">
            {label}
          </span>
          <span
            className="ml-auto font-mono text-[10px]"
            style={{
              color: currentValue ? "var(--accent)" : "rgba(255,255,255,0.35)",
            }}
          >
            {currentValue ?? "default"}
          </span>
        </div>
        {source ? <SourceBadge source={source} /> : null}
        <div className="flex flex-wrap items-center gap-1">
          {swatches.map((hex) => {
            const active =
              currentValue?.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                disabled={busy}
                onClick={() => onApplySwatch(hex)}
                title={hex}
                className={`relative h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                  active
                    ? "ring-2 ring-offset-2 ring-offset-[#0b0c0f]"
                    : ""
                }`}
                style={{
                  background: hex,
                  boxShadow: active
                    ? `0 0 18px ${hex}cc, 0 0 0 1px ${hex}`
                    : "0 0 0 1px rgba(255,255,255,0.12)",
                  ...(active ? { ["--tw-ring-color" as string]: "#FFFFFF" } : {}),
                }}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                    style={{
                      color: luminance(hex) > 0.5 ? "#000" : "#FFF",
                      textShadow:
                        luminance(hex) > 0.5
                          ? "0 0 2px rgba(255,255,255,0.6)"
                          : "0 0 2px rgba(0,0,0,0.6)",
                    }}
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => onHexInput(e.target.value.trim())}
            placeholder="#hex"
            maxLength={7}
            className="w-[5.5rem] rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/85 placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !/^#[0-9a-fA-F]{6}$/.test(hexInput)}
            onClick={onApplyCustom}
            className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/65 transition-all hover:border-accent hover:bg-accent/[0.08] hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sätt
          </button>
          <button
            type="button"
            disabled={busy || !currentValue}
            onClick={onReset}
            title="Återställ till temats färg"
            className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55 transition-all hover:border-white/30 hover:text-white/85 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
      </div>
      {/* Kontrast-varning för text/muted mot bakgrund */}
      {lowContrast ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-2 text-[10px] text-yellow-300/85">
          <span aria-hidden>⚠️</span>
          <span>
            Låg kontrast mot bakgrund ({contrastApproximate ? "ca " : ""}
            {ratio!.toFixed(1)}:1). Texten kan vara svår att läsa.
          </span>
          {onQuickContrast ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuickContrast(suggestLight ? "#FFFFFF" : "#0A0908")}
              className="rounded-md border border-yellow-300/40 bg-yellow-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-yellow-200 transition-all hover:border-yellow-300 hover:bg-yellow-300/20"
            >
              {suggestLight ? "Gör texten ljus" : "Gör texten mörk"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
