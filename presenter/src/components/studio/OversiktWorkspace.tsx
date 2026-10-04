"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import type { ParsedComponent, ParsedPresentation } from "@/lib/mdx-parser";
import type { SlideMeta } from "@/lib/extract-slide-types";
import type { AuthoringSaveStatus } from "@/lib/authoring-types";
import { deleteSlideAt, insertSlidesAfter, reorderDeck, toggleSlideVisibility } from "@/lib/deck-operations";
import {
  actIndexOf,
  deriveActs,
  handOverActBeforeDelete,
  materializeActs,
  relocateSlide,
  setActTitle,
  stepSlide,
  type RelocateResult,
} from "@/lib/oversikt-acts";
import {
  THUMB_DEFAULT,
  THUMB_LARGE,
  THUMB_MAX,
  THUMB_STEP,
  clampThumb,
  getOversiktSettings,
  getServerOversiktSettings,
  subscribeOversiktSettings,
  updateOversiktSettings,
} from "@/lib/oversikt-settings";
import { createSlideId } from "@/lib/slide-ids";
import { getServerWorkshopForm, getWorkshopForm, setWorkshopForm, subscribeWorkshopForm } from "@/lib/workshop-settings";
import { NoteEditor } from "@/components/library/NoteEditor";
import { useDeckThumbnails } from "./useDeckThumbnails";
import { SlideManusDetail } from "./SlideManusDetail";
import styles from "./oversikt.module.css";

/**
 * Översikten — den röda tråden på en sida.
 *
 * Joel 21 september 2026: det mörka manusläget är svårt att få överblick i, så
 * han har byggt tråden i PowerPoint i stället. Den här vyn är det han gjorde
 * där: ljus, tät, en rad per slide, grupperad per akt. Läser man syftesraderna
 * uppifrån och ner har man läst föreläsningens resonemang.
 *
 * Vyn är ett läge i AuthoringShell och delar träd, autosparning och ångra med
 * storyboard, manus och slide-editor. Den skriver bara props som manusläget
 * redan använder (`syfte`, `tid`) plus `akt`, som markerar var en akt börjar i
 * deck som saknar avdelare. Aktreglerna bor i `lib/oversikt-acts.ts`.
 */

export interface ReadingChapter {
  title: string;
  slideId: string;
}

