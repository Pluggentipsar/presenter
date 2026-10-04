"use client";

/**
 * ImportSlidesModal — välj en eller flera slides från någon annan
 * presentation och kopiera in dem i den aktuella.
 *
 * Två lägen:
 *  - "Bläddra": välj källpresentation från lista → välj slides från den
 *  - "Sök": fritextsöker över alla slides i alla presentationer
 *
 * Klick på en slide-rad visar live-rendering av just den sliden i en
 * iframe på höger sida (route: /preview-slide/[slug]/[index]).
 *
 * Vid "Lägg till" anropas server action copySlidesFromPresentation som
 * kopierar rådatan in i målpresentationens MDX, varefter router.refresh()
 * uppdaterar miniatyrgriden.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  copySlidesFromPresentation,
  listAllSlidesAcrossPresentations,
} from "@/lib/presentation-actions";

interface SlideEntry {
  slug: string;
  presentationTitle: string;
  slideIndex1Based: number;
  templateName: string;
  primaryText?: string;
  secondaryText?: string;
}

interface ImportSlidesModalProps {
  open: boolean;
  onClose: () => void;
  /** Slug på presentationen där slides ska importeras IN. */
  targetSlug: string;
  /** 0-indexerat — efter vilken slide. -1 = först. */
  insertAfterIndex: number;
  onImportComplete?: () => void;
  /**
   * Authoring-skalet kan ta emot importerade slides som en lokal operation.
   * Då används samma historik, autosave och konfliktskydd som övriga edits.
   */
  onImportSelection?: (
    selection: ImportSlideSelection[],
    insertAfterIndex: number,
  ) => Promise<{ ok: boolean; copied?: number; error?: string }>;
}

type Mode = "browse" | "search";

export interface ImportSlideSelection {
  slug: string;
  slideIndex1Based: number;
}

function keyOf(e: { slug: string; slideIndex1Based: number }): string {
  return `${e.slug}::${e.slideIndex1Based}`;
}

