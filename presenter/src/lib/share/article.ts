import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { extractNotes } from "@/lib/extract-notes";
import { OVERLAY_TAGS } from "@/lib/mdx-parser";
import type { StepTarget } from "./stage-protocol";

/**
 * Delningspaketets lästext.
 *
 * Lästexten till en föreläsning ligger i `content/las/<slug>.md` — ett vanligt
 * markdown-dokument bredvid decket, aldrig inne i deckets MDX. Då kan R-editorn
 * inte skriva sönder den, decket är orört inför ett framträdande, och vilken
 * AI/harness som helst kan skriva filen utan att känna till mallregistret.
 *
 * Formatet (fullständig beskrivning: presenter/docs/DELNINGSPAKET.md):
 *
 *   ---
 *   title: …            valfri, annars deckets title
 *   kicker: …           rad ovanför titeln på landningssidan
 *   intro: …            publik ingress (deckets description är ofta intern)
 *   hero: <slideId>     sliden som blir levande hero, default första
 *   heroStep: sist      klicksteg för hero (1-baserat eller "sist")
 *   endNote: …          valfri rad sist i läsläget
 *   links:              valfria länkar på landningssidan (label + href)
 *   ---
 *
 *   # Kapitelrubrik
 *
 *   @slide <slideId>            visa sliden i första klickläget
 *   Stycke …
 *
 *   @slide <slideId> steg=2     samma slide, andra klickläget
 *   Stycke …
 *
 * Steg skrivs 1-baserat, precis som i Joels Notes ("STEG: 1. … 2. …").
 */

const ARTICLE_DIR = path.join(process.cwd(), "content", "las");

export type { StepTarget };

export type ReadNode =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] };

export interface ReadBlock {
  id: string;
  chapter: number;
  slideId: string;
  /** 0-baserat index i deckets slidelista (samma ordning som visaren). */
  slideIndex: number;
  /** 0-baserat klicksteg, eller "last". */
  step: StepTarget;
  nodes: ReadNode[];
}

export interface ReadChapter {
  id: string;
  title: string;
  minutes: number;
  firstBlock: number;
}

export interface ShareLink {
  label: string;
  href: string;
}

export interface ShareArticle {
  slug: string;
  title: string;
  kicker?: string;
  intro?: string;
  /** Rad sist i läsläget, t.ex. att lästexten är ett utkast eller fortsätter. */
  endNote?: string;
  hero: { slideIndex: number; step: StepTarget };
  links: ShareLink[];
  /** Optional resource hub; ordinary decks keep their /dela landing page. */
  home?: ShareLink;
  chapters: ReadChapter[];
  blocks: ReadBlock[];
  minutes: number;
  /** Fel i lästexten (okända slideId m.m.). Visas bara utanför produktion. */
  warnings: string[];
}

const WORDS_PER_MINUTE = 200;

export function hasArticle(slug: string): boolean {
  return fs.existsSync(path.join(ARTICLE_DIR, `${slug}.md`));
}

/** slideId → index, i samma ordning som visarens slidelista. */
export function slideIdIndex(deckSource: string): Map<string, number> {
  const { content } = extractNotes(deckSource);
  const lines = content.split("\n");
  const starts: { tag: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^<([A-Z][A-Za-z0-9]*)/.exec(lines[i]);
    if (match) starts.push({ tag: match[1], line: i });
  }
  const ids = new Map<string, number>();
  let index = 0;
  for (let k = 0; k < starts.length; k++) {
    const { tag, line } = starts[k];
    // Overlays (FloatingImage m.fl.) hör till föregående slide — samma regel
    // som extractSlideMetas, annars glider indexen isär.
    if (OVERLAY_TAGS.has(tag) && index > 0) continue;
    const end = (starts[k + 1]?.line ?? lines.length) - 1;
    const block = lines.slice(line, end + 1).join("\n");
    const id = /\sslideId="([^"]+)"/.exec(block)?.[1];
    if (id) ids.set(id, index);
    index++;
  }
  return ids;
}

function parseStep(raw: string | undefined): StepTarget {
  if (!raw) return 0;
  if (/^(sist|last)$/i.test(raw)) return "last";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : 0;
}

