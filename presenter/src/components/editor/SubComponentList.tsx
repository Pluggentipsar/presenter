"use client";

import { useState } from "react";
import type { ParsedComponent, PropValue } from "@/lib/mdx-parser";
import { getTemplateSchema } from "@/lib/template-schemas";
import { FieldInput } from "./FieldInput";

interface SubComponentListProps {
  /** Parent slide's children (t.ex. TimelineEvent-array) */
  children: ParsedComponent[];
  /** Vilken typ av barn ska kunna skapas (TimelineEvent / ComparisonColumn) */
  childTag: string;
  onUpdateChild: (index: number, props: Record<string, PropValue>) => void;
  onUpdateChildContent: (index: number, content: string) => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onMoveChild: (from: number, to: number) => void;
}

/**
 * Strukturerad editor för nested components i Timeline/Comparison etc.
 *
 * Visar varje child som en expanderbar panel med sina egna fält. Varje child
 * har add/remove/flytta-knappar. Content (markdown) editeras i textarea per
 * child — detta är själva "punktlistan" eller beskrivningen i varje kolumn/event.
 */
export function SubComponentList({
  children,
  childTag,
  onUpdateChild,
  onUpdateChildContent,
  onAddChild,
  onRemoveChild,
  onMoveChild,
}: SubComponentListProps) {
  const childSchema = getTemplateSchema(childTag);
  const [expanded, setExpanded] = useState<Set<number>>(
    new Set(children.map((_, i) => i))
  );

  if (!childSchema) {
    return (
      <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
        Schema saknas för <code className="font-mono">{childTag}</code>.
      </div>
    );
  }

  const toggleExpanded = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const labelFor = (child: ParsedComponent, i: number) => {
    return (
      (child.props.date as string) ||
      (child.props.title as string) ||
      `${childTag} ${i + 1}`
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-text-muted">
          {childTag === "TimelineEvent" ? "Händelser" : "Kolumner"} ({children.length})
        </h2>
        <button
          onClick={onAddChild}
          className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent transition-all hover:bg-accent/20"
        >
          + Ny {childTag === "TimelineEvent" ? "händelse" : "kolumn"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {children.map((child, i) => {
          const isOpen = expanded.has(i);
          return (
            <div
              key={i}
              className="rounded-md border border-white/10 bg-bg-surface/30"
            >
              {/* Header-rad */}
              <div className="flex items-center gap-1.5 p-2">
                <button
                  onClick={() => toggleExpanded(i)}
                  className="flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left text-sm text-text transition-all hover:bg-white/5"
                >
                  <span className="font-mono text-[0.7rem] text-text-muted">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <span className="truncate">{labelFor(child, i)}</span>
                </button>
                <MiniButton
                  disabled={i === 0}
                  onClick={() => onMoveChild(i, i - 1)}
                  title="Flytta upp"
                >
                  ↑
                </MiniButton>
                <MiniButton
                  disabled={i === children.length - 1}
                  onClick={() => onMoveChild(i, i + 1)}
                  title="Flytta ner"
                >
                  ↓
                </MiniButton>
                <MiniButton
                  onClick={() => onRemoveChild(i)}
                  title="Ta bort"
                  danger
                >
                  ✕
                </MiniButton>
              </div>

              {/* Fält (expanderat) */}
              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-white/5 p-3">
                  {childSchema.fields.map((field) => (
                    <FieldInput
                      key={field.name}
                      field={field}
                      value={child.props[field.name]}
                      onChange={(value) =>
                        onUpdateChild(i, { [field.name]: value })
                      }
                    />
                  ))}
                  {childSchema.hasContent && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text">
                        Innehåll
                      </label>
                      <textarea
                        value={child.content ?? ""}
                        onChange={(e) => onUpdateChildContent(i, e.target.value)}
                        rows={4}
                        className="rounded-md border border-white/10 bg-bg-surface/60 p-2 font-mono text-xs text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none"
                        placeholder={
                          childTag === "TimelineEvent"
                            ? "Beskrivning av händelsen"
                            : "- punkt 1\n- punkt 2"
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {children.length === 0 && (
          <div className="rounded border border-dashed border-white/10 p-4 text-center text-sm text-text-muted">
            Inga {childTag === "TimelineEvent" ? "händelser" : "kolumner"} ännu.
            Klicka på knappen ovan för att lägga till.
          </div>
        )}
      </div>
    </section>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "text-text-muted hover:bg-red-500/20 hover:text-red-300"
          : "text-text-muted hover:bg-white/10 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
