"use server";

import type { ParsedComponent } from "./mdx-parser";
import { loadSlidesForAuthoring } from "./edit-actions";
import { isLibraryReadOnly } from "./library.server";
import { readGalleryFavorites, writeGalleryFavorites } from "./gallery-favorites.server";
import { PLANNING_PROPS, isTemplateTag, toggleFavorite, type GalleryTemplate } from "./template-gallery";
import { getTemplateGallery } from "./template-gallery.server";

/** Galleriets innehåll. Hämtas när galleriet öppnas, inte med varje sida. */
export async function loadTemplateGallery(): Promise<{ ok: true; templates: GalleryTemplate[]; favorites: string[] } | { ok: false; error: string }> {
  if (isLibraryReadOnly()) return { ok: false, error: "Galleriet finns bara i den lokala verkstaden." };
  try {
    // Favoriterna läses färska varje gång: de hör inte till den tunga, cachade sammanställningen.
    return { ok: true, templates: getTemplateGallery(), favorites: readGalleryFavorites() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Kunde inte läsa mallarna." };
  }
}

/**
 * En ny slide med ett exempel som utgångspunkt: samma mall och samma innehåll,
 * men utan det som hör till ursprunget — manus, planeringsfält, instruktioner
 * till Claude och lösa överlägg. Det som blir kvar är formen att fylla i.
 */
export async function loadExampleSlide(slug: string, slide: number): Promise<{ ok: true; slide: ParsedComponent } | { ok: false; error: string }> {
  if (isLibraryReadOnly()) return { ok: false, error: "Galleriet finns bara i den lokala verkstaden." };
  const result = await loadSlidesForAuthoring([{ slug, slideIndex1Based: slide }]);
  const source = result.slides?.[0];
  if (!result.ok || !source) return { ok: false, error: result.error ?? "Exemplet gick inte att läsa." };
  const props = { ...source.props };
  for (const key of PLANNING_PROPS) delete props[key];
  const clean: ParsedComponent = { tag: source.tag, props, content: source.content, children: source.children };
  return { ok: true, slide: clean };
}

/**
 * Stjärnmärk en mall, eller ta bort stjärnan. Läser filen, ändrar, skriver —
 * så att en stjärna satt i ett annat fönster inte skrivs över. Svaret är hela
 * den nya listan.
 */
export async function setTemplateFavorite(tag: string, on: boolean): Promise<{ ok: true; favorites: string[] } | { ok: false; error: string }> {
  if (isLibraryReadOnly()) return { ok: false, error: "Favoriter går bara att ändra i den lokala verkstaden." };
  if (!isTemplateTag(tag)) return { ok: false, error: "Okänt mallnamn." };
  try {
    const favorites = toggleFavorite(readGalleryFavorites(), tag, on);
    writeGalleryFavorites(favorites);
    return { ok: true, favorites };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Kunde inte spara favoriten." };
  }
}
