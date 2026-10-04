import type { ParsedComponent, ParsedPresentation } from "./mdx-parser";
import { serializeComponent, slideContentHash } from "./mdx-parser";
import { stripNotesBlocks } from "./extract-notes";
import { extractSlideMetas, type SlideMeta } from "./extract-slide-types";
import { VALID_SLIDE_ID } from "./slide-ids";
import type {
  BrandWatermark,
  SlideGradientValue,
  SliderEffectValue,
} from "./types";

/**
 * DeckManifest — härledd vy över en ParsedPresentation.
 *
 * Storyboard och editor behöver tre saker per slide: talmanus, identitet
 * (för React-nycklar) och renderHash (för miniatyrcachen). Tidigare byggdes
 * allt genom att serialisera hela decken till en råsträng och sedan skanna
 * eller parsa om den — en kedja på ~50 ms per operation på ett 181-sliders
 * deck, varav 67 % var en O(n²)-skanning efter <Notes>-block som redan låg
 * strukturerat i det parsade trädet.
 *
 * VIKTIGT: manifestet är ett CACHE-LAGER, aldrig en sanning. Det härleds
 * alltid ur den ParsedPresentation som i sin tur kommer från MDX-filen på
 * disk. Det sparas inte, synkas inte och kan inte bli inaktuellt — ändrar
 * Claude Code filen utanför appen läses den om och manifestet byggs på nytt.
 * Lägg därför aldrig data här som inte går att härleda ur `parsed`.
 */
export interface DeckManifestEntry {
  /** Permanent slideId när sliden har en, annars innehållsbaserad fallback. */
  slideId: string;
  /** Ändras bara när slidens faktiska innehåll ändras — inte vid omflyttning. */
  contentHash: string;
  /** Innehåll + all design som kan påverka den fångade miniatyren. */
  renderHash: string;
  /** Talmanus, hämtat direkt ur trädet i stället för via råtextskanning. */
  notes: string | null;
  /** Template-namn och primär/sekundär text för storyboard-kortet. */
  meta: SlideMeta;
}

export interface DeckManifest {
  entries: DeckManifestEntry[];
  slideIds: string[];
  contentHashes: string[];
  renderHashes: string[];
  notes: (string | null)[];
  slideMetas: SlideMeta[];
}

export interface DeckAppearance {
  theme?: string;
  brand?: BrandWatermark;
  ambient?: boolean | string;
  sliderEffects?: Record<string, SliderEffectValue>;
  slideGradients?: Record<string, SlideGradientValue>;
  slideAccents?: Record<string, string>;
  slideTextColors?: Record<string, string>;
  slideMutedColors?: Record<string, string>;
  accentOverride?: string;
  textOverride?: string;
  mutedOverride?: string;
}

const THUMBNAIL_RENDERER_VERSION = "thumb-v3";

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Innehållshashen beror bara på slide-objektet, så den kan memoiseras på dess
 * identitet. Alla deck-operationer är spread-baserade — orörda slides behåller
 * sin referens — vilket gör att bara den ändrade sliden hashas om.
 * WeakMap: inga läckor när gamla slide-objekt faller ur undo-historiken.
 */
const contentHashCache = new WeakMap<ParsedComponent, string>();

function cachedContentHash(slide: ParsedComponent): string {
  const hit = contentHashCache.get(slide);
  if (hit !== undefined) return hit;
  const hash = slideContentHash(slide);
  contentHashCache.set(slide, hash);
  return hash;
}

/**
 * Slide-metadata (template + primärtext) härleds ur EN slide i stället för
 * genom en skanning över hela filen. Samma memoisering som hashen: bara den
 * ändrade sliden räknas om.
 */
const slideMetaCache = new WeakMap<ParsedComponent, SlideMeta>();

function cachedSlideMeta(slide: ParsedComponent): SlideMeta {
  const hit = slideMetaCache.get(slide);
  if (hit !== undefined) return hit;
  // extractSlideMetas förväntar sig top-level-komponenter på kolumn 0 och
  // läser <Notes> som en egen slide — därav stripNotesBlocks.
  const block = stripNotesBlocks(serializeComponent(slide, 0, { skipOverlays: true }));
  const meta = extractSlideMetas(block)[0] ?? { templateName: slide.tag };
  slideMetaCache.set(slide, meta);
  return meta;
}

/**
 * Talmanus för en slide. Notes som står efter en overlay hör till samma slide
 * — parsern lägger dem på overlay-objektet, så de måste plockas upp här för
 * att matcha vad råtextskanningen gav.
 */
