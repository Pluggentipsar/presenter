"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CORNER_LABELS,
  DEFAULT_EXPORT,
  ENCODER_LABELS,
  EXTRA_LABELS,
  LAYOUT_LABELS,
  LAYOUT_NEEDS,
  MODE_LABELS,
  PLACEMENT_LABELS,
  SIZE_LABELS,
  type BoxCorner,
  type BoxSize,
  type ExportFile,
  type ExportLayout,
  type ExportSettings,
  type ExportStatus,
  type ExportTools,
  type ExtraTrack,
  type PersonPlacement,
  type RecordingManifest,
} from "@/lib/recording/types";
import { chaptersOf, clock } from "@/lib/recording/timeline";
import { PersonPlan } from "./PersonPlan";
import type { Avskrift } from "@/lib/recording/avskrift";
import s from "./inspelningar.module.css";

/**
 * Inspelningssidan (/<slug>/inspelningar, 2 oktober 2026): deckets inspelningar, kapitlen ur tidslinjen
 * och exporten till en färdig film med valbara separata spår. Se docs/INSPELNING.md.
 */

const LAYOUT_HINTS: Record<ExportLayout, string> = {
  ruta: "Hela sliden, och du i en rundad ruta i ett hörn.",
  frilagd: "Du utan bakgrund: stor i ytan som filmdecken lämnar fri, eller liten i hörnet. Försvinner vid helbild.",
  sida: "Sliden till vänster och du i en smal bild till höger.",
  slides: "Sliden i hela bilden och ditt ljud. Bra för en ren skärminspelning.",
  kamera: "Bara kameran och ljudet.",
  ljud: "En ljudfil med kapitel per slide, och kapitlen som text.",
};

const megabytes = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB` : bytes >= 100 * 1024 ? `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;

/** ”2 oktober kl. 12.31” (datorns egen tid, både på servern och i webbläsaren). */
const when = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })} kl. ${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")}`;
};

type ImportResult = { slug: string; id: string; title: string; deckExists: boolean };

/**
 * Ta in inspelningar från en annan dator: välj inspelningens mapp (eller en mapp med flera). Varje
 * mapp med ett inspelning.json skickas spår för spår till servern, manifestet sist.
 */
