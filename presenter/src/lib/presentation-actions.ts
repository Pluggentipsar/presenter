"use server";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { extractSlideRaw, parseMdx, serializeMdx } from "./mdx-parser";
import type { ParsedComponent } from "./mdx-parser";
import { extractSlideMetas, type SlideMeta } from "./extract-slide-types";
import { stripNotesBlocks } from "./extract-notes";
import { isValidSlug } from "./slug";
import { writeFileAtomic } from "./atomic-write";
import { AGARE } from "./agare";
import {
  GRADIENT_PRESETS,
  isHexColor,
  normalizeStoredGradient,
} from "./gradient-presets";
import type { SlideGradientValue } from "./types";
import {
  cloneSlideWithFreshId,
  ensureParsedSlideIds,
  replaceOrInsertSlideId,
} from "./slide-ids";
import { createDefaultSlide } from "./template-schemas";

const CONTENT_DIR = path.join(process.cwd(), "content");



function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function uniqueSlug(base: string): string {
  if (!fs.existsSync(path.join(CONTENT_DIR, `${base}.mdx`))) return base;
  let i = 2;
  while (fs.existsSync(path.join(CONTENT_DIR, `${base}-${i}.mdx`))) {
    i++;
  }
  return `${base}-${i}`;
}

/**
 * Duplicera en befintlig presentation → ny fil med "{slug}-kopia.mdx"
 * (eller -kopia-2, -3 om den finns).
 */
export async function duplicatePresentation(
  slug: string
): Promise<{ ok: boolean; newSlug?: string; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    const src = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(src)) return { ok: false, error: "Presentation finns inte" };

    const base = uniqueSlug(`${slug}-kopia`);
    const dst = path.join(CONTENT_DIR, `${base}.mdx`);

    // Läs källan, justera title i frontmatter så kopian går att skilja från original
    const raw = fs.readFileSync(src, "utf-8");
    const adjusted = raw.replace(
      /^(---[\s\S]*?\ntitle:\s*)(.+?)(\r?\n)/,
      (match, pre, title, nl) => {
        const cleanTitle = title.replace(/^["']|["']$/g, "").trim();
        return `${pre}${JSON.stringify(`${cleanTitle} (kopia)`)}${nl}`;
      }
    );

    writeFileAtomic(dst, adjusted);

    revalidatePath("/");
    revalidatePath(`/${base}`);
    return { ok: true, newSlug: base };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Ta bort en slide PERMANENT från en presentations MDX-fil.
 * Inkluderar Notes-block och overlays som hör till sliden (samma logik
 * som extractSlideRaw — sourceStart..sourceEnd från parseMdx).
 *
 * Justerar hiddenSlides så att index efter den borttagna decrementeras
 * (annars skulle hidden-pekare hamna fel efter delete).
 *
 * Destruktiv operation — klienten bör fråga om bekräftelse innan.
 */
export async function deleteSlide(
  slug: string,
  slideIndex1Based: number,
): Promise<{ ok: boolean; remainingSlides?: number; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    if (!Number.isFinite(slideIndex1Based) || slideIndex1Based < 1) {
      return { ok: false, error: "Ogiltigt slide-nummer" };
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const content = parsed.content;
    const slides = parseMdx(raw).slides;
    const idx = slideIndex1Based - 1;
    if (idx < 0 || idx >= slides.length) {
      return { ok: false, error: "Slide finns inte" };
    }

    const slide = slides[idx];
    if (slide.sourceStart == null || slide.sourceEnd == null) {
      return { ok: false, error: "Kunde inte hitta slide-position" };
    }

    // Slice bort rad-rangen sourceStart..sourceEnd (inklusive). Hantera
    // ev. tom-rad efter sliden så vi inte lämnar dubbel-blank-rader.
    const lines = content.split("\n");
    let endLine = slide.sourceEnd;
    // Hoppa över en följande blank-rad om sådan finns (vi sparar en kvar
    // mellan kvarvarande slides via "\n\n"-formatet).
    if (endLine + 1 < lines.length && lines[endLine + 1].trim() === "") {
      endLine = endLine + 1;
    }
    const before = lines.slice(0, slide.sourceStart);
    const after = lines.slice(endLine + 1);
    const newContent = [...before, ...after].join("\n");

    // Justera hiddenSlides: ta bort den raderades index, decrementera alla
    // hidden-index som var > den raderade.
    const existingHidden: number[] = Array.isArray(data.hiddenSlides)
      ? data.hiddenSlides
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const adjusted = existingHidden
      .filter((n) => n !== slideIndex1Based)
      .map((n) => (n > slideIndex1Based ? n - 1 : n));
    if (adjusted.length === 0) {
      delete data.hiddenSlides;
    } else {
      data.hiddenSlides = adjusted.sort((a, b) => a - b);
    }

    const next = matter.stringify(newContent, data);
    writeFileAtomic(filePath, next);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true, remainingSlides: slides.length - 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Lägg till en ny mall-slide direkt efter angiven position.
 * -1 betyder först i presentationen.
 */
export async function insertDefaultSlide(
  slug: string,
  insertAfterIndex0Based: number,
  templateName = "TitleSlide",
): Promise<{ ok: boolean; insertedIndex?: number; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const parsed = parseMdx(fs.readFileSync(filePath, "utf-8"));
    if (
      !Number.isInteger(insertAfterIndex0Based) ||
      insertAfterIndex0Based < -1 ||
      insertAfterIndex0Based >= parsed.slides.length
    ) {
      return { ok: false, error: "Ogiltig insättningsposition" };
    }

    const slide = createDefaultSlide(templateName) as ParsedComponent;
    const insertedIndex = insertAfterIndex0Based + 1;
    parsed.slides.splice(insertedIndex, 0, slide);
    ensureParsedSlideIds(parsed);
    writeFileAtomic(filePath, serializeMdx(parsed));

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    return { ok: true, insertedIndex };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Okänt fel",
    };
  }
}

/** Duplicera en slide och ge kopian en ny permanent identitet. */
export async function duplicateSlideAt(
  slug: string,
  slideIndex0Based: number,
): Promise<{ ok: boolean; insertedIndex?: number; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const parsed = parseMdx(fs.readFileSync(filePath, "utf-8"));
    const source = parsed.slides[slideIndex0Based];
    if (!source) return { ok: false, error: "Slide finns inte" };

    const insertedIndex = slideIndex0Based + 1;
    parsed.slides.splice(insertedIndex, 0, cloneSlideWithFreshId(source));
    ensureParsedSlideIds(parsed);
    writeFileAtomic(filePath, serializeMdx(parsed));

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    return { ok: true, insertedIndex };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Okänt fel",
    };
  }
}

