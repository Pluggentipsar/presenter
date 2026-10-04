import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getLibraryDecks } from "@/lib/library.server";
import { renameWithRetrySync } from "@/lib/recording/rename.server";
import { extractLinks, groupOf, IMAGE_FILE, makeResolver, readWikilink, splitFrontmatter, stemOf, wikilinkPattern, type WikiLink } from "./lankar";
import type { DeckInfo, NoteInfo, NotePage, SearchHit, VaultIndex } from "./typer";

/**
 * Kunskapsbanken (2 oktober 2026): läser föreläsningsmappens markdown, samma filer som Obsidian
 * visar som valv. Servern bygger ett index (titlar, taggar, länkar, föreläsningar) för listan och
 * grafen, söker i texten och läser och skriver enskilda sidor. Se docs/KUNSKAPSBANKEN.md.
 *
 * Valvet är mappen ovanför presenter/ (repot), eller den mapp som PRESENTER_VALV pekar ut. Mappar
 * som börjar med punkt (.git, .obsidian, .claude …) och node_modules hoppas över, som i Obsidian.
 * Bara i den lokala verkstaden: en publik värd visar aldrig wikin.
 */

export function kunskapEnabled(): boolean {
  return !(Boolean(process.env.VERCEL) || process.env.PRESENTER_PUBLIC === "1" || process.env.PRESENTER_READONLY === "1");
}

export function vaultRoot(): string {
  return path.resolve(process.env.PRESENTER_VALV || path.join(process.cwd(), ".."));
}

const skipDir = (name: string) => name.startsWith(".") || name === "node_modules";

/* ── Sökvägar som får läsas och skrivas ───────────────────────────────────── */

/** En säker sökväg i valvet: ingen punktmapp, inget ..; null om den inte duger. */
export function safePath(rel: string | null, kind: "note" | "file"): string | null {
  if (!rel) return null;
  const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = clean.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === ".." || skipDir(segment))) return null;
  if (kind === "note" ? !/\.md$/i.test(clean) : !IMAGE_FILE.test(clean)) return null;
  const root = vaultRoot();
  const abs = path.resolve(root, clean);
  return abs.startsWith(root + path.sep) ? clean : null;
}

const absolute = (rel: string) => path.join(vaultRoot(), ...rel.split("/"));
const hashOf = (content: Buffer | string) => crypto.createHash("sha1").update(content).digest("hex").slice(0, 16);

/* ── Läsningen av en sida ─────────────────────────────────────────────────── */

const str = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str).filter(Boolean) : str(value) ? str(value).split(/[,\s]+/).filter(Boolean) : [];

