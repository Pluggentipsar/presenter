/**
 * Objekt på sliden — ren geometri och regler för editorns objektlager.
 *
 * Ett objekt är en overlay (FloatingImage, FloatingText, FloatingVideo,
 * FloatingShape …) som ligger ovanpå mallen. Alla mått är procent av slidens
 * bredd respektive höjd, precis som props:en x/y/width/height i MDX:en — så
 * det som editorn räknar ut går rakt in i filen, och spelaren ritar samma sak.
 *
 * Modulen är medvetet fri från React och DOM: ObjectLayer mäter och ritar,
 * det här räknar. Testas i scripts/objects.test.ts.
 */

import type { ParsedComponent, PropValue } from "./mdx-parser";

/** Slidens proportioner. Procent i x- och y-led är olika långa i pixlar. */
export const SLIDE_ASPECT = 16 / 9;

export interface ObjectBox {
  /** Vänsterkant, % av slidens bredd. */
  x: number;
  /** Överkant, % av slidens höjd. */
  y: number;
  /** Bredd, % av slidens bredd. */
  w: number;
  /** Höjd, % av slidens höjd. */
  h: number;
  /** Grader, medurs. */
  rotation: number;
}

export type ObjectKind = "image" | "video" | "text" | "shape" | "other";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const OBJECT_KINDS: Record<string, ObjectKind> = {
  FloatingImage: "image",
  FloatingVideo: "video",
  FloatingText: "text",
  FloatingShape: "shape",
};

export function objectKind(tag: string): ObjectKind {
  return OBJECT_KINDS[tag] ?? "other";
}

/** Objekt som editorns lager kan flytta och storleksändra. */
export function isTransformable(tag: string): boolean {
  return objectKind(tag) !== "other";
}

/** Bevarar proportionerna när hörnen dras (Shift släpper). */
export function keepsAspect(kind: ObjectKind): boolean {
  return kind === "image" || kind === "video";
}

// ── Procent ────────────────────────────────────────────────────────────────

