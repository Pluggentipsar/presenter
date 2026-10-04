#!/usr/bin/env node
/**
 * Hämtar verktygen som Presenter packar med sig, så att appen fungerar fristående (2 oktober 2026):
 *
 *   .verktyg/ffmpeg/    ffmpeg och ffprobe (LGPL, delade DLL:er) för exporten och avskriftens ljud.
 *   .verktyg/avskrift/  Avskrifts kommandoradsverktyg för avskriften: avskrift-textedit-probe.exe
 *                       (KB-Whisper via whisper.cpp och Vulkan) och align.exe (VoxRex via ONNX Runtime
 *                       och DirectML), med DirectML.dll.
 *
 * Mappen ligger utanför git (presenter/.gitignore). scripts/bygg-app.mjs lägger den i installationsfilen,
 * och dev-servern hittar den här. Modellerna (KB-Whisper, VoxRex) packas inte med; appen hämtar dem
 * första gången de behövs (inspelningssidan). Se docs/INSPELNING.md.
 *
 *   node scripts/hamta-verktyg.mjs [--avskrift-fran <mapp>] [--ffmpeg-fran <mapp>] [--utan-avskrift] [--om]
 *
 * --ffmpeg-fran   en mapp med ffmpeg.exe, ffprobe.exe och DLL:erna (annars hämtas BtbN:s LGPL-bygge)
 * --avskrift-fran en mapp med de tre filerna (annars verktyg/avskrift i datamappen, se scripts/lib/data-dir.mjs)
 * --utan-avskrift hoppa över Avskrifts verktyg (den publika installationsfilen, 4 oktober 2026: DirectML.dll
 *                 sprids inte förrän Microsofts villkor är kontrollerade)
 * --om            hämta om, även om verktygen redan finns
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { dataPath } from "./lib/data-dir.mjs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".verktyg");
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const again = args.includes("--om");

/** BtbN:s LGPL-bygge med delade bibliotek: samma som Avskrift packar med. Den rullande versionen är reserv. */
const FFMPEG = {
  tag: "autobuild-2026-10-01-13-06",
  asset: "ffmpeg-n8.1.3-14-g330caae0c1-win64-lgpl-shared-8.1.zip",
  sha256: "bf545d8fee9bb6957c1f3dea0f384bf64edead407d763326dbbd2de1b04768a4",
  fallback: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip",
};
const AVSKRIFT_FILES = ["avskrift-textedit-probe.exe", "align.exe", "DirectML.dll"];
const manifest = path.join(target, "verktyg.json");
const previous = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : {};

const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function download(url, file) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`${url} svarade ${response.status}`);
  const out = fs.createWriteStream(file);
  const total = Number(response.headers.get("content-length") ?? 0);
  let got = 0, shown = 0;
  for await (const chunk of response.body) {
    out.write(chunk);
    got += chunk.length;
    if (total && got - shown > total / 10) { shown = got; process.stdout.write(` ${Math.round((100 * got) / total)} %`); }
  }
  await new Promise((resolve, reject) => out.end(error => (error ? reject(error) : resolve())));
  process.stdout.write("\n");
}

