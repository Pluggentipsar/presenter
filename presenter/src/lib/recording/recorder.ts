import { MODE_TRACKS, type RecordingManifest, type RecordingMode, type RecordingTrack, type TimelineEvent } from "./types";

/**
 * Föreläsningens inspelare i spelaren (2 oktober 2026). Spelar in mikrofonen, kameran och slidescenen
 * som separata spår med MediaRecorder och skickar bitarna till den lokala servern medan inspelningen
 * pågår (/api/inspelning), så att inget går förlorat om något kraschar. Tidslinjen loggar slide och
 * klicksteg i mediets tid.
 *
 * Slidesen spelas in ur spelarens egen flik (getDisplayMedia med preferCurrentTab). Går det begränsas
 * bilden till spelaren med Element Capture: bakgrund, temats lager, effekter, slide och varumärke, men
 * inte inspelningspanelen (den ritas i body) eller något annat utanför spelaren. Annars beskärs bilden
 * till slidens ruta (Region Capture; då kan en öppen panel synas), annars tas hela fliken. Exporten beskär alltid till den centrerade 16:9-ytan, så ett fönster
 * med andra proportioner gör ingenting.
 *
 * Slidesspåret spelas helst in som WebM (VP9): H.264 i MP4 går sönder om fönstret byter storlek mitt i
 * inspelningen (till exempel helskärm), WebM klarar det. Kameran byter aldrig storlek och spelas in som
 * H.264 i MP4, som datorns grafikkort kodar.
 */

export interface RecorderPosition {
  index: number;
  slideId?: string;
  title?: string;
  /** 1-baserat klicksteg och antal lägen. */
  step: number;
  steps: number;
  /** Filmdeckens bildläge (data-layout på scenen), så att exporten vet var Joel får stå. */
  layout?: "talare" | "full" | "horn";
}

export interface RecorderSetup {
  slug: string;
  title: string;
  mode: RecordingMode;
  microphoneId?: string;
  cameraId?: string;
  noiseSuppression: boolean;
  /** Spelaren (allt publiken ser) som spelas in i läget film, och slidens egen ruta som reserv. */
  scene?: HTMLElement | null;
  stage?: HTMLElement | null;
}

export type RecorderState = "idle" | "starting" | "recording" | "paused" | "stopping" | "done" | "error";

const TIMESLICE = 2000;

const VIDEO_AUDIO = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const SLIDES_VIDEO = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1"];
const AUDIO_ONLY = ["audio/webm;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/webm"];

function pickMime(candidates: string[]): string {
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Mikrofonens inställningar: rak signal, men brusreduceringen går att slå på (bra i en sal). */
export function microphoneConstraints(deviceId: string | undefined, noiseSuppression: boolean): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression,
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
  };
}

export function cameraConstraints(deviceId: string | undefined): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };
}

type CaptureKind = "element" | "region" | "flik";

/**
 * Vänta på ett löfte en stund. true: klart, false: fel, null: inget svar ännu. Chrome svarar på
 * restrictTo och cropTo först när nästa bildruta har ritats, och en slide som står still ritar
 * ingen ny; då gäller begränsningen ändå från nästa bildruta.
 */
