import "server-only";

import fs from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { normalizeFavorites, serializeFavorites } from "./template-gallery";

/**
 * Galleriets favoriter: `content/galleri.json`.
 *
 * En egen fil, inte ett fält i biblioteksfilen: biblioteket handlar om
 * föreläsningar, det här om mallar, och filerna ändras vid olika tillfällen.
 * Utan favoriter finns ingen fil — den som tar bort sin sista stjärna lämnar
 * inget tomt skal efter sig i repot.
 */
const FAVORITES_FILE = process.env.PRESENTER_GALLERY_FILE ?? path.join(process.cwd(), "content", "galleri.json");

export function readGalleryFavorites(): string[] {
  try {
    return normalizeFavorites(JSON.parse(fs.readFileSync(FAVORITES_FILE, "utf-8")));
  } catch {
    return [];
  }
}

export function writeGalleryFavorites(favorites: string[]): void {
  if (favorites.length === 0) {
    fs.rmSync(FAVORITES_FILE, { force: true });
    return;
  }
  writeFileAtomic(FAVORITES_FILE, serializeFavorites(favorites));
}
