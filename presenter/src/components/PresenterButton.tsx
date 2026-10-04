"use client";

import { useCallback } from "react";

interface PresenterButtonProps {
  slug: string;
}

export function PresenterButton({ slug }: PresenterButtonProps) {
  const openPresenter = useCallback(() => {
    const url = `/${slug}/presenter`;
    window.open(url, `presenter-${slug}`, "width=1100,height=800,menubar=no,toolbar=no");
  }, [slug]);

  return (
    <button
      onClick={openPresenter}
      aria-label="Öppna presenter mode"
      title="Öppna presenter mode (notes, timer, nästa slide)"
      className="fixed top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-bg-surface/60 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted backdrop-blur-sm transition-all hover:border-accent hover:text-accent"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      Presenter
    </button>
  );
}
