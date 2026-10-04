"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import type { ParsedComponent, ParsedPresentation } from "./mdx-parser";
import { parseMdx, serializeMdx } from "./mdx-parser";
import type { SlideEditField } from "./types";
import {
  cloneSlideWithFreshId,
  ensureParsedSlideIds,
  ensureStableParsedSlideIds,
} from "./slide-ids";
import { createDeckRevision } from "./deck-revision.server";
import { writeFileAtomic } from "./atomic-write";

const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Läs valda källslides till authoring-klienten utan att mutera målfiler.
 *
 * Importen blir då en vanlig lokal deck-operation som går genom samma
 * autosave, historik och revisionsskydd som övriga ändringar.
 */
export async function loadSlidesForAuthoring(
  selections: { slug: string; slideIndex1Based: number }[],
): Promise<{ ok: boolean; slides?: ParsedComponent[]; error?: string }> {
  try {
    if (!Array.isArray(selections) || selections.length === 0) {
      return { ok: false, error: "Inga slides valda" };
    }

    const slides: ParsedComponent[] = [];
    for (const selection of selections) {
      if (!/^[a-zA-Z0-9_-]+$/.test(selection.slug)) {
        return { ok: false, error: "Ogiltig källpresentation" };
      }
      const sourcePath = path.join(CONTENT_DIR, `${selection.slug}.mdx`);
      if (!fs.existsSync(sourcePath)) {
        return {
          ok: false,
          error: `Källpresentationen ${selection.slug} finns inte`,
        };
      }
      const source = parseMdx(fs.readFileSync(sourcePath, "utf-8"));
      const slide = source.slides[selection.slideIndex1Based - 1];
      if (!slide) {
        return {
          ok: false,
          error: `Slide ${selection.slideIndex1Based} finns inte i ${selection.slug}`,
        };
      }
      slides.push(cloneSlideWithFreshId(slide));
    }
    return { ok: true, slides };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Okänt fel",
    };
  }
}

/**
 * Server action: skriv tillbaka en redigerad presentation till disk.
 * Revaliderar både presentation-route och edit-route.
 */
