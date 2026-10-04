export interface BrandWatermark {
  /** Path till logo (PNG med transparens funkar bäst) */
  logo: string;
  /** Liten text bredvid logon, t.ex. tagline eller produktnamn */
  tagline?: string;
  /** Position på slide. Default "bottom-left". */
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Max-höjd på logon i CSS-enheter (default "1.5rem") */
  size?: string;
  /** Opacity 0-1 (default 0.55) */
  opacity?: number;
  /** Dölj på första sliden (där logon redan dominerar). Default true. */
  hideOnFirst?: boolean;
}

/** En "version"/cut av en presentation — en kortare narrativ båge. */
export interface CutDef {
  /** Stabilt id som refereras i cut-skip-markörer i MDX. */
  id: string;
  /** Visningsnamn, t.ex. "40 min" eller "Journalistik". */
  name: string;
}

export interface PresentationMeta {
  slug: string;
  title: string;
  event?: string;
  author?: string;
  date?: string;
  theme?: string;
  description?: string;
  brand?: BrandWatermark;
  /** Taggar från frontmatter: ["pitch", "workshop", "extern"] osv. */
  tags?: string[];
  /** ISO-datum (YYYY-MM-DD) för senaste ändring, från fil-mtime */
  updatedAt?: string;
  /** Antal slides i presentationen (räknas vid build-tid) */
  slideCount?: number;
  /**
   * Subtil ambient-partikelbakgrund bakom textslides.
   * - `true` → aktiv på alla slides
   * - `"21-25"` → aktiv endast på slides 21–25 (1-indexerat)
   * - `false` / utelämnad → aldrig
   */
  ambient?: boolean | string;
  /**
   * Slides (1-indexerat) som ska döljas i presentation-läget. Visas
   * fortfarande i editor och meny (med ögon-ikon överskuret) så du kan
   * återanvända en presentation utan att förlora innehåll. Sätt via
   * högerklick på slide-thumbnail i menyn, eller direkt i frontmatter.
   */
  hiddenSlides?: number[];
  /** Versioner/cuts av presentationen (kortare narrativa bågar). Cyklas med K. */
  cuts?: CutDef[];
  /**
   * Map slide-index (1-indexerat, som string-nyckel pga YAML) → effekt-config.
   * Lägger en diskret animerad bakgrundsrörelse bakom slidens innehåll men
   * ovanpå ev. bakgrundsbild. Toggle:as via M-menyn.
   *
   * Värdet kan vara:
   * - En sträng (kort form, default-färg): `"3": "dots"`
   * - Ett objekt med kind + color: `"12": { kind: "aurora", color: "#EF4F8F" }`
   *
   * Tillåtna kind: "dots" | "flow" | "aurora" | "grain" | "stardust".
   */
  sliderEffects?: Record<string, SliderEffectValue>;
  /**
   * Map slide-index (1-indexerat, string-nyckel) → gradient-bakgrund.
   * Renderas som ett heltäckande lager bakom slide-innehållet. Sätts via
   * M-läget. Se SlideGradientValue.
   */
  slideGradients?: Record<string, SlideGradientValue>;
  /**
   * Map slide-index (1-indexerat) → hex-accentfärg (#RRGGBB).
   * Overrider temats --accent på just den sliden. Sätts via M-läget.
   */
  slideAccents?: Record<string, string>;
  /**
   * Map slide-index (1-indexerat) → hex-textfärg (#RRGGBB).
   * Overrider temats --text på just den sliden.
   */
  slideTextColors?: Record<string, string>;
  /**
   * Map slide-index (1-indexerat) → hex-dämpad text (eyebrow, caption, source).
   * Overrider temats --text-muted på just den sliden.
   */
  slideMutedColors?: Record<string, string>;
  /**
   * Global accent-override för hela presentationen. Påverkar alla slides
   * utom de som har en egen slideAccents-entry (slide vinner över global).
   */
  accentOverride?: string;
  /**
   * Deckets egna färger ur frontmatterns `filmfarg` och `seriefarger`, som
   * CSS-variabler (--film, --series-1 …). Se lib/deck-colors.ts.
   */
  deckColorVars?: Record<string, string>;
  /**
   * Global text-override för hela presentationen. Påverkar alla slides
   * utom de som har en egen slideTextColors-entry.
   */
  textOverride?: string;
  /**
   * Global muted-override (dämpad text). Slide-level vinner över global.
   */
  mutedOverride?: string;
  /**
   * Hur presentationen får deployas/visas av publiken.
   * - `"full"` (default) — allt (MDX + media) serveras från deployad version
   * - `"cloud-media"` — MDX deployad, media hämtas från extern storage
   *   (t.ex. Supabase Storage). Använder absoluta URL:er i MDX.
   * - `"local-only"` — media finns bara lokalt. Audience-vyn visar
   *   platshållare istället för bilder/video. Presentera från din laptop
   *   (via npm run present eller Cloudflare Tunnel).
   */
  deploy?: "full" | "cloud-media" | "local-only";
}

/**
 * Per-slide effekt-konfiguration. Kort-form (bara kind-strängen) lämnar
 * komponenten välja default-färg, opacity och hastighet per effekt.
 *
 * Object-formen:
 *   - color: hex (#RRGGBB) — default = temats --accent
 *   - opacity: 0.2–1.5 — multiplicerar alfa-värden i alla effekter (1.0 = default)
 *   - speed: 0.3–2.5 — multiplicerar tids-deltat så rörelsen blir snabbare/långsammare (1.0 = default)
 */
export type SliderEffectValue =
  | string
  | {
      kind: string;
      color?: string;
      opacity?: number;
      speed?: number;
    };

/** Visuellt uttryck för en gradient-bakgrund. */
export type GradientStyle = "linear" | "mesh";

/**
 * Per-slide gradient-bakgrund. Lagras i frontmatter-mappen `slideGradients`.
 *
 * Kort-formen är bara en preset-id-sträng (default-stil linear):
 *   `"3": "solnedgang"`
 *
 * Objekt-formen ger full kontroll:
 *   - preset: bygg på en curerad palett (gradient-presets.ts)
 *   - colors: egna hex-färger (#RRGGBB) — överskuggar presetens palett
 *   - style: "linear" (mjuk diagonal) | "mesh" (färgblobbar) — default linear
 *   - angle: 0-360 grader för linear — default 135
 *   - animated: true → gradienten rör sig långsamt
 *
 * Exempel: `"12": { preset: "aurora", style: "mesh", animated: true }`
 */
export type SlideGradientValue =
  | string
  | {
      preset?: string;
      colors?: string[];
      style?: GradientStyle;
      angle?: number;
      animated?: boolean;
    };

/**
 * Ett redigerbart textfält i snabb-redigeraren (M-läget). `path` kodar var
 * i slide-strukturen värdet ska skrivas tillbaka:
 *  - `prop:title`            → slidens title-prop
 *  - `content`               → slidens children-text
 *  - `child:0:prop:label`    → barn-komponent 0:s label-prop
 *  - `child:0:content`       → barn-komponent 0:s text
 */
export interface SlideEditField {
  path: string;
  label: string;
  value: string;
  multiline: boolean;
}

export interface PresentationFile {
  meta: PresentationMeta;
  /** MDX body utan frontmatter (för PresentationRenderer) */
  content: string;
  /** Fullständig fil-råtext inklusive frontmatter (för editor som ska parse:a själv) */
  raw: string;
}
