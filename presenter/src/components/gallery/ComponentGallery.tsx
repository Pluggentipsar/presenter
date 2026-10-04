"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ParsedComponent } from "@/lib/mdx-parser";
import { convertSlide, mainTextOf } from "@/lib/convert-slide";
import { createDefaultSlide } from "@/lib/template-schemas";
import { FAMILIES, familyOf, isOneOff, readableName, searchTemplates, type FamilyId, type GalleryExample, type GalleryTemplate } from "@/lib/template-gallery";
import { loadExampleSlide, loadTemplateGallery, setTemplateFavorite } from "@/lib/template-gallery-actions";
import { useExampleThumbnails, type ExampleSource } from "@/components/studio/useDeckThumbnails";
import { SlideStage } from "./SlideStage";
import styles from "./gallery.module.css";

/**
 * Komponentgalleriet — välj nästa slide med ögonen.
 *
 * Joel 21 september 2026: det ska gå att bygga en snygg presentation helt
 * manuellt — välja komponenter, lägga till delar. Den gamla väljaren var en
 * mörk lista med 142 mallnamn; decken använder över 460, och de vanligaste
 * gick inte att välja alls. Här visas varje mall som en riktig slide ur Joels
 * egna föreläsningar, renderad i temat för det deck man bygger i.
 *
 * Man lägger till en mall "som exemplet": samma form och innehåll som en slide
 * man känner igen, utan dess manus och planeringsfält — sedan byter man texten
 * i slide-editorn. Mallar med handskrivet schema går också att lägga till tomma.
 *
 * Favoriter: stjärnan på ett kort (eller F på den valda mallen) lägger mallen
 * i vyn "Favoriter", som står överst och är där galleriet öppnas när det finns
 * några. De sparas i content/galleri.json och följer med mellan datorerna.
 *
 * Byt mall: har sliden egna ord visar förhandsrutan BYTET — orden i den valda
 * mallen, precis som convertSlide() kommer att lägga dem — innan man väljer.
 * Knappen som gäller följer det man ser: "som exemplet" eller "tom".
 */

interface Props {
  /** Temat för decket man bygger i — exemplen visas i det. */
  theme: string;
  /** Mallar som redan används i decket: visas först, så att man håller stilen. */
  usedTags: string[];
  /** Var den nya sliden hamnar, t.ex. "efter slide 12" — eller vilken slide som byter mall. */
  positionLabel: string;
  /**
   * "insert" lägger till en ny slide. "replace" byter mall på en befintlig:
   * syfte, tid, akt, instruktion till Claude, manus och slidens id följer med,
   * och orden hamnar i den nya mallens huvudfält (se lib/convert-slide.ts).
   */
  purpose?: "insert" | "replace";
  /** Mallen som ska vara vald från början — utkastets `mall`-fält. */
  initialTag?: string | null;
  /** Sliden som byter mall (bara i läget "replace"): dess ord visas i förhandsrutan. */
  replaceSource?: ParsedComponent | null;
  onClose: () => void;
  onInsert: (slide: ParsedComponent) => void;
}

type View = "favorites" | "here" | "common" | FamilyId;
/** Vad förhandsrutan visar när en slide byter mall. */
type PreviewMode = "own" | "ownEmpty" | "example";
const PREVIEW_LABELS: Record<PreviewMode, string> = { own: "Dina ord", ownEmpty: "Dina ord · tom mall", example: "Exemplet" };
const PAGE = 48;
const STAGE_W = 1280;

const exampleKey = (tag: string, example: GalleryExample) => `${tag}#${example.slug}#${example.slide}`;

