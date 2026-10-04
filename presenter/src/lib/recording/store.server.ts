import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renameWithRetry, renameWithRetrySync } from "./rename.server";
import {
  ID_PATTERN,
  SLUG_PATTERN,
  TRACKS,
  extensionFor,
  type RecordingManifest,
  type RecordingMode,
  type RecordingTrack,
  type TimelineEvent,
} from "./types";

/**
 * Inspelningarnas lagring på den lokala datorn (2 oktober 2026). En mapp per inspelning:
 * `.inspelningar/<slug>/<id>/` med spåren och `inspelning.json`. Mappen ligger utanför git
 * (presenter/.gitignore), eftersom filmerna är stora. `PRESENTER_INSPELNINGAR` kan peka ut en annan
 * mapp, till exempel på en större disk. Publika och skrivskyddade byggen spelar inte in.
 */

export const RECORDING_ROOT = process.env.PRESENTER_INSPELNINGAR || path.join(process.cwd(), ".inspelningar");

export function recordingsEnabled(): boolean {
  return !(Boolean(process.env.VERCEL) || process.env.PRESENTER_PUBLIC === "1" || process.env.PRESENTER_READONLY === "1");
}

export function validSlug(slug: string | null): slug is string {
  return Boolean(slug && SLUG_PATTERN.test(slug));
}
export function validId(id: string | null): id is string {
  return Boolean(id && ID_PATTERN.test(id));
}
export function validTrack(track: string | null): track is RecordingTrack {
  return Boolean(track && (TRACKS as string[]).includes(track));
}

export function recordingDir(slug: string, id: string): string {
  return path.join(RECORDING_ROOT, slug, id);
}

function manifestPath(slug: string, id: string): string {
  return path.join(recordingDir(slug, id), "inspelning.json");
}

export function readManifest(slug: string, id: string): RecordingManifest | null {
  try {
    return JSON.parse(fs.readFileSync(manifestPath(slug, id), "utf8")) as RecordingManifest;
  } catch {
    return null;
  }
}

function writeManifest(manifest: RecordingManifest): void {
  const file = manifestPath(manifest.slug, manifest.id);
  // Skriv först till en temporär fil och byt sedan namn, så att en krasch aldrig lämnar en halv manifestfil.
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(manifest, null, 2));
  renameWithRetrySync(`${file}.tmp`, file);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Ett nytt id ur klockslaget (lokal tid), med ett löpnummer om minuten redan har en inspelning. */
function newId(slug: string, now = new Date()): string {
  const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  let id = base;
  for (let n = 2; fs.existsSync(recordingDir(slug, id)); n++) id = `${base}-${n}`;
  return id;
}

export function startRecording(input: {
  slug: string;
  title: string;
  mode: RecordingMode;
  tracks: Partial<Record<RecordingTrack, { mime: string; width?: number; height?: number; capture?: "element" | "region" | "flik" }>>;
  devices?: { microphone?: string; camera?: string };
}): RecordingManifest {
  const id = newId(input.slug);
  fs.mkdirSync(recordingDir(input.slug, id), { recursive: true });
  const manifest: RecordingManifest = {
    version: 1,
    id,
    slug: input.slug,
    title: input.title,
    mode: input.mode,
    started: new Date().toISOString(),
    tracks: {},
    timeline: [],
    devices: input.devices,
  };
  for (const track of TRACKS) {
    const info = input.tracks[track];
    if (!info) continue;
    manifest.tracks[track] = {
      file: `${track}.${extensionFor(info.mime)}`,
      mime: info.mime,
      startOffsetMs: 0,
      bytes: 0,
      ...(info.width ? { width: info.width, height: info.height } : {}),
      ...(info.capture ? { capture: info.capture } : {}),
    };
  }
  writeManifest(manifest);
  return manifest;
}

/**
 * Lägg en bit sist i ett spår. Spelaren skickar bitarna i ordning, en i taget per spår, och försöker
 * igen tills servern svarar. Kommer samma bit igen (svaret nådde aldrig spelaren) hoppas den över, så
 * att filen aldrig får en dubblett. En lucka kan bara uppstå om servern tappat en bit den kvitterat;
 * då läggs nästa bit ändå till och luckan räknas i manifestet.
 */
export function appendChunk(slug: string, id: string, track: RecordingTrack, data: Uint8Array, seq: number, startOffsetMs?: number): { bytes: number; chunks: number } {
  const manifest = readManifest(slug, id);
  const info = manifest?.tracks[track];
  if (!manifest || !info) throw new Error("Okänd inspelning eller spår");
  const received = info.chunks ?? 0;
  if (seq < received) return { bytes: info.bytes, chunks: received };
  if (seq > received) info.gaps = (info.gaps ?? 0) + seq - received;
  const file = path.join(recordingDir(slug, id), info.file);
  if (seq === 0) fs.writeFileSync(file, data);
  else fs.appendFileSync(file, data);
  info.bytes = fs.statSync(file).size;
  info.chunks = seq + 1;
  if (seq === 0 && typeof startOffsetMs === "number" && Number.isFinite(startOffsetMs)) info.startOffsetMs = Math.max(0, Math.round(startOffsetMs));
  writeManifest(manifest);
  return { bytes: info.bytes, chunks: info.chunks };
}

