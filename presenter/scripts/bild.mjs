#!/usr/bin/env node
/**
 * bild.mjs — generera slidebilder lokalt via ComfyUI (Z-Image-Turbo).
 *
 *   node scripts/bild.mjs --deck mitt-deck --name kobalt-rok \
 *     --prompt "tjock kobaltblå rök mot nattsvart" --register natt --n 4
 *
 * Bilderna hamnar i public/bilder/<deck>/<name>-<seed>.png och varje körning
 * loggas i public/bilder/<deck>/_prompter.md (prompt, seed, storlek) så att en
 * bild alltid går att göra om eller variera.
 *
 * Flaggor
 *   --deck      mapp under public/bilder (krävs)
 *   --name      filnamnsstam (krävs)
 *   --prompt    bildprompt på engelska eller svenska (krävs)
 *   --register  natt | glod | kobalt | papper | symbol | cutout | sticker | none  — lägger på registrets stilsuffix (default none)
 *               sticker = platt illustration med tjock bläckkontur i fyrfärgens pasteller, på vitt, 1280² — kör med --cut
 *               symbol = enfärgat linoleumsnitt på vitt, 1024² default, tänkt som mask
 *   --cut       gör även <fil>-cut.png: frilagd med rembg/BiRefNet (REMBG_PATH, `rembg` i inställningen eller rembg i PATH),
 *               egna färger + alfa. Läggs på en slide med figure="/bilder/<deck>/<fil>-cut.png".
 *               Kombinera med --register cutout (objekt på ljusgrå studiofond, 1280² default).
 *   --mask      gör även <fil>-mask.png: luminans → alfa, RGB svart (ffmpeg). Läggs på
 *               en slide med symbol="/bilder/<deck>/<fil>-mask.png" (withSlideBg) och
 *               får då färg från registret — bläck, cremevitt eller svart.
 *   --style     eget stilsuffix i stället för registrets
 *   --w --h     storlek, multiplar av 16 (default 1920 × 1088 = slide med 8 px bleed)
 *   --n         antal varianter (default 1). Körs som EN batch = ett jobb, ~10 s fast
 *               kostnad sparas per bild. --separate kör i stället N jobb med seed+i.
 *   --seed      startseed (default slump); varianter får seed+1, seed+2 …
 *   --steps     default 8 (Z-Image-Turbo är destillerad för 8)
 *   --cfg       default 1
 *   --shift     ModelSamplingAuraFlow shift, default 3
 *   --sampler   default res_multistep (officiella mallen); euler funkar också
 *   --dtype     viktformat vid laddning: default (bf16) | fp8_e4m3fn | fp8_e4m3fn_fast
 *   --server    åsidosätt COMFYUI_URL / sparad server (scripts/comfy.mjs configure)
 *   --dry       skriv ut grafen utan att köra
 *
 * Motorn: ComfyUI på den här datorn eller en annan (scripts/comfy.mjs configure).
 * Modell: Z-Image-Turbo (Tongyi, Apache-2.0 — fri för kommersiellt bruk).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkComfyServer, checkExecutable, comfyFetch, resolveComfyServer, resolveFfmpeg, resolveRembg } from "./comfy-client.mjs";

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
  if (!args[k]) { console.error(`Saknar --${k}. Se huvudet i scripts/bild.mjs.`); process.exit(1); }
  return String(args[k]);
}
const deck = need("deck");
const name = need("name");
const prompt = need("prompt");
const register = String(args.register ?? "none");
const isSymbol = ["symbol", "cutout", "sticker"].includes(String(args.register ?? ""));
const sq = ["cutout", "sticker"].includes(String(args.register ?? "")) ? 1280 : 1024;
const W = Number(args.w ?? (isSymbol ? sq : 1920));
const H = Number(args.h ?? (isSymbol ? sq : 1088));
const N = Number(args.n ?? 1);
const steps = Number(args.steps ?? 8);
const cfg = Number(args.cfg ?? 1);
const shift = Number(args.shift ?? 3);
const sampler = String(args.sampler ?? "res_multistep");
const dtype = String(args.dtype ?? "default");
const { url: server } = resolveComfyServer(args.server);
const ffmpegPath = resolveFfmpeg(ROOT);
const rembgPath = resolveRembg();
const seed0 = args.seed !== undefined ? Number(args.seed) : Math.floor(Math.random() * 2 ** 31);
if (W % 16 || H % 16) { console.error("Bredd och höjd måste vara multiplar av 16."); process.exit(1); }

// ---------------------------------------------------------------- registren
// Samma tre lägen som decket: natt (PosterText tone="dark" / register="natt"),
// kobalt (massivt #1533ff) och papper (varmt cremevitt, bläck). Suffixen är
// en startpunkt — finslipa i en egen promptbank.
const STYLES = {
  natt:
    "dark editorial photograph, near-black navy background fading into deep cobalt blue (#1533ff) light, volumetric smoke and soft haze, high contrast, subtle film grain, cinematic, no text, no letters, no people, no watermark",
  glod:
    "dark editorial photograph, near-black warm brown background fading into deep amber orange (#f08a2e) lamp light, volumetric smoke and soft warm haze, high contrast, subtle film grain, cinematic, no text, no letters, no people, no watermark",
  kobalt:
    "flat solid cobalt blue background (#1533ff), bold graphic brutalist composition, hard-edged shadows, off-white and black elements only, printed poster look, no text, no letters, no watermark",
  papper:
    "warm off-white paper background, black ink, brutalist print aesthetic, high contrast, minimal, risograph texture, no text, no letters, no watermark",
  symbol:
    "bold black ink linocut illustration, single centered symbol, pure white background, flat solid black shapes, high contrast, woodcut texture, brutalist poster art, no gradients, no text, no letters, no watermark",
  cutout:
    "isolated on a plain light grey seamless studio backdrop, single object, soft even studio lighting, sharp focus, high detail, editorial product photography, no text, no letters, no watermark",
  sticker:
    "flat vector sticker illustration, thick bold black outlines, simple chunky geometric shapes, limited palette of pastel yellow (#ffd33d), mint green (#6fe3a6), bubblegum pink (#ff8bb5) and lilac (#a48cff) with off-white, subtle risograph grain, playful modern editorial style, single subject centered, isolated on a plain pure white background, no text, no letters, no watermark",
  none: "",
};
const style = args.style !== undefined ? String(args.style) : (STYLES[register] ?? "");
const fullPrompt = style ? `${prompt}. ${style}` : prompt;

// ---------------------------------------------------------------- grafen
// API-format (inte UI-format). Nodnamn, inputs och värden verifierade mot
// /object_info och den inbyggda mallen image_z_image_turbo (ComfyUI 0.34).
function graph(seed, batch = 1) {
  return {
    "1": { class_type: "UNETLoader", inputs: { unet_name: "z_image_turbo_bf16.safetensors", weight_dtype: dtype } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: "qwen_3_4b.safetensors", type: "lumina2", device: "default" } },
    "3": { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
    "4": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["1", 0], shift } },
    "5": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0], text: fullPrompt } },
    "6": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["5", 0] } },
    "7": { class_type: "EmptySD3LatentImage", inputs: { width: W, height: H, batch_size: batch } },
    "8": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0], positive: ["5", 0], negative: ["6", 0], latent_image: ["7", 0],
        seed, steps, cfg, sampler_name: sampler, scheduler: "simple", denoise: 1,
      },
    },
    "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
    "10": { class_type: "SaveImage", inputs: { images: ["9", 0], filename_prefix: `presenter/${deck}/${name}` } },
  };
}

if (args.dry) { console.log(JSON.stringify(graph(seed0), null, 2)); process.exit(0); }

// ---------------------------------------------------------------- körning
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clientId = `presenter-${Date.now()}`;

async function queue(seed, batch = 1) {
  const res = await comfyFetch(`${server}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: graph(seed, batch), client_id: clientId }),
  });
  if (!res.ok) throw new Error(`ComfyUI svarade ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.node_errors && Object.keys(data.node_errors).length) {
    throw new Error("Nodfel: " + JSON.stringify(data.node_errors, null, 1));
  }
  return data.prompt_id;
}

async function waitFor(promptId) {
  for (;;) {
    const res = await comfyFetch(`${server}/history/${promptId}`);
    if (!res.ok) throw new Error(`Kunde inte följa ComfyUI-jobbet ${promptId}: HTTP ${res.status}`);
    const hist = await res.json();
    const entry = hist[promptId];
    if (entry) {
      if (entry.status?.status_str === "error") {
        throw new Error("Körningen misslyckades: " + JSON.stringify(entry.status?.messages ?? entry.status));
      }
      if (entry.outputs) return entry;
    }
    await sleep(500);
  }
}

async function download(img, target) {
  const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? "", type: img.type ?? "output" });
  const data = await comfyFetch(`${server}/view?${q}`, { timeoutMs: 120_000, readAs: "buffer" });
  fs.writeFileSync(target, data);
}

const outDir = path.join(ROOT, "public", "bilder", deck);
fs.mkdirSync(outDir, { recursive: true });
const logPath = path.join(outDir, "_prompter.md");
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, `# Genererade bilder · ${deck}\n\nLokal Z-Image-Turbo via ComfyUI. Varje rad går att göra om med samma seed.\n\n`);
}

try {
  if (args.mask) checkExecutable(ffmpegPath, ["-version"], "FFmpeg (FFMPEG_PATH)");
  if (args.cut) checkExecutable(rembgPath, ["--help"], "rembg (REMBG_PATH)");
  await checkComfyServer(server);
  console.log(`Genererar via ${server}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const t0 = Date.now();
const written = [];
const jobs = args.separate ? Array.from({ length: N }, (_, i) => ({ seed: seed0 + i, batch: 1 })) : [{ seed: seed0, batch: N }];
for (const job of jobs) {
  const { seed, batch } = job;
  const t = Date.now();
  const id = await queue(seed, batch);
  console.log(`ComfyUI-jobb: ${id}`);
  const entry = await waitFor(id);
  const images = Object.values(entry.outputs).flatMap((o) => o.images ?? []);
  for (const [k, img] of images.entries()) {
    const file = batch > 1 ? `${name}-${seed}-${k + 1}.png` : `${name}-${seed}.png`;
    await download(img, path.join(outDir, file));
    written.push(file);
    if (args.mask) {
      // Luminans → alfa: vitt blir genomskinligt, svart blir täckande; RGB nollas
      // så filen fungerar som CSS-mask oavsett bakgrund.
      const maskFile = file.replace(/.png$/, "-mask.png");
      const r = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-i", path.join(outDir, file), "-filter_complex", "[0:v]format=gray,negate[a];[0:v]format=rgba,lutrgb=r=0:g=0:b=0[c];[c][a]alphamerge,format=rgba", path.join(outDir, maskFile)], { stdio: "inherit", windowsHide: true });
      if (r.status === 0) { written.push(maskFile); console.log(`  ↳ mask: ${maskFile}`); } else console.error("  ffmpeg misslyckades med masken");
    }
    if (args.cut) {
      // Friläggning med BiRefNet via rembg, gärna i en egen venv (se resolveRembg). Modellen
      // hämtas första gången (~970 MB) till %USERPROFILE%/.rembg. 15–25 s per bild på CPU.
      const cutFile = file.replace(/\.png$/, "-cut.png");
      const r = spawnSync(rembgPath, ["i", "-m", "birefnet-general", path.join(outDir, file), path.join(outDir, cutFile)], { stdio: "inherit", windowsHide: true });
      if (r.status === 0) { written.push(cutFile); console.log("  ↳ frilagd: " + cutFile); } else console.error("  rembg misslyckades");
    }
    const secs = ((Date.now() - t) / 1000).toFixed(1);
    fs.appendFileSync(
      logPath,
      `- \`${file}\` · ${W}×${H} · seed ${seed}${batch > 1 ? ` (batch ${batch}, bild ${k + 1})` : ""} · ${steps} steg · ${secs} s · register ${register}\n  ${fullPrompt.replace(/\n/g, " ")}\n`,
    );
    console.log(`✓ ${path.relative(ROOT, path.join(outDir, file))}  (${secs} s)`);
  }
}
console.log(`${written.length} bild(er) på ${((Date.now() - t0) / 1000).toFixed(1)} s → /bilder/${deck}/`);
