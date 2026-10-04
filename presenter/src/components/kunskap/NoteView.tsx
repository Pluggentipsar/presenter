"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { headingId, splitFrontmatter, stemOf } from "@/lib/kunskap/lankar";
import type { NoteInfo, NotePage } from "@/lib/kunskap/typer";
import { Markdown, type MarkdownLinks } from "./Markdown";
import { formatDate } from "./vy";
import s from "./kunskap.module.css";

/**
 * En sida i Kunskapsbanken (2 oktober 2026): läsläget med rubrik, taggar och egenskaper, och
 * redigeringen med markdown till vänster och sidan som den blir till höger.
 *
 * Redigeringen sparar själv en dryg sekund efter att man slutat skriva, direkt med Ctrl+S, och
 * när man lämnar sidan. Varje sparning bär fingeravtrycket av versionen den bygger på. Har filen
 * ändrats på disken under tiden (i Obsidian eller av en agent) skriver servern ingenting, och sidan
 * frågar vilken version som gäller. Komponenten får en ny nyckel för varje sida, så tillståndet
 * börjar om.
 */

type SaveState = "" | "sparar" | "sparat" | "konflikt" | "fel";

const normalize = (text: string) => text.replace(/\r\n?/g, "\n");

/** Sidans första rad om den är en H1, och resten; rubriken visas före taggar och egenskaper. */
function splitTitle(body: string): { title: string | null; rest: string } {
  const match = body.match(/^\s*(#[ \t]+[^\n]+)\n?/);
  return match ? { title: match[1], rest: body.slice(match[0].length) } : { title: null, rest: body };
}

function show(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) && value.every(item => typeof item !== "object" || item === null)) return value.join(", ");
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > 240 ? `${text.slice(0, 238)}…` : text;
  }
  return String(value);
}