/** "23.4%" → 23.4 · "23.4" → 23.4 · 23.4 → 23.4 · "280px" → null (okänd enhet). */
export function parsePercent(value: PropValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/px$/i.test(trimmed)) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** En decimal, utan onödig nolla: 23.4 → "23.4%", 40 → "40%". */
export function formatPercent(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Etiketter och stapling ─────────────────────────────────────────────────

/** Kort namn för lagerlistan: textens början, bildens filnamn, formens slag. */
export function objectLabel(overlay: ParsedComponent): string {
  const props = overlay.props;
  if (typeof props.name === "string" && props.name.trim()) return props.name.trim();
  const kind = objectKind(overlay.tag);
  if (kind === "text") {
    const text = typeof props.text === "string" ? props.text : overlay.content ?? "";
    const line = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    return line ? truncate(line, 42) : "Tom textruta";
  }
  if (kind === "image" || kind === "video") {
    const src = typeof props.src === "string" ? props.src : "";
    const file = src.split(/[\\/]/).pop() ?? "";
    return file ? decodeURIComponent(file) : kind === "image" ? "Bild" : "Video";
  }
  if (kind === "shape") {
    const shape = typeof props.shape === "string" ? props.shape : "rect";
    return SHAPE_LABELS[shape] ?? "Form";
  }
  return overlay.tag.replace(/^Floating/, "");
}

export const SHAPE_LABELS: Record<string, string> = {
  rect: "Rektangel",
  ellipse: "Ellips",
  line: "Linje",
  arrow: "Pil",
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Faktisk staplingsnivå. Samma standardvärden som komponenterna använder:
 * bilder bakom innehållet ligger på −1 (under mallens text, över markordet),
 * text och video bakom på 1, allt framför på 10.
 */
export function effectiveZ(overlay: ParsedComponent): number {
  const z = overlay.props.zIndex;
  const zNum = typeof z === "number" ? z : typeof z === "string" ? parseFloat(z) : NaN;
  if (Number.isFinite(zNum)) return zNum;
  const back = overlay.props.layer === "back";
  if (!back) return 10;
  return objectKind(overlay.tag) === "image" ? -1 : 1;
}

/** Index i staplingsordning, underst först. Lika z: senare i filen ligger överst. */
export function stackingOrder(overlays: ParsedComponent[]): number[] {
  return overlays
    .map((overlay, index) => ({ index, z: effectiveZ(overlay) }))
    .sort((a, b) => a.z - b.z || a.index - b.index)
    .map((entry) => entry.index);
}

/**
 * Nytt zIndex för att flytta ett objekt ett steg upp eller ner relativt de
 * andra objekten. Hoppar precis förbi grannen i staplingsordningen så att ett
 * klick alltid syns — inte ±1 som kan fastna bakom en jämlike.
 */
export function stepZ(overlays: ParsedComponent[], index: number, direction: 1 | -1): number {
  const order = stackingOrder(overlays);
  const position = order.indexOf(index);
  const neighbour = order[position + direction];
  if (neighbour === undefined) return effectiveZ(overlays[index]);
  const neighbourZ = effectiveZ(overlays[neighbour]);
  const target = neighbourZ + direction;
  return clamp(target, -9, 99);
}

/** Överst eller underst bland objekten. */
export function extremeZ(overlays: ParsedComponent[], direction: 1 | -1): number {
  const zs = overlays.map(effectiveZ);
  if (zs.length === 0) return direction === 1 ? 10 : 1;
  return clamp(direction === 1 ? Math.max(...zs) + 1 : Math.min(...zs) - 1, -9, 99);
}

// ── Flytt och storlek ──────────────────────────────────────────────────────

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Objekt får sticka ut en bit utanför sliden, men inte försvinna. */
export const POSITION_MIN = -40;
export const POSITION_MAX = 110;

export function moveBox(box: ObjectBox, dx: number, dy: number): ObjectBox {
  return {
    ...box,
    x: clamp(box.x + dx, POSITION_MIN, POSITION_MAX),
    y: clamp(box.y + dy, POSITION_MIN, POSITION_MAX),
  };
}

export interface ResizeOptions {
  /** Behåll bredd/höjd-förhållandet (i procentenheter). */
  keepAspect?: boolean;
  minW?: number;
  minH?: number;
}

/**
 * Dra i ett handtag. dx/dy är pekarens förflyttning i procent av sliden.
 * Motstående kant ligger stilla. Med keepAspect projiceras hörndraget på
 * diagonalen så att rutan växer jämnt åt det håll man drar.
 */
export function resizeBox(
  box: ObjectBox,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  { keepAspect = false, minW = 2, minH = 1 }: ResizeOptions = {},
): ObjectBox {
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let w = box.w;
  let h = box.h;

  if (keepAspect && box.w > 0 && box.h > 0) {
    const ratio = box.w / box.h;
    if (sx !== 0 && sy !== 0) {
      // Hörn: projektion på diagonalen (w, h) i procentrymden.
      const t = (dx * sx * box.w + dy * sy * box.h) / (box.w * box.w + box.h * box.h);
      w = box.w * (1 + t);
      h = box.h * (1 + t);
    } else if (sx !== 0) {
      w = box.w + dx * sx;
      h = w / ratio;
    } else {
      h = box.h + dy * sy;
      w = h * ratio;
    }
    if (w < minW) {
      w = minW;
      h = w / ratio;
    }
    if (h < minH) {
      h = minH;
      w = h * ratio;
    }
  } else {
    if (sx !== 0) w = Math.max(minW, box.w + dx * sx);
    if (sy !== 0) h = Math.max(minH, box.h + dy * sy);
  }

  // Förankring: kanten mitt emot handtaget står still. För hörn med bevarad
  // proportion via en kant flyttas den andra axeln symmetriskt runt mitten.
  let x = box.x;
  let y = box.y;
  if (sx < 0) x = box.x + box.w - w;
  else if (sx === 0 && keepAspect) x = box.x + (box.w - w) / 2;
  if (sy < 0) y = box.y + box.h - h;
  else if (sy === 0 && keepAspect) y = box.y + (box.h - h) / 2;

  return { ...box, x, y, w, h };
}

/** Piltangenternas steg i procent. Shift ger det stora. */
export const NUDGE_STEP = 0.5;
export const NUDGE_STEP_LARGE = 2;

export function nudgeBox(box: ObjectBox, key: string, large: boolean): ObjectBox | null {
  const step = large ? NUDGE_STEP_LARGE : NUDGE_STEP;
  switch (key) {
    case "ArrowLeft":
      return moveBox(box, -step, 0);
    case "ArrowRight":
      return moveBox(box, step, 0);
    case "ArrowUp":
      return moveBox(box, 0, -step);
    case "ArrowDown":
      return moveBox(box, 0, step);
    default:
      return null;
  }
}

/**
 * Rotation från pekarens läge relativt objektets mitt, i grader (−180, 180].
 * Handtaget sitter rakt ovanför mitten och är 0°. Snäpp till 15° med Shift.
 */
export function rotationFromPointer(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
  snap: boolean,
): number {
  const deg = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  const rounded = snap ? Math.round(deg / 15) * 15 : Math.round(deg);
  return normalizeAngle(rounded);
}

export function normalizeAngle(deg: number): number {
  const n = ((((deg + 180) % 360) + 360) % 360) - 180;
  return n === -180 ? 180 : n;
}

/**
 * Textstorleken sparas i cqw — procent av rutans egen bredd. Drar man i en
 * sidokant ska raderna brytas om men bokstäverna behålla sin storlek, så
 * cqw-värdet räknas om i motsatt riktning mot bredden.
 */
export function textSizeForWidth(sizeCqw: number, oldW: number, newW: number): number {
  if (oldW <= 0 || newW <= 0) return sizeCqw;
  return clamp(round1((sizeCqw * oldW) / newW), 1, 100);
}

// ── Hjälplinjer och snäpp ──────────────────────────────────────────────────

export interface SnapTargets {
  /** Lodräta linjer: x-värden i %. */
  v: number[];
  /** Vågräta linjer: y-värden i %. */
  h: number[];
}

/** Slidens egna linjer: kanter, mitt och tredjedelar. */
export const SLIDE_LINES = [0, 100 / 3, 50, 200 / 3, 100];

/** Linjer att snäppa mot: slidens egna plus de andra objektens kanter och mitt. */
export function snapTargets(others: ObjectBox[]): SnapTargets {
  const v = [...SLIDE_LINES];
  const h = [...SLIDE_LINES];
  for (const o of others) {
    v.push(o.x, o.x + o.w / 2, o.x + o.w);
    h.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { v, h };
}

export interface SnapResult {
  box: ObjectBox;
  /** Linjer som träffades, för att rita hjälplinjerna. */
  guides: SnapTargets;
}

function nearest(values: number[], targets: number[], threshold: number): { delta: number; target: number } | null {
  let best: { delta: number; target: number } | null = null;
  for (const value of values) {
    for (const target of targets) {
      const delta = target - value;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, target };
      }
    }
  }
  return best;
}

/**
 * Snäpp en flyttad ruta: vänster/mitt/höger mot lodräta linjer och
 * över/mitt/under mot vågräta. Tröskeln anges i procent per axel (editorn
 * räknar om från ett fast antal skärmpixlar).
 */
export function snapBox(box: ObjectBox, targets: SnapTargets, thresholdX: number, thresholdY: number): SnapResult {
  const guides: SnapTargets = { v: [], h: [] };
  let { x, y } = box;
  const hit = nearest([box.x, box.x + box.w / 2, box.x + box.w], targets.v, thresholdX);
  if (hit) {
    x = box.x + hit.delta;
    guides.v.push(hit.target);
  }
  const hitY = nearest([box.y, box.y + box.h / 2, box.y + box.h], targets.h, thresholdY);
  if (hitY) {
    y = box.y + hitY.delta;
    guides.h.push(hitY.target);
  }
  return { box: { ...box, x, y }, guides };
}

/** Snäpp en enskild kant (vid storleksändring). */
export function snapEdge(value: number, targets: number[], threshold: number): { value: number; guide: number | null } {
  const hit = nearest([value], targets, threshold);
  return hit ? { value: hit.target, guide: hit.target } : { value, guide: null };
}

// ── Flera objekt ───────────────────────────────────────────────────────────

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boundsOf(boxes: ObjectBox[]): Bounds | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/**
 * Justera flera rutor mot varandra (deras gemensamma yta) — eller, med ett
 * enda objekt, mot sliden. Returnerar nya lägen i samma ordning.
 */
export function alignBoxes(boxes: ObjectBox[], mode: AlignMode): ObjectBox[] {
  const ref: Bounds = boxes.length > 1 ? boundsOf(boxes)! : { x: 0, y: 0, w: 100, h: 100 };
  return boxes.map((b) => {
    switch (mode) {
      case "left":
        return { ...b, x: ref.x };
      case "center":
        return { ...b, x: ref.x + (ref.w - b.w) / 2 };
      case "right":
        return { ...b, x: ref.x + ref.w - b.w };
      case "top":
        return { ...b, y: ref.y };
      case "middle":
        return { ...b, y: ref.y + (ref.h - b.h) / 2 };
      case "bottom":
        return { ...b, y: ref.y + ref.h - b.h };
    }
  });
}

/** Jämna mellanrum mellan tre eller fler rutor längs en axel. Ytterkanterna ligger kvar. */
export function distributeBoxes(boxes: ObjectBox[], axis: "x" | "y"): ObjectBox[] {
  if (boxes.length < 3) return boxes;
  const size = axis === "x" ? "w" : "h";
  const order = boxes.map((b, i) => ({ b, i })).sort((a, c) => a.b[axis] - c.b[axis]);
  const first = order[0].b;
  const last = order[order.length - 1].b;
  const total = order.reduce((sum, { b }) => sum + b[size], 0);
  const span = last[axis] + last[size] - first[axis];
  const gap = (span - total) / (order.length - 1);
  const result = [...boxes];
  let cursor = first[axis];
  for (const { b, i } of order) {
    result[i] = { ...b, [axis]: cursor };
    cursor += b[size] + gap;
  }
  return result;
}

/** Rutor som en markeringsram (marquee) helt eller delvis täcker. */
export function boxesInRect(boxes: ObjectBox[], rect: Bounds): number[] {
  const left = Math.min(rect.x, rect.x + rect.w);
  const right = Math.max(rect.x, rect.x + rect.w);
  const top = Math.min(rect.y, rect.y + rect.h);
  const bottom = Math.max(rect.y, rect.y + rect.h);
  const hits: number[] = [];
  boxes.forEach((b, i) => {
    if (b.x < right && b.x + b.w > left && b.y < bottom && b.y + b.h > top) hits.push(i);
  });
  return hits;
}

// ── Beskärning ─────────────────────────────────────────────────────────────

export interface Crop {
  /** Utsnittets läge och storlek som andelar (0–1) av originalbilden. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** "0.1 0.2 0.5 0.6" → utsnitt. Tomt eller ogiltigt → null (hela bilden). */
export function parseCrop(value: PropValue | undefined): Crop | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0 || w > 1 || h > 1 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) return null;
  if (x === 0 && y === 0 && w === 1 && h === 1) return null;
  return { x, y, w, h };
}

