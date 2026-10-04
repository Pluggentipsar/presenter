"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LectureRecorder, cameraConstraints, microphoneConstraints, type RecorderPosition } from "@/lib/recording/recorder";
import { MODE_LABELS, MODE_TRACKS, type RecordingMode } from "@/lib/recording/types";
import { getPresenterChannel } from "@/lib/presenter-sync";

/**
 * Inspelningspanelen i spelaren (tangenten I, 2 oktober 2026). Välj läge, mikrofon och kamera, se
 * nivån och kamerabilden, och spela in. Inspelningen fortsätter när panelen stängs. I lägena med kamera
 * står en liten markör nere till vänster. Panelen och markören ritas direkt i body (portal), utanför
 * spelaren som filmen spelar in, så de kommer aldrig med i filmen. Presentatörsvyn ser inspelningen och
 * kan pausa och stoppa den, och starta en ljudinspelning.
 */

const STORAGE_KEY = "presenter-inspelning";

type Saved = { mode: RecordingMode; microphoneId?: string; cameraId?: string; noiseSuppression: boolean };

function readSaved(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
    return { mode: value.mode && value.mode in MODE_TRACKS ? value.mode : "film", microphoneId: value.microphoneId, cameraId: value.cameraId, noiseSuppression: value.noiseSuppression ?? false };
  } catch {
    return { mode: "film", noiseSuppression: false };
  }
}

const clock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
};

/** Mikrofonens nivå 0–1 ur en ström (RMS), uppdaterad varje bildruta. */
function useLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const value of data) sum += value * value;
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); source.disconnect(); void context.close(); setLevel(0); };
  }, [stream]);
  return level;
}

const noSubscribe = () => () => {};