function settle(promise: Promise<unknown>, ms: number): Promise<boolean | null> {
  return Promise.race([promise.then(() => true, () => false), new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);
}

/**
 * Begränsa flikinspelningen till spelaren (Element Capture), annars beskär till slidens ruta (Region
 * Capture), annars hela fliken. Spelarens rot är en egen staplingskontext (isolation: isolate), vilket
 * Element Capture kräver: ett element utan en ger inga bildrutor alls.
 */
async function restrictCapture(track: MediaStreamTrack, scene: HTMLElement | null | undefined, stage: HTMLElement | null | undefined): Promise<CaptureKind> {
  const scope = globalThis as unknown as {
    RestrictionTarget?: { fromElement: (el: Element) => Promise<unknown> };
    CropTarget?: { fromElement: (el: Element) => Promise<unknown> };
  };
  const capture = track as MediaStreamTrack & { restrictTo?: (target: unknown) => Promise<void>; cropTo?: (target: unknown) => Promise<void> };
  if (scene && scope.RestrictionTarget && capture.restrictTo) {
    try {
      if (await settle(capture.restrictTo(await scope.RestrictionTarget.fromElement(scene)), 3000) !== false) return "element";
    } catch { /* prova beskärning */ }
  }
  const crop = stage ?? scene;
  if (crop && scope.CropTarget && capture.cropTo) {
    try {
      if (await settle(capture.cropTo(await scope.CropTarget.fromElement(crop)), 3000) !== false) return "region";
    } catch { /* hela fliken */ }
  }
  return "flik";
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class LectureRecorder {
  state: RecorderState = "idle";
  error = "";
  warning = "";
  manifest: RecordingManifest | null = null;
  /** Mikrofonens ström, för nivåmätaren i panelen. */
  microphone: MediaStream | null = null;
  camera: MediaStream | null = null;
  capture: CaptureKind | null = null;

  private setup: RecorderSetup | null = null;
  private streams: MediaStream[] = [];
  private recorders = new Map<RecordingTrack, MediaRecorder>();
  private chains = new Map<RecordingTrack, Promise<void>>();
  private seqs = new Map<RecordingTrack, number>();
  private offsets = new Map<RecordingTrack, number>();
  private t0 = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  private timeline: TimelineEvent[] = [];
  private lastPosition = "";
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private emit() { this.listeners.forEach(listener => listener()); }

  /** Mediets tid i millisekunder (pauser räknas bort). */
  mediaTime(): number {
    if (!this.t0) return 0;
    const now = this.state === "paused" ? this.pausedAt : performance.now();
    return Math.max(0, now - this.t0 - this.pausedTotal);
  }

  /**
   * Starta. Ska anropas direkt i ett klick: flikinspelningen kräver att användaren just har agerat,
   * därför begärs den först.
   */
  async start(setup: RecorderSetup, position: RecorderPosition): Promise<void> {
    if (this.state === "starting" || this.state === "recording" || this.state === "paused") return;
    this.setup = setup;
    this.state = "starting";
    this.error = "";
    this.warning = "";
    this.emit();
    const tracks = MODE_TRACKS[setup.mode];
    try {
      let slidesTrack: MediaStreamTrack | null = null;
      if (tracks.includes("slides")) {
        if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Den här webbläsaren kan inte spela in skärmen.");
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "exclude",
          monitorTypeSurfaces: "exclude",
        } as DisplayMediaStreamOptions);
        this.streams.push(display);
        slidesTrack = display.getVideoTracks()[0] ?? null;
        this.capture = slidesTrack ? await restrictCapture(slidesTrack, setup.scene, setup.stage) : "flik";
        if (this.capture === "region") this.warning = "Webbläsaren kunde bara beskära till sliden: en öppen panel eller meny syns i filmen. Stäng panelen med I.";
        if (this.capture === "flik") this.warning = "Webbläsaren kunde inte begränsa inspelningen till sliden, så hela fliken spelas in. Stäng panelen med I.";
      }
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(setup.microphoneId, setup.noiseSuppression) });
      this.streams.push(microphone);
      this.microphone = microphone;
      let camera: MediaStream | null = null;
      if (tracks.includes("kamera")) {
        camera = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints(setup.cameraId) });
        this.streams.push(camera);
        this.camera = camera;
      }

      const plan: { track: RecordingTrack; stream: MediaStream; mime: string; bits: { video?: number; audio?: number } }[] = [];
      if (tracks.includes("ljud")) plan.push({ track: "ljud", stream: microphone, mime: pickMime(AUDIO_ONLY), bits: { audio: 160_000 } });
      if (camera) plan.push({ track: "kamera", stream: new MediaStream([...camera.getVideoTracks(), ...microphone.getAudioTracks()]), mime: pickMime(VIDEO_AUDIO), bits: { video: 8_000_000, audio: 192_000 } });
      if (slidesTrack) plan.push({ track: "slides", stream: new MediaStream([slidesTrack]), mime: pickMime(SLIDES_VIDEO), bits: { video: 10_000_000 } });
      if (plan.some(item => !item.mime)) throw new Error("Webbläsaren kan inte spela in i något av formaten.");

      const cameraSettings = camera?.getVideoTracks()[0]?.getSettings();
      const response = await fetch("/api/inspelning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          slug: setup.slug,
          title: setup.title,
          mode: setup.mode,
          tracks: Object.fromEntries(plan.map(item => [item.track, {
            mime: item.mime,
            ...(item.track === "kamera" && cameraSettings?.width ? { width: cameraSettings.width, height: cameraSettings.height } : {}),
            ...(item.track === "slides" && this.capture ? { capture: this.capture } : {}),
          }])),
          devices: {
            microphone: microphone.getAudioTracks()[0]?.label,
            camera: camera?.getVideoTracks()[0]?.label,
          },
        }),
      });
      if (!response.ok) throw new Error(`Servern kunde inte starta inspelningen (${response.status}).`);
      this.manifest = await response.json() as RecordingManifest;

      this.t0 = performance.now();
      this.pausedTotal = 0;
      this.timeline = [];
      this.lastPosition = "";
      for (const item of plan) {
        const recorder = new MediaRecorder(item.stream, { mimeType: item.mime, videoBitsPerSecond: item.bits.video, audioBitsPerSecond: item.bits.audio });
        this.seqs.set(item.track, 0);
        this.chains.set(item.track, Promise.resolve());
        recorder.ondataavailable = event => { if (event.data.size > 0) this.enqueue(item.track, event.data); };
        recorder.onerror = () => { this.warning = `Spåret ${item.track} fick ett fel.`; this.emit(); };
        this.recorders.set(item.track, recorder);
        this.offsets.set(item.track, performance.now() - this.t0);
        recorder.start(TIMESLICE);
      }
      this.state = "recording";
      this.mark(position, true);
      this.saveTimer = setInterval(() => void this.saveTimeline(false), 10_000);
      this.emit();
    } catch (error) {
      this.release();
      this.state = "error";
      this.error = error instanceof Error ? error.message : String(error);
      if (/Permission|NotAllowed/i.test(this.error)) this.error = "Inspelningen fick inte tillgång till mikrofonen, kameran eller fliken.";
      this.emit();
    }
  }

  /** Logga var föreläsningen står. Bara ändringar loggas. */
  mark(position: RecorderPosition, force = false): void {
    if (this.state !== "recording" && this.state !== "paused") return;
    // Bildläget räknas in: det byts när den nya sliden har kommit in, en stund efter klicket.
    const key = `${position.index}:${position.step}:${position.layout ?? ""}`;
    if (!force && key === this.lastPosition) return;
    this.lastPosition = key;
    this.timeline.push({ t: this.mediaTime(), type: "position", index: position.index, slideId: position.slideId, step: position.step, steps: position.steps, title: position.title, ...(position.layout ? { layout: position.layout } : {}) });
  }

  pause(): void {
    if (this.state !== "recording") return;
    this.recorders.forEach(recorder => recorder.state === "recording" && recorder.pause());
    this.pausedAt = performance.now();
    this.timeline.push({ t: this.mediaTime(), type: "pause" });
    this.state = "paused";
    this.emit();
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.pausedTotal += performance.now() - this.pausedAt;
    this.state = "recording";
    this.timeline.push({ t: this.mediaTime(), type: "resume" });
    this.recorders.forEach(recorder => recorder.state === "paused" && recorder.resume());
    this.emit();
  }

  async stop(): Promise<RecordingManifest | null> {
    if (this.state !== "recording" && this.state !== "paused") return this.manifest;
    if (this.state === "paused") this.resume();
    const duration = this.mediaTime();
    this.timeline.push({ t: duration, type: "stop" });
    this.state = "stopping";
    this.emit();
    await Promise.all([...this.recorders.values()].map(recorder => new Promise<void>(resolve => {
      if (recorder.state === "inactive") return resolve();
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    })));
    // Den sista biten kommer i dataavailable före stop; vänta tills alla spår är skickade.
    await Promise.all([...this.chains.values()]);
    if (this.saveTimer) clearInterval(this.saveTimer);
    this.saveTimer = null;
    await this.saveTimeline(true, duration);
    this.release();
    this.state = "done";
    this.emit();
    return this.manifest;
  }

  /** Släpp kameran, mikrofonen och fliken. */
  release(): void {
    this.streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    this.streams = [];
    this.microphone = null;
    this.camera = null;
    this.recorders.clear();
  }

  private enqueue(track: RecordingTrack, blob: Blob): void {
    const seq = this.seqs.get(track) ?? 0;
    this.seqs.set(track, seq + 1);
    const previous = this.chains.get(track) ?? Promise.resolve();
    this.chains.set(track, previous.then(() => this.upload(track, blob, seq)));
  }

  /** Skicka en bit; försök igen tills servern tar emot den, så att filen aldrig får ett hål. */
  private async upload(track: RecordingTrack, blob: Blob, seq: number): Promise<void> {
    const manifest = this.manifest;
    if (!manifest) return;
    const params = new URLSearchParams({ slug: manifest.slug, id: manifest.id, track, seq: String(seq) });
    if (seq === 0) params.set("off", String(Math.round(this.offsets.get(track) ?? 0)));
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(`/api/inspelning?${params}`, { method: "PUT", body: blob });
        if (response.ok) {
          if (this.warning.startsWith("Servern")) { this.warning = ""; this.emit(); }
          return;
        }
        throw new Error(String(response.status));
      } catch {
        this.warning = "Servern svarar inte just nu. Inspelningen fortsätter, och bitarna skickas när den svarar igen.";
        this.emit();
        await wait(Math.min(5000, 500 * (attempt + 1)));
      }
    }
  }

  private async saveTimeline(ended: boolean, duration?: number): Promise<void> {
    const manifest = this.manifest;
    if (!manifest) return;
    try {
      const response = await fetch("/api/inspelning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "timeline", slug: manifest.slug, id: manifest.id, timeline: this.timeline, durationMs: duration ?? this.mediaTime(), ended }),
      });
      if (response.ok) this.manifest = await response.json() as RecordingManifest;
    } catch { /* nästa gång */ }
  }
}