export function formatCrop(crop: Crop): string {
  return [crop.x, crop.y, crop.w, crop.h].map((n) => String(Math.round(n * 1000) / 1000)).join(" ");
}

/**
 * Bilden inne i ramen: förstorad så att utsnittet fyller ramen exakt, och
 * förskjuten så att rätt del syns. Procent av ramen — ingen mätning behövs.
 */
export function cropImageStyle(crop: Crop): { left: string; top: string; width: string; height: string } {
  return {
    left: `${(-crop.x / crop.w) * 100}%`,
    top: `${(-crop.y / crop.h) * 100}%`,
    width: `${(1 / crop.w) * 100}%`,
    height: `${(1 / crop.h) * 100}%`,
  };
}

/**
 * Ramens höjd (i % av sliden) som gör att utsnittet inte förvrängs, givet
 * bildens naturliga proportion (bredd/höjd i pixlar) och ramens bredd.
 */
export function frameHeightForCrop(frameW: number, naturalAspect: number, crop: Crop | null): number {
  const aspect = crop ? naturalAspect * (crop.w / crop.h) : naturalAspect;
  // Bredd-% → höjd-% via slidens 16:9.
  return (frameW * SLIDE_ASPECT) / aspect;
}

/**
 * Flytta utsnittet (panorera i ramen). dx/dy anges som andel av ramens
 * bredd/höjd; utsnittet hålls inom bilden.
 */
