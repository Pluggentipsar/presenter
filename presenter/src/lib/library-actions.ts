"use server";

import { revalidatePath } from "next/cache";
import { applyLibraryOp, type Library, type LibraryOp } from "./library";
import { isLibraryReadOnly, NOTE_MAX_LENGTH, readLibrary, writeDeckNote, writeLibrary } from "./library.server";
import { getPresentationSlugs } from "./mdx";

/**
 * Ändrar biblioteket. Varje anrop läser filen på nytt, tillämpar EN operation
 * och skriver tillbaka — två flikar (eller två datorer som just synkat) skriver
 * därför inte över varandras ändringar, bara i värsta fall samma fält.
 *
 * Svaret är hela det nya biblioteket, så att klienten alltid hamnar i takt med
 * det som faktiskt står på disk.
 */
export async function updateLibrary(
  ops: LibraryOp[],
): Promise<{ ok: true; library: Library } | { ok: false; error: string }> {
  if (isLibraryReadOnly()) return { ok: false, error: "Biblioteket går inte att ändra härifrån." };
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 50) return { ok: false, error: "Ogiltig ändring." };
  try {
    const before = readLibrary();
    const after = ops.reduce(applyLibraryOp, before);
    if (after !== before) writeLibrary(after);
    revalidatePath("/");
    return { ok: true, library: after };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Kunde inte spara biblioteket." };
  }
}

/**
 * Sparar anteckningarna om en föreläsning (content/anteckningar/<slug>.md).
 * Tom text tar bort filen.
 */
export async function saveDeckNote(slug: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isLibraryReadOnly()) return { ok: false, error: "Anteckningar går inte att spara härifrån." };
  if (typeof slug !== "string" || typeof text !== "string") return { ok: false, error: "Ogiltig anteckning." };
  if (text.length > NOTE_MAX_LENGTH) return { ok: false, error: "Anteckningen är för lång." };
  if (!getPresentationSlugs().includes(slug)) return { ok: false, error: "Föreläsningen finns inte." };
  try {
    writeDeckNote(slug, text);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Kunde inte spara anteckningen." };
  }
}
