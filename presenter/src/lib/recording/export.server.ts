import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { machineSettings } from "../data-dir.server";
import { transcribeTools } from "./avskrift-tools.server";
import { bundledTool } from "./verktyg.server";
import { readManifest, recordingDir } from "./store.server";
import { renameWithRetry, renameWithRetrySync } from "./rename.server";
import { chaptersOf, clock, personSegments, type PersonSegment } from "./timeline";
import { slideTitles } from "./titles.server";
import {
  DEFAULT_EXPORT,
  EXTRA_LABELS,
  LAYOUT_LABELS,
  LAYOUT_NEEDS,
  type BoxCorner,
  type BoxSize,
  type ExportFile,
  type ExportLayout,
  type ExportSettings,
  type ExportStatus,
  type ExportTools,
  type VideoEncoder,
  type ExtraTrack,
  type FreeLayout,
  type FreeRect,
  type RecordingManifest,
  type SlideChoice,
  type SlideChoiceMode,
} from "./types";

/**
 * Exporten av en inspelning (2 oktober 2026): ffmpeg gör den färdiga filmen och de separata spåren.
 *
 * Stegen, i inspelningens mapp under `export/`:
 * 1. Ljudet: mikrofonen som WAV (48 kHz, mono), från kameraspåret eller ljudspåret.
 * 2. Slidesen: scenen beskärs till den centrerade 16:9-ytan och skalas till 1920 × 1080. Spelaren
 *    spelar in hela scenen, så ett fönster med andra proportioner ger bara band som skärs bort, och
 *    WebM-spåret får byta storlek mitt i (helskärm). Bildrutorna behåller sina tider.
 * 3. Kameran: 1920 × 1080 med jämna 30 bilder/s, så att masken kan räknas bild för bild.
 * 4. Friläggning (bara när den behövs): Robust Video Matting räknar en mask per bild på grafikkortet
 *    (scripts/frilagg-video.py, med torch ur ComfyUI:s Python). Masken sparas förlustfritt.
 * 5. Filmen: bildläget sätts ihop, ljudnivån jämnas ut och kapitlen följer tidslinjen (en per slide).
 *    I bildläget frilagd syns Joel bara när filmdeckets bildläge är `talare`, inte vid helbild (`full`).
 * 6. De separata spåren som valts.
 *
 * Underlagen (steg 1–4) sparas i `export/underlag/` och återanvänds när samma inspelning exporteras
 * i ett annat bildläge, så att friläggningen bara görs en gång.
 */

const EXPORT_DIR = "export";
const BASIS_DIR = "underlag";
const FPS = 30;
const W = 1920;
const H = 1080;

/* ── Verktygen ─────────────────────────────────────────────────────────────── */

function onPath(name: string): string | null {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
  const first = result.status === 0 ? result.stdout.split(/\r?\n/)[0]?.trim() : "";
  return first || null;
}

/** ffmpeg ur WinGets paket, om det inte står i PATH (appen kan ha startats före installationen). */
function fromWinget(name: string): string | null {
  const root = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "Microsoft", "WinGet", "Packages");
  try {
    for (const pkg of fs.readdirSync(root).filter(dir => /^Gyan\.FFmpeg/i.test(dir))) {
      for (const build of fs.readdirSync(path.join(root, pkg))) {
        const file = path.join(root, pkg, build, "bin", `${name}.exe`);
        if (fs.existsSync(file)) return file;
      }
    }
  } catch { /* inget WinGet */ }
  return null;
}

/**
 * H.264-kodarna i den ordning de prövas: grafikkortens (NVIDIA, Intel, AMD), Windows inbyggda och sist
 * processorns. Det medpackade ffmpeg-bygget är LGPL och saknar x264, så en dator utan grafikkortskodare
 * kodar med Windows egen kodare eller OpenH264. `PRESENTER_KODARE` väljer en bestämd.
 */
const ENCODERS: VideoEncoder[] = ["h264_nvenc", "h264_qsv", "h264_amf", "h264_mf", "libx264", "libopenh264"];

/** Kodarens inställningar. `basis` är underlag som kodas en gång till och får högre kvalitet. */
function encoderArgs(encoder: VideoEncoder, quality: "film" | "basis"): string[] {
  const film = quality === "film";
  switch (encoder) {
    case "h264_nvenc": return ["-c:v", "h264_nvenc", "-preset", "p6", "-tune", "hq", "-rc", "vbr", "-cq", film ? "19" : "15", "-b:v", "0", "-profile:v", "high", "-pix_fmt", "yuv420p"];
    case "h264_qsv": return ["-c:v", "h264_qsv", "-global_quality", film ? "22" : "17", "-pix_fmt", "nv12"];
    case "h264_amf": return ["-c:v", "h264_amf", "-rc", "cqp", "-qp_i", film ? "20" : "16", "-qp_p", film ? "22" : "18", "-pix_fmt", "nv12"];
    case "h264_mf": return ["-c:v", "h264_mf", "-rate_control", "quality", "-quality", film ? "80" : "95", "-pix_fmt", "nv12"];
    case "libx264": return ["-c:v", "libx264", "-preset", film ? "medium" : "fast", "-crf", film ? "19" : "14", "-pix_fmt", "yuv420p"];
    case "libopenh264": return ["-c:v", "libopenh264", "-b:v", film ? "12M" : "25M", "-pix_fmt", "yuv420p"];
  }
}

