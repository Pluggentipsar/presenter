"use client";

import { useMemo, useState } from "react";
import { QrCode } from "./QrCode";

interface SharePresentationPanelProps {
  slug: string;
}

export function SharePresentationPanel({ slug }: SharePresentationPanelProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/${slug}`;
    return `${window.location.origin}/${slug}`;
  }, [slug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: visa bara länken
    }
  };

  return (
    <section>
      <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-text-muted">
        Dela presentation
      </h2>
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-bg-surface/40 p-5 md:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center rounded-md bg-white p-3">
          <QrCode value={shareUrl} size={140} alt={`QR-kod till ${shareUrl}`} />
        </div>
        <div className="flex flex-col justify-center gap-3">
          <p className="text-sm text-text-muted">
            Den här länken visar presentationen — publiken kan bläddra själva, utan
            live-sync. Perfekt att skicka efter föreläsningen.
          </p>
          <div className="flex flex-col gap-2">
            <div className="break-all rounded-md border border-white/10 bg-bg p-2 font-mono text-xs text-text">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className={`self-start rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors ${
                copied
                  ? "border-emerald-400 text-emerald-300"
                  : "border-white/15 text-text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {copied ? "Kopierad ✓" : "Kopiera länk"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
