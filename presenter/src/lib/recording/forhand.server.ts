import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { basisDir, findTools, readPerson } from "./export.server";
import { renameWithRetry } from "./rename.server";
import { readManifest, recordingDir } from "./store.server";

/**
 * Exportvyns förhandsbilder (2 oktober 2026): en bildruta av sliden vid en viss tid, och en frilagd
 * bildruta av Joel. Bildrutorna tas ur inspelningen, så de visar exakt det som spelades in, och
 * sparas i `export/underlag/rutor/` så att de bara görs en gång.
 */

function run(command: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    const child = spawn(command, args, { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", code => resolve(code === 0));
  });
}

/**
 * Sliden vid tiden t (sekunder), 640 bildpunkter bred (1280 för placeringsvyn): ur slidesens underlag,
 * annars ur originalspåret.
 */
export async function slideFrame(slug: string, id: string, seconds: number, width: 640 | 1280 = 640): Promise<string | null> {
  const manifest = readManifest(slug, id);
  const track = manifest?.tracks.slides;
  if (!manifest || !track?.bytes) return null;
  const tools = await findTools();
  if (!tools.ffmpeg) return null;
  const dir = path.join(basisDir(slug, id), "rutor");
  fs.mkdirSync(dir, { recursive: true });
  const t = Math.max(0, Math.min(seconds, (manifest.durationMs ?? 0) / 1000 - 0.1));
  const file = path.join(dir, `${Math.round(t * 10)}${width === 640 ? "" : `-${width}`}.jpg`);
  if (fs.existsSync(file)) return file;
  const basis = path.join(basisDir(slug, id), "slides.mp4");
  const fromBasis = fs.existsSync(basis);
  const source = fromBasis ? basis : path.join(recordingDir(slug, id), track.file);
  // Originalet har fönstrets proportioner: samma centrerade 16:9 som exporten.
  const crop = fromBasis ? "" : "crop=w='min(iw,ih*16/9)':h='min(ih,iw*9/16)',";
  const part = file.replace(/\.jpg$/, ".part.jpg");
  const ok = await run(tools.ffmpeg, ["-hide_banner", "-v", "error", "-y", "-ss", t.toFixed(2), "-i", source, "-frames:v", "1", "-vf", `${crop}scale=${width}:-2`, "-q:v", "4", part]);
  if (!ok || !fs.existsSync(part)) return null;
  await renameWithRetry(part, file);
  return file;
}

/**
 * Kameran i rutans form (4:3, 480 bred), utskuren som exporten skär ut den: ur kamerans underlag,
 * annars ur originalspåret med samma skalning. Följer personen i sidled när friläggningen har mätt.
 */
export async function cameraFrame(slug: string, id: string): Promise<string | null> {
  const manifest = readManifest(slug, id);
  const track = manifest?.tracks.kamera;
  if (!manifest || !track?.bytes) return null;
  const basis = basisDir(slug, id);
  const fromBasis = path.join(basis, "kamera.mp4");
  const source = fs.existsSync(fromBasis) ? fromBasis : path.join(recordingDir(slug, id), track.file);
  const file = path.join(basis, "kamera-ruta.jpg");
  if (fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(source).mtimeMs) return file;
  const tools = await findTools();
  if (!tools.ffmpeg) return null;
  fs.mkdirSync(basis, { recursive: true });
  const person = readPerson(basis);
  const x = person ? `:x='max(0,min(iw-ow,${person.center}-ow/2))'` : "";
  const t = ((manifest.durationMs ?? 2000) / 1000 / 2).toFixed(2);
  const part = file.replace(/\.jpg$/, ".part.jpg");
  const ok = await run(tools.ffmpeg, ["-hide_banner", "-v", "error", "-y", "-ss", t, "-i", source, "-frames:v", "1", "-vf", `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,crop=w=1440:h=1080${x},scale=480:-2`, "-q:v", "4", part]);
  if (!ok || !fs.existsSync(part)) return null;
  await renameWithRetry(part, file);
  return file;
}

/** Joel frilagd (PNG med genomskinlig bakgrund, hela kamerabilden), när friläggningen finns. */
export async function personFrame(slug: string, id: string): Promise<string | null> {
  const basis = basisDir(slug, id);
  const camera = path.join(basis, "kamera.mp4"), mask = path.join(basis, "mask.mkv"), file = path.join(basis, "person.png");
  if (!fs.existsSync(camera) || !fs.existsSync(mask)) return null;
  if (fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(mask).mtimeMs) return file;
  const tools = await findTools();
  if (!tools.ffmpeg) return null;
  const manifest = readManifest(slug, id);
  const t = ((manifest?.durationMs ?? 2000) / 1000 / 2).toFixed(2);
  const part = file.replace(/\.png$/, ".part.png");
  const ok = await run(tools.ffmpeg, ["-hide_banner", "-v", "error", "-y", "-ss", t, "-i", camera, "-ss", t, "-i", mask, "-filter_complex", "[1:v]format=gray[m];[0:v][m]alphamerge,scale=960:-2", "-frames:v", "1", part]);
  if (!ok || !fs.existsSync(part)) return null;
  await renameWithRetry(part, file);
  return file;
}
