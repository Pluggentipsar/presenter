"use client";

import { useEffect, useRef } from "react";
import type { ParsedComponent } from "@/lib/mdx-parser";
import { getTemplateSchemaOrFallback } from "@/lib/template-schemas";
import styles from "./oversikt.module.css";

/**
 * En rad i översikten, utfälld: det man annars bara nådde i manusläget eller
 * editorn — manuset, orden på sliden och instruktionen till Claude.
 *
 * Joel (23 september 2026) frågade om översikten och manusläget borde slås
 * ihop. De delade samma radlista; det enda manusläget hade för sig självt var
 * detaljerna för en rad. Här blir de en utfällning i översikten (→ fäller ut,
 * ← fäller ihop), så att tråden och manuset går att skriva på samma ställe.
 * Manuset (anteckningarna under sliden) gick förut inte att skriva i någon av
 * de två vyerna — bara i editorns fältpanel.
 */

/** Fält som inte är slidens ord: identitet, planering, lager, filer. */
const NOT_WORDS =
  /^(claude|slideId|akt|syfte|tid|mall|visuell|kalla|media|stegAv|hoppaSteg|mark|background|symbol|figure|register|cutSkip)$|Icon$|Hidden$|Color$|Size$|^(symbol|figure|mark)[A-Z]/;

function text(slide: ParsedComponent, key: string): string {
  const value = slide.props[key];
  return typeof value === "string" ? value : "";
}

function AutoArea({
  value,
  onChange,
  placeholder,
  mono,
  claude,
  autoFocus,
  minRows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  claude?: boolean;
  autoFocus?: boolean;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nollställ först — annars kan höjden bara växa, aldrig krympa.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={styles.detailArea}
      data-mono={mono ? "" : undefined}
      data-claude={claude && value.trim() ? "" : undefined}
      value={value}
      rows={minRows}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Listans tangenter (↑ ↓ N K M H Delete) gäller inte när man skriver.
        e.stopPropagation();
        if (e.key === "Escape") {
          // Tillbaka till listan, så att ← fäller ihop och ↑ ↓ väljer rad igen.
          const list = e.currentTarget.closest<HTMLElement>('[role="listbox"]');
          e.currentTarget.blur();
          list?.focus({ preventScroll: true });
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function SlideManusDetail({
  slide,
  index,
  onSetProp,
  onSetContent,
  onSetNotes,
  onOpenEditor,
  onClose,
}: {
  slide: ParsedComponent;
  index: number;
  /** Sparar värdet som det skrivs (tomt tar bort propen). */
  onSetProp: (index: number, key: string, value: string) => void;
  onSetContent: (index: number, value: string) => void;
  onSetNotes: (index: number, value: string) => void;
  onOpenEditor: (index: number) => void;
  onClose: () => void;
}) {
  const isDraft = slide.tag === "Utkast";
  const { schema } = getTemplateSchemaOrFallback(slide.tag, slide.props, Boolean(slide.content?.trim()));
  const wordFields = isDraft
    ? []
    : schema.fields.filter(
        (field) => (field.type === "text" || field.type === "multiline") && !field.advanced && !NOT_WORDS.test(field.name),
      );
  const filled = wordFields.filter((field) => text(slide, field.name).trim() !== "");
  const hasContent = Boolean(slide.content?.trim());
  const contentLabel = isDraft ? "Orden på sliden" : `${schema.contentLabel ?? "Texten"} · som i filen`;

  return (
    <div
      className={styles.detail}
      data-nodrag=""
      role="group"
      aria-label={`Manus och text för slide ${index + 1}`}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.detailHead}>
        <span>
          Slide {index + 1} · {slide.tag === "StaScene" ? text(slide, "scene") || slide.tag : slide.tag}
        </span>
        <button type="button" onClick={() => onOpenEditor(index)}>
          öppna i editorn
        </button>
        <button type="button" onClick={onClose} title="Fäll ihop (←)">
          fäll ihop
        </button>
      </div>
      <div className={styles.detailGrid}>
        <label className={styles.detailField}>
          <span className={styles.detailLabel}>Manus — det du säger</span>
          <AutoArea
            value={slide.notes ?? ""}
            onChange={(value) => onSetNotes(index, value)}
            placeholder="Det du säger på den här sliden. Syns i presentatörsvyn."
            minRows={5}
            autoFocus
          />
        </label>
        <div className={styles.detailColumn}>
          {filled.map((field) => (
            <label key={field.name} className={styles.detailField}>
              <span className={styles.detailLabel}>{field.label ?? field.name}</span>
              <AutoArea value={text(slide, field.name)} onChange={(value) => onSetProp(index, field.name, value)} minRows={1} />
            </label>
          ))}
          {isDraft || hasContent ? (
            <label className={styles.detailField}>
              <span className={styles.detailLabel}>{contentLabel}</span>
              <AutoArea
                value={slide.content ?? ""}
                onChange={(value) => onSetContent(index, value)}
                placeholder={isDraft ? "Orden som ska stå på sliden." : "Innehållet som det står i filen."}
                mono={!isDraft}
                minRows={2}
              />
            </label>
          ) : null}
          <label className={styles.detailField}>
            <span className={styles.detailLabel}>Till Claude/Codex</span>
            <AutoArea
              value={text(slide, "claude")}
              onChange={(value) => onSetProp(index, "claude", value)}
              placeholder="Vad ska göras med sliden nästa byggpass?"
              claude
              minRows={1}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
