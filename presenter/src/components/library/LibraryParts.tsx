"use client";

import Link from "next/link";
import { memo, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { LibraryDeck } from "@/lib/library.server";
import { changedLabel, daysUntil, formatDate, untilLabel } from "@/lib/library-format";
import styles from "./library.module.css";

/** Föreläsningens arbetsyta: översikten är navet man landar i från biblioteket. */
export const workspaceHref = (slug: string) => `/${slug}/studio?mode=oversikt`;

export interface DeckState {
  pinned: boolean;
  archived: boolean;
  folderName: string;
  /** Antal versioner i familjen (0 = står ensam). */
  versions: number;
  /** Stjärnan: den här versionen gäller. */
  current: boolean;
  /** Första raden i anteckningarna, tom om det inte finns några. */
  note: string;
}

interface DeckItemProps {
  deck: LibraryDeck;
  state: DeckState;
  today: string;
  cover?: string;
  showCover: boolean;
  selected: boolean;
  moving: boolean;
  readOnly: boolean;
  onToggle: (slug: string, event: MouseEvent) => void;
  onPointerDown: (slug: string, event: PointerEvent<HTMLElement>) => void;
  onMenu: (slug: string, anchor: DOMRect) => void;
  /** Öppnar sidopanelen med anteckningar och versioner. */
  onDetails: (slug: string) => void;
  menuOpen: boolean;
}

function metaLine(deck: LibraryDeck, today: string): string {
  return [formatDate(deck.date, today), deck.slideCount ? `${deck.slideCount} slides` : "", changedLabel(deck.updatedAtMs, today)]
    .filter(Boolean)
    .join(" · ");
}

function soonLabel(deck: LibraryDeck, state: DeckState, today: string): string {
  if (state.archived) return "";
  const days = daysUntil(deck.date, today);
  return days !== null && days >= 0 && days <= 14 ? untilLabel(days) : "";
}

/** Ctrl/Cmd- eller Skift-klick markerar i stället för att öppna. */
function selectInstead(event: MouseEvent, slug: string, onToggle: DeckItemProps["onToggle"]): boolean {
  if (!(event.metaKey || event.ctrlKey || event.shiftKey)) return false;
  event.preventDefault();
  onToggle(slug, event);
  return true;
}

function DeckCardInner({ deck, state, today, cover, showCover, selected, moving, readOnly, onToggle, onPointerDown, onMenu, onDetails, menuOpen }: DeckItemProps) {
  const soon = soonLabel(deck, state, today);
  return (
    <article
      className={styles.card}
      data-selected={selected ? "" : undefined}
      data-archived={state.archived ? "" : undefined}
      data-moving={moving ? "" : undefined}
      onPointerDown={readOnly ? undefined : (event) => onPointerDown(deck.slug, event)}
    >
      {!readOnly ? (
        <button
          type="button"
          className={styles.check}
          aria-label={selected ? "Avmarkera" : "Markera"}
          aria-pressed={selected}
          data-nodrag=""
          onClick={(event) => onToggle(deck.slug, event)}
        >
          ✓
        </button>
      ) : null}
      <span className={styles.badges}>
        {soon ? <span className={styles.badge} data-kind="soon">{soon}</span> : null}
        {state.versions > 1 && state.current ? (
          <button type="button" className={styles.versionChip} data-nodrag="" title="Den här versionen gäller — visa alla versioner" onClick={() => onDetails(deck.slug)}>
            ★ {state.versions} versioner
          </button>
        ) : null}
        {state.versions > 1 && !state.current ? <span className={styles.badge} data-kind="older">annan version</span> : null}
        {state.pinned ? <span className={styles.badge}>fäst</span> : null}
        {state.archived ? <span className={styles.badge}>arkiverad</span> : null}
        {deck.shared?.landing ? (
          <a className={styles.badge} href={deck.shared.landing} target="_blank" rel="noreferrer" data-nodrag="" title="Öppna den delade sidan på here.now">
            delad ↗
          </a>
        ) : null}
      </span>
      <Link
        prefetch={false}
        href={workspaceHref(deck.slug)}
        className={styles.cover}
        data-cover={showCover ? deck.slug : undefined}
        data-waiting={showCover && !cover ? "" : undefined}
        draggable={false}
        tabIndex={-1}
        aria-hidden
        onClick={(event) => selectInstead(event, deck.slug, onToggle)}
      >
        {cover ? (
          // Blob-url ur miniatyrcachen — next/image kan inte optimera den.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" draggable={false} />
        ) : !showCover ? (
          <span className={styles.coverTitle}>{deck.title}</span>
        ) : null}
      </Link>
      <Link
        prefetch={false}
        href={workspaceHref(deck.slug)}
        className={styles.cardText}
        draggable={false}
        onClick={(event) => selectInstead(event, deck.slug, onToggle)}
      >
        <span className={styles.cardTitle}>{deck.title}</span>
        <span className={styles.cardEvent}>{deck.event || " "}</span>
        <span className={styles.cardMeta}>{metaLine(deck, today)}</span>
        <span className={styles.cardSlug}>/{deck.slug}</span>
      </Link>
      <div className={styles.cardActions} data-nodrag="">
        <Link prefetch={false} href={`/${deck.slug}`} className={`${styles.act} ${styles.actPlay}`} draggable={false}>
          ▶ Presentera
        </Link>
        <Link prefetch={false} href={workspaceHref(deck.slug)} className={styles.act} draggable={false}>
          Öppna
        </Link>
        <button
          type="button"
          className={styles.noteButton}
          data-has={state.note ? "" : undefined}
          aria-label="Anteckningar och versioner"
          title={state.note || "Anteckningar och versioner"}
          onClick={() => onDetails(deck.slug)}
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.more}
          aria-label="Fler val"
          data-open={menuOpen ? "" : undefined}
          onClick={(event) => onMenu(deck.slug, event.currentTarget.getBoundingClientRect())}
        >
          ⋯
        </button>
      </div>
    </article>
  );
}
export const DeckCard = memo(DeckCardInner);

