"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import type { ParsedPresentation, ParsedComponent } from "@/lib/mdx-parser";
import { insertSlidesAfter, deleteSlideAt } from "@/lib/deck-operations";
import { createSlideId } from "@/lib/slide-ids";
import { getTemplateSchemaOrFallback } from "@/lib/template-schemas";
import type { SlideMeta } from "@/lib/extract-slide-types";
import type { AuthoringSaveStatus } from "@/lib/authoring-types";
import {
  LAYERS,
  getLayers,
  getServerLayers,
  subscribeLayers,
  toggleLayer,
  type LayerState,
} from "@/lib/manus-layers";

/**
 * ManusWorkspace — planeringslagret som löpande dokument.
 *
 * Storyboarden visar byggda slides som miniatyrer. Editorn redigerar en slide
 * i taget. Ingen av dem låter dig läsa hela föreläsningen som en text — och
 * det är just det man behöver när man ska avgöra om bågen håller.
 *
 * Vyn har två upplösningar, och det är hela poängen:
 *   ÖVERSIKT — alla slides som täta rader. Hela passet på ett par skärmar.
 *   DETALJ   — klicka en rad, den fälls ut till full ritning med alla fält.
 *
 * Översiktsraden visar alltid TEXTEN SOM SKA STÅ PÅ SLIDEN — det är den man
 * scannar efter. Syfte och manus är lager ovanpå: knapparna i headern lägger
 * till en rad var under varje slide, för hela decket samtidigt. Med MANUS på
 * blir listan en genomläsbar manusversion av passet; med den av är den en tät
 * översikt. Valet ligger kvar i localStorage, eftersom man växlar mellan de
 * två lägena flera gånger under ett arbetspass.
 *
 * Presentern sätter `overflow: hidden` på html och body (den är en
 * helskärmsapp), så den här vyn måste äga sin egen scroll. Därav
 * `h-screen overflow-y-auto` på roten i stället för sidscroll.
 */

interface ManusWorkspaceProps {
  slug: string;
  title: string;
  parsed: ParsedPresentation;
  updateParsed: Dispatch<SetStateAction<ParsedPresentation>>;
  slideMetas: SlideMeta[];
  notes: (string | null)[];
  onOpenEditor: (index: number) => void;
  onOpenStoryboard: () => void;
  /** Öppna översikten — den ljusa, täta vyn med syfte och akter. */
  onOpenOversikt: () => void;
  /** Ge ett utkast sin form: öppnar komponentgalleriet i bytläge. */
  onChangeTemplate?: (index: number) => void;
  saveStatus: AuthoringSaveStatus;
  saveError: string | null;
}

const UTKAST_TAG = "Utkast";

/**
 * Media lagras på EN rad i propen, med separatorer i stället för radbrytningar.
 * Flerradiga propvärden är inte garanterat roundtrip-säkra i MDX-parsern, och
 * ett planeringsverktyg som tappar innehåll vid sparning är värre än inget.
 */
const MEDIA_SEP = ";;";
const MEDIA_FIELD_SEP = "::";

interface MediaEntry {
  url: string;
  hur: string;
}

function propText(slide: ParsedComponent, key: string): string {
  const value = slide.props[key];
  return typeof value === "string" ? value : "";
}

function parseMedia(raw: string): MediaEntry[] {
  if (!raw.trim()) return [];
  return raw
    .split(MEDIA_SEP)
    .map((chunk) => {
      const [url, ...rest] = chunk.split(MEDIA_FIELD_SEP);
      return { url: (url ?? "").trim(), hur: rest.join(MEDIA_FIELD_SEP).trim() };
    })
    .filter((entry) => entry.url || entry.hur);
}

function serializeMedia(entries: MediaEntry[]): string {
  return entries
    .filter((entry) => entry.url.trim() || entry.hur.trim())
    .map((entry) =>
      entry.hur.trim()
        ? entry.url.trim() + " " + MEDIA_FIELD_SEP + " " + entry.hur.trim()
        : entry.url.trim(),
    )
    .join(" " + MEDIA_SEP + " ");
}

function newTemplateName(slide: ParsedComponent): string | null {
  const mall = propText(slide, "mall").trim();
  if (!mall || !/^ny\s*:/i.test(mall)) return null;
  return mall.replace(/^ny\s*:\s*/i, "").trim() || null;
}

function isDividerSlide(slide: ParsedComponent): boolean {
  return (
    slide.tag === "SectionDivider" ||
    (slide.tag === UTKAST_TAG &&
      propText(slide, "mall").trim() === "SectionDivider")
  );
}

/**
 * Rå MDX → läsbar rad.
 *
 * Översikten ska visa vad som STÅR på sliden, inte hur det är skrivet.
 * Rubriknivåer, fetstil, citattecken och <small> är syntax, och i en tät lista
 * är de rent brus — de gör varje rad längre och svårare att skanna utan att
 * tillföra något. Radbrytningar blir `·`, så att flera stycken fortfarande
 * läses som flera saker och inte klistras ihop till en mening.
 */
