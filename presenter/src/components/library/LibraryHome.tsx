"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  applyLibraryOp,
  createFolderId,
  familyIdFor,
  folderPath,
  folderTree,
  folderWithDescendants,
  looksLikeNoise,
  suggestFamilies,
  type Library,
  type LibraryOp,
} from "@/lib/library";
import { updateLibrary } from "@/lib/library-actions";
import type { LibraryDeck } from "@/lib/library.server";
import { daysUntil, searchable } from "@/lib/library-format";
import {
  getLibrarySettings,
  getServerLibrarySettings,
  subscribeLibrarySettings,
  updateLibrarySettings,
  type LibrarySort,
} from "@/lib/library-settings";
import { duplicatePresentation } from "@/lib/presentation-actions";
import { useCoverThumbnails } from "@/components/studio/useDeckThumbnails";
import { DeckDrawer, type VersionItem } from "./DeckDrawer";
import { CleanupDialog, NewDeckDialog, VersionsDialog, type VersionGroup } from "./LibraryDialogs";
import { DeckCard, DeckRow, Menu, NextCard, workspaceHref, type DeckState } from "./LibraryParts";
import styles from "./library.module.css";
import { AppRail, useRailWidth } from "@/components/app/AppRail";

/**
 * Biblioteket — startsidan.
 *
 * Joel 21 september 2026: det ska vara enklare och mer logiskt att hitta sina
 * föreläsningar, och gå att ordna dem i mappar. Nittio deck låg i en platt
 * lista där riktiga föreläsningar blandades med demon, formprov och kopior, och
 * taggarna var för många för att gruppera efter.
 *
 * Sidan svarar på tre frågor i den här ordningen: vad ska jag hålla härnäst,
 * var ligger det jag letar efter, och vad höll jag på med. Mapparna är metadata
 * (content/bibliotek.json) — inga filer flyttas, inga adresser ändras.
 */

export type Scope =
  | { kind: "all" }
  | { kind: "upcoming" }
  | { kind: "pinned" }
  | { kind: "unsorted" }
  | { kind: "archive" }
  | { kind: "folder"; id: string };

interface Props {
  decks: LibraryDeck[];
  initialLibrary: Library;
  initialScope: Scope;
  readOnly: boolean;
  /** Dagens datum enligt servern, "2026-09-21". */
  today: string;
  themes: string[];
}

type MenuState =
  | { kind: "deck"; slug: string; anchor: DOMRect }
  | { kind: "move"; slugs: string[]; anchor: DOMRect; naming?: boolean }
  | { kind: "folder"; id: string; anchor: DOMRect };

const DRAG_THRESHOLD = 6;
const SORT_LABELS: Record<LibrarySort, string> = { changed: "Senast ändrad", date: "Datum", title: "Titel A–Ö" };
const VISIBLE_TAGS = 14;
const NO_STATE: DeckState = { pinned: false, archived: false, folderName: "", versions: 0, current: false, note: "" };

/**
 * Den version som rimligen gäller när Joel inte har sagt något: den senast
 * ändrade. Ligger ändringstiderna inom några minuter från varandra säger de
 * ingenting — så ser det ut efter en `git clone` eller `git pull`, där alla
 * filer får utcheckningens tid — och då avgör namnet: `-v3` går före `-v2`.
 */
function newestOf(decks: LibraryDeck[]): LibraryDeck | undefined {
  const TIE_MS = 5 * 60_000;
  return [...decks].sort((a, b) => {
    const diff = b.updatedAtMs - a.updatedAtMs;
    return Math.abs(diff) > TIE_MS ? diff : b.slug.localeCompare(a.slug);
  })[0];
}

function scopeToQuery(scope: Scope): string {
  if (scope.kind === "folder") return `?mapp=${scope.id}`;
  if (scope.kind === "upcoming") return "?vy=kommande";
  if (scope.kind === "pinned") return "?vy=fasta";
  if (scope.kind === "unsorted") return "?vy=osorterat";
  if (scope.kind === "archive") return "?vy=arkiv";
  return "";
}