export async function savePresentation(
  slug: string,
  parsed: ParsedPresentation,
  expectedRevision?: string,
): Promise<{
  ok: boolean;
  revision?: string;
  conflict?: boolean;
  currentRevision?: string;
  currentParsed?: ParsedPresentation;
  error?: string;
}> {
  try {
    // Validera slug - bara enkla filnamnstecken
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const currentSource = fs.readFileSync(filePath, "utf-8");
    const currentRevision = createDeckRevision(currentSource);
    if (expectedRevision && expectedRevision !== currentRevision) {
      const currentParsed = parseMdx(currentSource);
      ensureStableParsedSlideIds(currentParsed, currentSource);
      return {
        ok: false,
        conflict: true,
        currentRevision,
        currentParsed,
        error:
          "Presentationen har ändrats utanför den här editorsessionen.",
      };
    }

    ensureParsedSlideIds(parsed);
    const serialized = serializeMdx(parsed);
    const revision = createDeckRevision(serialized);
    if (serialized === currentSource) {
      return { ok: true, revision };
    }
    writeFileAtomic(filePath, serialized);

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true, revision };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

/**
 * Server action: uppdatera en specifik prop på en specifik slide.
 *
 * Används av M-mode (presenter-vyn) för snabba edits utan att gå in i
 * editor-vyn. Tomt värde tar bort propet helt.
 */
export async function updateSlideProp(
  slug: string,
  slideIndex: number,
  propName: string,
  value: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(propName)) {
      return { ok: false, error: "Ogiltigt prop-namn" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);

    if (slideIndex < 0 || slideIndex >= parsed.slides.length) {
      return { ok: false, error: "Slide-index utanför range" };
    }

    const slide = parsed.slides[slideIndex];
    const newProps = { ...slide.props };
    if (value === "") {
      delete newProps[propName];
    } else {
      newProps[propName] = value;
    }

    parsed.slides[slideIndex] = { ...slide, props: newProps };

    ensureParsedSlideIds(parsed);
    const serialized = serializeMdx(parsed);
    writeFileAtomic(filePath, serialized);

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

/**
 * Server action: flytta en slide från en position till en annan.
 *
 * Används av M-mode (presenter-vyn) för drag-and-drop i navigations-menyn.
 * Splice ut sliden från fromIndex och stoppa in den på toIndex.
 */
export async function reorderSlides(
  slug: string,
  fromIndex: number,
  toIndex: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);

    if (fromIndex < 0 || fromIndex >= parsed.slides.length) {
      return { ok: false, error: "from-index utanför range" };
    }
    if (toIndex < 0 || toIndex >= parsed.slides.length) {
      return { ok: false, error: "to-index utanför range" };
    }
    if (fromIndex === toIndex) {
      return { ok: true };
    }

    const slides = [...parsed.slides];
    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);
    parsed.slides = slides;

    ensureParsedSlideIds(parsed);
    const serialized = serializeMdx(parsed);
    writeFileAtomic(filePath, serialized);

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

/**
 * Server action: sätt en helt ny slide-ordning.
 *
 * `order` är en permutation av 0..N-1 där order[nyPosition] = gammaltIndex.
 * Ett enda anrop hanterar både enkel- och fler-slide-omflyttning — klienten
 * räknar ut permutationen.
 *
 * Remappar samtidigt frontmatter-fält som är knutna till slide-position:
 * `hiddenSlides` (array av 1-indexerade nr), `sliderEffects` och
 * `slideGradients` (maps med 1-indexerade string-nycklar). Utan detta
 * skulle effekter/dolda slides "fastna" på position och hamna fel.
 */
export async function reorderSlidesToOrder(
  slug: string,
  order: number[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);
    const n = parsed.slides.length;

    // Validera att order är en exakt permutation av 0..n-1
    if (!Array.isArray(order) || order.length !== n) {
      return { ok: false, error: "Ordningen matchar inte antalet slides" };
    }
    const seen = new Array(n).fill(false);
    for (const idx of order) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= n || seen[idx]) {
        return { ok: false, error: "Ogiltig slide-ordning" };
      }
      seen[idx] = true;
    }

    // Identitet → ingen förändring, hoppa över skrivning
    if (order.every((v, i) => v === i)) {
      return { ok: true };
    }

    // gammaltIndex (0-bas) → nyttIndex (0-bas)
    const oldToNew = new Map<number, number>();
    order.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

    parsed.slides = order.map((i) => parsed.slides[i]);

    // Remappa frontmatter-fält som är position-knutna
    const fm = parsed.frontmatter;

    // hiddenSlides: array av 1-indexerade nummer
    if (Array.isArray(fm.hiddenSlides)) {
      const remapped = fm.hiddenSlides
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0)
        .map((v) => oldToNew.get(v - 1))
        .filter((v): v is number => v != null)
        .map((v) => v + 1)
        .sort((a, b) => a - b);
      if (remapped.length > 0) fm.hiddenSlides = remapped;
      else delete fm.hiddenSlides;
    }

    // sliderEffects + slideGradients + slideAccents + slideTextColors:
    // maps med 1-indexerade string-nycklar — flytta med när slide ändrar plats.
    const remapSlideMap = (key: "sliderEffects" | "slideGradients" | "slideAccents" | "slideTextColors" | "slideMutedColors") => {
      const raw = fm[key];
      if (!raw || typeof raw !== "object") return;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const oldNum = parseInt(k, 10);
        if (!Number.isFinite(oldNum)) continue;
        const newIdx = oldToNew.get(oldNum - 1);
        if (newIdx == null) continue;
        out[String(newIdx + 1)] = v;
      }
      if (Object.keys(out).length > 0) fm[key] = out;
      else delete fm[key];
    };
    remapSlideMap("sliderEffects");
    remapSlideMap("slideGradients");
    remapSlideMap("slideAccents");
    remapSlideMap("slideTextColors");
    remapSlideMap("slideMutedColors");

    const serialized = serializeMdx(parsed);
    writeFileAtomic(filePath, serialized);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

/**
 * Server action: skriv tillbaka presentationens versioner/cuts (frontmatter).
 * Klienten skickar hela den uppdaterade listan. Tom lista → ta bort `cuts`.
 * Membership per slide hanteras separat via updateSlideProp("cutSkip", …).
 */
