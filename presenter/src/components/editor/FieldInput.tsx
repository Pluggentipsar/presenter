"use client";

import { useMemo, useState } from "react";
import type { FieldSchema } from "@/lib/template-schemas";
import type { PropValue } from "@/lib/mdx-parser";
import { ImagePicker } from "./ImagePicker";

interface FieldInputProps {
  field: FieldSchema;
  value: PropValue | undefined;
  onChange: (value: PropValue) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const commonClasses =
    "rounded-md border border-white/10 bg-bg-surface/60 p-2 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none";

  const [pickerOpen, setPickerOpen] = useState(false);
  // Keep an in-progress replacement empty until the user has finished typing.
  // Otherwise clearing a field backed by a scene default immediately restores
  // that default between input events and the new text can be appended to it.
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const textValue = textDraft ?? ((value as string) ?? "");
  const changeText = (next: string) => {
    setTextDraft(next);
    onChange(next);
  };

  const renderInput = () => {
    switch (field.type) {
      case "image":
        return (
          <>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={(value as string) ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder ?? "/bilder/... eller klicka Sök"}
                className={`${commonClasses} flex-1`}
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="shrink-0 rounded-md border border-accent/30 bg-accent/10 px-3 text-xs uppercase tracking-wider text-accent transition-all hover:bg-accent/20"
                title="Sök bild på Pexels"
              >
                Sök
              </button>
            </div>
            {typeof value === "string" && value.startsWith("/bilder/") && !/\.(mp4|webm|mov)$/i.test(value) && (
              <div className="mt-1.5 overflow-hidden rounded border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Förhandsvisning"
                  className="h-24 w-full object-cover"
                />
              </div>
            )}
            <ImagePicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onPick={(localPath) => onChange(localPath)}
              initialQuery=""
            />
          </>
        );

      case "text":
        return (
          <input
            type="text"
            value={textValue}
            onChange={(e) => changeText(e.target.value)}
            onBlur={() => setTextDraft(null)}
            placeholder={field.placeholder}
            className={commonClasses}
          />
        );

      case "multiline":
        return (
          <textarea
            value={textDraft ?? (value !== null && typeof value === "object" ? JSON.stringify(value, null, 2) : (value as string) ?? "")}
            onChange={(e) => changeText(e.target.value)}
            onBlur={() => setTextDraft(null)}
            placeholder={field.placeholder}
            rows={3}
            className={`${commonClasses} resize-y`}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value === undefined ? "" : String(value)}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? "" : parseFloat(v));
            }}
            step="any"
            placeholder={field.placeholder}
            className={commonClasses}
          />
        );

      case "select":
        return (
          <select
            value={(value as string) ?? field.default ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "" ? "— mallens standard —" : opt}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
            <span className="text-text-muted">Aktiverad</span>
          </label>
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#06b6d4 eller var(--accent)"
              className={`${commonClasses} flex-1`}
            />
            {typeof value === "string" && value.startsWith("#") && (
              <div
                className="h-8 w-8 flex-shrink-0 rounded border border-white/10"
                style={{ background: value }}
              />
            )}
          </div>
        );

      case "json":
        return <JsonInput value={value} onChange={onChange} placeholder={field.placeholder} className={commonClasses} />;

      case "list":
        return (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? "komma-separerat"}
            rows={3}
            className={`${commonClasses} font-mono`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-text">
          {field.label}
          {field.required && <span className="ml-1 text-accent">*</span>}
        </label>
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-text-muted/60">
          {field.name}
        </span>
      </div>
      {renderInput()}
      {field.hint && <p className="text-xs text-text-muted">{field.hint}</p>}
    </div>
  );
}

/** En lista per rad när det går — tupler som `["Namn", "beskrivning"]` blir läsbara så. */
function formatJson(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n]`;
  }
  return JSON.stringify(value, null, 2);
}

/**
 * En egenskap som är en lista eller ett objekt. Texten man skriver sparas bara
 * när den går att läsa som JSON — ett halvskrivet värde får aldrig ersätta
 * listan i filen. Tomt fält tar bort egenskapen.
 */
function JsonInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: PropValue | undefined;
  onChange: (value: PropValue) => void;
  placeholder?: string;
  className: string;
}) {
  const saved = useMemo(() => formatJson(value), [value]);
  // null = visa det sparade värdet; en sträng = det man håller på att skriva.
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const rows = Math.min(14, Math.max(3, (draft ?? saved).split("\n").length + 1));

  return (
    <>
      <textarea
        value={draft ?? saved}
        rows={rows}
        spellCheck={false}
        placeholder={placeholder ?? '[\n  ["Rubrik", "Förklaring"]\n]'}
        className={`${className} resize-y font-mono text-xs leading-relaxed${invalid ? " border-red-400/70" : ""}`}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() === "") {
            setInvalid(false);
            onChange("");
            return;
          }
          try {
            const parsed: unknown = JSON.parse(next);
            if (typeof parsed === "object" && parsed !== null) {
              setInvalid(false);
              onChange(parsed as PropValue);
            } else setInvalid(true);
          } catch {
            setInvalid(true);
          }
        }}
        onBlur={() => {
          if (!invalid) setDraft(null);
        }}
      />
      {invalid ? (
        <p className="text-xs text-red-300">Går inte att läsa än — värdet i filen är orört. Kontrollera citattecken, kommatecken och hakparenteser.</p>
      ) : null}
    </>
  );
}