export function RecordingPanel({ open, onClose, slug, channelKey, title, getPosition, scene, stage, onFilmChange }: {
  open: boolean;
  onClose: () => void;
  slug: string;
  /** Nyckeln som presentatörsvyn lyssnar på (spelarens syncId, annars slug). */
  channelKey: string;
  title: string;
  getPosition: () => RecorderPosition;
  /** Spelaren som spelas in i läget film, och slidens ruta som reserv. */
  scene: React.RefObject<HTMLElement | null>;
  stage: React.RefObject<HTMLElement | null>;
  /** Säger till spelaren när en inspelning med slides pågår, så att den kan dölja sina egna kontroller. */
  onFilmChange?: (recording: boolean) => void;
}) {
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  const recorder = useMemo(() => new LectureRecorder(), []);
  const snapshot = useSyncExternalStore(
    useCallback(listener => recorder.subscribe(listener), [recorder]),
    () => `${recorder.state}|${recorder.error}|${recorder.warning}|${recorder.manifest?.id ?? ""}`,
    () => "idle|||",
  );
  const [state, error, warning] = snapshot.split("|");
  const active = state === "recording" || state === "paused" || state === "starting" || state === "stopping";
  // Panelen ritar ingenting förrän den öppnas eller spelar in, så valen kan läsas direkt utan glapp vid hydreringen.
  const [saved, setSaved] = useState<Saved>(() => typeof window === "undefined" ? { mode: "film", noiseSuppression: false } : readSaved());
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [preview, setPreview] = useState<{ microphone: MediaStream | null; camera: MediaStream | null }>({ microphone: null, camera: null });
  const [elapsed, setElapsed] = useState(0);
  const video = useRef<HTMLVideoElement>(null);

  const update = (patch: Partial<Saved>) => setSaved(prev => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* bara den här gången */ }
    return next;
  });

  // Förhandsvisningen: mikrofonen (och kameran i lägena med kamera) medan panelen är öppen och inget spelas in.
  const wantsCamera = MODE_TRACKS[saved.mode].includes("kamera");
  useEffect(() => {
    if (!open || active || !navigator.mediaDevices) return;
    let cancelled = false;
    const streams: MediaStream[] = [];
    (async () => {
      try {
        const microphone = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(saved.microphoneId, saved.noiseSuppression) });
        streams.push(microphone);
        const camera = wantsCamera ? await navigator.mediaDevices.getUserMedia({ video: cameraConstraints(saved.cameraId) }) : null;
        if (camera) streams.push(camera);
        if (cancelled) return;
        setPreview({ microphone, camera });
        setDevices(await navigator.mediaDevices.enumerateDevices());
      } catch {
        if (!cancelled) setPreview({ microphone: null, camera: null });
      }
    })();
    return () => {
      cancelled = true;
      streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      setPreview({ microphone: null, camera: null });
    };
  }, [open, active, wantsCamera, saved.microphoneId, saved.cameraId, saved.noiseSuppression]);

  useEffect(() => {
    if (video.current) video.current.srcObject = preview.camera;
  }, [preview.camera]);

  const level = useLevel(active ? recorder.microphone : preview.microphone);

  // Var föreläsningen står: läses av tio gånger i sekunden medan inspelningen pågår.
  useEffect(() => {
    if (state !== "recording" && state !== "paused") return;
    const timer = setInterval(() => {
      recorder.mark(getPosition());
      setElapsed(recorder.mediaTime());
    }, 100);
    return () => clearInterval(timer);
  }, [state, recorder, getPosition]);

  // Presentatörsvyn: status varje sekund, och kommandon tillbaka (pausa, fortsätt, stoppa, ljud).
  const start = useCallback(async (mode: RecordingMode) => {
    await recorder.start({ slug, title, mode, microphoneId: saved.microphoneId, cameraId: saved.cameraId, noiseSuppression: saved.noiseSuppression, scene: scene.current, stage: stage.current }, getPosition());
  }, [recorder, slug, title, saved, scene, stage, getPosition]);
  useEffect(() => {
    const channel = getPresenterChannel();
    if (!channel) return;
    const send = () => channel.postMessage({ type: "rec-status", slug: channelKey, state: recorder.state, ms: recorder.mediaTime(), mode: recorder.manifest?.mode ?? saved.mode });
    const timer = setInterval(send, 1000);
    const unsubscribe = recorder.subscribe(send);
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; slug?: string; command?: string };
      if (data.type !== "rec-command" || data.slug !== channelKey) return;
      if (data.command === "pause") recorder.pause();
      else if (data.command === "resume") recorder.resume();
      else if (data.command === "stop") void recorder.stop();
      else if (data.command === "start-ljud") void start("ljud");
    };
    return () => { clearInterval(timer); unsubscribe(); channel.close(); };
  }, [recorder, channelKey, saved.mode, start]);

  // Spelaren döljer tipsraden och versionsknappen medan slidesen spelas in.
  const filming = (state === "starting" || state === "recording" || state === "paused" || state === "stopping") && MODE_TRACKS[recorder.manifest?.mode ?? saved.mode].includes("slides");
  useEffect(() => {
    onFilmChange?.(filming);
  }, [filming, onFilmChange]);

  // Varning om fönstret stängs mitt i en inspelning.
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  const microphones = devices.filter(device => device.kind === "audioinput");
  const cameras = devices.filter(device => device.kind === "videoinput");
  const manifest = recorder.manifest;
  // Knapparna lämnar fokus direkt, så att mellanslag och pilar från clickern fortsätter att byta slide.
  const press = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => { event.currentTarget.blur(); action(); };

  const pill = (state === "recording" || state === "paused") && !open && recorder.manifest?.mode !== "ljud";
  if (!client || (!pill && !open)) return null;
  return createPortal(<>
    {pill && <div className="pointer-events-none fixed bottom-3 left-3 z-[60] flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 font-mono text-xs text-white/85 backdrop-blur-sm" aria-hidden="true">
      <span className={`h-2 w-2 rounded-full ${state === "paused" ? "bg-amber-400" : "animate-pulse bg-red-500"}`} />
      {clock(elapsed)}
    </div>}
    {open && <aside className="fixed bottom-4 left-4 z-[60] w-[23rem] rounded-xl border border-white/10 bg-neutral-950/92 p-4 text-sm text-white shadow-2xl backdrop-blur-md" aria-label="Inspelning">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Inspelning</h2>
        <span className="flex items-baseline gap-3">
          <a className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline" href={`/${slug}/inspelningar`} target="_blank" rel="noreferrer">Inspelningar och export</a>
          <button type="button" className="text-xs text-white/60 hover:text-white" onClick={press(onClose)}>Stäng (I)</button>
        </span>
      </header>

      {!active && <>
        <label className="mb-2 block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-white/55">Läge</span>
          <select className="w-full rounded-md border border-white/15 bg-neutral-900 px-2 py-1.5" value={saved.mode} onChange={event => update({ mode: event.target.value as RecordingMode })}>
            {(Object.keys(MODE_LABELS) as RecordingMode[]).map(mode => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}
          </select>
        </label>
        <label className="mb-2 block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-white/55">Mikrofon</span>
          <select className="w-full rounded-md border border-white/15 bg-neutral-900 px-2 py-1.5" value={saved.microphoneId ?? ""} onChange={event => update({ microphoneId: event.target.value || undefined })}>
            <option value="">Standard</option>
            {microphones.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || "Mikrofon"}</option>)}
          </select>
        </label>
        {wantsCamera && <label className="mb-2 block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-white/55">Kamera</span>
          <select className="w-full rounded-md border border-white/15 bg-neutral-900 px-2 py-1.5" value={saved.cameraId ?? ""} onChange={event => update({ cameraId: event.target.value || undefined })}>
            <option value="">Standard</option>
            {cameras.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || "Kamera"}</option>)}
          </select>
        </label>}
        <label className="mb-3 flex items-center gap-2 text-xs text-white/75">
          <input type="checkbox" checked={saved.noiseSuppression} onChange={event => update({ noiseSuppression: event.target.checked })} />
          Brusreducering (bra i en sal, av i en tyst studio)
        </label>
        {wantsCamera && <video ref={video} className="mb-3 aspect-video w-full rounded-md bg-black object-cover" autoPlay muted playsInline />}
      </>}

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-label="Mikrofonens nivå">
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
      </div>

      {active ? <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${state === "paused" ? "bg-amber-400" : "animate-pulse bg-red-500"}`} />
        <span className="mr-auto font-mono text-base tabular-nums">{clock(elapsed)}</span>
        {state === "recording" && <button type="button" className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10" onClick={press(() => recorder.pause())}>Paus</button>}
        {state === "paused" && <button type="button" className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10" onClick={press(() => recorder.resume())}>Fortsätt</button>}
        <button type="button" disabled={state === "stopping" || state === "starting"} className="rounded-md bg-white px-3 py-1.5 font-semibold text-black hover:bg-white/85 disabled:opacity-50" onClick={press(() => void recorder.stop())}>{state === "stopping" ? "Sparar …" : "Stoppa"}</button>
      </div> : <button type="button" className="w-full rounded-md bg-red-600 px-3 py-2 font-semibold hover:bg-red-500" onClick={press(() => void start(saved.mode))}>● Spela in</button>}

      {state === "starting" && saved.mode === "film" && <p className="mt-2 text-xs text-white/70">Välj den här fliken i rutan som kommer upp, så spelas slidesen in.</p>}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {warning && <p className="mt-2 text-xs text-amber-300">{warning}</p>}
      {state === "done" && manifest && <p className="mt-3 text-xs text-white/75">
        Sparad: <code className="text-white/90">.inspelningar/{manifest.slug}/{manifest.id}</code>
        {" · "}<a className="underline hover:text-white" href={`/${manifest.slug}/inspelningar?id=${manifest.id}`} target="_blank" rel="noreferrer">Exportera</a>
      </p>}
      {!active && state !== "done" && <p className="mt-3 text-[0.7rem] leading-snug text-white/50">
        Spåren sparas medan du spelar in, i <code>presenter/.inspelningar</code>. Tidslinjen minns slide och klick. Stäng panelen med I; inspelningen fortsätter.
      </p>}
    </aside>}
  </>, document.body);
}
