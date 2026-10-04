/**
 * Kanonisk slug-validering.
 *
 * Mönstret finns här och ingen annanstans. Tidigare hade
 * presentation-actions, floating-image-actions och floating-video-actions
 * var sin kopia, och de gled isär: bild- och videovägarna saknade `_`, vilket
 * gjorde att presentationer med understreck i namnet (norrby_codex,
 * norrby_codex2) laddade och gick att redigera — men kastade
 * "Ogiltigt slug-namn" så fort man försökte lägga till en bild.
 *
 * Syftet med valideringen är att stoppa path traversal: slugen används för att
 * bygga sökvägar under public/. Genom att kräva att strängen börjar med
 * alfanumeriskt och bara innehåller [a-z0-9_-] utesluts både `..`, `/` och `\`.
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/** Kastar med samma formulering som tidigare, så felmeddelanden inte ändras. */
export function assertValidSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new Error(`Ogiltigt slug-namn: ${slug}`);
  }
}