export function LibraryHome({ decks, initialLibrary, initialScope, readOnly, today, themes }: Props) {
  const router = useRouter();
  const railWidth = useRailWidth();
  const settings = useSyncExternalStore(subscribeLibrarySettings, getLibrarySettings, getServerLibrarySettings);
  const [library, setLibrary] = useState(initialLibrary);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [anchorSlug, setAnchorSlug] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [folderEdit, setFolderEdit] = useState<{ id: string | null; parent: string | null } | null>(null);
  const [dialog, setDialog] = useState<"new" | "cleanup" | "versions" | null>(null);
  const [cleanupHidden, setCleanupHidden] = useState(false);
  const [versionsHidden, setVersionsHidden] = useState(false);
  const [detailsSlug, setDetailsSlug] = useState<string | null>(null);
  // Anteckningarna kommer med sidan och hålls sedan i takt med det som sparas.
  const [notes, setNotes] = useState<Map<string, string>>(
    () => new Map(decks.filter((deck) => deck.note).map((deck) => [deck.slug, deck.note ?? ""])),
  );
  const [drag, setDrag] = useState<{ slugs: string[]; x: number; y: number; over: string | null } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  // ── Härledda listor ──────────────────────────────────────────────────────
  const folderNames = useMemo(() => new Map(library.folders.map((f) => [f.id, f.name])), [library.folders]);
  // Versioner av samma föreläsning, så som de finns på den här datorn.
  const families = useMemo(() => {
    const map = new Map<string, LibraryDeck[]>();
    for (const deck of decks) {
      const family = library.decks[deck.slug]?.family;
      if (family) map.set(family, [...(map.get(family) ?? []), deck]);
    }
    for (const [family, members] of map) if (members.length < 2) map.delete(family);
    return map;
  }, [decks, library.decks]);

  // En familj visas som ETT kort: den gällande versionen. Är just den arkiverad
  // står den senast ändrade av de övriga för familjen, så att ingenting göms bort.
  const standsBehind = useMemo(() => {
    const hidden = new Set<string>();
    for (const members of families.values()) {
      const alive = members.filter((deck) => !library.decks[deck.slug]?.archived);
      const front = alive.find((deck) => library.decks[deck.slug]?.current) ?? newestOf(alive);
      for (const deck of alive) if (deck !== front) hidden.add(deck.slug);
    }
    return hidden;
  }, [families, library.decks]);

  const states = useMemo(() => {
    const map = new Map<string, DeckState>();
    for (const deck of decks) {
      const entry = library.decks[deck.slug];
      const versions = entry?.family ? (families.get(entry.family)?.length ?? 0) : 0;
      map.set(deck.slug, {
        pinned: entry?.pinned === true,
        archived: entry?.archived === true,
        folderName: entry?.folder ? (folderNames.get(entry.folder) ?? "") : "",
        versions,
        current: versions > 1 && entry?.current === true,
        note: (notes.get(deck.slug) ?? "").split("\n").find((line) => line.trim())?.trim().slice(0, 140) ?? "",
      });
    }
    return map;
  }, [decks, families, folderNames, library.decks, notes]);
  const stateOf = useCallback((slug: string): DeckState => states.get(slug) ?? NO_STATE, [states]);

  const live = useMemo(
    () => decks.filter((deck) => !library.decks[deck.slug]?.archived && !standsBehind.has(deck.slug)),
    [decks, library.decks, standsBehind],
  );

  const upcoming = useMemo(
    () =>
      live
        .map((deck) => ({ deck, days: daysUntil(deck.date, today) }))
        .filter((item): item is { deck: LibraryDeck; days: number } => item.days !== null && item.days >= 0)
        .sort((a, b) => a.days - b.days || a.deck.title.localeCompare(b.deck.title, "sv"))
        .map((item) => item.deck),
    [live, today],
  );

  const counts = useMemo(() => {
    const perFolder = new Map<string, number>();
    let unsorted = 0;
    let pinned = 0;
    for (const deck of live) {
      const entry = library.decks[deck.slug];
      if (entry?.pinned) pinned += 1;
      if (entry?.folder) perFolder.set(entry.folder, (perFolder.get(entry.folder) ?? 0) + 1);
      else unsorted += 1;
    }
    // En mapp räknar med sina undermappar.
    const withChildren = new Map<string, number>();
    for (const folder of library.folders) {
      let total = 0;
      for (const id of folderWithDescendants(library, folder.id)) total += perFolder.get(id) ?? 0;
      withChildren.set(folder.id, total);
    }
    return { folders: withChildren, unsorted, pinned, archived: decks.length - live.length };
  }, [decks.length, library, live]);

  const tags = useMemo(() => {
    const tally = new Map<string, number>();
    for (const deck of live) for (const tag of deck.tags) tally.set(tag, (tally.get(tag) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv"));
  }, [live]);

  const searching = query.trim().length > 0;

  const shown = useMemo(() => {
    let list: LibraryDeck[];
    if (searching) {
      // Sökningen går genom HELA biblioteket, även arkivet: man letar efter något.
      const words = searchable(query).split(" ");
      list = decks.filter((deck) => {
        const hay = searchable([deck.title, deck.slug, deck.event ?? "", deck.description ?? "", deck.tags.join(" ")].join(" "));
        return words.every((word) => hay.includes(word));
      });
    } else if (scope.kind === "upcoming") list = upcoming;
    else if (scope.kind === "pinned") list = live.filter((deck) => library.decks[deck.slug]?.pinned);
    else if (scope.kind === "unsorted") list = live.filter((deck) => !library.decks[deck.slug]?.folder);
    else if (scope.kind === "archive") list = decks.filter((deck) => library.decks[deck.slug]?.archived);
    else if (scope.kind === "folder") {
      const ids = folderWithDescendants(library, scope.id);
      list = live.filter((deck) => ids.has(library.decks[deck.slug]?.folder ?? ""));
    } else list = live;

    if (activeTag) list = list.filter((deck) => deck.tags.includes(activeTag));
    if (!searching && scope.kind === "upcoming") return list;

    const pinnedFirst = (deck: LibraryDeck) => (library.decks[deck.slug]?.pinned ? 0 : 1);
    return [...list].sort((a, b) => {
      if (pinnedFirst(a) !== pinnedFirst(b)) return pinnedFirst(a) - pinnedFirst(b);
      if (settings.sort === "title") return a.title.localeCompare(b.title, "sv");
      if (settings.sort === "date") return (b.date ?? "").localeCompare(a.date ?? "") || b.updatedAtMs - a.updatedAtMs;
      return b.updatedAtMs - a.updatedAtMs;
    });
  }, [activeTag, decks, library, live, query, scope, searching, settings.sort, upcoming]);

  const showNext = !searching && !activeTag && scope.kind === "all" && upcoming.length > 0;
  const nextUp = showNext ? upcoming.slice(0, 3) : [];

  const noise = useMemo(
    () => live.filter((deck) => !library.decks[deck.slug]?.folder && !library.decks[deck.slug]?.pinned && looksLikeNoise(deck.slug)),
    [library.decks, live],
  );
  const showCleanup = !readOnly && !cleanupHidden && !searching && noise.length >= 4 && (scope.kind === "all" || scope.kind === "unsorted");

  const versionGroups = useMemo<VersionGroup[]>(() => {
    const free = live.filter((deck) => !library.decks[deck.slug]?.family);
    const bySlug = new Map(free.map((deck) => [deck.slug, deck]));
    const taken = new Set(families.keys());
    return suggestFamilies(free.map((deck) => deck.slug)).map(({ slugs }) => {
      const members = slugs.map((slug) => bySlug.get(slug)).filter((deck): deck is LibraryDeck => Boolean(deck));
      const family = familyIdFor(slugs, taken);
      taken.add(family);
      return { family, decks: members, current: newestOf(members)?.slug ?? slugs[slugs.length - 1] };
    });
  }, [families, library.decks, live]);
  const showVersionHint = !readOnly && !versionsHidden && !showCleanup && !searching && !activeTag && scope.kind === "all" && versionGroups.length > 0;

  // ── Omslag ───────────────────────────────────────────────────────────────
  const coversOn = settings.covers && settings.view === "cards";
  const isVisible = useCallback((slug: string) => visible.has(slug), [visible]);
  const { thumbs, workers } = useCoverThumbnails({ decks, enabled: settings.covers, isVisible });
  const shownSignature = useMemo(() => shown.map((deck) => deck.slug).join("|"), [shown]);

  useEffect(() => {
    const root = mainRef.current;
    if (!root || !settings.covers) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((current) => {
          let next: Set<string> | null = null;
          for (const entry of entries) {
            const slug = (entry.target as HTMLElement).dataset.cover;
            if (!slug || entry.isIntersecting === current.has(slug)) continue;
            next ??= new Set(current);
            if (entry.isIntersecting) next.add(slug);
            else next.delete(slug);
          }
          return next ?? current;
        });
      },
      { root, rootMargin: "320px 0px" },
    );
    root.querySelectorAll("[data-cover]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [settings.covers, settings.view, shownSignature, showNext]);

  // ── Ändringar ────────────────────────────────────────────────────────────
  const say = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 5000);
  }, []);

  // Ändringen syns direkt; servern skriver filen och svarar med hur den blev.
  // Svaret tillämpas först när inget mer är på väg — annars skulle ett tidigt
  // svar backa en senare ändring som redan syns på skärmen.
  const inFlight = useRef(0);
  const run = useCallback(
    (ops: LibraryOp[]) => {
      if (readOnly) return;
      setLibrary((current) => ops.reduce(applyLibraryOp, current));
      inFlight.current += 1;
      startTransition(async () => {
        const result = await updateLibrary(ops);
        inFlight.current -= 1;
        if (result.ok) {
          if (inFlight.current === 0) setLibrary(result.library);
        } else {
          say(result.error);
          router.refresh();
        }
      });
    },
    [readOnly, router, say],
  );

  const chooseScope = useCallback((next: Scope) => {
    setScope(next);
    setQuery("");
    setSelection(new Set());
    window.history.replaceState({}, "", `${window.location.pathname}${scopeToQuery(next)}`);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  const latest = useRef({ shown, anchorSlug, selection });
  useLayoutEffect(() => {
    latest.current = { shown, anchorSlug, selection };
  }, [anchorSlug, selection, shown]);

  const toggle = useCallback((slug: string, event: MouseEvent) => {
    const order = latest.current.shown.map((deck) => deck.slug);
    const anchor = latest.current.anchorSlug;
    setSelection((current) => {
      const next = new Set(current);
      if (event.shiftKey && anchor && order.includes(anchor)) {
        const [a, b] = [order.indexOf(anchor), order.indexOf(slug)].sort((x, y) => x - y);
        for (const s of order.slice(a, b + 1)) next.add(s);
      } else if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (!event.shiftKey) setAnchorSlug(slug);
  }, []);
  const openDeckMenu = useCallback((slug: string, anchor: DOMRect) => setMenu({ kind: "deck", slug, anchor }), []);

  // ── Dra deck till en mapp ────────────────────────────────────────────────
  const onDeckPointerDown = useCallback(
    (slug: string, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, [data-nodrag]")) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let active = false;
      let slugs: string[] = [];
      const dropAt = (x: number, y: number) =>
        (document.elementFromPoint(x, y)?.closest("[data-drop]") as HTMLElement | null)?.dataset.drop ?? null;

      const onMove = (e: PointerEvent) => {
        if (!active) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
          active = true;
          // Drar man ett markerat deck följer hela markeringen med.
          slugs = latest.current.selection.has(slug) ? [...latest.current.selection] : [slug];
          document.body.style.userSelect = "none";
        }
        setDrag({ slugs, x: e.clientX, y: e.clientY, over: dropAt(e.clientX, e.clientY) });
      };
      const finish = (e: PointerEvent | null) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", cancel);
        document.body.style.userSelect = "";
        if (active) {
          // Klicket som följer på släppet ska inte öppna föreläsningen.
          suppressClick.current = true;
          window.setTimeout(() => (suppressClick.current = false), 0);
          const target = e ? dropAt(e.clientX, e.clientY) : null;
          if (target === "archive") run([{ type: "setArchived", slugs, archived: true }]);
          else if (target === "unsorted") run([{ type: "moveDecks", slugs, folder: null }]);
          else if (target?.startsWith("folder:")) run([{ type: "moveDecks", slugs, folder: target.slice(7) }]);
          if (target) setSelection(new Set());
        }
        setDrag(null);
      };
      const cancel = () => finish(null);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", cancel);
    },
    [run],
  );

  // ── Tangentbord ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "Escape") {
        if (dialog) return;
        if (menu) setMenu(null);
        else if (detailsSlug) setDetailsSlug(null);
        else if (selection.size > 0) setSelection(new Set());
        else if (query) {
          setQuery("");
          searchRef.current?.blur();
        }
        return;
      }
      if (typing || dialog || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n" && !readOnly) {
        event.preventDefault();
        setDialog("new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsSlug, dialog, menu, query, readOnly, selection.size]);

  // ── Mappar ───────────────────────────────────────────────────────────────
  const saveFolder = (value: string) => {
    const name = value.trim();
    const edit = folderEdit;
    setFolderEdit(null);
    if (!edit || !name) return;
    if (edit.id) run([{ type: "renameFolder", id: edit.id, name }]);
    else {
      const id = createFolderId();
      run([{ type: "createFolder", id, name, parent: edit.parent }]);
      chooseScope({ kind: "folder", id });
    }
  };

  const removeFolder = (id: string) => {
    const name = folderNames.get(id) ?? "mappen";
    const inside = counts.folders.get(id) ?? 0;
    const note = inside > 0 ? `\n\n${inside} föreläsningar flyttas upp ett steg. Ingenting raderas.` : "";
    if (!window.confirm(`Ta bort mappen "${name}"?${note}`)) return;
    run([{ type: "deleteFolder", id }]);
    if (scope.kind === "folder" && scope.id === id) chooseScope({ kind: "all" });
  };

  const duplicate = (slug: string) => {
    startTransition(async () => {
      const result = await duplicatePresentation(slug);
      if (result.ok && result.newSlug) {
        const folder = library.decks[slug]?.folder;
        if (folder) await updateLibrary([{ type: "moveDecks", slugs: [result.newSlug], folder }]);
        router.push(workspaceHref(result.newSlug));
      } else say("Kunde inte duplicera föreläsningen.");
    });
  };

  // ── Versioner och anteckningar ───────────────────────────────────────────
  const openDetails = useCallback((slug: string) => {
    setMenu(null);
    setDetailsSlug(slug);
  }, []);

  const noteSaved = useCallback((slug: string, value: string) => {
    setNotes((current) => {
      if ((current.get(slug) ?? "") === value) return current;
      const next = new Map(current);
      if (value) next.set(slug, value);
      else next.delete(slug);
      return next;
    });
  }, []);

  /** Samlar deck som versioner. Finns redan en stjärna bland dem står den kvar; annars får den senast ändrade den. */
  const groupVersions = (slugs: string[]) => {
    const members = decks.filter((deck) => slugs.includes(deck.slug));
    if (members.length < 2) return;
    const starred = members.some((deck) => library.decks[deck.slug]?.family);
    const newest = newestOf(members)?.slug ?? slugs[0];
    run([{ type: "groupVersions", slugs, family: familyIdFor(slugs, new Set(families.keys())), current: starred ? "" : newest }]);
  };

  const removeVersion = (slug: string) => {
    const family = library.decks[slug]?.family;
    const rest = (family ? (families.get(family) ?? []) : []).filter((deck) => deck.slug !== slug);
    const fallback = newestOf(rest)?.slug;
    run([{ type: "ungroupVersions", slugs: [slug], fallback }]);
  };

  const detailsDeck = detailsSlug ? decks.find((deck) => deck.slug === detailsSlug) : undefined;
  const detailsFamily = detailsDeck ? library.decks[detailsDeck.slug]?.family : undefined;
  const detailsVersions: VersionItem[] = (detailsFamily ? (families.get(detailsFamily) ?? []) : [])
    .map((deck) => ({ deck, current: library.decks[deck.slug]?.current === true, archived: library.decks[deck.slug]?.archived === true }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.deck.updatedAtMs - a.deck.updatedAtMs);
  const freeDecks = decks.filter((deck) => !library.decks[deck.slug]?.family && deck.slug !== detailsSlug);
  const detailsSuggestions = detailsDeck
    ? (suggestFamilies([detailsDeck.slug, ...detailsVersions.map((item) => item.deck.slug), ...freeDecks.filter((deck) => !library.decks[deck.slug]?.archived).map((deck) => deck.slug)])
        .find((group) => group.slugs.includes(detailsDeck.slug))
        ?.slugs.map((slug) => freeDecks.find((deck) => deck.slug === slug))
        .filter((deck): deck is LibraryDeck => Boolean(deck)) ?? [])
    : [];

  // ── Rubrik ───────────────────────────────────────────────────────────────
  const path = scope.kind === "folder" ? folderPath(library, scope.id) : [];
  const heading = searching
    ? "Sökresultat"
    : scope.kind === "upcoming" ? "Kommande"
    : scope.kind === "pinned" ? "Fästa"
    : scope.kind === "unsorted" ? "Osorterat"
    : scope.kind === "archive" ? "Arkiv"
    : scope.kind === "folder" ? (path[path.length - 1]?.name ?? "Mapp")
    : "Alla föreläsningar";

  const menuDeck = menu?.kind === "deck" ? decks.find((deck) => deck.slug === menu.slug) : undefined;
  const tree = folderTree(library);
  const shownTags = allTags ? tags : tags.slice(0, VISIBLE_TAGS);
  const itemProps = (deck: LibraryDeck) => ({
    deck,
    state: stateOf(deck.slug),
    today,
    cover: thumbs.get(deck.slug),
    showCover: coversOn,
    selected: selection.has(deck.slug),
    moving: drag?.slugs.includes(deck.slug) ?? false,
    readOnly,
    onToggle: toggle,
    onPointerDown: onDeckPointerDown,
    onMenu: openDeckMenu,
    onDetails: openDetails,
    menuOpen: menu?.kind === "deck" && menu.slug === deck.slug,
  });

  const scopeButton = (target: Scope, label: string, count: number | null, drop?: string, child = false) => {
    const active = !searching && JSON.stringify(scope) === JSON.stringify(target);
    return (
      <button
        type="button"
        className={styles.scope}
        data-active={active ? "" : undefined}
        data-child={child ? "" : undefined}
        data-drop={drop}
        data-over={drop && drag?.over === drop ? "" : undefined}
        onClick={() => chooseScope(target)}
      >
        <span className={styles.scopeName}>{label}</span>
        {count !== null ? <span className={styles.scopeCount}>{count}</span> : null}
      </button>
    );
  };

  const folderInput = (child: boolean, initial: string) => (
    <input
      autoFocus
      className={styles.folderInput}
      data-child={child ? "" : undefined}
      defaultValue={initial}
      placeholder={child ? "Undermappens namn" : "Mappens namn"}
      onBlur={(event) => saveFolder(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          event.currentTarget.value = "";
          event.currentTarget.blur();
        }
      }}
    />
  );

  const folderRow = (id: string, name: string, child: boolean) =>
    folderEdit?.id === id ? (
      <div key={id}>{folderInput(child, name)}</div>
    ) : (
      <div key={id} className={styles.folderRow}>
        {scopeButton({ kind: "folder", id }, name, counts.folders.get(id) ?? 0, `folder:${id}`, child)}
        {!readOnly ? (
          <button
            type="button"
            className={styles.folderMore}
            aria-label={`Val för ${name}`}
            data-open={menu?.kind === "folder" && menu.id === id ? "" : undefined}
            onClick={(event) => setMenu({ kind: "folder", id, anchor: event.currentTarget.getBoundingClientRect() })}
          >
            ⋯
          </button>
        ) : null}
      </div>
    );

  const moveTargets = (slugs: string[], naming: boolean, startNaming: () => void, close: () => void) => (
    <>
      <div className={styles.menuLabel}>Flytta till</div>
      {tree.map((node) => [
        <button key={node.id} type="button" onClick={() => { run([{ type: "moveDecks", slugs, folder: node.id }]); close(); }}>
          {node.name}
        </button>,
        ...node.children.map((sub) => (
          <button key={sub.id} type="button" data-child="" onClick={() => { run([{ type: "moveDecks", slugs, folder: sub.id }]); close(); }}>
            {sub.name}
          </button>
        )),
      ])}
      {tree.length > 0 ? <hr /> : null}
      <button type="button" onClick={() => { run([{ type: "moveDecks", slugs, folder: null }]); close(); }}>
        Osorterat
      </button>
      {naming ? (
        <input
          autoFocus
          className={styles.folderInput}
          placeholder="Den nya mappens namn"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") close();
            if (event.key !== "Enter") return;
            const name = event.currentTarget.value.trim();
            if (name) {
              const id = createFolderId();
              run([{ type: "createFolder", id, name, parent: null }, { type: "moveDecks", slugs, folder: id }]);
            }
            close();
          }}
        />
      ) : (
        <button type="button" onClick={startNaming}>
          Ny mapp …
        </button>
      )}
    </>
  );

  return (
    <div
      className={`${styles.root} verkstad`}
      style={readOnly ? undefined : { paddingLeft: railWidth }}
      data-dragging={drag ? "" : undefined}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {!readOnly ? <AppRail /> : null}
      <header className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Presenter</span>
          <span className={styles.brandSub}>Bibliotek</span>
        </div>
        <div className={styles.search}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20.5 20.5-4.2-4.2" />
          </svg>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sök bland alla föreläsningar — titel, plats, tagg …"
            aria-label="Sök"
          />
          {query ? (
            <button type="button" className={styles.searchClear} aria-label="Rensa sökningen" onClick={() => setQuery("")}>
              ×
            </button>
          ) : (
            <span className={styles.searchKey}>/</span>
          )}
        </div>
        <span className={styles.topSpacer} />
        {!readOnly ? (
          <button type="button" className={styles.primary} onClick={() => setDialog("new")}>
            Ny föreläsning
          </button>
        ) : null}
      </header>

      <nav className={styles.side} aria-label="Bibliotek">
        <div className={styles.sideGroup}>
          {scopeButton({ kind: "all" }, "Alla föreläsningar", live.length)}
          {scopeButton({ kind: "upcoming" }, "Kommande", upcoming.length)}
          {counts.pinned > 0 ? scopeButton({ kind: "pinned" }, "Fästa", counts.pinned) : null}
        </div>

        <div className={styles.sideGroup}>
          <div className={styles.sideHead}>
            Mappar
            {!readOnly ? (
              <button type="button" onClick={() => setFolderEdit({ id: null, parent: null })}>
                + ny
              </button>
            ) : null}
          </div>
          {tree.map((node) => (
            <div key={node.id}>
              {folderRow(node.id, node.name, false)}
              {node.children.map((sub) => folderRow(sub.id, sub.name, true))}
              {folderEdit && folderEdit.id === null && folderEdit.parent === node.id ? folderInput(true, "") : null}
            </div>
          ))}
          {folderEdit && folderEdit.id === null && folderEdit.parent === null ? folderInput(false, "") : null}
          {tree.length === 0 && !folderEdit ? (
            <p className={styles.sideEmpty}>
              Inga mappar än. Skapa en, och dra sedan föreläsningar hit — eller markera flera och välj Flytta.
            </p>
          ) : null}
          {scopeButton({ kind: "unsorted" }, "Osorterat", counts.unsorted, "unsorted")}
          {scopeButton({ kind: "archive" }, "Arkiv", counts.archived, "archive")}
        </div>

        {tags.length > 0 ? (
          <div className={styles.sideGroup}>
            <div className={styles.sideHead}>Taggar</div>
            <div className={styles.tagList}>
              {shownTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.tag}
                  data-active={activeTag === tag ? "" : undefined}
                  title={`${count} föreläsningar`}
                  onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                >
                  {tag}
                </button>
              ))}
              {tags.length > VISIBLE_TAGS ? (
                <button type="button" className={`${styles.tag} ${styles.tagMore}`} onClick={() => setAllTags((v) => !v)}>
                  {allTags ? "färre" : `+ ${tags.length - VISIBLE_TAGS}`}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </nav>

      <main className={styles.main} ref={mainRef}>
        <div className={styles.mainInner}>
          {showNext ? (
            <section>
              <h2 className={styles.sectionLabel}>Näst på tur</h2>
              <div className={styles.next}>
                {nextUp.map((deck, index) => (
                  <NextCard key={deck.slug} deck={deck} today={today} cover={thumbs.get(deck.slug)} showCover={settings.covers} first={index === 0} />
                ))}
              </div>
            </section>
          ) : null}

          <div className={styles.crumbs}>
            <h1 className={styles.crumbTitle}>
              {path.length > 1 ? <span>{path[0].name} / </span> : null}
              {heading}
            </h1>
            <span className={styles.crumbMeta}>
              {shown.length} {shown.length === 1 ? "föreläsning" : "föreläsningar"}
              {searching ? " · i hela biblioteket" : ""}
              {activeTag ? ` · tagg ${activeTag}` : ""}
            </span>
            {activeTag ? (
              <button type="button" className={styles.linkQuiet} onClick={() => setActiveTag(null)}>
                rensa taggen
              </button>
            ) : null}
            <div className={styles.controls}>
              {scope.kind !== "upcoming" || searching ? (
                <select
                  className={styles.select}
                  value={settings.sort}
                  aria-label="Sortering"
                  onChange={(event) => updateLibrarySettings({ sort: event.target.value as LibrarySort })}
                >
                  {(Object.keys(SORT_LABELS) as LibrarySort[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className={styles.segmented} role="group" aria-label="Visning">
                <button type="button" aria-pressed={settings.view === "cards"} onClick={() => updateLibrarySettings({ view: "cards" })}>
                  Kort
                </button>
                <button type="button" aria-pressed={settings.view === "list"} onClick={() => updateLibrarySettings({ view: "list" })}>
                  Lista
                </button>
              </div>
            </div>
          </div>

          {showCleanup ? (
            <div className={styles.suggest}>
              <span>
                <strong>{noise.length} deck</strong> ser ut som demon, formprov eller arbetskopior. Lägg dem i arkivet, så blir det lättare att se föreläsningarna.
              </span>
              <button type="button" className={styles.link} onClick={() => setDialog("cleanup")}>
                Granska och arkivera
              </button>
              <button type="button" className={styles.linkQuiet} onClick={() => setCleanupHidden(true)}>
                inte nu
              </button>
            </div>
          ) : null}

          {showVersionHint ? (
            <div className={styles.suggest}>
              <span>
                <strong>{versionGroups.length} {versionGroups.length === 1 ? "föreläsning" : "föreläsningar"}</strong> ser ut att finnas i flera versioner. Samla dem, och sätt en stjärna på den som gäller — då blir de ett kort var.
              </span>
              <button type="button" className={styles.link} onClick={() => setDialog("versions")}>
                Granska och samla
              </button>
              <button type="button" className={styles.linkQuiet} onClick={() => setVersionsHidden(true)}>
                inte nu
              </button>
            </div>
          ) : null}

          {shown.length === 0 ? (
            <div className={styles.empty}>
              <strong>{searching ? "Inget matchade sökningen." : scope.kind === "folder" ? "Mappen är tom." : "Här finns inget än."}</strong>
              {searching
                ? "Pröva ett annat ord — sökningen går igenom titel, plats, beskrivning, taggar och adress."
                : scope.kind === "folder"
                  ? "Dra föreläsningar hit från listan, eller markera flera och välj Flytta."
                  : scope.kind === "upcoming"
                    ? "Inga föreläsningar har ett datum framåt i tiden."
                    : ""}
            </div>
          ) : settings.view === "cards" ? (
            <div className={styles.grid} data-selecting={selection.size > 0 ? "" : undefined}>
              {shown.map((deck) => (
                <DeckCard key={deck.slug} {...itemProps(deck)} />
              ))}
            </div>
          ) : (
            <div className={styles.table}>
              <div className={`${styles.tr} ${styles.trHead}`}>
                <span />
                <span>Föreläsning</span>
                <span>Sammanhang</span>
                <span>Datum</span>
                <span>Slides</span>
                <span>Mapp</span>
                <span />
              </div>
              {shown.map((deck) => (
                <DeckRow key={deck.slug} {...itemProps(deck)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Menyer ── */}
      {menu?.kind === "deck" && menuDeck ? (
        <Menu anchor={menu.anchor} onClose={() => setMenu(null)}>
          <a href={`/${menuDeck.slug}/presenter`} target={`presenter-${menuDeck.slug}`} onClick={() => setMenu(null)}>
            Presentatörsvy
          </a>
          <a href={`/${menuDeck.slug}/studio`}>Storyboard</a>
          <a href={`/${menuDeck.slug}/studio?mode=manus`}>Manus</a>
          <a href={`/${menuDeck.slug}/edit`}>Slide-editor</a>
          <a href={`/${menuDeck.slug}/dela`}>Delningssida</a>
          <hr />
          <button type="button" onClick={() => openDetails(menuDeck.slug)}>
            Anteckningar och versioner
          </button>
          {!readOnly ? (
            <>
              <hr />
              <button type="button" onClick={() => setMenu({ kind: "move", slugs: [menuDeck.slug], anchor: menu.anchor })}>
                Flytta till …
              </button>
              <button
                type="button"
                onClick={() => {
                  run([{ type: "setPinned", slugs: [menuDeck.slug], pinned: !stateOf(menuDeck.slug).pinned }]);
                  setMenu(null);
                }}
              >
                {stateOf(menuDeck.slug).pinned ? "Lossa" : "Fäst överst"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(null);
                  duplicate(menuDeck.slug);
                }}
              >
                Duplicera
              </button>
              <button
                type="button"
                onClick={() => {
                  run([{ type: "setArchived", slugs: [menuDeck.slug], archived: !stateOf(menuDeck.slug).archived }]);
                  setMenu(null);
                }}
              >
                {stateOf(menuDeck.slug).archived ? "Ta tillbaka från arkivet" : "Arkivera"}
              </button>
            </>
          ) : null}
        </Menu>
      ) : null}

      {menu?.kind === "move" ? (
        <Menu anchor={menu.anchor} onClose={() => setMenu(null)}>
          {moveTargets(
            menu.slugs,
            menu.naming === true,
            () => setMenu({ ...menu, naming: true }),
            () => {
              setMenu(null);
              setSelection(new Set());
            },
          )}
        </Menu>
      ) : null}

      {menu?.kind === "folder" ? (
        <Menu anchor={menu.anchor} onClose={() => setMenu(null)} align="left">
          <button type="button" onClick={() => { setFolderEdit({ id: menu.id, parent: null }); setMenu(null); }}>
            Döp om
          </button>
          {!library.folders.find((f) => f.id === menu.id)?.parent ? (
            <button type="button" onClick={() => { setFolderEdit({ id: null, parent: menu.id }); setMenu(null); }}>
              Ny undermapp
            </button>
          ) : null}
          <button type="button" onClick={() => { run([{ type: "moveFolder", id: menu.id, direction: -1 }]); setMenu(null); }}>
            Flytta upp
          </button>
          <button type="button" onClick={() => { run([{ type: "moveFolder", id: menu.id, direction: 1 }]); setMenu(null); }}>
            Flytta ner
          </button>
          <hr />
          <button type="button" data-danger="" onClick={() => { const id = menu.id; setMenu(null); removeFolder(id); }}>
            Ta bort mappen
          </button>
        </Menu>
      ) : null}

      {/* ── Flerval ── */}
      {selection.size > 0 && !readOnly ? (
        <div className={styles.bar} role="toolbar" aria-label="Markerade föreläsningar">
          <strong>{selection.size} valda</strong>
          <button type="button" onClick={(event) => setMenu({ kind: "move", slugs: [...selection], anchor: event.currentTarget.getBoundingClientRect() })}>
            Flytta till …
          </button>
          {selection.size > 1 ? (
            <button
              type="button"
              title="De markerade är versioner av samma föreläsning — visa dem som ett kort"
              onClick={() => {
                groupVersions([...selection]);
                setSelection(new Set());
              }}
            >
              Samla som versioner
            </button>
          ) : null}
          <button type="button" onClick={() => { run([{ type: "setPinned", slugs: [...selection], pinned: true }]); setSelection(new Set()); }}>
            Fäst
          </button>
          <button
            type="button"
            onClick={() => {
              run([{ type: "setArchived", slugs: [...selection], archived: scope.kind !== "archive" }]);
              setSelection(new Set());
            }}
          >
            {scope.kind === "archive" ? "Ta tillbaka" : "Arkivera"}
          </button>
          <button type="button" onClick={() => setSelection(new Set(shown.map((deck) => deck.slug)))}>
            Markera alla
          </button>
          <button type="button" onClick={() => setSelection(new Set())}>
            Avmarkera
          </button>
        </div>
      ) : null}

      {drag ? (
        <div className={styles.ghost} style={{ transform: `translate(${drag.x + 14}px, ${drag.y + 12}px)` }}>
          {drag.slugs.length === 1 ? (decks.find((deck) => deck.slug === drag.slugs[0])?.title ?? "") : `${drag.slugs.length} föreläsningar`}
        </div>
      ) : null}
      {flash ? <div className={styles.flash} role="alert">{flash}</div> : null}

      {dialog === "new" ? (
        <NewDeckDialog
          library={library}
          themes={themes}
          defaultFolder={scope.kind === "folder" ? scope.id : null}
          onClose={() => setDialog(null)}
          onCreated={(slug, folder) => {
            startTransition(async () => {
              if (folder) await updateLibrary([{ type: "moveDecks", slugs: [slug], folder }]);
              router.push(workspaceHref(slug));
            });
          }}
        />
      ) : null}
      {detailsDeck ? (
        <DeckDrawer
          deck={detailsDeck}
          state={stateOf(detailsDeck.slug)}
          today={today}
          cover={thumbs.get(detailsDeck.slug)}
          note={notes.get(detailsDeck.slug) ?? ""}
          readOnly={readOnly}
          versions={detailsVersions}
          suggestions={detailsSuggestions}
          candidates={freeDecks}
          onClose={() => setDetailsSlug(null)}
          onNoteSaved={noteSaved}
          onSetCurrent={(slug) => run([{ type: "setCurrent", slug }])}
          onAddVersions={(slugs) => groupVersions([detailsDeck.slug, ...slugs])}
          onRemoveVersion={removeVersion}
          onShowDeck={setDetailsSlug}
        />
      ) : null}
      {dialog === "versions" ? (
        <VersionsDialog
          groups={versionGroups}
          onClose={() => setDialog(null)}
          onApply={(chosen) => {
            run(chosen.map((group) => ({ type: "groupVersions" as const, slugs: group.slugs, family: group.family, current: group.current })));
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "cleanup" ? (
        <CleanupDialog
          decks={noise}
          onClose={() => setDialog(null)}
          onArchive={(slugs) => {
            run([{ type: "setArchived", slugs, archived: true }]);
            setDialog(null);
          }}
        />
      ) : null}
      {workers}
    </div>
  );
}
