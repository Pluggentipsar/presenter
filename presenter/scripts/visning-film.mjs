#!/usr/bin/env node
/**
 * Visningen som film (3 oktober 2026). En headless Edge eller Chrome spelar upp ett deck klick för
 * klick i 1600 × 900 och spelar in skärmen med DevTools-protokollets screencast; ffmpeg gör en jämn
 * mp4 av bildrutorna. Bra för en förhandstitt i telefonen och för film på en webbsida.
 *
 *   node scripts/visning-film.mjs <slug> [--base http://127.0.0.1:3000] [--sekunder 3] [--bredd 1280] [--start 7]
 *
 * Antalet lägen per slide läses ur granskningens rapport (.granska/<slug>/rapport.json), så kör
 * granskningen först. --sekunder är tiden varje läge står, --start sekunderna sidan får på sig att
 * ladda innan inspelningen börjar och --bredd filmens bredd. Filmen hamnar i
 * .granska/<slug>/filmer/visning.mp4. Kräver Node 22 (inbyggd WebSocket) och ffmpeg med libx264.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith("--") && !/^\d/.test(arg) && !/^https?:/.test(arg));
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
if (!slug) {
  console.error("Användning: node scripts/visning-film.mjs <slug> [--base http://127.0.0.1:3000] [--sekunder 3] [--bredd 1280] [--start 7]");
  process.exit(1);
}
const base = option("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const hold = Number(option("sekunder", "3")) * 1000;
const width = Number(option("bredd", "1280"));
const settle = Number(option("start", "7")) * 1000;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportFile = join(root, ".granska", slug, "rapport.json");
if (!existsSync(reportFile)) { console.error(`Hittar ingen granskning för ${slug}. Kör granska-edge.mjs först.`); process.exit(1); }
const report = JSON.parse(readFileSync(reportFile, "utf8"));
const states = report.slides.reduce((sum, slide) => sum + (slide.kept ?? slide.total ?? 1), 0);

const candidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
];
const browser = process.env.GRANSKA_BROWSER || candidates.find((p) => existsSync(p));
if (!browser) { console.error("Hittar varken Edge eller Chrome. Sätt GRANSKA_BROWSER till sökvägen."); process.exit(1); }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "visning-film-"));
const frameDir = mkdtempSync(join(tmpdir(), "visning-bilder-"));
const child = spawn(browser, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1700,1100",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
  "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore" });
const cleanup = () => {
  try { child.kill(); } catch { /* redan stängd */ }
  for (const dir of [profile, frameDir]) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* låst en stund */ } }
};
process.on("SIGINT", () => { cleanup(); process.exit(130); });

// Sidans DevTools-anslutning.
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* startar */ }
}
if (!target) { console.error("Webbläsaren svarade inte."); cleanup(); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
const listeners = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result ?? {}); pending.delete(message.id); }
  else if (message.method) for (const fn of listeners.get(message.method) ?? []) fn(message.params);
};
const send = (method, params = {}) => new Promise((resolve) => { const id = ++nextId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const on = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]);

// Bildrutorna med sina tider.
const frames = [];
on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  if (!frames.length) console.log(`Ytan: ${metadata.deviceWidth} × ${metadata.deviceHeight}, skala ${metadata.pageScaleFactor}.`);
  const file = join(frameDir, `f_${String(frames.length + 1).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp });
  send("Page.screencastFrameAck", { sessionId });
});

await send("Page.enable");
// Skärminspelningens yta är mindre än fönstret och varierar (headless räknar in plats för
// verktygsfält och rullningslist), så fönstret har marginal åt båda hållen och sidan ritas i exakt
// 1600 × 900 uppe till vänster.
await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise((resolve) => on("Page.loadEventFired", resolve));
await send("Page.navigate", { url: `${base}/${slug}` });
await loaded;
// Utvecklingsserverns märke nere i hörnet hör inte till föreläsningen.
await send("Runtime.evaluate", { expression: "document.head.append(Object.assign(document.createElement('style'), { textContent: 'nextjs-portal { display: none !important; }' }))" });
await sleep(settle);

console.log(`Spelar in ${slug}: ${states} lägen à ${hold / 1000} s.`);
// Bildrutorna tas i ytans fulla storlek; ffmpeg beskär sedan sidans 1600 × 900 uppe till vänster.
await send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 4000, maxHeight: 3000, everyNthFrame: 1 });
await sleep(hold);
for (let i = 1; i < states; i++) {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", { type, key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
  }
  await sleep(hold);
}
await send("Page.stopScreencast");
const end = Date.now() / 1000;
await sleep(300);
try { await send("Browser.close"); } catch { /* stängd */ }
ws.close();

if (frames.length < 2) { console.error("Inspelningen gav inga bildrutor."); cleanup(); process.exit(1); }
// Varje bildruta står tills nästa kom; den sista står kvar till slutet.
const lines = [];
frames.forEach((frame, i) => {
  // Den sista bildrutan står till inspelningens slut (tidsstämplarna räknas från 1970, som Date.now()).
  const tail = end - frame.t;
  const next = i + 1 < frames.length ? frames[i + 1].t : frame.t + (tail > 0 && tail < 60 ? tail : hold / 1000);
  lines.push(`file '${frame.file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, next - frame.t).toFixed(4)}`);
});
lines.push(`file '${frames.at(-1).file.replace(/\\/g, "/")}'`);
const list = join(frameDir, "bilder.txt");
writeFileSync(list, lines.join("\n"));

const outDir = join(root, ".granska", slug, "filmer");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "visning.mp4");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const result = spawnSync(ffmpeg, [
  "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
  "-vf", `crop=1600:900:0:0,fps=30,scale=${width}:-2:flags=lanczos,format=yuv420p`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", out,
], { stdio: "inherit" });
cleanup();
if (result.status !== 0) { console.error("ffmpeg kunde inte göra filmen. Kräver ffmpeg med libx264 (FFMPEG_PATH)."); process.exit(1); }
console.log(`Klar: ${out} (${frames.length} bildrutor)`);
