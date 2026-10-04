"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { SlideMeta } from "@/lib/extract-slide-types";
import { toggleSlideHidden, deleteSlide } from "@/lib/presentation-actions";
import {
  loadCachedThumbnail,
  pruneCachedThumbnails,
  storeCachedThumbnail,
} from "@/lib/thumbnail-cache";
import { QuickEditModal } from "./QuickEditModal";

/* ── Konstanter ───────────────────────────────────────────────────────── */

// Design-storlek som /preview-slide renderas i. Skalas ned per kort.
const DESIGN_W = 1280;
const DESIGN_H = 720;
// Hur långt pekaren måste röra sig innan ett klick blir ett drag.
const DRAG_THRESHOLD = 6;
// Auto-scroll-zon vid drag nära scroll-containerns kanter.
const AUTOSCROLL_EDGE = 90;
const AUTOSCROLL_SPEED = 16;
// "Ladda hela översikten" håller högst fyra ännu ej fångade iframe-previews
// aktiva i sin egen kö. När en preview blivit en WebP-bild avmonteras dess
// iframe och nästa slide släpps fram.
const EAGER_PREVIEW_CONCURRENCY = 8;
/** Så länge en fångst får hålla sin plats i poolen innan den tvångssläpps. */
const PREVIEW_CAPTURE_TIMEOUT_MS = 15000;
/** Antal omförsök innan kortet ger upp och visar felmarkering. */
const PREVIEW_CAPTURE_MAX_ATTEMPTS = 2;
const MAX_ACTIVE_PREVIEW_WORKERS = 4;

type WorkerPriority = "visible" | "background";

interface PreviewWorkerTicket {
  priority: WorkerPriority;
  sequence: number;
  active: boolean;
  released: boolean;
  onGrant: () => void;
}

let activePreviewWorkers = 0;
let previewWorkerSequence = 0;
const previewWorkerQueue: PreviewWorkerTicket[] = [];

function pumpPreviewWorkerQueue() {
  previewWorkerQueue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "visible" ? -1 : 1;
    }
    return a.sequence - b.sequence;
  });

  while (
    activePreviewWorkers < MAX_ACTIVE_PREVIEW_WORKERS &&
    previewWorkerQueue.length > 0
  ) {
    const ticket = previewWorkerQueue.shift();
    if (!ticket || ticket.released) continue;
    ticket.active = true;
    activePreviewWorkers += 1;
    ticket.onGrant();
  }
}

function requestPreviewWorker(
  priority: WorkerPriority,
  onGrant: () => void,
): () => void {
  const ticket: PreviewWorkerTicket = {
    priority,
    sequence: previewWorkerSequence++,
    active: false,
    released: false,
    onGrant,
  };
  previewWorkerQueue.push(ticket);
  pumpPreviewWorkerQueue();

  return () => {
    if (ticket.released) return;
    ticket.released = true;
    if (ticket.active) {
      ticket.active = false;
      activePreviewWorkers = Math.max(0, activePreviewWorkers - 1);
    }
    pumpPreviewWorkerQueue();
  };
}

interface SlideThumbnailsProps {
  slideMetas: SlideMeta[];
  /**
   * Stabil identitets-hash per slide (0-indexerad). Korten nycklas på dessa
   * → de ligger kvar i DOM:en vid omflyttning (CSS `order` styr visuell
   * placering) så iframe-previewerna inte laddas om.
   */
  slideHashes?: string[];
  /** Permanent slide-ID när presentationen har migrerats. */
  slideIds?: string[];
  /** Hash av innehåll + presentationens effektiva visuella inställningar. */
  slideRenderHashes?: string[];
  totalSlides: number;
  notes: (string | null)[];
  currentIndex: number;
  onGoTo: (index: number) => void;
  /** Dubbelklick/Enter kan öppna den fulla slide-editorn. */
  onOpenSlide?: (index: number) => void;
  /**
   * Om angiven: gör korten dragbara + markerbara. Anropas med en HEL ny
   * ordning (permutation av 0..N-1, order[nyPos] = gammaltIndex) när
   * användaren släpper ett drag.
   */
  onReorder?: (newOrder: number[]) => void;
  /** 1-indexerade slide-nummer som är dolda i presenter-läget. */
  hiddenSlides?: number[];
  /** Slug — krävs för iframe-preview + hidden/delete-actions. */
  slug?: string;
  /** Visar "+"-knapp för att importera slides efter ett kort. */
  onAddBetween?: (insertAfterIndex0Based: number) => void;
  /** Storyboard visar de granulära kortåtgärderna utan hover. */
  persistentActions?: boolean;
  /** Kontrollerad snabbredigering — öppnar normalt R på vald slide. */
  onQuickEditSlide?: (index: number) => void;
  /** Kontrollerad synlighetsändring, 0-indexerad. */
  onToggleHidden?: (index: number) => void;
  /** Kontrollerad borttagning, 0-indexerad. */
  onDeleteSlide?: (index: number) => void;
  /**
   * Nya/ändrade previews fångas först när den lokala modellen finns på disk.
   * Befintliga cachebilder visas fortsatt under autosave.
   */
  previewsReady?: boolean;
}

