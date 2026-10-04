#!/usr/bin/env node
/**
 * video.mjs — generera slidevideo lokalt via ComfyUI (Wan 2.2 TI2V 5B).
 *
 *   node scripts/video.mjs --deck mitt-deck --name natt-rok-4105 \
 *     --image public/bilder/mitt-deck/natt-rok-4105.png \
 *     --prompt "blue smoke drifting slowly, slow motion, no camera movement"
 *
 * Bild-till-video: stillbilden blir första rutan och modellen animerar den.
 * Utan --image blir det text-till-video. Rutorna sparas som PNG av ComfyUI,
 * sedan bygger ffmpeg två filer i public/bilder/<deck>/:
 *   <name>-<seed>.mp4       ping-pong-loop (fram + baklänges, skarvfri) — den
 *                           man lägger som background= på sliden
 *   <name>-<seed>-raw.mp4   klippet rakt fram, om loopen inte behövs
 * Varje körning loggas i public/bilder/<deck>/_prompter.md.
 *
 * Flaggor
 *   --deck, --name, --prompt   krävs
 *   --image     stillbild (sökväg relativ presenter/) → bild-till-video
 *   --neg       negativ prompt (default Wans standardlista)
 *   --w --h     default 1280 × 704 (modellens 720p-läge, multiplar av 16)
 *   --frames    default 121 = 5 s i 24 fps (4k+1)
 *   --fps       default 24
 *   --steps     default 20 · --cfg default 5 · --shift default 8
 *   --seed      startseed (default slump)
 *   --no-loop   hoppa över ping-pong-filen
 *   --keep      behåll PNG-rutorna (annars raderas de efter kodning)
 *   --resume    hämta ett färdigt prompt-id utan ny rendering; kör med samma övriga argument
 *   --server    åsidosätt COMFYUI_URL / sparad server (scripts/comfy.mjs configure)
 *   --dry       skriv ut grafen utan att köra
 *
 * Motorn: ComfyUI på den här datorn eller en annan (scripts/comfy.mjs configure).
 * Modell: Wan 2.2 TI2V 5B (Apache-2.0 — fri för kommersiellt bruk).
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkComfyServer, checkExecutable, comfyFetch, resolveComfyServer, resolveFfmpeg } from "./comfy-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------- argument
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i++; }
  }
}
function need(k) {
  if (!args[k]) { console.error(`Saknar --${k}. Se huvudet i scripts/video.mjs.`); process.exit(1); }
  return String(args[k]);
}
const deck = need("deck");
const name = need("name");
const prompt = need("prompt");
const resumeId = args.resume === undefined ? null : String(args.resume);
const image = args.image ? path.resolve(ROOT, String(args.image)) : null;
const W = Number(args.w ?? 1280);
const H = Number(args.h ?? 704);
const frames = Number(args.frames ?? 121);
const fps = Number(args.fps ?? 24);
const steps = Number(args.steps ?? 20);
const cfg = Number(args.cfg ?? 5);
const shift = Number(args.shift ?? 8);
const { url: server } = resolveComfyServer(args.server);
const ffmpegPath = resolveFfmpeg(ROOT);
const seed = args.seed !== undefined ? Number(args.seed) : Math.floor(Math.random() * 2 ** 31);
const NEG_DEFAULT =
  "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走";
const neg = args.neg !== undefined ? String(args.neg) : NEG_DEFAULT;
if (W % 16 || H % 16) { console.error("Bredd och höjd måste vara multiplar av 16."); process.exit(1); }
if ((frames - 1) % 4) { console.error("Antal rutor måste vara 4k+1 (81, 121, 161 …)."); process.exit(1); }
if (image && !fs.existsSync(image)) { console.error(`Hittar inte bilden ${image}`); process.exit(1); }

// ---------------------------------------------------------------- grafen
// API-format. Speglar den inbyggda mallen video_wan2_2_5B_ti2v (ComfyUI 0.34):
// UNETLoader → ModelSamplingSD3(8) → KSampler(20, cfg 5, uni_pc, simple).
// Bilden går in som start_image i Wan22ImageToVideoLatent. Rutorna sparas
// som PNG (SaveImage) i stället för SaveVideo — ffmpeg gör mp4 och loop.
function graph(uploadedName) {
  const g = {
    "1": { class_type: "UNETLoader", inputs: { unet_name: "wan2.2_ti2v_5B_fp16.safetensors", weight_dtype: "default" } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan", device: "default" } },
    "3": { class_type: "VAELoader", inputs: { vae_name: "wan2.2_vae.safetensors" } },
    "4": { class_type: "ModelSamplingSD3", inputs: { model: ["1", 0], shift } },
    "5": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: prompt } },
    "6": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: neg } },
    "7": { class_type: "Wan22ImageToVideoLatent", inputs: { vae: ["3", 0], width: W, height: H, length: frames, batch_size: 1 } },
    "8": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0], positive: ["5", 0], negative: ["6", 0], latent_image: ["7", 0],
        seed, steps, cfg, sampler_name: "uni_pc", scheduler: "simple", denoise: 1,
      },
    },
    "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
    "10": { class_type: "SaveImage", inputs: { images: ["9", 0], filename_prefix: `presenter/${deck}/frames/${name}-${seed}/f` } },
  };
  if (uploadedName) {
    g["11"] = { class_type: "LoadImage", inputs: { image: uploadedName } };
    g["7"].inputs.start_image = ["11", 0];
  }
  return g;
}

if (args.dry) { console.log(JSON.stringify(graph(image ? "example.png" : null), null, 2)); process.exit(0); }

// ---------------------------------------------------------------- körning
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clientId = `presenter-video-${Date.now()}`;

async function upload(file) {
  const form = new FormData();
  form.append("image", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("overwrite", "false");
  form.append("type", "input");
  const res = await comfyFetch(`${server}/upload/image`, { method: "POST", body: form, timeoutMs: 120_000 });
  if (!res.ok) throw new Error(`Uppladdning misslyckades: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

async function queue(g) {
  const res = await comfyFetch(`${server}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: g, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`ComfyUI svarade ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.node_errors && Object.keys(data.node_errors).length) throw new Error("Nodfel: " + JSON.stringify(data.node_errors, null, 1));
  return data.prompt_id;
}

async function waitFor(promptId) {
  for (;;) {
    const res = await comfyFetch(`${server}/history/${promptId}`);
    if (!res.ok) throw new Error(`Kunde inte följa ComfyUI-jobbet ${promptId}: HTTP ${res.status}`);
    const hist = await res.json();
    const entry = hist[promptId];
    if (resumeId && !entry) throw new Error(`Jobbet ${promptId} är inte färdigt eller saknas på servern.`);
    if (entry) {
      if (entry.status?.status_str === "error") throw new Error("Körningen misslyckades: " + JSON.stringify(entry.status?.messages ?? entry.status));
      if (entry.outputs) return entry;
    }
    await sleep(1000);
  }
}

async function download(img, target) {
  const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? "", type: img.type ?? "output" });
  const data = await comfyFetch(`${server}/view?${q}`, { timeoutMs: 120_000, readAs: "buffer" });
  fs.writeFileSync(target, data);
}

function ffmpeg(argsList) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...argsList], { stdio: "inherit", windowsHide: true });
  if (r.status !== 0) throw new Error("ffmpeg misslyckades (" + r.status + ")");
}

const outDir = path.join(ROOT, "public", "bilder", deck);
fs.mkdirSync(outDir, { recursive: true });
const logPath = path.join(outDir, "_prompter.md");
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, `# Genererade bilder · ${deck}\n\n`);

try {
  checkExecutable(ffmpegPath, ["-version"], "FFmpeg (FFMPEG_PATH)");
  await checkComfyServer(server);
  console.log(`${resumeId ? "Hämtar från" : "Genererar via"} ${server}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const t0 = Date.now();
const uploaded = !resumeId && image ? await upload(image) : null;
if (uploaded) console.log(`bild uppladdad: ${uploaded}`);
const id = resumeId || await queue(graph(uploaded));
console.log(`ComfyUI-jobb: ${id}`);
console.log(resumeId ? "Återupptar hämtning av färdig rendering …" : `kör ${frames} rutor ${W}×${H}, seed ${seed} …`);
const entry = await waitFor(id);
if (resumeId) {
  const original = entry.prompt?.[2];
  if (!original || original["8"]?.inputs.seed !== seed || original["7"]?.inputs.width !== W || original["7"]?.inputs.height !== H || original["7"]?.inputs.length !== frames || original["5"]?.inputs.text !== prompt || original["8"]?.inputs.steps !== steps || original["8"]?.inputs.cfg !== cfg) {
    throw new Error("Det färdiga jobbets inställningar matchar inte kommandot. Använd samma prompt, seed, storlek, rutor, steg och cfg som vid genereringen.");
  }
}
const images = Object.values(entry.outputs).flatMap((o) => o.images ?? []);
if (!images.length) throw new Error("Inga rutor kom tillbaka.");
const tGen = ((Date.now() - t0) / 1000).toFixed(0);

const framesDir = path.join(outDir, "_frames", `${name}-${seed}`);
fs.mkdirSync(framesDir, { recursive: true });
for (const [k, img] of images.entries()) {
  await download(img, path.join(framesDir, `f_${String(k + 1).padStart(5, "0")}.png`));
  if ((k + 1) % 20 === 0) console.log(`Hämtat ${k + 1}/${images.length} rutor`);
}
console.log(`${images.length} rutor hämtade (${resumeId ? "återupptagen hämtning" : `${tGen} s generering`})`);

const pattern = path.join(framesDir, "f_%05d.png");
const rawOut = path.join(outDir, `${name}-${seed}-raw.mp4`);
const loopOut = path.join(outDir, `${name}-${seed}.mp4`);
ffmpeg(["-framerate", String(fps), "-i", pattern, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", rawOut]);
if (!args["no-loop"]) {
  // fram + baklänges utan dubblerade vändrutor → skarvfri loop
  const n = images.length;
  const fc = `[0:v]split[a][b];[b]reverse,trim=start_frame=1:end_frame=${n - 1},setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1,format=yuv420p[v]`;
  ffmpeg(["-framerate", String(fps), "-i", pattern, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", loopOut]);
}
if (!args.keep) fs.rmSync(framesDir, { recursive: true, force: true });
try { if (fs.readdirSync(path.join(outDir, "_frames")).length === 0) fs.rmdirSync(path.join(outDir, "_frames")); } catch {}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1) + " MB";
fs.appendFileSync(
  logPath,
  `- \`${path.basename(loopOut)}\` (loop) + \`${path.basename(rawOut)}\` · ${W}×${H} · ${frames} rutor @ ${fps} fps · seed ${seed} · ${steps} steg cfg ${cfg} · ${secs} s${resumeId ? " (återupptagen hämtning)" : ""} · jobb ${id}${image ? ` · från \`${path.basename(image)}\`` : " · text-till-video"}\n  ${prompt.replace(/\n/g, " ")}\n`,
);
console.log(`✓ ${path.relative(ROOT, rawOut)} (${mb(rawOut)})`);
if (!args["no-loop"]) console.log(`✓ ${path.relative(ROOT, loopOut)} (${mb(loopOut)}, loop)`);
console.log(`klart på ${secs} s`);
