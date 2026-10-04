"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import {
  getRailState,
  getServerRailState,
  getServerWorkshopForm,
  getWorkshopForm,
  setRailState,
  setWorkshopForm,
  subscribeRailState,
  subscribeWorkshopForm,
} from "@/lib/workshop-settings";

/**
 * Appmenyn — sidomenyn som finns i alla verkstadens vyer.
 *
 * Joel (22 september 2026): "eftersom det är en app behöver vi en meny, en
 * sidomeny med ikoner så att det är lätt att hoppa mellan appens delar".
 * Tidigare låg lägesknapparna i varje vys egen verktygsrad, på olika ställen
 * och i olika form. Här står de alltid på samma plats: biblioteket överst,
 * sedan det öppna deckets lägen, längst ner inställningar.
 *
 * Menyn är fast till vänster (56 px ihopfälld, 216 px utfälld) och sidan som
 * bär den lägger motsvarande utrymme till vänster — se useRailWidth. Spelaren
 * och de publika sidorna har den inte.
 */

export type DeckMode = "oversikt" | "storyboard" | "manus" | "editor";

export interface RailDeck {
  slug: string;
  title: string;
  mode: DeckMode;
  onMode: (mode: DeckMode) => void;
  onPresent: () => void;
  /**
   * Lägg till efter den aktuella sliden: ur mallarna, färdiga slides från en
   * annan föreläsning, en kopia av sliden, eller en ny tanke (utkast).
   */
  onAdd?: {
    gallery: () => void;
    import: () => void;
    duplicate: () => void;
    draft: () => void;
  };
  /** Sparar och går till biblioteket. */
  onLibrary: () => void;
  /** Sparar och går till deckets delningssida. */
  onShare: () => void;
}

export const RAIL_WIDTH = 56;
export const RAIL_WIDTH_EXPANDED = 216;

/** Bredden sidan ska lämna åt menyn — följer ihopfälld/utfälld. */
export function useRailWidth(): number {
  const state = useSyncExternalStore(subscribeRailState, getRailState, getServerRailState);
  return state === "utfalld" ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH;
}

interface AppRailProps {
  deck?: RailDeck | null;
  /** Vilken av appens delar som är öppen när inget deck är det. */
  current?: "bibliotek" | "kunskap";
}

