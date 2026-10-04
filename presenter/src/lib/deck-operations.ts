import type { ParsedComponent, ParsedPresentation } from "./mdx-parser";
import { cloneSlideWithFreshId } from "./slide-ids";

const POSITIONAL_MAP_KEYS = [
  "sliderEffects",
  "slideGradients",
  "slideAccents",
  "slideTextColors",
  "slideMutedColors",
] as const;

type SlideIndexMap = Map<number, number>;

function remapFrontmatter(
  frontmatter: Record<string, unknown>,
  oldToNew: SlideIndexMap,
): Record<string, unknown> {
  const next = { ...frontmatter };

  const hidden = Array.isArray(frontmatter.hiddenSlides)
    ? frontmatter.hiddenSlides
        .map(Number)
        .filter((value) => Number.isInteger(value) && value > 0)
        .map((value) => oldToNew.get(value - 1))
        .filter((value): value is number => value != null)
        .map((value) => value + 1)
        .sort((a, b) => a - b)
    : [];
  if (hidden.length > 0) next.hiddenSlides = [...new Set(hidden)];
  else delete next.hiddenSlides;

  for (const key of POSITIONAL_MAP_KEYS) {
    const raw = frontmatter[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      delete next[key];
      continue;
    }

    const remapped: Record<string, unknown> = {};
    for (const [position, value] of Object.entries(
      raw as Record<string, unknown>,
    )) {
      const oldIndex = Number(position) - 1;
      const newIndex = oldToNew.get(oldIndex);
      if (!Number.isInteger(oldIndex) || newIndex == null) continue;
      remapped[String(newIndex + 1)] = value;
    }
    if (Object.keys(remapped).length > 0) next[key] = remapped;
    else delete next[key];
  }

  return next;
}

function identityIndexMap(count: number): SlideIndexMap {
  return new Map(Array.from({ length: count }, (_, index) => [index, index]));
}

function insertIndexMap(
  oldCount: number,
  insertAt: number,
  amount: number,
): SlideIndexMap {
  const map = new Map<number, number>();
  for (let oldIndex = 0; oldIndex < oldCount; oldIndex++) {
    map.set(oldIndex, oldIndex < insertAt ? oldIndex : oldIndex + amount);
  }
  return map;
}

function copyPositionalSettings(
  frontmatter: Record<string, unknown>,
  sourcePosition1Based: number,
  targetPosition1Based: number,
): Record<string, unknown> {
  const next = { ...frontmatter };
  const hidden = Array.isArray(next.hiddenSlides)
    ? next.hiddenSlides.map(Number).filter(Number.isInteger)
    : [];
  if (hidden.includes(sourcePosition1Based)) {
    next.hiddenSlides = [...new Set([...hidden, targetPosition1Based])].sort(
      (a, b) => a - b,
    );
  }

  for (const key of POSITIONAL_MAP_KEYS) {
    const raw = next[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const map = { ...(raw as Record<string, unknown>) };
    const sourceValue = map[String(sourcePosition1Based)];
    if (sourceValue !== undefined) {
      map[String(targetPosition1Based)] = sourceValue;
      next[key] = map;
    }
  }
  return next;
}

export function insertSlidesAfter(
  parsed: ParsedPresentation,
  insertAfterIndex: number,
  incoming: ParsedComponent[],
): ParsedPresentation {
  if (incoming.length === 0) return parsed;
  const insertAt = Math.min(
    Math.max(insertAfterIndex + 1, 0),
    parsed.slides.length,
  );
  const frontmatter = remapFrontmatter(
    parsed.frontmatter,
    insertIndexMap(parsed.slides.length, insertAt, incoming.length),
  );
  const slides = [...parsed.slides];
  slides.splice(insertAt, 0, ...incoming);
  return { ...parsed, frontmatter, slides };
}

export function duplicateSlide(
  parsed: ParsedPresentation,
  index: number,
): ParsedPresentation {
  const source = parsed.slides[index];
  if (!source) return parsed;
  const inserted = insertSlidesAfter(parsed, index, [
    cloneSlideWithFreshId(source),
  ]);
  return {
    ...inserted,
    frontmatter: copyPositionalSettings(
      inserted.frontmatter,
      index + 1,
      index + 2,
    ),
  };
}

export function deleteSlideAt(
  parsed: ParsedPresentation,
  index: number,
): ParsedPresentation {
  if (parsed.slides.length <= 1 || !parsed.slides[index]) return parsed;
  const oldToNew = new Map<number, number>();
  for (let oldIndex = 0; oldIndex < parsed.slides.length; oldIndex++) {
    if (oldIndex === index) continue;
    oldToNew.set(oldIndex, oldIndex < index ? oldIndex : oldIndex - 1);
  }
  const slides = parsed.slides.filter((_, slideIndex) => slideIndex !== index);
  let trailingRaw = parsed.trailingRaw;

  // Kommentarsblocket före den raderade sliden är oftast en aktrubrik
  // ("{/* AKT 2 · … */}") som hör till avsnittet, inte till sliden. Låt det
  // följa med till efterföljaren i stället för att försvinna med sliden.
  const orphaned = parsed.slides[index].leadingRaw;
  if (orphaned) {
    const successor = slides[index];
    if (successor) {
      slides[index] = {
        ...successor,
        leadingRaw: successor.leadingRaw
          ? `${orphaned}\n\n${successor.leadingRaw}`
          : orphaned,
      };
    } else {
      trailingRaw = trailingRaw ? `${orphaned}\n\n${trailingRaw}` : orphaned;
    }
  }

  return {
    ...parsed,
    frontmatter: remapFrontmatter(parsed.frontmatter, oldToNew),
    slides,
    trailingRaw,
  };
}

export function toggleSlideVisibility(
  parsed: ParsedPresentation,
  index: number,
): ParsedPresentation {
  if (!parsed.slides[index]) return parsed;
  const position = index + 1;
  const hidden = new Set(
    Array.isArray(parsed.frontmatter.hiddenSlides)
      ? parsed.frontmatter.hiddenSlides
          .map(Number)
          .filter((value) => Number.isInteger(value) && value > 0)
      : [],
  );
  if (hidden.has(position)) hidden.delete(position);
  else hidden.add(position);
  const frontmatter = { ...parsed.frontmatter };
  if (hidden.size > 0) {
    frontmatter.hiddenSlides = [...hidden].sort((a, b) => a - b);
  } else {
    delete frontmatter.hiddenSlides;
  }
  return { ...parsed, frontmatter };
}

export function reorderDeck(
  parsed: ParsedPresentation,
  order: number[],
): ParsedPresentation {
  const count = parsed.slides.length;
  if (
    order.length !== count ||
    new Set(order).size !== count ||
    order.some((index) => !Number.isInteger(index) || index < 0 || index >= count)
  ) {
    return parsed;
  }
  if (order.every((oldIndex, newIndex) => oldIndex === newIndex)) return parsed;

  const oldToNew = identityIndexMap(count);
  order.forEach((oldIndex, newIndex) => oldToNew.set(oldIndex, newIndex));
  return {
    ...parsed,
    frontmatter: remapFrontmatter(parsed.frontmatter, oldToNew),
    slides: order.map((oldIndex) => parsed.slides[oldIndex]),
  };
}