export function NoteView({
  path,
  info,
  vaultName,
  startEditing,
  links,
  onSaved,
  onTag,
}: {
  path: string;
  info: NoteInfo | undefined;
  vaultName: string;
  startEditing: boolean;
  links: MarkdownLinks;
  onSaved: () => void;
  onTag: (tag: string) => void;
}) {
  const [page, setPage] = useState<NotePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<string | null>(null);
  const [savedText, setSavedText] = useState("");
  const [state, setState] = useState<SaveState>("");
  const [conflict, setConflict] = useState<NotePage | null>(null);
  // För logiken i sparningen (läses i händelser och effekter, aldrig under ritningen).
  const base = useRef("");
  const saved = useRef("");
  const latest = useRef<string | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);
  const editOnLoad = useRef(startEditing);

  const setDraft = useCallback((text: string | null) => {
    latest.current = text;
    setDraftState(text);
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(`/api/kunskap/sida?path=${encodeURIComponent(path)}`, { cache: "no-store" });
    if (!response.ok) {
      setError(response.status === 404 ? "Sidan finns inte längre." : "Sidan gick inte att läsa.");
      return;
    }
    const next = (await response.json()) as NotePage;
    setPage(next);
    base.current = next.hash;
    saved.current = normalize(next.text);
    setSavedText(saved.current);
    if (editOnLoad.current) {
      editOnLoad.current = false;
      setDraft(saved.current);
    }
  }, [path, setDraft]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ändrades filen utanför appen medan sidan bara visas: läs den igen.
  const mtime = info?.mtime;
  useEffect(() => {
    if (!page || draft !== null || !mtime || mtime <= page.mtime + 1) return;
    void load();
  }, [mtime, page, draft, load]);

  // Till rubriken i adressen (#rubrik) när sidan har ritats.
  useEffect(() => {
    if (!page) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) document.getElementById(headingId(hash))?.scrollIntoView({ block: "start" });
  }, [page]);

  /** Spara texten. Väntar in en pågående sparning; svarar sant när texten finns på disken. */
  const save = useCallback(
    async (text: string): Promise<boolean> => {
      while (pending.current) await pending.current;
      if (text === saved.current) return true;
      const run = (async () => {
        setState("sparar");
        try {
          const response = await fetch(`/api/kunskap/sida?path=${encodeURIComponent(path)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, hash: base.current }),
          });
          if (response.ok) {
            const next = (await response.json()) as NotePage;
            setPage(next);
            base.current = next.hash;
            saved.current = text;
            setSavedText(text);
            setState("sparat");
            onSaved();
            return true;
          }
          const body = (await response.json().catch(() => ({}))) as { reason?: string; page?: NotePage };
          if (response.status === 409 && body.reason === "konflikt" && body.page) {
            setConflict(body.page);
            setState("konflikt");
          } else setState("fel");
          return false;
        } catch {
          setState("fel");
          return false;
        }
      })();
      pending.current = run;
      try {
        return await run;
      } finally {
        if (pending.current === run) pending.current = null;
      }
    },
    [path, onSaved],
  );

  // Spara av sig själv en stund efter att man slutat skriva.
  useEffect(() => {
    if (draft === null || conflict || draft === savedText) return;
    const timer = window.setTimeout(() => void save(draft), 1200);
    return () => window.clearTimeout(timer);
  }, [draft, conflict, savedText, save]);

  // Lämnar man sidan eller stänger fönstret med osparad text sparas den på vägen ut.
  useEffect(() => {
    const flush = () => {
      const text = latest.current;
      if (text === null || text === saved.current || !base.current) return;
      saved.current = text;
      void fetch(`/api/kunskap/sida?path=${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, hash: base.current }),
        keepalive: text.length < 60_000,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [path]);

  const finish = async () => {
    if (draft === null) return;
    if (await save(draft)) {
      setDraft(null);
      setState("");
    }
  };

  const keys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (draft !== null && !conflict) void save(draft);
    }
  };

  if (error) return <div className={s.notice}>{error}</div>;
  if (!page) return <div className={s.notice}>Läser sidan …</div>;

  const text = draft ?? savedText;
  const { body } = splitFrontmatter(text);
  const { title, rest } = splitTitle(body);
  const tags = info?.tags ?? [];
  const props = Object.entries(page.data).filter(([key]) => key !== "tags" && key !== "tag");
  const crumbs = path.split("/").slice(0, -1);
  const dirty = draft !== null && draft !== savedText;
  const status = conflict ? "Ändrad på disken" : state === "sparar" ? "Sparar …" : dirty ? "Ändrat" : state === "fel" ? "Kunde inte spara" : state === "sparat" ? "Sparat" : "";
  const obsidian = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(path.replace(/\.md$/i, ""))}`;

  return (
    <div className={s.note} data-editing={draft !== null ? "" : undefined}>
      <header className={s.noteHead}>
        <div className={s.crumbs}>{crumbs.length ? crumbs.join(" / ") : vaultName}</div>
        <div className={s.noteActions}>
          {draft === null ? (
            <>
              <span className={s.muted}>Ändrad {formatDate(page.mtime)}</span>
              <button type="button" className={s.action} onClick={() => setDraft(savedText)}>Redigera</button>
              <a className={s.action} href={obsidian}>Öppna i Obsidian</a>
            </>
          ) : (
            <>
              <span className={s.status} data-state={conflict ? "konflikt" : state === "fel" ? "fel" : dirty ? "andrat" : "sparat"} role="status">{status}</span>
              <button type="button" className={s.actionPrimary} onClick={() => void finish()} disabled={Boolean(conflict)}>Klar</button>
            </>
          )}
        </div>
      </header>

      {conflict && draft !== null ? (
        <div className={s.conflict} role="alert">
          <p>Sidan har ändrats på disken sedan du började skriva, i Obsidian eller av en agent. Din text är inte sparad än. Vilken version ska gälla?</p>
          <div className={s.conflictActions}>
            <button type="button" className={s.action} onClick={() => {
              const text = normalize(conflict.text);
              setPage(conflict);
              base.current = conflict.hash;
              saved.current = text;
              setSavedText(text);
              setDraft(text);
              setConflict(null);
              setState("");
            }}>Visa versionen på disken och släpp min text</button>
            <button type="button" className={s.actionPrimary} onClick={() => {
              base.current = conflict.hash;
              setConflict(null);
              void save(draft);
            }}>Spara min text över den</button>
          </div>
        </div>
      ) : null}

      {draft !== null ? (
        <div className={s.editor}>
          <textarea
            className={s.source}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={keys}
            spellCheck
            lang="sv"
            aria-label="Sidans text i markdown"
            autoFocus
          />
          <div className={s.preview} aria-label="Sidan som den blir">
            <Markdown source={body} from={path} links={links} />
          </div>
        </div>
      ) : (
        <article className={s.article}>
          {title ? <Markdown source={title} from={path} links={links} /> : <h1 className={s.title}>{info?.title ?? stemOf(path)}</h1>}
          {tags.length > 0 || props.length > 0 ? (
            <div className={s.meta}>
              {tags.length > 0 ? (
                <p className={s.tags}>
                  {tags.map(tag => (
                    <button key={tag} type="button" onClick={() => onTag(tag)} title="Sök efter taggen">#{tag}</button>
                  ))}
                </p>
              ) : null}
              {props.length > 0 ? (
                <details className={s.props}>
                  <summary>Egenskaper · {props.length}</summary>
                  <dl>
                    {props.map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{show(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
            </div>
          ) : null}
          <Markdown source={rest} from={path} links={links} />
        </article>
      )}
    </div>
  );
}
