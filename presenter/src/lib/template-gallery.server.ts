import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseMdx, type ParsedComponent } from "./mdx-parser";
import { readLibrary } from "./library.server";
import { templateSchemas } from "./template-schemas";
import { NOT_IN_GALLERY, familyOf, type GalleryExample, type GalleryTemplate } from "./template-gallery";

/**
 * Komponentgalleriets innehåll: alla mallar som används i decken, med riktiga
 * slides som exempel.
 *
 * Exemplen väljs ur föreläsningar som gäller: arkiverade deck och äldre
 * versioner (de utan stjärna) kommer sist, nyare föreläsningar först. För
 * scenregister — StaScene, KulScene … — är varje scenkod en egen komposition,
 * så där blir exemplen en per scenkod i stället för en per föreläsning.
 *
 * Att läsa och tolka hundra deck tar någon sekund. Resultatet sparas i minnet
 * och räknas om först när någon fil i content/ har ändrats.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");
const MAX_EXAMPLES = 8;
const MAX_SCENE_EXAMPLES = 60;
const TEXT_PROPS = ["title", "heading", "headline", "text", "statement", "quote", "question", "claim", "label", "kicker", "eyebrow", "prompt"];

let cache: { stamp: string; templates: GalleryTemplate[] } | null = null;

function plain(raw: unknown): string {
  return typeof raw === "string"
    ? raw
        .replace(/<[^>]+>/g, " ")
        .replace(/[*_`|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

function slideText(slide: ParsedComponent): string {
  for (const key of TEXT_PROPS) {
    const value = plain(slide.props[key]);
    if (value) return value.slice(0, 120);
  }
  return plain(slide.content).slice(0, 120);
}

interface DeckInfo {
  slug: string;
  title: string;
  /** Lägre = bättre källa för exempel. */
  rank: number;
  stamp: string;
  slides: ParsedComponent[];
}

function readDecks(): { decks: DeckInfo[]; stamp: string } {
  const library = readLibrary();
  const files = fs.existsSync(CONTENT_DIR) ? fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx")) : [];
  const stamps: string[] = [];
  const pending: { slug: string; file: string; stamp: string; mtimeMs: number }[] = [];
  for (const file of files) {
    try {
      const stat = fs.statSync(path.join(CONTENT_DIR, file));
      const stamp = `${Math.round(stat.mtimeMs).toString(36)}-${stat.size.toString(36)}`;
      stamps.push(`${file}:${stamp}`);
      pending.push({ slug: file.replace(/\.mdx$/, ""), file, stamp, mtimeMs: stat.mtimeMs });
    } catch {
      // Filen försvann mellan listning och läsning.
    }
  }
  // Biblioteket styr vilka deck som är bra exempelkällor, så det hör till stämpeln.
  const stamp = `${stamps.join("|")}#${JSON.stringify(library.decks)}`;
  if (cache?.stamp === stamp) return { decks: [], stamp };

  const decks: DeckInfo[] = [];
  for (const item of pending) {
    try {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, item.file), "utf-8");
      const { data } = matter(raw);
      const entry = library.decks[item.slug];
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
      // Arkiverat sist, äldre versioner näst sist; däremellan nyast först.
      const penalty = (entry?.archived ? 2_000_000 : 0) + (entry?.family && !entry.current ? 1_000_000 : 0);
      const recency = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date) / 86_400_000 : item.mtimeMs / 86_400_000;
      decks.push({
        slug: item.slug,
        title: typeof data.title === "string" ? data.title : item.slug,
        rank: penalty - recency,
        stamp: item.stamp,
        slides: parseMdx(raw).slides,
      });
    } catch {
      // Ett deck som inte går att tolka ska inte fälla hela galleriet.
    }
  }
  decks.sort((a, b) => a.rank - b.rank);
  return { decks, stamp };
}

interface Tally {
  uses: number;
  decks: Set<string>;
  examples: GalleryExample[];
  scenes: Set<string>;
  perDeck: Map<string, number>;
}

export function getTemplateGallery(): GalleryTemplate[] {
  const { decks, stamp } = readDecks();
  if (cache?.stamp === stamp) return cache.templates;

  const byTag = new Map<string, Tally>();
  for (const deck of decks) {
    deck.slides.forEach((slide, index) => {
      if (NOT_IN_GALLERY.has(slide.tag)) return;
      const entry: Tally = byTag.get(slide.tag) ?? { uses: 0, decks: new Set(), examples: [], scenes: new Set(), perDeck: new Map() };
      byTag.set(slide.tag, entry);
      entry.uses += 1;
      entry.decks.add(deck.slug);

      const scene = typeof slide.props.scene === "string" ? slide.props.scene : undefined;
      const example: GalleryExample = { slug: deck.slug, deckTitle: deck.title, slide: index + 1, text: slideText(slide), scene, stamp: deck.stamp };
      if (scene) {
        // Scenregister: en komposition per scenkod, tagen ur den bästa källan.
        if (entry.scenes.has(scene) || entry.examples.length >= MAX_SCENE_EXAMPLES) return;
        entry.scenes.add(scene);
        entry.examples.push(example);
      } else {
        // Högst två exempel per föreläsning, så att variationen kommer från olika håll.
        const taken = entry.perDeck.get(deck.slug) ?? 0;
        if (taken >= 2 || entry.examples.length >= MAX_EXAMPLES) return;
        entry.perDeck.set(deck.slug, taken + 1);
        entry.examples.push(example);
      }
    });
  }

  const templates: GalleryTemplate[] = [];
  const tags = new Set([...byTag.keys(), ...Object.keys(templateSchemas).filter((tag) => !NOT_IN_GALLERY.has(tag))]);
  for (const tag of tags) {
    const used = byTag.get(tag);
    const schema = templateSchemas[tag];
    templates.push({
      tag,
      family: familyOf(tag),
      description: schema?.description ?? "",
      hasSchema: Boolean(schema),
      uses: used?.uses ?? 0,
      decks: used?.decks.size ?? 0,
      examples: used?.examples ?? [],
    });
  }
  templates.sort((a, b) => b.decks - a.decks || b.uses - a.uses || a.tag.localeCompare(b.tag));
  cache = { stamp, templates };
  return templates;
}