export async function updatePresentationCuts(
  slug: string,
  cuts: { id: string; name: string }[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);

    const seen = new Set<string>();
    const clean = (Array.isArray(cuts) ? cuts : [])
      .map((c) => ({
        id: String(c?.id ?? "").trim(),
        name: String(c?.name ?? "").trim(),
      }))
      .filter((c) => /^[a-zA-Z0-9_-]+$/.test(c.id))
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .map((c) => ({ id: c.id, name: c.name || c.id }));

    if (clean.length > 0) {
      parsed.frontmatter.cuts = clean;
    } else {
      delete parsed.frontmatter.cuts;
    }

    ensureParsedSlideIds(parsed);
    const serialized = serializeMdx(parsed);
    writeFileAtomic(filePath, serialized);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

/* ── Snabb-redigering av slide-text (M-läget) ─────────────────────────── */

/** Prop-namn som är konfiguration — inte redigerbar löptext. */
const NON_TEXT_PROPS = new Set([
  "slideId",
  "background", "src", "image", "images", "video", "audio", "poster",
  "href", "url", "logo", "icon", "avatar", "accent", "color", "bg",
  "overlay", "overlayMode", "mode", "align", "size", "layout", "variant",
  "position", "theme", "kind", "font", "ratio", "cover", "fit", "anchor",
  "foregroundImage", "bgImage", "leftImage", "rightImage",
]);

/** Snyggare svenska etiketter för vanliga text-props. */
const PROP_LABELS: Record<string, string> = {
  title: "Rubrik",
  subtitle: "Underrubrik",
  eyebrow: "Överrad",
  kicker: "Kicker",
  chapter: "Kapitel",
  question: "Fråga",
  prompt: "Prompt",
  caption: "Bildtext",
  attribution: "Källa",
  closer: "Avslutning",
  bottomLine: "Sluttext",
  label: "Etikett",
  sender: "Avsändare",
  author: "Författare",
  event: "Tillfälle",
  date: "Datum",
  text: "Text",
  name: "Namn",
};

/** Prop-namn vars ändelse avslöjar att det är konfiguration, inte text. */
const CONFIG_SUFFIX =
  /(?:size|colou?r|mode|image|video|audio|url|src|width|height|speed|delay|duration|opacity|ratio|variant|layout|position|icon|logo|align)$/i;

/** Värden som ser ut som sökväg/URL/färgkod räknas inte som löptext. */
function looksLikeCodeOrPath(v: string): boolean {
  const t = v.trim();
  if (t === "") return true;
  return /^(\/|https?:|#[0-9a-fA-F]{3,8}$|data:|mailto:)/.test(t);
}

/** Plocka ut redigerbara textfält ur en komponent (props + ev. content). */
function fieldsFromComponent(
  comp: ParsedComponent,
  prefix: string,
  groupLabel: string | null,
): SlideEditField[] {
  const out: SlideEditField[] = [];
  for (const [k, v] of Object.entries(comp.props)) {
    if (typeof v !== "string") continue;
    if (NON_TEXT_PROPS.has(k)) continue;
    if (CONFIG_SUFFIX.test(k)) continue;
    if (looksLikeCodeOrPath(v)) continue;
    const base = PROP_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
    out.push({
      path: `${prefix}prop:${k}`,
      label: groupLabel ? `${groupLabel} · ${base}` : base,
      value: v,
      multiline: v.length > 70 || v.includes("\n"),
    });
  }
  // content serialiseras bara när komponenten saknar barn-komponenter
  // (annars vinner children och content ignoreras vid serialisering).
  if (comp.children.length === 0 && comp.content && comp.content.trim()) {
    out.push({
      path: `${prefix}content`,
      label: groupLabel ? `${groupLabel} · text` : "Innehåll",
      value: comp.content,
      multiline: true,
    });
  }
  return out;
}

/**
 * Server action: läs ut alla redigerbara textfält på en slide (1-indexerat).
 * Används av snabb-redigeraren i M-läget. Inkluderar slidens egna props +
 * content, samt ett led av barn-komponenter (Timeline-events m.fl.).
 */
export async function getSlideEditFields(
  slug: string,
  slideIndex1Based: number,
): Promise<{
  ok: boolean;
  fields?: SlideEditField[];
  templateName?: string;
  error?: string;
}> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);
    const idx = slideIndex1Based - 1;
    if (idx < 0 || idx >= parsed.slides.length) {
      return { ok: false, error: "Slide finns inte" };
    }
    const slide = parsed.slides[idx];
    const fields = fieldsFromComponent(slide, "", null);
    slide.children.forEach((child, i) => {
      fields.push(...fieldsFromComponent(child, `child:${i}:`, `Block ${i + 1}`));
    });
    return { ok: true, fields, templateName: slide.tag };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Server action: skriv tillbaka redigerade textfält på en slide.
 * `values` innehåller path → nytt värde (paths från getSlideEditFields).
 */
export async function updateSlideFields(
  slug: string,
  slideIndex1Based: number,
  values: { path: string; value: string }[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { ok: false, error: "Ogiltig slug" };
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdx(source);
    const idx = slideIndex1Based - 1;
    if (idx < 0 || idx >= parsed.slides.length) {
      return { ok: false, error: "Slide finns inte" };
    }
    const slide = parsed.slides[idx];

    for (const { path: fieldPath, value } of values) {
      // Stödda paths: prop:NAME | content | child:I:prop:NAME | child:I:content
      let target: ParsedComponent = slide;
      let rest = fieldPath;
      const childMatch = /^child:(\d+):(.+)$/.exec(fieldPath);
      if (childMatch) {
        const ci = parseInt(childMatch[1], 10);
        if (!Number.isFinite(ci) || ci < 0 || ci >= slide.children.length) {
          continue;
        }
        target = slide.children[ci];
        rest = childMatch[2];
      }
      if (rest === "content") {
        // content ligger mellan taggarna — radbrytningar är OK.
        target.content = value;
      } else {
        const propMatch = /^prop:([A-Za-z_][A-Za-z0-9_]*)$/.exec(rest);
        if (propMatch) {
          // Props är enradiga attribut — kollapsa ev. radbrytningar.
          target.props[propMatch[1]] = value.replace(/\r?\n/g, " ");
        }
      }
    }

    ensureParsedSlideIds(parsed);
    const serialized = serializeMdx(parsed);
    writeFileAtomic(filePath, serialized);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}
