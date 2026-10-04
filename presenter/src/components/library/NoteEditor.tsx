"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDeckNote } from "@/lib/library-actions";
import styles from "./note-editor.module.css";

/**
 * Anteckningar om en föreläsning — det man vill komma ihåg inför och efter.
 *
 * Texten sparas av sig själv: en stund efter att man slutat skriva, när fältet
 * lämnas och när panelen stängs. Den hamnar i `content/anteckningar/<slug>.md`,
 * en vanlig markdownfil som också går att öppna i Obsidian eller läsas av en
 * agent. Används både i bibliotekets sidopanel och i studions översikt.
 */

const SAVE_DELAY_MS = 900;

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

export function NoteEditor({
  slug,
  initial,
  onSaved,
  autoFocus = false,
  rows = 9,
}: {
  slug: string;
  initial: string;
  /** Anropas med den sparade texten, så att kortets markering hänger med. */
  onSaved?: (slug: string, text: string) => void;
  autoFocus?: boolean;
  rows?: number;
}) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ text: initial, saved: initial, slug });
  const timer = useRef<number | null>(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const save = useCallback(async () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const { text: value, saved, slug: target } = latest.current;
    if (value === saved) return;
    setStatus("saving");
    const result = await saveDeckNote(target, value);
    if (result.ok) {
      latest.current.saved = value;
      onSavedRef.current?.(target, value.trim());
      // Har man hunnit skriva mer under tiden står den nya texten på tur.
      setStatus(latest.current.text === value ? "saved" : "dirty");
      setError(null);
    } else {
      setStatus("error");
      setError(result.error);
    }
  }, []);

  // Stängs panelen mitt i en mening ska meningen ändå sparas.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      const { text: value, saved, slug: target } = latest.current;
      if (value !== saved) void saveDeckNote(target, value).then((result) => result.ok && onSavedRef.current?.(target, value.trim()));
    },
    [],
  );

  const label =
    status === "dirty" ? "Ändrad" : status === "saving" ? "Sparar …" : status === "saved" ? "Sparat" : status === "error" ? (error ?? "Kunde inte spara") : "";

  return (
    <div className={styles.editor}>
      <textarea
        className={styles.area}
        value={text}
        rows={rows}
        autoFocus={autoFocus}
        spellCheck
        placeholder="Det du vill komma ihåg inför och efter: vad arrangören bad om, vad som ska uppdateras veckan före, hur det gick …"
        onChange={(event) => {
          const value = event.target.value;
          setText(value);
          latest.current.text = value;
          setStatus("dirty");
          if (timer.current !== null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
        }}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          // Piltangenter, N och / hör till sidan runt omkring — inte medan man skriver.
          event.stopPropagation();
          if (event.key === "Escape") event.currentTarget.blur();
        }}
      />
      <div className={styles.foot}>
        <span>content/anteckningar/{slug}.md</span>
        <span className={styles.status} data-state={status}>
          {label}
        </span>
      </div>
    </div>
  );
}
