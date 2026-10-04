/**
 * Gradient-bakgrunder för slides — curerade presets + CSS-byggare.
 *
 * En gradient sätts per slide via M-läget och lagras i frontmatter-mappen
 * `slideGradients` (1-indexerat slide-nr → config). Renderas av
 * SlideGradientLayer som ett heltäckande lager bakom slide-innehållet.
 *
 * Tre uttryck:
 *  - linear   — mjuk diagonal övergång mellan 2-3 färger
 *  - mesh     — flera färgblobbar som smälter ihop (aurora-känsla)
 *  - animated — valbart tillägg: mesh-blobbar driver, linear andas
 */

import type { GradientStyle, SlideGradientValue } from "./types";

export type { GradientStyle };

/** En curerad palett. Färgerna funkar för både linear och mesh. */
export interface GradientPreset {
  id: string;
  label: string;
  /** 3 hex-färger, mörk → ljusare. */
  colors: [string, string, string];
}

/**
 * Handplockade paletter — alla testade att se snygga ut bakom ljus text.
 * Mörk-till-mid så projektor-kontrasten håller.
 */
export const GRADIENT_PRESETS: GradientPreset[] = [
  /* joelsai-temats mörka register: nattsvart → marin → kobalt. Byggd
     2026-09-02 så att "djup"-slides (affischer, dividers) får sajtens
     elblå rök utan bild — och byts mot Midjourney när bilderna finns. */
  { id: "kobalt", label: "Kobalt", colors: ["#06101F", "#0B1C36", "#1533FF"] },
  /* Den varma spegelbilden: brunsvart → bränd → bärnsten (register glod). */
  { id: "glod", label: "Glöd", colors: ["#1A0D07", "#7A3A12", "#F08A2E"] },
  { id: "midnatt", label: "Midnatt", colors: ["#0F0C29", "#302B63", "#564FA1"] },
  { id: "norrsken", label: "Norrsken", colors: ["#0B3D2E", "#1B7A5A", "#3DDC97"] },
  { id: "aurora", label: "Aurora", colors: ["#1A2980", "#2575C8", "#26D0CE"] },
  { id: "solnedgang", label: "Solnedgång", colors: ["#3A1C71", "#D76D77", "#FFAF7B"] },
  { id: "korall", label: "Korall", colors: ["#A8264B", "#FF5F6D", "#FFC371"] },
  { id: "djuphav", label: "Djuphav", colors: ["#000428", "#00316B", "#0575E6"] },
  { id: "plommon", label: "Plommon", colors: ["#1F0A2E", "#4A1A5C", "#8E3C92"] },
  { id: "skog", label: "Skog", colors: ["#0A2615", "#1B4D2E", "#3E8E5A"] },
  { id: "petrol", label: "Petrol", colors: ["#091E26", "#1B4954", "#2E8C9E"] },
  { id: "lavendel", label: "Lavendel", colors: ["#3D2C5F", "#6E5AA0", "#B9A6E6"] },
  { id: "rose", label: "Rosé", colors: ["#3A0E28", "#8E2A5C", "#D85E92"] },
  { id: "guldtimme", label: "Guldtimme", colors: ["#241405", "#7A4A14", "#E0A53A"] },
];

const PRESET_BY_ID = new Map(GRADIENT_PRESETS.map((p) => [p.id, p]));

/** Default-värden när inget annat anges. */
export const GRADIENT_DEFAULTS = {
  style: "linear" as GradientStyle,
  angle: 135,
  animated: false,
};

/** Fullständigt upplöst gradient-config (presets utbytta mot färger). */
export interface GradientConfig {
  colors: string[];
  style: GradientStyle;
  angle: number;
  animated: boolean;
  /** Preset-id om gradienten bygger på en preset (för M-menyns highlight). */
  presetId?: string;
}

/**
 * Lös upp en lagrad SlideGradientValue → körbar GradientConfig.
 * Returnerar `null` om värdet inte går att tolka.
 */