/** Kodarna som tål variabel bildtakt (slidesens underlag, där bildrutorna kommer när något ändras). */
const VFR_ENCODERS: VideoEncoder[] = ["h264_nvenc", "libx264", "libopenh264"];

interface ToolPaths {
  ffmpeg: string | null;
  ffprobe: string | null;
  python: string | null;
  encoder: VideoEncoder | null;
  /**
   * Kodaren för slidesens underlag. Windows egen kodare (och troligen Intels och AMD:s) kräver fast
   * bildtakt, så där kodas underlaget med OpenH264 (följer med ffmpeg-bygget) eller x264.
   */
  vfrEncoder: VideoEncoder | null;
  matting: boolean;
  mattingNote?: string;
}
let toolsPromise: Promise<ToolPaths> | null = null;

function run(command: string, args: string[], timeout = 60_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), timeout);
    child.on("error", () => { clearTimeout(timer); resolve({ code: -1, stdout, stderr }); });
    child.on("close", code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

/**
 * Letar upp ffmpeg (helst det som följer med appen), provar kodarna och friläggningens Python en gång
 * per serverstart.
 */
export function findTools(): Promise<ToolPaths> {
  toolsPromise ??= (async () => {
    const exe = process.platform === "win32" ? ".exe" : "";
    const ffmpeg = process.env.FFMPEG_PATH || bundledTool("ffmpeg", `ffmpeg${exe}`) || onPath("ffmpeg") || fromWinget("ffmpeg");
    const ffprobe = process.env.FFPROBE_PATH || bundledTool("ffmpeg", `ffprobe${exe}`) || onPath("ffprobe") || fromWinget("ffprobe");
    // Den första kodaren som klarar en kort provkodning med filmens egna inställningar.
    let encoder: VideoEncoder | null = null;
    const wanted = process.env.PRESENTER_KODARE as VideoEncoder | undefined;
    const works = async (candidate: VideoEncoder) => Boolean(ffmpeg) && (await run(ffmpeg!, ["-hide_banner", "-v", "error", "-f", "lavfi", "-i", "color=black:s=640x360:r=30", "-t", "0.2", ...encoderArgs(candidate, "film"), "-f", "null", "-"], 30_000)).code === 0;
    for (const candidate of wanted && ENCODERS.includes(wanted) ? [wanted] : ENCODERS) {
      if (await works(candidate)) { encoder = candidate; break; }
    }
    let vfrEncoder: VideoEncoder | null = encoder && VFR_ENCODERS.includes(encoder) ? encoder : null;
    for (const candidate of VFR_ENCODERS) {
      if (vfrEncoder) break;
      if (candidate !== "h264_nvenc" && await works(candidate)) vfrEncoder = candidate;
    }
    // Friläggningens Python: PRESENTER_PYTHON, annars `python` i datorns comfyui.json (lib/data-dir.server.ts).
    const configured = machineSettings().python;
    const pythonPath = process.env.PRESENTER_PYTHON || (configured && fs.existsSync(configured) ? configured : null);
    let matting = false;
    let mattingNote: string | undefined;
    if (!pythonPath) mattingNote = "Friläggningen behöver en Python med torch och CUDA, till exempel ComfyUI:s. Ange den med PRESENTER_PYTHON eller som python i ~/.presenter/comfyui.json.";
    else {
      const check = await run(pythonPath, ["-c", "import torch, sys; sys.exit(0 if torch.cuda.is_available() else 3)"], 120_000);
      matting = check.code === 0;
      if (!matting) mattingNote = check.code === 3 ? "Torch hittar inget grafikkort med CUDA." : "Pythonen kunde inte läsa in torch.";
    }
    return { ffmpeg, ffprobe, python: matting ? pythonPath : null, encoder, vfrEncoder, matting, mattingNote };
  })();
  return toolsPromise;
}

export async function exportTools(): Promise<ExportTools> {
  const tools = await findTools();
  const transcribe = transcribeTools();
  return { ffmpeg: Boolean(tools.ffmpeg), encoder: tools.encoder, matting: tools.matting, mattingNote: tools.mattingNote, transcribe: transcribe.ok, transcribeNote: transcribe.note, models: transcribe.models };
}

/** H.264 med den kodare som fungerade på den här datorn (`vfr`: en som tål variabel bildtakt). */
function videoCodec(tools: ToolPaths, quality: "film" | "basis", vfr = false): string[] {
  const encoder = vfr ? tools.vfrEncoder : tools.encoder;
  if (!encoder) throw new Error("Ingen H.264-kodare fungerar med ffmpeg på den här datorn.");
  return encoderArgs(encoder, quality);
}

/* ── Sökvägar och status ───────────────────────────────────────────────────── */

export function exportDir(slug: string, id: string): string {
  return path.join(recordingDir(slug, id), EXPORT_DIR);
}
export const basisDir = (slug: string, id: string) => path.join(exportDir(slug, id), BASIS_DIR);
const statusFile = (slug: string, id: string) => path.join(exportDir(slug, id), "status.json");

export function readStatus(slug: string, id: string): ExportStatus | null {
  try {
    return JSON.parse(fs.readFileSync(statusFile(slug, id), "utf8")) as ExportStatus;
  } catch {
    return null;
  }
}

/**
 * Skriv statusen. Den får aldrig stoppa själva exporten: går namnbytet inte att göra (Windows håller
 * filen) skrivs filen direkt, och går inte det heller loggas felet och nästa uppdatering försöker igen.
 */
function writeStatus(slug: string, id: string, status: ExportStatus): void {
  const file = statusFile(slug, id);
  const text = JSON.stringify(status, null, 2);
  try {
    fs.writeFileSync(`${file}.tmp`, text);
    renameWithRetrySync(`${file}.tmp`, file);
  } catch {
    try {
      fs.writeFileSync(file, text);
    } catch (error) {
      console.error("Exportens status:", error instanceof Error ? error.message : error);
    }
  }
}

/** De färdiga filerna i exportmappen (inte underlagen), med etiketter. */
export function listExportFiles(slug: string, id: string): ExportFile[] {
  const dir = exportDir(slug, id);
  if (!fs.existsSync(dir)) return [];
  const label = (name: string): string => {
    const film = name.match(/^film-([a-z]+)\.mp4$/);
    if (film) return `Filmen: ${LAYOUT_LABELS[film[1] as ExportLayout]?.toLowerCase() ?? film[1]}`;
    if (name === "ljud.m4a") return "Ljudet med kapitel (m4a, jämn ljudnivå)";
    if (name === "slides.mp4") return EXTRA_LABELS.slides;
    if (name === "kamera.mp4") return EXTRA_LABELS.kamera;
    if (name === "mask.mp4") return EXTRA_LABELS.mask;
    if (name === "du.mov") return EXTRA_LABELS.du;
    if (name === "ljud.wav") return EXTRA_LABELS.ljud;
    if (name === "kapitel.txt") return "Kapitlen (tid och slide, för YouTube eller klippning)";
    if (name === "avskrift.md") return "Avskriften per slide (det du sa)";
    if (name === "avskrift.json") return "Avskriften med ordtider och slides (för läsläget)";
    if (name === "undertext.srt") return "Undertexter (SRT, för YouTube och klippprogram)";
    if (name === "undertext.vtt") return "Undertexter (WebVTT, för webben)";
    return name;
  };
  return fs.readdirSync(dir)
    .filter(name => /\.(mp4|m4a|mov|wav|txt|md|srt|vtt|json)$/.test(name) && name !== "status.json" && !name.includes(".part.") && fs.statSync(path.join(dir, name)).isFile())
    .sort((a, b) => (/^(film-|ljud\.m4a)/.test(a) ? 0 : 1) - (/^(film-|ljud\.m4a)/.test(b) ? 0 : 1) || a.localeCompare(b))
    .map(name => ({ name, label: label(name), bytes: fs.statSync(path.join(dir, name)).size }));
}

/* ── Inställningarna ───────────────────────────────────────────────────────── */

const LAYOUTS = Object.keys(LAYOUT_LABELS) as ExportLayout[];
const CORNERS: BoxCorner[] = ["nh", "nv", "uh", "uv"];
const SIZES: BoxSize[] = ["liten", "mellan", "stor"];
const EXTRAS = Object.keys(EXTRA_LABELS) as ExtraTrack[];

export function cleanSettings(input: unknown): ExportSettings {
  const value = (input && typeof input === "object" ? input : {}) as Partial<ExportSettings>;
  return {
    layout: LAYOUTS.includes(value.layout as ExportLayout) ? value.layout as ExportLayout : DEFAULT_EXPORT.layout,
    corner: CORNERS.includes(value.corner as BoxCorner) ? value.corner as BoxCorner : DEFAULT_EXPORT.corner,
    size: SIZES.includes(value.size as BoxSize) ? value.size as BoxSize : DEFAULT_EXPORT.size,
    placement: value.placement === "corner" ? "corner" : "deck",
    perSlide: cleanChoices(value.perSlide),
    loudness: typeof value.loudness === "boolean" ? value.loudness : DEFAULT_EXPORT.loudness,
    extras: Array.isArray(value.extras) ? EXTRAS.filter(extra => value.extras!.includes(extra)) : [],
  };
}

const CHOICE_MODES: SlideChoiceMode[] = ["deck", "dold", "horn", "yta", "fri"];
const FREE_LAYOUTS: FreeLayout[] = ["frilagd", "ruta"];

/** Valen per slide, rensade: kända lägen och storlekar, rimliga nycklar. */
export function cleanChoices(input: unknown): Record<string, SlideChoice> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, SlideChoice> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>).slice(0, 2000)) {
    const choice = raw as Partial<SlideChoice> | null;
    if (key.length > 200 || !choice || !CHOICE_MODES.includes(choice.mode as SlideChoiceMode)) continue;
    const size = SIZES.includes(choice.size as BoxSize) ? choice.size as BoxSize : undefined;
    // De fria placeringarna: hela tal inom rimliga gränser (lagret får gå utanför bilden). De sparas
    // även när sliden har ett annat läge, så att placeringen finns kvar om Joel väljer den igen.
    const rects: Partial<Record<FreeLayout, FreeRect>> = {};
    for (const layout of FREE_LAYOUTS) {
      const given = choice.rects?.[layout];
      if (!given || ![given.x, given.y, given.w].every(Number.isFinite)) continue;
      rects[layout] = { x: Math.round(Math.max(-2 * W, Math.min(2 * W, given.x))), y: Math.round(Math.max(-2 * H, Math.min(2 * H, given.y))), w: Math.round(Math.max(120, Math.min(W * 2, given.w))) };
    }
    const placed = Object.keys(rects).length > 0;
    if (choice.mode === "deck" && !size) continue;
    if (choice.mode === "fri" && !placed) continue;
    out[key] = { mode: choice.mode as SlideChoiceMode, ...(size ? { size } : {}), ...(placed ? { rects } : {}) };
  }
  return out;
}

