"use client";

interface SlideNavProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export function SlideNav({ onPrev, onNext, canPrev, canNext }: SlideNavProps) {
  return (
    <>
      <button
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Föregående slide"
        className="group fixed left-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-text-muted transition-all hover:text-accent disabled:opacity-20 disabled:hover:text-text-muted"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        aria-label="Nästa slide"
        className="group fixed right-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-text-muted transition-all hover:text-accent disabled:opacity-20 disabled:hover:text-text-muted"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </>
  );
}
