"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LibraryDeck } from "@/lib/library.server";
import { changedLabel, formatDate, searchable } from "@/lib/library-format";
import { NoteEditor } from "./NoteEditor";
import { workspaceHref, type DeckState } from "./LibraryParts";
import styles from "./library.module.css";

/**
 * Sidopanelen "om föreläsningen": anteckningar, versioner, delning och fakta
 * på ett ställe. Det Joel bad om från början — en plats som samlar det man vet
 * om en föreläsning, inte bara dess slides.
 */

export interface VersionItem {
  deck: LibraryDeck;
  current: boolean;
  archived: boolean;
}

interface Props {
  deck: LibraryDeck;
  state: DeckState;
  today: string;
  cover?: string;
  note: string;
  readOnly: boolean;
  /** Alla versioner i deckets familj (decket självt inräknat). Tom om det står ensamt. */
  versions: VersionItem[];
  /** Deck som på namnet ser ut att vara versioner av det här. */
  suggestions: LibraryDeck[];
  /** Deck som går att lägga till som version. */
  candidates: LibraryDeck[];
  onClose: () => void;
  onNoteSaved: (slug: string, text: string) => void;
  onSetCurrent: (slug: string) => void;
  onAddVersions: (slugs: string[]) => void;
  onRemoveVersion: (slug: string) => void;
  onShowDeck: (slug: string) => void;
}