export function panCrop(crop: Crop, dx: number, dy: number): Crop {
  return {
    ...crop,
    x: clamp(crop.x - dx * crop.w, 0, 1 - crop.w),
    y: clamp(crop.y - dy * crop.h, 0, 1 - crop.h),
  };
}

/** Zooma utsnittet runt dess mitt. factor > 1 = närmare. */
export function zoomCrop(crop: Crop, factor: number): Crop {
  const w = clamp(crop.w / factor, 0.05, 1);
  const h = clamp(crop.h / factor, 0.05, 1);
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  return {
    x: clamp(cx - w / 2, 0, 1 - w),
    y: clamp(cy - h / 2, 0, 1 - h),
    w,
    h,
  };
}

// ── Placering av nya objekt ────────────────────────────────────────────────

/** Startläge för ett nytt objekt: mitt på sliden, förskjutet om något redan ligger där. */
export function defaultPlacement(kind: ObjectKind, existing: ObjectBox[]): { x: number; y: number; w: number } {
  const w = kind === "text" ? 34 : kind === "shape" ? 20 : 30;
  let x = 50 - w / 2;
  let y = kind === "text" ? 42 : 30;
  const taken = (px: number, py: number) => existing.some((b) => Math.abs(b.x - px) < 1 && Math.abs(b.y - py) < 1);
  let attempts = 0;
  while (taken(x, y) && attempts < 8) {
    x += 3;
    y += 3;
    attempts += 1;
  }
  return { x: round1(x), y: round1(y), w };
}

