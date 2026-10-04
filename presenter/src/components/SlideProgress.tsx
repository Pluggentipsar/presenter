"use client";

interface SlideProgressProps {
  current: number;
  total: number;
  onGoTo: (index: number) => void;
}

export function SlideProgress({ current, total, onGoTo }: SlideProgressProps) {
  const showDots = total <= 15;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="h-0.5 w-full bg-bg-surface">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{
            width: `${(current / total) * 100}%`,
            boxShadow: "0 0 8px var(--accent-glow)",
          }}
        />
      </div>
      <div className="flex items-center justify-between px-6 py-3 text-xs uppercase tracking-[0.2em] text-text-muted">
        {showDots ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onGoTo(i)}
                aria-label={`Gå till slide ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  i === current - 1 ? "scale-150 bg-accent" : "bg-text-muted hover:bg-accent"
                }`}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <span className="tabular-nums">
          {current} / {total}
        </span>
      </div>
    </div>
  );
}
