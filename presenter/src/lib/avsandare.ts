/**
 * Avsändarprofiler (3 oktober 2026): en organisations bård, logotyp, palett och typsnitt, som M-menyn
 * kan lägga ovanpå vilket tema som helst. Byggt ur en kommuns flaggning. Profilerna står i
 * lib/avsandarprofiler.ts; spelaren och M-menyn använder den första.
 *
 * Mallar som fyller hela höjden markerar sin rot med `data-no-avsandar-footer`, så att bården inte
 * läggs över dem. Bården själv bär `data-avsandar-footer`.
 */

export interface AvsandarFarg {
  label: string;
  primary: string;
  dark: string;
  light: string | null;
  /** Textfärg på primär/mörk bakgrund */
  textOnDark: string;
  /** Textfärg på ljus bakgrund */
  textOnLight: string;
}

export interface BrandingState {
  enabled: boolean;
  /** Behåll valt temas typografi och palett; använd bara avsändarens bård. */
  footerOnly?: boolean;
  /** Accentens namn i profilens palett. */
  accent: string;
  /** Hur bården ska tona: auto följer temat, annars override. */
  footerTone: "auto" | "light" | "dark";
}

export interface Avsandarprofil {
  /** Rubriken i M-menyn, till exempel "Kommunflaggning · Min kommun". */
  rubrik: string;
  /** Raden under rubriken i M-menyn. */
  beskrivning: string;
  /** Strömbrytarens text för skärmläsare. */
  knapp: string;
  /** Adressen i bården. */
  webb: string;
  /** Logotypen i bården: för ljus bakgrund och för mörk. */
  logga: { ljus: string; mork: string; alt: string };
  /** Bårdens typsnitt, och slidernas när profilen får styra typografin. */
  typsnitt: string;
  /** Rubrikernas vikt när profilen får styra typografin. */
  rubrikvikt: string;
  palett: Record<string, AvsandarFarg>;
  /** Accenternas ordning i M-menyn. Den första är förvald. */
  ordning: string[];
  /** Prefix för valen som sparas per deck i webbläsaren. */
  lagring: string;
  /** Teman där profilen är påslagen från början, och hur. */
  teman: Record<string, Partial<BrandingState>>;
  /** Teman där bårdens automatiska ton är ljus. I övriga är den mörk. */
  ljusaTeman: string[];
}

export function defaultBranding(profil: Avsandarprofil | undefined): BrandingState {
  return { enabled: false, accent: profil?.ordning[0] ?? "", footerTone: "auto" };
}

/** Läget innan något är sparat: avstängt, eller som profilen anger för decket tema. */
export function initialBranding(profil: Avsandarprofil | undefined, theme: string | undefined): BrandingState {
  const start = profil && theme ? profil.teman[theme] : undefined;
  return { ...defaultBranding(profil), ...start };
}

export function loadBranding(profil: Avsandarprofil | undefined, slug: string): BrandingState {
  const fallback = defaultBranding(profil);
  if (!profil || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(profil.lagring + slug);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function saveBranding(profil: Avsandarprofil | undefined, slug: string, state: BrandingState): void {
  if (!profil || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(profil.lagring + slug, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}

/**
 * Beräkna CSS-overrides för en aktiv branding-state.
 * Lägg som inline-style på en wrapper för att skriva över temats accent + font.
 */
export function brandingCssOverrides(profil: Avsandarprofil | undefined, state: BrandingState): Record<string, string> {
  const color = profil?.palett[state.accent];
  if (!profil || !color || !state.enabled || state.footerOnly) return {};
  const hex = color.primary.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    "--accent": color.primary,
    "--accent-glow": `rgba(${r}, ${g}, ${b}, 0.32)`,
    "--accent-dim": `rgba(${r}, ${g}, ${b}, 0.12)`,
    "--font-display": profil.typsnitt,
    "--font-body": profil.typsnitt,
    "--heading-weight": profil.rubrikvikt,
    "--ornament-color": color.primary,
  };
}
