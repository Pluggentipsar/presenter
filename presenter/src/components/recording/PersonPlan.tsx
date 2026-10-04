"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chaptersOf, clock, personSegments, type Chapter, type PersonSegment } from "@/lib/recording/timeline";
import {
  SIZE_LABELS,
  SLIDE_CHOICE_LABELS,
  isFreeLayout,
  slideKey,
  type BoxSize,
  type ExportSettings,
  type FreeRect,
  type RecordingManifest,
  type SlideChoice,
  type SlideChoiceMode,
} from "@/lib/recording/types";
import { FreePlacer, type PersonSummary } from "./FreePlacer";
import s from "./inspelningar.module.css";

/**
 * Du i filmen, slide för slide (2 oktober 2026). En rad per slide med en bildruta ur inspelningen och
 * Joel ovanpå, som filmen kommer att visa honom. För varje slide: som filmen (decket eller placeringen),
 * dold, liten i hörnet, stor i ytan eller fritt placerad, och en egen storlek. Fritt placerad öppnar
 * placeringsvyn (FreePlacer), där Joel drar och ändrar storleken; placeringen gäller bildläget den
 * gjordes i. Valen sparas per föreläsning.
 */

type Rect = { x: number; y: number; w: number; h: number; mx?: number };
type Rects = Record<"yta" | "horn" | "ruta", Record<BoxSize, Rect>>;
type Placing = { key: string; title: string; frames: { label: string; src: string }[]; initial: FreeRect; presets: { label: string; rect: FreeRect }[] };

const W = 1920;
const MODE_WORD: Record<PersonSegment["mode"], string> = { dold: "dold", horn: "liten i hörnet", yta: "stor i ytan", ruta: "i rutan", fri: "fritt placerad" };
const free = (rect: Rect): FreeRect => ({ x: rect.x, y: rect.y, w: rect.w });

function url(manifest: RecordingManifest, params: Record<string, string>) {
  return `/api/inspelning/forhand?${new URLSearchParams({ slug: manifest.slug, id: manifest.id, ...params })}`;
}

