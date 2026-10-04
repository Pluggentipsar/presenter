"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { useCoverThumbnails } from "@/components/studio/useDeckThumbnails";
import { groupInfo, stemOf } from "@/lib/kunskap/lankar";
import type { DeckInfo, NoteInfo, VaultIndex } from "@/lib/kunskap/typer";
import { Graph } from "./Graph";
import { neighbourhood, noteHref, readStored, writeStored } from "./vy";
import s from "./kunskap.module.css";

/**
 * Spalten bredvid en sida (2 oktober 2026): grannskapet som graf, föreläsningen sidan hör till
 * (med omslaget, studion och spelaren), vilka föreläsningar som använder sidan, och länkarna åt
 * båda hållen. Det Obsidian inte kan visa är föreläsningarna: decken är .mdx och utanför valvet.
 */

const plainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Grupper vars sidor beskriver en föreläsning eller ett block ur den. */
const DECK_SOURCES = new Set(["wiki/presentationer", "wiki/blockbank"]);

export function NotePanel({
  index,
  note,
  backlinks,
  onOpen,
  onDeck,
  onMissing,
}: {
  index: VaultIndex;
  note: NoteInfo;
  backlinks: Map<string, NoteInfo[]>;
  onOpen: (path: string) => void;
  onDeck: (slug: string) => void;
  onMissing: (target: string) => void;
}) {
  const [depth, setDepth] = useState(() => readStored<number>("kunskap:djup", 1));
  const notes = useMemo(() => new Map(index.notes.map(item => [item.path, item])), [index]);
  const decks = useMemo(() => new Map(index.decks.map(deck => [deck.slug, deck])), [index]);
  const incoming = useMemo(() => [...(backlinks.get(note.path) ?? [])].sort((a, b) => a.title.localeCompare(b.title, "sv")), [backlinks, note.path]);
  const outgoing = useMemo(() => note.links.map(path => notes.get(path)).filter((item): item is NoteInfo => Boolean(item)).sort((a, b) => a.title.localeCompare(b.title, "sv")), [note.links, notes]);
  const own = useMemo(() => note.decks.map(slug => decks.get(slug)).filter((deck): deck is DeckInfo => Boolean(deck)), [note.decks, decks]);
  const usedIn = useMemo(() => {
    const out = new Map<string, DeckInfo>();
    for (const source of incoming) {
      if (!DECK_SOURCES.has(source.group)) continue;
      for (const slug of source.decks) {
        const deck = decks.get(slug);
        if (deck && !note.decks.includes(slug)) out.set(slug, deck);
      }
    }
    return [...out.values()].slice(0, 12);
  }, [incoming, decks, note.decks]);
  const graph = useMemo(() => neighbourhood(index, backlinks, note.path, depth), [index, backlinks, note.path, depth]);

  const open = (path: string) => (event: MouseEvent) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    onOpen(path);
  };
  const onGraphOpen = useCallback((id: string) => (id.startsWith("deck:") ? onDeck(id.slice(5)) : onOpen(id)), [onDeck, onOpen]);

  return (
    <div className={s.panelInner}>
      <section className={s.panelSection}>
        <div className={s.panelHead}>
          <h3>Grannskap</h3>
          <div className={s.depth} role="group" aria-label="Hur långt ut">
            {[1, 2].map(value => (
              <button key={value} type="button" aria-pressed={depth === value} onClick={() => {
                setDepth(value);
                writeStored("kunskap:djup", value);
              }}>{value === 1 ? "Närmast" : "Två steg"}</button>
            ))}
          </div>
        </div>
        <Graph className={s.localGraph} nodes={graph.nodes} edges={graph.edges} focus={note.path} compact onOpen={onGraphOpen} label={`Sidorna runt ${note.title}`} />
      </section>

      {own.length > 0 ? (
        <section className={s.panelSection}>
          <h3>{own.length === 1 ? "Föreläsningen" : "Föreläsningarna"}</h3>
          <DeckCovers decks={own} />
        </section>
      ) : null}

      {usedIn.length > 0 ? (
        <section className={s.panelSection}>
          <h3>Används i föreläsningar · {usedIn.length}</h3>
          <DeckCovers decks={usedIn} compact />
        </section>
      ) : null}

      <section className={s.panelSection}>
        <h3>Länkar hit · {incoming.length}</h3>
        {incoming.length ? (
          <ul className={s.linkList}>
            {incoming.map(item => (
              <li key={item.path}>
                <a href={noteHref(item.path)} onClick={open(item.path)} title={item.path}>
                  <span className={s.swatch} style={{ background: groupInfo(item.group).color }} aria-hidden />
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Inga sidor länkar hit än.</p>
        )}
      </section>

      <section className={s.panelSection}>
        <h3>Länkar härifrån · {outgoing.length + note.missing.length}</h3>
        {outgoing.length || note.missing.length ? (
          <ul className={s.linkList}>
            {outgoing.map(item => (
              <li key={item.path}>
                <a href={noteHref(item.path)} onClick={open(item.path)} title={item.path}>
                  <span className={s.swatch} style={{ background: groupInfo(item.group).color }} aria-hidden />
                  {item.title}
                </a>
              </li>
            ))}
            {note.missing.map(target => (
              <li key={`saknas-${target}`}>
                <button type="button" className={s.missingItem} onClick={() => onMissing(target)} title="Sidan finns inte än. Klicka för att skapa den.">
                  <span className={s.swatchEmpty} aria-hidden />
                  {stemOf(target)}
                  <span className={s.missingTag}>saknas</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Sidan länkar inte vidare.</p>
        )}
      </section>
    </div>
  );
}

/** Föreläsningarnas omslag, med vägar till studion och spelaren. Kompakt: små omslag i en lista. */
function DeckCovers({ decks, compact = false }: { decks: DeckInfo[]; compact?: boolean }) {
  const sources = useMemo(() => decks.map(deck => ({ slug: deck.slug, coverSlide: deck.coverSlide, coverHash: deck.coverHash })), [decks]);
  const visible = useCallback(() => true, []);
  const { thumbs, workers } = useCoverThumbnails({ decks: sources, enabled: sources.length > 0, isVisible: visible });
  // Två föreläsningar med samma titel (versioner) skiljs åt med sitt slug.
  const twins = useMemo(() => {
    const seen = new Map<string, number>();
    for (const deck of decks) seen.set(deck.title, (seen.get(deck.title) ?? 0) + 1);
    return new Set([...seen].filter(([, count]) => count > 1).map(([title]) => title));
  }, [decks]);
  return (
    <div className={s.decks} data-compact={compact ? "" : undefined}>
      {decks.map(deck => {
        const thumb = thumbs.get(deck.slug);
        return (
          <figure key={deck.slug} className={s.deck}>
            <a className={s.cover} href={`/${deck.slug}/studio?mode=oversikt`} title="Öppna i studion">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" />
              ) : (
                <span className={s.coverEmpty}>{deck.title}</span>
              )}
            </a>
            <figcaption>
              <span className={s.deckTitle}>{deck.title}</span>
              {deck.event || deck.date || twins.has(deck.title) ? <span className={s.deckMeta}>{[twins.has(deck.title) ? deck.slug : null, deck.event, deck.date].filter(Boolean).join(" · ")}</span> : null}
              <span className={s.deckActions}>
                <a href={`/${deck.slug}/studio?mode=oversikt`}>Studion</a>
                <a href={`/${deck.slug}`}>Presentera</a>
              </span>
            </figcaption>
          </figure>
        );
      })}
      {workers}
    </div>
  );
}
