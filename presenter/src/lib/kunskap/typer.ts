/** Kunskapsbankens data mellan servern och läsvyn (2 oktober 2026). */

export interface NoteInfo {
  /** Sökvägen från valvets rot, med snedstreck framåt: "wiki/begrepp/agens.md". */
  path: string;
  title: string;
  /** Färggruppen (lankar.ts, groupOf). */
  group: string;
  tags: string[];
  /** Sidor som sidan länkar till, upplösta och utan dubbletter. */
  links: string[];
  /** Föreläsningar som sidan hör till eller pekar på (slug). */
  decks: string[];
  /** Wikilänkar som inte leder till någon sida än. */
  missing: string[];
  mtime: number;
  size: number;
}

export interface DeckInfo {
  slug: string;
  title: string;
  event?: string;
  date?: string;
  coverSlide: number;
  coverHash: string;
}

export interface VaultIndex {
  /** Valvets mappnamn (Obsidian kallar valvet så). */
  name: string;
  notes: NoteInfo[];
  decks: DeckInfo[];
  /** Var en ny sida hamnar, som Obsidian är inställt (.obsidian/app.json): en mapp, sidans egen mapp eller roten. */
  newNote: { location: "folder" | "current" | "root"; folder: string };
}

export interface NotePage {
  path: string;
  /** Hela filen som den ligger på disk, med frontmatter. */
  text: string;
  /** Frontmattern som vanliga värden (datum som text). */
  data: Record<string, unknown>;
  mtime: number;
  /** Innehållets fingeravtryck: en sparning som utgår från ett annat avbryts i stället för att skriva över. */
  hash: string;
}

export interface SearchHit {
  path: string;
  title: string;
  group: string;
  snippet: string;
  score: number;
}
