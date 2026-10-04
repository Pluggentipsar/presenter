"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { loadCachedThumbnail, pruneCachedThumbnails, storeCachedThumbnail } from "@/lib/thumbnail-cache";

/**
 * Miniatyrer för ytor utanför storyboarden.
 *
 * Bilderna är samma WebP-filer som storyboarden fångar: samma cache och samma
 * förhandsvisningsrutt. Det som redan finns läses direkt. Det som saknas fångas
 * i en liten kö av dolda ramar, med det man faktiskt tittar på först, så att en
 * ny dator eller en ny port inte ger en sida med tomma rutor.
 *
 * Tre användningar delar kön:
 *  - `useDeckThumbnails`    — alla slides i ETT deck (översikten)
 *  - `useCoverThumbnails`   — EN omslagsbild per deck (startsidans bibliotek)
 *  - `useExampleThumbnails` — exempelslides ur ANDRA deck, visade i det här
 *                              deckets tema (komponentgalleriet)
 *
 * Förhandsvisningsrutten läser decket från disk. Därför fångas ingenting medan
 * det finns osparade ändringar, och pågående fångster kastas i samma stund som
 * något ändras — annars kan slide 5 i minnet vara en annan slide än slide 5 i
 * filen.
 */

const DESIGN_W = 1280;
const DESIGN_H = 720;
const MAX_WORKERS = 3;
const CAPTURE_TIMEOUT_MS = 20000;
/** Omslagen ligger under ett eget namn i cachen: storyboarden rensar per deck-slug. */
const COVER_CACHE_SLUG = "__omslag__";

export interface ThumbnailItem {
  /** Nyckeln bilden slås upp med i resultatet. */
  key: string;
  /** Cachens namnrymd och id. För slides: deckets slug + slideId. */
  cacheSlug: string;
  cacheId: string;
  /** Byts när bilden inte längre stämmer. */
  hash: string;
  /** Decket och sliden (1-baserad) som ska fångas. */
  slug: string;
  slideNumber: number;
  /** Visa sliden i ett annat tema än sitt eget (komponentgalleriet). */
  theme?: string;
}

interface Entry {
  url: string;
  hash: string;
}

interface QueueState {
  jobs: readonly ThumbnailItem[];
  failed: ReadonlySet<string>;
}

const EMPTY_QUEUE: QueueState = { jobs: [], failed: new Set() };
const jobKey = (item: Pick<ThumbnailItem, "key" | "hash">) => `${item.key}:${item.hash}`;

/**
 * Kön över pågående fångster. Den lever utanför React: effekterna talar om vad
 * som saknas, kön bestämmer vilka ramar som får finnas, och komponenten läser
 * av den med useSyncExternalStore.
 */
class CaptureQueue {
  private state: QueueState = EMPTY_QUEUE;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;