export function ImportSlidesModal({
  open,
  onClose,
  targetSlug,
  insertAfterIndex,
  onImportComplete,
  onImportSelection,
}: ImportSlidesModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("browse");
  const [allSlides, setAllSlides] = useState<SlideEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSourceSlug, setActiveSourceSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, ImportSlideSelection>>(
    new Map(),
  );
  const [preview, setPreview] = useState<ImportSlideSelection | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ladda alla slides när modalen öppnas
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    listAllSlidesAcrossPresentations()
      .then((slides) => {
        setAllSlides(slides);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Kunde inte ladda slides");
        setLoading(false);
      });
  }, [open]);

  // Reset vid stäng
  useEffect(() => {
    if (!open) {
      setSelected(new Map());
      setPreview(null);
      setQuery("");
      setActiveSourceSlug(null);
      setMode("browse");
    }
  }, [open]);

  // ESC stänger
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Grupperad lista per presentation (för browse-mode)
  const presentations = useMemo(() => {
    if (!allSlides) return [];
    const map = new Map<
      string,
      { slug: string; title: string; slides: SlideEntry[] }
    >();
    for (const s of allSlides) {
      if (s.slug === targetSlug) continue; // Skip mål-presentationen
      const existing = map.get(s.slug);
      if (existing) existing.slides.push(s);
      else
        map.set(s.slug, {
          slug: s.slug,
          title: s.presentationTitle,
          slides: [s],
        });
    }
    return [...map.values()].sort((a, b) =>
      a.title.localeCompare(b.title, "sv"),
    );
  }, [allSlides, targetSlug]);

  // Slides att visa i grid:en baserat på läge
  const visibleSlides = useMemo(() => {
    if (!allSlides) return [];
    if (mode === "search") {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return allSlides.filter((s) => {
        if (s.slug === targetSlug) return false;
        const hay = [
          s.presentationTitle,
          s.templateName,
          s.primaryText ?? "",
          s.secondaryText ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    // browse-mode
    if (!activeSourceSlug) return [];
    return allSlides.filter((s) => s.slug === activeSourceSlug);
  }, [allSlides, mode, query, activeSourceSlug, targetSlug]);

  const toggleSlide = (s: SlideEntry) => {
    const k = keyOf(s);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(k)) next.delete(k);
      else next.set(k, { slug: s.slug, slideIndex1Based: s.slideIndex1Based });
      return next;
    });
  };

  const handleImport = () => {
    if (selected.size === 0) return;
    // Gruppera per källa så vi kan göra en server-anrop per källpresentation
    const bySource = new Map<string, number[]>();
    for (const [, sel] of selected) {
      const arr = bySource.get(sel.slug) ?? [];
      arr.push(sel.slideIndex1Based);
      bySource.set(sel.slug, arr);
    }

    startTransition(async () => {
      setError(null);
      setSuccess(null);

      if (onImportSelection) {
        const ordered = [...selected.values()].sort((a, b) =>
          a.slug === b.slug
            ? a.slideIndex1Based - b.slideIndex1Based
            : a.slug.localeCompare(b.slug),
        );
        const result = await onImportSelection(ordered, insertAfterIndex);
        if (!result.ok) {
          setError(result.error ?? "Något gick fel");
          return;
        }
        const copied = result.copied ?? ordered.length;
        setSuccess(`Lade till ${copied} slide${copied === 1 ? "" : "s"}`);
        onImportComplete?.();
        setTimeout(() => onClose(), 800);
        return;
      }

      let totalCopied = 0;
      // Importera käll-presentation i taget. Varje anrop infogar efter
      // insertAfterIndex; för andra anropet justerar vi så de hamnar
      // efter de just importerade.
      let cursor = insertAfterIndex;
      for (const [srcSlug, indices] of bySource) {
        const res = await copySlidesFromPresentation({
          sourceSlug: srcSlug,
          sourceSlideIndices: indices,
          targetSlug,
          insertAfterIndex0Based: cursor,
        });
        if (!res.ok) {
          setError(res.error ?? "Något gick fel");
          return;
        }
        totalCopied += res.copied ?? 0;
        cursor += res.copied ?? 0;
      }
      setSuccess(`Lade till ${totalCopied} slide${totalCopied === 1 ? "" : "s"}`);
      onImportComplete?.();
      router.refresh();
      // Stäng efter en stund så användaren ser meddelandet
      setTimeout(() => {
        onClose();
      }, 800);
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="import-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(8,8,14,0.85)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <motion.div
        key="import-modal"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-4 z-[70] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-bg shadow-2xl md:inset-8"
        role="dialog"
        aria-modal="true"
        aria-label="Importera slides från annan presentation"
      >
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-6 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-accent">
              Importera slides
            </div>
            <h2
              className="mt-0.5 text-xl font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Lägg till från en annan presentation
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode-toggle */}
            <div className="flex rounded-full border border-white/10 p-0.5">
              {(["browse", "search"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] transition-colors ${
                    mode === m
                      ? "bg-accent text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {m === "browse" ? "Bläddra" : "Sök"}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-text"
              aria-label="Stäng"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* VÄNSTER PANE — väljare */}
          <div className="flex w-[44%] flex-col overflow-hidden border-r border-white/[0.08]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              {mode === "search" ? (
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök slide-titel, prompt, template…"
                  className="w-full rounded-lg border border-white/10 bg-bg-surface/50 px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
                />
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.22em] text-text-muted">
                    Välj källpresentation
                  </label>
                  <select
                    value={activeSourceSlug ?? ""}
                    onChange={(e) =>
                      setActiveSourceSlug(e.target.value || null)
                    }
                    className="w-full rounded-lg border border-white/10 bg-bg-surface/50 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                  >
                    <option value="">— Välj presentation —</option>
                    {presentations.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title} · {p.slides.length} slides
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SLIDE-LISTA */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loading && (
                <div className="py-10 text-center text-sm text-text-muted">
                  Laddar slides…
                </div>
              )}
              {!loading && mode === "search" && !query && (
                <div className="py-10 text-center text-sm text-text-muted">
                  Börja skriv för att söka efter slides i alla presentationer.
                </div>
              )}
              {!loading &&
                mode === "browse" &&
                !activeSourceSlug && (
                  <div className="py-10 text-center text-sm text-text-muted">
                    Välj en presentation ovan för att se dess slides.
                  </div>
                )}
              {!loading && visibleSlides.length === 0 && query && (
                <div className="py-10 text-center text-sm text-text-muted">
                  Inga slides matchar &quot;{query}&quot;.
                </div>
              )}
              {!loading && visibleSlides.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {visibleSlides.map((s) => {
                    const k = keyOf(s);
                    const isSelected = selected.has(k);
                    const isPreviewing =
                      preview?.slug === s.slug &&
                      preview?.slideIndex1Based === s.slideIndex1Based;
                    return (
                      <li key={k}>
                        <div
                          onClick={() =>
                            setPreview({
                              slug: s.slug,
                              slideIndex1Based: s.slideIndex1Based,
                            })
                          }
                          className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                            isPreviewing
                              ? "border-accent bg-accent/10"
                              : isSelected
                                ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                                : "border-white/10 bg-bg-surface/40 hover:border-white/25 hover:bg-bg-surface/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSlide(s)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-4 w-4 cursor-pointer accent-accent"
                            aria-label={`Välj slide ${s.slideIndex1Based}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[0.65rem] tabular-nums text-text-muted">
                                {String(s.slideIndex1Based).padStart(2, "0")}
                              </span>
                              <span className="rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-text-muted">
                                {s.templateName}
                              </span>
                              {mode === "search" && (
                                <span className="truncate text-[0.65rem] text-text-muted">
                                  · {s.presentationTitle}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 line-clamp-2 text-sm font-medium leading-tight text-text">
                              {s.primaryText ?? (
                                <span className="text-text-muted italic">
                                  (inget extraherbart innehåll)
                                </span>
                              )}
                            </div>
                            {s.secondaryText && (
                              <div className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                                {s.secondaryText}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* HÖGER PANE — live-preview */}
          <div className="flex flex-1 flex-col overflow-hidden bg-black/40">
            <div className="border-b border-white/[0.06] px-5 py-3 text-xs uppercase tracking-[0.22em] text-text-muted">
              {preview
                ? `Förhandsgranskning · slide ${preview.slideIndex1Based}`
                : "Klick på en slide för att förhandsgranska"}
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
              {preview ? (
                <div
                  className="relative w-full overflow-hidden rounded-lg border border-white/15 shadow-2xl"
                  style={{ aspectRatio: "16 / 9", maxHeight: "100%" }}
                >
                  <iframe
                    key={`${preview.slug}-${preview.slideIndex1Based}`}
                    src={`/preview-slide/${preview.slug}/${preview.slideIndex1Based}`}
                    title={`Förhandsgranskning ${preview.slug}/${preview.slideIndex1Based}`}
                    className="absolute inset-0 h-full w-full"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div className="text-center text-sm text-text-muted">
                  <div className="mb-2 text-3xl">⊟</div>
                  Välj en slide till vänster för live-preview.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="flex items-center justify-between gap-4 border-t border-white/[0.08] px-6 py-4">
          <div className="text-sm text-text-muted">
            {selected.size === 0 ? (
              "Inga slides markerade."
            ) : (
              <>
                <span className="font-semibold text-text">
                  {selected.size}
                </span>{" "}
                slide{selected.size === 1 ? "" : "s"} markerade
                {insertAfterIndex >= 0 ? (
                  <>
                    {" "}
                    · läggs till efter slide{" "}
                    <span className="text-accent">{insertAfterIndex + 1}</span>
                  </>
                ) : (
                  <> · läggs till först</>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-1.5 text-xs text-green-300">
                {success}
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-text-muted transition-colors hover:bg-white/5 hover:text-text"
            >
              Avbryt
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || busy}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition-all hover:shadow-[0_0_30px_-5px_var(--accent)] disabled:opacity-40 disabled:hover:shadow-none"
            >
              {busy ? "Lägger till…" : `Lägg till ${selected.size || ""} slides`}
            </button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
