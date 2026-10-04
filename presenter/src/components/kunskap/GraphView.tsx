"use client";

import { useCallback, useMemo, useState } from "react";
import { DECK_GROUP, groupInfo, QUIET_GROUPS, sortGroups } from "@/lib/kunskap/lankar";
import type { VaultIndex } from "@/lib/kunskap/typer";
import { Graph } from "./Graph";
import { readStored, wholeGraph, writeStored } from "./vy";
import s from "./kunskap.module.css";

/**
 * Hela Kunskapsbanken som graf (2 oktober 2026). Färgen är mappen; föreläsningarna är svarta
 * kvadrater, kopplade till sidorna om dem. Förklaringen slår på och av grupper; utkast, råmaterial
 * och Presenters egen dokumentation är avslagna från början, eftersom de är många och sällan länkar.
 */

export function GraphView({ index, onOpen, onDeck }: { index: VaultIndex; onOpen: (path: string) => void; onDeck: (slug: string) => void }) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readStored<string[]>("kunskap:dolda", QUIET_GROUPS)));
  const [orphans, setOrphans] = useState(() => readStored<boolean>("kunskap:ensamma", false));
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of index.notes) map.set(note.group, (map.get(note.group) ?? 0) + 1);
    if (index.decks.length) map.set(DECK_GROUP, index.decks.length);
    return map;
  }, [index]);
  const groups = useMemo(() => sortGroups([...counts.keys()]), [counts]);
  const graph = useMemo(() => wholeGraph(index, hidden, orphans), [index, hidden, orphans]);
  const highlight = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("sv");
    if (text.length < 2) return null;
    return new Set(graph.nodes.filter(node => node.label.toLocaleLowerCase("sv").includes(text) || node.id.toLocaleLowerCase("sv").includes(text)).map(node => node.id));
  }, [query, graph]);

  const toggle = (group: string) => {
    const next = new Set(hidden);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setHidden(next);
    writeStored("kunskap:dolda", [...next]);
  };
  const open = useCallback((id: string) => (id.startsWith("deck:") ? onDeck(id.slice(5)) : onOpen(id)), [onDeck, onOpen]);

  return (
    <div className={s.graphView}>
      <Graph className={s.graphCanvas} nodes={graph.nodes} edges={graph.edges} highlight={highlight} insetLeft={268} onOpen={open} label={`Grafen över kunskapsbanken: ${graph.nodes.length} noder och ${graph.edges.length} länkar`} />
      <aside className={s.legend} aria-label="Grafens förklaring">
        <input
          className={s.legendSearch}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Lyft fram i grafen …"
          aria-label="Lyft fram sidor i grafen"
        />
        {highlight ? <p className={s.legendHits}>{highlight.size} {highlight.size === 1 ? "träff" : "träffar"}</p> : null}
        <ul>
          {groups.map(group => {
            const info = groupInfo(group);
            return (
              <li key={group || "roten"}>
                <label>
                  <input type="checkbox" checked={!hidden.has(group)} onChange={() => toggle(group)} />
                  <span className={group === DECK_GROUP ? s.swatchDeck : s.swatch} style={{ background: info.color }} aria-hidden />
                  <span className={s.legendLabel}>{info.label}</span>
                  <span className={s.count}>{counts.get(group)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <label className={s.legendOption}>
          <input type="checkbox" checked={orphans} onChange={event => {
            setOrphans(event.target.checked);
            writeStored("kunskap:ensamma", event.target.checked);
          }} />
          Sidor utan länkar
        </label>
        <p className={s.hint}>{graph.nodes.length} noder · {graph.edges.length} länkar. Dra för att flytta, rulla för att zooma, dubbelklicka för att se allt.</p>
      </aside>
    </div>
  );
}