interface OversiktWorkspaceProps {
  slug: string;
  title: string;
  parsed: ParsedPresentation;
  updateParsed: Dispatch<SetStateAction<ParsedPresentation>>;
  slideMetas: SlideMeta[];
  notes: (string | null)[];
  hiddenSlides: number[];
  slideIds: string[];
  slideRenderHashes: string[];
  /** Kapitel ur lästexten (content/las), som förslag när decket saknar akter. */
  readingChapters: ReadingChapter[];
  /** Anteckningarna om föreläsningen (content/anteckningar). null = visas inte, t.ex. på en publik värd. */
  note: string | null;
  currentIndex: number;
  onCurrentIndexChange: Dispatch<SetStateAction<number>>;
  onOpenEditor: (index: number) => void;
  onOpenStoryboard: () => void;
  onOpenManus: () => void;
  /** Sparar det som är osparat och går till startsidans bibliotek. */
  onOpenLibrary: () => void;
  /** Öppnar komponentgalleriet för en ny slide efter den angivna raden. */
  onOpenGallery: (afterIndex: number) => void;
  /** Hämta färdiga slides ur en annan föreläsning och lägg dem under raden. */
  onOpenImport: (afterIndex: number) => void;
  /** Öppnar galleriet för att byta mall på raden — ett utkast som får sin form. */
  onChangeTemplate: (index: number) => void;
  onPresent: () => void;
  saveStatus: AuthoringSaveStatus;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const UTKAST_TAG = "Utkast";
const DRAG_THRESHOLD = 6;
const AUTOSCROLL_EDGE = 72;
const AUTOSCROLL_SPEED = 14;

type EditField = "syfte" | "akt" | "tid";

interface DropTarget {
  /** Raden som släppmarkören ritas vid. */
  row: number;
  half: "before" | "after";
}

interface DragView extends DropTarget {
  from: number;
  x: number;
  y: number;
}

function propText(slide: ParsedComponent | undefined, key: string): string {
  const value = slide?.props[key];
  return typeof value === "string" ? value : "";
}

function parseMinutes(raw: string): number {
  const text = raw.trim().toLowerCase().replace(",", ".");
  const match = text.match(/([\d.]+)/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  return /sek/.test(text) ? value / 60 : value;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "";
  const rounded = Math.round(minutes * 2) / 2;
  return `${String(rounded).replace(".", ",")} min`;
}

function clean(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jämför två rader utan skiljetecken och versaler: säger syftet något eget? */
function sameLine(a: string, b: string): boolean {
  const flat = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  return flat(a) === flat(b);
}

/** Det Joel säger på sliden: SÄG-avsnittet i manus, annars hela anteckningen. */
function spokenLines(note: string | null): string[] {
  if (!note) return [];
  // SÄG slutar vid nästa rubrik: fyra versaler eller fler (REGI:, VISA:), eller
  // någon av de korta (GÖR:, OBS:, TID:). Förut lästes GÖR: som tal.
  const spoken = /S[ÄA]G:\s*([\s\S]*?)(?:\n(?:[A-ZÅÄÖ ]{4,}|GÖR|OBS|TID):|$)/.exec(note)?.[1] ?? note;
  return spoken
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter((line) => line && !/^(CORE|FLEX)\b/.test(line));
}

/** Första meningen i det Joel säger — reserv när sliden saknar syfte. */
function firstSpokenLine(note: string | null): string {
  const line = spokenLines(note)[0] ?? "";
  return /^(.{20,160}?[.!?])(\s|$)/.exec(line)?.[1] ?? line.slice(0, 160);
}

/** Så många manusrader som ryms bredvid en miniatyr av den här bredden. */
function spokenRoom(thumb: number): number {
  return Math.max(1, Math.floor(((thumb * 9) / 16 - 96) / 21.5));
}

function OversiktWorkspaceInner({
  slug,
  title,
  parsed,
  updateParsed,
  slideMetas,
  notes,
  hiddenSlides,
  slideIds,
  slideRenderHashes,
  readingChapters,
  note,
  currentIndex,
  onCurrentIndexChange,
  onOpenEditor,
  onOpenStoryboard,
  onOpenManus,
  onOpenLibrary,
  onOpenGallery,
  onOpenImport,
  onChangeTemplate,
  onPresent,
  saveStatus,
  saveError,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: OversiktWorkspaceProps) {
  const slides = parsed.slides;
  const settings = useSyncExternalStore(subscribeOversiktSettings, getOversiktSettings, getServerOversiktSettings);
  const workshopForm = useSyncExternalStore(subscribeWorkshopForm, getWorkshopForm, getServerWorkshopForm);
  const withImages = settings.images;
  const showHidden = settings.showHidden;
  const [editing, setEditing] = useState<{ index: number; field: EditField } | null>(null);
  const [drag, setDrag] = useState<DragView | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // Utfälld rad (slideId): manus, orden på sliden och Till Claude — se SlideManusDetail.
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [hasNote, setHasNote] = useState(Boolean(note?.trim()));
  const [savedNote, setSavedNote] = useState(note ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const keepView = useRef(false);
  const hiddenSet = useMemo(() => new Set(hiddenSlides), [hiddenSlides]);

  const headings = useMemo(
    () =>
      slides.map(
        (slide, index) =>
          clean(slide.tag === UTKAST_TAG ? slide.content : slideMetas[index]?.primaryText) ||
          clean(propText(slide, "title")) ||
          slide.tag,
      ),
    [slideMetas, slides],
  );

  const { acts, suggestedOnly } = useMemo(
    () => deriveActs(slides, { slideIds, headings, suggested: readingChapters }),
    [headings, readingChapters, slideIds, slides],
  );

  // Pekar- och tangentbordshanterare läser alltid senaste läget härifrån.
  const latest = useRef({ parsed, acts, hiddenSet, showHidden });
  useLayoutEffect(() => {
    latest.current = { parsed, acts, hiddenSet, showHidden };
  }, [acts, hiddenSet, parsed, showHidden]);

  const totals = useMemo(() => {
    const perAct = acts.map(() => ({ slides: 0, minutes: 0 }));
    let minutes = 0;
    let active = 0;
    let withPurpose = 0;
    slides.forEach((slide, index) => {
      if (hiddenSet.has(index + 1)) return;
      const m = parseMinutes(propText(slide, "tid"));
      const bucket = perAct[actIndexOf(acts, index)];
      bucket.slides += 1;
      bucket.minutes += m;
      minutes += m;
      active += 1;
      const purpose = propText(slide, "syfte");
      if (purpose && !sameLine(purpose, headings[index])) withPurpose += 1;
    });
    return {
      perAct,
      minutes,
      active,
      withPurpose,
      drafts: slides.filter((s) => s.tag === UTKAST_TAG).length,
      toClaude: slides.filter((s) => propText(s, "claude")).length,
    };
  }, [acts, headings, hiddenSet, slides]);

  // ── Miniatyrer ───────────────────────────────────────────────────────────
  const getFocusIndex = useCallback(() => {
    const list = listRef.current;
    if (!list) return 0;
    const top = list.getBoundingClientRect().top + 48;
    for (const row of list.querySelectorAll<HTMLElement>("[data-row]")) {
      if (row.getBoundingClientRect().bottom > top) return Number(row.dataset.row);
    }
    return 0;
  }, []);

  const { thumbs, pending, workers } = useDeckThumbnails({
    slug,
    slideIds,
    renderHashes: slideRenderHashes,
    enabled: withImages,
    captureEnabled: saveStatus === "idle" || saveStatus === "saved",
    getFocusIndex,
  });

  // ── Ändringar ────────────────────────────────────────────────────────────
  const say = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 5200);
  }, []);

  const setProp = useCallback(
    (index: number, key: string, value: string) => {
      updateParsed((current) => {
        const slide = current.slides[index];
        if (!slide) return current;
        if (propText(slide, key) === value.trim()) return current;
        const nextProps = { ...slide.props };
        // Tom sträng RADERAR propen, annars skräpar `syfte=""` ner MDX-filen.
        if (value.trim() === "") delete nextProps[key];
        else nextProps[key] = value.trim();
        const nextSlides = current.slides.slice();
        nextSlides[index] = { ...slide, props: nextProps };
        return { ...current, slides: nextSlides };
      });
    },
    [updateParsed],
  );

  // Utfällningen sparar det man skriver som det står — med mellanslag och
  // radbrytningar. (setProp trimmar, vilket passar en syftesrad men inte ett
  // fält man skriver i.)
  const setRawProp = useCallback(
    (index: number, key: string, value: string) => {
      updateParsed((current) => {
        const slide = current.slides[index];
        if (!slide) return current;
        const nextProps = { ...slide.props };
        if (value.trim() === "") delete nextProps[key];
        else nextProps[key] = value;
        const nextSlides = current.slides.slice();
        nextSlides[index] = { ...slide, props: nextProps };
        return { ...current, slides: nextSlides };
      });
    },
    [updateParsed],
  );
  const setContentAt = useCallback(
    (index: number, value: string) => {
      updateParsed((current) => {
        const slide = current.slides[index];
        if (!slide) return current;
        const nextSlides = current.slides.slice();
        nextSlides[index] = { ...slide, content: value };
        return { ...current, slides: nextSlides };
      });
    },
    [updateParsed],
  );
  const setNotesAt = useCallback(
    (index: number, value: string) => {
      updateParsed((current) => {
        const slide = current.slides[index];
        if (!slide) return current;
        const nextSlides = current.slides.slice();
        nextSlides[index] = { ...slide, notes: value.trim() ? value : undefined };
        return { ...current, slides: nextSlides };
      });
    },
    [updateParsed],
  );

  const nameAct = useCallback(
    (index: number, value: string) => {
      const { acts: currentActs } = latest.current;
      updateParsed((current) => setActTitle(current, currentActs, index, value));
    },
    [updateParsed],
  );

  const applyRelocation = useCallback(
    (result: RelocateResult) => {
      if (!result.ok) {
        if (result.reason === "ensam i kommentarsakt")
          say("Akten består av en enda slide och är satt med en kommentar i källfilen. Lägg till en slide i akten först, eller flytta den i storyboarden.");
        return;
      }
      updateParsed(reorderDeck(result.parsed, result.order));
      onCurrentIndexChange(result.newIndex);
    },
    [onCurrentIndexChange, say, updateParsed],
  );

  const step = useCallback(
    (index: number, direction: -1 | 1) => {
      const now = latest.current;
      const skip = (i: number) => !now.showHidden && now.hiddenSet.has(i + 1);
      applyRelocation(stepSlide(now.parsed, now.acts, index, direction, skip));
    },
    [applyRelocation],
  );

  const insertBelow = useCallback(
    (index: number) => {
      updateParsed((current) =>
        insertSlidesAfter(current, index, [
          { tag: UTKAST_TAG, props: { slideId: createSlideId() }, content: "", children: [] },
        ]),
      );
      onCurrentIndexChange(index + 1);
      setEditing({ index: index + 1, field: "syfte" });
    },
    [onCurrentIndexChange, updateParsed],
  );

  const remove = useCallback(
    (index: number) => {
      if (slides.length <= 1) return;
      const label = headings[index] || propText(slides[index], "syfte") || slides[index].tag;
      if (!window.confirm(`Ta bort slide ${index + 1}?\n\n${label.slice(0, 140)}\n\nDu kan ångra direkt efteråt.`)) return;
      const { acts: currentActs } = latest.current;
      updateParsed((current) => deleteSlideAt(handOverActBeforeDelete(current, currentActs, index), index));
      onCurrentIndexChange((active) => Math.max(0, Math.min(active > index ? active - 1 : active, slides.length - 2)));
    },
    [headings, onCurrentIndexChange, slides, updateParsed],
  );

  // ── Dra och släpp ────────────────────────────────────────────────────────
  const dropTargetAt = useCallback((y: number): DropTarget | null => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (y < rect.top) return { row: Number(row.dataset.row), half: "before" };
      if (y <= rect.bottom) return { row: Number(row.dataset.row), half: y < rect.top + rect.height / 2 ? "before" : "after" };
    }
    const last = rows[rows.length - 1];
    return last ? { row: Number(last.dataset.row), half: "after" } : null;
  }, []);