export function DeckDrawer({
  deck,
  state,
  today,
  cover,
  note,
  readOnly,
  versions,
  suggestions,
  candidates,
  onClose,
  onNoteSaved,
  onSetCurrent,
  onAddVersions,
  onRemoveVersion,
  onShowDeck,
}: Props) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const words = searchable(query).split(" ").filter(Boolean);
    if (words.length === 0) return [];
    return candidates
      .filter((candidate) => {
        const hay = searchable(`${candidate.title} ${candidate.slug} ${candidate.event ?? ""}`);
        return words.every((word) => hay.includes(word));
      })
      .slice(0, 7);
  }, [candidates, query]);

  const inFamily = versions.length > 1;

  return (
    <aside className={styles.drawer} aria-label={`Om ${deck.title}`}>
      <header className={styles.drawerHead}>
        <div className={styles.drawerCover}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 className={styles.drawerTitle}>{deck.title}</h2>
          <p className={styles.drawerSub}>{[deck.event, formatDate(deck.date, today)].filter(Boolean).join(" · ")}</p>
          <p className={styles.cardSlug}>/{deck.slug}</p>
        </div>
        <button type="button" className={styles.drawerClose} aria-label="Stäng" onClick={onClose}>
          ×
        </button>
      </header>

      <div className={styles.drawerBody}>
        <div className={styles.drawerActions}>
          <Link prefetch={false} href={`/${deck.slug}`} className={`${styles.act} ${styles.actPlay}`}>
            ▶ Presentera
          </Link>
          <Link prefetch={false} href={workspaceHref(deck.slug)} className={styles.act}>
            Öppna översikten
          </Link>
          <Link prefetch={false} href={`/${deck.slug}/presenter`} target={`presenter-${deck.slug}`} className={styles.act}>
            Presentatörsvy
          </Link>
        </div>

        {!readOnly ? (
          <section className={styles.drawerSection}>
            <h3>Anteckningar</h3>
            <NoteEditor key={deck.slug} slug={deck.slug} initial={note} onSaved={onNoteSaved} />
          </section>
        ) : null}

        <section className={styles.drawerSection}>
          <h3>Versioner</h3>
          {inFamily ? (
            <>
              <p className={styles.drawerHint}>
                Stjärnan visar vilken version som gäller. Det är den som syns i biblioteket, och den man i första hand menar när
                man hänvisar till föreläsningen.
              </p>
              <ul className={styles.versions}>
                {versions.map((item) => (
                  <li key={item.deck.slug} data-current={item.current ? "" : undefined} data-here={item.deck.slug === deck.slug ? "" : undefined}>
                    <button
                      type="button"
                      className={styles.star}
                      aria-pressed={item.current}
                      disabled={readOnly || item.current}
                      title={item.current ? "Den här versionen gäller" : "Låt den här versionen gälla"}
                      onClick={() => onSetCurrent(item.deck.slug)}
                    >
                      {item.current ? "★" : "☆"}
                    </button>
                    <button type="button" className={styles.versionName} onClick={() => onShowDeck(item.deck.slug)} title="Visa den här versionen i panelen">
                      <span>{item.deck.title}</span>
                      <small>
                        /{item.deck.slug} · {item.deck.slideCount} slides · {changedLabel(item.deck.updatedAtMs, today)}
                        {item.archived ? " · arkiverad" : ""}
                      </small>
                    </button>
                    <Link prefetch={false} href={workspaceHref(item.deck.slug)} className={styles.act}>
                      Öppna
                    </Link>
                    {!readOnly ? (
                      <button type="button" className={styles.versionRemove} title="Ta ur versionerna — föreläsningen finns kvar" onClick={() => onRemoveVersion(item.deck.slug)}>
                        ×
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.drawerHint}>
              Finns föreläsningen i flera versioner? Samla dem här och sätt en stjärna på den som gäller — då blir de ett kort i
              biblioteket i stället för flera.
            </p>
          )}

          {!readOnly && suggestions.length > 0 ? (
            <div className={styles.versionSuggest}>
              <span>
                Ser ut att höra hit: {suggestions.map((s) => `/${s.slug}`).join(", ")}
              </span>
              <button type="button" className={styles.link} onClick={() => onAddVersions(suggestions.map((s) => s.slug))}>
                Lägg till {suggestions.length === 1 ? "den" : "dem"}
              </button>
            </div>
          ) : null}

          {!readOnly ? (
            picking ? (
              <div className={styles.picker}>
                <input
                  autoFocus
                  value={query}
                  placeholder="Sök den version du vill lägga till …"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Escape") {
                      setPicking(false);
                      setQuery("");
                    }
                  }}
                />
                {matches.map((candidate) => (
                  <button
                    key={candidate.slug}
                    type="button"
                    onClick={() => {
                      onAddVersions([candidate.slug]);
                      setQuery("");
                      setPicking(false);
                    }}
                  >
                    <span>{candidate.title}</span>
                    <small>/{candidate.slug}</small>
                  </button>
                ))}
                {query.trim() && matches.length === 0 ? <p className={styles.drawerHint}>Inget matchade.</p> : null}
              </div>
            ) : (
              <button type="button" className={styles.linkQuiet} onClick={() => setPicking(true)}>
                + lägg till en version
              </button>
            )
          ) : null}
        </section>

        <section className={styles.drawerSection}>
          <h3>Delning</h3>
          {deck.shared?.landing ? (
            <ul className={styles.facts}>
              <li>
                <span>Landningssida</span>
                <a href={deck.shared.landing} target="_blank" rel="noreferrer">
                  {deck.shared.landing.replace(/^https?:\/\//, "")}
                </a>
              </li>
              {deck.shared.read ? (
                <li>
                  <span>Läsläge</span>
                  <a href={deck.shared.read} target="_blank" rel="noreferrer">
                    öppna ↗
                  </a>
                </li>
              ) : null}
              {deck.shared.publishedAt ? (
                <li>
                  <span>Publicerad</span>
                  {formatDate(deck.shared.publishedAt.slice(0, 10), today)}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={styles.drawerHint}>
              Inte publicerad på here.now.{" "}
              <Link prefetch={false} href={`/${deck.slug}/dela`} className={styles.link}>
                Se delningssidan lokalt
              </Link>
            </p>
          )}
        </section>

        <section className={styles.drawerSection}>
          <h3>Fakta</h3>
          <ul className={styles.facts}>
            <li>
              <span>Mapp</span>
              {state.archived ? "Arkiv" : state.folderName || "Osorterat"}
            </li>
            <li>
              <span>Slides</span>
              {deck.slideCount}
            </li>
            <li>
              <span>Tema</span>
              {deck.theme}
            </li>
            <li>
              <span>Ändrad</span>
              {changedLabel(deck.updatedAtMs, today).replace(/^ändrad /, "")}
            </li>
            {deck.tags.length > 0 ? (
              <li>
                <span>Taggar</span>
                {deck.tags.join(", ")}
              </li>
            ) : null}
          </ul>
          <div className={styles.drawerLinks}>
            <Link prefetch={false} href={`/${deck.slug}/studio`}>Storyboard</Link>
            <Link prefetch={false} href={`/${deck.slug}/studio?mode=manus`}>Manus</Link>
            <Link prefetch={false} href={`/${deck.slug}/edit`}>Slide-editor</Link>
            {!readOnly ? <Link prefetch={false} href={`/${deck.slug}/inspelningar`}>Inspelningar</Link> : null}
          </div>
        </section>
      </div>
    </aside>
  );
}