/* ── Kapitlen ────────────────────────────────────────────────────────────── */

function writeChapters(manifest: RecordingManifest, metadataFile: string, textFile: string | null): void {
  const chapters = chaptersOf(manifest, slideTitles(manifest.slug));
  const escape = (text: string) => text.replace(/([=;#\\\n])/g, "\\$1");
  const lines = [";FFMETADATA1", `title=${escape(manifest.title)}`];
  for (const chapter of chapters) lines.push("[CHAPTER]", "TIMEBASE=1/1000", `START=${Math.round(chapter.start * 1000)}`, `END=${Math.round(chapter.end * 1000)}`, `title=${escape(chapter.title)}`);
  fs.writeFileSync(metadataFile, `${lines.join("\n")}\n`);
  if (textFile) fs.writeFileSync(textFile, `${chapters.map(chapter => `${clock(chapter.start)} ${chapter.title}`).join("\n")}\n`);
}

/* ── Rutans rundade mask ───────────────────────────────────────────────────── */

/** En gråskalebild (PGM) med en rundad rektangel, mjukt kantutjämnad. Används som rutans alfa. */
function writeRoundedMask(file: string, width: number, height: number, radius: number): void {
  const header = Buffer.from(`P5\n${width} ${height}\n255\n`, "ascii");
  const pixels = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = Math.max(0, Math.abs(x + 0.5 - width / 2) - (width / 2 - radius));
      const dy = Math.max(0, Math.abs(y + 0.5 - height / 2) - (height / 2 - radius));
      pixels[y * width + x] = Math.round(255 * Math.min(1, Math.max(0, radius + 0.5 - Math.hypot(dx, dy))));
    }
  }
  fs.writeFileSync(file, Buffer.concat([header, pixels]));
}

const BOX: Record<BoxSize, [number, number]> = { liten: [384, 288], mellan: [512, 384], stor: [640, 480] };
const MARGIN = 40;

function boxPlacement(corner: BoxCorner, size: BoxSize): { w: number; h: number; x: number; y: number } {
  const [w, h] = BOX[size];
  return { w, h, x: corner.endsWith("h") ? W - w - MARGIN : MARGIN, y: corner.startsWith("n") ? H - h - MARGIN : MARGIN };
}

/** Talarens yta i filmdecken (docs/STAGE.md): x 1068–1546 av 1600, alltså mitten vid x 1569 av 1920. */
const PERSON_CENTER = Math.round(((1068 + 1546) / 2) * 1.2);
/** Hur stor den frilagda kamerabilden blir i talarens yta (andel av kamerabildens höjd). */
const PERSON_SCALE: Record<BoxSize, number> = { liten: 0.6, mellan: 0.72, stor: 0.86 };
/**
 * Hörnet i bildläget horn: x 1200–1600 och y 440–900 av 1600 × 900 (docs/STAGE.md),
 * alltså x 1440–1920 och y 528–1080 i filmen. Huvudet hamnar strax under hörnets överkant.
 */
const CORNER = { x1: 1440, top: 528, center: 1680, width: 480 };
const CORNER_SIZE: Record<BoxSize, number> = { liten: 0.85, mellan: 1, stor: 1.15 };

export interface PersonSummary { width: number; height: number; center: number; top: number; bottom: number; left?: number; right?: number }

export interface PersonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Var personens mitt hamnar i sidled (för förhandsbildens siluett). */
  mx?: number;
}