function countWords(nodes: ReadNode[]): number {
  let words = 0;
  for (const node of nodes) {
    const text = node.type === "list" ? node.items.join(" ") : node.text;
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return words;
}

function parseNodes(lines: string[]): ReadNode[] {
  const nodes: ReadNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    if (paragraph.length) nodes.push({ type: "p", text: paragraph.join(" ") });
    if (list.length) nodes.push({ type: "list", items: list });
    if (quote.length) nodes.push({ type: "quote", text: quote.join(" ") });
    paragraph = [];
    list = [];
    quote = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      nodes.push({ type: "h", text: line.slice(3).trim() });
    } else if (line.startsWith("> ")) {
      if (paragraph.length || list.length) flush();
      quote.push(line.slice(2).trim());
    } else if (/^[-*] /.test(line)) {
      if (paragraph.length || quote.length) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length || quote.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return nodes;
}

export function getArticle(slug: string, deckSource: string, deckTitle: string): ShareArticle | null {
  const filePath = path.join(ARTICLE_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const { data, content } = matter(fs.readFileSync(filePath, "utf-8"));
  const ids = slideIdIndex(deckSource);
  const warnings: string[] = [];

  const chapters: ReadChapter[] = [];
  const blocks: ReadBlock[] = [];
  let anchor: { slideId: string; slideIndex: number; step: StepTarget } | null = null;
  let buffer: string[] = [];

  const flushBlock = () => {
    const nodes = parseNodes(buffer);
    buffer = [];
    if (nodes.length === 0) return;
    if (!anchor) {
      warnings.push(`Text före första @slide ignoreras: "${countWords(nodes)} ord".`);
      return;
    }
    if (chapters.length === 0) {
      chapters.push({ id: "kapitel-1", title: "Inledning", minutes: 0, firstBlock: 0 });
    }
    blocks.push({
      id: `b-${blocks.length + 1}`,
      chapter: chapters.length - 1,
      ...anchor,
      nodes,
    });
  };

  for (const line of content.split("\n")) {
    const chapter = /^# (.+)$/.exec(line.trim());
    const slide = /^@slide\s+(\S+)(?:\s+steg=(\S+))?\s*$/.exec(line.trim());
    if (chapter) {
      flushBlock();
      chapters.push({
        id: `kapitel-${chapters.length + 1}`,
        title: chapter[1].trim(),
        minutes: 0,
        firstBlock: blocks.length,
      });
    } else if (slide) {
      flushBlock();
      const slideIndex = ids.get(slide[1]);
      if (slideIndex === undefined) {
        warnings.push(`Okänt slideId i lästexten: ${slide[1]}`);
        anchor = null;
      } else {
        anchor = { slideId: slide[1], slideIndex, step: parseStep(slide[2]) };
      }
    } else {
      buffer.push(line);
    }
  }
  flushBlock();

  let totalWords = 0;
  chapters.forEach((chapter, i) => {
    const words = blocks
      .filter((block) => block.chapter === i)
      .reduce((sum, block) => sum + countWords(block.nodes), 0);
    totalWords += words;
    chapter.minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  });

  const heroId = typeof data.hero === "string" ? data.hero : undefined;
  const heroIndex = heroId ? ids.get(heroId) : 0;
  if (heroId && heroIndex === undefined) warnings.push(`Okänt slideId för hero: ${heroId}`);

  const links: ShareLink[] = Array.isArray(data.links)
    ? data.links
        .filter((l: unknown): l is ShareLink =>
          !!l && typeof l === "object" && "label" in l && "href" in l)
        .map((l: ShareLink) => ({ label: String(l.label), href: String(l.href) }))
    : [];

  return {
    slug,
    title: typeof data.title === "string" ? data.title : deckTitle,
    kicker: typeof data.kicker === "string" ? data.kicker : undefined,
    intro: typeof data.intro === "string" ? data.intro.trim() : undefined,
    endNote: typeof data.endNote === "string" ? data.endNote.trim() : undefined,
    hero: {
      slideIndex: heroIndex ?? 0,
      step: parseStep(data.heroStep === undefined ? undefined : String(data.heroStep)),
    },
    links,
    home: data.home && typeof data.home.label === "string" && typeof data.home.href === "string"
      && /^(\/(?!\/)|https?:\/\/)/.test(data.home.href)
      ? { label: data.home.label, href: data.home.href } : undefined,
    chapters,
    blocks,
    minutes: Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE)),
    warnings,
  };
}
