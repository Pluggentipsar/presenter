"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { ParsedComponent, PropValue } from "@/lib/mdx-parser";
import {
  alignBoxes,
  boundsOf,
  boxesInRect,
  expandGroups,
  newGroupId,
  distributeBoxes,
  formatPercent,
  isTransformable,
  keepsAspect,
  moveBox,
  nudgeBox,
  objectKind,
  objectLabel,
  parsePercent,
  resizeBox,
  resizeBoxRotated,
  rotationFromPointer,
  snapBox,
  snapEdge,
  snapTargets,
  stepLabel,
  textSizeForWidth,
  clampFrameToImage,
  coverCrop,
  cropFromFrame,
  cropImageStyle,
  formatCrop,
  fullImageRect,
  panImage,
  parseCrop,
  zoomImage,
  NUDGE_STEP,
  NUDGE_STEP_LARGE,
  SLIDE_ASPECT,
  type Bounds,
  type AlignMode,
  type ObjectBox,
  type ObjectKind,
  type ResizeHandle,
  type SnapTargets,
} from "@/lib/objects";
import { resolveSizeCqw } from "@/templates/FloatingText";

/**
 * Objektlagret — markering, flytt, storlek, rotation och skrivning för
 * slidens fria objekt (FloatingImage, FloatingText, FloatingVideo …).
 *
 * Ligger som ett eget lager inne i den skalade duken (.presentation-root),
 * i slidens egna procentkoordinater. Objekten hittas i DOM:en via
 * data-object-index, mäts (offset-värden påverkas inte av rotation) och får
 * sina handtag ritade här — komponenterna själva ritar bara sig. Under en
 * gest skrivs CSS direkt på elementet; vid släpp skrivs props tillbaka, i EN
 * skrivning per gest, så ett Ctrl+Z tar tillbaka hela draget.
 *
 * Handtagens storlek räknas om med --editor-scale så att de är lika stora
 * oavsett zoom.
 */

export interface ObjectPatch {
  index: number;
  /** undefined lämnar propen orörd, null tar bort den. */
  props: Record<string, PropValue | null | undefined>;
  /** null tar bort markdown-innehållet (när texten flyttar in i text-propen). */
  content?: string | null;
}

interface ObjectLayerProps {
  rootRef: RefObject<HTMLDivElement | null>;
  overlays: ParsedComponent[];
  selection: number[];
  onSelectionChange: (indices: number[]) => void;
  editingIndex: number | null;
  onEditingChange: (index: number | null) => void;
  /** Skärmpixlar per dukpixel. */
  scale: number;
  /** Dukens mått i oskalade pixlar. */
  canvas: { w: number; h: number };
  onPatch: (patches: ObjectPatch[]) => void;
  onDelete: (indices: number[]) => void;
  onDuplicate: (indices: number[]) => void;
  onStepZ: (indices: number[], direction: 1 | -1, extreme: boolean) => void;
  onReplaceMedia: (index: number) => void;
  onCopy: (indices: number[]) => void;
  /** Oskalad yta över duken där verktygsraden ritas. */
  toolbarHost: HTMLElement | null;
}

const SNAP_PX = 6;
const DRAG_THRESHOLD_PX = 3;

/** Panelen ber lagret öppna beskärningsläget för ett objekt. */
export const CROP_EVENT = "presenter-object-crop";

/** Beskärningsläget: ramen (objektets ruta) och hela bilden bakom den, i slidens procent. */
interface CropState {
  index: number;
  frame: Bounds;
  image: Bounds;
  naturalAspect: number;
  /** Elementets stilar före läget, så att Esc kan återställa dem exakt. */
  original: { wrapper: string; img: string };
}

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

/** Vilka handtag ett objektslag har. Text har automatisk höjd: inga i höjdled. */
function handlesFor(kind: ObjectKind): ResizeHandle[] {
  if (kind === "text") return ["nw", "ne", "e", "se", "sw", "w"];
  return HANDLES;
}

function parseRotation(el: HTMLElement): number {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform ?? "");
  return m ? parseFloat(m[1]) : 0;
}

/** Objektets ruta i procent av duken, mätt ur layouten (opåverkad av rotation). */
function measureBox(root: HTMLElement, el: HTMLElement, canvas: { w: number; h: number }): ObjectBox {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root && root.contains(node)) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return {
    x: (x / canvas.w) * 100,
    y: (y / canvas.h) * 100,
    w: (el.offsetWidth / canvas.w) * 100,
    h: (el.offsetHeight / canvas.h) * 100,
    rotation: parseRotation(el),
  };
}

