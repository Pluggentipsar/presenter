"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, useSyncExternalStore } from "react";
import type { PresentationMeta } from "@/lib/types";
import type { ParsedPresentation } from "@/lib/mdx-parser";
import { savePresentation } from "@/lib/edit-actions";
import { buildDeckManifest } from "@/lib/deck-manifest";
import type {
  AuthoringMode,
  AuthoringSaveStatus,
} from "@/lib/authoring-types";
import { StoryboardWorkspace } from "@/components/studio/StoryboardWorkspace";
import { ManusWorkspace } from "@/components/studio/ManusWorkspace";
import {
  OversiktWorkspace,
  type ReadingChapter,
} from "@/components/studio/OversiktWorkspace";
import { EditorView } from "@/components/editor/EditorView";
import { ComponentGallery } from "@/components/gallery/ComponentGallery";
import { AppRail, useRailWidth, type DeckMode, type RailDeck } from "@/components/app/AppRail";
import { convertSlide, plannedTemplate } from "@/lib/convert-slide";
import { getServerWorkshopForm, getWorkshopForm, subscribeWorkshopForm } from "@/lib/workshop-settings";
import { duplicateSlide, insertSlidesAfter } from "@/lib/deck-operations";
import { ImportSlidesModal, type ImportSlideSelection } from "@/components/ImportSlidesModal";
import { loadSlidesForAuthoring } from "@/lib/edit-actions";
import { createSlideId } from "@/lib/slide-ids";
import type { ParsedComponent } from "@/lib/mdx-parser";

interface AuthoringShellProps {
  slug: string;
  meta: PresentationMeta;
  initialParsed: ParsedPresentation;
  initialRevision: string;
  initialMode: AuthoringMode;
  initialActiveIndex?: number;
  /** Lästextens kapitel — reservstruktur i översikten när decket saknar akter. */
  readingChapters?: ReadingChapter[];
  /** Anteckningarna om föreläsningen. null på en publik värd — då visas de inte alls. */
  initialNote?: string | null;
}

const NO_CHAPTERS: ReadingChapter[] = [];

interface HistoryState {
  past: ParsedPresentation[];
  future: ParsedPresentation[];
  lastCheckpointAt: number;
}

const HISTORY_LIMIT = 60;
const HISTORY_GROUP_MS = 650;

