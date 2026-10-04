/**
 * Kunskapsbankens länkar (2 oktober 2026). Obsidians [[wikilänkar]] och vanliga markdownlänkar,
 * tolkade likadant i servern (grafen, Länkar hit) och i läsvyn (klick på en länk). Inget här
 * använder node, så samma kod körs i webbläsaren.
 *
 * Upplösningen följer Obsidian: [[namn]] hittar filen med det namnet var den än ligger i valvet,
 * [[mapp/namn]] matchar slutet av sökvägen, och finns flera med samma namn vinner den i samma mapp,
 * annars den kortaste sökvägen. Markdownlänkar läses relativt sidan, och i andra hand från roten.
 * Länkar till ett decks .mdx eller till /<slug> blir föreläsningen.
 */

export interface WikiLink {
  target: string;
  heading?: string;
  alias?: string;
  /** ![[…]]: en inbäddning (en bild, eller en sida som Obsidian visar inne i sidan). */
  embed: boolean;
}

/** [[mål]], [[mål|visas]], [[mål#rubrik]], [[mål#rubrik|visas]] och ![[inbäddning]]. */
const WIKILINK_SOURCE = String.raw`(!?)\[\[([^\[\]|#\n]*)(?:#([^\[\]|\n]*))?(?:\|([^\[\]\n]*))?\]\]`;
export const wikilinkPattern = () => new RegExp(WIKILINK_SOURCE, "g");

export function readWikilink(match: RegExpMatchArray): WikiLink {
  return {
    embed: match[1] === "!",
    target: (match[2] ?? "").trim(),
    heading: match[3]?.trim() || undefined,
    alias: match[4]?.trim() || undefined,
  };
}

