import type { ParsedComponent, ParsedPresentation } from "./mdx-parser";
import { slideIdentityHashes } from "./mdx-parser";

export const SLIDE_ID_PROP = "slideId";

/**
 * Vad som räknas som ett giltigt slideId.
 *
 * Mönstret krävde tidigare prefixet `sl_`, vilket createSlideId sätter. Men
 * handskrivna deck bär ofta semantiska id:n i stället — `sk_12_odlad`,
 * `sk_36_divider_mot` — och de underkändes då av valideringen och skrevs över
 * med genererade `sl_legacy_*` vid FÖRSTA sparningen från studion. Ett helt
 * decks läsbara id:n försvann tyst, utan att något syntes i gränssnittet.
 *
 * Kravet fyller ingen funktion: inget i koden slår på prefixet, och id:ts
 * verkliga jobb är att vara stabilt, unikt och säkert som cachenyckel och
 * filnamnsdel. Mönstret kontrollerar därför bara det — inledande bokstav,
 * säkra tecken, rimlig längd. Genererade id:n matchar fortfarande.
 */
export const VALID_SLIDE_ID = /^[a-zA-Z][a-zA-Z0-9_-]{5,63}$/;

export function createSlideId(): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `sl_${uuid.replace(/-/g, "").slice(0, 16)}`;
}
export function ensureParsedSlideIds(
  parsed: ParsedPresentation,
): { changed: boolean; ids: string[] } {
  let changed = false;
  const seen = new Set<string>();
  const ids = parsed.slides.map((slide) => {
    const raw = slide.props[SLIDE_ID_PROP];
    let id =
      typeof raw === "string" && VALID_SLIDE_ID.test(raw) && !seen.has(raw)
        ? raw
        : createSlideId();
    while (seen.has(id)) id = createSlideId();
    seen.add(id);
    if (raw !== id) {
      slide.props = { ...slide.props, [SLIDE_ID_PROP]: id };
      changed = true;
    }
    return id;
  });
  return { changed, ids };
}

/**
 * Migrera en äldre presentation till permanenta men deterministiska ID:n.
 *
 * Vanliga slump-ID:n är rätt för nyskapade slides. För äldre slides måste
 * däremot ID:t vara identiskt även före första sparningen, annars skulle en
 * vanlig omladdning ge samtliga miniatyrer nya cache-nycklar.
 */
export function ensureStableParsedSlideIds(
  parsed: ParsedPresentation,
  rawMdx: string,
): { changed: boolean; ids: string[] } {
  const hashes = slideIdentityHashes(rawMdx);
  const occurrences = new Map<string, number>();
  let changed = false;
  const seen = new Set<string>();

  const ids = parsed.slides.map((slide, index) => {
    const raw = slide.props[SLIDE_ID_PROP];
    if (typeof raw === "string" && VALID_SLIDE_ID.test(raw) && !seen.has(raw)) {
      seen.add(raw);
      return raw;
    }

    const hash = (hashes[index] ?? `missing_${index}`).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    const occurrence = occurrences.get(hash) ?? 0;
    occurrences.set(hash, occurrence + 1);
    let id = `sl_legacy_${hash}_${occurrence}`;
    let collision = occurrence;
    while (seen.has(id)) {
      collision += 1;
      id = `sl_legacy_${hash}_${collision}`;
    }
    seen.add(id);
    slide.props = { ...slide.props, [SLIDE_ID_PROP]: id };
    changed = true;
    return id;
  });

  return { changed, ids };
}

export function cloneSlideWithFreshId(
  slide: ParsedComponent,
): ParsedComponent {
  const copy = JSON.parse(JSON.stringify(slide)) as ParsedComponent;
  copy.props = { ...copy.props, [SLIDE_ID_PROP]: createSlideId() };
  // Kommentarsblocket före en slide ("{/* AKT 2 · … */}") hör till originalets
  // position i dramaturgin, inte till kopian — annars dupliceras aktrubriker.
  delete copy.leadingRaw;
  // Samma sak med översiktens aktmarkering: en kopia med akt="…" blev en andra
  // akt med samma namn. Och en instruktion till Claude (claude="…") gäller
  // originalet — på en kopia, eller i en annan föreläsning, skulle den utföras
  // två gånger.
  delete copy.props.akt;
  delete copy.props.claude;
  return copy;
}

export function replaceOrInsertSlideId(
  rawSlide: string,
  slideId = createSlideId(),
): string {
  const existing = /\bslideId\s*=\s*(["'])[^"']*\1/;
  if (existing.test(rawSlide)) {
    return rawSlide.replace(existing, `slideId="${slideId}"`);
  }
  return rawSlide.replace(
    /(<[A-Z][A-Za-z0-9]*)(?=\s|>)/,
    `$1 slideId="${slideId}"`,
  );
}