export function saveTimeline(slug: string, id: string, timeline: TimelineEvent[], extra?: { durationMs?: number; ended?: boolean }): RecordingManifest {
  const manifest = readManifest(slug, id);
  if (!manifest) throw new Error("Okänd inspelning");
  manifest.timeline = timeline
    .filter(event => Number.isFinite(event.t))
    .map(event => ({ ...event, t: Math.max(0, Math.round(event.t)) }))
    .slice(0, 20000);
  if (extra?.durationMs !== undefined && Number.isFinite(extra.durationMs)) manifest.durationMs = Math.round(extra.durationMs);
  if (extra?.ended) manifest.ended = new Date().toISOString();
  writeManifest(manifest);
  return manifest;
}

/** Alla inspelningar, nyast först. Med slug bara det decket. */
export function listRecordings(slug?: string): RecordingManifest[] {
  if (!fs.existsSync(RECORDING_ROOT)) return [];
  const slugs = slug ? [slug] : fs.readdirSync(RECORDING_ROOT).filter(name => SLUG_PATTERN.test(name));
  const out: RecordingManifest[] = [];
  for (const s of slugs) {
    const dir = path.join(RECORDING_ROOT, s);
    if (!fs.existsSync(dir)) continue;
    for (const id of fs.readdirSync(dir)) {
      if (!ID_PATTERN.test(id)) continue;
      const manifest = readManifest(s, id);
      if (manifest) out.push(manifest);
    }
  }
  return out.sort((a, b) => b.started.localeCompare(a.started));
}

/** En fil i inspelningens mapp eller dess exportmapp (`export/<namn>`), om namnet är säkert. */
export function recordingFile(slug: string, id: string, name: string): string | null {
  if (!/^(?:export\/)?[a-z0-9][a-z0-9._-]{0,80}$/i.test(name) || name.includes("..")) return null;
  const file = path.join(recordingDir(slug, id), ...name.split("/"));
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

/* ── Flytta mellan datorer ─────────────────────────────────────────────────── */

/**
 * Importen (2 oktober 2026): en inspelning från en annan dator, till exempel laptopen, tas in här
 * för att exporteras där friläggningen finns. Filerna landar först i en tillfällig mapp
 * (`.import-<id>`, som listan hoppar över) och får sitt riktiga namn när alla har kommit fram.
 */
export const IMPORT_FILE_PATTERN = /^(?:inspelning\.json|(?:ljud|kamera|slides)\.(?:webm|mp4))$/;

export function importDir(slug: string, id: string): string {
  return path.join(RECORDING_ROOT, slug, `.import-${id}`);
}

/** Klar: manifestet ska höra till just den här inspelningen och alla spår ska ha rätt storlek. */
export async function finishImport(slug: string, id: string): Promise<RecordingManifest> {
  const dir = importDir(slug, id);
  let manifest: RecordingManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "inspelning.json"), "utf8")) as RecordingManifest;
  } catch {
    throw new Error("Manifestet (inspelning.json) saknas eller går inte att läsa.");
  }
  if (manifest.version !== 1 || manifest.slug !== slug || manifest.id !== id) throw new Error("Manifestet hör till en annan inspelning.");
  for (const [track, info] of Object.entries(manifest.tracks)) {
    const file = path.join(dir, info?.file ?? "");
    if (!info || !fs.existsSync(file)) throw new Error(`Spåret ${track} (${info?.file}) saknas.`);
    const size = fs.statSync(file).size;
    if (info.bytes && size !== info.bytes) throw new Error(`Spåret ${track} är ${size} byte men ska vara ${info.bytes}. Kopierades det klart?`);
  }
  const target = recordingDir(slug, id);
  if (fs.existsSync(target)) throw new Error("Inspelningen finns redan här.");
  // Nyss kopierade filmer kan hållas en stund av ett antivirusprogram; då väntar vi in det.
  await renameWithRetry(dir, target);
  return manifest;
}

/** Öppna inspelningens mapp i datorns filhanterare (bara den lokala verkstaden). */
export function revealRecording(slug: string, id: string): boolean {
  const dir = recordingDir(slug, id);
  if (!fs.existsSync(dir)) return false;
  const [command, args] = process.platform === "win32" ? ["explorer.exe", [dir]] : process.platform === "darwin" ? ["open", [dir]] : ["xdg-open", [dir]];
  spawn(command, args, { detached: true, stdio: "ignore", windowsHide: false }).unref();
  return true;
}

/* ── Valen per slide ───────────────────────────────────────────────────────── */

/**
 * Joels val per slide i filmen (dold, liten i hörnet, stor i ytan, fritt placerad, storlek), sparade per
 * föreläsning i `.inspelningar/<slug>/val.json`, så att nästa inspelning av samma film börjar med dem.
 */
export function readChoices(slug: string): Record<string, unknown> {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(RECORDING_ROOT, slug, "val.json"), "utf8")) as { perSlide?: Record<string, unknown> };
    return value.perSlide ?? {};
  } catch {
    return {};
  }
}

export function writeChoices(slug: string, perSlide: Record<string, unknown>): void {
  const dir = path.join(RECORDING_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "val.json");
  fs.writeFileSync(`${file}.tmp`, JSON.stringify({ perSlide, updated: new Date().toISOString() }, null, 2));
  renameWithRetrySync(`${file}.tmp`, file);
}