  const onRowPointerDown = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || editing) return;
    if ((event.target as HTMLElement).closest("input, a, [data-nodrag]")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let pointerY = startY;
    let pointerX = startX;
    let frame = 0;

    const update = () => {
      const target = dropTargetAt(pointerY);
      if (target) setDrag({ from: index, x: pointerX, y: pointerY, ...target });
    };
    const autoscroll = () => {
      const list = listRef.current;
      if (active && list) {
        const rect = list.getBoundingClientRect();
        const before = list.scrollTop;
        if (pointerY < rect.top + AUTOSCROLL_EDGE) list.scrollTop -= AUTOSCROLL_SPEED;
        else if (pointerY > rect.bottom - AUTOSCROLL_EDGE) list.scrollTop += AUTOSCROLL_SPEED;
        if (list.scrollTop !== before) update();
      }
      frame = window.requestAnimationFrame(autoscroll);
    };
    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!active) {
        if (Math.hypot(pointerX - startX, pointerY - startY) < DRAG_THRESHOLD) return;
        active = true;
        document.body.style.userSelect = "none";
        frame = window.requestAnimationFrame(autoscroll);
      }
      update();
    };
    const finish = (drop: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      if (active) {
        // Klicket som följer på släppet ska inte välja raden under pekaren.
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 0);
        const target = drop ? dropTargetAt(pointerY) : null;
        if (target) {
          const now = latest.current;
          const gap = target.half === "before" ? target.row : target.row + 1;
          applyRelocation(relocateSlide(now.parsed, now.acts, index, gap, target.half === "before"));
        }
      }
      setDrag(null);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  };

  // ── Bildbredd: dra i linjen mellan miniatyr och text ─────────────────────
  // Texten ska alltid ha plats kvar, så bilden får högst drygt halva bredden.
  const thumbLimit = useCallback(
    () => Math.min(THUMB_MAX, Math.round((listRef.current?.clientWidth ?? 1200) * 0.55)),
    [],
  );

  const onResizePointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const list = listRef.current;
    const anchor = event.currentTarget.closest<HTMLElement>("[data-row]");
    if (!list || !anchor) return;
    const startX = event.clientX;
    const startWidth = Math.min(getOversiktSettings().thumb, thumbLimit());
    const anchorTop = anchor.getBoundingClientRect().top;
    const limit = thumbLimit();
    let width = startWidth;
    list.setAttribute("data-resizing", "");
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMove = (e: PointerEvent) => {
      width = Math.min(limit, clampThumb(startWidth + (e.clientX - startX)));
      // Skrivs direkt på elementet under draget: sextio rader behöver inte
      // renderas om för varje pixel. Värdet sparas när man släpper.
      list.style.setProperty("--thumb", `${width}px`);
      list.style.setProperty("--spoken-lines", String(spokenRoom(width)));
      list.toggleAttribute("data-large", width >= THUMB_LARGE);
      // Raden man drar i ligger still under pekaren medan raderna ovanför växer.
      list.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
    };
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      list.removeAttribute("data-resizing");
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      if (width !== getOversiktSettings().thumb) {
        keepView.current = true;
        updateOversiktSettings({ thumb: width });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const nudgeThumb = useCallback(
    (direction: -1 | 1) => {
      const next = clampThumb(getOversiktSettings().thumb + direction * THUMB_STEP);
      updateOversiktSettings({ thumb: Math.min(next, thumbLimit()) });
    },
    [thumbLimit],
  );

  // ── Tangentbord ──────────────────────────────────────────────────────────
  const visibleNeighbour = useCallback(
    (from: number, direction: -1 | 1) => {
      let i = from + direction;
      while (i >= 0 && i < slides.length && !showHidden && hiddenSet.has(i + 1)) i += direction;
      return i >= 0 && i < slides.length ? i : from;
    },
    [hiddenSet, showHidden, slides.length],
  );

  /** Dölj eller visa. Göms dolda slides flyttar markeringen till grannen. */
  const hideOrShow = (index: number) => {
    const willHide = !hiddenSet.has(index + 1);
    updateParsed((current) => toggleSlideVisibility(current, index));
    if (willHide && !showHidden && index === currentIndex) {
      const next = visibleNeighbour(index, 1);
      onCurrentIndexChange(next !== index ? next : visibleNeighbour(index, -1));
    }
  };

  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const command = e.metaKey || e.ctrlKey;
    if (command && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) onRedo();
      else onUndo();
    } else if (command && e.key.toLowerCase() === "y") {
      e.preventDefault();
      onRedo();
    } else if (command) {
      return;
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const direction = e.key === "ArrowDown" ? 1 : -1;
      if (e.altKey) step(currentIndex, direction);
      else onCurrentIndexChange(visibleNeighbour(currentIndex, direction));
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // → fäller ut raden (manus, orden, Till Claude), ← fäller ihop.
      e.preventDefault();
      const id = slideIds[currentIndex] ?? null;
      setOpenDetail(e.key === "ArrowRight" ? id : null);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const edge = e.key === "Home" ? visibleNeighbour(-1, 1) : visibleNeighbour(slides.length, -1);
      onCurrentIndexChange(Math.max(0, Math.min(slides.length - 1, edge)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onOpenEditor(currentIndex);
      else if (showHidden || !hiddenSet.has(currentIndex + 1)) setEditing({ index: currentIndex, field: "syfte" });
    } else if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      insertBelow(currentIndex);
    } else if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      onChangeTemplate(currentIndex);
    } else if (e.key.toLowerCase() === "k") {
      e.preventDefault();
      onOpenGallery(currentIndex);
    } else if (e.key.toLowerCase() === "h") {
      e.preventDefault();
      hideOrShow(currentIndex);
    } else if (e.key === "Delete") {
      e.preventDefault();
      remove(currentIndex);
    } else if (withImages && (e.key === "+" || e.key === "-")) {
      e.preventDefault();
      nudgeThumb(e.key === "+" ? 1 : -1);
    }
  };

  // Vald rad hålls i bild — även när de sparade inställningarna läses in efter
  // hydreringen och raderna byter höjd. Undantag: när man själv drar i linjen,
  // då ligger raden under pekaren still i stället.
  useEffect(() => {
    if (keepView.current) {
      keepView.current = false;
      return;
    }
    listRef.current?.querySelector<HTMLElement>(`[data-row="${currentIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [currentIndex, settings.thumb, showHidden, withImages]);

  // Efter en redigering ska piltangenterna fungera igen utan ett extra klick.
  const endEditing = useCallback(() => {
    setEditing(null);
    window.requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
  }, []);

  const saveLabel =
    saveStatus === "dirty" ? "Ändrad" : saveStatus === "saving" ? "Sparar…" : saveStatus === "saved" ? "Sparat"
      : saveStatus === "conflict" ? "Sparningen pausad" : saveStatus === "error" ? "Sparfel" : "";

  const dragHeading = drag ? headings[drag.from] : "";
  const large = withImages && settings.thumb >= THUMB_LARGE;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.identity}>
            <button type="button" className={styles.badge} onClick={onOpenLibrary} title="Tillbaka till biblioteket">
              ← Bibliotek
            </button>
            <h1 className={styles.deckTitle}>{title}</h1>
          </div>
          <nav className={styles.modes} aria-label="Lägen">
            <span className={styles.modeActive}>Översikt</span>
            <button type="button" onClick={onOpenStoryboard}>Storyboard</button>
            <button type="button" onClick={onOpenManus}>Manus</button>
            <button type="button" onClick={() => onOpenEditor(currentIndex)}>Slide-editor</button>
            <button type="button" onClick={onPresent} className={styles.present}>Presentera</button>
          </nav>
        </div>
        <div className={styles.toolbar}>
          <span className={styles.stat}><strong>{totals.active}</strong> slides</span>
          {totals.minutes > 0 ? <span className={styles.stat}><strong>≈ {Math.round(totals.minutes)}</strong> min</span> : null}
          <span className={styles.stat}><strong>{acts.length}</strong> {acts.length === 1 ? "akt" : "akter"}</span>
          <span className={styles.stat}>
            syfte på <strong>{totals.withPurpose}</strong> av {totals.active}
          </span>
          {totals.drafts > 0 ? <span className={styles.statAccent}>{totals.drafts} utkast</span> : null}
          {totals.toClaude > 0 ? <span className={styles.statAccent}>{totals.toClaude} till Claude</span> : null}
          <span className={styles.spacer} />
          {withImages && pending > 0 ? <span className={styles.pending}>hämtar bilder · {pending} kvar</span> : null}
          <div className={styles.segmented} role="group" aria-label="Visning">
            <button type="button" aria-pressed={withImages} onClick={() => updateOversiktSettings({ images: true })}>Med bilder</button>
            <button type="button" aria-pressed={!withImages} onClick={() => updateOversiktSettings({ images: false })}>Bara tråden</button>
          </div>
          <button type="button" className={styles.toggle} aria-pressed={showHidden} onClick={() => updateOversiktSettings({ showHidden: !showHidden })}>
            Dolda {showHidden ? "visas" : "göms"}
          </button>
          {note !== null ? (
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={notesOpen}
              data-has={hasNote ? "" : undefined}
              title="Det du vill komma ihåg inför och efter föreläsningen"
              onClick={() => setNotesOpen((open) => !open)}
            >
              Anteckningar
            </button>
          ) : null}
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={workshopForm === "ljus"}
            title="Gäller storyboard, manus och slide-editor. Översikten är alltid ljus."
            onClick={() => setWorkshopForm(workshopForm === "ljus" ? "mork" : "ljus")}
          >
            {workshopForm === "ljus" ? "Ljus verkstad" : "Mörk verkstad"}
          </button>
          <div className={styles.history}>
            <button type="button" onClick={onUndo} disabled={!canUndo} title="Ångra (Ctrl+Z)">↶</button>
            <button type="button" onClick={onRedo} disabled={!canRedo} title="Gör om (Ctrl+Skift+Z)">↷</button>
          </div>
          <span className={styles.save} data-state={saveStatus} title={saveError ?? undefined}>{saveLabel}</span>
        </div>
        {suggestedOnly ? (
          <div className={styles.notice}>
            <span>
              Akterna är ett förslag ur lästexten. De skrivs in i decket första gången du ändrar i strukturen.
            </span>
            <button type="button" onClick={() => updateParsed((current) => materializeActs(current, latest.current.acts))}>
              Gör dem till deckets egna nu
            </button>
          </div>
        ) : null}
      </header>

      <div
        ref={listRef}
        className={styles.list}
        data-images={withImages ? "" : undefined}
        data-large={large ? "" : undefined}
        data-dragging={drag ? "" : undefined}
        style={{ "--thumb": `${settings.thumb}px`, "--spoken-lines": spokenRoom(settings.thumb) } as CSSProperties}
        tabIndex={0}
        role="listbox"
        aria-label="Föreläsningens slides"
        aria-activedescendant={`oversikt-rad-${currentIndex}`}
        onKeyDown={onListKey}
      >
        {acts.map((act, actIndex) => {
          const end = acts[actIndex + 1]?.start ?? slides.length;
          const bucket = totals.perAct[actIndex];
          const renaming = editing?.field === "akt" && editing.index === act.start;
          const canRename = act.source !== "avdelare";
          const canMerge = actIndex > 0 && (act.source === "markering" || act.source === "lästext");
          return (
            <section key={`${act.start}-${act.title}`} className={styles.act}>
              <header className={styles.actHead}>
                <span className={styles.actNumber}>{String(actIndex + 1).padStart(2, "0")}</span>
                {renaming ? (
                  <input
                    autoFocus
                    className={styles.actInput}
                    defaultValue={act.source === "ingen" ? "" : act.title}
                    placeholder="Aktens namn"
                    onBlur={(e) => {
                      if (e.target.value.trim()) nameAct(act.start, e.target.value);
                      endEditing();
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        e.currentTarget.value = "";
                        e.currentTarget.blur();
                      }
                    }}
                  />
                ) : (
                  <h2
                    className={styles.actTitle}
                    onDoubleClick={() => canRename && setEditing({ index: act.start, field: "akt" })}
                    title={canRename ? "Dubbelklicka för att döpa om" : "Namnet kommer från avdelarsliden"}
                  >
                    {act.title}
                  </h2>
                )}
                {!renaming ? (
                  <span className={styles.actTools}>
                    {canRename ? (
                      <button type="button" onClick={() => setEditing({ index: act.start, field: "akt" })}>Döp om</button>
                    ) : null}
                    {canMerge ? (
                      <button type="button" onClick={() => nameAct(act.start, "")} title="Tar bort aktgränsen. Slidesen blir kvar.">
                        Slå ihop med föregående
                      </button>
                    ) : null}
                  </span>
                ) : null}
                <span className={styles.actMeta}>
                  {bucket.slides} slides{bucket.minutes > 0 ? ` · ${formatMinutes(bucket.minutes)}` : ""}
                  {act.source === "lästext" ? " · förslag" : ""}
                </span>
              </header>

              {slides.slice(act.start, end).map((slide, offset) => {
                const index = act.start + offset;
                const isHidden = hiddenSet.has(index + 1);
                if (isHidden && !showHidden) return null;
                const heading = headings[index];
                const rawPurpose = propText(slide, "syfte");
                const purpose = rawPurpose && !sameLine(rawPurpose, heading) ? rawPurpose : "";
                const firstLine = purpose ? "" : firstSpokenLine(notes[index]);
                // Bredvid stora bilder står hela SÄG-texten under — då vore första meningen en dubblett.
                const fallback = !large && firstLine && !sameLine(firstLine, heading) ? firstLine : "";
                const spoken = large ? spokenLines(notes[index]).join(" ") : "";
                const time = propText(slide, "tid");
                const thumb = thumbs.get(slideIds[index] ?? "");
                const isActive = index === currentIndex;
                const isDraft = slide.tag === UTKAST_TAG;
                const field = editing?.index === index ? editing.field : null;
                const dropHere = drag && drag.row === index && drag.from !== index ? drag.half : undefined;
                const detailOpen = openDetail !== null && openDetail === (slideIds[index] ?? null);
                return (
                  <Fragment key={slideIds[index] ?? index}>
                  <div
                    id={`oversikt-rad-${index}`}
                    data-row={index}
                    role="option"
                    aria-selected={isActive}
                    className={styles.row}
                    data-active={isActive ? "" : undefined}
                    data-hidden={isHidden ? "" : undefined}
                    data-draft={isDraft ? "" : undefined}
                    data-moving={drag?.from === index ? "" : undefined}
                    data-drop={dropHere}
                    onPointerDown={onRowPointerDown(index)}
                    onClick={() => {
                      if (!suppressClick.current) onCurrentIndexChange(index);
                    }}
                    onDoubleClick={() => onOpenEditor(index)}
                  >
                    <span className={styles.number}>{index + 1}</span>
                    {withImages ? (
                      <span className={styles.thumb} data-waiting={!thumb && !isDraft ? "" : undefined}>
                        {thumb ? (
                          // Blob-url ur miniatyrcachen — next/image kan inte optimera den.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" draggable={false} />
                        ) : (
                          <span>{isDraft ? "utkast" : ""}</span>
                        )}
                      </span>
                    ) : null}
                    {withImages ? (
                      <span
                        className={styles.resizer}
                        data-nodrag=""
                        role="separator"
                        aria-orientation="vertical"
                        title="Dra för att ändra bildstorleken · dubbelklicka för att återställa"
                        onPointerDown={onResizePointerDown}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          updateOversiktSettings({ thumb: THUMB_DEFAULT });
                        }}
                      />
                    ) : null}
                    <span className={styles.body}>
                    <span className={styles.text}>
                      <span className={styles.heading}>{heading}</span>
                      {field === "syfte" ? (
                        <input
                          autoFocus
                          className={styles.purposeInput}
                          defaultValue={rawPurpose}
                          placeholder="Vad gör den här sliden i resonemanget?"
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            setProp(index, "syfte", e.target.value);
                            endEditing();
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                              e.currentTarget.value = rawPurpose;
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className={styles.purpose}
                          data-empty={purpose ? undefined : ""}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (suppressClick.current) return;
                            onCurrentIndexChange(index);
                            setEditing({ index, field: "syfte" });
                          }}
                        >
                          {purpose || fallback || "Skriv syftet …"}
                        </button>
                      )}
                      {spoken ? (
                        <span className={styles.spoken}>
                          <i>Säg</i>
                          {spoken}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.actions} data-nodrag="" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => step(index, -1)} disabled={index === 0} title="Flytta upp (Alt+↑)">↑</button>
                      <button type="button" onClick={() => step(index, 1)} disabled={index === slides.length - 1} title="Flytta ner (Alt+↓)">↓</button>
                      <button type="button" onClick={() => insertBelow(index)} title="Ny tanke under: en utkastrad att skriva syftet i (N)">+ rad</button>
                      <button type="button" onClick={() => onOpenGallery(index)} title="Välj en komponent ur galleriet och lägg den under (K)">+ komponent</button>
                      <button type="button" onClick={() => onOpenImport(index)} title="Hämta färdiga slides ur en annan föreläsning och lägg dem under">+ från annan</button>
                      <button
                        type="button"
                        className={isDraft ? styles.shape : undefined}
                        onClick={() => onChangeTemplate(index)}
                        title="Ge sliden en mall ur galleriet. Syfte, tid, akt, manus och id följer med (M)"
                      >
                        {isDraft ? "välj mall" : "byt mall"}
                      </button>
                      {index !== act.start ? (
                        <button type="button" onClick={() => setEditing({ index, field: "akt" })} title="Börja en ny akt vid den här sliden">ny akt här</button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => hideOrShow(index)}
                        title={isHidden ? "Visa i presentationen (H)" : "Dölj i presentationen (H)"}
                      >
                        {isHidden ? "visa" : "dölj"}
                      </button>
                      <button type="button" onClick={() => remove(index)} disabled={slides.length <= 1} title="Ta bort (Delete)">ta bort</button>
                      <button
                        type="button"
                        aria-expanded={detailOpen}
                        onClick={() => {
                          onCurrentIndexChange(index);
                          setOpenDetail(detailOpen ? null : (slideIds[index] ?? null));
                        }}
                        title="Manus, orden på sliden och Till Claude (→ fäller ut, ← fäller ihop)"
                      >
                        {detailOpen ? "fäll ihop" : "manus"}
                      </button>
                      <button type="button" className={styles.open} onClick={() => onOpenEditor(index)} title="Öppna i slide-editorn (Skift+Enter)">Öppna</button>
                    </span>
                    {field === "akt" && index !== act.start ? (
                      <input
                        autoFocus
                        className={styles.actInline}
                        placeholder="Namn på akten som börjar här"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          if (e.target.value.trim()) nameAct(index, e.target.value);
                          endEditing();
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            e.currentTarget.value = "";
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    ) : null}
                    </span>
                    <span className={styles.tags}>
                      {isHidden ? <i data-kind="hidden">dold</i> : null}
                      {isDraft ? <i data-kind="draft">utkast</i> : null}
                      {propText(slide, "claude") ? <i data-kind="claude" title={propText(slide, "claude")}>till Claude</i> : null}
                      <i data-kind="template">{slide.tag === "StaScene" ? propText(slide, "scene") || slide.tag : slide.tag}</i>
                    </span>
                    {field === "tid" ? (
                      <input
                        autoFocus
                        className={styles.timeInput}
                        defaultValue={time}
                        placeholder="2 min"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          setProp(index, "tid", e.target.value);
                          endEditing();
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            e.currentTarget.value = time;
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.time}
                        data-empty={time ? undefined : ""}
                        title="Tid för sliden"
                        onDoubleClick={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (suppressClick.current) return;
                          onCurrentIndexChange(index);
                          setEditing({ index, field: "tid" });
                        }}
                      >
                        {formatMinutes(parseMinutes(time)) || "– min"}
                      </button>
                    )}
                  </div>
                  {detailOpen ? (
                    <SlideManusDetail
                      slide={slide}
                      index={index}
                      onSetProp={setRawProp}
                      onSetContent={setContentAt}
                      onSetNotes={setNotesAt}
                      onOpenEditor={onOpenEditor}
                      onClose={() => setOpenDetail(null)}
                    />
                  ) : null}
                  </Fragment>
                );
              })}
            </section>
          );
        })}
        <p className={styles.hint}>
          ↑ ↓ väljer · Enter skriver syfte · → manus och text · Alt + ↑ ↓ eller dra flyttar · N ny rad · K komponent · M välj mall · H dölj · dra i linjen mellan bild och text (eller + −) för bildstorlek · Skift + Enter eller dubbelklick öppnar slide-editorn
        </p>
      </div>

      {drag ? (
        <div className={styles.ghost} style={{ transform: `translate(${drag.x + 14}px, ${drag.y + 10}px)` }}>
          <b>{drag.from + 1}</b> {dragHeading}
        </div>
      ) : null}
      {notesOpen && note !== null ? (
        <aside className={styles.notes} aria-label="Anteckningar om föreläsningen">
          <header>
            <h2>Anteckningar</h2>
            <button type="button" aria-label="Stäng" onClick={() => setNotesOpen(false)}>
              ×
            </button>
          </header>
          <p>Om föreläsningen som helhet: vad arrangören bad om, vad som ska uppdateras, hur det gick. Syns också i biblioteket.</p>
          <NoteEditor
            slug={slug}
            initial={savedNote}
            autoFocus
            rows={16}
            onSaved={(_, text) => {
              setSavedNote(text);
              setHasNote(Boolean(text));
            }}
          />
        </aside>
      ) : null}
      {flash ? <div className={styles.flash} role="status">{flash}</div> : null}
      {workers}
    </div>
  );
}

export const OversiktWorkspace = memo(OversiktWorkspaceInner);
