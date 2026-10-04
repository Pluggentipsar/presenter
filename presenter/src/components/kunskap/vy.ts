import { DECK_GROUP, groupInfo } from "@/lib/kunskap/lankar";
import type { DeckInfo, NoteInfo, VaultIndex } from "@/lib/kunskap/typer";
import type { GraphNode } from "./Graph";

/** Gemensamt för Kunskapsbankens vyer (2 oktober 2026): adresser, mappar, grafens data. */

export function noteHref(path: string, heading?: string, edit = false): string {
  const params = new URLSearchParams({ sida: path });
  if (edit) params.set("redigera", "1");
  return `/kunskap?${params}${heading ? `#${encodeURIComponent(heading)}` : ""}`;
}

/** Mapparna ovanför en sida: "wiki/begrepp/agens.md" → ["wiki", "wiki/begrepp"]. */
export function ancestors(path: string | null): string[] {
  if (!path) return [];
  const parts = path.split("/").slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}

export function formatDate(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `i dag ${date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export const deckNodeId = (slug: string) => `deck:${slug}`;

export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Privat läge eller full lagring: valet gäller ändå för besöket.
  }
}

/** Länkar åt båda hållen: vilka sidor som länkar till en sida. */
export function backlinksOf(index: VaultIndex | null): Map<string, NoteInfo[]> {
  const map = new Map<string, NoteInfo[]>();
  for (const note of index?.notes ?? []) {
    for (const target of note.links) {
      const list = map.get(target);
      if (list) list.push(note);
      else map.set(target, [note]);
    }
  }
  return map;
}

const noteNode = (note: NoteInfo): GraphNode => ({ id: note.path, label: note.title, color: groupInfo(note.group).color, kind: "note" });
const deckNode = (deck: DeckInfo): GraphNode => ({ id: deckNodeId(deck.slug), label: deck.title, color: groupInfo(DECK_GROUP).color, kind: "deck" });

/** Hela grafen: de grupper som syns, föreläsningarna om de syns, ensamma noder bara på begäran. */
export function wholeGraph(index: VaultIndex, hidden: Set<string>, orphans: boolean): { nodes: GraphNode[]; edges: [string, string][] } {
  const notes = index.notes.filter(note => !hidden.has(note.group));
  const visible = new Set(notes.map(note => note.path));
  const showDecks = !hidden.has(DECK_GROUP);
  const edges: [string, string][] = [];
  const degree = new Map<string, number>();
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const note of notes) {
    for (const target of note.links) {
      if (!visible.has(target)) continue;
      edges.push([note.path, target]);
      bump(note.path);
      bump(target);
    }
    if (showDecks) {
      for (const slug of note.decks) {
        edges.push([note.path, deckNodeId(slug)]);
        bump(note.path);
        bump(deckNodeId(slug));
      }
    }
  }
  const nodes: GraphNode[] = notes.filter(note => orphans || degree.has(note.path)).map(noteNode);
  if (showDecks) for (const deck of index.decks) if (orphans || degree.has(deckNodeId(deck.slug))) nodes.push(deckNode(deck));
  return { nodes, edges };
}

/** Grannskapet runt en sida: länkar åt båda hållen och föreläsningar, ett eller två steg ut. */
export function neighbourhood(index: VaultIndex, backlinks: Map<string, NoteInfo[]>, center: string, depth: number, limit = 140): { nodes: GraphNode[]; edges: [string, string][] } {
  const notes = new Map(index.notes.map(note => [note.path, note]));
  const decks = new Map(index.decks.map(deck => [deck.slug, deck]));
  const included = new Set<string>([center]);
  let frontier = [center];
  for (let level = 0; level < depth && frontier.length; level++) {
    const next: string[] = [];
    for (const id of frontier) {
      if (id.startsWith("deck:")) continue;
      const note = notes.get(id);
      const around = [...(note?.links ?? []), ...(backlinks.get(id) ?? []).map(source => source.path), ...(note?.decks ?? []).filter(slug => decks.has(slug)).map(deckNodeId)];
      for (const other of around) {
        if (included.size >= limit) break;
        if (included.has(other)) continue;
        included.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  const nodes: GraphNode[] = [];
  for (const id of included) {
    if (id.startsWith("deck:")) {
      const deck = decks.get(id.slice(5));
      if (deck) nodes.push(deckNode(deck));
    } else {
      const note = notes.get(id);
      if (note) nodes.push(noteNode(note));
    }
  }
  const edges: [string, string][] = [];
  for (const id of included) {
    const note = notes.get(id);
    if (!note) continue;
    for (const target of note.links) if (included.has(target)) edges.push([id, target]);
    for (const slug of note.decks) if (included.has(deckNodeId(slug))) edges.push([id, deckNodeId(slug)]);
  }
  return { nodes, edges };
}

/** Ett giltigt filnamn för en ny sida (Windows tål inte <>:"/\|?*). */
export function cleanName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 120);
}