  private set(next: QueueState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  /** `wanted` är det som saknas, i prioritetsordning. Tom lista tömmer kön. */
  sync(wanted: ThumbnailItem[]) {
    const wantedKeys = new Set(wanted.map(jobKey));
    const kept = this.state.jobs.filter((job) => wantedKeys.has(jobKey(job)));
    const busy = new Set(kept.map(jobKey));
    const added = wanted
      .filter((job) => !busy.has(jobKey(job)) && !this.state.failed.has(jobKey(job)))
      .slice(0, Math.max(0, MAX_WORKERS - kept.length));
    if (added.length === 0 && kept.length === this.state.jobs.length) return;
    this.set({ ...this.state, jobs: [...kept, ...added] });
  }

  settle(job: ThumbnailItem, ok: boolean) {
    if (!this.state.jobs.includes(job)) return;
    const failed = ok ? this.state.failed : new Set(this.state.failed).add(jobKey(job));
    this.set({ jobs: this.state.jobs.filter((j) => j !== job), failed });
  }
}

interface QueueOptions {
  items: ThumbnailItem[];
  /** Av: inga bilder läses eller fångas. */
  enabled: boolean;
  /** Sant när det som ligger på disk är det som ska avbildas. */
  captureEnabled: boolean;
  /** Lägre tal fångas först. Anropas när kön fylls på, inte vid varje rendering. */
  rank: (item: ThumbnailItem, position: number) => number;
}

function useThumbnailQueue({ items, enabled, captureEnabled, rank }: QueueOptions): {
  thumbs: Map<string, string>;
  pending: number;
  workers: ReactNode;
} {
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [hydratedFor, setHydratedFor] = useState("");
  const [queue] = useState(() => new CaptureQueue());
  const { jobs, failed } = useSyncExternalStore(queue.subscribe, queue.getSnapshot, () => EMPTY_QUEUE);
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const signature = useMemo(() => items.map(jobKey).join("|"), [items]);

  const put = useCallback((key: string, hash: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setEntries((current) => {
      if (current.get(key)?.hash === hash) {
        URL.revokeObjectURL(url);
        return current;
      }
      const previous = current.get(key);
      if (previous) URL.revokeObjectURL(previous.url);
      const next = new Map(current);
      next.set(key, { url, hash });
      return next;
    });
  }, []);

  // ── 1. Läs det som redan finns i cachen ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      await Promise.all(
        items.map(async (item) => {
          if (!item.cacheId || !item.hash) return;
          if (entriesRef.current.get(item.key)?.hash === item.hash) return;
          const blob = await loadCachedThumbnail(item.cacheSlug, item.cacheId, item.hash);
          if (blob && !cancelled) put(item.key, item.hash, blob);
        }),
      );
      if (!cancelled) setHydratedFor(signature);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, items, put, signature]);

  // ── 2. Det som saknas ────────────────────────────────────────────────────
  const missing = useMemo(
    () =>
      items
        .map((item, position) => ({ item, position }))
        .filter(({ item }) => item.cacheId && item.hash && entries.get(item.key)?.hash !== item.hash && !failed.has(jobKey(item))),
    [entries, failed, items],
  );

  // ── 3. Mata kön ──────────────────────────────────────────────────────────
  // Med osparade ändringar (eller innan cachen är läst) är listan tom, och då
  // kastar kön även det som pågår.
  useEffect(() => {
    const allowed = enabled && captureEnabled && hydratedFor === signature;
    if (!allowed) {
      queue.sync([]);
      return;
    }
    const wanted = missing
      .map(({ item, position }) => ({ item, position, order: rank(item, position) }))
      // Oändlig rang = "inte nu": omslag utanför bild fångas först när man rullar dit.
      .filter(({ order }) => Number.isFinite(order))
      .sort((a, b) => a.order - b.order || a.position - b.position)
      .map(({ item }) => item);
    queue.sync(wanted);
  }, [captureEnabled, enabled, hydratedFor, jobs, missing, queue, rank, signature]);

  const finish = useCallback(
    (job: ThumbnailItem, blob: Blob | null) => {
      if (blob) {
        void storeCachedThumbnail(job.cacheSlug, job.cacheId, job.hash, blob);
        put(job.key, job.hash, blob);
      }
      queue.settle(job, Boolean(blob));
    },
    [put, queue],
  );

  // Frigör objekt-url:erna när ytan lämnas.
  useEffect(
    () => () => {
      for (const entry of entriesRef.current.values()) URL.revokeObjectURL(entry.url);
    },
    [],
  );

  const thumbs = useMemo(() => {
    const map = new Map<string, string>();
    for (const [key, entry] of entries) map.set(key, entry.url);
    return map;
  }, [entries]);

  // Ramarna ligger osynliga INNANFÖR fönstret. Utanför det kan webbläsaren
  // strypa deras animationsbildrutor, och då blir fångsten aldrig klar.
  const workers = (
    <div
      aria-hidden
      style={{ position: "fixed", left: 0, top: 0, zIndex: -1, width: DESIGN_W, height: DESIGN_H, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
    >
      {jobs.map((job) => (
        <CaptureFrame key={jobKey(job)} job={job} onDone={finish} />
      ))}
    </div>
  );

  return { thumbs, pending: enabled ? missing.length : 0, workers };
}

// ── Alla slides i ett deck ─────────────────────────────────────────────────

interface DeckOptions {
  slug: string;
  slideIds: string[];
  renderHashes: string[];
  /** Av: inga bilder läses eller fångas (läget "Bara tråden"). */
  enabled: boolean;
  /** Sant när modellen i minnet är densamma som filen på disk. */
  captureEnabled: boolean;
  /** Raden som fångsterna ska börja vid — den översta synliga. */
  getFocusIndex: () => number;
}

export function useDeckThumbnails({ slug, slideIds, renderHashes, enabled, captureEnabled, getFocusIndex }: DeckOptions) {
  const items = useMemo<ThumbnailItem[]>(
    () =>
      slideIds.map((id, index) => ({
        key: id,
        cacheSlug: slug,
        cacheId: id,
        hash: renderHashes[index] ?? "",
        slug,
        slideNumber: index + 1,
      })),
    [renderHashes, slideIds, slug],
  );
  const rank = useCallback((_: ThumbnailItem, position: number) => Math.abs(position - getFocusIndex()), [getFocusIndex]);
  return useThumbnailQueue({ items, enabled, captureEnabled, rank });
}

// ── Ett omslag per deck ────────────────────────────────────────────────────

export interface CoverSource {
  slug: string;
  coverSlide: number;
  coverHash: string;
}

export function useCoverThumbnails({
  decks,
  enabled,
  isVisible,
}: {
  decks: CoverSource[];
  enabled: boolean;
  /**
   * Syns kortet just nu? Bara de korten får sina omslag fångade — hundra deck
   * i bakgrunden skulle hålla dev-servern upptagen i flera minuter. Ge
   * funktionen ny identitet när synligheten ändras, så matas kön om.
   */
  isVisible: (slug: string) => boolean;
}) {
  const items = useMemo<ThumbnailItem[]>(
    () =>
      decks.map((deck) => ({
        key: deck.slug,
        cacheSlug: COVER_CACHE_SLUG,
        cacheId: deck.slug,
        hash: deck.coverHash,
        slug: deck.slug,
        slideNumber: deck.coverSlide,
      })),
    [decks],
  );
  const rank = useCallback((item: ThumbnailItem) => (isVisible(item.key) ? 0 : Number.POSITIVE_INFINITY), [isVisible]);

  // Ett omslag per deck räcker: bilder av äldre versioner av filen städas bort.
  useEffect(() => {
    if (!enabled || decks.length === 0) return;
    const timer = window.setTimeout(() => {
      void pruneCachedThumbnails(
        COVER_CACHE_SLUG,
        decks.map((deck) => ({ slideId: deck.slug, renderHash: deck.coverHash })),
      );
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [decks, enabled]);
  return useThumbnailQueue({ items, enabled, captureEnabled: true, rank });
}

// ── Exempelslides i komponentgalleriet ─────────────────────────────────────

export interface ExampleSource {
  /** Nyckeln bilden slås upp med. */
  key: string;
  slug: string;
  slide: number;
  /** Byts när exempeldecket ändras. */
  stamp: string;
}

/**
 * Exemplen visas i temat för det deck man bygger i, inte i sitt eget: det är så
 * mallen kommer att se ut när den läggs till. Varje tema har sin egen namnrymd
 * i cachen, och där städas bilder av äldre versioner bort.
 */
export function useExampleThumbnails({
  examples,
  theme,
  enabled,
  isVisible,
}: {
  examples: ExampleSource[];
  theme: string;
  enabled: boolean;
  isVisible: (key: string) => boolean;
}) {
  const cacheSlug = `__mallar__${theme}`;
  const items = useMemo<ThumbnailItem[]>(
    () =>
      examples.map((example) => ({
        key: example.key,
        cacheSlug,
        cacheId: example.key,
        hash: `${example.stamp}-${example.slide}`,
        slug: example.slug,
        slideNumber: example.slide,
        theme,
      })),
    [cacheSlug, examples, theme],
  );
  const rank = useCallback((item: ThumbnailItem) => (isVisible(item.key) ? 0 : Number.POSITIVE_INFINITY), [isVisible]);

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    const timer = window.setTimeout(() => {
      void pruneCachedThumbnails(cacheSlug, items.map((item) => ({ slideId: item.cacheId, renderHash: item.hash })));
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [cacheSlug, enabled, items]);

  return useThumbnailQueue({ items, enabled, captureEnabled: true, rank });
}

function CaptureFrame({ job, onDone }: { job: ThumbnailItem; onDone: (job: ThumbnailItem, blob: Blob | null) => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let settled = false;
    const settle = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      doneRef.current(job, blob);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; slideNumber?: number; blob?: Blob };
      if (data.slideNumber !== job.slideNumber) return;
      if (data.type === "presenter-thumbnail-ready" && data.blob instanceof Blob) settle(data.blob);
      else if (data.type === "presenter-thumbnail-error") settle(null);
    };
    window.addEventListener("message", onMessage);
    const watchdog = window.setTimeout(() => settle(null), CAPTURE_TIMEOUT_MS);
    return () => {
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(watchdog);
    };
  }, [job]);

  return (
    <iframe
      ref={frameRef}
      src={`/preview-slide/${job.slug}/${job.slideNumber}?thumbnail=1&v=${encodeURIComponent(job.hash)}${job.theme ? `&theme=${encodeURIComponent(job.theme)}` : ""}`}
      title=""
      tabIndex={-1}
      sandbox="allow-scripts allow-same-origin"
      style={{ position: "absolute", inset: 0, width: DESIGN_W, height: DESIGN_H, border: 0 }}
    />
  );
}