export function AppRail({ deck = null, current = "bibliotek" }: AppRailProps) {
  const railState = useSyncExternalStore(subscribeRailState, getRailState, getServerRailState);
  const form = useSyncExternalStore(subscribeWorkshopForm, getWorkshopForm, getServerWorkshopForm);
  const expanded = railState === "utfalld";
  const [help, setHelp] = useState(false);
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  // "?" öppnar tangenthjälpen från vilken vy som helst — utom när man skriver.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      setHelp((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav className="app-rail" data-expanded={expanded ? "" : undefined} aria-label="Appens delar">
        <Link href="/" className="app-rail__brand" title="Presenter — biblioteket" onClick={deck ? (e) => { e.preventDefault(); deck.onLibrary(); } : undefined}>
          <span className="app-rail__mark" aria-hidden>P</span>
          {expanded ? <span className="app-rail__brandName">Presenter</span> : null}
        </Link>

        <div className="app-rail__group app-rail__group--first">
          {deck ? (
            <RailButton label="Biblioteket" onClick={deck.onLibrary} icon={<IconLibrary />} />
          ) : (
            <RailLink label="Biblioteket" href="/" active={current === "bibliotek"} icon={<IconLibrary />} />
          )}
          {/* Från ett öppet deck i ett eget fönster, så att studion och dess osparade ändringar står kvar. */}
          <RailLink label="Kunskapsbanken" href="/kunskap" active={!deck && current === "kunskap"} target={deck ? "kunskap" : undefined} icon={<IconKnowledge />} />
        </div>

        {deck ? (
          <div className="app-rail__group">
            <div className="app-rail__deckName" title={deck.title}>
              {deck.title}
            </div>
            <RailButton label="Översikt" active={deck.mode === "oversikt"} onClick={() => deck.onMode("oversikt")} icon={<IconOverview />} />
            <RailButton label="Storyboard" active={deck.mode === "storyboard"} onClick={() => deck.onMode("storyboard")} icon={<IconStoryboard />} />
            <RailButton label="Manus" active={deck.mode === "manus"} onClick={() => deck.onMode("manus")} icon={<IconManus />} />
            <RailButton label="Slide-editor" active={deck.mode === "editor"} onClick={() => deck.onMode("editor")} icon={<IconEditor />} />
            {deck.onAdd ? (
              <RailButton label="Lägg till slide" onClick={() => setAdding((open) => !open)} icon={<IconGallery />} buttonRef={addRef} active={adding} />
            ) : null}
          </div>
        ) : null}

        {deck ? (
          <div className="app-rail__group">
            <RailButton label="Presentera" primary onClick={deck.onPresent} icon={<IconPlay />} />
            <RailLink label="Presentatörsvy" href={`/${deck.slug}/presenter`} target={`presenter-${deck.slug}`} icon={<IconPresenter />} />
            <RailLink label="Inspelningar" href={`/${deck.slug}/inspelningar`} target={`inspelningar-${deck.slug}`} icon={<IconRecord />} />
            <RailButton label="Dela" onClick={deck.onShare} icon={<IconShare />} />
          </div>
        ) : null}

        <div className="app-rail__spacer" />

        <div className="app-rail__group">
          <RailButton
            label={form === "ljus" ? "Mörk verkstad" : "Ljus verkstad"}
            onClick={() => setWorkshopForm(form === "ljus" ? "mork" : "ljus")}
            icon={form === "ljus" ? <IconMoon /> : <IconSun />}
          />
          <RailButton label="Tangenter" kbd="?" onClick={() => setHelp(true)} icon={<IconKeys />} />
          <RailButton
            label={expanded ? "Fäll ihop menyn" : "Fäll ut menyn"}
            onClick={() => setRailState(expanded ? "ihopfalld" : "utfalld")}
            icon={expanded ? <IconCollapse /> : <IconExpand />}
          />
        </div>
      </nav>
      {help ? <ShortcutHelp onClose={() => setHelp(false)} inDeck={Boolean(deck)} /> : null}
      {adding && deck?.onAdd ? <AddMenu anchorRef={addRef} actions={deck.onAdd} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

/* ── Knappar ─────────────────────────────────────────────────────────────── */

function RailButton({
  label,
  icon,
  onClick,
  active,
  primary,
  kbd,
  buttonRef,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
  kbd?: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`app-rail__item${primary ? " app-rail__item--primary" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
      <span className="app-rail__label">{label}</span>
      {kbd ? <span className="app-rail__kbd">{kbd}</span> : null}
    </button>
  );
}

function RailLink({
  label,
  icon,
  href,
  active,
  target,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  active?: boolean;
  target?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      target={target}
      className="app-rail__item"
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {icon}
      <span className="app-rail__label">{label}</span>
    </Link>
  );
}

/* ── Lägg till ───────────────────────────────────────────────────────────── */

const ADD_CHOICES: { key: "gallery" | "import" | "duplicate" | "draft"; title: string; text: string }[] = [
  { key: "gallery", title: "Ur mallarna …", text: "Välj form i galleriet — tom, eller som ett exempel ur dina föreläsningar." },
  { key: "import", title: "Från en annan föreläsning …", text: "Hämta färdiga slides med sitt manus. Sök eller bläddra." },
  { key: "duplicate", title: "Kopiera den här sliden", text: "En kopia direkt efter, att göra om." },
  { key: "draft", title: "Ny tanke (utkast)", text: "Bara syftet och orden. Formen väljer du sen." },
];

/**
 * Menyns Lägg till: alla sätt att få in en ny slide, på samma plats i alla
 * lägen. Allt hamnar efter sliden man står på.
 */
function AddMenu({
  anchorRef,
  actions,
  onClose,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  actions: NonNullable<RailDeck["onAdd"]>;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - 330));
    // Mäts en gång när menyn öppnas; en rendering till med rätt plats.
    const frame = requestAnimationFrame(() => setPosition({ left: rect.right + 10, top }));
    return () => cancelAnimationFrame(frame);
  }, [anchorRef]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [anchorRef, onClose]);
  return (
    <div
      ref={panelRef}
      className="app-rail-menu"
      role="menu"
      aria-label="Lägg till slide"
      style={position ? { left: position.left, top: position.top } : { visibility: "hidden" }}
    >
      <div className="app-rail-menu__head">Lägg till efter den här sliden</div>
      {ADD_CHOICES.map((choice) => (
        <button
          key={choice.key}
          type="button"
          role="menuitem"
          className="app-rail-menu__item"
          onClick={() => {
            onClose();
            actions[choice.key]();
          }}
        >
          <span className="app-rail-menu__title">{choice.title}</span>
          <span className="app-rail-menu__text">{choice.text}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Tangenthjälpen ──────────────────────────────────────────────────────── */

const HELP: { title: string; keys: [string, string][]; deckOnly?: boolean }[] = [
  {
    title: "Överallt",
    keys: [
      ["?", "den här hjälpen"],
      ["Ctrl+Z / Ctrl+Skift+Z", "ångra / gör om"],
      ["/", "sök i biblioteket"],
    ],
  },
  {
    title: "Översikt",
    deckOnly: true,
    keys: [
      ["↑ / ↓ · Alt+↑ / ↓", "välj rad · flytta sliden"],
      ["Enter · Skift+Enter", "skriv syftet · öppna i editorn"],
      ["N / K / M", "ny tanke · ur mallarna · byt mall"],
      ["H / Delete", "dölj · ta bort"],
      ["+ / −", "större eller mindre bilder"],
    ],
  },
  {
    title: "Slide-editor",
    deckOnly: true,
    keys: [
      ["Klick på text i sliden", "skriv direkt (Ta bort i rutan tar bort delen)"],
      ["J / K, ↑ / ↓", "nästa / föregående slide"],
      ["← / →", "klicksteg i förhandsvisningen"],
      ["Siffrorna under duken", "hoppa över ett klicksteg · Visa allt direkt"],
      ["N", "slidenavigator"],
      ["E / D / O", "panelens flikar: fält, design, objekt"],
      ["I", "inline-redigering på/av"],
      ["R", "tillbaka till presentationen (inbäddad)"],
      ["Ctrl+V", "klistra in bild eller text som objekt"],
    ],
  },
  {
    title: "Objekt på duken",
    deckOnly: true,
    keys: [
      ["Klick · Skift+klick · dra", "markera ett, flera, med ram"],
      ["Piltangenter", "knuffa (Skift: mer)"],
      ["Enter / dubbelklick", "skriv i textrutan · beskär bilden"],
      ["Delete", "ta bort"],
      ["Ctrl+D", "duplicera"],
      ["Ctrl+C / X / V", "kopiera, klipp ut, klistra in"],
      ["Ctrl+] / Ctrl+[", "ordning (Skift: överst/underst)"],
      ["Ctrl+G / Ctrl+Skift+G", "gruppera / dela upp"],
      ["Skift vid drag", "lås axel · fri proportion"],
      ["Alt vid drag", "utan snäpp"],
    ],
  },
  {
    title: "Spelaren",
    deckOnly: true,
    keys: [
      ["Mellanslag, → / ←", "nästa / föregående steg"],
      ["F", "fullskärm"],
      ["M", "meny"],
      ["T", "byt tema"],
      ["Shift+T", "deckets eget tema"],
      ["R", "redigera sliden"],
    ],
  },
];

function ShortcutHelp({ onClose, inDeck }: { onClose: () => void; inDeck: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="app-rail-help" role="dialog" aria-modal="true" aria-label="Tangenter" onClick={onClose}>
      <div className="app-rail-help__panel" onClick={(e) => e.stopPropagation()}>
        <div className="app-rail-help__head">
          <h2>Tangenter</h2>
          <button type="button" className="app-rail-help__close" onClick={onClose}>
            Stäng (Esc)
          </button>
        </div>
        <div className="app-rail-help__grid">
          {HELP.filter((section) => inDeck || !section.deckOnly).map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <dl>
                {section.keys.map(([key, what]) => (
                  <div key={key} style={{ display: "contents" }}>
                    <dt>{key}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ikoner (streckade, 20 px) ───────────────────────────────────────────── */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function IconLibrary() {
  return (
    <Icon>
      <path d="M4 5.5h4v14H4zM10 5.5h4v14h-4z" />
      <path d="m15.8 6.2 3.8-1 3.4 13.1-3.8 1z" />
    </Icon>
  );
}
function IconKnowledge() {
  return (
    <Icon>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="17.5" cy="5.5" r="2.2" />
      <circle cx="12" cy="13" r="2.4" />
      <circle cx="6.5" cy="18.5" r="2.2" />
      <circle cx="18" cy="17.5" r="2.2" />
      <path d="m7.8 8.4 2.6 2.9M15.9 7 13.4 11M10.3 14.6l-2.5 2.6M14 14.2l2.3 1.9" />
    </Icon>
  );
}
function IconOverview() {
  return (
    <Icon>
      <path d="M5 6.5h2M10 6.5h9M5 12h2M10 12h9M5 17.5h2M10 17.5h9" />
    </Icon>
  );
}
function IconStoryboard() {
  return (
    <Icon>
      <rect x="4" y="5" width="6.5" height="6" rx="1" />
      <rect x="13.5" y="5" width="6.5" height="6" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6" rx="1" />
    </Icon>
  );
}
function IconManus() {
  return (
    <Icon>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
    </Icon>
  );
}
function IconEditor() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" />
      <path d="M8.5 20.5h7" />
      <path d="m9 13.5 5.2-5.2 1.8 1.8-5.2 5.2H9z" />
    </Icon>
  );
}
function IconGallery() {
  return (
    <Icon>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Icon>
  );
}
function IconPlay() {
  return (
    <Icon>
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
    </Icon>
  );
}
function IconRecord() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}
function IconPresenter() {
  return (
    <Icon>
      <rect x="3" y="4.5" width="18" height="11" rx="1.5" />
      <path d="M12 15.5v4M8.5 19.5h7M7 8.5h6M7 11.5h4" />
    </Icon>
  );
}
function IconShare() {
  return (
    <Icon>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5" />
    </Icon>
  );
}
function IconSun() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </Icon>
  );
}
function IconMoon() {
  return (
    <Icon>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
    </Icon>
  );
}
function IconKeys() {
  return (
    <Icon>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <path d="M7 10h1M11 10h1M15 10h1M7 14h10" />
    </Icon>
  );
}
function IconExpand() {
  return (
    <Icon>
      <path d="M5 6h14M5 12h14M5 18h14" />
    </Icon>
  );
}
function IconCollapse() {
  return (
    <Icon>
      <path d="m14 7-5 5 5 5" />
    </Icon>
  );
}