export function resolveGradient(
  value: SlideGradientValue | null | undefined,
): GradientConfig | null {
  if (!value) return null;

  if (typeof value === "string") {
    const preset = PRESET_BY_ID.get(value);
    if (!preset) return null;
    return {
      colors: [...preset.colors],
      style: GRADIENT_DEFAULTS.style,
      angle: GRADIENT_DEFAULTS.angle,
      animated: GRADIENT_DEFAULTS.animated,
      presetId: preset.id,
    };
  }

  const preset = value.preset ? PRESET_BY_ID.get(value.preset) : undefined;
  const explicitColors =
    Array.isArray(value.colors) && value.colors.length >= 2
      ? value.colors.filter((c) => isHexColor(c))
      : null;
  const colors =
    explicitColors && explicitColors.length >= 2
      ? explicitColors
      : preset
        ? [...preset.colors]
        : null;
  if (!colors || colors.length < 2) return null;

  return {
    colors,
    style: value.style === "mesh" ? "mesh" : "linear",
    angle:
      typeof value.angle === "number" && value.angle >= 0 && value.angle <= 360
        ? value.angle
        : GRADIENT_DEFAULTS.angle,
    animated: value.animated === true,
    // Egna färger som överskuggar paletten → räknas inte som "en preset"
    presetId: explicitColors ? undefined : preset?.id,
  };
}

/* ── Normalisering till lagringsform ──────────────────────────────────── */

/**
 * Kanonisk lagringsform för en gradient.
 *
 * Fanns tidigare i tre kopior: skriv-vägen i presentation-actions, läs-vägen
 * i mdx.ts och implicit i GradientChips. Följden blev att M-läget kunde skriva
 * `"aurora"` där en annan väg skrev `{preset:"aurora",style:"linear",angle:135}`
 * — samma rendering men olika filinnehåll, alltså bullriga diffar mellan
 * Joels två datorer. Alla vägar går numera genom den här funktionen.
 *
 * Regler: färger vinner över preset · `style` skrivs bara när den är `mesh` ·
 * `angle` bara när den avviker från default och stilen är linjär · `animated`
 * bara när den är på · enbart preset → kort-form (ren sträng).
 *
 * Returnerar `null` när värdet saknar palett-källa (varken känd preset eller
 * minst två giltiga hex-färger).
 */