/** Frontmattern som vanliga värden: datum som text, inga funktioner, högst fem nivåer. */
function plain(value: unknown, depth = 0): unknown {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().replace(/T00:00:00\.000Z$/, "");
  if (Array.isArray(value)) return depth > 4 ? [] : value.map(item => plain(item, depth + 1));
  if (value && typeof value === "object") return depth > 4 ? {} : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item, depth + 1)]));
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function frontmatterData(text: string, frontmatter: string): Record<string, unknown> {
  if (!frontmatter.trim()) return {};
  try {
    // Med ett options-objekt sparar gray-matter inget i sin egen cache.
    return (plain(matter(text, {}).data) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Rubrikens text utan markdown: [[mål|visas]] blir visas, **fet** blir fet. */
function cleanInline(text: string): string {
  return text
    .replace(wikilinkPattern(), (_all, _bang, target: string, _heading, alias?: string) => alias?.trim() || target.split("/").pop() || "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

function firstHeading(body: string): string {
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^\s{0,3}(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const match = line.match(/^#\s+(.+)$/);
    if (match) return cleanInline(match[1]);
  }
  return "";
}

/** Nycklar vars värden aldrig är länkar (de skulle annars kunna råka heta som en sida eller ett deck). */
const NOT_LINKS = new Set(["tags", "tag", "aliases", "alias", "status", "typ", "tema", "malgrupp", "kategori", "event", "titel", "title", "tes", "skapad", "uppdaterad", "datum", "granskad"]);

interface Parsed {
  title: string;
  tags: string[];
  body: string;
  /** Texten med gemener, för sökningen (samma längd som body). */
  lower: string;
  wiki: WikiLink[];
  urls: string[];
  /** Begrepp i frontmattern (nyckelkoncept): blir länkar bara om sidan finns. */
  soft: string[];
  /** Sökvägar i frontmattern (talmanus, mdx_kalla) och temats README. */
  paths: string[];
  /** Ord i frontmattern som kan vara ett decks slug (slug, kalla.deck, finns_ocksa_i, versioner …). */
  deckWords: string[];
}

function parseNote(rel: string, raw: string): Parsed {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const { frontmatter, body } = splitFrontmatter(text);
  const data = frontmatterData(text, frontmatter);
  const tags = [...new Set([...listOf(data.tags), ...listOf(data.tag)].map(tag => tag.replace(/^#/, "")).filter(Boolean))];
  const title = str(data.title) || str(data.titel) || firstHeading(body) || stemOf(rel);
  const { wiki, urls } = extractLinks(body);
  // Wikilänkar i frontmattern räknas också, som i Obsidian.
  for (const match of frontmatter.matchAll(wikilinkPattern())) wiki.push(readWikilink(match));
  const soft = [...listOf(data.nyckelkoncept), ...listOf(data.begrepp)];
  const paths: string[] = [];
  const deckWords: string[] = [];
  const temaMapp = str(data.tema_mapp);
  if (temaMapp) paths.push(`teman/${temaMapp}/README.md`);
  const visit = (value: unknown, key: string, depth: number) => {
    if (depth > 4 || NOT_LINKS.has(key)) return;
    if (Array.isArray(value)) return value.forEach(item => visit(item, key, depth + 1));
    if (value && typeof value === "object") return Object.entries(value).forEach(([child, item]) => visit(item, child, depth + 1));
    const value_ = str(value);
    if (!value_) return;
    if (/\.mdx?$/i.test(value_) && !/\s/.test(value_)) paths.push(value_);
    const word = value_.split(/\s+·\s+|\s+/)[0];
    if (/^[a-z0-9][a-z0-9_-]{2,}$/.test(word)) deckWords.push(word);
  };
  for (const [key, value] of Object.entries(data)) visit(value, key, 0);
  return { title, tags, body, lower: body.toLocaleLowerCase("sv"), wiki, urls, soft, paths, deckWords };
}

/* ── Indexet ──────────────────────────────────────────────────────────────── */

const parsedCache = new Map<string, { mtimeMs: number; size: number; value: Parsed }>();
let indexMemo: { at: number; value: VaultIndex } | null = null;
let deckMemo: { at: number; value: DeckInfo[] } | null = null;

function walk(root: string): { rel: string; mtimeMs: number; size: number }[] {
  const out: { rel: string; mtimeMs: number; size: number }[] = [];
  const stack = [""];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!skipDir(entry.name)) stack.push(rel);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        try {
          const stat = fs.statSync(path.join(root, rel));
          out.push({ rel, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {
          // Filen försvann mellan listningen och läsningen.
        }
      }
    }
  }
  return out;
}

function decks(): DeckInfo[] {
  if (deckMemo && Date.now() - deckMemo.at < 20_000) return deckMemo.value;
  let value: DeckInfo[] = [];
  try {
    value = getLibraryDecks().map(deck => ({ slug: deck.slug, title: deck.title, event: deck.event, date: deck.date, coverSlide: deck.coverSlide, coverHash: deck.coverHash }));
  } catch {
    // Utan decken blir det bara wikin.
  }
  deckMemo = { at: Date.now(), value };
  return value;
}

function parsedFor(file: { rel: string; mtimeMs: number; size: number }): Parsed | null {
  const cached = parsedCache.get(file.rel);
  if (cached && cached.mtimeMs === file.mtimeMs && cached.size === file.size) return cached.value;
  try {
    const value = parseNote(file.rel, fs.readFileSync(absolute(file.rel), "utf8"));
    parsedCache.set(file.rel, { mtimeMs: file.mtimeMs, size: file.size, value });
    return value;
  } catch {
    return null;
  }
}

/** Alla sidor med titel, taggar och länkar, och alla föreläsningar. Byggs om högst varannan sekund. */
export function vaultIndex(): VaultIndex {
  if (indexMemo && Date.now() - indexMemo.at < 2000) return indexMemo.value;
  const root = vaultRoot();
  const files = walk(root).sort((a, b) => a.rel.localeCompare(b.rel, "sv"));
  const seen = new Set(files.map(file => file.rel));
  for (const key of parsedCache.keys()) if (!seen.has(key)) parsedCache.delete(key);
  const deckList = decks();
  const deckSet = new Set(deckList.map(deck => deck.slug));
  const resolver = makeResolver({ notes: files.map(file => file.rel), decks: [...deckSet] });
  const notes: NoteInfo[] = [];
  for (const file of files) {
    const parsed = parsedFor(file);
    if (!parsed) continue;
    const links = new Set<string>(), deckLinks = new Set<string>(), missing = new Set<string>();
    const take = (resolved: ReturnType<typeof resolver.wiki>, soft = false) => {
      if (resolved.kind === "note") links.add(resolved.path);
      else if (resolved.kind === "deck") deckLinks.add(resolved.slug);
      else if (resolved.kind === "missing" && resolved.target && !soft) missing.add(resolved.target);
    };
    for (const link of parsed.wiki) take(resolver.wiki(file.rel, link));
    for (const url of parsed.urls) take(resolver.url(file.rel, url));
    for (const word of parsed.soft) take(resolver.wiki(file.rel, { target: word }), true);
    for (const value of parsed.paths) take(resolver.url(file.rel, value), true);
    for (const word of parsed.deckWords) if (deckSet.has(word)) deckLinks.add(word);
    // En presentationssida i wikin heter som sitt deck.
    if (deckSet.has(stemOf(file.rel)) && groupOf(file.rel) === "wiki/presentationer") deckLinks.add(stemOf(file.rel));
    links.delete(file.rel);
    notes.push({
      path: file.rel,
      title: parsed.title,
      group: groupOf(file.rel),
      tags: parsed.tags,
      links: [...links],
      decks: [...deckLinks],
      missing: [...missing],
      mtime: Math.round(file.mtimeMs),
      size: file.size,
    });
  }
  const value: VaultIndex = { name: path.basename(root), notes, decks: deckList, newNote: newNoteSetting() };
  indexMemo = { at: Date.now(), value };
  return value;
}

/** Obsidians inställningar (.obsidian/app.json), om valvet har några. */
function obsidianApp(): { attachmentFolderPath?: string; newFileLocation?: string; newFileFolderPath?: string } {
  try {
    return JSON.parse(fs.readFileSync(path.join(vaultRoot(), ".obsidian", "app.json"), "utf8"));
  } catch {
    return {};
  }
}

function newNoteSetting(): VaultIndex["newNote"] {
  const app = obsidianApp();
  const folder = (app.newFileFolderPath ?? "").replace(/^\.?\/+|\/+$/g, "");
  if (app.newFileLocation === "folder" && folder) return { location: "folder", folder };
  return { location: app.newFileLocation === "current" ? "current" : "root", folder: "" };
}

/* ── Sökningen ────────────────────────────────────────────────────────────── */

function snippet(body: string, at: number): string {
  const start = Math.max(0, at - 70);
  const text = body
    .slice(start, at + 130)
    .replace(wikilinkPattern(), (_all, _bang, target: string, _heading, alias?: string) => alias?.trim() || target.split("/").pop() || "")
    .replace(/[#*_`|>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${start > 0 ? "… " : ""}${text}${at + 130 < body.length ? " …" : ""}`;
}

/** Sök i titlar, sökvägar, taggar och text. Alla ord måste finnas någonstans på sidan. */
export function searchVault(query: string, limit = 40): SearchHit[] {
  const terms = query.toLocaleLowerCase("sv").split(/\s+/).filter(term => term.length > 1).slice(0, 6);
  if (!terms.length) return [];
  const index = vaultIndex();
  const hits: SearchHit[] = [];
  for (const note of index.notes) {
    const parsed = parsedCache.get(note.path)?.value;
    if (!parsed) continue;
    const title = note.title.toLocaleLowerCase("sv"), where = note.path.toLocaleLowerCase("sv");
    let score = 0, first = -1, all = true;
    for (const term of terms) {
      const inTitle = title.includes(term), inPath = where.includes(term), inTags = note.tags.some(tag => tag.toLocaleLowerCase("sv").includes(term));
      const at = parsed.lower.indexOf(term);
      if (!inTitle && !inPath && !inTags && at < 0) {
        all = false;
        break;
      }
      const count = at < 0 ? 0 : Math.min(8, parsed.lower.split(term).length - 1);
      score += (inTitle ? 12 : 0) + (inPath ? 4 : 0) + (inTags ? 4 : 0) + count;
      if (at >= 0 && (first < 0 || at < first)) first = at;
    }
    if (!all) continue;
    hits.push({ path: note.path, title: note.title, group: note.group, score, snippet: first >= 0 ? snippet(parsed.body, first) : "" });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "sv")).slice(0, limit);
}

/* ── En sida: läsa och skriva ─────────────────────────────────────────────── */

export function readNote(rel: string): NotePage | null {
  try {
    const abs = absolute(rel);
    const content = fs.readFileSync(abs);
    const text = content.toString("utf8");
    const { frontmatter } = splitFrontmatter(text.replace(/\r\n?/g, "\n"));
    return { path: rel, text, data: frontmatterData(text.replace(/\r\n?/g, "\n"), frontmatter), mtime: Math.round(fs.statSync(abs).mtimeMs), hash: hashOf(content) };
  } catch {
    return null;
  }
}

let tmpCounter = 0;

export type WriteResult =
  | { ok: true; page: NotePage }
  | { ok: false; reason: "konflikt"; page: NotePage }
  | { ok: false; reason: "finns" | "saknas" | "fel"; message: string };

/**
 * Spara en sida. `base` är fingeravtrycket sidan hade när den öppnades: har filen ändrats sedan
 * (i Obsidian eller av en agent) skrivs ingenting, och svaret innehåller den nya versionen.
 * Radbrytningarna följer filens egna (CRLF eller LF). Skrivningen går via en tillfällig fil.
 */
export function writeNote(rel: string, text: string, base: string | null, create: boolean): WriteResult {
  const abs = absolute(rel);
  const exists = fs.existsSync(abs);
  if (create && exists) return { ok: false, reason: "finns", message: "Det finns redan en sida med det namnet." };
  if (!create && !exists) return { ok: false, reason: "saknas", message: "Sidan finns inte längre." };
  let content = text.replace(/\r\n?/g, "\n");
  if (exists) {
    const current = fs.readFileSync(abs);
    if (base !== hashOf(current)) return { ok: false, reason: "konflikt", page: readNote(rel)! };
    if (current.includes("\r\n")) content = content.replace(/\n/g, "\r\n");
  }
  const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.tmp-${process.pid}-${tmpCounter++}`);
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(tmp, content, "utf8");
    renameWithRetrySync(tmp, abs);
  } catch (error) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // Städningen får inte dölja felet.
    }
    return { ok: false, reason: "fel", message: error instanceof Error ? error.message : String(error) };
  }
  indexMemo = null;
  return { ok: true, page: readNote(rel)! };
}

/* ── Bilder ───────────────────────────────────────────────────────────────── */

const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif" };

/** Obsidians mapp för bilagor, där ![[bild.png]] i första hand letas. */
function attachmentFolder(): string {
  return (obsidianApp().attachmentFolderPath ?? "").replace(/^\.?\/+/, "");
}

/** En bild i valvet: en sökväg, eller ett namn (![[bild.png]]) som letas bredvid sidan och bland bilagorna. */
export function findImage(rel: string | null, name: string | null, from: string | null): { file: string; type: string } | null {
  const candidates: (string | null)[] = [];
  if (rel) candidates.push(safePath(rel, "file"));
  if (name && !name.includes("..")) {
    const fromDir = from ? from.split("/").slice(0, -1).join("/") : "";
    const folder = attachmentFolder();
    for (const dir of [fromDir, folder, ""]) candidates.push(safePath(dir ? `${dir}/${name}` : name, "file"));
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const file = absolute(candidate);
    if (fs.existsSync(file)) return { file, type: IMAGE_TYPES[candidate.split(".").pop()!.toLowerCase()] ?? "application/octet-stream" };
  }
  return null;
}
