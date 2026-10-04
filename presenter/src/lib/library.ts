/**
 * Biblioteket — hur föreläsningarna är ordnade på startsidan.
 *
 * Mappar är METADATA, inte kataloger på disk. Ett decks slug är dess adress
 * (`/<slug>`), och den refereras från wikin, delningsregistret och
 * joelsai.com; att flytta filen för att "lägga den i en mapp" skulle bryta
 * allt det. Därför ligger ordningen i en egen fil, `content/bibliotek.json`,
 * som versionshanteras tillsammans med decken och följer med mellan datorerna.
 *
 * Filen innehåller bara det som avviker från standard: ett deck som varken
 * ligger i en mapp, är fäst eller arkiverat finns inte med alls. Poster för
 * deck som inte finns på den här datorn lämnas orörda — de kan finnas på den
 * andra datorn och bara inte vara hämtade än.
 *
 * VERSIONER. Flera deck kan vara versioner av samma föreläsning
 * (`norrby-gymnasiet`, `-v2`, `-v3`). De delar då `family`, och exakt en av dem
 * bär `current: true` — stjärnan, "den som gäller". Biblioteket visar familjen
 * som ETT kort (den gällande versionen), och den som hänvisar till föreläsningen
 * — Joel i ett samtal, en agent som ska låna block, en länk — menar i första
 * hand den versionen. `scripts/gallande.mjs` svarar på frågan från kommandoraden.
 *
 * Modulen är ren (inget fs, inget React) och testas med
 * `npm run test:bibliotek`.
 */

export const LIBRARY_VERSION = 1;
/** Två nivåer räcker: "Hösten 2026" → "Solby". Djupare träd blir att leta i. */
export const MAX_FOLDER_DEPTH = 2;

export interface LibraryFolder {
  id: string;
  name: string;
  /** Förälderns id, eller null för en mapp på översta nivån. */
  parent: string | null;
}

export interface LibraryDeckEntry {
  folder?: string;
  pinned?: boolean;
  archived?: boolean;
  /** Versioner av samma föreläsning delar familj. Minst två deck per familj. */
  family?: string;
  /** Stjärnan: den version som gäller. Exakt en per familj. */
  current?: boolean;
}

export interface Library {
  version: number;
  /** Ordningen i listan ÄR ordningen i sidofältet (syskon emellan). */
  folders: LibraryFolder[];
  decks: Record<string, LibraryDeckEntry>;
}

export type LibraryOp =
  | { type: "createFolder"; id: string; name: string; parent: string | null }
  | { type: "renameFolder"; id: string; name: string }
  | { type: "deleteFolder"; id: string }
  | { type: "moveFolder"; id: string; direction: -1 | 1 }
  | { type: "moveDecks"; slugs: string[]; folder: string | null }
  | { type: "setPinned"; slugs: string[]; pinned: boolean }
  | { type: "setArchived"; slugs: string[]; archived: boolean }
  /** Samlar deck som versioner av samma föreläsning. `current` får stjärnan. */
  | { type: "groupVersions"; slugs: string[]; family: string; current: string }
  /** Flyttar stjärnan inom deckets familj. */
  | { type: "setCurrent"; slug: string }
  /** Tar deck ur sin familj. `fallback` får stjärnan om den gällande försvann. */
  | { type: "ungroupVersions"; slugs: string[]; fallback?: string };

export const EMPTY_LIBRARY: Library = { version: LIBRARY_VERSION, folders: [], decks: {} };

const FOLDER_ID = /^m_[a-z0-9]{4,16}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,120}$/i;
const FAMILY_ID = /^[a-z0-9][a-z0-9_-]{0,120}$/i;

function isEmptyEntry(entry: LibraryDeckEntry): boolean {
  return !entry.folder && !entry.pinned && !entry.archived && !entry.family;
}

/**
 * Håller familjerna hela: minst två medlemmar, exakt en stjärna. En ensam
 * version är ingen familj; saknas stjärnan får `prefer` den, annars den sista i
 * bokstavsordning (`-v3` sorteras efter `-v2`).
 */
