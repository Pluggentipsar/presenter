"use client";

import {
  memo,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ParsedPresentation } from "@/lib/mdx-parser";
import type { SlideMeta } from "@/lib/extract-slide-types";
import {
  deleteSlideAt,
  duplicateSlide,
  reorderDeck,
  toggleSlideVisibility,
} from "@/lib/deck-operations";
import { SlideThumbnails } from "@/components/SlideThumbnails";
import type { AuthoringSaveStatus } from "@/lib/authoring-types";

interface StoryboardWorkspaceProps {
  slug: string;
  title: string;
  theme: string;
  parsed: ParsedPresentation;
  updateParsed: Dispatch<SetStateAction<ParsedPresentation>>;
  slideMetas: SlideMeta[];
  notes: (string | null)[];
  hiddenSlides: number[];
  slideIds: string[];
  slideHashes: string[];
  slideRenderHashes: string[];
  currentIndex: number;
  onCurrentIndexChange: Dispatch<SetStateAction<number>>;
  onOpenEditor: (index: number) => void;
  onPresent: () => void;
  /** Öppna manusläget — planeringslagret som löpande dokument. */
  onOpenManus: () => void;
  /** Öppna komponentgalleriet för en ny slide efter den angivna (0-baserad). */
  onOpenGallery: (afterIndex: number) => void;
  /** Hämta färdiga slides ur en annan föreläsning, efter den angivna (skalets importfönster). */
  onOpenImport: (afterIndex: number) => void;
  /** Öppna översikten — den ljusa, täta vyn med syfte och akter. */
  onOpenOversikt: () => void;
  saveStatus: AuthoringSaveStatus;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Memo:ad eftersom storyboarden hålls MONTERAD men dold i editor-läge
 * (AuthoringShell växlar med CSS, inte unmount, för att bevara miniatyrer och
 * blob-URL:er). Utan memo re-renderades hela 181-kortsgridet vid varje
 * tangenttryck i slide-editorn.
 *
 * Memot biter bara så länge props är referensstabila: manifestets arrayer
 * delas strukturellt mellan operationer och callbacks är useCallback:ade i
 * skalet. Lägger du till en prop — se till att den är det också.
 */
function StoryboardWorkspaceInner({
  slug,
  title,
  theme,
  parsed,
  updateParsed,
  slideMetas,
  notes,
  hiddenSlides,
  slideIds,
  slideHashes,
  slideRenderHashes,
  currentIndex,
  onCurrentIndexChange,
  onOpenEditor,
  onPresent,
  onOpenManus,
  onOpenOversikt,
  onOpenGallery,
  onOpenImport,
  saveStatus,
  saveError,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: StoryboardWorkspaceProps) {
  const [message, setMessage] = useState<string | null>(null);

  const totalSlides = parsed.slides.length;
  const utkastCount = useMemo(
    () => parsed.slides.filter((slide) => slide.tag === "Utkast").length,
    [parsed.slides],
  );
  const currentMeta = slideMetas[currentIndex] ?? slideMetas[0];
  const currentIsHidden = hiddenSlides.includes(currentIndex + 1);
  const describedSlide = useMemo(() => {
    const titleText = currentMeta?.primaryText?.trim();
    return titleText
      ? `${currentIndex + 1}. ${titleText}`
      : `Slide ${currentIndex + 1}`;
  }, [currentIndex, currentMeta?.primaryText]);

  const handleDuplicate = () => {
    updateParsed((current) => duplicateSlide(current, currentIndex));
    onCurrentIndexChange(currentIndex + 1);
    setMessage("Sliden duplicerades. Sparas automatiskt.");
  };

  const handleDeleteAt = (index: number) => {
    if (totalSlides <= 1) return;
    const meta = slideMetas[index];
    const label = meta?.primaryText
      ? `slide ${index + 1} (“${meta.primaryText.slice(0, 50)}”)`
      : `slide ${index + 1}`;
    if (!window.confirm(`Ta bort ${label}? Du kan ångra direkt efteråt.`)) {
      return;
    }
    updateParsed((current) => deleteSlideAt(current, index));
    onCurrentIndexChange((active) =>
      Math.min(
        active > index ? active - 1 : active,
        Math.max(0, totalSlides - 2),
      ),
    );
    setMessage("Sliden togs bort. Ångra-knappen finns kvar tills du lämnar editorn.");
  };

  const handleToggleHiddenAt = (index: number) => {
    const wasHidden = hiddenSlides.includes(index + 1);
    updateParsed((current) => toggleSlideVisibility(current, index));
    setMessage(
      wasHidden
        ? "Sliden visas i presentationen."
        : "Sliden är nu dold i presentationen.",
    );
  };

  const handleReorder = (order: number[]) => {
    const activeId = slideIds[currentIndex];
    updateParsed((current) => reorderDeck(current, order));
    if (activeId) {
      const nextIndex = order.findIndex(
        (oldIndex) => slideIds[oldIndex] === activeId,
      );
      if (nextIndex >= 0) onCurrentIndexChange(nextIndex);
    }
    setMessage("Slideordningen ändrades. Sparas i bakgrunden.");
  };

  const saveLabel =
    saveStatus === "dirty"
      ? "Ändrad"
      : saveStatus === "saving"
        ? "Sparar…"
        : saveStatus === "saved"
          ? "Sparat"
          : saveStatus === "conflict"
            ? "Sparningen pausad"
            : saveStatus === "error"
              ? "Sparfel"
              : null;

  return (
    <div className="h-screen overflow-y-auto bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-6 px-6 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-accent">
                Studio
              </span>
              <h1 className="truncate text-base font-semibold text-text">
                {title}
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {totalSlides} slides · tema {theme} · samma session som R
            </p>
          </div>

          <nav className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.035] p-1">
            <button
              type="button"
              onClick={onOpenOversikt}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-white/5 hover:text-text"
              title="Den röda tråden: en rad per slide, grupperad per akt"
            >
              Översikt
            </button>
            <span className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent">
              Storyboard
            </span>
            <button
              type="button"
              onClick={onOpenManus}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-white/5 hover:text-text"
              title="Hela decket som löpande dokument — planeringslagret"
            >
              Manus
              {utkastCount > 0 ? (
                <span className="ml-1.5 rounded bg-accent px-1 py-px font-mono text-[0.6rem] font-bold text-bg">
                  {utkastCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor(currentIndex)}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-white/5 hover:text-text"
            >
              Slide-editor
            </button>
            <button
              type="button"
              onClick={onPresent}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-white/5 hover:text-text"
            >
              Presentera
            </button>
          </nav>
        </div>

        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-2 border-t border-white/[0.06] px-6 py-2">
          <button
            type="button"
            onClick={() => onOpenGallery(currentIndex)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition-transform hover:scale-[1.02]"
          >
            + Ny slide
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-text hover:border-white/25"
          >
            Duplicera
          </button>
          <button
            type="button"
            onClick={() => onOpenImport(currentIndex)}
            title="Hämta färdiga slides ur en annan föreläsning och lägg dem efter den här"
            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-text hover:border-white/25 disabled:opacity-50"
          >
            Från annan föreläsning
          </button>
          <button
            type="button"
            onClick={() => handleToggleHiddenAt(currentIndex)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              currentIsHidden
                ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
                : "border-white/12 bg-white/[0.04] text-text"
            }`}
          >
            {currentIsHidden ? "Visa slide" : "Dölj slide"}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteAt(currentIndex)}
            disabled={totalSlides <= 1}
            className="rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3 py-1.5 text-xs text-red-300 hover:border-red-400/50 disabled:opacity-35"
          >
            Ta bort
          </button>

          <div className="mx-1 h-5 w-px bg-white/10" />
          <div className="flex rounded-lg border border-white/12 bg-white/[0.04]">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2.5 py-1.5 text-xs text-text-muted hover:text-accent disabled:opacity-25"
              title="Ångra"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="border-l border-white/10 px-2.5 py-1.5 text-xs text-text-muted hover:text-accent disabled:opacity-25"
              title="Gör om"
            >
              ↷
            </button>
          </div>
          <span className="max-w-[27rem] truncate text-xs text-text-muted">
            Markerad:{" "}
            <strong className="font-medium text-text">{describedSlide}</strong>
          </span>

          <span
            className={`ml-auto text-xs ${
              saveStatus === "error" || saveStatus === "conflict"
                ? "text-red-300"
                : saveStatus === "saving" || saveStatus === "dirty"
                  ? "text-accent"
                  : "text-text-muted"
            }`}
            title={saveError ?? undefined}
          >
            {saveLabel ?? message ?? "Dra kort för att ändra ordning · Shift/Cmd för flera"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-6 py-6">
        <SlideThumbnails
          slideMetas={slideMetas}
          slideIds={slideIds}
          slideHashes={slideHashes}
          slideRenderHashes={slideRenderHashes}
          totalSlides={totalSlides}
          notes={notes}
          currentIndex={currentIndex}
          onGoTo={onCurrentIndexChange}
          onOpenSlide={onOpenEditor}
          onQuickEditSlide={onOpenEditor}
          onReorder={handleReorder}
          onToggleHidden={(index) => handleToggleHiddenAt(index)}
          onDeleteSlide={(index) => handleDeleteAt(index)}
          hiddenSlides={hiddenSlides}
          slug={slug}
          onAddBetween={onOpenImport}
          previewsReady={
            saveStatus !== "dirty" &&
            saveStatus !== "saving" &&
            saveStatus !== "conflict"
          }
          persistentActions
        />
      </main>

    </div>
  );
}

export const StoryboardWorkspace = memo(StoryboardWorkspaceInner);