/** Kopian hamnar snett nedanför originalet, som i de flesta ritprogram. */
export const DUPLICATE_OFFSET = 2;

// ── Grupper ────────────────────────────────────────────────────────────────
//
// En grupp är bara ett gemensamt namn i propen `group`. Att markera en medlem
// markerar hela gruppen, så att den flyttas, ordnas och justeras som ett.

/** Utöka en markering med alla medlemmar i de markerade objektens grupper. */
export function expandGroups(overlays: ParsedComponent[], indices: number[]): number[] {
  const groups = new Set(
    indices.map((i) => overlays[i]?.props.group).filter((g): g is string => typeof g === "string" && g !== ""),
  );
  if (groups.size === 0) return indices;
  const result = [...indices];
  overlays.forEach((overlay, i) => {
    const g = overlay.props.group;
    if (typeof g === "string" && groups.has(g) && !result.includes(i)) result.push(i);
  });
  return result;
}

/** Första lediga gruppnamnet: g1, g2 … */
export function newGroupId(overlays: ParsedComponent[]): string {
  const taken = new Set(overlays.map((o) => o.props.group).filter((g) => typeof g === "string"));
  let n = 1;
  while (taken.has(`g${n}`)) n += 1;
  return `g${n}`;
}

// ── Beskärning på duken ────────────────────────────────────────────────────
//
// I beskärningsläget finns två rektanglar i slidens procent: ramen (det som
// syns, objektets x/y/width/height) och hela bilden bakom den. Utsnittet är
// ramens läge i bilden. Att panorera flyttar bilden under ramen; att dra i
// ramens kanter ändrar vad som syns utan att bilden skalas; zoom skalar
// bilden runt ramens mitt. Bilden får aldrig lämna ramen otäckt.

/** Hela bilden bakom ramen, givet utsnittet. */
export function fullImageRect(frame: Bounds, crop: Crop): Bounds {
  const w = frame.w / crop.w;
  const h = frame.h / crop.h;
  return { x: frame.x - crop.x * w, y: frame.y - crop.y * h, w, h };
}

/** Utsnittet som ramen skär ur bilden. */
export function cropFromFrame(frame: Bounds, image: Bounds): Crop {
  const x = clamp((frame.x - image.x) / image.w, 0, 1);
  const y = clamp((frame.y - image.y) / image.h, 0, 1);
  return {
    x,
    y,
    w: clamp(frame.w / image.w, 0.01, 1 - x),
    h: clamp(frame.h / image.h, 0.01, 1 - y),
  };
}

/**
 * Det utsnitt som `object-fit: cover` visar i en ram: bilden fyller ramen
 * och det som inte får plats klipps lika mycket på båda sidor. Så ser en
 * bild med height men utan crop ut i dag — den här gör det till ett
 * uttryckligt utsnitt så att ramen kan ändras utan att bilden förvrängs.
 */