/** Markdownlänkar och bilder: [text](mål), [text](<mål med mellanslag>), med valfri titel. */
const MDLINK = /\]\(\s*(?:<([^>\n]+)>|([^)\s]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/g;

/** Inledande frontmatter (`---` … `---`), avskild från resten av sidan. */
export function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
  return match ? { frontmatter: match[1], body: text.slice(match[0].length) } : { frontmatter: "", body: text };
}

/** Texten utan kodblock och kodspann, så att exempel i kod inte räknas som länkar. */
export function withoutCode(text: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of text.split("\n")) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      out.push("");
      continue;
    }
    if (marker) {
      fence = marker[1];
      out.push("");
      continue;
    }
    out.push(line.replace(/`[^`\n]*`/g, ""));
  }
  return out.join("\n");
}

export function extractLinks(text: string): { wiki: WikiLink[]; urls: string[] } {
  const clean = withoutCode(text);
  const wiki = [...clean.matchAll(wikilinkPattern())].map(readWikilink);
  const urls = [...clean.matchAll(MDLINK)].map(match => (match[1] ?? match[2] ?? "").trim()).filter(Boolean);
  return { wiki, urls };
}

/* ── Sökvägar (alltid med snedstreck framåt, relativt valvets rot) ────────── */

export const dirOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
export const baseOf = (p: string) => p.slice(p.lastIndexOf("/") + 1);
export const stemOf = (p: string) => baseOf(p).replace(/\.md$/i, "");

/** dir + rel med . och .. upplösta. Null om sökvägen går ovanför roten. */
export function joinPath(dir: string, rel: string): string | null {
  const parts = dir ? dir.split("/") : [];
  for (const segment of rel.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!parts.length) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join("/");
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Rubrikens id i läsvyn; samma för [[sida#Rubrik]] och [text](#rubrik). */
export function headingId(text: string): string {
  return text
    .toLocaleLowerCase("sv")
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ── Upplösningen ─────────────────────────────────────────────────────────── */

export type Resolved =
  | { kind: "note"; path: string; heading?: string }
  | { kind: "deck"; slug: string }
  | { kind: "anchor"; heading: string }
  | { kind: "external"; url: string }
  | { kind: "file"; path: string }
  | { kind: "missing"; target: string };

export const IMAGE_FILE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const DECK_FILE = /(?:^|\/)([a-z0-9][a-z0-9-]*)\.mdx$/i;

export interface Resolver {
  wiki: (from: string, link: Pick<WikiLink, "target" | "heading">) => Resolved;
  url: (from: string, href: string) => Resolved;
}

export function makeResolver({ notes, decks }: { notes: string[]; decks: string[] }): Resolver {
  const byStem = new Map<string, string[]>();
  const byPath = new Map<string, string>();
  for (const note of notes) {
    byPath.set(note.toLowerCase(), note);
    const key = stemOf(note).toLowerCase();
    const list = byStem.get(key);
    if (list) list.push(note);
    else byStem.set(key, [note]);
  }
  const deckSet = new Set(decks);
  const pick = (from: string, list: string[]) => {
    if (list.length === 1) return list[0];
    const here = dirOf(from);
    return list.find(p => dirOf(p) === here) ?? [...list].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b, "sv"))[0];
  };
  const deckOf = (value: string) => {
    const match = value.match(DECK_FILE);
    return match && deckSet.has(match[1]) ? match[1] : null;
  };

  const wiki: Resolver["wiki"] = (from, link) => {
    const raw = link.target.trim().replace(/\\/g, "/");
    if (!raw) return link.heading ? { kind: "anchor", heading: link.heading } : { kind: "missing", target: "" };
    const deck = deckOf(raw);
    if (deck) return { kind: "deck", slug: deck };
    if (IMAGE_FILE.test(raw)) return { kind: "file", path: raw };
    const target = raw.replace(/\.md$/i, "");
    const lower = target.toLowerCase();
    if (lower.includes("/")) {
      const relative = joinPath(dirOf(from), target);
      const direct = byPath.get(`${lower}.md`) ?? (relative ? byPath.get(`${relative.toLowerCase()}.md`) : undefined);
      if (direct) return { kind: "note", path: direct, heading: link.heading };
      const suffix: string[] = [];
      for (const [key, value] of byPath) if (key.endsWith(`/${lower}.md`)) suffix.push(value);
      if (suffix.length) return { kind: "note", path: pick(from, suffix), heading: link.heading };
      return { kind: "missing", target: raw };
    }
    const list = byStem.get(lower);
    if (list?.length) return { kind: "note", path: pick(from, list), heading: link.heading };
    return { kind: "missing", target: raw };
  };

  const url: Resolver["url"] = (from, href) => {
    const value = href.trim();
    if (!value) return { kind: "missing", target: "" };
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return { kind: "external", url: value };
    if (value.startsWith("#")) return { kind: "anchor", heading: decode(value.slice(1)) };
    const hashAt = value.indexOf("#");
    const heading = hashAt >= 0 ? decode(value.slice(hashAt + 1)) || undefined : undefined;
    let pathPart = decode((hashAt >= 0 ? value.slice(0, hashAt) : value).split("?")[0]);
    if (pathPart.startsWith("/")) {
      // En adress i appen: /<slug> är föreläsningen; annars en sökväg från valvets rot.
      const first = pathPart.slice(1).split("/")[0];
      if (deckSet.has(first)) return { kind: "deck", slug: first };
      pathPart = pathPart.slice(1);
    }
    const deck = deckOf(pathPart);
    if (deck) return { kind: "deck", slug: deck };
    for (const candidate of [joinPath(dirOf(from), pathPart), joinPath("", pathPart)]) {
      if (!candidate) continue;
      const hit = byPath.get(candidate.toLowerCase()) ?? byPath.get(`${candidate.toLowerCase()}.md`);
      if (hit) return { kind: "note", path: hit, heading };
    }
    if (IMAGE_FILE.test(pathPart)) return { kind: "file", path: joinPath(dirOf(from), pathPart) ?? pathPart };
    if (/\.md$/i.test(pathPart)) return { kind: "missing", target: pathPart };
    return { kind: "file", path: joinPath(dirOf(from), pathPart) ?? pathPart };
  };

  return { wiki, url };
}

/* ── Grupperna (färgerna i grafen och mapparna i listan) ─────────────────── */

/** Mappen som avgör färgen: översta mappen, men wikins undermappar var för sig. */
export function groupOf(path: string): string {
  const segments = path.split("/");
  if (segments.length === 1) return "";
  if (segments[0] === "wiki" && segments.length >= 3) return `wiki/${segments[1]}`;
  return segments[0];
}

export const DECK_GROUP = "föreläsningar";

const GROUPS: Record<string, { label: string; color: string }> = {
  "wiki/begrepp": { label: "Begrepp", color: "#243cff" },
  "wiki/forskning": { label: "Forskning", color: "#0f8a5f" },
  "wiki/presentationer": { label: "Presentationer", color: "#d0532a" },
  "wiki/blockbank": { label: "Blockbanken", color: "#7c4dff" },
  "wiki/format": { label: "Format", color: "#a15c00" },
  "wiki/personer": { label: "Personer", color: "#c2185b" },
  "wiki/plattformar": { label: "Plattformar", color: "#00838f" },
  wiki: { label: "Wikins startsidor", color: "#4b4a44" },
  teman: { label: "Teman", color: "#5f7d1d" },
  raw: { label: "Råmaterial", color: "#8d6e63" },
  outputs: { label: "Utkast och loggar", color: "#9b978a" },
  presenter: { label: "Presenters dokumentation", color: "#546e7a" },
  "": { label: "Roten", color: "#6d695e" },
  [DECK_GROUP]: { label: "Föreläsningar", color: "#16150f" },
};
const EXTRA_COLORS = ["#1e88e5", "#e65100", "#2e7d32", "#ad1457", "#6a1b9a", "#00695c", "#827717", "#4e342e"];

/** Grupper som grafen inte visar från början: många sidor och få länkar till resten. */
export const QUIET_GROUPS = ["outputs", "raw", "presenter", ""];

export function groupInfo(group: string): { label: string; color: string } {
  const known = GROUPS[group];
  if (known) return known;
  let hash = 0;
  for (const char of group) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { label: group, color: EXTRA_COLORS[hash % EXTRA_COLORS.length] };
}

/** Grupperna i en fast ordning: de kända först, sedan resten i bokstavsordning. */
export function sortGroups(groups: string[]): string[] {
  const order = Object.keys(GROUPS);
  return [...groups].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    return a.localeCompare(b, "sv");
  });
}
