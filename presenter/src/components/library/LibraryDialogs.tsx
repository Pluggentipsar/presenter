"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AGARE } from "@/lib/agare";
import type { Library } from "@/lib/library";
import { folderTree } from "@/lib/library";
import type { LibraryDeck } from "@/lib/library.server";
import { createPresentation } from "@/lib/presentation-actions";
import styles from "./library.module.css";

function Dialog({ title, lead, onClose, children }: { title: string; lead?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.dialogScrim}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.dialogHead}>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ny föreläsning: titel, tema och vilken mapp den ska ligga i. */
export function NewDeckDialog({
  library,
  themes,
  defaultFolder,
  onClose,
  onCreated,
}: {
  library: Library;
  themes: string[];
  defaultFolder: string | null;
  onClose: () => void;
  onCreated: (slug: string, folder: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState(themes.includes(AGARE.standardtema) ? AGARE.standardtema : (themes[0] ?? "default"));
  const [folder, setFolder] = useState(defaultFolder ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await createPresentation({ title, theme });
    if (result.ok && result.slug) onCreated(result.slug, folder || null);
    else {
      setBusy(false);
      setError(result.error ?? "Kunde inte skapa föreläsningen.");
    }
  };

  return (
    <Dialog title="Ny föreläsning" lead="Adressen skapas ur titeln. Du landar i översikten, där du kan skriva tråden rad för rad." onClose={onClose}>
      <form onSubmit={submit} style={{ display: "contents" }}>
        <div className={styles.dialogBody}>
          <label className={styles.field}>
            Titel
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. AI i skolledarskap" />
          </label>
          <label className={styles.field}>
            Tema
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {themes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Mapp
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">Osorterat</option>
              {folderTree(library).map((node) => [
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>,
                ...node.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {"   "}
                    {child.name}
                  </option>
                )),
              ])}
            </select>
          </label>
        </div>
        <div className={styles.dialogFoot}>
          {error ? <span className={styles.dialogError}>{error}</span> : null}
          <button type="button" className={styles.quiet} onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className={styles.primary} disabled={busy || !title.trim()}>
            {busy ? "Skapar …" : "Skapa"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Städförslaget: deck som ser ut som prov, demon eller kopior — granska, arkivera. */
export function CleanupDialog({ decks, onClose, onArchive }: { decks: LibraryDeck[]; onClose: () => void; onArchive: (slugs: string[]) => void }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(decks.map((deck) => deck.slug)));
  const toggle = (slug: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <Dialog
      title="Städa undan prov och kopior"
      lead="De här ser på namnet ut som demon, formprov eller arbetskopior. Arkiverade deck finns kvar och går att öppna — de syns bara inte bland föreläsningarna. Bocka ur det som ska vara kvar."
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <div className={styles.checkList}>
          {decks.map((deck) => (
            <label key={deck.slug}>
              <input type="checkbox" checked={checked.has(deck.slug)} onChange={() => toggle(deck.slug)} />
              <span>{deck.title}</span>
              <small>{deck.slug}</small>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.dialogFoot}>
        <button type="button" className={styles.quiet} onClick={onClose}>
          Avbryt
        </button>
        <button type="button" className={styles.primary} disabled={checked.size === 0} onClick={() => onArchive([...checked])}>
          Arkivera {checked.size}
        </button>
      </div>
    </Dialog>
  );
}

export interface VersionGroup {
  family: string;
  decks: LibraryDeck[];
  /** Förvald stjärna: den senast ändrade. */
  current: string;
}

/** Versionsförslagen: deck som på namnet ser ut att vara versioner av varandra. */
export function VersionsDialog({
  groups,
  onClose,
  onApply,
}: {
  groups: VersionGroup[];
  onClose: () => void;
  onApply: (chosen: { family: string; slugs: string[]; current: string }[]) => void;
}) {
  const [included, setIncluded] = useState<Set<string>>(() => new Set(groups.map((group) => group.family)));
  const [current, setCurrent] = useState<Record<string, string>>(() => Object.fromEntries(groups.map((group) => [group.family, group.current])));

  const toggle = (family: string) =>
    setIncluded((before) => {
      const next = new Set(before);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });

  return (
    <Dialog
      title="Samla versioner"
      lead="De här ser på adressen ut att vara versioner av samma föreläsning. Välj vilken som gäller — den får stjärnan och blir kortet i biblioteket. De andra finns kvar och nås från kortet."
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <div className={styles.groupList}>
          {groups.map((group) => (
            <div key={group.family} className={styles.group} data-off={included.has(group.family) ? undefined : ""}>
              <label className={styles.groupHead}>
                <input type="checkbox" checked={included.has(group.family)} onChange={() => toggle(group.family)} />
                {group.decks.find((deck) => deck.slug === current[group.family])?.title ?? group.family}
              </label>
              {group.decks.map((deck) => (
                <label key={deck.slug} className={styles.groupRow}>
                  <input
                    type="radio"
                    name={`gäller-${group.family}`}
                    checked={current[group.family] === deck.slug}
                    disabled={!included.has(group.family)}
                    onChange={() => setCurrent((before) => ({ ...before, [group.family]: deck.slug }))}
                  />
                  <span>
                    {current[group.family] === deck.slug ? "★ " : ""}/{deck.slug}
                  </span>
                  <small>{deck.slideCount} slides</small>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.dialogFoot}>
        <button type="button" className={styles.quiet} onClick={onClose}>
          Avbryt
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={included.size === 0}
          onClick={() =>
            onApply(
              groups
                .filter((group) => included.has(group.family))
                .map((group) => ({ family: group.family, slugs: group.decks.map((deck) => deck.slug), current: current[group.family] })),
            )
          }
        >
          Samla {included.size} {included.size === 1 ? "föreläsning" : "föreläsningar"}
        </button>
      </div>
    </Dialog>
  );
}