export function coverCrop(frameW: number, frameH: number, naturalAspect: number): Crop {
  if (frameW <= 0 || frameH <= 0 || naturalAspect <= 0) return { x: 0, y: 0, w: 1, h: 1 };
  const frameAspect = (frameW * SLIDE_ASPECT) / frameH;
  if (frameAspect > naturalAspect) {
    const h = naturalAspect / frameAspect;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = frameAspect / naturalAspect;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

/** Flytta bilden så att den täcker hela ramen. */
export function coverFrame(image: Bounds, frame: Bounds): Bounds {
  let { x, y } = image;
  if (x > frame.x) x = frame.x;
  if (x + image.w < frame.x + frame.w) x = frame.x + frame.w - image.w;
  if (y > frame.y) y = frame.y;
  if (y + image.h < frame.y + frame.h) y = frame.y + frame.h - image.h;
  return { ...image, x, y };
}

/** Panorera bilden under ramen. */
export function panImage(frame: Bounds, image: Bounds, dx: number, dy: number): Bounds {
  return coverFrame({ ...image, x: image.x + dx, y: image.y + dy }, frame);
}

/**
 * Zooma bilden runt ramens mitt. Bilden får aldrig bli mindre än ramen —
 * då syns kanten — så faktorn stoppas där.
 */
export function zoomImage(frame: Bounds, image: Bounds, factor: number): Bounds {
  const minFactor = Math.max(frame.w / image.w, frame.h / image.h);
  const f = Math.max(factor, minFactor);
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const next = {
    w: image.w * f,
    h: image.h * f,
    x: cx - (cx - image.x) * f,
    y: cy - (cy - image.y) * f,
  };
  return coverFrame(next, frame);
}

/** Håll ramen inom bilden när dess kanter dras (bilden ligger still). */
export function clampFrameToImage(frame: Bounds, image: Bounds): Bounds {
  const x = clamp(frame.x, image.x, image.x + image.w - 0.5);
  const y = clamp(frame.y, image.y, image.y + image.h - 0.5);
  const w = clamp(frame.w, 0.5, image.x + image.w - x);
  const h = clamp(frame.h, 0.5, image.y + image.h - y);
  return { x, y, w, h };
}

// ── Storleksändring av roterade rutor ──────────────────────────────────────

/**
 * Dra i ett handtag på en roterad ruta. Pekarens rörelse räknas om till
 * rutans egna axlar och kanten mitt emot handtaget står still på skärmen,
 * som i ritprogram. Utan rotation ger den exakt samma svar som resizeBox.
 *
 * Räkningen sker i "pixelproportioner": x-procent vägs med slidens 16:9 så
 * att rotationen blir geometriskt rätt, och går sedan tillbaka till procent.
 */
export function resizeBoxRotated(
  box: ObjectBox,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  opts: ResizeOptions = {},
): ObjectBox {
  if (Math.abs(box.rotation) < 0.01) return resizeBox(box, handle, dx, dy, opts);
  const theta = (box.rotation * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  // Pekarens delta i rutans lokala axlar (R(−θ)·d), i pixelproportioner.
  const dxp = dx * SLIDE_ASPECT;
  const lx = dxp * cos + dy * sin;
  const ly = -dxp * sin + dy * cos;
  const local = resizeBox({ ...box, rotation: 0 }, handle, lx / SLIDE_ASPECT, ly, opts);
  // Ankaret (kanten/hörnet mitt emot, eller mitten på en fri axel) och den
  // nya mitten, båda relativt den gamla mitten i lokala pixelproportioner.
  const ax = ((-sx * box.w) / 2) * SLIDE_ASPECT;
  const ay = (-sy * box.h) / 2;
  const nx = ((sx * local.w) / 2) * SLIDE_ASPECT;
  const ny = (sy * local.h) / 2;
  const rot = (px: number, py: number) => ({ x: px * cos - py * sin, y: px * sin + py * cos });
  const centre = { x: (box.x + box.w / 2) * SLIDE_ASPECT, y: box.y + box.h / 2 };
  const anchor = rot(ax, ay);
  const next = rot(nx, ny);
  const cx = centre.x + anchor.x + next.x;
  const cy = centre.y + anchor.y + next.y;
  return { ...box, x: cx / SLIDE_ASPECT - local.w / 2, y: cy - local.h / 2, w: local.w, h: local.h };
}

// ── Klicksteg ──────────────────────────────────────────────────────────────
//
// `step` = antal klick innan objektet syns (0 eller inget = från början),
// `until` = klicket då det försvinner. Spelarens stegsystem tar max av allt
// som registrerar steg, så objekten ger sliden de lägen de behöver.

/** Objektets synliga intervall: från `step` till `until` (null = aldrig). */
export function stepRange(step: PropValue | undefined, until: PropValue | undefined): { from: number; to: number | null } {
  const from = Math.max(0, Math.trunc(Number(step)) || 0);
  const toNum = until === undefined || until === null || until === "" ? NaN : Number(until);
  const to = Number.isFinite(toNum) && toNum > from ? Math.trunc(toNum) : null;
  return { from, to };
}

/** "efter klick 2", "till klick 4", "klick 2–4" — eller null när objektet alltid syns. */
export function stepLabel(props: Record<string, PropValue>): string | null {
  const { from, to } = stepRange(props.step, props.until);
  if (from === 0 && to === null) return null;
  if (to === null) return `efter klick ${from}`;
  if (from === 0) return `till klick ${to}`;
  return `klick ${from}–${to}`;
}
