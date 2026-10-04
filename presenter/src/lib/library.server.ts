import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getPresentation, getPresentationSlugs } from "./mdx";
import { writeFileAtomic } from "./atomic-write";
import { isValidSlug } from "./slug";
import { EMPTY_LIBRARY, normalizeLibrary, serializeLibrary, type Library } from "./library";

/**
 * Bibliotekets serverdel: läser och skriver `content/bibliotek.json` och
 * sammanställer det startsidan behöver veta om varje deck.
 *
 * ANTECKNINGAR ligger som en markdownfil per föreläsning,
 * `content/anteckningar/<slug>.md` — inte i JSON-filen. Då går de att läsa och
 * skriva i vilken editor som helst (Obsidian, en agent, appen), de blir vanliga
 * rader i git, och en lång anteckning gör inte biblioteksfilen oläslig. De är
 * Joels egna och lämnar aldrig en publik värd: `getLibraryDecks()` läser dem
 * inte där, och ingen rutt serverar mappen.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");
const LIBRARY_FILE = path.join(CONTENT_DIR, "bibliotek.json");
const SHARES_FILE = path.join(process.cwd(), "publish", "delningar.json");
const NOTES_DIR = path.join(CONTENT_DIR, "anteckningar");
export const NOTE_MAX_LENGTH = 20_000;

/**
 * På en publik värd (Vercel, en delningsexport) är startsidan bara en lista:
 * filsystemet går inte att skriva till, och ingen utomstående ska kunna
 * möblera om i Joels bibliotek.
 */
export function isLibraryReadOnly(): boolean {
  return Boolean(process.env.VERCEL) || process.env.PRESENTER_PUBLIC === "1" || process.env.PRESENTER_READONLY === "1";
}

export function readLibrary(): Library {
  try {
    return normalizeLibrary(JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf-8")));
  } catch {
    return EMPTY_LIBRARY;
  }
}

export function writeLibrary(library: Library): void {
  writeFileAtomic(LIBRARY_FILE, serializeLibrary(library));
}

export function readDeckNote(slug: string): string {
  if (!isValidSlug(slug)) return "";
  try {
    return fs.readFileSync(path.join(NOTES_DIR, `${slug}.md`), "utf-8").replace(/\r\n/g, "\n").trimEnd();
  } catch {
    return "";
  }
}

/** Tom text tar bort filen: en föreläsning utan anteckningar har ingen fil. */
export function writeDeckNote(slug: string, text: string): void {
  if (!isValidSlug(slug)) throw new Error(`Ogiltigt slug-namn: ${slug}`);
  const file = path.join(NOTES_DIR, `${slug}.md`);
  const clean = text.replace(/\r\n/g, "\n").trimEnd().slice(0, NOTE_MAX_LENGTH);
  if (!clean) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  fs.mkdirSync(NOTES_DIR, { recursive: true });
  writeFileAtomic(file, `${clean}\n`);
}

export interface LibraryDeck {
  slug: string;
  title: string;
  event?: string;
  /** Som det står i frontmatter: "2026-09-24" eller bara "2026". */
  date?: string;
  description?: string;
  theme: string;
  tags: string[];
  slideCount: number;
  /** Filens ändringstid i millisekunder — finare än datumet, för "senast ändrad". */
  updatedAtMs: number;
  /** Första slide som inte är dold (1-baserad) — den som blir omslag. */
  coverSlide: number;
  /** Byts när filen ändras, så att omslaget fångas om. */
  coverHash: string;
  /** Publicerad delning på here.now, om det finns någon. */
  shared?: { landing?: string; read?: string; watch?: string; publishedAt?: string };
  /** Joels anteckningar om föreläsningen. Följer aldrig med till en publik värd. */
  note?: string;
}

function readShares(): Record<string, LibraryDeck["shared"]> {
  try {
    const raw = JSON.parse(fs.readFileSync(SHARES_FILE, "utf-8")) as Record<string, Record<string, unknown>>;
    const out: Record<string, LibraryDeck["shared"]> = {};
    for (const [slug, entry] of Object.entries(raw)) {
      if (!entry || typeof entry !== "object") continue;
      out[slug] = {
        landing: typeof entry.landing === "string" ? entry.landing : undefined,
        read: typeof entry.read === "string" ? entry.read : undefined,
        watch: typeof entry.watch === "string" ? entry.watch : undefined,
        publishedAt: typeof entry.publishedAt === "string" ? entry.publishedAt : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function getLibraryDecks(): LibraryDeck[] {
  const local = !isLibraryReadOnly();
  const shares = local ? readShares() : {};
  const decks: LibraryDeck[] = [];
  for (const slug of getPresentationSlugs()) {
    const presentation = getPresentation(slug);
    if (!presentation) continue;
    const { meta } = presentation;
    let updatedAtMs = 0;
    let size = 0;
    try {
      const stat = fs.statSync(path.join(CONTENT_DIR, `${slug}.mdx`));
      updatedAtMs = Math.round(stat.mtimeMs);
      size = stat.size;
    } catch {
      // Filen försvann mellan listning och läsning — hoppa över detaljerna.
    }
    const slideCount = meta.slideCount ?? 0;
    const hidden = new Set(meta.hiddenSlides ?? []);
    let coverSlide = 1;
    while (coverSlide < slideCount && hidden.has(coverSlide)) coverSlide++;
    decks.push({
      slug,
      title: meta.title,
      event: meta.event ? String(meta.event) : undefined,
      date: meta.date,
      description: meta.description ? String(meta.description) : undefined,
      theme: meta.theme ?? "default",
      tags: meta.tags ?? [],
      slideCount,
      updatedAtMs,
      coverSlide,
      coverHash: `${updatedAtMs.toString(36)}-${size.toString(36)}`,
      shared: shares[slug],
      note: local ? readDeckNote(slug) || undefined : undefined,
    });
  }
  return decks;
}