/** Packa upp en zip med Windows egna tar (bsdtar), annars PowerShell. */
function unzip(zip, dir) {
  const windowsTar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
  const tar = process.platform === "win32" && fs.existsSync(windowsTar) ? windowsTar : "tar";
  if (spawnSync(tar, ["-xf", zip, "-C", dir], { stdio: "inherit" }).status === 0) return;
  const ps = spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force`], { stdio: "inherit" });
  if (ps.status !== 0) throw new Error("Kunde inte packa upp ffmpeg.");
}

const ffmpegVersion = dir => spawnSync(path.join(dir, "ffmpeg.exe"), ["-hide_banner", "-version"], { encoding: "utf8" }).stdout?.split("\n")[0]?.trim() ?? "";

async function ffmpeg() {
  const dir = path.join(target, "ffmpeg");
  if (!again && fs.existsSync(path.join(dir, "ffmpeg.exe"))) {
    console.log("ffmpeg finns redan.");
    return { ...(previous.ffmpeg ?? {}), version: ffmpegVersion(dir) };
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const from = option("ffmpeg-fran");
  let source;
  if (from) {
    for (const name of fs.readdirSync(from)) if ((/\.(exe|dll)$/i.test(name) && name !== "ffplay.exe") || /^LICENSE/i.test(name)) fs.copyFileSync(path.join(from, name), path.join(dir, name));
    source = { from: "en lokal mapp" };
  } else {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "presenter-ffmpeg-"));
    const zip = path.join(work, "ffmpeg.zip");
    let url = `https://github.com/BtbN/FFmpeg-Builds/releases/download/${FFMPEG.tag}/${FFMPEG.asset}`;
    process.stdout.write(`Hämtar ${FFMPEG.asset}`);
    try {
      await download(url, zip);
      if (sha256(zip) !== FFMPEG.sha256) throw new Error("Kontrollsumman stämmer inte.");
    } catch (error) {
      // BtbN rensar gamla byggen: ta den rullande versionen av samma utgåva.
      console.log(`  (${error.message} Tar den senaste 8.1 i stället.)`);
      url = FFMPEG.fallback;
      process.stdout.write("Hämtar den senaste 8.1");
      await download(url, zip);
    }
    unzip(zip, work);
    const folder = fs.readdirSync(work).find(name => name.startsWith("ffmpeg-") && fs.statSync(path.join(work, name)).isDirectory());
    if (!folder) throw new Error("Zipfilen hade inte väntat innehåll.");
    // ffplay behövs inte; ffmpeg, ffprobe och DLL:erna räcker.
    for (const name of fs.readdirSync(path.join(work, folder, "bin"))) if (name !== "ffplay.exe") fs.copyFileSync(path.join(work, folder, "bin", name), path.join(dir, name));
    if (fs.existsSync(path.join(work, folder, "LICENSE.txt"))) fs.copyFileSync(path.join(work, folder, "LICENSE.txt"), path.join(dir, "LICENSE-FFmpeg.txt"));
    source = { url, sha256: sha256(zip), license: "LGPL-3.0-or-later", source: "https://github.com/BtbN/FFmpeg-Builds" };
    fs.rmSync(work, { recursive: true, force: true });
  }
  const version = ffmpegVersion(dir);
  if (!version.startsWith("ffmpeg version")) throw new Error("ffmpeg startar inte efter hämtningen.");
  console.log(version);
  return { ...source, version };
}

function avskrift() {
  const dir = path.join(target, "avskrift");
  const candidates = [option("avskrift-fran"), dataPath(["verktyg", "avskrift"])].filter(Boolean);
  const from = candidates.find(folder => AVSKRIFT_FILES.every(name => fs.existsSync(path.join(folder, name))));
  if (!from) {
    console.warn("Avskrifts verktyg hittades inte (--avskrift-fran <mapp>). Appen fungerar, men utan avskrift.");
    return null;
  }
  if (!again && AVSKRIFT_FILES.every(name => fs.existsSync(path.join(dir, name)))) { console.log("Avskrifts verktyg finns redan."); }
  else {
    fs.mkdirSync(dir, { recursive: true });
    for (const name of AVSKRIFT_FILES) fs.copyFileSync(path.join(from, name), path.join(dir, name));
  }
  fs.writeFileSync(path.join(dir, "NOTICE.md"), `# Avskrifts kommandoradsverktyg

Byggda ur Avskrift (https://github.com/Pluggentipsar/avskrift, MIT, Joel Rangsjö):

- \`avskrift-textedit-probe.exe\` (model-tools/textedit-probe, \`cargo build --release --features vulkan\`):
  KB-Whisper med whisper.cpp (MIT) via whisper-rs (Unlicense), statiskt länkat.
- \`align.exe\` (crates/wordalign/examples/align.rs, \`--features directml\`): VoxRex-ordtider med
  ONNX Runtime 1.24.2 (MIT) via ort (MIT eller Apache-2.0), statiskt länkat.
- \`DirectML.dll\`: Microsoft DirectML Redistributable 1.15.4, som ort tar med sig. Kontrollera Microsofts
  villkor för att sprida filen innan en publik version.

Modellerna packas inte med: KB-Whisper (KBLab, Apache-2.0) och VoxRex (KBLab, CC0 1.0) hämtas av appen.
`);
  const files = Object.fromEntries(AVSKRIFT_FILES.map(name => [name, sha256(path.join(dir, name))]));
  console.log(`Avskrifts verktyg från ${from}.`);
  // Sökvägen skrivs inte i manifestet: det följer med installationsfilen.
  return { from: "Avskrifts byggen (lokal kopia)", files };
}

fs.mkdirSync(target, { recursive: true });
const utanAvskrift = args.includes("--utan-avskrift");
if (utanAvskrift) fs.rmSync(path.join(target, "avskrift"), { recursive: true, force: true });
const result = { hämtat: new Date().toISOString(), ffmpeg: await ffmpeg(), avskrift: utanAvskrift ? null : avskrift() };
if (utanAvskrift) delete previous.avskrift;
fs.writeFileSync(manifest, JSON.stringify({ ...previous, ...Object.fromEntries(Object.entries(result).filter(([, value]) => value)) }, null, 2));
console.log(`Klart: ${target}`);
