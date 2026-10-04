import "server-only";
import type { ComposedDeck, DeckFamily, DeckQuery } from "./deck-familj";
import type { MediaUrl } from "./extract-media-urls";

/**
 * Föreläsningsfamiljerna med egen logik på serversidan (se lib/deck-familj.ts). Den publika exporten
 * skriver om listan.
 */
export const deckFamilies: DeckFamily[] = [
];

/** Det sammansatta decket som adressen beskriver, om någon familj känner igen den. */
export function composeDeck(slug: string, query: DeckQuery): ComposedDeck | "saknas" | null {
  for (const family of deckFamilies) {
    const composed = family.compose?.(slug, query);
    if (composed) return composed;
  }
  return null;
}

/** Deckets dolda slides: familjens urval ur adressen, annars frontmatterns. */
export function hiddenSlidesFor(slug: string, content: string, query: DeckQuery, hidden: number[] | undefined): number[] {
  for (const family of deckFamilies) {
    const chosen = family.hiddenSlides?.(slug, content, query, hidden);
    if (chosen) return chosen;
  }
  return hidden ?? [];
}

/** Kapitelnamnet som en familj ger en slide utan rubrikfält. */
export function slideTitleFor(tag: string, props: Record<string, unknown>): string | undefined {
  for (const family of deckFamilies) {
    const title = family.slideTitle?.(tag, props);
    if (title) return title;
  }
  return undefined;
}

/** Media som familjerna vill ha förladdade för decket, utöver det som står i källan. */
export function preloadFor(slug: string | undefined, source: string): MediaUrl[] {
  return slug ? deckFamilies.flatMap((family) => family.preload?.(slug, source) ?? []) : [];
}
