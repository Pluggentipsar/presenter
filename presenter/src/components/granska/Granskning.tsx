"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STAGE_CHANNEL, STAGE_HEIGHT, STAGE_WIDTH, isStageMessage } from "@/lib/share/stage-protocol";
import { keptSteps } from "@/lib/step-config";
import { measure, type Flag, type FlagType } from "./measure";
import s from "./granska.module.css";

/** En slide som servern har läst ur decket (se app/[slug]/granska/page.tsx). */
export interface GranskaSlide {
  n: number;
  slideId: string;
  tag: string;
  label: string;
  hidden: boolean;
  skip: number[];
  final: boolean;
  clicks: { exact: number; open: boolean; silent: number };
  stated: number | null;
  schema: { fallback: boolean; missing: string[] };
}

interface StateResult {
  n: number;
  slideId: string;
  /** Mallens eget stegindex (0-baserat). */
  step: number;
  /** Läget som publiken ser: 1 … of. */
  index: number;
  of: number;
  flags: Flag[];
  minFont: number | null;
  image?: string;
  url?: string;
}

interface SlideResult {
  n: number;
  slideId: string;
  label: string;
  total: number;
  kept: number;
  flags: Flag[];
}

const LABELS: Record<FlagType, string> = {
  talare: "Talarens yta",
  marginal: "Textningsmarginal",
  utanfor: "Utanför bild",
  klippt: "Klippt text",
  liten: "Liten text",
  media: "Medier",
  konsol: "Konsolfel",
  prompt: "Prompt och svar",
  klick: "Klick mot manus",
  schema: "R-schema",
  laddning: "Laddning",
};
const ORDER = Object.keys(LABELS) as FlagType[];
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const pad = (n: number) => String(n).padStart(2, "0");
/** Vänta tills villkoret gäller, högst ms millisekunder. Timers fungerar även i en dold flik. */
async function until(test: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (test()) return true;
    await sleep(40);
  }
  return test();
}