function plainText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/^\s{0,3}[-*+]\s+/, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
        .trim(),
    )
    .filter(Boolean)
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Första raden, rensad. Aktrubriker är alltid en rad — resten är underrubrik. */
function headline(raw: string | null | undefined): string {
  const first = (raw ?? "").split(/\r?\n/).find((line) => line.trim());
  return plainText(first);
}

/** Allt efter första raden, rensat. */
function subline(raw: string | null | undefined): string {
  const lines = (raw ?? "").split(/\r?\n/);
  const first = lines.findIndex((line) => line.trim());
  return first === -1 ? "" : plainText(lines.slice(first + 1).join("\n"));
}

function parseMinutes(raw: string): number {
  const text = raw.trim().toLowerCase().replace(",", ".");
  const match = text.match(/([\d.]+)/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  return /sek/.test(text) ? value / 60 : value;
}

/** Ser den inklistrade strängen ut som något man kan lägga på en slide? */
function looksLikeMedia(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return /^https?:\/\//i.test(t);
  return (
    /^(https?:\/\/|\/|\.\/)/i.test(t) ||
    /\.(png|jpe?g|gif|webp|mp4|mov|mp3|wav|svg|pdf)$/i.test(t)
  );
}

export function ManusWorkspace({
  slug,
  title,
  parsed,
  updateParsed,
  slideMetas,
  notes,
  onOpenEditor,
  onOpenStoryboard,
  onOpenOversikt,
  onChangeTemplate,
  saveStatus,
  saveError,
}: ManusWorkspaceProps) {
  const slides = parsed.slides;
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  /** Raden som redigeras direkt i översikten, utan att fällas ut. */
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Vilka lager som visas under varje översiktsrad. Se manus-layers.ts. */
  const layers = useSyncExternalStore(
    subscribeLayers,
    getLayers,
    getServerLayers,
  );

  const stats = useMemo(() => {
    let utkast = 0;
    let minutes = 0;
    let media = 0;
    const newTemplates = new Map<string, number[]>();
    /** Alla slides med en instruktion till Claude — även färdigbyggda. */
    const claudeNotes: { index: number; text: string }[] = [];
    slides.forEach((slide, index) => {
      minutes += parseMinutes(propText(slide, "tid"));
      media += parseMedia(propText(slide, "media")).length;
      const claude = propText(slide, "claude").trim();
      if (claude) claudeNotes.push({ index, text: claude });
      if (slide.tag !== UTKAST_TAG) return;
      utkast += 1;
      const name = newTemplateName(slide);
      if (name) {
        const list = newTemplates.get(name) ?? [];
        list.push(index + 1);
        newTemplates.set(name, list);
      }
    });
    return { utkast, minutes, media, newTemplates, claudeNotes };
  }, [slides]);

  /** Akterna, för hoppnavigeringen. */
  const acts = useMemo(
    () =>
      slides
        .map((slide, index) => ({ slide, index }))
        .filter((entry) => isDividerSlide(entry.slide))
        .map((entry) => ({
          index: entry.index,
          label:
            headline(propText(entry.slide, "title")) ||
            headline(entry.slide.content) ||
            headline(slideMetas[entry.index]?.primaryText) ||
            "Akt " + (entry.index + 1),
        })),
    [slides, slideMetas],
  );

  /**
   * Slides och minuter per akt. Utan dem är listan 55 likadana rader; med dem
   * ser man att MED väger dubbelt så mycket som MOT utan att räkna själv —
   * och det är just den obalansen man letar efter när man läser bågen.
   */
  const actSpans = useMemo(() => {
    const spans = new Map<number, { slides: number; minutes: number }>();
    let current: number | null = null;
    slides.forEach((slide, index) => {
      if (isDividerSlide(slide)) {
        current = index;
        spans.set(index, { slides: 0, minutes: 0 });
        return;
      }
      if (current === null) return;
      const span = spans.get(current);
      if (!span) return;
      span.slides += 1;
      span.minutes += parseMinutes(propText(slide, "tid"));
    });
    return spans;
  }, [slides]);

  // Alla slides utom dividers går att fälla ut — utkasten med hela ritningen,
  // de färdiga med sina textfält, slidetexten och Till Claude (Joel 2026-09-03:
  // manusläget ska gå att använda på färdiga deck, inte bara i utkastfasen).
  const expandableCount = slides.filter((slide) => !isDividerSlide(slide)).length;
  const allOpen = expandableCount > 0 && openRows.size >= expandableCount;

  const toggleRow = (index: number) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const setAll = (open: boolean) =>
    setOpenRows(
      open
        ? new Set(
            slides
              .map((slide, index) => (!isDividerSlide(slide) ? index : -1))
              .filter((index) => index >= 0),
          )
        : new Set<number>(),
    );

  const jumpTo = (index: number) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      '[data-slide="' + index + '"]',
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Tom sträng RADERAR propen. Mergar man rakt av lämnas `syfte=""` kvar i
  // MDX:en, filerna skräpar ner sig och `npm run check:mdx` börjar gnälla.
  const setProp = (index: number, key: string, value: string) => {
    updateParsed((current) => {
      const slide = current.slides[index];
      if (!slide) return current;
      const nextProps = { ...slide.props };
      if (value.trim() === "") delete nextProps[key];
      else nextProps[key] = value;
      const nextSlides = current.slides.slice();
      nextSlides[index] = { ...slide, props: nextProps };
      return { ...current, slides: nextSlides };
    });
  };

  const setContent = (index: number, value: string) => {
    updateParsed((current) => {
      const slide = current.slides[index];
      if (!slide) return current;
      const nextSlides = current.slides.slice();
      nextSlides[index] = { ...slide, content: value };
      return { ...current, slides: nextSlides };
    });
  };

  /**
   * Ny slide MELLAN två rader. Manusläget är där luckorna syns — "här saknas
   * något" — så här ska luckan gå att fylla utan att lämna vyn (Joel
   * 2026-09-03). Det nya är alltid ett tomt Utkast: syfte, text och Till
   * Claude fylls i på plats, mallen väljs senare. Positionsbundna frontmatter-
   * nycklar flyttas av insertSlidesAfter; de utfällda raderna efter platsen
   * skjuts ett steg så att de fortsätter peka på samma slides.
   */
  const insertUtkastAfter = (afterIndex: number) => {
    const insertAt = Math.min(Math.max(afterIndex + 1, 0), slides.length);
    updateParsed((current) =>
      insertSlidesAfter(current, afterIndex, [
        {
          tag: UTKAST_TAG,
          props: { slideId: createSlideId() },
          content: "",
          children: [],
        },
      ]),
    );
    setOpenRows((current) => {
      const next = new Set<number>();
      current.forEach((i) => next.add(i >= insertAt ? i + 1 : i));
      next.add(insertAt);
      return next;
    });
    setEditingRow(null);
    window.setTimeout(() => jumpTo(insertAt), 60);
  };

  /**
   * Stryk en slide. Bekräftelse först — raden försvinner ur filen på nästa
   * autosparning; manusläget har ingen egen ångra-knapp.
   * Aktkommentaren före sliden följer med till efterföljaren (deleteSlideAt).
   */
  const removeSlideAt = (index: number) => {
    const slide = slides[index];
    if (!slide || slides.length <= 1) return;
    const label =
      plainText(
        slide.tag === UTKAST_TAG ? slide.content : slideMetas[index]?.primaryText,
      ) ||
      propText(slide, "syfte") ||
      slide.tag;
    const ok = window.confirm(
      "Ta bort slide " +
        (index + 1) +
        "?\n\n" +
        label.slice(0, 140) +
        "\n\nRaden tas bort ur filen vid nästa sparning.",
    );
    if (!ok) return;
    updateParsed((current) => deleteSlideAt(current, index));
    setOpenRows((current) => {
      const next = new Set<number>();
      current.forEach((i) => {
        if (i === index) return;
        next.add(i > index ? i - 1 : i);
      });
      return next;
    });
    setEditingRow(null);
  };

  const setMedia = (index: number, entries: MediaEntry[]) =>
    setProp(index, "media", serializeMedia(entries));

  const addMedia = (index: number, url: string) => {
    const slide = slides[index];
    if (!slide) return;
    const entries = parseMedia(propText(slide, "media"));
    entries.push({ url: url.trim(), hur: "" });
    setMedia(index, entries);
    setOpenRows((current) => new Set(current).add(index));
  };

  const handleDrop = (index: number) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDropTarget(null);
    const uri =
      event.dataTransfer.getData("text/uri-list") ||
      event.dataTransfer.getData("text/plain");
    if (uri.trim()) {
      uri
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .forEach((line) => addMedia(index, line));
      return;
    }
    // Släppta filer: lägg in sökvägen de FÅR när de ligger i public/.
    Array.from(event.dataTransfer.files ?? []).forEach((file) =>
      addMedia(index, "/bilder/" + slug + "/" + file.name),
    );
  };

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!looksLikeMedia(text)) return;
    event.preventDefault();
    addMedia(index, text);
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Sparar…"
      : saveStatus === "dirty"
        ? "Osparat"
        : saveStatus === "error" || saveStatus === "conflict"
          ? (saveError ?? "Sparfel")
          : "Sparat";

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto bg-bg text-text">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
          <h1 className="text-sm font-medium">{title}</h1>
          <span className="font-mono text-xs text-text-muted">
            {slides.length} slides
            {stats.utkast > 0 ? (
              <>
                {" · "}
                <strong className="text-accent">{stats.utkast} utkast kvar</strong>
              </>
            ) : (
              " · inga utkast kvar"
            )}
            {stats.minutes > 0 ? " · ~" + Math.round(stats.minutes) + " min" : null}
            {stats.media > 0 ? " · " + stats.media + " media" : null}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={
                "font-mono text-xs " +
                (saveStatus === "error" || saveStatus === "conflict"
                  ? "text-red-300"
                  : saveStatus === "dirty" || saveStatus === "saving"
                    ? "text-accent"
                    : "text-text-muted")
              }
            >
              {saveLabel}
            </span>
            <button
              type="button"
              onClick={() => setAll(!allOpen)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-text-muted hover:text-accent"
            >
              {allOpen ? "Fäll ihop alla" : "Fäll ut alla"}
            </button>
            <button
              type="button"
              onClick={onOpenOversikt}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-text-muted hover:text-accent"
              title="Den röda tråden: en rad per slide, grupperad per akt"
            >
              Översikt
            </button>
            <button
              type="button"
              onClick={onOpenStoryboard}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-text-muted hover:text-accent"
            >
              Storyboard
            </button>
            <a
              href={"/" + slug}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-text-muted hover:text-accent"
            >
              Presentera
            </a>
          </div>
        </div>

        {/* Lager + akthopp — vad varje rad visar, och hela bågen som en rad. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 border-t border-white/[0.06] px-6 py-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-text-muted">
            Visa
          </span>
          {LAYERS.map((layer) => (
            <button
              key={layer.key}
              type="button"
              aria-pressed={layers[layer.key]}
              onClick={() => toggleLayer(layer.key)}
              className={
                "rounded-md border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition-colors " +
                (layers[layer.key]
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-white/10 text-text-muted hover:border-white/25 hover:text-text")
              }
            >
              {layer.label}
            </button>
          ))}

          {acts.length > 0 && (
            <>
              <span aria-hidden className="mx-1 h-4 w-px bg-white/10" />
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-text-muted">
                Akter
              </span>
              {acts.map((act) => (
                <button
                  key={act.index}
                  type="button"
                  onClick={() => jumpTo(act.index)}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-text-muted transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {act.label}
                </button>
              ))}
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
        {stats.newTemplates.size > 0 && (
          <section className="mb-8 rounded-xl border border-accent/40 bg-accent/5 p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              Nya templates föreslås
            </h2>
            <ul className="mt-3 space-y-1.5">
              {Array.from(stats.newTemplates.entries()).map((entry) => (
                <li key={entry[0]} className="text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      const target = entry[1][0] - 1;
                      setOpenRows((current) => new Set(current).add(target));
                      jumpTo(target);
                    }}
                    className="font-medium hover:text-accent"
                  >
                    {entry[0]}
                  </button>
                  <span className="text-text-muted">
                    {" — slide " + entry[1].join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              Skriv in vad de ska göra i respektive utkasts fält <em>Visuellt</em>,
              så byggs de därifrån.
            </p>
          </section>
        )}

        {/* TILL CLAUDE — samlat. Utspridda anteckningar är samma sak som inga
            anteckningar: poängen är att kunna se hela listan av obesvarade
            instruktioner på en gång när det är dags att bygga vidare. */}
        {stats.claudeNotes.length > 0 && (
          <section className="mb-8 rounded-xl border border-accent/40 bg-accent/5 p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
              Till Claude/Codex · {stats.claudeNotes.length}{" "}
              {stats.claudeNotes.length === 1 ? "slide" : "slides"}
            </h2>
            <ul className="mt-3 space-y-2">
              {stats.claudeNotes.map((entry) => (
                <li key={entry.index} className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRows((current) =>
                        new Set(current).add(entry.index),
                      );
                      jumpTo(entry.index);
                    }}
                    className="shrink-0 font-mono text-xs text-text-muted hover:text-accent"
                  >
                    {entry.index + 1}
                  </button>
                  <span className="min-w-0 flex-1">{entry.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ol className="space-y-1">
          {slides.map((slide, index) => {
            const number = index + 1;
            const meta = slideMetas[index];
            const note = notes[index];
            const isUtkast = slide.tag === UTKAST_TAG;
            const open = openRows.has(index);
            const editing = isUtkast && !open && editingRow === index;
            const media = parseMedia(propText(slide, "media"));

            if (isDividerSlide(slide)) {
              const span = actSpans.get(index);
              const under = subline(slide.content);
              return (
                <Fragment key={index}>
                <InsertBar
                  onInsert={() => insertUtkastAfter(index - 1)}
                  label={"Ny slide före " + number}
                />
                <li data-slide={index} className="group scroll-mt-36 pt-8">
                  <div className="border-b border-white/15 pb-2">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-text-muted">
                        {number}
                      </span>
                      <h2 className="text-lg font-medium">
                        {headline(propText(slide, "title")) ||
                          headline(slide.content) ||
                          headline(meta?.primaryText) ||
                          "Akt"}
                      </h2>
                      {/* Aktens vikt, inte sidnummer — det är tyngdpunkten
                          man letar efter när man läser bågen. */}
                      {span && span.slides > 0 && (
                        <span className="font-mono text-[0.65rem] text-text-muted">
                          {span.slides} slides
                          {span.minutes > 0
                            ? " · ~" + Math.round(span.minutes) + " min"
                            : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenEditor(index)}
                        className="ml-auto font-mono text-xs text-text-muted hover:text-accent"
                      >
                        öppna
                      </button>
                      <RemoveButton onClick={() => removeSlideAt(index)} />
                    </div>
                    {under ? (
                      <p className="mt-0.5 pl-[1.8rem] text-xs text-text-muted">
                        {under}
                      </p>
                    ) : null}
                  </div>
                  {/* Dividers bär ofta aktens gångjärnsmening i manus — den
                      måste synas i genomläsningen, inte bara i editorn. */}
                  <LayerLines
                    layers={layers}
                    syfte={propText(slide, "syfte")}
                    manus={notes[index]}
                    claude={propText(slide, "claude")}
                  />
                </li>
                </Fragment>
              );
            }

            const preview =
              plainText(isUtkast ? slide.content : meta?.primaryText) || "—";

            return (
              <Fragment key={index}>
              <InsertBar
                onInsert={() => insertUtkastAfter(index - 1)}
                label={"Ny slide före " + number}
              />
              <li
                data-slide={index}
                className={
                  "group scroll-mt-36 rounded-lg border transition-colors " +
                  (dropTarget === index
                    ? "border-accent bg-accent/10"
                    : open
                      ? "border-white/20 bg-white/[0.03]"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.02]")
                }
                onDragOver={(event) => {
                  if (!isUtkast) return;
                  event.preventDefault();
                  setDropTarget(index);
                }}
                onDragLeave={() =>
                  setDropTarget((current) => (current === index ? null : current))
                }
                onDrop={isUtkast ? handleDrop(index) : undefined}
                onPaste={isUtkast ? handlePaste(index) : undefined}
              >
                {/* ÖVERSIKTSRAD — hela passet läsbart utan att fälla ut något */}
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-7 shrink-0 text-right font-mono text-xs text-text-muted">
                    {number}
                  </span>
                  {/* Mallnamnet är metadata, inte innehåll. Bara de som ska
                      BYGGAS får ram och accent — då syns byggskulden direkt
                      i listan, och de 44 färdiga mallarna slutar rita 44
                      rutor längs vänsterkanten. */}
                  <span
                    className={
                      "w-40 shrink-0 truncate font-mono text-[0.6rem] " +
                      (isUtkast && newTemplateName(slide)
                        ? "rounded border border-accent/60 px-1.5 py-0.5 text-accent"
                        : "px-1.5 py-0.5 text-text-muted opacity-60")
                    }
                  >
                    {isUtkast ? propText(slide, "mall") || "utkast" : slide.tag}
                  </span>

                  {/* Slidetexten redigeras där den står. Fältet visar RÅ MDX,
                      inte den rensade översiktstexten — annars skulle en snabb
                      rättning tyst radera ###, ** och <small>. Ändringen skrivs
                      löpande, precis som fälten i den utfällda ritningen; Esc
                      stänger bara redigeringen. */}
                  {editing ? (
                    <AutoTextarea
                      value={slide.content ?? ""}
                      onChange={(next) => setContent(index, next)}
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setEditingRow(null);
                      }}
                      onBlur={() => setEditingRow(null)}
                      placeholder="Orden som ska stå på sliden. **fet** ger accentfärg."
                      minHeight="2rem"
                      maxHeight="40vh"
                      className="min-w-0 flex-1 resize-y overflow-y-auto rounded border border-accent/60 bg-transparent px-2 py-1 font-mono text-sm leading-snug outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isUtkast) return toggleRow(index);
                        if (open) return toggleRow(index);
                        setEditingRow(index);
                      }}
                      title={
                        isUtkast && !open
                          ? "Klicka för att redigera texten"
                          : undefined
                      }
                      className="min-w-0 flex-1 truncate rounded px-1 text-left text-sm text-text transition-colors hover:bg-white/[0.05]"
                    >
                      {preview}
                    </button>
                  )}

                  {media.length > 0 && (
                    <span className="shrink-0 font-mono text-[0.6rem] text-accent">
                      {"◆ " + media.length}
                    </span>
                  )}
                  {propText(slide, "tid") ? (
                    <span className="shrink-0 font-mono text-[0.6rem] text-text-muted">
                      {propText(slide, "tid")}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleRow(index)}
                    className="shrink-0 font-mono text-xs text-text-muted hover:text-accent"
                    aria-expanded={open}
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <RemoveButton onClick={() => removeSlideAt(index)} />
                </div>

                {/* LAGER — syfte och manus utan att fälla ut. Bara i kollapsat
                    läge; den utfällda ritningen visar samma fält redigerbara. */}
                {!open && (
                  <LayerLines
                    layers={layers}
                    syfte={propText(slide, "syfte")}
                    manus={note}
                    claude={propText(slide, "claude")}
                  />
                )}

                {/* DETALJ — färdig slide: textfälten, slidetexten, Till Claude */}
                {!isUtkast && open && (
                  <BuiltDetail
                    slide={slide}
                    index={index}
                    onSetProp={setProp}
                    onSetContent={setContent}
                    onOpenEditor={onOpenEditor}
                  />
                )}

                {/* DETALJ — full ritning */}
                {isUtkast && open && (
                  <div className="border-t border-white/10 px-3 pb-4 pt-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <input
                        value={propText(slide, "mall")}
                        onChange={(event) =>
                          setProp(index, "mall", event.target.value)
                        }
                        placeholder="Template — eller NY: Namn"
                        className="w-60 rounded border border-white/15 bg-transparent px-2 py-1 font-mono text-xs text-text-muted outline-none focus:border-accent"
                      />
                      <input
                        value={propText(slide, "tid")}
                        onChange={(event) =>
                          setProp(index, "tid", event.target.value)
                        }
                        placeholder="tid"
                        className="w-20 rounded border border-white/15 bg-transparent px-2 py-1 font-mono text-xs text-text-muted outline-none focus:border-accent"
                      />
                      {onChangeTemplate ? (
                        <button
                          type="button"
                          onClick={() => onChangeTemplate(index)}
                          title="Välj en mall ur galleriet. Syfte, tid, manus och id följer med; orden hamnar i mallens huvudfält."
                          className="ml-auto rounded border border-accent/40 px-2 py-1 font-mono text-xs text-accent hover:bg-accent/10"
                        >
                          välj mall
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenEditor(index)}
                        className={`${onChangeTemplate ? "" : "ml-auto "}font-mono text-xs text-text-muted hover:text-accent`}
                      >
                        öppna i editor
                      </button>
                    </div>

                    <Field
                      label="Syfte"
                      value={propText(slide, "syfte")}
                      placeholder="Vad gör sliden i bågen?"
                      onChange={(value) => setProp(index, "syfte", value)}
                    />

                    {/* Huvudfältet. Störst text och egen ram, för det är det
                        här man är inne för — och det växer med innehållet så
                        hela sliden syns medan den skrivs. */}
                    <label className="mt-3 block">
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted">
                        Text på sliden
                      </span>
                      <AutoTextarea
                        value={slide.content ?? ""}
                        onChange={(next) => setContent(index, next)}
                        placeholder="Orden som ska stå på sliden. **fet** ger accentfärg."
                        minHeight="5rem"
                        className="mt-1 w-full resize-y overflow-y-auto rounded-lg border border-white/10 bg-transparent px-3 py-2 text-base leading-snug outline-none focus:border-accent"
                      />
                    </label>

                    <Field
                      label="Visuellt"
                      value={propText(slide, "visuell")}
                      placeholder="Hur ska den se ut? Vilken kod-fördel utnyttjas?"
                      onChange={(value) => setProp(index, "visuell", value)}
                      multiline
                    />

                    {/* Till Claude — det enda fältet som är en uppmaning och
                        inte en beskrivning. Accentram, så att det syns att
                        sliden har en obesvarad instruktion även när man bara
                        bläddrar förbi. Ligger som prop, inte som sidecar-tagg,
                        och följer därför med när utkastet blir riktig template. */}
                    <Field
                      label="Till Claude/Codex"
                      accent
                      value={propText(slide, "claude")}
                      placeholder="Vad ska jag göra med den här sliden? T.ex. »fånga att odlingen består av data, datakraft och algoritm«."
                      onChange={(value) => setProp(index, "claude", value)}
                      multiline
                    />

                    {/* MEDIA — dra in, klistra in, eller lägg till för hand.
                        HUR-fältet är minst lika viktigt som länken: det är där
                        det står hur mediet ska användas på sliden. */}
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted">
                          Media
                        </span>
                        <button
                          type="button"
                          onClick={() => addMedia(index, "")}
                          className="font-mono text-[0.65rem] text-text-muted hover:text-accent"
                        >
                          + lägg till
                        </button>
                        <span className="font-mono text-[0.6rem] text-text-muted opacity-60">
                          dra hit en länk eller klistra in
                        </span>
                      </div>

                      {media.length === 0 ? (
                        <p className="mt-1 rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-text-muted">
                          Inget media. Dra in en URL, en bild eller en film — eller
                          klistra in en länk var som helst i den här sliden.
                        </p>
                      ) : (
                        <ul className="mt-1 space-y-1.5">
                          {media.map((entry, mediaIndex) => (
                            <li key={mediaIndex} className="flex gap-2">
                              <div className="flex-1 space-y-1">
                                <input
                                  value={entry.url}
                                  onChange={(event) => {
                                    const next = media.slice();
                                    next[mediaIndex] = {
                                      url: event.target.value,
                                      hur: entry.hur,
                                    };
                                    setMedia(index, next);
                                  }}
                                  placeholder="URL eller /bilder/…"
                                  className="w-full rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-accent"
                                />
                                <input
                                  value={entry.hur}
                                  onChange={(event) => {
                                    const next = media.slice();
                                    next[mediaIndex] = {
                                      url: entry.url,
                                      hur: event.target.value,
                                    };
                                    setMedia(index, next);
                                  }}
                                  placeholder="Hur ska den användas? Bakgrund, inklipp, autospelande…"
                                  className="w-full rounded border border-white/10 bg-transparent px-2 py-1 text-xs outline-none focus:border-accent"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                {/^https?:\/\//i.test(entry.url) && (
                                  <a
                                    href={entry.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded border border-white/10 px-1.5 py-0.5 text-center font-mono text-[0.6rem] text-text-muted hover:text-accent"
                                    title="Öppna i ny flik"
                                  >
                                    ↗
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMedia(
                                      index,
                                      media.filter((_, i) => i !== mediaIndex),
                                    )
                                  }
                                  className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-text-muted hover:text-red-300"
                                  title="Ta bort"
                                >
                                  ✕
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <Field
                      label="Källa"
                      value={propText(slide, "kalla")}
                      placeholder="Källa som ska stå på sliden eller i Notes"
                      onChange={(value) => setProp(index, "kalla", value)}
                    />

                    {note ? (
                      <div className="mt-3">
                        <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted">
                          Manus
                        </span>
                        {/* Hela manuset, inte en trunkering — den utfällda
                            ritningen är där man läser sliden i sin helhet.
                            Redigeras i editorn; Notes ligger utanför utkastet. */}
                        <p className="mt-1 whitespace-pre-line border-l-2 border-white/15 pl-3 text-xs italic leading-relaxed text-text-muted">
                          {note.trim()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
              </Fragment>
            );
          })}
          <InsertBar
            onInsert={() => insertUtkastAfter(slides.length - 1)}
            label="Ny slide sist"
            always
          />
        </ol>
      </main>
    </div>
  );
}

/**
 * Lagerraderna under en översiktsrad. Indraget matchar radnumret + mall-chippet
 * ovanför, så etiketterna bildar en egen kolumn genom hela listan.
 *
 * Syftet trunkeras till en rad — det är en sammanfattning och ska läsas som en.
 * Manuset klipps till fyra rader: tillräckligt för att följa den röda tråden i
 * en genomläsning, kort nog att listan inte blir ett dokument. Hela manuset
 * ligger en utfällning bort.
 */
function LayerLines({
  layers,
  syfte,
  manus,
  claude,
}: {
  layers: LayerState;
  syfte: string;
  manus: string | null;
  claude: string;
}) {
  const syfteText = layers.syfte ? syfte.trim() : "";
  const manusText = layers.manus ? (manus ?? "").trim() : "";
  const claudeText = layers.claude ? claude.trim() : "";
  if (!syfteText && !manusText && !claudeText) return null;

  return (
    <div className="space-y-1 pb-2 pl-[4.6rem] pr-3 pt-0.5">
      {syfteText ? (
        <div className="flex gap-3">
          <LayerLabel>Syfte</LayerLabel>
          <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
            {syfteText}
          </span>
        </div>
      ) : null}
      {manusText ? (
        <div className="flex gap-3">
          <LayerLabel>Manus</LayerLabel>
          <span className="line-clamp-4 min-w-0 flex-1 whitespace-pre-line text-xs italic leading-relaxed text-text-muted">
            {manusText}
          </span>
        </div>
      ) : null}
      {/* Till Claude bär accentfärg — det är det enda lagret som är en
          uppmaning och inte en beskrivning, och det ska gå att hitta i en
          lång lista utan att läsa. */}
      {claudeText ? (
        <div className="flex gap-3">
          <LayerLabel accent>Claude</LayerLabel>
          <span className="min-w-0 flex-1 text-xs leading-relaxed text-accent">
            {claudeText}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Infogningsraden mellan två slides. Nästan osynlig tills man för musen över
 * gapet — då dras en accentlinje och en "+ slide"-knapp fram. Sist i listan
 * (`always`) står den alltid framme, annars hittar ingen den.
 */
function InsertBar({
  onInsert,
  label,
  always,
}: {
  onInsert: () => void;
  label: string;
  always?: boolean;
}) {
  return (
    <li
      className={
        "group/insert relative flex items-center justify-center transition-[height] " +
        (always ? "h-9" : "h-2 hover:h-7")
      }
    >
      <span
        aria-hidden
        className={
          "absolute inset-x-10 top-1/2 h-px transition-colors " +
          (always ? "bg-accent/30" : "bg-transparent group-hover/insert:bg-accent/40")
        }
      />
      <button
        type="button"
        onClick={onInsert}
        title={label}
        className={
          "relative rounded-full border border-accent/60 bg-bg px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-accent transition-opacity hover:bg-accent/10 focus:opacity-100 " +
          (always ? "" : "opacity-0 group-hover/insert:opacity-100")
        }
      >
        + slide
      </button>
    </li>
  );
}

/** Stryk-knappen. Syns när raden hovras, så listan inte får 50 kryss i kanten. */
function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ta bort slide"
      className="shrink-0 font-mono text-xs text-text-muted opacity-0 transition-opacity hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
    >
      ✕
    </button>
  );
}

function LayerLabel({
  children,
  accent,
}: {
  children: string;
  accent?: boolean;
}) {
  return (
    <span
      className={
        "w-12 shrink-0 pt-px font-mono text-[0.55rem] uppercase tracking-[0.2em] " +
        (accent ? "text-accent opacity-80" : "text-text-muted opacity-50")
      }
    >
      {children}
    </span>
  );
}

/**
 * Textarea som växer med sitt innehåll.
 *
 * En fast `rows` betyder att man redigerar i en glugg med scroll — man ser inte
 * vad man ändrar, och slidetexten är det fält som ändras oftast. Höjden sätts
 * från scrollHeight vid varje ändring, med ett golv så tomma fält inte
 * kollapsar och ett tak så en lång slide inte trycker undan resten av vyn.
 * Manuell resize är kvar för den som vill dra ut den ändå.
 */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "3.5rem",
  maxHeight = "50vh",
  autoFocus,
  onKeyDown,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nollställ först — annars kan höjden bara växa, aldrig krympa.
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      autoFocus={autoFocus}
      placeholder={placeholder}
      style={{ minHeight, maxHeight }}
      className={className}
    />
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  multiline,
  accent,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  /** Ram och etikett i accentfärg — för fält som bär en uppmaning. */
  accent?: boolean;
}) {
  const filled = accent && value.trim().length > 0;
  const border = filled ? "border-accent/60" : "border-white/10";
  return (
    <label className="mt-3 block">
      <span
        className={
          "font-mono text-[0.6rem] uppercase tracking-[0.26em] " +
          (accent ? "text-accent opacity-80" : "text-text-muted")
        }
      >
        {label}
      </span>
      {multiline ? (
        <AutoTextarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight="2.6rem"
          maxHeight="30vh"
          className={
            "mt-1 w-full resize-y overflow-y-auto rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent " +
            border +
            (filled ? " text-accent" : "")
          }
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={
            "mt-1 w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent " +
            border
          }
        />
      )}
    </label>
  );
}

/**
 * Lätt ritning för en FÄRDIG slide i manusläget. Inte hela editorn — bara det
 * man vill komma åt i en genomläsning: textfälten som redan har innehåll,
 * slidetexten (rå MDX), och Till Claude. Övriga textfält ligger hopfällda.
 */
function BuiltDetail({
  slide,
  index,
  onSetProp,
  onSetContent,
  onOpenEditor,
}: {
  slide: ParsedComponent;
  index: number;
  onSetProp: (index: number, key: string, value: string) => void;
  onSetContent: (index: number, value: string) => void;
  onOpenEditor: (index: number) => void;
}) {
  const { schema } = getTemplateSchemaOrFallback(
    slide.tag,
    slide.props as Record<string, unknown>,
    Boolean(slide.content && slide.content.trim().length > 0),
  );
  // Filvägar (bakgrund, symboler, figurer, ikoner) och lagerprops hör hemma i
  // designfliken, inte i en genomläsning av manus.
  const SKIP = /^(claude|mark|background|symbol|figure|register|cutSkip|slideId|akt|syfte|tid|mall|stegAv|hoppaSteg)$|Icon$|Hidden$|^(symbol|figure|mark)[A-Z]/;
  const textFields = (schema?.fields ?? []).filter(
    (field) =>
      (field.type === "text" || field.type === "multiline") && !field.advanced && !SKIP.test(field.name),
  );
  const filled = textFields.filter((field) => propText(slide, field.name).trim() !== "");
  const empty = textFields.filter((field) => propText(slide, field.name).trim() === "");
  const hasContent = Boolean(slide.content && slide.content.trim().length > 0);

  return (
    <div className="border-t border-white/10 px-3 pb-4 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted">
          {slide.tag}
        </span>
        <button
          type="button"
          onClick={() => onOpenEditor(index)}
          className="ml-auto font-mono text-xs text-text-muted hover:text-accent"
        >
          öppna i editor
        </button>
      </div>

      {filled.map((field) => (
        <Field
          key={field.name}
          label={field.label ?? field.name}
          value={propText(slide, field.name)}
          onChange={(value) => onSetProp(index, field.name, value)}
          multiline={field.type === "multiline"}
        />
      ))}

      {hasContent ? (
        <label className="mt-3 block">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted">
            Text på sliden · rå MDX
          </span>
          <AutoTextarea
            value={slide.content ?? ""}
            onChange={(next) => onSetContent(index, next)}
            placeholder="Slidens innehåll (listor, stycken) som det står i filen."
            minHeight="4rem"
            className="mt-1 w-full resize-y overflow-y-auto rounded-lg border border-white/10 bg-transparent px-3 py-2 font-mono text-xs leading-relaxed text-text outline-none focus:border-white/30"
          />
        </label>
      ) : null}

      <Field
        label="Till Claude/Codex"
        accent
        value={propText(slide, "claude")}
        placeholder="Vad ska jag göra med den här sliden nästa byggpass?"
        onChange={(value) => onSetProp(index, "claude", value)}
        multiline
      />

      {empty.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-mono text-[0.6rem] uppercase tracking-[0.26em] text-text-muted hover:text-accent">
            Fler fält · {empty.length}
          </summary>
          {empty.map((field) => (
            <Field
              key={field.name}
              label={field.label ?? field.name}
              value=""
              placeholder={field.hint}
              onChange={(value) => onSetProp(index, field.name, value)}
              multiline={field.type === "multiline"}
            />
          ))}
        </details>
      ) : null}
    </div>
  );
}
