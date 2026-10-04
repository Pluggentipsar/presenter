"use client";

import type { FieldSchema } from "@/lib/template-schemas";
import type { PropValue } from "@/lib/mdx-parser";

interface SizePillsProps {
  field: FieldSchema;
  value: PropValue | undefined;
  onChange: (value: PropValue) => void;
}

/**
 * Kompakt segmented-control för storleks-fält (sm/md/lg/xl).
 * Liten rad som sitter ihop med det fält den påverkar.
 */
export function SizePills({ field, value, onChange }: SizePillsProps) {
  const current = (value as string) ?? field.default ?? "md";
  const options = field.options ?? [];

  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span className="font-mono uppercase tracking-wider text-text-muted/60">
        storlek
      </span>
      <div className="inline-flex rounded-md border border-white/10 bg-bg-surface/40 p-0.5">
        {options.map((opt) => {
          const isActive = current === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded px-2 py-0.5 font-mono uppercase tabular-nums transition-all ${
                isActive
                  ? "bg-accent/25 text-accent"
                  : "text-text-muted hover:text-text"
              }`}
              title={describeSize(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function describeSize(opt: string): string {
  switch (opt) {
    case "sm":
      return "Liten (~60 %)";
    case "md":
      return "Normal (default)";
    case "lg":
      return "Stor (~150 %)";
    case "xl":
      return "Extra stor (~200 %)";
    default:
      return opt;
  }
}