export function Granskning({ slug, title, slides, greenscreen: filmDeck, manus }: { slug: string; title: string; slides: GranskaSlide[]; greenscreen: boolean; manus: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState("");
  const [states, setStates] = useState<StateResult[]>([]);
  const [slideResults, setSlideResults] = useState<SlideResult[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // tema: granska i ett annat tema än deckets (?tema=), som när T byter tema i spelaren.
  const [options, setOptions] = useState(() => ({ images: true, full: false, hidden: false, rest: 500, from: 1, to: slides.length, greenscreen: filmDeck, tema: "" }));
  const stop = useRef(false);
  const messages = useRef<((data: Record<string, unknown>) => void) | null>(null);
  const lastState = useRef<{ slide: number; step: number; totalSteps: number } | null>(null);
  const consoleErrors = useRef<string[]>([]);

  // Frågeparametrar: ?start=1 kör direkt, ?bilder=0, ?full=1, ?alla=1, ?vila=800, ?fran=5&till=12, ?tema=glas.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = {
      images: params.get("bilder") !== "0",
      full: params.get("full") === "1",
      hidden: params.get("alla") === "1",
      rest: Number(params.get("vila")) || 500,
      from: Math.max(1, Number(params.get("fran")) || 1),
      to: Math.min(slides.length, Number(params.get("till")) || slides.length),
      greenscreen: params.has("greenscreen") ? params.get("greenscreen") === "1" : filmDeck,
      // Ett okänt tema avvisas av granskningens API (och /scen visar då deckets eget); här räcker formen på namnet.
      tema: /^[a-z0-9_]{1,60}$/.test(params.get("tema") ?? "") ? params.get("tema") ?? "" : "",
    };
    setOptions(next);
    if (params.get("start") === "1") window.setTimeout(() => void run(next), 50);
    // run är stabil för den här sidans livslängd; körs bara vid start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (!isStageMessage(event.data)) return;
      const data = event.data as Record<string, unknown>;
      if (data.type === "state") lastState.current = { slide: Number(data.slide), step: Number(data.step), totalSteps: Number(data.totalSteps) };
      messages.current?.(data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /** Vänta på ett meddelande från scenrutan som uppfyller villkoret. */
  const waitFor = useCallback((test: (data: Record<string, unknown>) => boolean, ms: number) => new Promise<Record<string, unknown> | null>((resolve) => {
    const timer = window.setTimeout(() => { messages.current = null; resolve(null); }, ms);
    messages.current = (data) => {
      if (!test(data)) return;
      window.clearTimeout(timer);
      messages.current = null;
      resolve(data);
    };
  }), []);

  /**
   * Scenrutan laddas en gång i direktläge (?direkt=1): varje laddning av /scen
   * renderar hela decket, och direktläget byter slide utan Framers övergång, som
   * annars står stilla i en dold flik. Därefter visas varje slide med protokollet.
   */
  const openFrame = useCallback(async (first: number, tema: string) => {
    const iframe = frame.current!;
    const loaded = new Promise<void>((resolve) => iframe.addEventListener("load", () => resolve(), { once: true }));
    lastState.current = null;
    iframe.src = `/${slug}/scen?slide=${first}&step=0&direkt=1${tema ? `&tema=${tema}` : ""}&granska=${Date.now()}`;
    await loaded;
    const win = iframe.contentWindow! as Window & typeof globalThis;
    const doc = iframe.contentDocument!;
    // Fånga konsolfel från och med nu.
    const original = win.console.error.bind(win.console);
    win.console.error = (...args: unknown[]) => { consoleErrors.current.push(args.map(String).join(" ").slice(0, 200)); original(...args); };
    win.addEventListener("error", (e) => consoleErrors.current.push(String(e.message).slice(0, 200)));
    win.addEventListener("unhandledrejection", (e) => consoleErrors.current.push(String(e.reason).slice(0, 200)));
    // Granskningen ska vara tyst: poddar och låtar spelar annars en sekund per läge.
    const play = win.HTMLMediaElement.prototype.play;
    win.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) { this.muted = true; return play.call(this); };
    // Slutlägen i stället för övergångar; resan in visas som färdig.
    const style = doc.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important}[class*=travel]{opacity:1!important;transform:none!important}";
    doc.head.appendChild(style);
    // Läs via en funktion: TypeScript tror annars att ref:en fortfarande är null efter tilldelningen ovan.
    return until(() => lastState.current !== null, 30000);
  }, [slug]);

  const showSlide = useCallback(async (n: number) => {
    const current = () => lastState.current;
    frame.current!.contentWindow!.postMessage({ channel: STAGE_CHANNEL, type: "show", slide: n - 1, step: 0 }, window.location.origin);
    const ready = await until(() => current()?.slide === n - 1 && current()?.step === 0, 8000);
    // En mall utan klicksteg registrerar inget; ge den en stund innan den räknas som ett läge.
    await until(() => current()?.slide === n - 1 && (current()?.totalSteps ?? 0) > 0, 1500);
    const state = current();
    return { total: Math.max(1, state?.slide === n - 1 ? state.totalSteps : 1), doc: frame.current!.contentDocument!, timedOut: !ready };
  }, []);

  const settle = useCallback(async (doc: Document, rest: number) => {
    await sleep(rest);
    for (const animation of doc.getAnimations()) {
      try { if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish(); } catch { /* går inte att avsluta */ }
    }
    const media = [...doc.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video")].filter((el) =>
      el instanceof HTMLImageElement ? !el.complete : el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !el.error);
    if (media.length) {
      await Promise.race([
        Promise.all(media.map((el) => new Promise<void>((resolve) => {
          el.addEventListener("load", () => resolve(), { once: true });
          el.addEventListener("loadeddata", () => resolve(), { once: true });
          el.addEventListener("error", () => resolve(), { once: true });
        }))),
        sleep(4000),
      ]);
    }
    await sleep(60);
  }, []);

  const captureState = useCallback(async (name: string, full: boolean) => {
    const id = `${name}-${Date.now()}`;
    const reply = waitFor((d) => d.type === "captured" && d.id === id, 25000);
    frame.current!.contentWindow!.postMessage({ channel: STAGE_CHANNEL, type: "capture", id, scale: full ? 1 : 0.5, format: "image/webp", quality: 0.82 }, window.location.origin);
    const data = await reply;
    return data?.blob instanceof Blob ? data.blob : null;
  }, [waitFor]);

  const run = useCallback(async (opts: typeof options) => {
    setRunning(true);
    setDone(false);
    setSaved(null);
    setSaveError(null);
    setStates([]);
    setSlideResults([]);
    stop.current = false;
    const allStates: StateResult[] = [];
    const allSlides: SlideResult[] = [];
    // Granskningens API. Med ett annat tema hamnar rapporten i .granska/<slug>--<tema>/.
    const api = (file?: string) => `/api/granska?slug=${slug}${opts.tema ? `&tema=${opts.tema}` : ""}${file ? `&fil=${file}` : ""}`;
    if (opts.images) await fetch(api(), { method: "DELETE" }).catch(() => null);
    const chosen = slides.filter((sl) => sl.n >= opts.from && sl.n <= opts.to && (opts.hidden || !sl.hidden));
    setProgress("Laddar decket …");
    const opened = chosen.length ? await openFrame(chosen[0].n, opts.tema) : true;

    for (const [i, slide] of chosen.entries()) {
      if (stop.current) break;
      setProgress(`Slide ${slide.n} av ${slides.length} (${i + 1}/${chosen.length})`);
      consoleErrors.current = [];
      const slideFlags: Flag[] = [];
      const { total, doc, timedOut } = await showSlide(slide.n);
      if (!opened || timedOut) slideFlags.push({ typ: "laddning", text: "Scenrutan visade inte sliden. Kontrollera den i presentationsvyn." });
      const kept = keptSteps(Math.max(1, total), slide.final ? { final: true } : slide.skip.length ? { skip: slide.skip } : undefined);
      let previous = new Set<string>();

      for (const [j, step] of kept.entries()) {
        if (stop.current) break;
        setProgress(`Slide ${slide.n} av ${slides.length} · läge ${j + 1} av ${kept.length}`);
        if (step !== 0 || j !== 0) {
          frame.current!.contentWindow!.postMessage({ channel: STAGE_CHANNEL, type: "show", slide: slide.n - 1, step }, window.location.origin);
          if (!(await until(() => lastState.current?.slide === slide.n - 1 && lastState.current?.step === step, 6000))) {
            slideFlags.push({ typ: "laddning", text: `Läge ${j + 1} bekräftades inte av scenrutan.` });
          }
        }
        const errorsBefore = consoleErrors.current.length;
        await settle(doc, opts.rest);
        const m = measure(doc, frame.current!.contentWindow!, opts.greenscreen);
        const flags = [...m.flags];
        // Prompt före svar: en ny prompt och ett nytt svar får inte komma på samma klick.
        const now = new Set(m.senders.map((x) => x.key));
        const fresh = m.senders.filter((x) => !previous.has(x.key));
        if (fresh.some((x) => x.who === "human") && fresh.some((x) => x.who === "ai")) {
          flags.push({ typ: "prompt", text: j === 0 ? "Prompt och svar syns redan i första läget." : "En ny prompt och ett nytt svar kommer på samma klick." });
        }
        previous = now;
        const errors = consoleErrors.current.slice(errorsBefore);
        if (errors.length) flags.push({ typ: "konsol", text: `Konsolfel: ${[...new Set(errors)].slice(0, 3).join(" · ")}` });
        const result: StateResult = { n: slide.n, slideId: slide.slideId, step, index: j + 1, of: kept.length, flags, minFont: m.minFont };
        if (opts.images) {
          const name = `${pad(slide.n)}-${pad(j + 1)}-${(slide.slideId || slide.tag).toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
          const blob = await captureState(name, opts.full);
          if (blob) {
            result.image = `bilder/${name}.webp`;
            result.url = URL.createObjectURL(blob);
            await fetch(api(result.image), { method: "PUT", body: blob }).catch(() => null);
          } else flags.push({ typ: "laddning", text: "Bilden kunde inte fångas." });
        }
        allStates.push(result);
        setStates([...allStates]);
      }

      // Klick mot manus och fält utan R-schema, per slide.
      if (!manus) { /* frontmattern säger manus: false, till exempel i formkatalogen */ }
      else if (!slide.clicks.open && slide.clicks.exact !== kept.length - 1) slideFlags.push({ typ: "klick", text: `${slide.clicks.exact} [Klick] i Notes men ${kept.length - 1} klick (${kept.length} lägen).` });
      if (manus && slide.stated !== null && slide.stated !== kept.length) slideFlags.push({ typ: "klick", text: `Lägesbeskrivningen säger ${slide.stated}, spelaren visar ${kept.length}.` });
      if (manus && slide.clicks.silent > 0) slideFlags.push({ typ: "klick", text: `${slide.clicks.silent} klick utan tal eller anvisning emellan.` });
      if (slide.schema.fallback) slideFlags.push({ typ: "schema", text: `${slide.tag} saknar eget R-schema (reservformulär).` });
      else if (slide.schema.missing.length) slideFlags.push({ typ: "schema", text: `Fält utan R-schema: ${slide.schema.missing.join(", ")}` });
      allSlides.push({ n: slide.n, slideId: slide.slideId, label: slide.label, total, kept: kept.length, flags: slideFlags });
      setSlideResults([...allSlides]);
    }

    setProgress(stop.current ? "Avbruten." : "Klar.");
    setRunning(false);
    setDone(true);
    const report = buildReport(slug, title, allSlides, allStates, opts);
    // Kan rapporten inte sparas visas serverns skäl, i stället för att felet försvinner tyst.
    const put = (file: string, body: string) => fetch(api(file), { method: "PUT", body })
      .then(async (r) => (r.ok ? null : `${r.status} ${(await r.text()).trim()}`.trim()))
      .catch((error: unknown) => String(error));
    const failed = (await put("rapport.json", JSON.stringify(report.json, null, 2))) ?? (await put("rapport.md", report.markdown));
    setSaved(failed ? null : `presenter/.granska/${opts.tema ? `${slug}--${opts.tema}` : slug}/`);
    setSaveError(failed ? `Rapporten kunde inte sparas: ${failed}` : null);
    (window as unknown as { __granskning?: unknown }).__granskning = report.json;
  }, [slides, slug, title, manus, openFrame, showSlide, settle, captureState]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ORDER.map((t) => [t, 0])) as Record<FlagType, number>;
    for (const st of states) for (const f of st.flags) c[f.typ]++;
    for (const sl of slideResults) for (const f of sl.flags) c[f.typ]++;
    return c;
  }, [states, slideResults]);

  const flaggedStates = states.filter((st) => st.flags.length);
  const flaggedSlides = slideResults.filter((sl) => sl.flags.length);

  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className={s.kicker}>Granskning · {slug}{options.tema ? ` · tema ${options.tema}` : ""}</p>
        <h1>{title}</h1>
        <p className={s.lead}>Varje läge visas i 1600 × 900 och mäts mot kontraktet: talarens yta, textningsmarginalen, text utanför bild, klippt och liten text, trasiga medier, konsolfel och prompt före svar. Klick mot [Klick] i Notes och fält utan R-schema kontrolleras per slide. Se docs/GRANSKA.md.</p>
      </header>

      <section className={s.controls}>
        <label><input type="checkbox" checked={options.images} disabled={running} onChange={(e) => setOptions({ ...options, images: e.target.checked })} /> Fånga bilder</label>
        <label><input type="checkbox" checked={options.full} disabled={running || !options.images} onChange={(e) => setOptions({ ...options, full: e.target.checked })} /> Full storlek</label>
        <label><input type="checkbox" checked={options.hidden} disabled={running} onChange={(e) => setOptions({ ...options, hidden: e.target.checked })} /> Dolda reserver</label>
        <label title="Talarens yta och textningsmarginalen. Standard för deck med granska: greenscreen i frontmattern."><input type="checkbox" checked={options.greenscreen} disabled={running} onChange={(e) => setOptions({ ...options, greenscreen: e.target.checked })} /> Greenscreen</label>
        <label>Vila per läge <select value={options.rest} disabled={running} onChange={(e) => setOptions({ ...options, rest: Number(e.target.value) })}>{[300, 500, 900, 1500].map((v) => <option key={v} value={v}>{v} ms</option>)}</select></label>
        <label>Slides <input type="number" min={1} max={slides.length} value={options.from} disabled={running} onChange={(e) => setOptions({ ...options, from: Number(e.target.value) || 1 })} /> till <input type="number" min={1} max={slides.length} value={options.to} disabled={running} onChange={(e) => setOptions({ ...options, to: Number(e.target.value) || slides.length })} /></label>
        {running
          ? <button type="button" onClick={() => { stop.current = true; }}>Avbryt</button>
          : <button type="button" className={s.primary} onClick={() => void run(options)}>{done ? "Granska igen" : "Starta granskning"}</button>}
        <span className={s.progress} aria-live="polite">{progress}</span>
      </section>

      {(running || done) && <section className={s.summary} aria-label="Sammanfattning">
        <p><strong>{slideResults.length}</strong> slides · <strong>{states.length}</strong> lägen</p>
        <ul>{ORDER.map((t) => <li key={t} data-hit={counts[t] > 0 || undefined}>{LABELS[t]} <strong>{counts[t]}</strong></li>)}</ul>
        {saved && <p className={s.saved}>Rapport och bilder sparade i <code>{saved}</code></p>}
        {saveError && <p className={s.saved} role="alert">{saveError}</p>}
      </section>}

      {(flaggedSlides.length > 0 || flaggedStates.length > 0) && <section className={s.findings}>
        <h2>Att titta på</h2>
        <table>
          <thead><tr><th>Slide</th><th>Läge</th><th>Fynd</th></tr></thead>
          <tbody>
            {slideResults.map((sl) => {
              const rows = states.filter((st) => st.n === sl.n && st.flags.length);
              if (!sl.flags.length && !rows.length) return null;
              return [
                ...sl.flags.map((f, i) => <tr key={`${sl.n}-s-${i}`}><td>{sl.n} · <code>{sl.slideId}</code></td><td>alla</td><td><span className={s.tag} data-typ={f.typ}>{LABELS[f.typ]}</span> {f.text}</td></tr>),
                ...rows.flatMap((st) => st.flags.map((f, i) => <tr key={`${sl.n}-${st.index}-${i}`}><td>{sl.n} · <code>{sl.slideId}</code></td><td><a href={`/${slug}/scen?slide=${st.n}&step=${st.step}${options.tema ? `&tema=${options.tema}` : ""}`} target="_blank" rel="noreferrer">{st.index}/{st.of}</a></td><td><span className={s.tag} data-typ={f.typ}>{LABELS[f.typ]}</span> {f.text}</td></tr>)),
              ];
            })}
          </tbody>
        </table>
      </section>}

      {states.some((st) => st.url) && <section className={s.sheet} aria-label="Kontaktkarta">
        <h2>Kontaktkarta</h2>
        <ol>
          {states.map((st) => <li key={`${st.n}-${st.index}`} data-flagged={st.flags.length > 0 || undefined}>
            <a href={`/${slug}/scen?slide=${st.n}&step=${st.step}${options.tema ? `&tema=${options.tema}` : ""}`} target="_blank" rel="noreferrer">
              {st.url ? <img src={st.url} alt={`Slide ${st.n}, läge ${st.index} av ${st.of}`} loading="lazy" /> : <span className={s.noImage}>ingen bild</span>}
              <span>{st.n} · {st.index}/{st.of}{st.flags.length ? ` · ${st.flags.length} fynd` : ""}</span>
            </a>
          </li>)}
        </ol>
      </section>}

      <aside className={s.live} aria-label="Läget som granskas just nu">
        <iframe ref={frame} className={s.frame} title="Scenruta för granskningen" width={STAGE_WIDTH} height={STAGE_HEIGHT} tabIndex={-1} />
      </aside>
    </main>
  );
}

function buildReport(slug: string, title: string, slides: SlideResult[], states: StateResult[], opts: { images: boolean; full: boolean; hidden: boolean; rest: number; tema: string }) {
  const counts = Object.fromEntries(ORDER.map((t) => [t, 0])) as Record<FlagType, number>;
  for (const st of states) for (const f of st.flags) counts[f.typ]++;
  for (const sl of slides) for (const f of sl.flags) counts[f.typ]++;
  const when = new Date().toISOString();
  const json = {
    slug, title, granskad: when, installningar: opts,
    summa: { slides: slides.length, lagen: states.length, fynd: counts },
    // Bildernas blob-adresser gäller bara i den här fliken och sparas inte.
    slides: slides.map((sl) => ({ ...sl, lagen: states.filter((st) => st.n === sl.n).map((st) => ({ ...st, url: undefined })) })),
  };
  const lines = [
    `# Granskning · ${title}`,
    "",
    `\`${slug}\`${opts.tema ? ` i temat \`${opts.tema}\`` : ""} · ${when.slice(0, 16).replace("T", " ")} · ${slides.length} slides · ${states.length} lägen${opts.images ? ` · bilder i bilder/ (${opts.full ? "1600 × 900" : "800 × 450"})` : ""}`,
    "",
    "| Fynd | Antal |",
    "|---|---|",
    ...ORDER.map((t) => `| ${LABELS[t]} | ${counts[t]} |`),
    "",
    "## Per slide",
    "",
  ];
  for (const sl of slides) {
    const rows = states.filter((st) => st.n === sl.n);
    const hits = [...sl.flags.map((f) => `- ${LABELS[f.typ]}: ${f.text}`), ...rows.flatMap((st) => st.flags.map((f) => `- Läge ${st.index}/${st.of}: ${LABELS[f.typ]}: ${f.text}`))];
    const minFont = Math.min(...rows.map((st) => st.minFont ?? Infinity));
    lines.push(`### ${sl.n} · ${sl.slideId || "(utan slideId)"} · ${sl.label}`, "", `${sl.kept} lägen${sl.kept !== sl.total ? ` (mallen har ${sl.total})` : ""}${Number.isFinite(minFont) ? ` · minsta text ${minFont} px` : ""}${rows.some((st) => st.image) ? ` · ${rows.filter((st) => st.image).map((st) => st.image).join(", ")}` : ""}`, "", ...(hits.length ? hits : ["Inga fynd."]), "");
  }
  return { json, markdown: lines.join("\n") };
}