function repairFamilies(decks: Record<string, LibraryDeckEntry>, prefer?: string): Record<string, LibraryDeckEntry> {
  const members = new Map<string, string[]>();
  for (const [slug, entry] of Object.entries(decks)) {
    if (entry.family) members.set(entry.family, [...(members.get(entry.family) ?? []), slug]);
  }
  const next = { ...decks };
  const put = (slug: string, entry: LibraryDeckEntry) => {
    if (isEmptyEntry(entry)) delete next[slug];
    else next[slug] = entry;
  };
  for (const slugs of members.values()) {
    if (slugs.length < 2) {
      for (const slug of slugs) {
        const entry = { ...next[slug] };
        delete entry.family;
        delete entry.current;
        put(slug, entry);
      }
      continue;
    }
    const sorted = [...slugs].sort();
    const starred = sorted.filter((slug) => next[slug].current);
    const keep =
      prefer && slugs.includes(prefer) && (starred.length !== 1 || starred[0] === prefer)
        ? prefer
        : (starred[starred.length - 1] ?? sorted[sorted.length - 1]);
    for (const slug of slugs) {
      const entry = { ...next[slug] };
      if (slug === keep) entry.current = true;
      else delete entry.current;
      put(slug, entry);
    }
  }
  // En stjärna utan familj betyder ingenting.
  for (const [slug, entry] of Object.entries(next)) {
    if (entry.current && !entry.family) {
      const cleaned = { ...entry };
      delete cleaned.current;
      put(slug, cleaned);
    }
  }
  return next;
}

export function createFolderId(): string {
  let id = "m_";
  for (let i = 0; i < 8; i++) id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)];
  return id;
}

function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 60) : "";
}