/**
 * Sätt (eller ta bort) bakgrunds-effekt för en specifik slide.
 *
 * Lagrar `sliderEffects: { "3": "dots" }` i frontmatter. Skicka `null`
 * som effect för att ta bort effekten från sliden. Tillåtna effekt-namn
 * matchar SLIDE_EFFECT_NAMES.
 */
const SLIDE_EFFECT_NAMES = new Set([
  "dots",
  "flow",
  "aurora",
  "grain",
  "stardust",
  "mesh",
  "constellation",
  "ribbon",
]);

export async function setSlideEffect(
  slug: string,
  slideIndex1Based: number,
  effect: string | null,
  color?: string | null,
  opacity?: number | null,
  speed?: number | null,
): Promise<{
  ok: boolean;
  effects?: Record<
    string,
    | string
    | { kind: string; color?: string; opacity?: number; speed?: number }
  >;
  error?: string;
}> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    if (!Number.isFinite(slideIndex1Based) || slideIndex1Based < 1) {
      return { ok: false, error: "Ogiltigt slide-nummer" };
    }
    if (effect !== null && !SLIDE_EFFECT_NAMES.has(effect)) {
      return { ok: false, error: `Okänd effekt: ${effect}` };
    }
    if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
      return { ok: false, error: "Ogiltig färgkod" };
    }
    if (
      opacity != null &&
      (typeof opacity !== "number" || opacity < 0.1 || opacity > 2)
    ) {
      return { ok: false, error: "Synlighet utanför intervall" };
    }
    if (
      speed != null &&
      (typeof speed !== "number" || speed < 0.1 || speed > 4)
    ) {
      return { ok: false, error: "Hastighet utanför intervall" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    // Läs in nuvarande state, normalisera till en map som kan bära
    // antingen sträng eller objekt med kind/color/opacity/speed.
    type EffectObj = {
      kind: string;
      color?: string;
      opacity?: number;
      speed?: number;
    };
    const current: Record<string, string | EffectObj> = {};
    if (data.sliderEffects && typeof data.sliderEffects === "object") {
      for (const [k, v] of Object.entries(
        data.sliderEffects as Record<string, unknown>,
      )) {
        if (typeof v === "string" && SLIDE_EFFECT_NAMES.has(v)) {
          current[k] = v;
        } else if (v && typeof v === "object") {
          const obj = v as {
            kind?: unknown;
            color?: unknown;
            opacity?: unknown;
            speed?: unknown;
          };
          if (typeof obj.kind === "string" && SLIDE_EFFECT_NAMES.has(obj.kind)) {
            const next: EffectObj = { kind: obj.kind };
            if (
              typeof obj.color === "string" &&
              /^#[0-9a-fA-F]{3,8}$/.test(obj.color)
            ) {
              next.color = obj.color;
            }
            if (
              typeof obj.opacity === "number" &&
              obj.opacity >= 0.1 &&
              obj.opacity <= 2
            ) {
              next.opacity = obj.opacity;
            }
            if (
              typeof obj.speed === "number" &&
              obj.speed >= 0.1 &&
              obj.speed <= 4
            ) {
              next.speed = obj.speed;
            }
            current[k] =
              next.color || next.opacity != null || next.speed != null
                ? next
                : next.kind;
          }
        }
      }
    }

    const key = String(slideIndex1Based);
    if (effect === null) {
      delete current[key];
    } else {
      // Bygg upp ny config — bevara tidigare värden om inget nytt skickats.
      const prev = current[key];
      const prevObj: EffectObj | null =
        typeof prev === "object" ? prev : prev ? { kind: prev } : null;
      const next: EffectObj = { kind: effect };

      // color: undefined = behåll prev, null = ta bort, string = sätt
      if (color === undefined) {
        if (prevObj?.color) next.color = prevObj.color;
      } else if (color !== null) {
        next.color = color;
      }

      // opacity: undefined = behåll prev, null = ta bort, number = sätt
      if (opacity === undefined) {
        if (prevObj?.opacity != null) next.opacity = prevObj.opacity;
      } else if (opacity !== null) {
        next.opacity = opacity;
      }

      // speed: undefined = behåll prev, null = ta bort, number = sätt
      if (speed === undefined) {
        if (prevObj?.speed != null) next.speed = prevObj.speed;
      } else if (speed !== null) {
        next.speed = speed;
      }

      current[key] =
        next.color || next.opacity != null || next.speed != null
          ? next
          : next.kind;
    }

    if (Object.keys(current).length === 0) {
      delete data.sliderEffects;
    } else {
      data.sliderEffects = current;
    }

    const next = matter.stringify(parsed.content, data);
    writeFileAtomic(filePath, next);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    return { ok: true, effects: current };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Sätt (eller ta bort) en gradient-bakgrund på en slide (1-indexerat).
 *
 * Lagrar `slideGradients: { "3": "solnedgang" }` i frontmatter. Klienten
 * skickar alltid hela det önskade tillståndet — servern normaliserar till
 * kort-form (bara preset-sträng) när inga extra fält avviker från default.
 *
 * Skicka `value = null` för att ta bort gradienten helt.
 */
const GRADIENT_PRESET_IDS = new Set(GRADIENT_PRESETS.map((p) => p.id));

export async function setSlideGradient(
  slug: string,
  slideIndex1Based: number,
  value: SlideGradientValue | null,
): Promise<{
  ok: boolean;
  gradients?: Record<string, SlideGradientValue>;
  error?: string;
}> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    if (!Number.isFinite(slideIndex1Based) || slideIndex1Based < 1) {
      return { ok: false, error: "Ogiltigt slide-nummer" };
    }

    // Validera, och låt sedan normalizeStoredGradient bestämma filformen.
    // Valideringen finns kvar här enbart för att ge klienten ett begripligt
    // felmeddelande; själva formen får aldrig avgöras på två ställen.
    let normalized: SlideGradientValue | null = null;
    if (value !== null) {
      if (typeof value === "string") {
        if (!GRADIENT_PRESET_IDS.has(value)) {
          return { ok: false, error: `Okänd gradient-preset: ${value}` };
        }
      } else if (value && typeof value === "object") {
        const preset =
          typeof value.preset === "string" ? value.preset : undefined;
        if (preset && !GRADIENT_PRESET_IDS.has(preset)) {
          return { ok: false, error: `Okänd gradient-preset: ${preset}` };
        }
        const colors = Array.isArray(value.colors)
          ? value.colors.filter(isHexColor)
          : undefined;
        if (!preset && (!colors || colors.length < 2)) {
          return {
            ok: false,
            error: "Gradienten behöver en preset eller minst 2 färger",
          };
        }
      }

      normalized = normalizeStoredGradient(value);
      if (normalized === null) {
        return { ok: false, error: "Gradienten gick inte att tolka" };
      }
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    const current: Record<string, SlideGradientValue> = {};
    if (data.slideGradients && typeof data.slideGradients === "object") {
      for (const [k, v] of Object.entries(
        data.slideGradients as Record<string, unknown>,
      )) {
        if (typeof v === "string" || (v && typeof v === "object")) {
          current[k] = v as SlideGradientValue;
        }
      }
    }

    const key = String(slideIndex1Based);
    if (normalized === null) {
      delete current[key];
    } else {
      current[key] = normalized;
    }

    if (Object.keys(current).length === 0) {
      delete data.slideGradients;
    } else {
      data.slideGradients = current;
    }

    const next = matter.stringify(parsed.content, data);
    writeFileAtomic(filePath, next);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    return { ok: true, gradients: current };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Toggla synlighet på en slide (1-indexerat). Lagrar hiddenSlides:
 * [3, 17] i frontmatter. Slides hoppas över i presenter-läget men
 * visas fortfarande i editor och meny (med en överstreckad ögon-ikon).
 */
export async function toggleSlideHidden(
  slug: string,
  slideIndex1Based: number
): Promise<{ ok: boolean; hidden?: number[]; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    if (!Number.isFinite(slideIndex1Based) || slideIndex1Based < 1) {
      return { ok: false, error: "Ogiltigt slide-nummer" };
    }
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    const existing: number[] = Array.isArray(data.hiddenSlides)
      ? data.hiddenSlides
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];

    const set = new Set(existing);
    if (set.has(slideIndex1Based)) {
      set.delete(slideIndex1Based);
    } else {
      set.add(slideIndex1Based);
    }
    const sorted = [...set].sort((a, b) => a - b);

    if (sorted.length === 0) {
      delete data.hiddenSlides;
    } else {
      data.hiddenSlides = sorted;
    }

    // matter.stringify bevarar övrig frontmatter + content.
    const next = matter.stringify(parsed.content, data);
    writeFileAtomic(filePath, next);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);
    return { ok: true, hidden: sorted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Kopiera en eller flera slides från en presentation till en annan.
 * Slides infogas EFTER `insertAfterIndex0Based` i målpresentationen.
 * Använd `insertAfterIndex0Based = -1` för att lägga längst upp,
 * eller motsv. `targetSlideCount - 1` för att lägga längst ner.
 *
 * Slides ärver målpresentationens tema och frontmatter (rådatan kopieras
 * som den är, men temat sitter i frontmatter på destinationsfilen så
 * fonts/färger/styling matchar automatiskt).
 *
 * Returnerar antalet kopierade slides och slugen för revalidate.
 */
export async function copySlidesFromPresentation(input: {
  sourceSlug: string;
  /** 1-indexerade slide-nummer från källan. */
  sourceSlideIndices: number[];
  targetSlug: string;
  /** 0-indexerat — efter vilken slide i målet (-1 = före allt). */
  insertAfterIndex0Based: number;
}): Promise<{ ok: boolean; copied?: number; error?: string }> {
  try {
    const { sourceSlug, sourceSlideIndices, targetSlug, insertAfterIndex0Based } =
      input;
    if (!isValidSlug(sourceSlug) || !isValidSlug(targetSlug)) {
      return { ok: false, error: "Ogiltig slug" };
    }
    if (sourceSlug === targetSlug) {
      return { ok: false, error: "Käll- och målpresentation är samma" };
    }
    if (!sourceSlideIndices || sourceSlideIndices.length === 0) {
      return { ok: false, error: "Inga slides valda" };
    }

    const sourcePath = path.join(CONTENT_DIR, `${sourceSlug}.mdx`);
    const targetPath = path.join(CONTENT_DIR, `${targetSlug}.mdx`);
    if (!fs.existsSync(sourcePath)) {
      return { ok: false, error: "Källpresentation finns inte" };
    }
    if (!fs.existsSync(targetPath)) {
      return { ok: false, error: "Målpresentation finns inte" };
    }

    const sourceRaw = fs.readFileSync(sourcePath, "utf-8");
    const targetRaw = fs.readFileSync(targetPath, "utf-8");

    // Extrahera rådata för varje vald källslide. Bibehåll käll-ordning.
    const sortedIndices = [...new Set(sourceSlideIndices)].sort((a, b) => a - b);
    const slideTexts: string[] = [];
    for (const idx1 of sortedIndices) {
      const text = extractSlideRaw(sourceRaw, idx1);
      if (text == null) {
        return {
          ok: false,
          error: `Kunde inte extrahera slide ${idx1} från ${sourceSlug}`,
        };
      }
      slideTexts.push(replaceOrInsertSlideId(text));
    }
    const blockToInsert = slideTexts.join("\n\n") + "\n";

    // Hitta var i målet vi ska infoga (efter slide N).
    const targetParsed = matter(targetRaw);
    const targetContent = targetParsed.content;
    const targetSlides = parseMdx(targetRaw).slides;

    let insertLineIndex: number;
    if (insertAfterIndex0Based < 0) {
      // Före allt — efter ev. ledande blank-rader i content.
      insertLineIndex = 0;
    } else if (insertAfterIndex0Based >= targetSlides.length) {
      // Efter sista sliden (lägg sist i content).
      const last = targetSlides[targetSlides.length - 1];
      insertLineIndex = (last?.sourceEnd ?? -1) + 1;
    } else {
      const after = targetSlides[insertAfterIndex0Based];
      insertLineIndex = (after.sourceEnd ?? 0) + 1;
    }

    const contentLines = targetContent.split("\n");
    const before = contentLines.slice(0, insertLineIndex).join("\n");
    const after = contentLines.slice(insertLineIndex).join("\n");
    const newContent =
      (before ? before + "\n" : "") +
      (before && !before.endsWith("\n\n") ? "\n" : "") +
      blockToInsert +
      (after && !after.startsWith("\n") ? "\n" : "") +
      after;

    // Bevara frontmatter
    const next = matter.stringify(newContent, targetParsed.data);
    writeFileAtomic(targetPath, next);

    revalidatePath(`/${targetSlug}`);
    revalidatePath(`/${targetSlug}/edit`);
    revalidatePath(`/${targetSlug}/studio`);
    revalidatePath("/");
    return { ok: true, copied: slideTexts.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Returnerar ALLA slides från ALLA presentationer som en flat array, med
 * preview-metadata. Klient-komponenten filtrerar/söker själv för att hålla
 * UI:n snabb och responsiv. Servern returnerar bara metadata, inga MDX-
 * rådata (för att inte skicka megabyte till klienten i onödan).
 */
export async function listAllSlidesAcrossPresentations(): Promise<
  Array<{
    slug: string;
    presentationTitle: string;
    slideIndex1Based: number;
    templateName: string;
    primaryText?: string;
    secondaryText?: string;
  }>
> {
  const out: Array<{
    slug: string;
    presentationTitle: string;
    slideIndex1Based: number;
    templateName: string;
    primaryText?: string;
    secondaryText?: string;
  }> = [];

  try {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      if (!isValidSlug(slug)) continue;
      try {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
        const { data, content } = matter(raw);
        const title = (data as Record<string, unknown>).title as string | undefined;
        // Notes måste strippas först. extractSlideMetas läser varje rad som
        // börjar med <Versal som en slide, så <Notes>-block blev egna poster
        // och försköt slideIndex1Based för allt efter dem — importvägen
        // hämtade då fel slide. Gällde 32 av 53 deckar.
        const metas: SlideMeta[] = extractSlideMetas(stripNotesBlocks(content));
        metas.forEach((m, i) => {
          out.push({
            slug,
            presentationTitle: title ?? slug,
            slideIndex1Based: i + 1,
            templateName: m.templateName,
            primaryText: m.primaryText,
            secondaryText: m.secondaryText,
          });
        });
      } catch {
        // Hoppa över korrupta filer tyst — bättre att lista resten än att krascha
      }
    }
  } catch {
    // Om CONTENT_DIR inte finns, returnera tom lista
  }

  return out;
}

/**
 * Hämta rådatan för en specifik slide — används för live-preview i import-
 * modalen. Skickar tillbaka MDX-källan + presentationens frontmatter så
 * klienten kan rendera en isolerad slide med rätt tema.
 */
export async function getSlideForPreview(
  slug: string,
  slideIndex1Based: number,
): Promise<{
  ok: boolean;
  raw?: string;
  frontmatter?: Record<string, unknown>;
  error?: string;
}> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    const fileRaw = fs.readFileSync(filePath, "utf-8");
    const raw = extractSlideRaw(fileRaw, slideIndex1Based);
    if (raw == null) return { ok: false, error: "Slide finns inte" };
    const { data } = matter(fileRaw);
    return { ok: true, raw, frontmatter: data as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Hämta hela MDX-källfilen som text — frontmatter, slides och Notes-blocken
 * precis som de ligger på disk. Används av "Kopiera MDX" i M-menyn: Joel
 * klistrar in hela decket i en chatbot för att ställa frågor om innehållet.
 *
 * Läser bara — inga skrivningar, ingen revalidate.
 */
export async function getPresentationSource(
  slug: string,
): Promise<{ ok: boolean; source?: string; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }
    return { ok: true, source: fs.readFileSync(filePath, "utf-8") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Skapa en ny, tom presentation. Returnerar slug:en så klienten kan
 * navigera direkt till /slug/edit.
 */
export async function createPresentation(input: {
  title: string;
  theme?: string;
  tags?: string[];
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    const title = (input.title || "").trim();
    if (!title) return { ok: false, error: "Titel krävs" };

    const base = slugify(title) || "ny-presentation";
    const slug = uniqueSlug(base);
    const theme = input.theme || "default";
    const tagsLine =
      input.tags && input.tags.length > 0
        ? `\ntags: [${input.tags.map((t) => JSON.stringify(t)).join(", ")}]`
        : "";

    // Författaren är installationens ägare (lib/agare.ts); utan namn står ingen författare.
    const authorLine = AGARE.namn ? `\nauthor: ${JSON.stringify(AGARE.namn)}` : "";
    const authorProp = AGARE.namn ? `\n  author=${JSON.stringify(AGARE.namn)}` : "";
    const body = `---
title: ${JSON.stringify(title)}${authorLine}
date: "${new Date().toISOString().slice(0, 10)}"
theme: ${theme}${tagsLine}
---

<TitleSlide
  title=${JSON.stringify(title)}${authorProp}
  date="${new Date().toISOString().slice(0, 10)}"
/>

<GiantText align="center">
  Första **slagkraftiga** meningen.
</GiantText>
`;

    writeFileAtomic(path.join(CONTENT_DIR, `${slug}.mdx`), body);

    revalidatePath("/");
    revalidatePath(`/${slug}`);
    return { ok: true, slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

/**
 * Server action: sätt accent- eller textfärg på en specifik slide eller
 * globalt för hela presentationen. Värdet är en hex-sträng (#RRGGBB) eller
 * null för att ta bort overriden. Slide-level vinner över global.
 *
 * @param target - 1-indexerat slide-nummer (1..N) eller `"all"` för global
 * @param prop - `"accent"` eller `"text"`
 * @param value - hex (#RRGGBB) eller null för reset
 */
export async function setPresentationColor(
  slug: string,
  target: number | "all",
  prop: "accent" | "text" | "muted",
  value: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isValidSlug(slug)) return { ok: false, error: "Ogiltig slug" };
    if (value !== null && !/^#[0-9a-fA-F]{6}$/.test(value)) {
      return { ok: false, error: "Värdet måste vara #RRGGBB eller null" };
    }

    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: "Presentation finns inte" };
    }

    const source = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(source);
    const fm = parsed.data as Record<string, unknown>;

    const GLOBAL_KEYS = {
      accent: "accentOverride",
      text: "textOverride",
      muted: "mutedOverride",
    } as const;
    const SLIDE_KEYS = {
      accent: "slideAccents",
      text: "slideTextColors",
      muted: "slideMutedColors",
    } as const;

    if (target === "all") {
      const key = GLOBAL_KEYS[prop];
      if (value === null) delete fm[key];
      else fm[key] = value;
    } else {
      if (!Number.isInteger(target) || target < 1) {
        return { ok: false, error: "Slide-target måste vara >= 1" };
      }
      const mapKey = SLIDE_KEYS[prop];
      const existing =
        fm[mapKey] && typeof fm[mapKey] === "object"
          ? { ...(fm[mapKey] as Record<string, string>) }
          : {};
      if (value === null) delete existing[String(target)];
      else existing[String(target)] = value;
      if (Object.keys(existing).length > 0) fm[mapKey] = existing;
      else delete fm[mapKey];
    }

    const body = matter.stringify(parsed.content, fm);
    writeFileAtomic(filePath, body);

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/edit`);
    revalidatePath(`/${slug}/studio`);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}
