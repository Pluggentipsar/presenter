/**
 * Tema-override (M-mode + T-tangent).
 *
 * Låter användaren byta tema live från MenuOverlay eller via T-tangent,
 * utan att redigera frontmatter. State sparas i localStorage per slug.
 *
 * Override appliceras genom att skriva CSS-variabler ovanpå
 * PresentationRenderer:s tema (som kommer från MDX-frontmatter).
 */

import { themes, getTheme, themeToCssVars } from "@/themes";

export interface ThemeOverrideState {
  enabled: boolean;
  themeName: string;
}

export const DEFAULT_THEME_OVERRIDE: ThemeOverrideState = {
  enabled: false,
  themeName: "default",
};

const STORAGE_PREFIX = "theme-override-v1:";

export function loadThemeOverride(slug: string): ThemeOverrideState {
  if (typeof window === "undefined") return DEFAULT_THEME_OVERRIDE;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + slug);
    if (!raw) return DEFAULT_THEME_OVERRIDE;
    return { ...DEFAULT_THEME_OVERRIDE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME_OVERRIDE;
  }
}

export function saveThemeOverride(slug: string, state: ThemeOverrideState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function themeOverrideCssVars(
  state: ThemeOverrideState
): Record<string, string> {
  if (!state.enabled) return {};
  return themeToCssVars(getTheme(state.themeName));
}

/** Mänskligt label för ett tema-id. Faller tillbaka på id:t. */
export const THEME_LABELS: Record<string, string> = {
  larare_solkraft: "Lärare · Solkraft",
  prisma: "Prisma",
  elever_solkraft: "Elever · Solkraft",
  glas: "Glas",
  default: "Default",
  sunset: "Sunset",
  editorial: "Editorial",
  minimal: "Minimal",
  retro_futurism: "Retro Futurism",
  konjak: "Konjak",
  forest: "Forest",
  arkadnatt: "Arkad-natt",
  memphis_riso: "Memphis-Riso",
  vhs_skola: "VHS-skola",
  midnatt: "Midnatt",
  berattelser: "Berättelser",
  relationskritik: "Relationskritik",
  nattglas: "Nattglas",
  dagsljus: "Dagsljus",
  kobolt: "Kobolt",
  kobolt_natt: "Kobolt · natt",
  tiopotenser: "Tiopotenser",
  fyrfarg: "Fyrfärg",
  betong: "Betong",
  betong_natt: "Betong · natt",
  protokoll: "Protokoll",
  arkana: "Arkana",
  rost: "Rösten",
  linjen: "Linjen",
};

/** Lista alla teman i deklarationsordning från themes/index.ts. */
export function getThemeList(): { id: string; label: string; accent: string }[] {
  return Object.keys(themes).map((id) => ({
    id,
    label: THEME_LABELS[id] ?? id,
    accent: themes[id].accent,
  }));
}

/**
 * Cykla till nästa tema (för T-tangenten).
 * Om override är av: aktivera den med första temat efter aktuellt frontmatter-tema.
 * Om override är på: gå till nästa i listan, wrappa runt.
 */
export function cycleNextTheme(
  current: ThemeOverrideState,
  frontmatterTheme: string
): ThemeOverrideState {
  const list = Object.keys(themes);
  const baseline = current.enabled ? current.themeName : frontmatterTheme;
  const idx = list.indexOf(baseline);
  const next = list[(idx + 1) % list.length];
  return { enabled: true, themeName: next };
}
