"use client";

/**
 * QuickEditModal — snabb-redigering av en slides text direkt från M-läget,
 * utan att gå in i fulla editorn.
 *
 * Öppnas via pennknappen på ett previewkort. Hämtar slidens redigerbara
 * textfält (getSlideEditFields), visar dem som formulär, och skriver
 * tillbaka ändringarna (updateSlideFields). Previewen uppdateras direkt.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSlideEditFields, updateSlideFields } from "@/lib/edit-actions";
import type { SlideEditField } from "@/lib/types";

interface QuickEditModalProps {
  slug: string;
  /** 1-indexerat slide-nummer. */
  slideNumber: number;
  onClose: () => void;
  /** Anropas efter lyckad sparning (valfri — previewen laddas om ändå). */
  onSaved?: () => void;
}

export function QuickEditModal({
  slug,
  slideNumber,
  onClose,
  onSaved,
}: QuickEditModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<SlideEditField[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Hämta redigerbara fält
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getSlideEditFields(slug, slideNumber)
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.fields) {
          setFields(res.fields);
          setTemplateName(res.templateName ?? "");
          const init: Record<string, string> = {};
          res.fields.forEach((f) => {
            init[f.path] = f.value;
          });
          setValues(init);
        } else {
          setLoadError(res.error ?? "Kunde inte läsa sliden");
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Okänt fel");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, slideNumber]);

  // ESC stänger (capture så menyns Escape inte triggas samtidigt)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  const dirty = useMemo(
    () => fields.some((f) => (values[f.path] ?? "") !== f.value),
    [fields, values],
  );

  const handleSave = () => {
    const changed = fields
      .filter((f) => (values[f.path] ?? "") !== f.value)
      .map((f) => ({ path: f.path, value: values[f.path] ?? "" }));
    if (changed.length === 0) {
      onClose();
      return;
    }
    startTransition(async () => {
      setSaveError(null);
      const res = await updateSlideFields(slug, slideNumber, changed);
      if (res.ok) {
        onSaved?.();
        router.refresh();
        onClose();
      } else {
        setSaveError(res.error ?? "Kunde inte spara");
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="qe-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(6,6,12,0.78)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <motion.div
        key="qe-panel"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-1/2 top-1/2 z-[85] flex max-h-[86vh] w-[min(40rem,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/12 bg-bg shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Snabbredigera slide ${slideNumber}`}
      >
        {/* HEADER */}
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-accent">
              Snabbredigera text
            </div>
            <h2
              className="mt-0.5 text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Slide {slideNumber}
              {templateName ? (
                <span className="ml-2 font-mono text-xs font-normal text-text-muted">
                  {templateName}
                </span>
              ) : null}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-text"
            aria-label="Stäng"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="py-12 text-center text-sm text-text-muted">
              Läser sliden…
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {loadError}
            </div>
          )}

          {!loading && !loadError && fields.length === 0 && (
            <div className="py-10 text-center text-sm text-text-muted">
              Den här sliden har ingen redigerbar löptext.
              <br />
              Tryck <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-xs">R</kbd> för att öppna fulla editorn.
            </div>
          )}

          {!loading && !loadError && fields.length > 0 && (
            <div className="flex flex-col gap-4">
              {fields.map((field, i) => (
                <label key={field.path} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                    {field.label}
                  </span>
                  {field.multiline ? (
                    <textarea
                      autoFocus={i === 0}
                      value={values[field.path] ?? ""}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, [field.path]: e.target.value }))
                      }
                      rows={Math.min(
                        10,
                        Math.max(3, (values[field.path] ?? "").split("\n").length + 1),
                      )}
                      className="resize-y rounded-lg border border-white/12 bg-bg-surface/60 px-3 py-2 text-sm leading-relaxed text-text outline-none transition-colors focus:border-accent"
                    />
                  ) : (
                    <input
                      autoFocus={i === 0}
                      type="text"
                      value={values[field.path] ?? ""}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, [field.path]: e.target.value }))
                      }
                      className="rounded-lg border border-white/12 bg-bg-surface/60 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
                    />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="flex items-center justify-between gap-4 border-t border-white/[0.08] px-6 py-4">
          <div className="min-w-0 text-xs text-text-muted">
            {saveError ? (
              <span className="text-red-300">{saveError}</span>
            ) : dirty ? (
              "Osparade ändringar"
            ) : (
              "Ändringarna sparas direkt i presentationen"
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-text-muted transition-colors hover:bg-white/5 hover:text-text"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={busy || loading || !dirty}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition-all hover:shadow-[0_0_28px_-6px_var(--accent)] disabled:opacity-40 disabled:hover:shadow-none"
            >
              {busy ? "Sparar…" : "Spara"}
            </button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