export function AuthoringShell({
  slug,
  meta,
  initialParsed,
  initialRevision,
  initialMode,
  initialActiveIndex = 0,
  readingChapters = NO_CHAPTERS,
  initialNote = null,
}: AuthoringShellProps) {
  const [mode, setMode] = useState<AuthoringMode>(initialMode);
  // Storyboarden monteras först när den öppnas och ligger sedan kvar dold, så
  // att dess miniatyrer och rullning finns när man kommer tillbaka. Förut
  // byggdes den (alla kort, alla bilder) också för den som bara öppnade
  // översikten eller editorn.
  const [storyboardMounted, setStoryboardMounted] = useState(initialMode === "storyboard");
  // Ljus verkstad (standard) eller mörk — se lib/workshop-settings.ts och .verkstad i globals.css.
  const workshopForm = useSyncExternalStore(subscribeWorkshopForm, getWorkshopForm, getServerWorkshopForm);
  const [parsed, setParsedState] = useState(initialParsed);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialActiveIndex, 0), initialParsed.slides.length - 1),
  );
  const [saveStatus, setSaveStatus] =
    useState<AuthoringSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [storyboardParsed, setStoryboardParsed] = useState(initialParsed);
  const [diskConflict, setDiskConflict] = useState<{
    parsed: ParsedPresentation;
    revision: string;
  } | null>(null);

  const parsedRef = useRef(parsed);
  const revisionRef = useRef(initialRevision);
  const changeRevisionRef = useRef(0);
  const savedChangeRevisionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const historyRef = useRef<HistoryState>({
    past: [],
    future: [],
    lastCheckpointAt: 0,
  });
  const queueSave = useCallback((): Promise<boolean> => {
    const operation = saveQueueRef.current.then(async () => {
      if (diskConflict) return false;
      const targetChangeRevision = changeRevisionRef.current;
      if (savedChangeRevisionRef.current >= targetChangeRevision) return true;

      setSaveStatus("saving");
      const result = await savePresentation(
        slug,
        parsedRef.current,
        revisionRef.current,
      );
      if (result.ok && result.revision) {
        revisionRef.current = result.revision;
        savedChangeRevisionRef.current = targetChangeRevision;
        setSaveStatus("saved");
        setSaveError(null);
        window.setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 1600);
        return true;
      }

      if (
        result.conflict &&
        result.currentParsed &&
        result.currentRevision
      ) {
        setDiskConflict({
          parsed: result.currentParsed,
          revision: result.currentRevision,
        });
        setSaveStatus("conflict");
        setSaveError(
          "Filen ändrades utanför den här editorn. Ingenting har skrivits över.",
        );
        return false;
      }

      setSaveStatus("error");
      setSaveError(result.error ?? "Kunde inte spara presentationen.");
      return false;
    });
    saveQueueRef.current = operation.catch(() => false);
    return operation;
  }, [diskConflict, slug]);

  const scheduleSave = useCallback(() => {
    changeRevisionRef.current += 1;
    setSaveStatus("dirty");
    setSaveError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void queueSave();
    }, 320);
  }, [queueSave]);

  const updateParsed: Dispatch<SetStateAction<ParsedPresentation>> = useCallback(
    (update) => {
      setParsedState((previous) => {
        const next =
          typeof update === "function"
            ? (update as (value: ParsedPresentation) => ParsedPresentation)(
                previous,
              )
            : update;
        if (next === previous) return previous;

        const now = Date.now();
        const history = historyRef.current;
        if (
          history.past.length === 0 ||
          now - history.lastCheckpointAt > HISTORY_GROUP_MS
        ) {
          history.past = [...history.past, previous].slice(-HISTORY_LIMIT);
        }
        history.future = [];
        history.lastCheckpointAt = now;
        parsedRef.current = next;
        setHistoryAvailability({
          canUndo: history.past.length > 0,
          canRedo: false,
        });
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const queued = await queueSave();
    if (!queued) return false;
    if (savedChangeRevisionRef.current < changeRevisionRef.current) {
      return queueSave();
    }
    return true;
  }, [queueSave]);

  const restoreHistory = useCallback(
    (direction: "undo" | "redo") => {
      const history = historyRef.current;
      const source = direction === "undo" ? history.past : history.future;
      const target = source[source.length - 1];
      if (!target) return;

      const current = parsedRef.current;
      if (direction === "undo") {
        history.past = history.past.slice(0, -1);
        history.future = [...history.future, current].slice(-HISTORY_LIMIT);
      } else {
        history.future = history.future.slice(0, -1);
        history.past = [...history.past, current].slice(-HISTORY_LIMIT);
      }
      history.lastCheckpointAt = 0;
      parsedRef.current = target;
      setParsedState(target);
      setActiveIndex((index) =>
        Math.min(index, Math.max(0, target.slides.length - 1)),
      );
      setHistoryAvailability({
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  // Ctrl+Z / Ctrl+Skift+Z (och Ctrl+Y) i alla lägen. Översikten sköter sin
  // lista själv och markerar tangenten som hanterad; skrivfält har sin egen
  // ångra för texten man skriver.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || !(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      restoreHistory(key === "y" || e.shiftKey ? "redo" : "undo");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restoreHistory]);

  const acceptDiskVersion = useCallback(() => {
    if (!diskConflict) return;
    revisionRef.current = diskConflict.revision;
    parsedRef.current = diskConflict.parsed;
    setParsedState(diskConflict.parsed);
    setActiveIndex((index) =>
      Math.min(index, Math.max(0, diskConflict.parsed.slides.length - 1)),
    );
    changeRevisionRef.current = 0;
    savedChangeRevisionRef.current = 0;
    historyRef.current = { past: [], future: [], lastCheckpointAt: 0 };
    setHistoryAvailability({ canUndo: false, canRedo: false });
    setStoryboardParsed(diskConflict.parsed);
    setDiskConflict(null);
    setSaveStatus("idle");
    setSaveError(null);
  }, [diskConflict]);

  const switchMode = useCallback(
    (nextMode: AuthoringMode, slide?: number) => {
      // Snapshotta alltid vid lägesbyte. Editorn läser ögonblicksbilden så att
      // manifestet inte räknas om vid varje tangenttryck; storyboard och manus
      // läser `parsed` direkt och behöver alltså en färsk bild när de öppnas.
      setStoryboardParsed(parsedRef.current);
      if (typeof slide === "number") setActiveIndex(slide);
      if (nextMode === "storyboard") setStoryboardMounted(true);
      setMode(nextMode);
    },
    [mode],
  );

  const present = useCallback(async () => {
    if (!(await flushSave())) return;
    window.location.assign(`/${slug}?slide=${activeIndex + 1}`);
  }, [activeIndex, flushSave, slug]);

  useEffect(() => {
    const path = mode === "editor" ? `/${slug}/edit` : `/${slug}/studio`;
    const url = new URL(window.location.href);
    url.pathname = path;
    if (mode === "manus" || mode === "oversikt") url.searchParams.set("mode", mode);
    else url.searchParams.delete("mode");
    url.searchParams.set("slide", String(activeIndex + 1));
    window.history.replaceState({}, "", url.toString());
  }, [activeIndex, mode, slug]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (
      saveStatus !== "dirty" &&
      saveStatus !== "saving" &&
      saveStatus !== "error" &&
      saveStatus !== "conflict"
    ) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [saveStatus]);

  // Bara editorn läser ögonblicksbilden. Storyboard och manus går på det
  // levande trädet, så att en redigering i manusläget syns direkt.
  const storyboardSource = mode === "editor" ? storyboardParsed : parsed;
  // Hela kedjan går numera direkt på det parsade trädet — ingen serialisering
  // av decken, ingen om-parsning, ingen råtextskanning. Notes, hashar och
  // slide-metadata memoiseras per slide, så en operation bara räknar om det
  // som faktiskt ändrats.
  //
  // Strukturell delning mot föregående bygge sköts inuti buildDeckManifest, så
  // oförändrade poster och arrayer behåller sina referenser mellan operationer.
  const storyboardData = useMemo(() => {
    const frontmatter = storyboardSource.frontmatter;
    const manifest = buildDeckManifest(
      storyboardSource,
      {
      theme:
        typeof frontmatter.theme === "string"
          ? frontmatter.theme
          : meta.theme,
      brand: meta.brand,
      ambient:
        frontmatter.ambient === true || typeof frontmatter.ambient === "string"
          ? frontmatter.ambient
          : false,
      sliderEffects: frontmatter.sliderEffects as PresentationMeta["sliderEffects"],
      slideGradients: frontmatter.slideGradients as PresentationMeta["slideGradients"],
      slideAccents: frontmatter.slideAccents as PresentationMeta["slideAccents"],
      slideTextColors:
        frontmatter.slideTextColors as PresentationMeta["slideTextColors"],
      slideMutedColors:
        frontmatter.slideMutedColors as PresentationMeta["slideMutedColors"],
      accentOverride:
        typeof frontmatter.accentOverride === "string"
          ? frontmatter.accentOverride
          : undefined,
      textOverride:
        typeof frontmatter.textOverride === "string"
          ? frontmatter.textOverride
          : undefined,
      mutedOverride:
        typeof frontmatter.mutedOverride === "string"
          ? frontmatter.mutedOverride
          : undefined,
      },
    );
    return { manifest };
  }, [meta, storyboardSource]);

  // Byggdes tidigare med .map() direkt i JSX, vilket gav en ny array-referens
  // vid varje render och slog ut memoiseringen i SlideThumbnails.
  const hiddenSlides = useMemo(
    () =>
      Array.isArray(storyboardSource.frontmatter.hiddenSlides)
        ? storyboardSource.frontmatter.hiddenSlides.map(Number)
        : [],
    [storyboardSource.frontmatter.hiddenSlides],
  );

  // Skrevs tidigare som inline-pilfunktioner i JSX, vilket gav StoryboardWorkspace
  // fyra nya prop-identiteter vid varje render av skalet — React.memo hade
  // aldrig kunnat bita.
  const handleOpenEditor = useCallback(
    (index: number) => switchMode("editor", index),
    [switchMode],
  );
  const handleOpenManus = useCallback(() => switchMode("manus"), [switchMode]);
  const handleOpenStoryboard = useCallback(
    () => switchMode("storyboard"),
    [switchMode],
  );
  const handleOpenOversikt = useCallback(
    () => switchMode("oversikt"),
    [switchMode],
  );
  const handlePresent = useCallback(() => void present(), [present]);

  // Komponentgalleriet öppnas från alla lägen och lägger den nya sliden efter
  // den man står på. Sedan går man till slide-editorn — det är där den fylls i.
  // Samma galleri byter också mall på en befintlig slide — ett utkast som får
  // sin form. Då följer tanken med: se lib/convert-slide.ts.
  const [gallery, setGallery] = useState<{ kind: "insert"; after: number } | { kind: "replace"; index: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handleOpenGallery = useCallback((afterIndex: number) => setGallery({ kind: "insert", after: afterIndex }), []);
  const handleChangeTemplate = useCallback((index: number) => setGallery({ kind: "replace", index }), []);
  const handleCloseGallery = useCallback(() => setGallery(null), []);
  const handleInsertFromGallery = useCallback(
    (slide: ParsedComponent) => {
      if (!gallery) return;
      setGallery(null);
      if (gallery.kind === "insert") {
        updateParsed((current) => insertSlidesAfter(current, gallery.after, [slide]));
        switchMode("editor", gallery.after + 1);
        return;
      }
      const source = parsedRef.current.slides[gallery.index];
      if (!source) return;
      // Bytet räknas på trädet som det ÄR när uppdateringen körs. Referensen
      // ovan duger för beskedet, men inte som identitet: i utvecklingsläge kör
      // React uppdateraren två gånger, och då är parsedRef och tillståndet lika
      // till innehållet men inte samma objekt.
      const sourceId = source.props.slideId;
      updateParsed((current) => {
        const live = current.slides[gallery.index];
        if (!live || live.tag !== source.tag || live.props.slideId !== sourceId) return current;
        const slides = current.slides.slice();
        slides[gallery.index] = convertSlide(live, slide).slide;
        return { ...current, slides };
      });
      const result = convertSlide(source, slide);
      const message =
        result.textWent === "notes"
          ? "Den nya mallen har inget enkelt textfält, så orden från den gamla sliden ligger sist i manuset."
          : result.wordsFit === "list-expected"
            ? "Mallen läser sitt innehåll som en lista. Dina ord ligger i innehållsfältet — skriv om dem rad för rad, så syns de på sliden."
            : null;
      if (message) {
        setNotice(message);
        window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 9000);
      }
      switchMode("editor", gallery.index);
    },
    [gallery, switchMode, updateParsed],
  );
  // Ett kort besked längst ner — samma ruta som galleriets.
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 6000);
  }, []);

  // Hämta färdiga slides ur en annan föreläsning. Fönstret ägdes förut av
  // storyboarden och gick bara att nå därifrån; nu öppnas det från alla lägen
  // (översiktens rad, editorn, storyboarden och menyns Lägg till).
  const [importAfter, setImportAfter] = useState<number | null>(null);
  const handleOpenImport = useCallback((afterIndex: number) => setImportAfter(afterIndex), []);
  const handleImport = useCallback(
    async (selection: ImportSlideSelection[], insertAfterIndex: number): Promise<{ ok: boolean; copied?: number; error?: string }> => {
      const result = await loadSlidesForAuthoring(selection);
      if (!result.ok || !result.slides) return result;
      const incoming = result.slides;
      updateParsed((current) => insertSlidesAfter(current, insertAfterIndex, incoming));
      setActiveIndex(insertAfterIndex + incoming.length);
      showNotice(
        incoming.length === 1
          ? "En slide hämtades, med sitt manus. Den ligger efter den du stod på."
          : `${incoming.length} slides hämtades, med sina manus. De ligger efter den du stod på.`,
      );
      return { ok: true, copied: incoming.length };
    },
    [showNotice, updateParsed],
  );
  const handleDuplicateCurrent = useCallback(() => {
    const at = activeIndex;
    updateParsed((current) => duplicateSlide(current, at));
    setActiveIndex(at + 1);
    showNotice("Sliden kopierades. Kopian ligger direkt efter.");
  }, [activeIndex, showNotice, updateParsed]);
  const handleAddDraft = useCallback(() => {
    const at = activeIndex;
    updateParsed((current) =>
      insertSlidesAfter(current, at, [{ tag: "Utkast", props: { slideId: createSlideId() }, content: "", children: [] }]),
    );
    setActiveIndex(at + 1);
    showNotice("En ny tanke ligger efter sliden: skriv syftet nu, välj mall när formen är klar.");
  }, [activeIndex, showNotice, updateParsed]);

  const galleryTheme = typeof parsed.frontmatter.theme === "string" ? parsed.frontmatter.theme : (meta.theme ?? "default");
  const usedTags = useMemo(() => {
    const tally = new Map<string, number>();
    for (const slide of parsed.slides) tally.set(slide.tag, (tally.get(slide.tag) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [parsed.slides]);
  // Hård navigering efter sparning: en mjuk länk avmonterar skalet och tar
  // spartimern med sig, och då kan den sista ändringen gå förlorad.
  const handleOpenLibrary = useCallback(() => {
    void flushSave().then((saved) => {
      if (saved) window.location.assign("/");
    });
  }, [flushSave]);
  const handleUndo = useCallback(() => restoreHistory("undo"), [restoreHistory]);
  const handleRedo = useCallback(() => restoreHistory("redo"), [restoreHistory]);

  const { canUndo, canRedo } = historyAvailability;

  // Appmenyn: samma knappar som vyernas egna verktygsrader, fast alltid på
  // samma plats. Sidan lämnar menyns bredd till vänster.
  const railWidth = useRailWidth();
  const railDeck = useMemo<RailDeck>(
    () => ({
      slug,
      title: typeof parsed.frontmatter.title === "string" ? parsed.frontmatter.title : meta.title,
      mode,
      onMode: (next: DeckMode) => {
        if (next === "editor") handleOpenEditor(activeIndex);
        else switchMode(next);
      },
      onPresent: handlePresent,
      onAdd: {
        gallery: () => handleOpenGallery(activeIndex),
        import: () => handleOpenImport(activeIndex),
        duplicate: handleDuplicateCurrent,
        draft: handleAddDraft,
      },
      onLibrary: handleOpenLibrary,
      onShare: () => {
        void flushSave().then((saved) => {
          if (saved) window.location.assign(`/${slug}/dela`);
        });
      },
    }),
    [activeIndex, flushSave, handleAddDraft, handleDuplicateCurrent, handleOpenEditor, handleOpenGallery, handleOpenImport, handleOpenLibrary, handlePresent, meta.title, mode, parsed.frontmatter.title, slug, switchMode],
  );

  return (
    <div className={`relative min-h-screen bg-bg text-text${workshopForm === "ljus" ? " verkstad" : ""}`} style={{ paddingLeft: railWidth }}>
      <AppRail deck={railDeck} />
      {diskConflict && (
        <div className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-xl border border-[#e9b44c]/40 bg-[#20180b]/95 px-4 py-3 text-sm text-[#fde9b8] shadow-2xl backdrop-blur">
          <div>
            <strong className="font-semibold">Sparningen pausades.</strong>{" "}
            Filen har ändrats utanför den här editorn, så din version skrevs
            inte över.
          </div>
          <button
            type="button"
            onClick={acceptDiskVersion}
            className="shrink-0 rounded-lg bg-[#f0c060] px-3 py-1.5 text-xs font-semibold text-[#20180b]"
          >
            Ladda filversionen
          </button>
        </div>
      )}

      <div className={mode === "storyboard" ? "block" : "hidden"}>
        {storyboardMounted && storyboardData && (
          <StoryboardWorkspace
            slug={slug}
            title={
              typeof storyboardSource.frontmatter.title === "string"
                ? storyboardSource.frontmatter.title
                : meta.title
            }
            theme={
              typeof storyboardSource.frontmatter.theme === "string"
                ? storyboardSource.frontmatter.theme
                : meta.theme ?? "default"
            }
            parsed={storyboardSource}
            updateParsed={updateParsed}
            slideMetas={storyboardData.manifest.slideMetas}
            notes={storyboardData.manifest.notes}
            hiddenSlides={hiddenSlides}
            slideIds={storyboardData.manifest.slideIds}
            slideHashes={storyboardData.manifest.contentHashes}
            slideRenderHashes={storyboardData.manifest.renderHashes}
            currentIndex={activeIndex}
            onCurrentIndexChange={setActiveIndex}
            onOpenEditor={handleOpenEditor}
            onPresent={handlePresent}
            saveStatus={saveStatus}
            saveError={saveError}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenManus={handleOpenManus}
            onOpenOversikt={handleOpenOversikt}
            onOpenGallery={handleOpenGallery}
            onOpenImport={handleOpenImport}
          />
        )}
      </div>

      {mode === "oversikt" && storyboardData && (
        <OversiktWorkspace
          slug={slug}
          title={
            typeof parsed.frontmatter.title === "string"
              ? parsed.frontmatter.title
              : meta.title
          }
          parsed={parsed}
          updateParsed={updateParsed}
          slideMetas={storyboardData.manifest.slideMetas}
          notes={storyboardData.manifest.notes}
          hiddenSlides={hiddenSlides}
          slideIds={storyboardData.manifest.slideIds}
          slideRenderHashes={storyboardData.manifest.renderHashes}
          readingChapters={readingChapters}
          note={initialNote}
          currentIndex={activeIndex}
          onCurrentIndexChange={setActiveIndex}
          onOpenEditor={handleOpenEditor}
          onOpenStoryboard={handleOpenStoryboard}
          onOpenManus={handleOpenManus}
          onOpenLibrary={handleOpenLibrary}
          onOpenGallery={handleOpenGallery}
          onOpenImport={handleOpenImport}
          onChangeTemplate={handleChangeTemplate}
          onPresent={handlePresent}
          saveStatus={saveStatus}
          saveError={saveError}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      )}

      {mode === "manus" && storyboardData && (
        <ManusWorkspace
          slug={slug}
          title={
            typeof parsed.frontmatter.title === "string"
              ? parsed.frontmatter.title
              : meta.title
          }
          parsed={parsed}
          updateParsed={updateParsed}
          slideMetas={storyboardData.manifest.slideMetas}
          notes={storyboardData.manifest.notes}
          onOpenEditor={handleOpenEditor}
          onOpenStoryboard={handleOpenStoryboard}
          onOpenOversikt={handleOpenOversikt}
          onChangeTemplate={handleChangeTemplate}
          saveStatus={saveStatus}
          saveError={saveError}
        />
      )}

      {mode === "editor" && (
        <EditorView
          slug={slug}
          meta={meta}
          parsed={parsed}
          setParsed={updateParsed}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onOpenManus={handleOpenManus}
          onOpenOversikt={handleOpenOversikt}
          onOpenGallery={handleOpenGallery}
          onOpenImport={handleOpenImport}
          onChangeTemplate={handleChangeTemplate}
          saveStatus={saveStatus}
          saveError={saveError}
          flushSave={flushSave}
          onOpenStoryboard={() => switchMode("storyboard")}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => restoreHistory("undo")}
          onRedo={() => restoreHistory("redo")}
        />
      )}
      {gallery ? (
        <ComponentGallery
          key={gallery.kind === "insert" ? `insert-${gallery.after}` : `replace-${gallery.index}`}
          theme={galleryTheme}
          usedTags={usedTags}
          purpose={gallery.kind}
          replaceSource={gallery.kind === "replace" ? (parsed.slides[gallery.index] ?? null) : null}
          initialTag={gallery.kind === "replace" ? plannedTemplate(parsed.slides[gallery.index] ?? { tag: "", props: {}, content: null, children: [] }) : null}
          positionLabel={
            gallery.kind === "insert"
              ? `efter slide ${gallery.after + 1} av ${parsed.slides.length}`
              : `slide ${gallery.index + 1} · ${parsed.slides[gallery.index]?.tag ?? ""}`
          }
          onClose={handleCloseGallery}
          onInsert={handleInsertFromGallery}
        />
      ) : null}
      <ImportSlidesModal
        open={importAfter !== null}
        onClose={() => setImportAfter(null)}
        targetSlug={slug}
        insertAfterIndex={importAfter ?? activeIndex}
        onImportSelection={handleImport}
      />
      {notice ? (
        <div className="fixed bottom-6 left-1/2 z-[130] max-w-xl -translate-x-1/2 rounded-lg bg-[#16150f] px-4 py-3 text-sm text-[#f4f2ec] shadow-2xl" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