async function importRecordings(files: File[], report: (text: string) => void): Promise<ImportResult[]> {
  const groups = new Map<string, File[]>();
  for (const file of files) {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const folder = relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : "";
    if (/(^|\/)export(\/|$)/.test(folder)) continue;
    groups.set(folder, [...(groups.get(folder) ?? []), file]);
  }
  const done: ImportResult[] = [];
  for (const [folder, list] of groups) {
    const manifestFile = list.find(file => file.name === "inspelning.json");
    if (!manifestFile) continue;
    const manifest = JSON.parse(await manifestFile.text()) as RecordingManifest;
    const put = async (file: File, name: string) => {
      report(`Importerar ${manifest.id}: ${name} (${megabytes(file.size)}) …`);
      const response = await fetch(`/api/inspelning/import?${new URLSearchParams({ slug: manifest.slug, id: manifest.id, file: name })}`, { method: "PUT", body: file });
      if (!response.ok) throw new Error(await response.text());
    };
    try {
      for (const info of Object.values(manifest.tracks)) {
        const file = list.find(candidate => candidate.name === info?.file);
        if (!info || !file) throw new Error(`${info?.file ?? "Ett spår"} saknas i ${folder || "mappen"}.`);
        await put(file, info.file);
      }
      await put(manifestFile, "inspelning.json");
      const response = await fetch("/api/inspelning/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: manifest.slug, id: manifest.id }) });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json() as { deckExists: boolean };
      done.push({ slug: manifest.slug, id: manifest.id, title: manifest.title, deckExists: result.deckExists });
    } catch (error) {
      await fetch(`/api/inspelning/import?${new URLSearchParams({ slug: manifest.slug, id: manifest.id })}`, { method: "DELETE" });
      throw new Error(`${manifest.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!done.length) throw new Error("Hittade ingen inspelning (inspelning.json) i mappen.");
  return done;
}

type DownloadState = { state: "hämtar" | "klar" | "fel"; got: number; total: number; message?: string };

/**
 * Hämta avskriftens modeller till den här datorn (en gång): KB-Whisper large och VoxRex, eller den
 * mindre KB-Whisper medium för en dator utan kraftfullt grafikkort.
 */
function ModelDownload({ onReady, only }: { onReady: () => void; only?: "voxrex" }) {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [error, setError] = useState("");
  const keys = Object.keys(downloads);
  const busy = keys.some(key => downloads[key].state === "hämtar");

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => {
      const response = await fetch("/api/inspelning/modeller", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { downloads: Record<string, DownloadState> };
      setDownloads(data.downloads);
      const states = Object.values(data.downloads);
      if (states.length && states.every(state => state.state === "klar")) onReady();
    }, 1000);
    return () => clearInterval(timer);
  }, [busy, onReady]);

  const start = async (models: string[]) => {
    setError("");
    for (const model of models) {
      const response = await fetch("/api/inspelning/modeller", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model }) });
      if (!response.ok) { setError(await response.text()); return; }
      const state = await response.json() as DownloadState;
      setDownloads(previous => ({ ...previous, [model]: state }));
    }
  };

  const got = keys.reduce((sum, key) => sum + downloads[key].got, 0);
  const total = keys.reduce((sum, key) => sum + downloads[key].total, 0);
  const failed = keys.map(key => downloads[key]).find(state => state.state === "fel");
  return (
    <div className={s.form}>
      {only === "voxrex"
        ? <p className={s.note}>Ordtiderna blir exaktare med VoxRex (0,6 GB, hämtas en gång).</p>
        : <p className={s.note}>Avskriften behöver KB-Whisper, som hämtas en gång till den här datorn: large (1,1 GB) ger bäst text och vill ha ett grafikkort, medium (0,5 GB) går snabbare på en enklare dator. VoxRex (0,6 GB) gör ordtiderna exakta. Modellerna är fria (KBLab: Apache-2.0 och CC0) och kontrolleras mot sina kontrollsummor.</p>}
      <div className={s.actions}>
        {only === "voxrex"
          ? <button type="button" className={s.secondary} disabled={busy} onClick={() => void start(["voxrex"])}>Hämta VoxRex</button>
          : <>
              <button type="button" className={s.primary} disabled={busy} onClick={() => void start(["kb-whisper-large", "voxrex"])}>Hämta modellerna (1,7 GB)</button>
              <button type="button" className={s.secondary} disabled={busy} onClick={() => void start(["kb-whisper-medium", "voxrex"])}>Den mindre (1,1 GB)</button>
            </>}
        {busy && <span className={s.note}>{megabytes(got)} av {megabytes(total)}</span>}
      </div>
      {busy && <div className={s.bar}><span style={{ width: `${total ? (got / total) * 100 : 0}%` }} /></div>}
      {(error || failed) && <p className={s.error}>{error || failed?.message}</p>}
    </div>
  );
}

function fileUrl(manifest: RecordingManifest, name: string, download = false): string {
  const params = new URLSearchParams({ slug: manifest.slug, id: manifest.id, file: name });
  if (download) params.set("ladda", "1");
  return `/api/inspelning?${params}`;
}

export function RecordingsView({ slug, title, recordings, titles, initialId }: { slug: string; title: string; recordings: RecordingManifest[]; titles: Record<string, string>; initialId?: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialId && recordings.some(r => r.id === initialId) ? initialId : recordings[0]?.id);
  const selected = recordings.find(r => r.id === selectedId) ?? recordings[0] ?? null;
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<{ text: string; error?: boolean; links?: ImportResult[] } | null>(null);

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setImporting(true);
    try {
      const done = await importRecordings(files, text => setImportNote({ text }));
      const here = done.filter(result => result.slug === slug);
      const elsewhere = done.filter(result => result.slug !== slug);
      setImportNote({ text: `Importerade ${done.length === 1 ? "inspelningen" : `${done.length} inspelningar`}.${elsewhere.length ? " Några hör till andra föreläsningar:" : ""}`, links: elsewhere });
      if (here.length) {
        setSelectedId(here[0].id);
        router.refresh();
      }
    } catch (error) {
      setImportNote({ text: error instanceof Error ? error.message : String(error), error: true });
    } finally {
      setImporting(false);
    }
  };

  const select = (id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <main className={s.page}>
      <header className={s.head}>
        <div>
          <p className={s.kicker}>Inspelningar</p>
          <h1>{title}</h1>
          <p className={s.lead}>Spela in i spelaren med tangenten I. Här blir inspelningen en färdig film, med kapitel per slide och de separata spåren om du vill klippa själv.</p>
        </div>
        <div className={s.actions}>
          <label className={s.secondary} title="Välj inspelningens mapp, till exempel en som du har kopierat från laptopen">
            {importing ? "Importerar …" : "Importera inspelning"}
            <input type="file" hidden multiple disabled={importing} onChange={event => void onImport(event)} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
          </label>
          <a className={s.back} href={`/${slug}/studio?mode=oversikt`}>Översikten</a>
          <a className={s.back} href={`/${slug}`}>Presentera</a>
        </div>
      </header>
      {importNote && (
        <p className={importNote.error ? s.error : s.note} role="status" style={{ marginTop: -12, marginBottom: 18 }}>
          {importNote.text}
          {importNote.links?.map(link => <span key={link.id}>{" "}{link.deckExists ? <a className={s.back} href={`/${link.slug}/inspelningar?id=${link.id}`}>{link.title}</a> : `${link.title} (decket ${link.slug} finns inte på den här datorn ännu; hämta senaste)`}</span>)}
        </p>
      )}
      {recordings.length === 0 ? (
        <p className={s.empty}>Inga inspelningar av den här föreläsningen ännu. Öppna den, tryck I och välj Spela in, eller importera en inspelning från en annan dator.</p>
      ) : (
        <div className={s.layout}>
          <nav className={s.list} aria-label="Inspelningar">
            {recordings.map(recording => (
              <button key={recording.id} type="button" aria-current={recording.id === selectedId} onClick={() => select(recording.id)}>
                <strong>{when(recording.started)}</strong>
                <span>{MODE_LABELS[recording.mode]} · {recording.durationMs ? clock(recording.durationMs / 1000) : "avbröts"}</span>
              </button>
            ))}
          </nav>
          {selected && <Recording key={selected.id} manifest={selected} titles={titles} deckTitle={title} />}
        </div>
      )}
    </main>
  );
}

function Recording({ manifest, titles, deckTitle }: { manifest: RecordingManifest; titles: Record<string, string>; deckTitle: string }) {
  const chapters = useMemo(() => chaptersOf(manifest, titles), [manifest, titles]);
  const players = useRef<HTMLVideoElement[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [state, setState] = useState<{ status: ExportStatus | null; files: ExportFile[]; tools: ExportTools | null }>({ status: null, files: [], tools: null });
  const [settings, setSettings] = useState<ExportSettings>(() => ({ ...DEFAULT_EXPORT, layout: manifest.tracks.slides ? DEFAULT_EXPORT.layout : manifest.tracks.kamera ? "kamera" : "ljud" }));
  const [error, setError] = useState("");
  const [avskrift, setAvskrift] = useState<Avskrift | null>(null);
  const setPerSlide = useCallback((perSlide: ExportSettings["perSlide"]) => setSettings(previous => ({ ...previous, perSlide })), [setSettings]);

  const has = (track: "ljud" | "kamera" | "slides") => Boolean(manifest.tracks[track]?.bytes);
  const running = state.status?.state === "kör";

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/inspelning/export?${new URLSearchParams({ slug: manifest.slug, id: manifest.id })}`, { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json() as typeof state;
    setState(next);
    // Avskriften (det som sades per slide), om den finns.
    const text = next.files.find(file => file.name === "avskrift.json");
    if (text) {
      const loaded = await fetch(fileUrl(manifest, "export/avskrift.json"), { cache: "no-store" });
      if (loaded.ok) setAvskrift(await loaded.json() as Avskrift);
    } else setAvskrift(null);
  }, [manifest]);

  useEffect(() => {
    let alive = true;
    const tick = async () => { if (alive) await refresh(); };
    void tick();
    return () => { alive = false; };
  }, [refresh]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), 1200);
    return () => clearInterval(timer);
  }, [running, refresh]);

  const available = (layout: ExportLayout): string | null => {
    const missing = LAYOUT_NEEDS[layout].filter(track => !has(track));
    if (missing.length) return `Inspelningen saknar ${missing.join(" och ")}.`;
    if (layout === "frilagd" && state.tools && !state.tools.matting) return state.tools.mattingNote ?? "Friläggningen går inte att köra här.";
    return null;
  };
  const extraAvailable = (extra: ExtraTrack): boolean => {
    if (extra === "slides") return has("slides");
    if (extra === "kamera") return has("kamera");
    if (extra === "mask" || extra === "du") return has("kamera") && Boolean(state.tools?.matting);
    return has("kamera") || has("ljud");
  };

  const start = async () => {
    setError("");
    const response = await fetch("/api/inspelning/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: manifest.slug, id: manifest.id, settings }) });
    if (!response.ok) setError(await response.text());
    await refresh();
  };
  const transcribe = async () => {
    setError("");
    const response = await fetch("/api/inspelning/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: manifest.slug, id: manifest.id, kind: "avskrift" }) });
    if (!response.ok) setError(await response.text());
    await refresh();
  };
  const cancel = async () => {
    await fetch(`/api/inspelning/export?${new URLSearchParams({ slug: manifest.slug, id: manifest.id })}`, { method: "DELETE" });
    await refresh();
  };

  const seek = (seconds: number) => {
    for (const video of players.current) if (video) video.currentTime = seconds;
  };

  const tracks = (["kamera", "slides", "ljud"] as const).filter(track => manifest.tracks[track]);
  const capture = manifest.tracks.slides?.capture;
  const film = state.files.find(file => file.name.startsWith("film-") || file.name === "ljud.m4a");
  const shown = playing ?? film?.name ?? null;
  const subtitles = state.files.some(file => file.name === "undertext.vtt");

  return (
    <div className={s.detail}>
      <section className={s.section}>
        <h2>{when(manifest.started)}</h2>
        {manifest.title !== deckTitle && <p className={s.meta}>{manifest.title}</p>}
        <p className={s.meta}>
          {MODE_LABELS[manifest.mode]} · {manifest.durationMs ? clock(manifest.durationMs / 1000) : "avbröts innan den sparades klart"}
          {" · "}{tracks.map(track => `${track} ${megabytes(manifest.tracks[track]!.bytes)}`).join(", ")}
          {manifest.devices?.microphone ? ` · ${manifest.devices.microphone}` : ""}{manifest.devices?.camera ? ` · ${manifest.devices.camera}` : ""}
        </p>
        {capture && capture !== "element" && <p className={s.note}>Slidesen spelades in {capture === "region" ? "som ett utsnitt av fliken: en öppen panel eller meny kan synas" : "som hela fliken"}.</p>}
        <p className={s.note}>
          Mappen: <code>presenter/.inspelningar/{manifest.slug}/{manifest.id}</code>{" · "}
          <button type="button" className={s.link} onClick={() => void fetch("/api/inspelning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visa", slug: manifest.slug, id: manifest.id }) })}>Visa mappen</button>
          {" "}(kopiera den till en annan dator och importera den där)
        </p>
        {manifest.ended && <p className={s.note}><a className={s.back} href={`/${manifest.slug}/lyssna?id=${manifest.id}`}>Lyssna med slides</a>: ljudet, och sliden som följer med klick för klick{avskrift ? ", med avskriften" : ""}.</p>}
        <div className={s.players}>
          {shown ? (
            <figure>
              {shown.endsWith(".m4a") || shown.endsWith(".wav")
                ? <audio ref={el => { if (el) players.current = [el as unknown as HTMLVideoElement]; }} src={fileUrl(manifest, `export/${shown}`)} controls preload="metadata" style={{ width: "100%" }} />
                : <video ref={el => { if (el) players.current = [el]; }} src={fileUrl(manifest, `export/${shown}`)} controls preload="metadata">
                    {subtitles && <track kind="subtitles" srcLang="sv" label="Svenska" src={fileUrl(manifest, "export/undertext.vtt")} default />}
                  </video>}
              <figcaption>{state.files.find(file => file.name === shown)?.label ?? shown}</figcaption>
            </figure>
          ) : (
            <>
              {has("slides") && <figure><video ref={el => { if (el) players.current[0] = el; }} src={fileUrl(manifest, manifest.tracks.slides!.file)} controls muted preload="metadata" /><figcaption>Slidesen, som de spelades in</figcaption></figure>}
              {has("kamera") && <figure><video ref={el => { if (el) players.current[1] = el; }} src={fileUrl(manifest, manifest.tracks.kamera!.file)} controls preload="metadata" /><figcaption>Kameran med ljudet</figcaption></figure>}
              {has("ljud") && <figure><audio ref={el => { if (el) players.current[2] = el as unknown as HTMLVideoElement; }} src={fileUrl(manifest, manifest.tracks.ljud!.file)} controls preload="metadata" style={{ width: "100%" }} /><figcaption>Ljudet</figcaption></figure>}
            </>
          )}
        </div>
      </section>

      {chapters.length > 0 && (
        <section className={s.section}>
          <h3>Kapitel · {chapters.length} slides</h3>
          <ol className={s.chapters}>
            {chapters.map(chapter => (
              <li key={`${chapter.index}-${chapter.start}`}>
                <button type="button" onClick={() => seek(chapter.start)} title={chapter.slideId}>
                  <span className={s.time}>{clock(chapter.start)}</span>
                  <span className={s.title}>{chapter.title}</span>
                  {chapter.full ? <span className={s.tag}>helbild</span> : <span />}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={s.section}>
        <h3>Avskrift</h3>
        {!state.tools ? <p className={s.note}>Kontrollerar Avskrifts verktyg …</p> : !state.tools.transcribe ? (
          state.tools.models?.tools ? <ModelDownload onReady={() => void refresh()} /> : <p className={s.note}>{state.tools.transcribeNote}</p>
        ) : (
          <div className={s.actions}>
            <button type="button" className={avskrift ? s.secondary : s.primary} disabled={running || !manifest.ended} onClick={() => void transcribe()}>{avskrift ? "Transkribera igen" : "Transkribera"}</button>
            <p className={s.note}>Det du sa, ord för ord, per slide och klicksteg, med undertexter till filmen. KB-Whisper på den här datorn; inget lämnar den.{state.tools.transcribeNote && state.tools.models?.voxrex !== false ? ` ${state.tools.transcribeNote}` : ""}</p>
          </div>
        )}
        {state.tools?.transcribe && state.tools.models && !state.tools.models.voxrex && <ModelDownload only="voxrex" onReady={() => void refresh()} />}
        {avskrift && (
          <div className={s.transcript}>
            {avskrift.slides.map(slide => (
              <article key={`${slide.index}-${slide.start}`}>
                <h4><button type="button" className={s.link} onClick={() => seek(slide.start)}>{clock(slide.start)}</button> {slide.title}</h4>
                {slide.steps.length ? slide.steps.map((step, i) => <p key={i}>{step.text}</p>) : <p className={s.note}>(inget sades här)</p>}
              </article>
            ))}
            <p className={s.note}>{avskrift.model}{avskrift.aligned ? ", ordtider justerade med VoxRex" : ""} · {avskrift.words.length} ord. Ladda ned texten, undertexterna eller datan under Filerna.</p>
          </div>
        )}
      </section>

      <section className={s.section}>
        <h3>Exportera</h3>
        {!state.tools ? <p className={s.note}>Kontrollerar ffmpeg och grafikkortet …</p> : !state.tools.ffmpeg ? (
          <p className={s.error}>Hittar inte ffmpeg på den här datorn. Installera det med <code>winget install Gyan.FFmpeg</code> och starta om servern.</p>
        ) : (
          <div className={s.form}>
            <fieldset className={s.layouts} disabled={running}>
              {(Object.keys(LAYOUT_LABELS) as ExportLayout[]).map(layout => {
                const reason = available(layout);
                return (
                  <label key={layout} title={reason ?? undefined}>
                    <input type="radio" name="layout" value={layout} checked={settings.layout === layout} disabled={Boolean(reason)} onChange={() => setSettings({ ...settings, layout })} />
                    <span>{LAYOUT_LABELS[layout]}</span>
                    <small>{reason ?? LAYOUT_HINTS[layout]}</small>
                  </label>
                );
              })}
            </fieldset>
            {(settings.layout === "ruta" || settings.layout === "frilagd") && (
              <div className={s.row}>
                {settings.layout === "frilagd" && <label>Placering <select value={settings.placement} disabled={running} onChange={event => setSettings({ ...settings, placement: event.target.value as PersonPlacement })}>{(Object.keys(PLACEMENT_LABELS) as PersonPlacement[]).map(placement => <option key={placement} value={placement}>{PLACEMENT_LABELS[placement]}</option>)}</select></label>}
                {settings.layout === "ruta" && <label>Hörn <select value={settings.corner} disabled={running} onChange={event => setSettings({ ...settings, corner: event.target.value as BoxCorner })}>{(Object.keys(CORNER_LABELS) as BoxCorner[]).map(corner => <option key={corner} value={corner}>{CORNER_LABELS[corner]}</option>)}</select></label>}
                <label>Storlek <select value={settings.size} disabled={running} onChange={event => setSettings({ ...settings, size: event.target.value as BoxSize })}>{(Object.keys(SIZE_LABELS) as BoxSize[]).map(size => <option key={size} value={size}>{SIZE_LABELS[size]}</option>)}</select></label>
              </div>
            )}
            {(settings.layout === "ruta" || settings.layout === "frilagd") && has("slides") && (
              <details className={s.planDetails} open>
                <summary>Du i filmen, slide för slide</summary>
                <PersonPlan manifest={manifest} titles={titles} settings={settings} onChange={setPerSlide} />
              </details>
            )}
            <div className={s.row}>
              <label><input type="checkbox" checked={settings.loudness} disabled={running} onChange={event => setSettings({ ...settings, loudness: event.target.checked })} /> Jämna ut ljudnivån (−16 LUFS, som YouTube och poddar)</label>
            </div>
            <fieldset className={s.extras} disabled={running}>
              <legend>Separata spår, för att klippa själv</legend>
              {(Object.keys(EXTRA_LABELS) as ExtraTrack[]).filter(extraAvailable).map(extra => (
                <label key={extra}>
                  <input type="checkbox" checked={settings.extras.includes(extra)} onChange={event => setSettings({ ...settings, extras: event.target.checked ? [...settings.extras, extra] : settings.extras.filter(item => item !== extra) })} />
                  <span>{EXTRA_LABELS[extra]}</span>
                </label>
              ))}
            </fieldset>
            <div className={s.actions}>
              <button type="button" className={s.primary} disabled={running || !manifest.ended || Boolean(available(settings.layout))} onClick={() => void start()}>Exportera</button>
              {running && <button type="button" className={s.secondary} onClick={() => void cancel()}>Avbryt</button>}
              <p className={s.note}>{state.tools.encoder ? ENCODER_LABELS[state.tools.encoder] : "Ingen H.264-kodare fungerar på den här datorn."}{settings.layout === "frilagd" ? " Friläggningen görs en gång per inspelning och sparas till nästa export." : ""}</p>
            </div>
            {!manifest.ended && <p className={s.error}>Inspelningen avslutades aldrig (fönstret stängdes eller servern stannade). Spåren finns kvar i mappen.</p>}
            {error && <p className={s.error}>{error}</p>}
          </div>
        )}
      </section>

      {state.status && (
        <section className={s.section} aria-live="polite">
          <h3>{state.status.kind === "avskrift"
            ? (state.status.state === "kör" ? "Transkriberar" : state.status.state === "klar" ? "Avskriften är klar" : state.status.state === "avbruten" ? "Avbruten" : "Avskriften misslyckades")
            : (state.status.state === "kör" ? "Exporterar" : state.status.state === "klar" ? "Klar" : state.status.state === "avbruten" ? "Avbruten" : "Exporten misslyckades")}</h3>
          <ol className={s.steps}>
            {state.status.steps.map((step, i) => (
              <li key={step} data-state={i < state.status!.step || state.status!.state === "klar" ? "klar" : i === state.status!.step && state.status!.state === "kör" ? "nu" : undefined}>
                {step}{i === state.status!.step && state.status!.state === "kör" ? ` ${state.status!.percent} %` : ""}
              </li>
            ))}
          </ol>
          {state.status.state === "kör" && <div className={s.bar}><span style={{ width: `${Math.round(((state.status.step + state.status.percent / 100) / Math.max(1, state.status.steps.length)) * 100)}%` }} /></div>}
          {state.status.message && state.status.state !== "kör" && <pre className={s.error} style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{state.status.message}</pre>}
        </section>
      )}

      {state.files.length > 0 && (
        <section className={s.section}>
          <h3>Filerna</h3>
          <ul className={s.files}>
            {state.files.map(file => (
              <li key={file.name}>
                <span>{file.label} <code>{file.name}</code></span>
                <span className={s.size}>{megabytes(file.bytes)}</span>
                <span>
                  {/\.(mp4|m4a|wav)$/.test(file.name) && <><button type="button" onClick={() => setPlaying(file.name)}>Visa</button>{" · "}</>}
                  {/\.(md|srt|vtt|txt|json)$/.test(file.name) && <><a href={fileUrl(manifest, `export/${file.name}`)} target="_blank" rel="noreferrer">Öppna</a>{" · "}</>}
                  <a href={fileUrl(manifest, `export/${file.name}`, true)}>Ladda ned</a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