/**
 * Var den frilagda kamerabilden hamnar i filmen (1920 × 1080): hela kamerabilden nedskalad och ställd
 * på bildens underkant, med personen mitt i talarens yta eller mitt i hörnet. Samma mått i exporten och
 * i exportvyns förhandsbilder.
 */
export function personRect(mode: "yta" | "horn", size: BoxSize, person: PersonSummary | null): PersonRect {
  const scale = mode === "yta" ? PERSON_SCALE[size] : cornerScale(person, size);
  const middle = mode === "yta" ? PERSON_CENTER : CORNER.center;
  const w = Math.round((W * scale) / 2) * 2, h = Math.round((H * scale) / 2) * 2;
  return { w, h, x: Math.round(middle - (person?.center ?? W / 2) * scale), y: H - h, mx: middle };
}

/** Måtten för exportvyns förhandsbilder: varje läge och storlek. */
export function previewRects(slug: string, id: string, corner: BoxCorner): Record<"yta" | "horn" | "ruta", Record<BoxSize, PersonRect>> {
  const person = readPerson(basisDir(slug, id));
  const each = (make: (size: BoxSize) => PersonRect) => Object.fromEntries(SIZES.map(size => [size, make(size)])) as Record<BoxSize, PersonRect>;
  return { yta: each(size => personRect("yta", size, person)), horn: each(size => personRect("horn", size, person)), ruta: each(size => boxPlacement(corner, size)) };
}

/** Skalan för den lilla bilden i hörnet: huvudet strax under hörnets överkant, axlarna inom hörnet. */
function cornerScale(person: PersonSummary | null, size: BoxSize): number {
  const top = person?.top ?? H * 0.2;
  let scale = (H - (CORNER.top + 40)) / Math.max(1, H - top);
  if (person?.left !== undefined && person.right !== undefined && person.right > person.left) scale = Math.min(scale, (CORNER.width * 1.1) / (person.right - person.left));
  return Math.min(0.8, Math.max(0.35, scale * CORNER_SIZE[size]));
}