function DeckRowInner({ deck, state, today, selected, moving, readOnly, onToggle, onPointerDown, onMenu, onDetails, menuOpen }: DeckItemProps) {
  const soon = soonLabel(deck, state, today);
  return (
    <div
      className={styles.tr}
      data-selected={selected ? "" : undefined}
      data-archived={state.archived ? "" : undefined}
      data-moving={moving ? "" : undefined}
      onPointerDown={readOnly ? undefined : (event) => onPointerDown(deck.slug, event)}
    >
      {!readOnly ? (
        <button
          type="button"
          className={`${styles.check} ${styles.trCheck}`}
          aria-label={selected ? "Avmarkera" : "Markera"}
          aria-pressed={selected}
          data-nodrag=""
          data-on={selected ? "" : undefined}
          onClick={(event) => onToggle(deck.slug, event)}
        >
          ✓
        </button>
      ) : (
        <span />
      )}
      <Link
        prefetch={false}
        href={workspaceHref(deck.slug)}
        className={styles.trTitle}
        draggable={false}
        onClick={(event) => selectInstead(event, deck.slug, onToggle)}
      >
        {state.pinned ? <span className={styles.pin}>●</span> : null}
        {state.versions > 1 && state.current ? <span className={styles.trStar} title={`Gäller · ${state.versions} versioner`}>★</span> : null}
        {deck.title}
        <span className={styles.trSlug}>/{deck.slug}</span>
      </Link>
      <span className={styles.trEvent}>{deck.event}</span>
      <span className={styles.trNum}>{soon || formatDate(deck.date, today)}</span>
      <span className={styles.trNum}>{deck.slideCount || ""}</span>
      <span className={styles.trFolder}>{state.archived ? "Arkiv" : state.folderName}</span>
      <span className={styles.trActions} data-nodrag="">
        <Link prefetch={false} href={`/${deck.slug}`} className={`${styles.act} ${styles.actPlay}`} draggable={false}>
          ▶
        </Link>
        <Link prefetch={false} href={workspaceHref(deck.slug)} className={styles.act} draggable={false}>
          Öppna
        </Link>
        <button
          type="button"
          className={styles.noteButton}
          data-has={state.note ? "" : undefined}
          aria-label="Anteckningar och versioner"
          title={state.note || "Anteckningar och versioner"}
          onClick={() => onDetails(deck.slug)}
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.more}
          aria-label="Fler val"
          data-open={menuOpen ? "" : undefined}
          onClick={(event) => onMenu(deck.slug, event.currentTarget.getBoundingClientRect())}
        >
          ⋯
        </button>
      </span>
    </div>
  );
}
export const DeckRow = memo(DeckRowInner);

export function NextCard({ deck, today, cover, showCover, first }: { deck: LibraryDeck; today: string; cover?: string; showCover: boolean; first: boolean }) {
  const days = daysUntil(deck.date, today) ?? 0;
  return (
    <article className={styles.nextCard} data-first={first ? "" : undefined}>
      <Link
        prefetch={false}
        href={workspaceHref(deck.slug)}
        className={styles.cover}
        style={{ borderRadius: "0.5rem" }}
        data-cover={showCover ? deck.slug : undefined}
        data-waiting={showCover && !cover ? "" : undefined}
        tabIndex={-1}
        aria-hidden
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" draggable={false} />
        ) : null}
      </Link>
      <div style={{ minWidth: 0 }}>
        <div className={styles.nextWhen}>
          {untilLabel(days)} · {formatDate(deck.date, today)}
        </div>
        <Link prefetch={false} href={workspaceHref(deck.slug)} className={styles.nextTitle}>
          {deck.title}
        </Link>
        <div className={styles.nextEvent}>{deck.event}</div>
        <div className={styles.nextActions}>
          <Link prefetch={false} href={`/${deck.slug}`} className={`${styles.act} ${styles.actPlay}`}>
            ▶ Presentera
          </Link>
          <Link prefetch={false} href={`/${deck.slug}/presenter`} className={styles.act} target={`presenter-${deck.slug}`}>
            Presentatörsvy
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * En meny som öppnas vid sin knapp. Den ligger `fixed` så att den inte klipps
 * av rullande ytor, och flyttar in sig själv om den skulle hamna utanför fönstret.
 */
export function Menu({ anchor, onClose, children, align = "right" }: { anchor: DOMRect; onClose: () => void; children: ReactNode; align?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = align === "right" ? anchor.right - width : anchor.left;
    const below = anchor.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, anchor.top - height - 6) : below;
    // Mäts efter första utritningen — menyn måste finnas i DOM för att kunna mätas.
    setPosition({ top, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  }, [align, anchor]);

  return (
    <>
      <div className={styles.scrim} onPointerDown={onClose} />
      <div
        ref={ref}
        className={styles.menu}
        role="menu"
        style={position ? position : { top: anchor.bottom + 6, left: anchor.left, visibility: "hidden" }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        {children}
      </div>
    </>
  );
}