export function normalizeStoredGradient(
  value: unknown,
): SlideGradientValue | null {
  if (typeof value === "string") {
    return PRESET_BY_ID.has(value.trim()) ? value.trim() : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as {
    preset?: unknown;
    colors?: unknown;
    style?: unknown;
    angle?: unknown;
    animated?: unknown;
  };

  const preset =
    typeof raw.preset === "string" && PRESET_BY_ID.has(raw.preset.trim())
      ? raw.preset.trim()
      : undefined;
  const colors = Array.isArray(raw.colors)
    ? raw.colors.filter(isHexString)
    : undefined;
  const hasColors = Boolean(colors && colors.length >= 2);
  if (!preset && !hasColors) return null;

  const style: GradientStyle | undefined =
    raw.style === "mesh" ? "mesh" : undefined;
  const angleRaw =
    typeof raw.angle === "number" && raw.angle >= 0 && raw.angle <= 360
      ? Math.round(raw.angle)
      : undefined;
  const angle =
    style !== "mesh" && angleRaw != null && angleRaw !== GRADIENT_DEFAULTS.angle
      ? angleRaw
      : undefined;
  const animated = raw.animated === true ? true : undefined;

  if (preset && !hasColors && !style && angle == null && !animated) {
    return preset;
  }

  return {
    ...(hasColors ? { colors: colors as string[] } : { preset: preset as string }),
    ...(style ? { style } : {}),
    ...(angle != null ? { angle } : {}),
    ...(animated ? { animated: true } : {}),
  };
}

/**
 * Upplöst config → lagringsform. Motsatsen till `resolveGradient`, och den väg
 * alla väljare (M-läget och R-läget) ska skriva genom.
 */
export function toStoredGradient(
  config: GradientConfig | null,
): SlideGradientValue | null {
  if (!config) return null;
  return normalizeStoredGradient(
    config.presetId
      ? {
          preset: config.presetId,
          style: config.style,
          angle: config.angle,
          animated: config.animated,
        }
      : {
          colors: config.colors,
          style: config.style,
          angle: config.angle,
          animated: config.animated,
        },
  );
}

/* ── Färg-hjälpare ────────────────────────────────────────────────────── */

export function isHexColor(s: unknown): boolean {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

/**
 * Samma test som `isHexColor`, men som type guard. Egen funktion eftersom en
 * guard på `isHexColor` skulle smalna av `string`-parametrar till `never` i
 * else-grenen hos alla befintliga anropare.
 */
function isHexString(s: unknown): s is string {
  return isHexColor(s);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1, 7), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => clamp255(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Lägg till alfa (0-1) på en färg. Hanterar både hex och CSS-vars:
 * - `#RRGGBB` → `#RRGGBBAA`
 * - `var(--accent)` → `color-mix(in srgb, var(--accent) NN%, transparent)`
 * Övriga strängar returneras oförändrade.
 */
export function withAlpha(color: string, alpha: number): string {
  if (isHexColor(color)) {
    const a = clamp255(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${a}`;
  }
  if (color.startsWith("var(") || color.startsWith("color-mix(")) {
    const pct = Math.round(Math.max(0, Math.min(1, alpha)) * 100);
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  }
  return color;
}

/**
 * Mörk bas-ton för mesh: medelvärdet av paletten, kraftigt nedtonat.
 * Knyter ihop blobbarna och ger djup.
 */
export function meshBaseColor(colors: string[]): string {
  const valid = colors.filter(isHexColor);
  if (valid.length === 0) return "#0b0b14";
  const rgbs = valid.map(hexToRgb);
  const avg = {
    r: rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length,
    g: rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length,
    b: rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length,
  };
  return rgbToHex(avg.r * 0.17, avg.g * 0.17, avg.b * 0.17);
}

/* ── CSS-byggare ──────────────────────────────────────────────────────── */

/** Linjär gradient: `linear-gradient(Ndeg, c1, c2, c3)`. */
export function buildLinearGradientCss(
  colors: string[],
  angle: number = GRADIENT_DEFAULTS.angle,
): string {
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}

/**
 * Mesh-gradient: 5 mjuka radial-blobbar ovanpå en mörk bas.
 * Färgerna roterar genom paletten så även 2-färgs-paletter får liv.
 */
export function buildMeshGradientCss(colors: string[]): string {
  const pick = (i: number) => colors[i % colors.length];
  const base = meshBaseColor(colors);
  const blobs = [
    `radial-gradient(ellipse 75% 70% at 16% 18%, ${withAlpha(pick(0), 0.92)} 0%, transparent 62%)`,
    `radial-gradient(ellipse 70% 65% at 86% 12%, ${withAlpha(pick(1), 0.9)} 0%, transparent 58%)`,
    `radial-gradient(ellipse 85% 80% at 78% 84%, ${withAlpha(pick(2), 0.92)} 0%, transparent 62%)`,
    `radial-gradient(ellipse 60% 60% at 22% 88%, ${withAlpha(pick(1), 0.85)} 0%, transparent 54%)`,
    `radial-gradient(ellipse 95% 75% at 50% 48%, ${withAlpha(pick(0), 0.55)} 0%, transparent 68%)`,
  ];
  return `${blobs.join(", ")}, linear-gradient(${base}, ${base})`;
}

/** Bygg CSS-`background` för en gradient-config (statiskt — ingen animation). */
export function buildGradientCss(config: GradientConfig): string {
  return config.style === "mesh"
    ? buildMeshGradientCss(config.colors)
    : buildLinearGradientCss(config.colors, config.angle);
}