export function ComponentGallery({ theme, usedTags, positionLabel, purpose = "insert", initialTag = null, replaceSource = null, onClose, onInsert }: Props) {
  const replacing = purpose === "replace";
  const [templates, setTemplates] = useState<GalleryTemplate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Vilken vy galleriet öppnas i avgörs först när favoriterna är lästa (se nedan).
  const [view, setView] = useState<View>(usedTags.length > 0 ? "here" : "common");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const savingFavorites = useRef(0);
  const [query, setQuery] = useState("");
  const [withOneOffs, setWithOneOffs] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const [stageScale, setStageScale] = useState(0.3);
  // Byt mall: exemplen som hämtats för förhandsvisningen, och vilken visning Joel har valt.
  const [targets, setTargets] = useState<Record<string, ParsedComponent>>({});
  const [previewChoice, setPreviewChoice] = useState<PreviewMode | null>(null);
  const [stepHost, setStepHost] = useState<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTemplateGallery().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTemplates(result.templates);
        setFavorites(result.favorites);
        // Utkastet pekar ut en mall: börja där, i den familj mallen hör till.
        if (initialTag && result.templates.some((template) => template.tag === initialTag)) {
          setSelectedTag(initialTag);
          setView(familyOf(initialTag));
        } else if (result.favorites.some((tag) => result.templates.some((template) => template.tag === tag))) {
          // Har Joel stjärnmärkt mallar är det dem han vill se först.
          setView("favorites");
        }
      } else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [initialTag]);

  // ── Urval ────────────────────────────────────────────────────────────────
  const used = useMemo(() => new Set(usedTags), [usedTags]);
  const pool = useMemo(() => (templates ?? []).filter((template) => withOneOffs || !isOneOff(template) || used.has(template.tag)), [templates, used, withOneOffs]);

  const counts = useMemo(() => {
    const perFamily = new Map<FamilyId, number>();
    for (const template of pool) perFamily.set(template.family, (perFamily.get(template.family) ?? 0) + 1);
    return perFamily;
  }, [pool]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  // Alla favoriter, också scener byggda för en enda föreläsning: en stjärna är ett uttryckligt val.
  const favoriteTemplates = useMemo(() => (templates ?? []).filter((template) => favoriteSet.has(template.tag)), [favoriteSet, templates]);

  const searching = query.trim().length > 0;
  const shown = useMemo(() => {
    if (searching) return searchTemplates(templates ?? [], query);
    if (view === "favorites") return favoriteTemplates;
    if (view === "here") return pool.filter((template) => used.has(template.tag));
    if (view === "common") return pool.filter((template) => template.decks >= 2).slice(0, 36);
    return pool.filter((template) => template.family === view);
  }, [favoriteTemplates, pool, query, searching, templates, used, view]);
  const page = shown.slice(0, limit);

  const selected = useMemo(() => (templates ?? []).find((template) => template.tag === selectedTag) ?? null, [selectedTag, templates]);
  const example = selected?.examples[Math.min(exampleIndex, Math.max(0, selected.examples.length - 1))];

  // ── Bytet med egna ord ───────────────────────────────────────────────────
  // Har sliden som byter mall egna ord visas de i den valda mallen, som
  // convertSlide() kommer att lägga dem. Exemplet hämtas en gång och sparas.
  const ownWords = useMemo(() => (replacing && replaceSource ? mainTextOf(replaceSource) : ""), [replaceSource, replacing]);
  const previewModes = useMemo<PreviewMode[]>(() => {
    if (!selected || !replaceSource || !ownWords) return [];
    const modes: PreviewMode[] = [];
    if (example) modes.push("own");
    if (selected.hasSchema) modes.push("ownEmpty");
    if (example) modes.push("example");
    return modes;
  }, [example, ownWords, replaceSource, selected]);
  const previewMode: PreviewMode = previewChoice && previewModes.includes(previewChoice) ? previewChoice : (previewModes[0] ?? "example");

  const targetKey = selected && example ? exampleKey(selected.tag, example) : null;
  const wantsTarget = previewModes.includes("own") && targetKey !== null && !(targetKey in targets);
  useEffect(() => {
    if (!wantsTarget || !example || !targetKey) return;
    let cancelled = false;
    void loadExampleSlide(example.slug, example.slide).then((result) => {
      if (cancelled || !result.ok) return;
      setTargets((current) => ({ ...current, [targetKey]: result.slide }));
    });
    return () => {
      cancelled = true;
    };
  }, [example, targetKey, wantsTarget]);

  // Den tomma mallen får ett nytt id varje gång den skapas — skapa den en gång per mall.
  const emptyTarget = useMemo(() => (selected?.hasSchema ? (createDefaultSlide(selected.tag) as ParsedComponent) : null), [selected]);
  const swap = useMemo(() => {
    if (!replaceSource || previewMode === "example" || previewModes.length === 0) return null;
    const target = previewMode === "own" ? (targetKey ? targets[targetKey] : undefined) : emptyTarget;
    return target ? convertSlide(replaceSource, target) : null;
  }, [emptyTarget, previewMode, previewModes.length, replaceSource, targetKey, targets]);
  const showsSwap = previewModes.length > 0 && previewMode !== "example";
  // Det man ser är det man får: visas bytet i tom mall är det "Använd tom" som gäller.
  const emptyIsPrimary = showsSwap && previewMode === "ownEmpty";

  // ── Förhandsbilder ───────────────────────────────────────────────────────
  // Rutnätet visar varje malls första exempel; detaljrutan visar alla exempel
  // för den valda mallen. Bara det som syns fångas.
  const sources = useMemo<ExampleSource[]>(() => {
    const list: ExampleSource[] = [];
    for (const template of templates ?? []) {
      for (const item of template.examples) list.push({ key: exampleKey(template.tag, item), slug: item.slug, slide: item.slide, stamp: item.stamp });
    }
    return list;
  }, [templates]);
  const isVisible = useCallback((key: string) => visible.has(key), [visible]);
  const { thumbs, workers } = useExampleThumbnails({ examples: sources, theme, enabled: templates !== null, isVisible });

  const pageSignature = useMemo(() => page.map((template) => template.tag).join("|"), [page]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((current) => {
          let next: Set<string> | null = null;
          for (const entry of entries) {
            const key = (entry.target as HTMLElement).dataset.example;
            if (!key || entry.isIntersecting === current.has(key)) continue;
            next ??= new Set(current);
            if (entry.isIntersecting) next.add(key);
            else next.delete(key);
          }
          return next ?? current;
        });
      },
      { rootMargin: "200px 0px" },
    );
    root.querySelectorAll("[data-example]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pageSignature, selectedTag, templates]);

  // Scenen är 1280 × 720 och skalas ner till rutans bredd, som i läsläget.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => setStageScale(stage.clientWidth / STAGE_W);
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [selectedTag]);

  // ── Lägg till ────────────────────────────────────────────────────────────
  const insertExample = useCallback(async () => {
    if (!selected || !example || busy) return;
    const fetched = targets[exampleKey(selected.tag, example)];
    if (fetched) {
      onInsert(fetched);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await loadExampleSlide(example.slug, example.slide);
    setBusy(false);
    if (result.ok) onInsert(result.slide);
    else setError(result.error);
  }, [busy, example, onInsert, selected, targets]);

  const insertEmpty = useCallback(() => {
    if (!selected) return;
    onInsert(createDefaultSlide(selected.tag) as ParsedComponent);
  }, [onInsert, selected]);

  // ── Favoriter ────────────────────────────────────────────────────────────
  // Stjärnan slår om direkt. Servern svarar med hela listan som den står i
  // filen; den tas emot först när inga fler sparningar är på väg, så att två
  // snabba klick inte får den första stjärnan att blinka. Går en sparning inte
  // igenom backas just den mallens stjärna.
  const toggleFavoriteTag = useCallback(
    (tag: string) => {
      const on = !favoriteSet.has(tag);
      setFavorites((current) => (on ? (current.includes(tag) ? current : [...current, tag]) : current.filter((item) => item !== tag)));
      setFavoriteError(null);
      savingFavorites.current += 1;
      void setTemplateFavorite(tag, on).then((result) => {
        savingFavorites.current -= 1;
        if (result.ok) {
          if (savingFavorites.current === 0) setFavorites(result.favorites);
          return;
        }
        setFavorites((current) => (on ? current.filter((item) => item !== tag) : current.includes(tag) ? current : [...current, tag]));
        setFavoriteError(result.error);
      });
    },
    [favoriteSet],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.tagName === "INPUT";
      if (event.key === "Escape") {
        event.preventDefault();
        if (typing && query) setQuery("");
        else onClose();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Enter" && !typing && selected) {
        event.preventDefault();
        if (example && !emptyIsPrimary) void insertExample();
        else insertEmpty();
      } else if ((event.key === "f" || event.key === "F") && !typing && selected && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleFavoriteTag(selected.tag);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [emptyIsPrimary, example, insertEmpty, insertExample, onClose, query, selected, toggleFavoriteTag]);

  const choose = (next: View) => {
    setView(next);
    setQuery("");
    setLimit(PAGE);
  };
  const select = (tag: string) => {
    setSelectedTag(tag);
    setExampleIndex(0);
    setError(null);
  };

  const family = FAMILIES.find((item) => item.id === view);
  const heading = searching
    ? "Sökresultat"
    : view === "favorites"
      ? "Favoriter"
      : view === "here"
        ? "I den här föreläsningen"
        : view === "common"
          ? "Vanligast hos dig"
          : (family?.label ?? "");
  const blurb = searching
    ? `${shown.length} mallar — sökningen går igenom namn, beskrivningar, exemplens text och scenkoder.`
    : view === "favorites"
      ? "Mallarna du har stjärnmärkt. Stjärnan finns på varje mall i galleriet — eller tryck F på den du har valt."
      : view === "here"
      ? "Mallarna som redan bär den här föreläsningen. En till av samma sort håller ihop uttrycket."
      : view === "common"
        ? "De mallar du återkommer till i flest föreläsningar."
        : (family?.blurb ?? "");

  const thumbOf = (template: GalleryTemplate, item: GalleryExample | undefined) => {
    const key = item ? exampleKey(template.tag, item) : undefined;
    const url = key ? thumbs.get(key) : undefined;
    return (
      <span className={styles.thumb} data-example={key} data-waiting={key && !url ? "" : undefined}>
        {url ? (
          // Blob-url ur miniatyrcachen — next/image kan inte optimera den.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" draggable={false} />
        ) : !item ? (
          <span className={styles.thumbEmpty}>inget exempel än</span>
        ) : null}
      </span>
    );
  };

  return (
    <div className={styles.root} ref={rootRef} role="dialog" aria-modal="true" aria-label={replacing ? "Byt mall" : "Lägg till slide"}>
      <header className={styles.top}>
        <div className={styles.title}>
          <h2>{replacing ? "Byt mall" : "Lägg till slide"}</h2>
          <span>{positionLabel}</span>
        </div>
        <div className={styles.search}>
          <input
            ref={searchRef}
            value={query}
            placeholder="Sök mall, text i ett exempel eller scenkod …"
            aria-label="Sök mall"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE);
            }}
          />
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Stäng
        </button>
      </header>

      <nav className={styles.side} aria-label="Familjer">
        <button type="button" className={styles.family} data-active={!searching && view === "favorites" ? "" : undefined} onClick={() => choose("favorites")}>
          <span>
            <span className={styles.familyStar} aria-hidden="true">
              ★
            </span>{" "}
            Favoriter
          </span>
          <span className={styles.count}>{favoriteTemplates.length}</span>
        </button>
        {used.size > 0 ? (
          <button type="button" className={styles.family} data-active={!searching && view === "here" ? "" : undefined} onClick={() => choose("here")}>
            <span>I den här föreläsningen</span>
            <span className={styles.count}>{(templates ?? []).filter((template) => used.has(template.tag)).length}</span>
          </button>
        ) : null}
        <button type="button" className={styles.family} data-active={!searching && view === "common" ? "" : undefined} onClick={() => choose("common")}>
          <span>Vanligast hos dig</span>
        </button>
        <div className={styles.sideLabel}>Efter uppgift</div>
        {FAMILIES.filter((item) => (counts.get(item.id) ?? 0) > 0).map((item) => (
          <button key={item.id} type="button" className={styles.family} data-active={!searching && view === item.id ? "" : undefined} onClick={() => choose(item.id)}>
            <span>{item.label}</span>
            <span className={styles.count}>{counts.get(item.id)}</span>
          </button>
        ))}
        <label className={styles.oneOff}>
          <input type="checkbox" checked={withOneOffs} onChange={(event) => setWithOneOffs(event.target.checked)} />
          Visa även scener som är byggda för en enda föreläsning
        </label>
      </nav>

      <main className={styles.main}>
        {/* Rubriken väntar på mallarna: vilken vy galleriet öppnas i beror på om det finns favoriter. */}
        {templates !== null ? (
          <>
            <h3 className={styles.heading}>{heading}</h3>
            <p className={styles.blurb}>{blurb}</p>
          </>
        ) : null}
        {favoriteError ? <p className={styles.error}>Favoriten sparades inte: {favoriteError}</p> : null}
        {templates === null ? (
          <div className={styles.empty}>{loadError ?? "Läser mallarna ur dina föreläsningar …"}</div>
        ) : page.length === 0 && view === "favorites" && !searching ? (
          <div className={styles.empty}>
            Inga favoriter än. Håll muspekaren över en mall och klicka på stjärnan, eller välj en mall och tryck F — så samlas de här, och galleriet öppnas på dem nästa gång.
          </div>
        ) : page.length === 0 ? (
          <div className={styles.empty}>Inget matchade. Pröva ett annat ord, eller slå på scenerna som är byggda för en enda föreläsning.</div>
        ) : (
          <div className={styles.grid}>
            {page.map((template) => (
              <div key={template.tag} className={styles.cardWrap}>
                <button
                  type="button"
                  className={styles.card}
                  data-active={template.tag === selectedTag ? "" : undefined}
                  onClick={() => select(template.tag)}
                  onDoubleClick={() => {
                    select(template.tag);
                    if (template.examples[0]) void loadExampleSlide(template.examples[0].slug, template.examples[0].slide).then((result) => result.ok && onInsert(result.slide));
                    else onInsert(createDefaultSlide(template.tag) as ParsedComponent);
                  }}
                >
                  {thumbOf(template, template.examples[0])}
                  {used.has(template.tag) && view !== "here" ? <span className={styles.here}>används här</span> : null}
                  <span className={styles.cardText}>
                    <span className={styles.cardName}>{readableName(template.tag)}</span>
                    <span className={styles.cardMeta}>
                      {template.decks > 0 ? `${template.uses} ggr · ${template.decks} ${template.decks === 1 ? "föreläsning" : "föreläsningar"}` : "inte använd än"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.star}
                  data-on={favoriteSet.has(template.tag) ? "" : undefined}
                  aria-pressed={favoriteSet.has(template.tag)}
                  aria-label={favoriteSet.has(template.tag) ? `Ta bort ${readableName(template.tag)} från favoriter` : `Gör ${readableName(template.tag)} till favorit`}
                  title={favoriteSet.has(template.tag) ? "Favorit — klicka för att ta bort" : "Gör till favorit"}
                  onClick={() => toggleFavoriteTag(template.tag)}
                >
                  {favoriteSet.has(template.tag) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}
        {shown.length > page.length ? (
          <button type="button" className={styles.more} onClick={() => setLimit((current) => current + PAGE)}>
            Visa fler ({shown.length - page.length} kvar)
          </button>
        ) : null}
      </main>

      <aside className={styles.detail} aria-label="Vald mall">
        {selected ? (
          <>
            <div className={styles.stage} ref={stageRef}>
              {showsSwap ? (
                swap ? (
                  <SlideStage
                    slide={swap.slide}
                    theme={theme}
                    slideKey={`${selected.tag}-${previewMode}-${targetKey ?? "tom"}`}
                    controlsHost={stepHost}
                    className={styles.stageLive}
                    fallbackClassName={styles.stageFallback}
                  />
                ) : (
                  <div className={styles.stageFallback}>Läser exemplet …</div>
                )
              ) : example ? (
                <iframe
                  key={`${example.slug}-${example.slide}-${theme}`}
                  title={`Förhandsvisning av ${selected.tag}`}
                  src={`/preview-slide/${example.slug}/${example.slide}?theme=${encodeURIComponent(theme)}`}
                  sandbox="allow-scripts allow-same-origin"
                  style={{ transform: `scale(${stageScale})` }}
                />
              ) : null}
            </div>
            {previewModes.length > 1 ? (
              <div className={styles.previewTabs} role="group" aria-label="Förhandsvisning">
                {previewModes.map((mode) => (
                  <button key={mode} type="button" aria-pressed={mode === previewMode} onClick={() => setPreviewChoice(mode)}>
                    {PREVIEW_LABELS[mode]}
                  </button>
                ))}
                <div className={styles.stepHost} ref={setStepHost} />
              </div>
            ) : null}
            <p className={styles.stageHint} data-warn={showsSwap && swap && (swap.textWent === "notes" || swap.wordsFit === "list-expected") ? "" : undefined}>
              {showsSwap
                ? swap?.textWent === "notes"
                  ? "Den här mallen har inget textfält som tar emot orden — de hamnar i manus, och sliden ser ut så här tills du fyller i den."
                  : swap?.wordsFit === "list-expected"
                    ? "Dina ord syns inte här: mallen läser sitt innehåll som en lista, rad för rad, och dina ord är löpande text. De följer med i innehållsfältet — se formatet under Exemplet."
                    : `Så blir sliden: dina ord i mallens huvudfält, ${previewMode === "own" ? "resten av formen från exemplet" : "i övrigt mallens standardvärden"}. Stega med piltangenterna.`
                : replacing && replaceSource && !ownWords && example
                  ? "Sliden har inga egna ord än, så förhandsvisningen visar exemplet. Klicka i bilden och stega med piltangenterna."
                  : example
                    ? "Levande förhandsvisning i den här föreläsningens tema. Klicka i bilden och stega med piltangenterna."
                    : "Mallen har inte använts än, så det finns inget exempel att visa."}
            </p>

            <div className={styles.detailHead}>
              <h3 className={styles.detailName}>{readableName(selected.tag)}</h3>
              <button
                type="button"
                className={styles.favToggle}
                aria-pressed={favoriteSet.has(selected.tag)}
                title="Tangent: F"
                onClick={() => toggleFavoriteTag(selected.tag)}
              >
                <span aria-hidden="true">{favoriteSet.has(selected.tag) ? "★" : "☆"}</span> {favoriteSet.has(selected.tag) ? "Favorit" : "Gör till favorit"}
              </button>
            </div>
            <span className={styles.detailTag}>&lt;{selected.tag}&gt;</span>
            {selected.description ? <p className={styles.detailText}>{selected.description}</p> : null}
            <p className={styles.detailText}>
              {selected.decks > 0 ? `Används ${selected.uses} gånger i ${selected.decks} ${selected.decks === 1 ? "föreläsning" : "föreläsningar"}.` : "Har inte använts i någon föreläsning än."}
              {example ? ` Exemplet: ${example.deckTitle}, slide ${example.slide}${example.scene ? ` · scen ${example.scene}` : ""}.` : ""}
            </p>

            <div className={styles.actions}>
              {example ? (
                <button type="button" className={emptyIsPrimary ? styles.secondary : styles.primary} disabled={busy} onClick={() => void insertExample()}>
                  {busy ? (replacing ? "Byter …" : "Lägger till …") : replacing ? "Använd som exemplet" : "Lägg till som exemplet"}
                </button>
              ) : null}
              {selected.hasSchema ? (
                <button type="button" className={example && !emptyIsPrimary ? styles.secondary : styles.primary} onClick={insertEmpty}>
                  {replacing ? "Använd tom" : "Lägg till tom"}
                </button>
              ) : null}
            </div>
            <p className={styles.detailText}>
              {replacing
                ? "Sliden behåller sitt syfte, sin tid, sin akt, instruktionen till Claude, sitt manus och sitt id. Orden du har skrivit hamnar i mallens huvudfält; resten av formen kommer från exemplet."
                : example
                  ? "Som exemplet: samma form och innehåll, utan manus och planeringsfält. Byt texten i slide-editorn."
                  : "Tom: mallens standardvärden, redo att fyllas i."}
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}

            {selected.examples.length > 1 ? (
              <>
                <div className={styles.sectionLabel}>{selected.examples[0]?.scene ? "Scener" : "Fler exempel"}</div>
                <div className={styles.examples}>
                  {selected.examples.map((item, index) => (
                    <button
                      key={exampleKey(selected.tag, item)}
                      type="button"
                      className={styles.example}
                      data-active={index === exampleIndex ? "" : undefined}
                      title={`${item.deckTitle} · slide ${item.slide}${item.text ? ` · ${item.text}` : ""}`}
                      onClick={() => setExampleIndex(index)}
                    >
                      {thumbOf(selected, item)}
                      <small>{item.scene ?? item.deckTitle}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className={styles.placeholder}>
            Välj en mall för att se den levande, i den här föreläsningens tema.
            <br />
            {replacing ? "Dubbelklick byter direkt." : "Dubbelklick lägger till direkt."}
          </div>
        )}
      </aside>
      {workers}
    </div>
  );
}