/** Var personen står i kamerabilden, som friläggningen mätte (underlag/mask.json). */
export function readPerson(basis: string): PersonSummary | null {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(basis, "mask.json"), "utf8")) as PersonSummary;
    return Number.isFinite(value.center) ? value : null;
  } catch {
    return null;
  }
}

/* ── Körningen ─────────────────────────────────────────────────────────────── */

export interface Job { child: ChildProcess | null; cancelled: boolean }
export interface Step { label: string; run: (progress: (percent: number) => void) => Promise<void> }

const running = new Map<string, Job>();
const jobKey = (slug: string, id: string) => `${slug}/${id}`;

export function isRunning(slug: string, id: string): boolean {
  return running.has(jobKey(slug, id));
}

/** Avbryt en pågående export (hela processträdet: friläggningens Python startar egna ffmpeg). */
export function cancelExport(slug: string, id: string): boolean {
  const job = running.get(jobKey(slug, id));
  if (!job) return false;
  job.cancelled = true;
  const pid = job.child?.pid;
  if (pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
    else job.child?.kill("SIGTERM");
  }
  return true;
}

class Cancelled extends Error {}

/**
 * Det som exporten och avskriften delar: inspelningen, verktygen, ffmpeg med framsteg, att skriva
 * säkert (en .part-fil som byter namn), att hoppa över färska underlag, och ljudsteget.
 */
export async function jobContext(slug: string, id: string) {
  const manifest = readManifest(slug, id);
  if (!manifest) throw new Error("Hittar inte inspelningen.");
  if (!manifest.ended) throw new Error("Inspelningen pågår fortfarande eller avslutades aldrig.");
  if (isRunning(slug, id)) throw new Error("En export eller avskrift pågår redan.");
  const tools = await findTools();
  if (!tools.ffmpeg) throw new Error("Hittar inte ffmpeg. Installera det (winget install Gyan.FFmpeg) eller sätt FFMPEG_PATH.");
  const has = (track: "ljud" | "kamera" | "slides") => Boolean(manifest.tracks[track]?.bytes);
  const dir = exportDir(slug, id);
  const basis = basisDir(slug, id);
  fs.mkdirSync(basis, { recursive: true });
  const duration = Math.max(0.5, (manifest.durationMs ?? 0) / 1000);
  const durationArg = duration.toFixed(3);
  const source = (track: "ljud" | "kamera" | "slides") => path.join(recordingDir(slug, id), manifest.tracks[track]!.file);
  const offset = (track: "ljud" | "kamera" | "slides") => ((manifest.tracks[track]?.startOffsetMs ?? 0) / 1000).toFixed(3);
  const job: Job = { child: null, cancelled: false };
  const ffmpeg = (args: string[], progress: (percent: number) => void, total = duration) => runProcess(job, tools.ffmpeg!, ["-hide_banner", "-v", "error", "-y", "-progress", "pipe:1", "-nostats", ...args], line => {
    const match = line.match(/^out_time_(?:us|ms)=(\d+)/);
    if (match) progress(Math.min(100, Number(match[1]) / 1e4 / total));
  });
  /** Underlaget finns redan och är nyare än källan: hoppa över steget. */
  const fresh = (file: string, ...sources: string[]) => fs.existsSync(file) && fs.statSync(file).size > 0 && sources.every(src => fs.statSync(src).mtimeMs <= fs.statSync(file).mtimeMs);
  /** Skriv till en tillfällig fil och byt namn när steget har lyckats, så att ett avbrott aldrig lämnar en halv fil som ser färdig ut. */
  const produce = async (file: string, make: (part: string) => Promise<void>) => {
    const part = file.replace(/(\.[a-z0-9]+)$/i, ".part$1");
    await make(part);
    await renameWithRetry(part, file);
  };
  // Ljudet: mikrofonen som WAV (48 kHz, mono) från kameraspåret eller ljudspåret, med tystnad före
  // om spåret startade en aning efter inspelningen.
  const audioSource = has("kamera") ? "kamera" as const : has("ljud") ? "ljud" as const : null;
  const wav = path.join(basis, "ljud.wav");
  const audioStep: Step | null = audioSource ? { label: "Ljudet", run: async progress => {
    if (fresh(wav, source(audioSource))) return;
    await produce(wav, part => ffmpeg(["-itsoffset", offset(audioSource), "-i", source(audioSource), "-map", "0:a:0", "-af", "aresample=48000:async=1:first_pts=0", "-ac", "1", "-c:a", "pcm_s16le", "-t", durationArg, part], progress));
  } } : null;
  return { manifest, tools, has, dir, basis, duration, durationArg, source, offset, job, ffmpeg, fresh, produce, audioSource, wav, audioStep };
}