interface PressInfo {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
}

interface DragState {
  indices: number[]; // slides som flyttas (0-bas, stigande = originalordning)
  x: number;
  y: number;
  dropGap: number; // 0..N — insättningspunkt
}

/**
 * Miniatyrgrid över alla slides — med ÄKTA renderade previews (iframe mot
 * /preview-slide), smidig pekar-baserad omflyttning och multi-markering.
 *
 * Korten renderas i en STABIL DOM-ordning (sorterad på slide-identitet) och
 * placeras visuellt med CSS `order`. Vid omflyttning ändras bara `order` —
 * inget kort flyttas i DOM:en, så iframe-previewerna laddas inte om.
 *
 * Interaktion:
 *  - Klick           → hoppa till sliden
 *  - Cmd/Ctrl-klick  → markera/avmarkera (multi-select)
 *  - Shift-klick     → markera intervall
 *  - Dra             → flytta. Drar du en markerad slide flyttas hela
 *                      markeringen som ett block.
 */
export function SlideThumbnails({
  slideMetas,
  slideHashes = [],
  slideIds = [],
  slideRenderHashes = [],
  totalSlides,
  notes,
  currentIndex,
  onGoTo,
  onOpenSlide,
  onReorder,
  hiddenSlides,
  slug,
  onAddBetween,
  persistentActions = false,
  onQuickEditSlide,
  onToggleHidden,
  onDeleteSlide,
  previewsReady = true,
}: SlideThumbnailsProps) {
  const router = useRouter();
  const [, startToggleTransition] = useTransition();
  const [pendingToggle, setPendingToggle] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [optimisticHidden, setOptimisticHidden] = useState<Set<number> | null>(
    null,
  );
  const [compactOverview, setCompactOverview] = useState(false);
  const [preloadAll, setPreloadAll] = useState(false);
  const [preloadLimit, setPreloadLimit] = useState(0);
  const [thumbnailUrls, setThumbnailUrls] = useState<
    Map<string, ThumbnailEntry>
  >(new Map());
  const thumbnailUrlsRef = useRef(thumbnailUrls);
  thumbnailUrlsRef.current = thumbnailUrls;

  // Markering (0-baserade index) + ankare för shift-intervall
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);

  // Snabb-redigering: vilket kort (0-baserat) har modalen öppen.
  const [editingSlide, setEditingSlide] = useState<number | null>(null);

  // Drag-state. `drag` driver rendering (ghost finns, indikator visas);
  // `dragRef` håller live-värden som pekar-handlers muterar utan re-render.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pressRef = useRef<PressInfo | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const hiddenSet = optimisticHidden ?? new Set(hiddenSlides ?? []);
  const canDrag = typeof onReorder === "function";
  const canHide =
    typeof onToggleHidden === "function" ||
    (typeof slug === "string" && slug.length > 0);

  /**
   * Render-ordning för korten: en STABIL DOM-sekvens sorterad på slide-
   * identitet. Eftersom nyckeln bygger på innehåll (inte position) är
   * DOM-ordningen oförändrad vid omflyttning → React flyttar inga kort →
   * iframe-previewerna laddas inte om. CSS `order` (= position) styr den
   * visuella placeringen i gridet i stället.
   */
  const cardOrder = useMemo(() => {
    const seen: Record<string, number> = {};
    const entries: {
      position: number;
      key: string;
      renderHash: string;
    }[] = [];
    for (let p = 0; p < totalSlides; p++) {
      const identity = slideIds[p] || slideHashes[p] || `p${p}`;
      const occurrence = seen[identity] ?? 0;
      seen[identity] = occurrence + 1;
      entries.push({
        position: p,
        key: occurrence === 0 ? identity : `${identity}~${occurrence}`,
        renderHash: slideRenderHashes[p] || slideHashes[p] || `p${p}`,
      });
    }
    entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return entries;
  }, [slideHashes, slideIds, slideRenderHashes, totalSlides]);

  // När användaren uttryckligen ber om hela översikten håller vi en liten,
  // självmatande renderkö. En iframe räknas inte som färdig förrän den har
  // fångats till en WebP och därmed kan avmonteras.
  useEffect(() => {
    if (!preloadAll || preloadLimit >= totalSlides) return;
    const pendingInQueue = cardOrder.filter(
      ({ position, key, renderHash }) =>
        position < preloadLimit &&
        thumbnailUrls.get(key)?.renderHash !== renderHash,
    ).length;
    if (pendingInQueue >= EAGER_PREVIEW_CONCURRENCY) return;

    const timer = window.setTimeout(() => {
      setPreloadLimit((current) =>
        Math.min(
          totalSlides,
          current + (EAGER_PREVIEW_CONCURRENCY - pendingInQueue),
        ),
      );
    }, 180);
    return () => window.clearTimeout(timer);
  }, [cardOrder, preloadAll, preloadLimit, thumbnailUrls, totalSlides]);

  // Ta bort objekt-url:er vars slide-ID inte längre finns. En gammal bild
  // för samma ID får ligga kvar medan en ny renderHash skapas.
  useEffect(() => {
    const validKeys = new Set(cardOrder.map((entry) => entry.key));
    setThumbnailUrls((current) => {
      const next = new Map(current);
      let changed = false;
      for (const [key, entry] of next) {
        if (validKeys.has(key)) continue;
        URL.revokeObjectURL(entry.url);
        next.delete(key);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [cardOrder]);

  // Hydrera WebP-bilderna från browserns persistenta CacheStorage. En vanlig
  // sidomladdning ska därmed bara läsa små bilder från diskcachen.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const hydrate = async () => {
      await Promise.all(
        cardOrder.map(async ({ key, renderHash }) => {
          if (
            thumbnailUrlsRef.current.get(key)?.renderHash === renderHash
          ) {
            return;
          }
          const blob = await loadCachedThumbnail(slug, key, renderHash);
          if (!blob || cancelled) return;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          setThumbnailUrls((current) => {
            if (current.get(key)?.renderHash === renderHash) {
              URL.revokeObjectURL(url);
              return current;
            }
            const previous = current.get(key);
            if (previous) URL.revokeObjectURL(previous.url);
            const next = new Map(current);
            next.set(key, { url, renderHash });
            return next;
          });
        }),
      );
    };

    void hydrate();
    const pruneTimer = window.setTimeout(() => {
      void pruneCachedThumbnails(
        slug,
        cardOrder.map(({ key, renderHash }) => ({
          slideId: key,
          renderHash,
        })),
      );
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(pruneTimer);
    };
  }, [cardOrder, slug]);

  // Frigör alla blob-url:er om hela M-vyn faktiskt avmonteras.
  useEffect(
    () => () => {
      for (const entry of thumbnailUrlsRef.current.values()) {
        URL.revokeObjectURL(entry.url);
      }
    },
    [],
  );

  const handleThumbnailCaptured = useCallback(
    (key: string, renderHash: string, blob: Blob) => {
      if (slug) {
        void storeCachedThumbnail(slug, key, renderHash, blob);
      }
      const url = URL.createObjectURL(blob);
      setThumbnailUrls((current) => {
        if (current.get(key)?.renderHash === renderHash) {
          URL.revokeObjectURL(url);
          return current;
        }
        const previous = current.get(key);
        if (previous) URL.revokeObjectURL(previous.url);
        const next = new Map(current);
        next.set(key, { url, renderHash });
        return next;
      });
    },
    [slug],
  );

  const loadedPreviewCount = cardOrder.reduce(
    (count, { key, renderHash }) =>
      count + (thumbnailUrls.get(key)?.renderHash === renderHash ? 1 : 0),
    0,
  );
  const fullOverviewReady = loadedPreviewCount >= totalSlides;

  const requestFullOverview = () => {
    setPreloadAll(true);
    setPreloadLimit((current) =>
      Math.max(
        current,
        Math.min(totalSlides, EAGER_PREVIEW_CONCURRENCY),
      ),
    );
  };

  /* ── Hidden / delete (oförändrad logik) ───────────────────────────── */

  const handleToggleHidden = (slideNumber1Based: number) => {
    if (onToggleHidden) {
      onToggleHidden(slideNumber1Based - 1);
      return;
    }
    if (!canHide || !slug) return;
    const next = new Set(hiddenSet);
    if (next.has(slideNumber1Based)) next.delete(slideNumber1Based);
    else next.add(slideNumber1Based);
    setOptimisticHidden(next);
    setPendingToggle(slideNumber1Based);
    startToggleTransition(async () => {
      try {
        const res = await toggleSlideHidden(slug, slideNumber1Based);
        if (res.ok) setOptimisticHidden(new Set(res.hidden ?? []));
        else setOptimisticHidden(new Set(hiddenSlides ?? []));
      } finally {
        setPendingToggle(null);
      }
    });
  };

  const handleDelete = (slideNumber1Based: number, meta: SlideMeta) => {
    if (onDeleteSlide) {
      onDeleteSlide(slideNumber1Based - 1);
      return;
    }
    if (!canHide || !slug) return;
    const label = meta.primaryText
      ? `slide ${slideNumber1Based} ("${meta.primaryText.slice(0, 50)}")`
      : `slide ${slideNumber1Based}`;
    if (
      !window.confirm(
        `Ta bort ${label}?\n\nDen här åtgärden raderar sliden permanent från MDX-filen. Du kan återställa via git om du gör fel.`,
      )
    ) {
      return;
    }
    setPendingDelete(slideNumber1Based);
    startToggleTransition(async () => {
      try {
        const res = await deleteSlide(slug, slideNumber1Based);
        if (res.ok) router.refresh();
        else window.alert(`Kunde inte ta bort: ${res.error ?? "okänt fel"}`);
      } finally {
        setPendingDelete(null);
      }
    });
  };

  /* ── Markerings-klick ─────────────────────────────────────────────── */

  const handleSelectClick = useCallback(
    (i: number, mods: { shift: boolean; meta: boolean }) => {
      if (mods.shift && anchor != null) {
        const lo = Math.min(anchor, i);
        const hi = Math.max(anchor, i);
        setSelection((prev) => {
          const next = new Set(prev);
          for (let k = lo; k <= hi; k++) next.add(k);
          return next;
        });
      } else {
        // Cmd/Ctrl-klick → toggla enskild
        setSelection((prev) => {
          const next = new Set(prev);
          if (next.has(i)) next.delete(i);
          else next.add(i);
          return next;
        });
        setAnchor(i);
      }
    },
    [anchor],
  );

  /* ── Drag: beräkna insättnings-gap från pekarposition ─────────────── */

  const computeDropGap = useCallback((x: number, y: number): number => {
    const grid = gridRef.current;
    if (!grid) return 0;
    const cards = grid.querySelectorAll<HTMLElement>("[data-thumb-index]");
    let bestIdx = 0;
    let bestDist = Infinity;
    let side = 0;
    cards.forEach((el) => {
      const idx = Number(el.dataset.thumbIndex);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
        side = x < cx ? 0 : 1;
      }
    });
    return bestIdx + side;
  }, []);

  /* ── Drag: commit ─────────────────────────────────────────────────── */

  const commitDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    const moving = new Set(d.indices);
    const remaining: number[] = [];
    for (let i = 0; i < totalSlides; i++) {
      if (!moving.has(i)) remaining.push(i);
    }
    // Hur många icke-flyttade slides ligger före gap:et?
    let insertAt = 0;
    for (let i = 0; i < d.dropGap; i++) {
      if (!moving.has(i)) insertAt++;
    }
    const newOrder = [
      ...remaining.slice(0, insertAt),
      ...d.indices,
      ...remaining.slice(insertAt),
    ];
    if (!newOrder.every((v, i) => v === i)) {
      onReorder?.(newOrder);
    }
    setSelection(new Set());
    setAnchor(null);
  }, [totalSlides, onReorder]);

  /* ── Drag: auto-scroll-loop ───────────────────────────────────────── */

  const tickAutoscroll = useCallback(() => {
    const d = dragRef.current;
    const sc = scrollParentRef.current;
    if (!d) {
      rafRef.current = null;
      return;
    }
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (d.y < r.top + AUTOSCROLL_EDGE) {
        sc.scrollTop -= AUTOSCROLL_SPEED;
      } else if (d.y > r.bottom - AUTOSCROLL_EDGE) {
        sc.scrollTop += AUTOSCROLL_SPEED;
      }
    }
    // Gap kan ändras när containern scrollat under stilla pekare
    const gap = computeDropGap(d.x, d.y);
    if (gap !== d.dropGap) {
      d.dropGap = gap;
      setDrag({ ...d });
    }
    rafRef.current = requestAnimationFrame(tickAutoscroll);
  }, [computeDropGap]);

  /* ── Pekar-handlers (window-baserade under drag) ──────────────────── */

  const endInteraction = useCallback(() => {
    pressRef.current = null;
    dragRef.current = null;
    setDrag(null);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    document.body.style.userSelect = "";
  }, []);

  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      if (!press) return;

      // Starta drag när tröskeln passerats
      if (!dragRef.current) {
        const moved = Math.hypot(
          e.clientX - press.startX,
          e.clientY - press.startY,
        );
        if (moved < DRAG_THRESHOLD) return;
        if (!canDrag) return;

        // Vilka slides ska flyttas?
        let indices: number[];
        if (selection.size > 0 && selection.has(press.index)) {
          indices = [...selection].sort((a, b) => a - b);
        } else {
          indices = [press.index];
          if (selection.size > 0) {
            setSelection(new Set());
            setAnchor(null);
          }
        }
        scrollParentRef.current = findScrollParent(gridRef.current);
        const init: DragState = {
          indices,
          x: e.clientX,
          y: e.clientY,
          dropGap: computeDropGap(e.clientX, e.clientY),
        };
        dragRef.current = init;
        setDrag(init);
        document.body.style.userSelect = "none";
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(tickAutoscroll);
        }
      }

      // Uppdatera pågående drag
      const d = dragRef.current;
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
      }
      const gap = computeDropGap(e.clientX, e.clientY);
      if (gap !== d.dropGap) {
        d.dropGap = gap;
        setDrag({ ...d });
      }
    },
    [canDrag, selection, computeDropGap, tickAutoscroll],
  );

  const handleWindowPointerUp = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      const wasDragging = dragRef.current != null;
      if (wasDragging) {
        commitDrag();
      } else if (press) {
        // Klick (ingen drag) → markera eller navigera
        const i = press.index;
        if (canDrag && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          handleSelectClick(i, {
            shift: e.shiftKey,
            meta: e.metaKey || e.ctrlKey,
          });
        } else {
          setSelection(new Set());
          setAnchor(i);
          onGoTo(i);
        }
      }
      endInteraction();
    },
    [canDrag, commitDrag, handleSelectClick, onGoTo, endInteraction],
  );

  // Registrera window-listeners medan en press/drag pågår
  useEffect(() => {
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", endInteraction);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", endInteraction);
    };
  }, [handleWindowPointerMove, handleWindowPointerUp, endInteraction]);

  // Escape avbryter ett pågående drag
  useEffect(() => {
    if (!drag) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        endInteraction();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [drag, endInteraction]);

  const handleCardPointerDown = (e: React.PointerEvent, i: number) => {
    // Vänsterklick endast
    if (e.button !== 0) return;
    pressRef.current = {
      index: i,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (canDrag && (e.shiftKey || e.metaKey || e.ctrlKey)) {
        handleSelectClick(i, {
          shift: e.shiftKey,
          meta: e.metaKey || e.ctrlKey,
        });
      } else {
        onGoTo(i);
      }
    }
  };

  const dragIndexSet = drag ? new Set(drag.indices) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Verktygsrad: markering + import */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selection.size > 0 ? (
          <div className="flex items-center gap-2.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1">
            <span className="text-[0.72rem] font-medium text-accent">
              {selection.size} markerade
            </span>
            <span className="hidden text-[0.66rem] text-text-muted sm:inline">
              · dra valfri markerad slide för att flytta alla
            </span>
            <button
              type="button"
              onClick={() => {
                setSelection(new Set());
                setAnchor(null);
              }}
              className="rounded-full px-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-text"
            >
              Avmarkera
            </button>
          </div>
        ) : (
          <div className="text-[0.66rem] text-text-muted">
            {canDrag
              ? "Klick: hoppa · Dra: ordna om · Shift/Cmd-klick: markera flera"
              : "Klick för att hoppa till en slide"}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            aria-pressed={compactOverview}
            onClick={() => setCompactOverview((current) => !current)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] transition-colors ${
              compactOverview
                ? "border-accent bg-accent/15 text-accent"
                : "border-white/15 bg-white/[0.04] text-text-muted hover:border-white/35 hover:text-text"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {compactOverview ? "Normal storlek" : "Kompakt översikt"}
          </button>

          <button
            type="button"
            onClick={requestFullOverview}
            disabled={preloadAll || fullOverviewReady}
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] transition-colors ${
              fullOverviewReady
                ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                : preloadAll
                  ? "cursor-wait border-accent/35 bg-accent/10 text-accent"
                  : "border-white/15 bg-white/[0.04] text-text-muted hover:border-accent/60 hover:text-accent"
            }`}
          >
            {fullOverviewReady ? (
              <>✓ Hela översikten klar</>
            ) : preloadAll ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Laddar {loadedPreviewCount}/{totalSlides}
              </>
            ) : (
              <>Ladda alla · {loadedPreviewCount}/{totalSlides}</>
            )}
          </button>

          {typeof onAddBetween === "function" && (
            <button
              type="button"
              onClick={() => onAddBetween(totalSlides - 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-accent transition-colors hover:border-accent hover:bg-accent hover:text-bg"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Importera slides
            </button>
          )}
        </div>
      </div>

      <div
        ref={gridRef}
        className={`grid gap-3 ${
          compactOverview
            ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {cardOrder.map(({ position: i, key, renderHash }) => {
          const isActive = i === currentIndex;
          const hasNotes = notes[i] != null && notes[i] !== "";
          const meta = slideMetas[i] ?? { templateName: "Slide" };
          const isHidden = hiddenSet.has(i + 1);
          const isSelected = selection.has(i);
          const isDragging = dragIndexSet?.has(i) ?? false;
          const isPending =
            pendingToggle === i + 1 || pendingDelete === i + 1;
          const showDropBefore = drag != null && drag.dropGap === i;
          const showDropAfter =
            drag != null && drag.dropGap === totalSlides && i === totalSlides - 1;
          const thumbnail = thumbnailUrls.get(key);
          const thumbnailIsFresh = thumbnail?.renderHash === renderHash;

          return (
            <div
              key={key}
              data-thumb-index={i}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => handleCardPointerDown(e, i)}
              onDoubleClick={() => onOpenSlide?.(i)}
              onKeyDown={(e) => handleCardKeyDown(e, i)}
              onContextMenu={(e) => {
                if (!canHide) return;
                e.preventDefault();
                handleToggleHidden(i + 1);
              }}
              aria-label={`Slide ${i + 1}${meta.primaryText ? ": " + meta.primaryText : ""}${isHidden ? " (dold)" : ""}`}
              className={`group relative flex aspect-[16/9] select-none flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow,transform] ${
                canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
              } ${
                isDragging
                  ? "border-accent/60 opacity-35"
                  : isSelected
                    ? "border-accent ring-1 ring-accent"
                    : isActive
                      ? "border-accent"
                      : "border-white/10 hover:border-white/35"
              } ${isPending ? "animate-pulse" : ""}`}
              style={{
                // CSS order = visuell placering. DOM-ordningen (sorterad på
                // identitet) hålls stabil → korten flyttas aldrig fysiskt.
                order: i,
                // Browser-native rendering-virtualisering. Alla kort finns
                // kvar för drag/drop och stabila nycklar, men layout/paint
                // för långt bort från viewporten skjuts upp.
                contentVisibility: drag ? "visible" : "auto",
                containIntrinsicSize: "180px",
                // Utan detta tolkar webbläsaren dragrörelsen som en
                // scroll-gest, tar över pekaren och skickar pointercancel —
                // vilket avbryter draget innan det hunnit börja. Samma
                // inställning som FloatingImage har, där drag alltid fungerat.
                //
                // "none" och inte "pan-y": korten flyttas i BÅDA led i ett
                // rutnät, så vertikala drag måste också få vara drag. Priset
                // är att man inte kan svepscrolla med start på ett kort —
                // hjul, scrollbar och svep i mellanrummen fungerar fortsatt.
                touchAction: "none",
                ...(isActive && !isSelected
                  ? { boxShadow: "0 0 22px var(--accent-dim)" }
                  : {}),
              }}
            >
              {/* Skelett-lager — syns tills en riktig WebP-miniatyr fångats. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bg-surface/80 p-3 text-center">
                <span className="font-mono text-2xl font-semibold tabular-nums text-white/15">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="px-2 text-center text-[0.6rem] uppercase tracking-[0.14em] text-white/25">
                  {shortTemplateName(meta.templateName)}
                </span>
                {meta.primaryText ? (
                  <span className="line-clamp-3 text-[0.68rem] leading-snug text-white/35">
                    {meta.primaryText}
                  </span>
                ) : null}
              </div>

              {/* Den färdiga previewen är en lätt WebP-bild. En tillfällig,
                  same-origin iframe finns bara medan just den här bilden
                  skapas och avmonteras direkt efter capture. */}
              {thumbnail ? (
                <img
                  src={thumbnail.url}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  // Bilder är dragbara av sig själva i webbläsaren. Utan
                  // detta startar en native HTML5-dragning så fort man tar
                  // tag i en miniatyr: muspekaren blir en stopp-ikon, ett
                  // pointercancel skickas, och kortets egen dragkod hinner
                  // aldrig köra. FloatingImage har haft draggable={false}
                  // sedan den skrevs — därför har drag alltid fungerat där.
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              {!thumbnailIsFresh && slug && previewsReady ? (
                <SlidePreviewFrame
                  slug={slug}
                  slideNumber={i + 1}
                  renderHash={renderHash}
                  eager={preloadAll && i < preloadLimit}
                  onCaptured={(blob) =>
                    handleThumbnailCaptured(key, renderHash, blob)
                  }
                />
              ) : null}
              {thumbnail && !thumbnailIsFresh ? (
                <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full border border-accent/30 bg-black/70 px-2 py-0.5 text-[0.5rem] uppercase tracking-wider text-accent">
                  Uppdateras
                </span>
              ) : null}

              {/* Top-scrim + badges */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/65 to-transparent p-2">
                <span
                  className={`font-mono text-[0.7rem] font-semibold tabular-nums ${
                    isActive || isSelected ? "text-accent" : "text-white/90"
                  }`}
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="rounded-sm bg-black/55 px-1.5 py-0.5 font-mono text-[0.54rem] uppercase tracking-wider text-white/80"
                  title={meta.templateName}
                >
                  {shortTemplateName(meta.templateName)}
                </span>
              </div>

              {/* Bottom-rad: notes + dold-markör */}
              {(hasNotes || isHidden) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-4">
                  {hasNotes && (
                    <span className="flex items-center gap-1 text-[0.55rem] uppercase tracking-wider text-white/80">
                      <span className="h-1 w-1 rounded-full bg-accent" />
                      Notes
                    </span>
                  )}
                  {isHidden && (
                    <span className="ml-auto rounded-sm border border-white/20 bg-black/60 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-white/80">
                      Dold
                    </span>
                  )}
                </div>
              )}

              {/* Dim-overlay för dolda slides */}
              {isHidden && (
                <div className="pointer-events-none absolute inset-0 bg-bg/55" />
              )}

              {/* Markerings-bock */}
              {isSelected && (
                <span className="pointer-events-none absolute right-2 top-7 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-bg shadow-lg">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              )}

              {/* Hover-knappar: redigera / dölj / ta bort */}
              {canHide && (
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  {/* Snabbredigera text */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Snabbredigera text på slide ${i + 1}`}
                    title="Snabbredigera text"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onQuickEditSlide) onQuickEditSlide(i);
                      else setEditingSlide(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onQuickEditSlide) onQuickEditSlide(i);
                        else setEditingSlide(i);
                      }
                    }}
                    className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-accent/90 text-bg transition-all hover:scale-110 hover:bg-accent ${
                      persistentActions
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </span>

                  {/* Dölj / visa */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={isHidden ? `Visa slide ${i + 1}` : `Dölj slide ${i + 1}`}
                    title={isHidden ? "Visa igen i presentation" : "Dölj i presentation"}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleHidden(i + 1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleHidden(i + 1);
                      }
                    }}
                    className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white transition-all ${
                      isHidden
                        ? "bg-white/20 opacity-100"
                        : persistentActions
                          ? "bg-black/55 opacity-100 hover:bg-black/80"
                          : "bg-black/55 opacity-0 hover:bg-black/80 group-hover:opacity-100"
                    }`}
                  >
                    {isHidden ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </span>

                  {/* Ta bort */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Ta bort slide ${i + 1}`}
                    title="Ta bort sliden (ångra med Ctrl+Z)"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(i + 1, meta);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(i + 1, meta);
                      }
                    }}
                    className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-red-500/80 text-white transition-all hover:scale-110 hover:bg-red-500 ${
                      persistentActions
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </span>
                </div>
              )}

              {typeof onAddBetween === "function" && !isHidden && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Importera slides efter slide ${i + 1}`}
                  title="Importera slides från annan presentation efter denna"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBetween(i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddBetween(i);
                    }
                  }}
                  className={`absolute bottom-1.5 right-1.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-accent/90 text-bg transition-all hover:scale-110 hover:bg-accent ${
                    persistentActions
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              )}

              {/* Insättnings-indikator */}
              {showDropBefore && (
                <span className="pointer-events-none absolute -left-[7px] top-0 bottom-0 z-10 w-[3px] rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
              )}
              {showDropAfter && (
                <span className="pointer-events-none absolute -right-[7px] top-0 bottom-0 z-10 w-[3px] rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Drag-ghost — följer pekaren */}
      {drag && (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed left-0 top-0 z-[80] flex items-center gap-2 rounded-lg border border-accent bg-bg-surface/95 px-3 py-2 shadow-2xl"
          style={{
            transform: `translate(${drag.x + 16}px, ${drag.y + 16}px)`,
          }}
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-xs font-bold text-bg">
            {drag.indices.length}
          </span>
          <span className="text-xs font-medium text-text">
            {drag.indices.length === 1
              ? `Flyttar slide ${drag.indices[0] + 1}`
              : `Flyttar ${drag.indices.length} slides`}
          </span>
        </div>
      )}

      {/* Snabb-redigerings-modal. Vid sparning byter slidens identitets-hash
          → bara dess kort återskapas och laddas om. */}
      {editingSlide !== null && slug && !onQuickEditSlide && (
        <QuickEditModal
          slug={slug}
          slideNumber={editingSlide + 1}
          onClose={() => setEditingSlide(null)}
        />
      )}
    </div>
  );
}

/* ── Lazy, skalad iframe-preview ──────────────────────────────────────── */

/**
 * Tillfällig renderarbetare för en enda slide.
 *
 * Iframen laddar den riktiga sliden, men blir aldrig själva cachen. När
 * preview-routen har fångat ett stabilt läge till WebP skickas blobben hit
 * via postMessage; föräldern sparar bilden och avmonterar denna komponent.
 */
function SlidePreviewFrame({
  slug,
  slideNumber,
  renderHash,
  eager,
  onCaptured,
}: {
  slug: string;
  slideNumber: number;
  renderHash: string;
  eager: boolean;
  onCaptured: (blob: Blob) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const releaseWorkerRef = useRef<(() => void) | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [grantedRequestKey, setGrantedRequestKey] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [frozenSlideNumber, setFrozenSlideNumber] = useState<number | null>(
    null,
  );
  // Räknas upp när en fångst tystnar. Ingår i permit-effektens deps, så
  // kortet begär en ny plats och monterar om sin iframe i stället för att bli
  // stående tomt. Iframen kan misslyckas av skäl utanför appen — webbläsaren
  // svarar "This page couldn't load" när renderarprocessen dör — och då kommer
  // aldrig något meddelande tillbaka.
  const [attempt, setAttempt] = useState(0);

  // Fryst position medan just den här arbetaren lever. Vid reorder behåller
  // kortet sin identitet och den färdiga WebP:n.
  const frozenNumber = useRef<number | null>(null);

  // Spåra även när kortet lämnar viewporten. En köad, ännu inte startad
  // arbetare kan då lämna plats åt det användaren faktiskt tittar på.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        setNearViewport(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: "280px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wantsWorker = eager || nearViewport;
  const priority: WorkerPriority = nearViewport ? "visible" : "background";
  const requestKey = wantsWorker ? `${slideNumber}:${priority}` : "";
  const hasWorkerPermit =
    requestKey !== "" && grantedRequestKey === requestKey;

  // Samtliga previews — både synliga och bakgrundsladdade — delar samma
  // globala fyrplatskö. Därmed kan 180 kort finnas i DOM utan 180 levande
  // iframes. En permit släpps direkt efter WebP-capture eller avmontering.
  useEffect(() => {
    releaseWorkerRef.current?.();
    releaseWorkerRef.current = null;
    frozenNumber.current = null;
    if (!requestKey) return;

    let mounted = true;
    // Skyddsnät: en fångst som aldrig rapporterar tillbaka (iframe som inte
    // laddar, meddelande som tappas) får inte hålla sin plats för alltid.
    // Poolen har bara fyra platser, så fyra tysta fångster skulle annars
    // frysa hela rutnätet permanent. Släpp platsen och låt nästa kort ta den.
    let watchdog: number | undefined;
    const release = requestPreviewWorker(priority, () => {
      if (!mounted) return;
      frozenNumber.current = slideNumber;
      setFrozenSlideNumber(slideNumber);
      setGrantedRequestKey(requestKey);
      watchdog = window.setTimeout(() => {
        releaseWorkerRef.current?.();
        if (!mounted) return;
        // Släpp platsen OCH nollställ kortet, annars står den döda iframen
        // kvar och kortet förblir tomt. Ett par omförsök räcker — därefter
        // låter vi kortet vara hellre än att mala i evighet.
        setGrantedRequestKey("");
        setFrozenSlideNumber(null);
        setAttempt((current) => {
          if (current >= PREVIEW_CAPTURE_MAX_ATTEMPTS) {
            setCaptureError("Miniatyren kunde inte skapas.");
            return current;
          }
          return current + 1;
        });
      }, PREVIEW_CAPTURE_TIMEOUT_MS);
    });
    releaseWorkerRef.current = release;

    return () => {
      mounted = false;
      if (watchdog !== undefined) window.clearTimeout(watchdog);
      release();
      if (releaseWorkerRef.current === release) {
        releaseWorkerRef.current = null;
      }
    };
  }, [attempt, priority, requestKey, slideNumber]);

  // Håll callbacken i en ref. Föräldern skickar in en ny inline-closure vid
  // varje render, och eftersom varje fångad miniatyr triggar en render skulle
  // lyssnaren nedan kopplas av och på hela tiden. Landade ett
  // "thumbnail-ready" i glappet tappades det, permiten släpptes aldrig, och
  // efter fyra sådana missar var hela fyrplatspoolen död — storyboarden
  // stannade med svarta kort och noll iframes.
  const onCapturedRef = useRef(onCaptured);
  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }

      const data = event.data as {
        type?: string;
        slideNumber?: number;
        blob?: Blob;
        message?: string;
      };
      if (data.slideNumber !== frozenNumber.current) return;

      if (
        data.type === "presenter-thumbnail-ready" &&
        data.blob instanceof Blob
      ) {
        releaseWorkerRef.current?.();
        onCapturedRef.current(data.blob);
      } else if (data.type === "presenter-thumbnail-error") {
        releaseWorkerRef.current?.();
        setGrantedRequestKey("");
        setCaptureError(data.message ?? "Miniatyren kunde inte skapas.");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      title={captureError ?? undefined}
    >
      {hasWorkerPermit && frozenSlideNumber !== null && (
        <iframe
          ref={iframeRef}
          src={`/preview-slide/${slug}/${frozenSlideNumber}?thumbnail=1&v=${encodeURIComponent(renderHash)}`}
          title=""
          aria-hidden
          tabIndex={-1}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            border: 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        />
      )}
      {captureError ? (
        <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-red-400" />
      ) : wantsWorker ? (
        <span className="absolute bottom-2 right-2 h-1.5 w-1.5 animate-pulse rounded-full bg-accent/70" />
      ) : null}
    </div>
  );
}

interface ThumbnailEntry {
  url: string;
  renderHash: string;
}

/* ── Hjälpare ─────────────────────────────────────────────────────────── */

/** Närmaste skrollbara förälder (för auto-scroll under drag). */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

function shortTemplateName(name: string): string {
  const map: Record<string, string> = {
    TitleSlide: "TITLE",
    SectionDivider: "DIVIDER",
    GiantText: "GIANT",
    GiantScroll: "SCROLL",
    Quote: "QUOTE",
    PictureQuote: "P-QUOTE",
    ImageText: "IMG+TXT",
    HeroImage: "HERO",
    LayeredText: "LAYERED",
    ImageBleed: "BLEED",
    Collage: "COLLAGE",
    BulletBuild: "BULLETS",
    SideScrollList: "SIDESCRL",
    NumberedReveal: "NUMBERS",
    Timeline: "TIMELINE",
    Reflection: "REFLECT",
    Comparison: "COMPARE",
    StatCounter: "STAT",
    CodeReveal: "CODE",
    PromptAnimation: "PROMPT",
    VideoEmbed: "VIDEO",
    VideoBackground: "VIDEO-BG",
    SlideshowMorph: "MORPH",
    ParticleField: "PARTICLE",
    LoadingSlide: "LOADING",
    PollQuestion: "POLL",
    Callout: "CALLOUT",
  };
  return map[name] ?? name.toUpperCase().slice(0, 8);
}