/** Läser in vad som helst och ger tillbaka ett giltigt bibliotek. */
export function normalizeLibrary(raw: unknown): Library {
  if (!raw || typeof raw !== "object") return EMPTY_LIBRARY;
  const value = raw as { folders?: unknown; decks?: unknown };

  const folders: LibraryFolder[] = [];
  const seen = new Set<string>();
  if (Array.isArray(value.folders)) {
    for (const item of value.folders) {
      if (!item || typeof item !== "object") continue;
      const folder = item as Record<string, unknown>;
      const id = typeof folder.id === "string" ? folder.id : "";
      const name = cleanName(folder.name);
      if (!FOLDER_ID.test(id) || !name || seen.has(id)) continue;
      seen.add(id);
      folders.push({ id, name, parent: typeof folder.parent === "string" ? folder.parent : null });
    }
  }
  // En förälder som inte finns, pekar på sig själv eller ligger för djupt → översta nivån.
  for (const folder of folders) {
    const parent = folder.parent ? folders.find((f) => f.id === folder.parent) : null;
    if (!parent || parent.id === folder.id || parent.parent) folder.parent = null;
  }

  const decks: Record<string, LibraryDeckEntry> = {};
  if (value.decks && typeof value.decks === "object") {
    for (const [slug, item] of Object.entries(value.decks as Record<string, unknown>)) {
      if (!SLUG.test(slug) || !item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const next: LibraryDeckEntry = {};
      if (typeof entry.folder === "string" && seen.has(entry.folder)) next.folder = entry.folder;
      if (entry.pinned === true) next.pinned = true;
      if (entry.archived === true) next.archived = true;
      if (typeof entry.family === "string" && FAMILY_ID.test(entry.family)) next.family = entry.family;
      if (entry.current === true) next.current = true;
      if (Object.keys(next).length > 0) decks[slug] = next;
    }
  }
  return { version: LIBRARY_VERSION, folders, decks: repairFamilies(decks) };
}

/**
 * Stabil, läsbar JSON: mappar i sin ordning, deck i bokstavsordning, EN RAD per
 * mapp och per deck. Att flytta en föreläsning ändrar då en rad i git, och två
 * datorer som ordnat olika deck går att slå ihop utan konflikt.
 */
export function serializeLibrary(library: Library): string {
  const entries: string[] = [];
  for (const slug of Object.keys(library.decks).sort()) {
    const entry = library.decks[slug];
    const next: LibraryDeckEntry = {};
    if (entry.folder) next.folder = entry.folder;
    if (entry.pinned) next.pinned = true;
    if (entry.archived) next.archived = true;
    if (entry.family) next.family = entry.family;
    if (entry.family && entry.current) next.current = true;
    if (Object.keys(next).length > 0) entries.push(`${JSON.stringify(slug)}: ${JSON.stringify(next)}`);
  }
  const block = (items: string[]) => (items.length ? `\n${items.map((item) => `    ${item}`).join(",\n")}\n  ` : "");
  const folders = library.folders.map((folder) => JSON.stringify(folder));
  return `{\n  "version": ${LIBRARY_VERSION},\n  "folders": [${block(folders)}],\n  "decks": {${block(entries)}}\n}\n`;
}

function patchDecks(library: Library, slugs: string[], patch: (entry: LibraryDeckEntry) => LibraryDeckEntry): Library {
  // Operationerna kommer från klienten: lita inte på formen.
  if (!Array.isArray(slugs)) return library;
  const decks = { ...library.decks };
  for (const slug of slugs) {
    if (typeof slug !== "string" || !SLUG.test(slug)) continue;
    const next = patch({ ...(decks[slug] ?? {}) });
    if (isEmptyEntry(next)) delete decks[slug];
    else decks[slug] = next;
  }
  return { ...library, decks };
}

export function applyLibraryOp(library: Library, op: LibraryOp): Library {
  switch (op.type) {
    case "createFolder": {
      const name = cleanName(op.name);
      if (!name || !FOLDER_ID.test(op.id) || library.folders.some((f) => f.id === op.id)) return library;
      const parent = op.parent ? library.folders.find((f) => f.id === op.parent) : null;
      // En undermapp kan inte få egna undermappar.
      const parentId = parent && !parent.parent ? parent.id : null;
      return { ...library, folders: [...library.folders, { id: op.id, name, parent: parentId }] };
    }
    case "renameFolder": {
      const name = cleanName(op.name);
      if (!name) return library;
      return { ...library, folders: library.folders.map((f) => (f.id === op.id ? { ...f, name } : f)) };
    }
    case "deleteFolder": {
      const target = library.folders.find((f) => f.id === op.id);
      if (!target) return library;
      // Innehållet flyttar upp ett steg: deck till förälder (eller osorterat),
      // undermappar till översta nivån. Inget deck försvinner med en mapp.
      const folders = library.folders
        .filter((f) => f.id !== op.id)
        .map((f) => (f.parent === op.id ? { ...f, parent: target.parent } : f));
      const decks: Record<string, LibraryDeckEntry> = {};
      for (const [slug, entry] of Object.entries(library.decks)) {
        if (entry.folder !== op.id) {
          decks[slug] = entry;
          continue;
        }
        const next: LibraryDeckEntry = { ...entry };
        if (target.parent) next.folder = target.parent;
        else delete next.folder;
        if (!isEmptyEntry(next)) decks[slug] = next;
      }
      return { ...library, folders, decks };
    }
    case "moveFolder": {
      const index = library.folders.findIndex((f) => f.id === op.id);
      if (index < 0) return library;
      const parent = library.folders[index].parent;
      // Byt plats med närmaste syskon i den riktningen.
      let other = index + op.direction;
      while (other >= 0 && other < library.folders.length && library.folders[other].parent !== parent) other += op.direction;
      if (other < 0 || other >= library.folders.length) return library;
      const folders = library.folders.slice();
      [folders[index], folders[other]] = [folders[other], folders[index]];
      return { ...library, folders };
    }
    case "moveDecks": {
      const folder = op.folder && library.folders.some((f) => f.id === op.folder) ? op.folder : null;
      return patchDecks(library, op.slugs, (entry) => {
        if (folder) entry.folder = folder;
        else delete entry.folder;
        return entry;
      });
    }
    case "setPinned":
      return patchDecks(library, op.slugs, (entry) => {
        if (op.pinned) entry.pinned = true;
        else delete entry.pinned;
        return entry;
      });
    case "setArchived":
      return patchDecks(library, op.slugs, (entry) => {
        if (op.archived) {
          entry.archived = true;
          // Ett arkiverat deck är inte längre något man vill ha överst.
          delete entry.pinned;
        } else delete entry.archived;
        return entry;
      });
    case "groupVersions": {
      if (!Array.isArray(op.slugs) || typeof op.family !== "string" || !FAMILY_ID.test(op.family)) return library;
      const slugs = [...new Set(op.slugs.filter((slug) => typeof slug === "string" && SLUG.test(slug)))];
      if (slugs.length < 2) return library;
      // Hör någon redan till en familj går de nya in i DEN — och är flera
      // familjer inblandade slås de ihop till den första.
      const existing = slugs.map((slug) => library.decks[slug]?.family).filter((f): f is string => Boolean(f));
      const family = existing[0] ?? op.family;
      const absorbed = new Set(existing);
      const decks = { ...library.decks };
      for (const [slug, entry] of Object.entries(decks)) {
        if (entry.family && absorbed.has(entry.family)) decks[slug] = { ...entry, family };
      }
      for (const slug of slugs) decks[slug] = { ...(decks[slug] ?? {}), family };
      const prefer = typeof op.current === "string" && decks[op.current]?.family === family ? op.current : undefined;
      if (prefer) for (const [slug, entry] of Object.entries(decks)) if (entry.family === family) decks[slug] = { ...entry, current: slug === prefer };
      return { ...library, decks: repairFamilies(decks, prefer) };
    }
    case "setCurrent": {
      const family = library.decks[op.slug]?.family;
      if (!family) return library;
      const decks = { ...library.decks };
      for (const [slug, entry] of Object.entries(decks)) {
        if (entry.family === family) decks[slug] = { ...entry, current: slug === op.slug };
      }
      return { ...library, decks: repairFamilies(decks, op.slug) };
    }
    case "ungroupVersions": {
      if (!Array.isArray(op.slugs)) return library;
      const decks = { ...library.decks };
      for (const slug of op.slugs) {
        const entry = decks[slug];
        if (!entry?.family) continue;
        const next = { ...entry };
        delete next.family;
        delete next.current;
        if (isEmptyEntry(next)) delete decks[slug];
        else decks[slug] = next;
      }
      return { ...library, decks: repairFamilies(decks, typeof op.fallback === "string" ? op.fallback : undefined) };
    }
    default:
      return library;
  }
}

// ── Läsning ────────────────────────────────────────────────────────────────

export interface FolderNode extends LibraryFolder {
  children: FolderNode[];
}

export function folderTree(library: Library): FolderNode[] {
  const nodes = new Map<string, FolderNode>(library.folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: FolderNode[] = [];
  for (const folder of library.folders) {
    const node = nodes.get(folder.id)!;
    const parent = folder.parent ? nodes.get(folder.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Mappen själv och dess undermappar. */
export function folderWithDescendants(library: Library, id: string): Set<string> {
  const ids = new Set<string>([id]);
  for (const folder of library.folders) if (folder.parent === id) ids.add(folder.id);
  return ids;
}

export function folderPath(library: Library, id: string | undefined): LibraryFolder[] {
  const folder = id ? library.folders.find((f) => f.id === id) : undefined;
  if (!folder) return [];
  const parent = folder.parent ? library.folders.find((f) => f.id === folder.parent) : undefined;
  return parent ? [parent, folder] : [folder];
}

/** Alla versioner i en familj, i bokstavsordning. */
export function familyMembers(library: Library, family: string | undefined): string[] {
  if (!family) return [];
  return Object.keys(library.decks)
    .filter((slug) => library.decks[slug].family === family)
    .sort();
}

/**
 * Den version som gäller. Tar en familj ELLER vilken version som helst och
 * svarar med den stjärnmärkta. Ett deck utan familj gäller själv.
 */
export function currentVersion(library: Library, slugOrFamily: string): string {
  const family = library.decks[slugOrFamily]?.family ?? slugOrFamily;
  const members = familyMembers(library, family);
  return members.find((slug) => library.decks[slug].current) ?? slugOrFamily;
}

const VERSION_SUFFIX = /(-v\d+|_codex\d*|[-_]kopia(-\d+)?)$/i;

/** `norrby-gymnasiet-v3` → `norrby-gymnasiet`, `vastby_codex-kopia` → `vastby`. */
function versionBase(slug: string, all: ReadonlySet<string>): string {
  let base = slug;
  while (VERSION_SUFFIX.test(base)) base = base.replace(VERSION_SUFFIX, "");
  // En avslutande siffra räknas bara om namnet utan den också finns:
  // `eleverna-om-ai2` hör till `eleverna-om-ai`, men `skogsby-fm2` är ett eget pass.
  const digitless = base.replace(/\d+$/, "");
  if (digitless !== base && digitless.length > 2 && all.has(digitless)) base = digitless;
  return base;
}

/** Deck som på namnet ser ut att vara versioner av varandra — ett FÖRSLAG. */
export function suggestFamilies(slugs: string[]): { family: string; slugs: string[] }[] {
  const all = new Set(slugs);
  const groups = new Map<string, string[]>();
  for (const slug of slugs) {
    const base = versionBase(slug, all);
    groups.set(base, [...(groups.get(base) ?? []), slug]);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([family, members]) => ({ family, slugs: members.sort() }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/** Ett läsbart familjenamn: det versionerna har gemensamt i sina adresser. */
export function familyIdFor(slugs: string[], taken: ReadonlySet<string>): string {
  const sorted = [...slugs].sort();
  let prefix = sorted[0] ?? "familj";
  for (const slug of sorted) {
    let i = 0;
    while (i < prefix.length && i < slug.length && prefix[i] === slug[i]) i++;
    prefix = prefix.slice(0, i);
  }
  let id = prefix.replace(/[-_]+$/, "").replace(/[-_]v$/i, "");
  if (id.length < 3) id = sorted[0] ?? "familj";
  let unique = id;
  for (let n = 2; taken.has(unique); n++) unique = `${id}-${n}`;
  return unique;
}

/** Namnmönster som brukar vara prov, demo eller arbetskopior — ett FÖRSLAG till arkivet. */
const NOISE = /(^demo($|-)|^mockup-|^testar$|^zzz-|formprov|designprov|fargprov|showcase|-kopia($|-)|_codex|_hopp$|_klassrum$|_maximalism$)/i;

export function looksLikeNoise(slug: string): boolean {
  return NOISE.test(slug);
}