/** Kör stegen i bakgrunden och skriv statusen medan de går. Svarar direkt med statusen. */
export function launch(slug: string, id: string, job: Job, plan: Step[], status: ExportStatus): ExportStatus {
  const dir = exportDir(slug, id);
  const basis = basisDir(slug, id);
  status.steps = plan.map(step => step.label);
  writeStatus(slug, id, status);
  running.set(jobKey(slug, id), job);
  void (async () => {
    let last = 0;
    try {
      for (let i = 0; i < plan.length; i++) {
        if (job.cancelled) throw new Cancelled();
        status.step = i;
        status.percent = 0;
        writeStatus(slug, id, status);
        await plan[i].run(percent => {
          status.percent = Math.round(percent);
          if (Date.now() - last > 700) { last = Date.now(); writeStatus(slug, id, status); }
        });
        status.percent = 100;
      }
      status.state = "klar";
    } catch (error) {
      status.state = job.cancelled || error instanceof Cancelled ? "avbruten" : "fel";
      status.message = job.cancelled ? "Avbruten." : error instanceof Error ? error.message.slice(-1500) : String(error);
      console.error(status.kind === "avskrift" ? "Avskriften:" : "Exporten:", status.message);
    } finally {
      running.delete(jobKey(slug, id));
      // Halvfärdiga filer får inte se färdiga ut. En fil som Windows håller kvar tas bort nästa gång.
      for (const folder of [dir, basis]) {
        for (const name of fs.existsSync(folder) ? fs.readdirSync(folder) : []) {
          if (!name.includes(".part.")) continue;
          try { fs.rmSync(path.join(folder, name), { force: true }); } catch { /* hålls av ett annat program */ }
        }
      }
      status.finished = new Date().toISOString();
      status.files = listExportFiles(slug, id);
      writeStatus(slug, id, status);
    }
  })();
  return status;
}

/**
 * Starta en export i bakgrunden. Svarar direkt med statusen; sidan frågar sedan efter den.
 */
