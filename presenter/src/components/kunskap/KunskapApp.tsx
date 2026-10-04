"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AppRail, useRailWidth } from "@/components/app/AppRail";
import { dirOf, groupInfo, makeResolver, stemOf } from "@/lib/kunskap/lankar";
import type { NoteInfo, SearchHit, VaultIndex } from "@/lib/kunskap/typer";
import { GraphView } from "./GraphView";
import type { MarkdownLinks } from "./Markdown";
import { NotePanel } from "./NotePanel";
import { NoteView } from "./NoteView";
import { ancestors, backlinksOf, cleanName, formatDate, noteHref, readStored, writeStored } from "./vy";
import s from "./kunskap.module.css";

/**
 * Kunskapsbanken (2 oktober 2026): föreläsningsmappens wiki i appen, samma markdown som Obsidian
 * visar. Till vänster mapparna, sökningen och det senast ändrade; i mitten sidan eller hela grafen;
 * till höger grannskapet, föreläsningarna och länkarna åt båda hållen. Adressen bär sidan
 * (/kunskap?sida=wiki/begrepp/agens.md), så bakåt och framåt fungerar. Se docs/KUNSKAPSBANKEN.md.
 */

interface Folder {
  name: string;
  path: string;
  folders: Folder[];
  notes: NoteInfo[];
  count: number;
}

/** Mapparna som står först i listan; resten i bokstavsordning. */
const PINNED = ["wiki", "teman"];

function buildTree(notes: NoteInfo[]): Folder {
  const root: Folder = { name: "", path: "", folders: [], notes: [], count: 0 };
  const lookup = new Map<string, Folder>([["", root]]);
  for (const note of notes) {
    const parts = note.path.split("/");
    let folder = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const at = parts.slice(0, i + 1).join("/");
      let child = lookup.get(at);
      if (!child) {
        child = { name: parts[i], path: at, folders: [], notes: [], count: 0 };
        folder.folders.push(child);
        lookup.set(at, child);
      }
      folder = child;
    }
    folder.notes.push(note);
  }
  const finish = (folder: Folder): number => {
    folder.folders.sort((a, b) => {
      const pa = folder === root ? PINNED.indexOf(a.name) : -1, pb = folder === root ? PINNED.indexOf(b.name) : -1;
      if (pa >= 0 || pb >= 0) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
      return a.name.localeCompare(b.name, "sv");
    });
    folder.notes.sort((a, b) => stemOf(a.path).localeCompare(stemOf(b.path), "sv"));
    folder.count = folder.notes.length + folder.folders.reduce((sum, child) => sum + finish(child), 0);
    return folder.count;
  };
  finish(root);
  return root;
}

const plainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function KunskapApp() {
  const params = useSearchParams();
  const current = params.get("sida");
  const editRequested = params.get("redigera") === "1";
  const view = current && params.get("vy") !== "graf" ? "sida" : "graf";
  const railWidth = useRailWidth();
  const [index, setIndex] = useState<VaultIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([...readStored<string[]>("kunskap:mappar", ["wiki"]), ...ancestors(current)]));
  const [recentOpen, setRecentOpen] = useState(() => readStored<boolean>("kunskap:senaste", true));
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ query: string; list: SearchHit[] } | null>(null);
  const [creating, setCreating] = useState<{ name: string; folder: string; error?: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/kunskap", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "Kunskapsbanken finns bara i den lokala appen." : `Servern svarade ${response.status}.`);
      setIndex((await response.json()) as VaultIndex);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void load();
    // Ändringar i Obsidian syns när fönstret får fokus igen.
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // / söker, som i biblioteket.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const element = event.target as HTMLElement | null;
      if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable)) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // En ny sida börjar högst upp (eller vid rubriken i adressen, se NoteView).
  useEffect(() => {
    if (!window.location.hash) mainRef.current?.scrollTo({ top: 0 });
  }, [current, view]);

  // Sökningen i texten, en kort stund efter sista tangenten.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/kunskap/sok?q=${encodeURIComponent(text)}`, { cache: "no-store" });
      if (response.ok) setHits({ query: text, list: (await response.json()) as SearchHit[] });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const go = useCallback((target: { sida?: string; vy?: "graf"; rubrik?: string; redigera?: boolean }) => {
    const next = new URLSearchParams();
    if (target.sida) next.set("sida", target.sida);
    if (target.vy) next.set("vy", target.vy);
    if (target.redigera) next.set("redigera", "1");
    const hash = target.rubrik ? `#${encodeURIComponent(target.rubrik)}` : "";
    window.history.pushState(null, "", `/kunskap${next.size ? `?${next}` : ""}${hash}`);
    if (target.sida) {
      const open = ancestors(target.sida);
      setExpanded(previous => (open.every(folder => previous.has(folder)) ? previous : new Set([...previous, ...open])));
    }
  }, []);

  const notes = useMemo(() => new Map(index?.notes.map(note => [note.path, note]) ?? []), [index]);
  const backlinks = useMemo(() => backlinksOf(index), [index]);
  const resolver = useMemo(() => makeResolver({ notes: index?.notes.map(note => note.path) ?? [], decks: index?.decks.map(deck => deck.slug) ?? [] }), [index]);
  const tree = useMemo(() => buildTree(index?.notes ?? []), [index]);
  const recent = useMemo(() => [...(index?.notes ?? [])].sort((a, b) => b.mtime - a.mtime).slice(0, 8), [index]);

  /** En föreläsning: dess sida i wikin om den finns (och inte redan visas), annars studion. */
  const openDeck = useCallback(
    (slug: string) => {
      const page = index?.notes.find(note => note.group === "wiki/presentationer" && stemOf(note.path) === slug) ?? index?.notes.find(note => note.group === "wiki/presentationer" && note.decks.includes(slug));
      if (page && page.path !== current) go({ sida: page.path });
      else window.location.assign(`/${slug}/studio?mode=oversikt`);
    },
    [index, current, go],
  );

  const startCreate = useCallback(
    (target: string) => {
      const clean = target.replace(/\\/g, "/").replace(/\.md$/i, "");
      const setting = index?.newNote ?? { location: "root", folder: "" };
      const folder = clean.includes("/") ? dirOf(clean) : setting.location === "folder" ? setting.folder : setting.location === "current" && current ? dirOf(current) : "";
      setCreating({ name: cleanName(clean.split("/").pop() ?? ""), folder });
    },
    [index, current],
  );

  const links = useMemo<MarkdownLinks>(
    () => ({
      resolver,
      noteHref: (path, heading) => noteHref(path, heading),
      onNote: (path, heading) => go({ sida: path, rubrik: heading }),
      onDeck: openDeck,
      onMissing: startCreate,
    }),
    [resolver, go, openDeck, startCreate],
  );

  const create = async () => {
    if (!creating) return;
    const name = cleanName(creating.name);
    if (!name) return setCreating({ ...creating, error: "Sidan behöver ett namn." });
    const path = `${creating.folder ? `${creating.folder}/` : ""}${name}.md`;
    const response = await fetch(`/api/kunskap/sida?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `# ${name}\n\n`, create: true }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      return setCreating({ ...creating, error: body.message ?? "Sidan gick inte att skapa." });
    }
    setCreating(null);
    await load();
    go({ sida: path, redigera: true });
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
    writeStored("kunskap:mappar", [...next]);
  };

  const openNote = (path: string) => (event: MouseEvent) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    go({ sida: path });
  };

  // Snabba träffar direkt ur indexet medan sökningen i texten pågår.
  const quick = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase("sv").split(/\s+/).filter(Boolean);
    if (!terms.length || !index) return [];
    return index.notes
      .filter(note => {
        const hay = `${note.title} ${note.path} ${note.tags.join(" ")}`.toLocaleLowerCase("sv");
        return terms.every(term => hay.includes(term));
      })
      .slice(0, 30)
      .map(note => ({ path: note.path, title: note.title, group: note.group, snippet: "", score: 0 }));
  }, [query, index]);
  const results = hits && hits.query === query.trim() ? hits.list : quick;

  const note = current ? notes.get(current) : undefined;
  const folders = useMemo(() => {
    const out: string[] = [];
    const walk = (folder: Folder) => {
      if (folder.path && !/^(outputs|presenter)(\/|$)/.test(folder.path)) out.push(folder.path);
      folder.folders.forEach(walk);
    };
    walk(tree);
    return out;
  }, [tree]);

  const renderFolder = (folder: Folder, depth: number) =>
    folder.folders.map(child => {
      const open = expanded.has(child.path);
      return (
        <li key={child.path}>
          <button type="button" className={s.folder} aria-expanded={open} onClick={() => toggleFolder(child.path)} style={{ paddingLeft: 10 + depth * 14 }}>
            <span className={s.caret} aria-hidden />
            <span className={s.folderName}>{child.name}</span>
            <span className={s.count}>{child.count}</span>
          </button>
          {open ? (
            <ul>
              {renderFolder(child, depth + 1)}
              {child.notes.map(item => (
                <li key={item.path}>
                  <a className={s.file} href={noteHref(item.path)} onClick={openNote(item.path)} aria-current={item.path === current ? "page" : undefined} title={item.title} style={{ paddingLeft: 26 + depth * 14 }}>
                    {stemOf(item.path)}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      );
    });

  return (
    <div className={`${s.root} verkstad`} style={{ paddingLeft: railWidth }} data-view={view}>
      <AppRail current="kunskap" />

      <aside className={s.side} aria-label="Kunskapsbankens sidor">
        <header className={s.sideHead}>
          <div className={s.brand}>
            <span className={s.brandMark}>Presenter</span>
            <span className={s.brandSub}>Kunskapsbanken</span>
          </div>
          {index ? <p className={s.sideCount}>{index.notes.length} sidor · {index.decks.length} föreläsningar</p> : null}
        </header>
        <div className={s.search}>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") setQuery("");
              if (event.key === "Enter" && results[0]) go({ sida: results[0].path });
            }}
            placeholder="Sök i kunskapsbanken"
            aria-label="Sök i kunskapsbanken"
          />
          <kbd className={s.searchKey}>/</kbd>
        </div>
        <nav className={s.sideNav}>
          <button type="button" aria-current={view === "graf" ? "page" : undefined} onClick={() => go({ vy: "graf" })}>Grafen</button>
          <button type="button" onClick={() => startCreate("")}>Ny sida</button>
        </nav>

        {query.trim() ? (
          <ul className={s.results} aria-label="Träffar">
            {results.length ? (
              results.map(hit => (
                <li key={hit.path}>
                  <a href={noteHref(hit.path)} onClick={openNote(hit.path)} aria-current={hit.path === current ? "page" : undefined}>
                    <span className={s.resultTitle}>
                      <span className={s.swatch} style={{ background: groupInfo(hit.group).color }} aria-hidden />
                      {hit.title}
                    </span>
                    <span className={s.resultPath}>{hit.path}</span>
                    {hit.snippet ? <span className={s.resultSnippet}>{hit.snippet}</span> : null}
                  </a>
                </li>
              ))
            ) : (
              <li className={s.empty}>{query.trim().length < 2 ? "Skriv minst två tecken." : "Inga träffar."}</li>
            )}
          </ul>
        ) : (
          <div className={s.tree}>
            <button type="button" className={s.sectionToggle} aria-expanded={recentOpen} onClick={() => {
              setRecentOpen(!recentOpen);
              writeStored("kunskap:senaste", !recentOpen);
            }}>
              <span className={s.caret} aria-hidden />
              Senast ändrade
            </button>
            {recentOpen ? (
              <ul className={s.recent}>
                {recent.map(item => (
                  <li key={item.path}>
                    <a href={noteHref(item.path)} onClick={openNote(item.path)} aria-current={item.path === current ? "page" : undefined} title={item.path}>
                      <span className={s.recentTitle}>{item.title}</span>
                      <span className={s.recentWhen}>{formatDate(item.mtime)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className={s.folders}>
              {renderFolder(tree, 0)}
              {tree.notes.map(item => (
                <li key={item.path}>
                  <a className={s.file} href={noteHref(item.path)} onClick={openNote(item.path)} aria-current={item.path === current ? "page" : undefined} title={item.title} style={{ paddingLeft: 26 }}>
                    {stemOf(item.path)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <main ref={mainRef} className={s.main}>
        {loadError ? <div className={s.notice}>{loadError}</div> : null}
        {!index && !loadError ? <div className={s.notice}>Läser kunskapsbanken …</div> : null}
        {index && view === "graf" ? <GraphView index={index} onOpen={path => go({ sida: path })} onDeck={openDeck} /> : null}
        {index && view === "sida" && current ? (
          <NoteView key={current} path={current} info={note} vaultName={index.name} startEditing={editRequested} links={links} onSaved={() => void load()} onTag={tag => setQuery(tag)} />
        ) : null}
      </main>

      {index && view === "sida" && note ? (
        <aside className={s.panel} aria-label="Sidans sammanhang">
          <NotePanel key={note.path} index={index} note={note} backlinks={backlinks} onOpen={path => go({ sida: path })} onDeck={openDeck} onMissing={startCreate} />
        </aside>
      ) : null}

      {creating ? (
        <div className={s.dialogBackdrop} onClick={() => setCreating(null)}>
          <form
            className={s.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ny-sida"
            onClick={event => event.stopPropagation()}
            onSubmit={event => {
              event.preventDefault();
              void create();
            }}
            onKeyDown={event => {
              if (event.key === "Escape") setCreating(null);
            }}
          >
            <h2 id="ny-sida">Ny sida</h2>
            <label>
              Namn
              <input autoFocus value={creating.name} onChange={event => setCreating({ ...creating, name: event.target.value, error: undefined })} placeholder="Till exempel sykofanti" />
            </label>
            <label>
              Mapp
              <select value={creating.folder} onChange={event => setCreating({ ...creating, folder: event.target.value })}>
                <option value="">Roten</option>
                {[...new Set([creating.folder, ...folders])].filter(Boolean).map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            </label>
            {creating.error ? <p className={s.dialogError}>{creating.error}</p> : null}
            <p className={s.dialogHint}>
              Sidan blir {creating.folder ? `${creating.folder}/` : ""}{cleanName(creating.name) || "…"}.md och öppnas för redigering. Obsidian ser den direkt.
            </p>
            <div className={s.dialogActions}>
              <button type="button" className={s.action} onClick={() => setCreating(null)}>Avbryt</button>
              <button type="submit" className={s.actionPrimary}>Skapa sidan</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