export function PersonPlan({ manifest, titles, settings, onChange }: {
  manifest: RecordingManifest;
  titles: Record<string, string>;
  settings: ExportSettings;
  onChange: (perSlide: Record<string, SlideChoice>) => void;
}) {
  const [rects, setRects] = useState<Rects | null>(null);
  const [cutout, setCutout] = useState(false);
  const [camera, setCamera] = useState(false);
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [placing, setPlacing] = useState<Placing | null>(null);
  const loaded = useRef(false);
  const hadChoices = useRef(Boolean(settings.perSlide));
  const save = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Måtten och de sparade valen för föreläsningen (en gång, och måtten igen när hörnet byts).
  useEffect(() => {
    let alive = true;
    void (async () => {
      const response = await fetch(url(manifest, { corner: settings.corner }), { cache: "no-store" });
      if (!response.ok || !alive) return;
      const data = await response.json() as { rects: Rects; cutout: boolean; camera: boolean; person: PersonSummary | null; perSlide: Record<string, SlideChoice> };
      setRects(data.rects);
      setCutout(data.cutout);
      setCamera(data.camera);
      setPerson(data.person);
      if (!loaded.current) {
        loaded.current = true;
        if (!hadChoices.current) onChange(data.perSlide);
      }
    })();
    return () => { alive = false; };
  }, [manifest, settings.corner, onChange]);

  const perSlide = useMemo(() => settings.perSlide ?? {}, [settings.perSlide]);
  const segments = useMemo(() => personSegments(manifest, settings), [manifest, settings]);
  const chapters = useMemo(() => chaptersOf(manifest, titles), [manifest, titles]);
  const at = (t: number) => segments.find(segment => t >= segment.start && t < segment.end) ?? null;
  const positions = useMemo(() => manifest.timeline.filter(event => event.type === "position"), [manifest]);
  const stepsOf = (chapter: Chapter) => positions.filter(event => event.index === chapter.index && event.t / 1000 >= chapter.start - 0.01 && event.t / 1000 < chapter.end);
  const freeLayout = isFreeLayout(settings.layout) ? settings.layout : null;

  /** Lagret som filmen visar under ett avsnitt, i filmens mått. */
  const layerOf = (segment: PersonSegment | null): Rect | null => {
    if (!rects || !segment || segment.mode === "dold") return null;
    if (segment.rect) {
      const { x, y, w } = segment.rect;
      const camera = person?.width || W;
      return { x, y, w, h: w * (settings.layout === "ruta" ? 3 / 4 : 9 / 16), mx: x + ((person?.center ?? camera / 2) * w) / camera };
    }
    return rects[segment.mode === "ruta" ? "ruta" : segment.mode === "horn" ? "horn" : "yta"][segment.size];
  };

  const update = (key: string, patch: Partial<SlideChoice>) => {
    const current = perSlide[key] ?? { mode: "deck" as SlideChoiceMode };
    const next: SlideChoice = { ...current, ...patch };
    const all = { ...perSlide };
    if (next.mode === "deck" && !next.size) delete all[key];
    else all[key] = next;
    onChange(all);
    if (save.current) clearTimeout(save.current);
    save.current = setTimeout(() => {
      void fetch(`/api/inspelning/forhand?${new URLSearchParams({ slug: manifest.slug })}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perSlide: all }) });
    }, 400);
  };
  const reset = () => {
    onChange({});
    void fetch(`/api/inspelning/forhand?${new URLSearchParams({ slug: manifest.slug })}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perSlide: {} }) });
  };

  /** Öppna placeringsvyn för en slide: en bildruta per klicksteg, och där du står nu. */
  const place = (chapter: Chapter) => {
    if (!rects || !freeLayout) return;
    const key = slideKey(chapter);
    const choice = perSlide[key];
    const size = choice?.size ?? settings.size;
    const steps = stepsOf(chapter);
    const seen = new Set<number>();
    const frames = steps.flatMap((event, i) => {
      const step = event.step ?? i + 1;
      if (seen.has(step)) return [];
      seen.add(step);
      const start = Math.max(chapter.start, event.t / 1000);
      const end = i + 1 < steps.length ? steps[i + 1].t / 1000 : chapter.end;
      return [{ step, t: Math.max(start, Math.min(end - 0.15, start + 1.5)) }];
    }).sort((a, b) => a.step - b.step);
    if (!frames.length) frames.push({ step: 1, t: chapter.start + Math.min(1.5, (chapter.end - chapter.start) / 2) });
    const last = frames[frames.length - 1];
    const presets = freeLayout === "ruta"
      ? [{ label: "Rutan i hörnet", rect: free(rects.ruta[size]) }]
      : [{ label: "Stor i ytan", rect: free(rects.yta[size]) }, { label: "Liten i hörnet", rect: free(rects.horn[size]) }];
    const now = layerOf(at(last.t));
    setPlacing({
      key,
      title: chapter.title,
      frames: frames.map(frame => ({ label: `Klick ${frame.step}`, src: url(manifest, { t: frame.t.toFixed(1), stor: "1" }) })),
      initial: choice?.rects?.[freeLayout] ?? (now ? free(now) : presets[0].rect),
      presets,
    });
  };
  const closePlacer = useCallback(() => setPlacing(null), []);

  const modes: SlideChoiceMode[] = settings.layout === "ruta" ? ["deck", "dold", "fri"] : ["deck", "dold", "horn", "yta", "fri"];
  const changed = Object.keys(perSlide).length;

  return (
    <div className={s.plan}>
      <div className={s.actions}>
        <p className={s.note}>
          Bildrutorna är ur inspelningen{cutout ? ", och du är frilagd som i filmen" : "; du syns som siluett tills friläggningen är gjord"}.
          Klicka på en bildruta för att placera dig fritt.
          {changed ? ` ${changed} ${changed === 1 ? "slide har" : "slides har"} egna val.` : " Alla slides följer filmens regel."}
        </p>
        {changed > 0 && <button type="button" className={s.secondary} onClick={reset}>Återställ alla</button>}
      </div>
      <div className={s.planList}>
        {chapters.map(chapter => {
          const key = slideKey(chapter);
          const choice = perSlide[key];
          const placed = freeLayout ? choice?.rects?.[freeLayout] : undefined;
          // En fri placering som gjordes i ett annat bildläge gäller inte här: sliden följer filmen.
          const shown: SlideChoiceMode = choice?.mode === "fri" && !placed ? "deck" : choice?.mode ?? "deck";
          const t = chapter.start + Math.min(1.5, (chapter.end - chapter.start) / 2);
          const segment = at(t);
          const rect = layerOf(segment);
          const steps = stepsOf(chapter).map(event => at(event.t / 1000 + 0.02)?.mode ?? "dold");
          const words = steps.filter((mode, i) => i === 0 || mode !== steps[i - 1]).map(mode => MODE_WORD[mode]);
          return (
            <div key={`${key}-${chapter.start}`} className={s.planRow}>
              <button type="button" className={s.thumb} onClick={() => place(chapter)} aria-label={`Placera dig fritt på ${chapter.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url(manifest, { t: t.toFixed(1) })} alt="" loading="lazy" />
                {rect && settings.layout === "ruta" && (camera
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img className={s.box} src={url(manifest, { kamera: "1" })} alt="" style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.w / 19.2}%`, height: `${rect.h / 10.8}%` }} />
                  : <span className={s.box} style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.w / 19.2}%`, height: `${rect.h / 10.8}%` }} />)}
                {rect && settings.layout !== "ruta" && (cutout
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img className={s.person} src={url(manifest, { person: "1" })} alt="" style={{ left: `${rect.x / 19.2}%`, top: `${rect.y / 10.8}%`, width: `${rect.w / 19.2}%` }} />
                  : <span className={s.silhouette} style={{ left: `${((rect.mx ?? rect.x + rect.w / 2) - rect.h * 0.22) / 19.2}%`, top: `${(rect.y + rect.h * 0.22) / 10.8}%`, width: `${(rect.h * 0.44) / 19.2}%`, height: `${(rect.h * 0.78) / 10.8}%` }} />)}
              </button>
              <div className={s.planInfo}>
                <h4><span className={s.time}>{clock(chapter.start)}</span> {chapter.title}</h4>
                <p className={s.chips}>{words.length > 1 ? `Klicken: ${words.join(" → ")}` : `Du är ${words[0] ?? "dold"}`}</p>
                <div className={s.planControls}>
                  <select value={shown} onChange={event => {
                    const mode = event.target.value as SlideChoiceMode;
                    if (mode === "fri" && !placed) place(chapter);
                    else update(key, { mode });
                  }}>
                    {modes.map(mode => <option key={mode} value={mode}>{mode === "deck" ? (settings.layout === "ruta" ? "Som filmen (syns)" : "Som filmen") : mode === "fri" && !placed ? "Fritt placerad …" : SLIDE_CHOICE_LABELS[mode]}</option>)}
                  </select>
                  {shown !== "fri" && (
                    <select value={choice?.size ?? ""} onChange={event => update(key, { size: (event.target.value || undefined) as BoxSize | undefined })}>
                      <option value="">Storlek som filmen</option>
                      {(Object.keys(SIZE_LABELS) as BoxSize[]).map(size => <option key={size} value={size}>{SIZE_LABELS[size]}</option>)}
                    </select>
                  )}
                  <button type="button" className={s.link} onClick={() => place(chapter)}>{shown === "fri" ? "Ändra placeringen" : "Placera fritt"}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {placing && freeLayout && createPortal(
        <FreePlacer
          key={placing.key}
          title={placing.title}
          frames={placing.frames}
          personImage={freeLayout === "frilagd" && cutout ? url(manifest, { person: "1" }) : null}
          boxImage={freeLayout === "ruta" && camera ? url(manifest, { kamera: "1" }) : null}
          person={person}
          layout={freeLayout}
          initial={placing.initial}
          presets={placing.presets}
          onCancel={closePlacer}
          onSave={rect => {
            update(placing.key, { mode: "fri", rects: { ...(perSlide[placing.key]?.rects ?? {}), [freeLayout]: rect } });
            setPlacing(null);
          }}
        />,
        document.body,
      )}
    </div>
  );
}