export async function startExport(slug: string, id: string, input: unknown): Promise<ExportStatus> {
  const { manifest, tools, has, dir, basis, duration, durationArg, source, offset, job, ffmpeg, fresh, produce, audioSource, wav, audioStep } = await jobContext(slug, id);
  const settings = cleanSettings(input);
  const missing = LAYOUT_NEEDS[settings.layout].filter(track => !has(track));
  if (missing.length) throw new Error(`Bildläget behöver spåret ${missing.join(" och ")}, som inspelningen saknar.`);
  if (!has("kamera") && !has("ljud")) throw new Error("Inspelningen har inget ljud.");
  const needsMask = settings.layout === "frilagd" || settings.extras.includes("mask") || settings.extras.includes("du");
  if (needsMask && !tools.matting) throw new Error(tools.mattingNote ?? "Friläggningen går inte att köra på den här datorn.");
  if (needsMask && !has("kamera")) throw new Error("Friläggningen behöver kameraspåret.");

  const plan: Step[] = [];

  // 1. Ljudet.
  if (audioStep) plan.push(audioStep);

  // 2. Slidesen: centrerad 16:9, 1920 × 1080, tiderna kvar (bildrutorna kommer när sliden ändras).
  //    Byter spåret storlek byggs filterkedjan om; setsar=1 håller bildpunkternas form konstant,
  //    annars kraschar grafikkortets kodare (NVENC i ffmpeg 8) på det lilla bytet.
  const needsSlides = has("slides") && (LAYOUT_NEEDS[settings.layout].includes("slides") || settings.extras.includes("slides"));
  const slidesBasis = path.join(basis, "slides.mp4");
  if (needsSlides) plan.push({ label: "Slidesen", run: async progress => {
    if (fresh(slidesBasis, source("slides"))) return;
    await produce(slidesBasis, part => ffmpeg(["-i", source("slides"), "-vf", `setpts=PTS+${offset("slides")}/TB,crop=w='min(iw,ih*16/9)':h='min(ih,iw*9/16)',scale=${W}:${H}:flags=lanczos,setsar=1,format=yuv420p`, "-fps_mode", "passthrough", "-an", ...videoCodec(tools, "basis", true), "-t", durationArg, part], progress));
  } });

  // 3. Kameran: 1920 × 1080, jämna 30 bilder/s från noll till slutet.
  const needsCamera = has("kamera") && (LAYOUT_NEEDS[settings.layout].includes("kamera") || settings.extras.some(extra => extra === "kamera" || extra === "mask" || extra === "du"));
  const cameraBasis = path.join(basis, "kamera.mp4");
  if (needsCamera) plan.push({ label: "Kameran", run: async progress => {
    if (fresh(cameraBasis, source("kamera"))) return;
    await produce(cameraBasis, part => ffmpeg(["-i", source("kamera"), "-vf", `setpts=PTS+${offset("kamera")}/TB,scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1,fps=${FPS}:start_time=0,tpad=stop_mode=clone:stop_duration=${Math.ceil(duration) + 5},format=yuv420p`, "-an", ...videoCodec(tools, "basis"), "-t", durationArg, part], progress));
  } });

  // 4. Friläggningen: en mask per bild, förlustfritt (FFV1).
  const maskBasis = path.join(basis, "mask.mkv");
  if (needsMask) plan.push({ label: "Friläggningen", run: async progress => {
    if (fresh(maskBasis, cameraBasis)) return;
    const script = path.join(process.cwd(), "scripts", "frilagg-video.py");
    const frames = Math.round(duration * FPS);
    await produce(maskBasis, part => runProcess(job, tools.python!, [script, "--in", cameraBasis, "--out", part, "--ffmpeg", tools.ffmpeg!, "--bilder", String(frames), "--mitt", path.join(basis, "mask.json")], line => {
      const match = line.match(/^FRAMSTEG (\d+) (\d+)/);
      if (match) progress(Math.min(100, (100 * Number(match[1])) / Math.max(1, Number(match[2]))));
    }));
  } });

  // 5. Filmen (eller bara ljudet, med kapitel).
  const film = path.join(dir, settings.layout === "ljud" ? "ljud.m4a" : `film-${settings.layout}.mp4`);
  plan.push({ label: settings.layout === "ljud" ? "Ljudfilen" : "Filmen", run: async progress => {
    const metadata = path.join(basis, "kapitel.ffmeta");
    writeChapters(manifest, metadata, path.join(dir, "kapitel.txt"));
    if (settings.layout === "ljud") {
      await produce(film, part => ffmpeg(["-i", wav, "-f", "ffmetadata", "-i", metadata, "-map", "0:a", "-af", `${settings.loudness ? "loudnorm=I=-16:TP=-1.5:LRA=11," : ""}aresample=48000`, "-c:a", "aac", "-b:a", "160k", "-map_metadata", "1", "-map_chapters", "1", "-t", durationArg, "-movflags", "+faststart", part], progress));
      return;
    }
    const inputs: string[] = [];
    const add = (...args: string[]) => { inputs.push(...args); return inputs.filter(arg => arg === "-i").length - 1; };
    const slidesIn = needsSlides ? add("-i", slidesBasis) : -1;
    const cameraIn = needsCamera ? add("-i", cameraBasis) : -1;
    const maskIn = settings.layout === "frilagd" ? add("-i", maskBasis) : -1;
    const audioIn = audioSource ? add("-i", wav) : -1;
    const metaIn = add("-f", "ffmetadata", "-i", metadata);
    // Var personen står i kameran (om friläggningen har mätt det), så att utsnitten följer personen.
    const person = readPerson(basis);
    const cropX = (width: string) => person ? `:x='max(0,min(iw-${width},${person.center}-${width}/2))'` : "";
    // Slidesens bildrutor kommer bara när något ändras: jämna 30 bilder/s, och den sista står kvar till slutet.
    const slides = `[${slidesIn}:v]fps=${FPS}:start_time=0,tpad=stop_mode=clone:stop_duration=${Math.ceil(duration) + 5},format=yuv420p`;
    let graph: string;
    // Var Joel står, avsnitt för avsnitt (filmens regel och undantagen per slide). Varje kombination
    // av läge och storlek blir ett lager som bara syns under sina avsnitt. Intervallen är halvöppna, så
    // två lager aldrig syns i samma bildruta där de möts.
    const when = (list: [number, number][]) => `enable='${list.map(([a, b]) => `gte(t,${a.toFixed(3)})*lt(t,${b.toFixed(3)})`).join("+")}'`;
    const grouped = (segments: PersonSegment[]) => {
      const groups = new Map<string, { mode: PersonSegment["mode"]; size: BoxSize; rect?: PersonSegment["rect"]; list: [number, number][] }>();
      for (const segment of segments) {
        if (segment.mode === "dold") continue;
        const key = segment.rect ? `fri-${segment.rect.x}-${segment.rect.y}-${segment.rect.w}` : `${segment.mode}-${segment.size}`;
        if (!groups.has(key)) groups.set(key, { mode: segment.mode, size: segment.size, rect: segment.rect, list: [] });
        groups.get(key)!.list.push([segment.start, segment.end]);
      }
      return [...groups.values()];
    };
    /** En fri placering som lager: jämna mått (krävs av videokodningen), höjden ur bildens form. */
    const freeLayer = (rect: NonNullable<PersonSegment["rect"]>, aspect: number) => {
      const w = Math.max(2, Math.round(rect.w / 2) * 2);
      return { x: rect.x, y: rect.y, w, h: Math.max(2, Math.round((w * aspect) / 2) * 2) };
    };
    const chain = (layers: { x: number; y: number }[], label: (i: number) => string, list: (i: number) => [number, number][]) =>
      layers.map((layer, i) => `[${i === 0 ? "s" : `o${i - 1}`}][${label(i)}]overlay=${layer.x}:${layer.y}:eof_action=pass:${when(list(i))}${i === layers.length - 1 ? ",setsar=1,format=yuv420p[v]" : `[o${i}]`}`);
    if (settings.layout === "ruta") {
      // Kameran i en rundad ruta (4:3) i hörnet, en ruta per storlek som används.
      const groups = grouped(personSegments(manifest, settings));
      if (!groups.length) graph = `${slides}[v]`;
      else {
        const boxes = groups.map(group => ({ ...(group.rect ? freeLayer(group.rect, 3 / 4) : boxPlacement(settings.corner, group.size)), list: group.list }));
        const parts = [`${slides}[s]`, `[${cameraIn}:v]crop=w='trunc(ih*4/3/2)*2':h=ih${cropX("ow")}${boxes.length > 1 ? `,split=${boxes.length}${boxes.map((_, i) => `[c${i}]`).join("")}` : "[c0]"}`];
        boxes.forEach((box, i) => {
          const roundMask = path.join(basis, `ruta-${box.w}x${box.h}.pgm`);
          writeRoundedMask(roundMask, box.w, box.h, 22);
          const roundIn = add("-loop", "1", "-framerate", String(FPS), "-t", durationArg, "-i", roundMask);
          parts.push(`[c${i}]scale=${box.w}:${box.h}:flags=lanczos,format=yuva420p[k${i}]`, `[${roundIn}:v]format=gray[r${i}]`, `[k${i}][r${i}]alphamerge[b${i}]`);
        });
        parts.push(...chain(boxes, i => `b${i}`, i => boxes[i].list));
        graph = parts.join(";");
      }
    } else if (settings.layout === "frilagd") {
      // Hela den frilagda kamerabilden, nedskalad och ställd på bildens underkant: stor med personen
      // mitt i talarens yta, eller liten med personen mitt i hörnet. Ingen beskärning: utanför personen är
      // bilden genomskinlig, så inga kanter syns.
      const groups = grouped(personSegments(manifest, settings));
      if (!groups.length) graph = `${slides}[v]`;
      else {
        const layers = groups.map(group => ({ ...(group.rect ? freeLayer(group.rect, 9 / 16) : personRect(group.mode === "yta" ? "yta" : "horn", group.size, person)), list: group.list }));
        const parts = [`${slides}[s]`, `[${maskIn}:v]format=gray[m]`, `[${cameraIn}:v][m]alphamerge${layers.length > 1 ? `,split=${layers.length}${layers.map((_, i) => `[p${i}]`).join("")}` : "[p0]"}`];
        layers.forEach((layer, i) => parts.push(`[p${i}]scale=${layer.w}:${layer.h}:flags=lanczos[q${i}]`));
        parts.push(...chain(layers, i => `q${i}`, i => layers[i].list));
        graph = parts.join(";");
      }
    } else if (settings.layout === "sida") {
      graph = `${slides},scale=1440:810:flags=lanczos[s];[${cameraIn}:v]crop=w='trunc(ih*480/1080/2)*2':h=ih${cropX("ow")},scale=480:${H}:flags=lanczos[c];color=c=0x0d0d0f:s=${W}x${H}:r=${FPS}[bg];[bg][s]overlay=0:135:shortest=1[b];[b][c]overlay=1440:0:eof_action=pass,setsar=1,format=yuv420p[v]`;
    } else if (settings.layout === "slides") {
      graph = `${slides}[v]`;
    } else {
      graph = `[${cameraIn}:v]format=yuv420p[v]`;
    }
    const audio = audioIn >= 0 ? ["-map", `${audioIn}:a`, "-af", `${settings.loudness ? "loudnorm=I=-16:TP=-1.5:LRA=11," : ""}aresample=48000`, "-ac", "2", "-c:a", "aac", "-b:a", "192k"] : [];
    await produce(film, part => ffmpeg([...inputs, "-filter_complex", graph, "-map", "[v]", ...audio, "-map_metadata", String(metaIn), "-map_chapters", String(metaIn), ...videoCodec(tools, "film"), "-r", String(FPS), "-t", durationArg, "-movflags", "+faststart", part], progress));
  } });

  // 6. De separata spåren.
  const extras = settings.extras;
  if (extras.length) plan.push({ label: "Spåren", run: async progress => {
    const parts = extras.length;
    let done = 0;
    const part = (percent: number) => progress(Math.min(100, (100 * done + percent) / parts));
    for (const extra of extras) {
      if (extra === "ljud" && audioSource) fs.copyFileSync(wav, path.join(dir, "ljud.wav"));
      if (extra === "slides" && needsSlides) await produce(path.join(dir, "slides.mp4"), out => ffmpeg(["-i", slidesBasis, "-vf", `fps=${FPS}:start_time=0,tpad=stop_mode=clone:stop_duration=${Math.ceil(duration) + 5},format=yuv420p`, ...videoCodec(tools, "film"), "-t", durationArg, "-movflags", "+faststart", out], part));
      if (extra === "kamera" && needsCamera) await produce(path.join(dir, "kamera.mp4"), out => ffmpeg(["-i", cameraBasis, ...(audioSource ? ["-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"] : []), "-c:v", "copy", "-t", durationArg, "-movflags", "+faststart", out], part));
      if (extra === "mask") await produce(path.join(dir, "mask.mp4"), out => ffmpeg(["-i", maskBasis, "-vf", "format=yuv420p", ...videoCodec(tools, "film"), "-t", durationArg, "-movflags", "+faststart", out], part));
      if (extra === "du") await produce(path.join(dir, "du.mov"), out => ffmpeg(["-i", cameraBasis, "-i", maskBasis, "-filter_complex", "[1:v]format=gray[m];[0:v][m]alphamerge,format=yuva444p10le[v]", "-map", "[v]", "-c:v", "prores_ks", "-profile:v", "4444", "-alpha_bits", "16", "-vendor", "apl0", "-t", durationArg, out], part));
      done++;
      part(0);
    }
  } });

  return launch(slug, id, job, plan, { kind: "film", state: "kör", steps: [], step: 0, percent: 0, started: new Date().toISOString(), settings, files: listExportFiles(slug, id) });
}

/** Kör ett program, läs dess utskrift rad för rad, och avvisa med de sista felraderna om det misslyckas. */
export function runProcess(job: Job, command: string, args: string[], onLine: (line: string) => void, env?: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    if (job.cancelled) return reject(new Cancelled());
    const child = spawn(command, args, { windowsHide: true, cwd: process.cwd(), ...(env ? { env } : {}) });
    job.child = child;
    let tail = "";
    let buffer = "";
    const read = (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) onLine(line);
    };
    child.stdout.on("data", read);
    child.stderr.on("data", (chunk: Buffer) => { tail = (tail + chunk.toString()).slice(-4000); read(chunk); });
    child.on("error", error => { job.child = null; reject(error); });
    child.on("close", code => {
      job.child = null;
      if (job.cancelled) reject(new Cancelled());
      else if (code === 0) resolve();
      else reject(new Error(tail.trim().split(/\r?\n/).slice(-6).join("\n") || `${path.basename(command)} avslutades med kod ${code}`));
    });
  });
}
