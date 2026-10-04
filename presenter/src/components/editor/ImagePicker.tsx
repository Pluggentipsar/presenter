"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { searchPexels, downloadPexelsImage } from "@/lib/pexels";
import type { PexelsPhoto } from "@/lib/pexels-types";

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  /** Callback med lokal path till nedladdad bild (t.ex. /bilder/pexels/pexels-123.jpg) */
  onPick: (localPath: string, photographer: string) => void;
  /** Initial sökfråga (om fältet redan har alt-text eller liknande) */
  initialQuery?: string;
}

/**
 * Modal för att söka bilder på Pexels och ladda ner lokalt.
 * Nedladdad bild sparas i public/bilder/pexels/ och path returneras
 * så att MDX/fältet kan uppdateras.
 */
export function ImagePicker({ open, onClose, onPick, initialQuery = "" }: ImagePickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setPhotos([]);
    setError(null);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, initialQuery, onClose]);

  const doSearch = (q: string) => {
    if (!q.trim()) {
      setPhotos([]);
      setTotalResults(0);
      return;
    }
    startSearch(async () => {
      const result = await searchPexels(q);
      if (result.error) {
        setError(result.error);
        setPhotos([]);
      } else {
        setError(null);
        setPhotos(result.photos);
        setTotalResults(result.totalResults);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handlePick = async (photo: PexelsPhoto) => {
    setDownloadingId(photo.id);
    try {
      const result = await downloadPexelsImage(photo);
      if (result.ok && result.path) {
        onPick(result.path, photo.photographer);
        onClose();
      } else {
        setError(result.error ?? "Kunde inte ladda ner bild");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" aria-hidden />
          <motion.div
            className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6 md:p-10"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-accent">
                  Pexels bildsök
                </div>
                <div className="mt-1 text-sm text-text-muted">
                  Vald bild laddas ner lokalt till /bilder/pexels/ · esc stänger
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-muted transition-all hover:border-accent hover:text-accent"
              >
                Avbryt
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='t.ex. "classroom", "student laptop", "library"...'
                autoFocus
                className="flex-1 rounded-md border border-white/10 bg-bg-surface/60 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="rounded-md border border-accent bg-accent/10 px-5 py-3 text-xs uppercase tracking-[0.2em] text-accent transition-all hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? "Söker..." : "Sök"}
              </button>
            </form>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {photos.length > 0 && (
              <div className="text-xs text-text-muted">
                {totalResults.toLocaleString("sv-SE")} träffar · visar {photos.length}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => {
                const isDownloading = downloadingId === photo.id;
                return (
                  <button
                    key={photo.id}
                    onClick={() => handlePick(photo)}
                    disabled={downloadingId !== null}
                    className="group relative aspect-video overflow-hidden rounded-md border border-white/10 bg-bg-surface transition-all hover:border-accent disabled:opacity-50"
                    style={{ backgroundColor: photo.avg_color }}
                    title={`${photo.alt || "Bild"} · ${photo.photographer}`}
                  >
                    <Image
                      src={photo.src.medium}
                      alt={photo.alt || photo.photographer}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="text-[0.65rem] uppercase tracking-wider text-white/70">
                        Foto: {photo.photographer}
                      </div>
                    </div>
                    {isDownloading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs uppercase tracking-wider text-accent">
                        Laddar ner...
                      </div>
                    )}
                  </button>
                );
              })}
              {!searching && photos.length === 0 && query.trim() && !error && (
                <div className="col-span-full rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-text-muted">
                  Tryck på Sök för att leta efter &quot;{query}&quot;
                </div>
              )}
              {photos.length === 0 && !query.trim() && (
                <div className="col-span-full rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-text-muted">
                  Skriv sökord på engelska för bästa resultat
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {["classroom", "student", "library", "books", "technology", "nature"].map(
                      (term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setQuery(term);
                            doSearch(term);
                          }}
                          className="rounded-full border border-white/10 bg-bg-surface/40 px-3 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
                        >
                          {term}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-white/5 pt-3 text-[0.65rem] uppercase tracking-wider text-text-muted/60">
              Bilder från Pexels.com · gratis att använda · ange fotograf
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