function objectElement(root: HTMLElement | null, index: number): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`[data-object-index="${index}"]`) ?? null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function ObjectLayer({
  rootRef,
  overlays,
  selection,
  onSelectionChange,
  editingIndex,
  onEditingChange,
  scale,
  canvas,
  onPatch,
  onDelete,
  onDuplicate,
  onStepZ,
  onReplaceMedia,
  onCopy,
  toolbarHost,
}: ObjectLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<number, ObjectBox>>({});
  // Under en gest: de flyttade rutorna, hjälplinjerna och en levande rotation.
  const [live, setLive] = useState<Record<number, ObjectBox> | null>(null);
  const [guides, setGuides] = useState<SnapTargets>({ v: [], h: [] });
  const [gesture, setGesture] = useState<"move" | "resize" | "rotate" | null>(null);
  // Markeringsramen medan man drar på tom yta.
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  // Beskärningsläget. Under läget skrivs stilarna direkt på elementet; vid
  // Klar återställs de och props skrivs, vid Esc återställs de bara.
  const [cropping, setCropping] = useState<CropState | null>(null);
  const croppingRef = useRef<CropState | null>(null);
  const updateCropping = useCallback((next: CropState | null) => {
    croppingRef.current = next;
    setCropping(next);
  }, []);

  // Gesterna läser senaste markering och mått ur refs (lyssnarna lever längre än en render).
  const selectionRef = useRef(selection);
  const boxesRef = useRef(boxes);
  useLayoutEffect(() => {
    selectionRef.current = selection;
    boxesRef.current = boxes;
  }, [selection, boxes]);

  // Markeringen skrivs i refen direkt, så att två snabba klick (eller klick
  // följt av Shift-klick) räknar på det senast begärda, inte det senast ritade.
  const select = useCallback(
    (next: number[]) => {
      selectionRef.current = next;
      onSelectionChange(next);
    },
    [onSelectionChange],
  );

  /* ── Mätning ─────────────────────────────────────────────────────────── */

  const refresh = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const next: Record<number, ObjectBox> = {};
    overlays.forEach((overlay, index) => {
      if (!isTransformable(overlay.tag)) return;
      const el = objectElement(root, index);
      if (el) next[index] = measureBox(root, el, canvas);
    });
    setBoxes(next);
  }, [canvas, overlays, rootRef]);

  // Mätningen går via ResizeObserver: den ger en första avläsning så fort ett
  // element observeras, och sedan när bilder laddats in eller text brutits om.
  // Prenumerationen görs om när objekten, skalan eller skrivläget ändras, så
  // flyttade objekt mäts om utan att effekten själv sätter state.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => refresh());
    root.querySelectorAll<HTMLElement>("[data-object-index]").forEach((el) => observer.observe(el));
    observer.observe(root);
    return () => observer.disconnect();
  }, [refresh, overlays, rootRef, scale, editingIndex]);

  // Markerade objekt får ett attribut så CSS kan skilja hover från markering.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-object-index]").forEach((el) => {
      const index = Number(el.dataset.objectIndex);
      el.toggleAttribute("data-object-selected", selection.includes(index));
    });
  }, [selection, overlays, rootRef]);

  /* ── Hjälpare ────────────────────────────────────────────────────────── */

  const pctPerPx = useCallback(
    () => ({ x: 100 / (canvas.w * scale), y: 100 / (canvas.h * scale) }),
    [canvas, scale],
  );

  const applyLive = useCallback(
    (next: Record<number, ObjectBox>, withSize: boolean) => {
      const root = rootRef.current;
      if (!root) return;
      for (const [key, box] of Object.entries(next)) {
        const el = objectElement(root, Number(key));
        if (!el) continue;
        el.style.left = `${box.x}%`;
        el.style.top = `${box.y}%`;
        if (withSize) {
          el.style.width = `${box.w}%`;
        }
      }
      setLive(next);
    },
    [rootRef],
  );

  const commitBoxes = useCallback(
    (next: Record<number, ObjectBox>, fields: Array<"x" | "y" | "w" | "h" | "rotation">, extra: Record<number, Record<string, PropValue | null>> = {}) => {
      const patches: ObjectPatch[] = Object.entries(next).map(([key, box]) => {
        const index = Number(key);
        const props: Record<string, PropValue | null> = { ...(extra[index] ?? {}) };
        if (fields.includes("x")) props.x = formatPercent(box.x);
        if (fields.includes("y")) props.y = formatPercent(box.y);
        if (fields.includes("w")) props.width = formatPercent(box.w);
        if (fields.includes("h")) props.height = formatPercent(box.h);
        if (fields.includes("rotation")) props.rotation = Math.round(box.rotation) === 0 ? null : Math.round(box.rotation);
        return { index, props };
      });
      onPatch(patches);
    },
    [onPatch],
  );

  const targetsExcluding = useCallback(
    (indices: number[]) => {
      const others = Object.entries(boxesRef.current)
        .filter(([key]) => !indices.includes(Number(key)))
        .map(([, box]) => box);
      return snapTargets(others);
    },
    [],
  );

  /* ── Flytt ───────────────────────────────────────────────────────────── */

  const beginMove = useCallback(
    (e: PointerEvent, primary: number, indices: number[]) => {
      const startBoxes: Record<number, ObjectBox> = {};
      for (const i of indices) if (boxesRef.current[i]) startBoxes[i] = boxesRef.current[i];
      if (!startBoxes[primary]) return;
      const start = { x: e.clientX, y: e.clientY };
      const unit = pctPerPx();
      const targets = targetsExcluding(indices);
      let moved = false;
      let lastLive: Record<number, ObjectBox> | null = null;

      const onMove = (mv: PointerEvent) => {
        const dxPx = mv.clientX - start.x;
        const dyPx = mv.clientY - start.y;
        if (!moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
        if (!moved) {
          moved = true;
          setGesture("move");
        }
        let dx = dxPx * unit.x;
        let dy = dyPx * unit.y;
        // Shift låser till en axel.
        if (mv.shiftKey) {
          if (Math.abs(dxPx) > Math.abs(dyPx)) dy = 0;
          else dx = 0;
        }
        let nextGuides: SnapTargets = { v: [], h: [] };
        if (!mv.altKey) {
          const movedPrimary = moveBox(startBoxes[primary], dx, dy);
          const snapped = snapBox(movedPrimary, targets, SNAP_PX * unit.x, SNAP_PX * unit.y);
          dx += snapped.box.x - movedPrimary.x;
          dy += snapped.box.y - movedPrimary.y;
          nextGuides = snapped.guides;
        }
        const next: Record<number, ObjectBox> = {};
        for (const [key, box] of Object.entries(startBoxes)) next[Number(key)] = moveBox(box, dx, dy);
        lastLive = next;
        applyLive(next, false);
        setGuides(nextGuides);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGesture(null);
        setGuides({ v: [], h: [] });
        if (moved && lastLive) commitBoxes(lastLive, ["x", "y"]);
        setLive(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [applyLive, commitBoxes, pctPerPx, targetsExcluding],
  );

  /* ── Storlek ─────────────────────────────────────────────────────────── */

  const beginResize = useCallback(
    (e: ReactPointerEvent, index: number, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();
      const start = boxesRef.current[index];
      const overlay = overlays[index];
      if (!start || !overlay) return;
      const kind = objectKind(overlay.tag);
      const hasHeight = parsePercent(overlay.props.height) !== null || typeof overlay.props.height === "string";
      const startPointer = { x: e.clientX, y: e.clientY };
      const unit = pctPerPx();
      const targets = targetsExcluding([index]);
      const startSize = kind === "text" ? resolveSizeCqw(overlay.props.size as string | number | undefined) : 0;
      const textEl = kind === "text" ? objectElement(rootRef.current, index)?.querySelector<HTMLElement>("[data-object-text]") ?? null : null;
      const sideways = handle === "e" || handle === "w";
      // En bild med ram (height): kanterna avslöjar mer eller mindre av bilden
      // medan den ligger still; hörnen skalar ram och bild tillsammans. Så
      // förvrängs aldrig en beskuren bild.
      const imgEl = kind === "image" ? objectElement(rootRef.current, index)?.querySelector<HTMLImageElement>("img") ?? null : null;
      const framed = kind === "image" && hasHeight && Boolean(imgEl?.naturalWidth);
      const frameCrop = framed && imgEl ? (parseCrop(overlay.props.crop) ?? coverCrop(start.w, start.h, imgEl.naturalWidth / imgEl.naturalHeight)) : null;
      const frameImage = frameCrop ? fullImageRect({ x: start.x, y: start.y, w: start.w, h: start.h }, frameCrop) : null;
      const imgStyle = imgEl ? imgEl.style.cssText : "";
      let moved = false;
      let lastBox: ObjectBox | null = null;
      let lastSize: number | null = null;
      let lastCrop: string | null = null;
      let usedHeight = false;

      const onMove = (mv: PointerEvent) => {
        const dxPx = mv.clientX - startPointer.x;
        const dyPx = mv.clientY - startPointer.y;
        if (!moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
        if (!moved) {
          moved = true;
          setGesture("resize");
        }
        const dx = dxPx * unit.x;
        const dy = dyPx * unit.y;
        // Bild och video håller proportionen; Shift släpper. Text har
        // automatisk höjd och håller aldrig. En ramad bild: hörn håller alltid,
        // kanter drar ramen över den stillaliggande bilden.
        const corner = handle.length === 2;
        const keepAspect = kind === "text" ? false : framed ? corner : keepsAspect(kind) !== mv.shiftKey;
        // Roterade rutor räknas i sina egna axlar; snäpp och ramklämning gäller bara oroterade.
        const rotated = Math.abs(start.rotation) > 0.01;
        let box = rotated
          ? resizeBoxRotated(start, handle, dx, dy, { keepAspect, minW: 2, minH: 1 })
          : resizeBox(start, handle, dx, dy, { keepAspect, minW: 2, minH: 1 });
        if (framed && frameImage && !corner && !rotated) box = { ...box, ...clampFrameToImage(box, frameImage) };
        const nextGuides: SnapTargets = { v: [], h: [] };
        if (!keepAspect && !mv.altKey && !rotated) {
          if (handle.includes("e")) {
            const s = snapEdge(box.x + box.w, targets.v, SNAP_PX * unit.x);
            if (s.guide !== null) {
              box = { ...box, w: Math.max(2, s.value - box.x) };
              nextGuides.v.push(s.guide);
            }
          } else if (handle.includes("w")) {
            const s = snapEdge(box.x, targets.v, SNAP_PX * unit.x);
            if (s.guide !== null) {
              box = { ...box, x: s.value, w: Math.max(2, box.x + box.w - s.value) };
              nextGuides.v.push(s.guide);
            }
          }
          if (handle.includes("s")) {
            const s = snapEdge(box.y + box.h, targets.h, SNAP_PX * unit.y);
            if (s.guide !== null) {
              box = { ...box, h: Math.max(1, s.value - box.y) };
              nextGuides.h.push(s.guide);
            }
          } else if (handle.includes("n")) {
            const s = snapEdge(box.y, targets.h, SNAP_PX * unit.y);
            if (s.guide !== null) {
              box = { ...box, y: s.value, h: Math.max(1, box.y + box.h - s.value) };
              nextGuides.h.push(s.guide);
            }
          }
        }
        const el = objectElement(rootRef.current, index);
        if (el) {
          el.style.left = `${box.x}%`;
          el.style.top = `${box.y}%`;
          el.style.width = `${box.w}%`;
          // Höjd skrivs bara när den faktiskt styrs: en bild/video som redan
          // har en ram (height), eller ett fritt drag (Shift, eller en form)
          // som gör en ram av rutan. Med bevarad proportion följer höjden
          // bilden själv och behöver inte stå i filen.
          const wantsHeight = kind !== "text" && (hasHeight || !keepAspect);
          if (wantsHeight) {
            el.style.height = `${box.h}%`;
            usedHeight = true;
          }
          if (framed && frameImage && imgEl && !corner) {
            const crop = cropFromFrame(box, frameImage);
            const st = cropImageStyle(crop);
            imgEl.style.position = "absolute";
            imgEl.style.maxWidth = "none";
            imgEl.style.left = st.left;
            imgEl.style.top = st.top;
            imgEl.style.width = st.width;
            imgEl.style.height = st.height;
            imgEl.style.objectFit = "fill";
            el.style.overflow = "hidden";
            lastCrop = formatCrop(crop);
          }
          if (textEl && sideways) {
            // Sidokanterna bryter om raderna men behåller bokstävernas storlek.
            lastSize = textSizeForWidth(startSize, start.w, box.w);
            textEl.style.fontSize = `clamp(0.6rem, ${lastSize}cqw, 12rem)`;
          }
        }
        lastBox = box;
        setLive({ [index]: box });
        setGuides(nextGuides);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGesture(null);
        setGuides({ v: [], h: [] });
        if (moved && lastBox) {
          const fields: Array<"x" | "y" | "w" | "h"> = ["x", "y", "w"];
          if (usedHeight) fields.push("h");
          const extra: Record<number, Record<string, PropValue | null>> = {};
          if (lastSize !== null) extra[index] = { size: String(lastSize) };
          if (lastCrop !== null) {
            // Stilarna som skrevs under draget återställs innan React ritar om från props.
            if (imgEl) imgEl.style.cssText = imgStyle;
            extra[index] = { ...(extra[index] ?? {}), crop: lastCrop };
          }
          commitBoxes({ [index]: lastBox }, fields, extra);
        }
        setLive(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [commitBoxes, overlays, pctPerPx, rootRef, targetsExcluding],
  );

  /* ── Rotation ────────────────────────────────────────────────────────── */

  const beginRotate = useCallback(
    (e: ReactPointerEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const start = boxesRef.current[index];
      const el = objectElement(rootRef.current, index);
      if (!start || !el) return;
      const rect = el.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      let latest = start.rotation;
      setGesture("rotate");
      const onMove = (mv: PointerEvent) => {
        latest = rotationFromPointer(center, { x: mv.clientX, y: mv.clientY }, mv.shiftKey);
        el.style.transform = `rotate(${latest}deg)`;
        setLive({ [index]: { ...start, rotation: latest } });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGesture(null);
        commitBoxes({ [index]: { ...start, rotation: latest } }, ["rotation"]);
        setLive(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [commitBoxes, rootRef],
  );

  /* ── Beskärning ──────────────────────────────────────────────────────── */

  /** Ramens ruta och hela bilden bakom, båda i slidens procent. */
  const applyCropLive = useCallback(
    (state: CropState) => {
      const el = objectElement(rootRef.current, state.index);
      const img = el?.querySelector<HTMLImageElement>("img");
      if (!el || !img) return;
      const { frame, image } = state;
      el.style.left = `${frame.x}%`;
      el.style.top = `${frame.y}%`;
      el.style.width = `${frame.w}%`;
      el.style.height = `${frame.h}%`;
      el.style.overflow = "hidden";
      const st = cropImageStyle(cropFromFrame(frame, image));
      img.style.position = "absolute";
      img.style.maxWidth = "none";
      img.style.left = st.left;
      img.style.top = st.top;
      img.style.width = st.width;
      img.style.height = st.height;
      img.style.objectFit = "fill";
    },
    [rootRef],
  );

  const restoreCropStyles = useCallback(
    (state: CropState) => {
      const el = objectElement(rootRef.current, state.index);
      const img = el?.querySelector<HTMLImageElement>("img");
      if (el) el.style.cssText = state.original.wrapper;
      if (img) img.style.cssText = state.original.img;
    },
    [rootRef],
  );

  /**
   * Gå in i beskärningsläget för en bild. En bild utan ram får sin mätta ruta
   * som ram och hela bilden bakom; en bild med ram men utan utsnitt (gammal
   * cover-beskärning) får det utsnitt cover visade; ett sparat utsnitt läses.
   */
  const startCrop = useCallback(
    (index: number) => {
      const overlay = overlays[index];
      const el = objectElement(rootRef.current, index);
      const img = el?.querySelector<HTMLImageElement>("img");
      const box = boxesRef.current[index];
      if (!overlay || !el || !img || !box || objectKind(overlay.tag) !== "image" || overlay.props.locked) return;
      if (!img.naturalWidth || !img.naturalHeight) return;
      const naturalAspect = img.naturalWidth / img.naturalHeight;
      const frame: Bounds = { x: box.x, y: box.y, w: box.w, h: box.h };
      const hasHeight = typeof overlay.props.height === "string" && overlay.props.height !== "";
      const crop = hasHeight ? (parseCrop(overlay.props.crop) ?? coverCrop(frame.w, frame.h, naturalAspect)) : null;
      const image = crop ? fullImageRect(frame, crop) : { ...frame };
      const state: CropState = {
        index,
        frame,
        image,
        naturalAspect,
        original: { wrapper: el.style.cssText, img: img.style.cssText },
      };
      onEditingChange(null);
      select([index]);
      updateCropping(state);
      applyCropLive(state);
    },
    [applyCropLive, onEditingChange, select, overlays, rootRef, updateCropping],
  );

  /** Klar: återställ stilarna och skriv ram + utsnitt som props. */
  const finishCrop = useCallback(() => {
    const state = croppingRef.current;
    if (!state) return;
    restoreCropStyles(state);
    const { frame, image } = state;
    const crop = cropFromFrame(frame, image);
    const full = crop.x < 0.001 && crop.y < 0.001 && crop.w > 0.999 && crop.h > 0.999;
    onPatch([
      {
        index: state.index,
        props: {
          x: formatPercent(frame.x),
          y: formatPercent(frame.y),
          width: formatPercent(frame.w),
          height: full ? null : formatPercent(frame.h),
          crop: full ? null : formatCrop(crop),
        },
      },
    ]);
    updateCropping(null);
  }, [onPatch, restoreCropStyles, updateCropping]);

  const cancelCrop = useCallback(() => {
    const state = croppingRef.current;
    if (!state) return;
    restoreCropStyles(state);
    updateCropping(null);
  }, [restoreCropStyles, updateCropping]);

  const zoomCropBy = useCallback(
    (factor: number) => {
      const state = croppingRef.current;
      if (!state) return;
      const next = { ...state, image: zoomImage(state.frame, state.image, factor) };
      updateCropping(next);
      applyCropLive(next);
    },
    [applyCropLive, updateCropping],
  );

  /** Hela bilden i ramens bredd, obeskuren. */
  const resetCrop = useCallback(() => {
    const state = croppingRef.current;
    if (!state) return;
    const frame: Bounds = { x: state.frame.x, y: state.frame.y, w: state.frame.w, h: (state.frame.w * SLIDE_ASPECT) / state.naturalAspect };
    const next = { ...state, frame, image: { ...frame } };
    updateCropping(next);
    applyCropLive(next);
  }, [applyCropLive, updateCropping]);

  /** Dra bilden under ramen. */
  const beginPan = useCallback(
    (e: ReactPointerEvent) => {
      const state = croppingRef.current;
      if (!state || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const start = { x: e.clientX, y: e.clientY };
      const unit = pctPerPx();
      const image0 = state.image;
      setGesture("move");
      const onMove = (mv: PointerEvent) => {
        const current = croppingRef.current;
        if (!current) return;
        const next = { ...current, image: panImage(current.frame, image0, (mv.clientX - start.x) * unit.x, (mv.clientY - start.y) * unit.y) };
        updateCropping(next);
        applyCropLive(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGesture(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [applyCropLive, pctPerPx, updateCropping],
  );

  /** Dra i ramens kanter: bilden ligger still, mer eller mindre av den syns. */
  const beginCropResize = useCallback(
    (e: ReactPointerEvent, handle: ResizeHandle) => {
      const state = croppingRef.current;
      if (!state || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const start = { x: e.clientX, y: e.clientY };
      const unit = pctPerPx();
      const startBox: ObjectBox = { ...state.frame, rotation: 0 };
      setGesture("resize");
      const onMove = (mv: PointerEvent) => {
        const current = croppingRef.current;
        if (!current) return;
        const box = resizeBox(startBox, handle, (mv.clientX - start.x) * unit.x, (mv.clientY - start.y) * unit.y, { keepAspect: false, minW: 2, minH: 1 });
        const next = { ...current, frame: clampFrameToImage(box, current.image) };
        updateCropping(next);
        applyCropLive(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setGesture(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [applyCropLive, pctPerPx, updateCropping],
  );

  // Panelens "Beskär…" når hit via ett fönsterhändelse — panelen vet inget om duken.
  useEffect(() => {
    const onCropRequest = (e: Event) => {
      const index = (e as CustomEvent<{ index: number }>).detail?.index;
      if (typeof index === "number") startCrop(index);
    };
    window.addEventListener(CROP_EVENT, onCropRequest);
    return () => window.removeEventListener(CROP_EVENT, onCropRequest);
  }, [startCrop]);

  /* ── Grupper ─────────────────────────────────────────────────────────── */

  const groupSelection = useCallback(() => {
    const current = selectionRef.current;
    if (current.length < 2) return;
    const id = newGroupId(overlays);
    onPatch(current.map((index) => ({ index, props: { group: id } })));
  }, [onPatch, overlays]);

  const ungroupSelection = useCallback(() => {
    const current = selectionRef.current.filter((i) => typeof overlays[i]?.props.group === "string");
    if (current.length === 0) return;
    onPatch(current.map((index) => ({ index, props: { group: null } })));
  }, [onPatch, overlays]);

  /* ── Markeringsram ───────────────────────────────────────────────────── */

  /**
   * Dra på tom yta: en ram som markerar alla objekt den rör. Shift lägger till
   * den markering som redan finns. Startar först efter några pixlar, så ett
   * vanligt klick på sliden fortfarande bara släpper markeringen.
   */
  const beginMarquee = useCallback(
    (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const toPct = (cx: number, cy: number) => ({ x: ((cx - rect.left) / rect.width) * 100, y: ((cy - rect.top) / rect.height) * 100 });
      const start = toPct(e.clientX, e.clientY);
      const startPx = { x: e.clientX, y: e.clientY };
      const keep = e.shiftKey ? selectionRef.current : [];
      let active = false;
      const onMove = (mv: PointerEvent) => {
        if (!active && Math.hypot(mv.clientX - startPx.x, mv.clientY - startPx.y) < 4) return;
        if (!active) {
          active = true;
          document.body.style.userSelect = "none";
          window.getSelection()?.removeAllRanges();
        }
        mv.preventDefault();
        const p = toPct(mv.clientX, mv.clientY);
        const box: Bounds = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
        setMarquee(box);
        const entries = Object.entries(boxesRef.current).filter(([key]) => !overlays[Number(key)]?.props.locked);
        const hits = boxesInRect(
          entries.map(([, b]) => b),
          box,
        ).map((i) => Number(entries[i][0]));
        select(Array.from(new Set([...keep, ...hits])));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
        setMarquee(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [select, overlays, rootRef],
  );

  /* ── Markering via klick på duken ────────────────────────────────────── */

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Handtag och verktygsrad sköter sig själva.
      if (layerRef.current?.contains(target)) return;
      if (croppingRef.current) {
        // Klick utanför ramen avslutar beskärningen, som Klar.
        e.preventDefault();
        e.stopPropagation();
        finishCrop();
        return;
      }
      const objectEl = target.closest<HTMLElement>("[data-object-index]");
      if (objectEl && root.contains(objectEl)) {
        const index = Number(objectEl.dataset.objectIndex);
        if (editingIndex === index) return;
        if (objectEl.hasAttribute("data-object-locked")) {
          // Låst: går att markera (för panelen) men inte att dra.
          e.preventDefault();
          e.stopPropagation();
          select([index]);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (editingIndex !== null) onEditingChange(null);
        // En medlem i en grupp markerar hela gruppen (Shift växlar hela gruppen).
        const current = selectionRef.current;
        const members = expandGroups(overlays, [index]);
        let next: number[];
        if (e.shiftKey) {
          next = current.includes(index) ? current.filter((i) => !members.includes(i)) : [...current, ...members.filter((i) => !current.includes(i))];
        } else {
          next = current.includes(index) ? current : members;
        }
        select(next);
        if (next.includes(index)) beginMove(e, index, next);
        return;
      }
      // Klick på sliden utanför objekten: släpp markeringen (Shift behåller).
      if (!e.shiftKey && (selectionRef.current.length > 0 || editingIndex !== null)) {
        select([]);
        onEditingChange(null);
      }
      // Dra på tom yta blir en markeringsram — men inte över text som går att
      // redigera, kontroller eller media som själva tar emot pekaren.
      if (target.closest("edit-text, [contenteditable], input, textarea, select, button, a, video, iframe")) return;
      beginMarquee(e);
    };
    const onDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const objectEl = target?.closest<HTMLElement>("[data-object-index]");
      if (!objectEl || !root.contains(objectEl)) return;
      if (objectEl.hasAttribute("data-object-locked")) return;
      const index = Number(objectEl.dataset.objectIndex);
      if (objectEl.dataset.objectKind === "image") {
        e.preventDefault();
        e.stopPropagation();
        startCrop(index);
        return;
      }
      if (objectEl.dataset.objectKind !== "text") return;
      e.preventDefault();
      e.stopPropagation();
      select([index]);
      onEditingChange(index);
    };
    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("dblclick", onDoubleClick, true);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("dblclick", onDoubleClick, true);
    };
  }, [beginMarquee, beginMove, editingIndex, finishCrop, onEditingChange, select, overlays, rootRef, startCrop]);

  /* ── Tangentbord ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const current = selectionRef.current;
      if (current.length === 0 || editingIndex !== null) return;
      if (isTypingTarget(e.target)) return;
      const meta = e.ctrlKey || e.metaKey;
      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (croppingRef.current) {
        const state = croppingRef.current;
        if (e.key === "Enter") {
          stop();
          finishCrop();
        } else if (e.key === "Escape") {
          stop();
          cancelCrop();
        } else if (e.key === "+" || e.key === "=") {
          stop();
          zoomCropBy(1.15);
        } else if (e.key === "-") {
          stop();
          zoomCropBy(1 / 1.15);
        } else if (e.key.startsWith("Arrow")) {
          stop();
          const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          const next = { ...state, image: panImage(state.frame, state.image, dx, dy) };
          updateCropping(next);
          applyCropLive(next);
        }
        return;
      }
      if (e.key === "Escape") {
        stop();
        select([]);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        stop();
        onDelete(current);
        return;
      }
      if (e.key.startsWith("Arrow")) {
        const next: Record<number, ObjectBox> = {};
        for (const i of current) {
          const box = boxesRef.current[i];
          const moved = box ? nudgeBox(box, e.key, e.shiftKey) : null;
          if (moved) next[i] = moved;
        }
        if (Object.keys(next).length === 0) return;
        stop();
        commitBoxes(next, ["x", "y"]);
        return;
      }
      if (e.key === "Enter" && current.length === 1 && objectKind(overlays[current[0]]?.tag ?? "") === "text") {
        stop();
        onEditingChange(current[0]);
        return;
      }
      if (meta && (e.key === "d" || e.key === "D")) {
        stop();
        onDuplicate(current);
        return;
      }
      if (meta && (e.key === "]" || e.key === "[")) {
        stop();
        onStepZ(current, e.key === "]" ? 1 : -1, e.shiftKey);
        return;
      }
      // Kopiera/klipp ut objekten — om ingen text på sidan är markerad, då är det textens sak.
      if (meta && (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X")) {
        if (window.getSelection()?.toString()) return;
        stop();
        onCopy(current);
        if (e.key === "x" || e.key === "X") onDelete(current);
        return;
      }
      if (meta && (e.key === "g" || e.key === "G")) {
        stop();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [applyCropLive, cancelCrop, commitBoxes, editingIndex, finishCrop, groupSelection, onCopy, onDelete, onDuplicate, onEditingChange, select, onStepZ, overlays, ungroupSelection, updateCropping, zoomCropBy]);

  /* ── Verktygsradens läge ─────────────────────────────────────────────── */

  const selectedBoxes = useMemo(() => {
    const source = live ?? boxes;
    return selection.map((i) => source[i]).filter((b): b is ObjectBox => Boolean(b));
  }, [boxes, live, selection]);

  const toolbarVisible = Boolean(toolbarHost) && selection.length > 0 && !gesture && editingIndex === null;

  // Verktygsraden läggs ovanför markeringen (under den om det är trångt
  // upptill). Positionen skrivs direkt på elementet i en layout-effekt:
  // ingen state, inget extra varv, ingen blinkning.
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    const root = rootRef.current;
    if (!el || !root || !toolbarHost || !toolbarVisible) return;
    const hostRect = toolbarHost.getBoundingClientRect();
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const i of selection) {
      const target = objectElement(root, i);
      if (!target) continue;
      const r = target.getBoundingClientRect();
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!Number.isFinite(left)) {
      el.style.visibility = "hidden";
      return;
    }
    const centerX = (left + right) / 2 - hostRect.left;
    // Ett enda objekt har rotationshandtaget ovanför sig: lämna plats för det.
    const clearance = selection.length === 1 ? 52 : 14;
    const above = top - hostRect.top - clearance;
    const below = above < 56;
    el.style.left = `${Math.max(8, Math.min(hostRect.width - 8, centerX))}px`;
    el.style.top = `${below ? bottom - hostRect.top + 14 : above}px`;
    el.style.transform = below ? "translate(-50%, 0)" : "translate(-50%, -100%)";
    el.style.visibility = "visible";
  }, [toolbarHost, toolbarVisible, selection, boxes, rootRef, scale]);

  /* ── Skriv direkt i textrutan ────────────────────────────────────────── */

  const editing = editingIndex !== null ? overlays[editingIndex] : null;
  const editingBox = editingIndex !== null ? boxes[editingIndex] : undefined;

  /* ── Rendering ───────────────────────────────────────────────────────── */

  const hairline = `calc(1.5px / var(--editor-scale, 1))`;
  const handleSize = `calc(11px / var(--editor-scale, 1))`;
  const single = selection.length === 1 ? selection[0] : null;
  const singleOverlay = single !== null ? overlays[single] : null;
  const singleKind = singleOverlay ? objectKind(singleOverlay.tag) : null;
  const singleLocked = Boolean(singleOverlay?.props.locked);
  const bounds = selection.length > 1 ? boundsOf(selectedBoxes) : null;

  const layerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1000,
    fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
  };

  return (
    <>
      <div ref={layerRef} style={layerStyle} data-object-layer="">
        {/* Hjälplinjer */}
        {guides.v.map((x) => (
          <div
            key={`v${x}`}
            style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, width: hairline, background: "var(--verkstad-guide)", transform: "translateX(-50%)" }}
          />
        ))}
        {guides.h.map((y) => (
          <div
            key={`h${y}`}
            style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, height: hairline, background: "var(--verkstad-guide)", transform: "translateY(-50%)" }}
          />
        ))}

        {/* Markeringsramar (inte under beskärning — då ritas ramen nedan) */}
        {cropping ? null : selection.map((index) => {
          const box = (live ?? boxes)[index];
          if (!box) return null;
          const isSingle = single === index;
          const draggable = !overlays[index]?.props.locked && editingIndex !== index;
          return (
            <div
              key={index}
              data-selection-box=""
              onPointerDown={(e) => {
                // Ramen själv kan dras — så når man objekt som ligger bakom mallens innehåll.
                if (!draggable || e.button !== 0) return;
                if (isTypingTarget(e.target)) return;
                e.preventDefault();
                e.stopPropagation();
                beginMove(e.nativeEvent, index, selectionRef.current);
              }}
              onDoubleClick={(e) => {
                if (objectKind(overlays[index]?.tag ?? "") !== "text" || overlays[index]?.props.locked) return;
                e.preventDefault();
                e.stopPropagation();
                onEditingChange(index);
              }}
              style={{
                position: "absolute",
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                transform: `rotate(${box.rotation}deg)`,
                outline: `${hairline} solid var(--verkstad-accent)`,
                outlineOffset: `calc(1px / var(--editor-scale, 1))`,
                pointerEvents: draggable && editingIndex !== index ? "auto" : "none",
                cursor: gesture === "move" ? "grabbing" : "grab",
                boxSizing: "border-box",
              }}
            >
              {isSingle && !singleLocked && editingIndex !== index && singleKind ? (
                <>
                  {handlesFor(singleKind).map((handle) => (
                    <div
                      key={handle}
                      onPointerDown={(e) => beginResize(e, index, handle)}
                      title={handle.length === 2 ? "Dra för att ändra storlek · Shift växlar proportion" : "Dra kanten"}
                      style={{
                        position: "absolute",
                        width: handleSize,
                        height: handleSize,
                        background: "var(--verkstad-paper)",
                        border: `${hairline} solid var(--verkstad-accent)`,
                        borderRadius: handle.length === 2 ? "50%" : "2px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        pointerEvents: "auto",
                        cursor: HANDLE_CURSORS[handle],
                        ...handlePosition(handle, handleSize),
                      }}
                    />
                  ))}
                  {/* Rotation: handtaget ovanför rutan med en linje ner till kanten. */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: `calc(-22px / var(--editor-scale, 1))`,
                      width: hairline,
                      height: `calc(20px / var(--editor-scale, 1))`,
                      background: "var(--verkstad-accent)",
                      transform: "translateX(-50%)",
                    }}
                  />
                  <div
                    onPointerDown={(e) => beginRotate(e, index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onPatch([{ index, props: { rotation: null } }]);
                    }}
                    title="Dra för att rotera · Shift snäpper till 15° · dubbelklick nollställer"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: `calc(-34px / var(--editor-scale, 1))`,
                      width: `calc(14px / var(--editor-scale, 1))`,
                      height: `calc(14px / var(--editor-scale, 1))`,
                      transform: "translateX(-50%)",
                      background: gesture === "rotate" ? "var(--verkstad-accent)" : "var(--verkstad-paper)",
                      border: `${hairline} solid var(--verkstad-accent)`,
                      borderRadius: "50%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      pointerEvents: "auto",
                      cursor: "grab",
                    }}
                  />
                </>
              ) : null}
              {/* Klicksteget, när objektet har ett */}
              {!gesture && stepLabel(overlays[index]?.props ?? {}) ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: `calc(100% + 6px / var(--editor-scale, 1))`,
                    transform: `scale(calc(1 / var(--editor-scale, 1)))`,
                    transformOrigin: "top left",
                    background: "var(--verkstad-accent)",
                    color: "var(--verkstad-paper)",
                    fontSize: "10px",
                    lineHeight: 1,
                    padding: "3px 6px",
                    borderRadius: "3px",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  ▶ {stepLabel(overlays[index]?.props ?? {})}
                </div>
              ) : null}
              {/* Måttetiketten under en pågående gest */}
              {gesture && isSingle ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: `calc(100% + 8px / var(--editor-scale, 1))`,
                    transform: `translateX(-50%) scale(calc(1 / var(--editor-scale, 1)))`,
                    transformOrigin: "top center",
                    background: "var(--verkstad-ink)",
                    color: "var(--verkstad-paper)",
                    fontSize: "11px",
                    lineHeight: 1,
                    padding: "4px 7px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}
                >
                  {gesture === "rotate"
                    ? `${Math.round(box.rotation)}°`
                    : gesture === "resize"
                      ? `${formatPercent(box.w)} × ${formatPercent(box.h)}`
                      : `${formatPercent(box.x)} · ${formatPercent(box.y)}`}
                </div>
              ) : null}
            </div>
          );
        })}


        {/* Beskärningsläge: hela bilden bakom ramen (dämpad utanför), ramen med handtag */}
        {cropping
          ? (() => {
              const { frame, image } = cropping;
              const fx = ((frame.x - image.x) / image.w) * 100;
              const fy = ((frame.y - image.y) / image.h) * 100;
              const fw = (frame.w / image.w) * 100;
              const fh = (frame.h / image.h) * 100;
              const src = typeof overlays[cropping.index]?.props.src === "string" ? (overlays[cropping.index].props.src as string) : "";
              return (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    data-crop-ghost=""
                    onPointerDown={beginPan}
                    style={{
                      position: "absolute",
                      left: `${image.x}%`,
                      top: `${image.y}%`,
                      width: `${image.w}%`,
                      height: `${image.h}%`,
                      maxWidth: "none",
                      opacity: 0.45,
                      pointerEvents: "auto",
                      cursor: gesture === "move" ? "grabbing" : "grab",
                      userSelect: "none",
                      clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${fx}% ${fy}%, ${fx}% ${fy + fh}%, ${fx + fw}% ${fy + fh}%, ${fx + fw}% ${fy}%, ${fx}% ${fy}%)`,
                    }}
                  />
                  <div
                    data-crop-frame=""
                    onPointerDown={beginPan}
                    style={{
                      position: "absolute",
                      left: `${frame.x}%`,
                      top: `${frame.y}%`,
                      width: `${frame.w}%`,
                      height: `${frame.h}%`,
                      outline: `${hairline} solid var(--verkstad-accent)`,
                      boxShadow: `0 0 0 calc(1px / var(--editor-scale, 1)) var(--verkstad-paper)`,
                      pointerEvents: "auto",
                      cursor: gesture === "move" ? "grabbing" : "grab",
                      boxSizing: "border-box",
                    }}
                  >
                    {HANDLES.map((handle) => (
                      <div
                        key={handle}
                        onPointerDown={(e) => beginCropResize(e, handle)}
                        title="Dra kanten — bilden ligger still, mer eller mindre av den syns"
                        style={{
                          position: "absolute",
                          width: handleSize,
                          height: handleSize,
                          background: "var(--verkstad-paper)",
                          border: `${hairline} solid var(--verkstad-accent)`,
                          borderRadius: "2px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                          pointerEvents: "auto",
                          cursor: HANDLE_CURSORS[handle],
                          ...handlePosition(handle, handleSize),
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: `calc(100% + 8px / var(--editor-scale, 1))`,
                        transform: `translateX(-50%) scale(calc(1 / var(--editor-scale, 1)))`,
                        transformOrigin: "top center",
                        background: "var(--verkstad-ink)",
                        color: "var(--verkstad-paper)",
                        fontSize: "11px",
                        lineHeight: 1,
                        padding: "4px 7px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                        pointerEvents: "none",
                      }}
                    >
                      Beskär · dra bilden · dra kanterna · + − zoomar · Enter klar · Esc avbryter
                    </div>
                  </div>
                </>
              );
            })()
          : null}

        {/* Markeringsramen medan den dras */}
        {marquee ? (
          <div
            style={{
              position: "absolute",
              left: `${marquee.x}%`,
              top: `${marquee.y}%`,
              width: `${marquee.w}%`,
              height: `${marquee.h}%`,
              border: `${hairline} dashed var(--verkstad-accent)`,
              background: "color-mix(in srgb, var(--verkstad-accent) 10%, transparent)",
              boxSizing: "border-box",
            }}
          />
        ) : null}

        {/* Gemensam ram runt flera markerade */}
        {bounds ? (
          <div
            style={{
              position: "absolute",
              left: `${bounds.x}%`,
              top: `${bounds.y}%`,
              width: `${bounds.w}%`,
              height: `${bounds.h}%`,
              outline: `${hairline} dashed var(--verkstad-accent)`,
              outlineOffset: `calc(4px / var(--editor-scale, 1))`,
              opacity: 0.7,
            }}
          />
        ) : null}

        {/* Skriv i rutan */}
        {editing && editingBox && editingIndex !== null ? (
          <TextEditorBox
            key={editingIndex}
            index={editingIndex}
            overlay={editing}
            box={editingBox}
            rootRef={rootRef}
            onCommit={(text) => {
              const props: Record<string, PropValue | null> = { text };
              onPatch([{ index: editingIndex, props, content: editing.content != null ? null : undefined }]);
              onEditingChange(null);
            }}
            onCancel={() => onEditingChange(null)}
          />
        ) : null}
      </div>

      {/* Verktygsraden ligger utanför den skalade duken så att den alltid är läsbar. */}
      {toolbarHost && toolbarVisible
        ? createPortal(
            <ObjectToolbar
              elementRef={toolbarRef}
              overlays={overlays}
              selection={selection}
              boxes={boxes}
              onPatch={onPatch}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onStepZ={onStepZ}
              onReplaceMedia={onReplaceMedia}
              onEdit={(index) => onEditingChange(index)}
              cropping={Boolean(cropping)}
              onCrop={startCrop}
              onCropZoom={zoomCropBy}
              onCropReset={resetCrop}
              onCropFinish={finishCrop}
              onCropCancel={cancelCrop}
              onGroup={groupSelection}
              onUngroup={ungroupSelection}
            />,
            toolbarHost,
          )
        : null}
    </>
  );
}

function handlePosition(handle: ResizeHandle, size: string): CSSProperties {
  const half = `calc(${size} / -2)`;
  const mid = `calc(50% - ${size} / 2)`;
  switch (handle) {
    case "nw":
      return { left: half, top: half };
    case "n":
      return { left: mid, top: half };
    case "ne":
      return { right: half, top: half };
    case "e":
      return { right: half, top: mid };
    case "se":
      return { right: half, bottom: half };
    case "s":
      return { left: mid, bottom: half };
    case "sw":
      return { left: half, bottom: half };
    case "w":
      return { left: half, top: mid };
  }
}

/* ── Textredigering på plats ─────────────────────────────────────────────── */

function TextEditorBox({
  index,
  overlay,
  box,
  rootRef,
  onCommit,
  onCancel,
}: {
  index: number;
  overlay: ParsedComponent;
  box: ObjectBox;
  rootRef: RefObject<HTMLDivElement | null>;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useMemo(
    () => (typeof overlay.props.text === "string" ? overlay.props.text : (overlay.content ?? "").trim()),
    [overlay],
  );
  const [fontStyle, setFontStyle] = useState<CSSProperties>({});
  const committed = useRef(false);

  // Samma typografi som rutan: läs den beräknade stilen och göm originalet.
  useLayoutEffect(() => {
    const el = objectElement(rootRef.current, index);
    const textEl = el?.querySelector<HTMLElement>("[data-object-text]");
    if (!el || !textEl) return;
    const cs = getComputedStyle(textEl);
    const wrapper = getComputedStyle(el);
    setFontStyle({
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign as CSSProperties["textAlign"],
      color: cs.color,
      padding: wrapper.padding,
      background: wrapper.backgroundColor,
      borderRadius: wrapper.borderRadius,
    });
    textEl.style.visibility = "hidden";
    return () => {
      textEl.style.visibility = "";
    };
  }, [index, rootRef]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = initial;
    el.focus();
    // Markören sist i texten.
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [initial]);

  const finish = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    const text = (ref.current?.innerText ?? "").replace(/\r/g, "").replace(/\n+$/, "");
    if (text === initial) onCancel();
    else onCommit(text);
  }, [initial, onCancel, onCommit]);

  return (
    <div
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      data-object-editor=""
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          e.stopPropagation();
          finish();
        }
        // Piltangenter och Delete ska stanna i texten.
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        minHeight: `${box.h}%`,
        transform: `rotate(${box.rotation}deg)`,
        boxSizing: "border-box",
        outline: `calc(1.5px / var(--editor-scale, 1)) solid var(--verkstad-accent)`,
        pointerEvents: "auto",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        cursor: "text",
        margin: 0,
        ...fontStyle,
      }}
    />
  );
}

/* ── Kontextverktygsrad ──────────────────────────────────────────────────── */

const TEXT_COLORS = [
  { label: "Tema", value: null, swatch: "linear-gradient(135deg, #16150f 50%, #f4f2ec 50%)" },
  { label: "Vit", value: "#FFFFFF", swatch: "#FFFFFF" },
  { label: "Svart", value: "#0A0908", swatch: "#0A0908" },
  { label: "Accent", value: "var(--accent)", swatch: "linear-gradient(135deg, #243cff, #ec7e26)" },
] as const;

const SHAPE_FILLS = [
  { label: "Accent", value: null, swatch: "linear-gradient(135deg, #243cff, #ec7e26)" },
  { label: "Bläck", value: "var(--text)", swatch: "#16150f" },
  { label: "Papper", value: "var(--bg-surface)", swatch: "#fbfaf6" },
  { label: "Vit", value: "#FFFFFF", swatch: "#FFFFFF" },
  { label: "Svart", value: "#0A0908", swatch: "#0A0908" },
] as const;

const ALIGN_CYCLE = ["left", "center", "right"] as const;
const ALIGN_GLYPH: Record<string, string> = { left: "⫷", center: "☰", right: "⫸" };

function ObjectToolbar({
  elementRef,
  overlays,
  selection,
  boxes,
  onPatch,
  onDelete,
  onDuplicate,
  onStepZ,
  onReplaceMedia,
  onEdit,
  cropping,
  onCrop,
  onCropZoom,
  onCropReset,
  onCropFinish,
  onCropCancel,
  onGroup,
  onUngroup,
}: {
  elementRef: RefObject<HTMLDivElement | null>;
  onGroup: () => void;
  onUngroup: () => void;
  cropping: boolean;
  onCrop: (index: number) => void;
  onCropZoom: (factor: number) => void;
  onCropReset: () => void;
  onCropFinish: () => void;
  onCropCancel: () => void;
  overlays: ParsedComponent[];
  selection: number[];
  boxes: Record<number, ObjectBox>;
  onPatch: (patches: ObjectPatch[]) => void;
  onDelete: (indices: number[]) => void;
  onDuplicate: (indices: number[]) => void;
  onStepZ: (indices: number[], direction: 1 | -1, extreme: boolean) => void;
  onReplaceMedia: (index: number) => void;
  onEdit: (index: number) => void;
}) {
  const single = selection.length === 1 ? overlays[selection[0]] : null;
  const index = selection[0];
  const kind = single ? objectKind(single.tag) : null;
  const locked = Boolean(single?.props.locked);

  const set = (props: Record<string, PropValue | null>) => onPatch([{ index, props }]);

  const align = (mode: AlignMode) => {
    const list = selection.map((i) => boxes[i]).filter(Boolean);
    if (list.length !== selection.length) return;
    const moved = alignBoxes(list, mode);
    onPatch(selection.map((i, k) => ({ index: i, props: { x: formatPercent(moved[k].x), y: formatPercent(moved[k].y) } })));
  };
  const distribute = (axis: "x" | "y") => {
    const list = selection.map((i) => boxes[i]).filter(Boolean);
    if (list.length !== selection.length) return;
    const moved = distributeBoxes(list, axis);
    onPatch(selection.map((i, k) => ({ index: i, props: { x: formatPercent(moved[k].x), y: formatPercent(moved[k].y) } })));
  };

  const sizeCqw = kind === "text" ? resolveSizeCqw(single?.props.size as string | number | undefined) : 0;
  const currentAlign = (single?.props.align as string) || "left";
  const currentColor = typeof single?.props.color === "string" ? single.props.color : null;
  const bold = single?.props.weight === "bold" || single?.props.weight === "black" || Number(single?.props.weight) >= 700;
  const groups = new Set(selection.map((i) => overlays[i]?.props.group).filter((g) => typeof g === "string"));
  const anyGrouped = groups.size > 0;
  const allOneGroup = groups.size === 1 && selection.every((i) => typeof overlays[i]?.props.group === "string");

  return (
    <div
      ref={elementRef}
      className="object-toolbar"
      role="toolbar"
      aria-label="Objekt"
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}
    >
      {cropping ? (
        <>
          <div className="object-toolbar__group" title="Zooma bilden i ramen (+ och −)">
            <Tool label="Zooma ut" onClick={() => onCropZoom(1 / 1.15)}>
              −
            </Tool>
            <Tool label="Zooma in" onClick={() => onCropZoom(1.15)}>
              +
            </Tool>
          </div>
          <Tool label="Hela bilden" title="Visa hela bilden obeskuren i ramens bredd" onClick={onCropReset} text>
            Hela bilden
          </Tool>
          <span className="object-toolbar__sep" />
          <Tool label="Klar" title="Klar (Enter)" onClick={onCropFinish} active text>
            Klar
          </Tool>
          <Tool label="Avbryt" title="Avbryt (Esc)" onClick={onCropCancel} text>
            Avbryt
          </Tool>
          {single ? <span className="object-toolbar__name">{objectLabel(single)}</span> : null}
        </>
      ) : null}

      {!cropping && single && kind === "text" ? (
        <>
          <Tool label="Skriv" title="Skriv i rutan (Enter eller dubbelklick)" onClick={() => onEdit(index)} disabled={locked}>
            ✎
          </Tool>
          <div className="object-toolbar__group" title="Textstorlek (procent av rutans bredd)">
            <Tool label="Mindre text" onClick={() => set({ size: String(Math.max(1, Math.round(sizeCqw) - 1)) })}>
              A−
            </Tool>
            <span className="object-toolbar__value">{Math.round(sizeCqw)}</span>
            <Tool label="Större text" onClick={() => set({ size: String(Math.min(100, Math.round(sizeCqw) + 1)) })}>
              A+
            </Tool>
          </div>
          <Tool
            label="Fet"
            title={bold ? "Fet — klicka för normal" : "Normal — klicka för fet"}
            active={bold}
            onClick={() => set({ weight: bold ? null : "bold" })}
          >
            B
          </Tool>
          <Tool
            label="Justering"
            title={`Justering: ${currentAlign === "left" ? "vänster" : currentAlign === "center" ? "mitten" : "höger"} — klicka för nästa`}
            onClick={() => {
              const next = ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(currentAlign as (typeof ALIGN_CYCLE)[number]) + 1) % ALIGN_CYCLE.length];
              set({ align: next === "left" ? null : next });
            }}
          >
            {ALIGN_GLYPH[currentAlign] ?? "☰"}
          </Tool>
          <div className="object-toolbar__group" title="Textfärg">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                aria-label={`Textfärg ${c.label}`}
                aria-pressed={currentColor === c.value || (c.value === null && (currentColor === null || currentColor === "var(--text)"))}
                onClick={() => set({ color: c.value })}
                className="object-toolbar__swatch"
                style={{ background: c.swatch }}
              />
            ))}
          </div>
          <span className="object-toolbar__sep" />
        </>
      ) : null}

      {!cropping && single && (kind === "image" || kind === "video") ? (
        <>
          {kind === "image" ? (
            <Tool label="Beskär" title="Beskär: dra bilden i ramen, dra kanterna, zooma (dubbelklick på bilden)" onClick={() => onCrop(index)} disabled={locked} text>
              Beskär
            </Tool>
          ) : null}
          <Tool label={kind === "image" ? "Byt bild" : "Byt video"} onClick={() => onReplaceMedia(index)} text>
            {kind === "image" ? "Byt bild" : "Byt video"}
          </Tool>
          <Tool
            label="Skugga"
            title={single.props.noShadow ? "Ingen skugga — klicka för skugga" : "Skugga — klicka för att ta bort"}
            active={!single.props.noShadow}
            onClick={() => set({ noShadow: single.props.noShadow ? null : true })}
            text
          >
            Skugga
          </Tool>
          <Tool
            label="Bakom innehållet"
            title={single.props.layer === "back" ? "Ligger bakom mallens innehåll — klicka för framför" : "Ligger framför mallens innehåll — klicka för bakom"}
            active={single.props.layer === "back"}
            onClick={() => set({ layer: single.props.layer === "back" ? null : "back", zIndex: null })}
            text
          >
            Bakom
          </Tool>
          <span className="object-toolbar__sep" />
        </>
      ) : null}

      {!cropping && single && kind === "shape" ? (
        <>
          <div className="object-toolbar__group" title="Fyllning">
            {SHAPE_FILLS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                aria-label={`Fyllning ${c.label}`}
                aria-pressed={c.value === null ? !single.props.fill : single.props.fill === c.value}
                onClick={() => set({ fill: c.value })}
                className="object-toolbar__swatch"
                style={{ background: c.swatch }}
              />
            ))}
          </div>
          <span className="object-toolbar__sep" />
        </>
      ) : null}

      {!cropping && selection.length > 1 ? (
        <>
          <div className="object-toolbar__group" title="Justera markerade objekt mot varandra">
            {(
              [
                ["left", "Vänsterkanter", "⇤"],
                ["center", "Mitt i sidled", "⇔"],
                ["right", "Högerkanter", "⇥"],
                ["top", "Överkanter", "⤒"],
                ["middle", "Mitt i höjdled", "⇕"],
                ["bottom", "Underkanter", "⤓"],
              ] as const
            ).map(([mode, label, glyph]) => (
              <Tool key={mode} label={label} onClick={() => align(mode)}>
                {glyph}
              </Tool>
            ))}
          </div>
          {!allOneGroup ? (
            <Tool label="Gruppera" title="Gruppera (Ctrl+G) — markeras och flyttas som ett" onClick={onGroup} text>
              Gruppera
            </Tool>
          ) : null}
          {anyGrouped ? (
            <Tool label="Dela upp" title="Dela upp gruppen (Ctrl+Shift+G)" onClick={onUngroup} text>
              Dela upp
            </Tool>
          ) : null}
          {selection.length > 2 ? (
            <div className="object-toolbar__group" title="Jämna mellanrum">
              <Tool label="Fördela i sidled" onClick={() => distribute("x")}>
                ⇹
              </Tool>
              <Tool label="Fördela i höjdled" onClick={() => distribute("y")}>
                ⇳
              </Tool>
            </div>
          ) : null}
          <span className="object-toolbar__sep" />
        </>
      ) : null}

      {cropping ? null : (
        <>
      <Tool label="Duplicera" title="Duplicera (Ctrl+D)" onClick={() => onDuplicate(selection)}>
        ⧉
      </Tool>
      <div className="object-toolbar__group" title="Ordning: framåt/bakåt (Ctrl+] / Ctrl+[, Shift för överst/underst)">
        <Tool label="Bakåt" onClick={(e) => onStepZ(selection, -1, e.shiftKey)}>
          ↓
        </Tool>
        <Tool label="Framåt" onClick={(e) => onStepZ(selection, 1, e.shiftKey)}>
          ↑
        </Tool>
      </div>
      {single ? (
        <Tool label={locked ? "Lås upp" : "Lås"} title={locked ? "Låst — klicka för att låsa upp" : "Lås objektet så det inte flyttas av misstag"} active={locked} onClick={() => set({ locked: locked ? null : true })}>
          {locked ? "🔒" : "🔓"}
        </Tool>
      ) : null}
      <Tool label="Ta bort" title="Ta bort (Delete)" onClick={() => onDelete(selection)} danger>
        ×
      </Tool>
      {single ? <span className="object-toolbar__name">{objectLabel(single)}</span> : <span className="object-toolbar__name">{selection.length} objekt</span>}
        </>
      )}
    </div>
  );
}

function Tool({
  label,
  title,
  onClick,
  active,
  disabled,
  danger,
  text,
  children,
}: {
  label: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  text?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`object-toolbar__btn${active ? " is-active" : ""}${danger ? " is-danger" : ""}${text ? " is-text" : ""}`}
    >
      {children}
    </button>
  );
}