function slideNotes(slide: ParsedComponent): string | null {
  const parts: string[] = [];
  if (slide.notes) parts.push(slide.notes);
  for (const overlay of slide.overlays ?? []) {
    if (overlay.notes) parts.push(overlay.notes);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/** Återanvänd föregående array om varje element är identiskt (referenslikhet). */
function shareArray<T>(next: T[], previous: T[] | undefined): T[] {
  if (!previous || previous.length !== next.length) return next;
  for (let i = 0; i < next.length; i++) {
    if (next[i] !== previous[i]) return next;
  }
  return previous;
}

/**
 * Ett-slots-cache för strukturell delning mellan på varandra följande bygg.
 *
 * Ligger på modulnivå, inte i en useRef: en ref som både läses och skrivs under
 * render bryter Reacts renderingskontrakt (och fångas av react-hooks/refs).
 * Här är det ofarligt eftersom cachen enbart bevarar IDENTITET — värdena blir
 * exakt desamma vid träff som vid miss, så den kan aldrig ge fel resultat.
 * Två decks öppna samtidigt gör bara att delningen uteblir, aldrig fel data.
 */
let lastManifest: DeckManifest | undefined;

export function buildDeckManifest(
  parsed: ParsedPresentation,
  appearance: DeckAppearance,
  previousOverride?: DeckManifest,
): DeckManifest {
  const previous = previousOverride ?? lastManifest;
  const legacyOccurrences = new Map<string, number>();
  const globalAppearance = JSON.stringify({
    renderer: THUMBNAIL_RENDERER_VERSION,
    theme: appearance.theme ?? "default",
    brand: appearance.brand ?? null,
    ambient: appearance.ambient ?? false,
    accentOverride: appearance.accentOverride ?? null,
    textOverride: appearance.textOverride ?? null,
    mutedOverride: appearance.mutedOverride ?? null,
  });

  const entries = parsed.slides.map((slide, index) => {
    const contentHash = cachedContentHash(slide);

    const rawId = slide.props.slideId;
    let slideId =
      typeof rawId === "string" && VALID_SLIDE_ID.test(rawId) ? rawId : "";
    if (!slideId) {
      const occurrence = legacyOccurrences.get(contentHash) ?? 0;
      legacyOccurrences.set(contentHash, occurrence + 1);
      // Samma format som ensureStableParsedSlideIds skriver till disk
      // (slide-ids.ts). Prefixet måste matcha: annars byter varje slide
      // cachenyckel vid första sparningen — legacy_x → sl_legacy_x — och
      // hela miniatyrcachen kastas trots att inget innehåll ändrats.
      slideId = `sl_legacy_${contentHash}_${occurrence}`;
    }

    // Positionsbunden design måste ingå i renderHash — flyttas en slide till
    // en position med annan gradient ser miniatyren annorlunda ut trots att
    // innehållet är oförändrat.
    const positionKey = String(index + 1);
    const localAppearance = JSON.stringify({
      effect: appearance.sliderEffects?.[positionKey] ?? null,
      gradient: appearance.slideGradients?.[positionKey] ?? null,
      accent: appearance.slideAccents?.[positionKey] ?? null,
      text: appearance.slideTextColors?.[positionKey] ?? null,
      muted: appearance.slideMutedColors?.[positionKey] ?? null,
    });
    const renderSource = `${contentHash}|${globalAppearance}|${localAppearance}`;

    const entry: DeckManifestEntry = {
      slideId,
      contentHash,
      renderHash: `${hashString(renderSource)}_${renderSource.length.toString(36)}`,
      notes: slideNotes(slide),
      meta: cachedSlideMeta(slide),
    };

    // Structural sharing: är posten oförändrad, behåll det GAMLA objektet.
    // Annars får alla 181 entries nya identiteter vid varje operation och
    // memoiseringen i SlideThumbnails bustar trots att värdena är lika.
    const before = previous?.entries[index];
    if (
      before &&
      before.slideId === entry.slideId &&
      before.contentHash === entry.contentHash &&
      before.renderHash === entry.renderHash &&
      before.notes === entry.notes &&
      before.meta === entry.meta
    ) {
      return before;
    }
    return entry;
  });

  // Parallella arrayer eftersom konsumenterna (SlideThumbnails) tar dem som
  // separata props. De byggs här, inuti memot, i stället för med .map() i JSX
  // — annars får de nya referenser vid varje render och all memoisering
  // nedströms slutar bita.
  const manifest: DeckManifest = {
    entries: shareArray(entries, previous?.entries),
    slideIds: shareArray(entries.map((e) => e.slideId), previous?.slideIds),
    contentHashes: shareArray(entries.map((e) => e.contentHash), previous?.contentHashes),
    renderHashes: shareArray(entries.map((e) => e.renderHash), previous?.renderHashes),
    notes: shareArray(entries.map((e) => e.notes), previous?.notes),
    slideMetas: shareArray(entries.map((e) => e.meta), previous?.slideMetas),
  };
  lastManifest = manifest;
  return manifest;
}
