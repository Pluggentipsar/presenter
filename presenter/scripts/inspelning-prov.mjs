#!/usr/bin/env node
/**
 * Provar inspelningen (tangenten I) från början till slut i en headless Edge eller Chrome med
 * låtsasmikrofon och låtsaskamera: öppnar decket, startar en inspelning, klickar framåt, pausar,
 * fortsätter, stoppar och kontrollerar sedan spåren och tidslinjen på disk med ffprobe.
 *
 * Användning (dev-servern måste vara igång):
 *   node scripts/inspelning-prov.mjs <slug> [--base http://127.0.0.1:3000] [--lage ljud|kamera|film] [--klick 4] [--vanta 2500]
 *
 * Webbläsaren får en egen tillfällig profil och stängs efteråt. Inspelningen hamnar som vanligt i
 * presenter/.inspelningar/<slug>/<id>/ (den riktiga mappen; ta bort provet där om det inte behövs).
 * Se docs/INSPELNING.md.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const slug = args.find((arg, i) => !arg.startsWith("--") && !args[i - 1]?.startsWith("--"));
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
if (!slug) {
  console.error("Användning: node scripts/inspelning-prov.mjs <slug> [--base http://127.0.0.1:3000] [--lage ljud|kamera|film] [--klick 4] [--vanta 2500]");
  process.exit(1);
}
const base = (option("base") || process.env.GRANSKA_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const mode = option("lage") || "film";
const clicks = Number(option("klick") || 4);
const pace = Number(option("vanta") || 2500);

const candidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
];
const browser = process.env.GRANSKA_BROWSER || candidates.find(path => existsSync(path));
if (!browser) { console.error("Hittar varken Edge eller Chrome. Sätt GRANSKA_BROWSER till sökvägen."); process.exit(1); }

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profile = mkdtempSync(join(tmpdir(), "inspelning-prov-"));
const port = 9300 + Math.floor(Math.random() * 600);
const child = spawn(browser, [
  "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required",
  // Låtsasenheter och automatiska ja: mikrofon, kamera och den egna fliken.
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--auto-accept-this-tab-capture",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1600,900", "about:blank",
], { stdio: "ignore", detached: process.platform !== "win32" });

function stop() {
  try {
    if (process.platform === "win32") {
      const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
      execFileSync("powershell", ["-NoProfile", "-Command", script], { stdio: "ignore" });
    } else if (child.pid) process.kill(-child.pid);
  } catch { /* redan stängd */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* låst en stund till */ }
}

/** ffprobe: det medpackade (scripts/hamta-verktyg.mjs), annars ur PATH. */
function ffprobe() {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const bundled = join(root, ".verktyg", "ffmpeg", process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  if (existsSync(bundled)) return bundled;
  try {
    const found = execFileSync(process.platform === "win32" ? "where" : "which", ["ffprobe"], { encoding: "utf8" }).split(/\r?\n/)[0].trim();
    if (found) return found;
  } catch { /* inte i PATH */ }
  return null;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const problems = [];
try {
  let targets;
  for (let i = 0; i < 100 && !targets; i++) {
    try { const res = await fetch(`http://127.0.0.1:${port}/json/list`); if (res.ok) targets = await res.json(); } catch { await sleep(200); }
  }
  const page = targets?.find(target => target.type === "page");
  if (!page) throw new Error("Webbläsaren svarade inte.");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") problems.push(`Undantag: ${message.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? message.params.exceptionDetails?.text}`);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") problems.push(`Konsolfel: ${message.params.args.map(arg => arg.value ?? arg.description ?? "").join(" ").slice(0, 300)}`);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expression => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const key = async (keyName, code, text) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code, text, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : keyName === "ArrowRight" ? 39 : 0 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : keyName === "ArrowRight" ? 39 : 0 });
  };
  /** Klicka på knappen med den här texten, som en riktig mus (flikinspelningen kräver ett användarklick). */
  const click = async label => {
    const box = await evaluate(`(() => { const b = [...document.querySelectorAll("aside[aria-label=Inspelning] button")].find(b => b.textContent.includes(${JSON.stringify(label)})); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    if (!box) throw new Error(`Hittar inte knappen ”${label}”.`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  };
  const panelText = () => evaluate(`document.querySelector("aside[aria-label=Inspelning]")?.innerText ?? ""`);
  const waitFor = async (test, label, limit = 20000) => {
    const until = Date.now() + limit;
    while (Date.now() < until) { const text = await panelText(); if (test(text)) return text; await sleep(250); }
    throw new Error(`Väntade förgäves på ${label}. Panelen: ${(await panelText()).replace(/\s+/g, " ").slice(0, 300)}`);
  };

  await send("Runtime.enable");
  await send("Page.enable");
  // Ingen emulerad storlek: flikinspelningen fångar det verkliga fönstret, och en emulerad sida ritas inte likadant.
  await send("Page.navigate", { url: `${base}/` });
  await sleep(1500);
  await evaluate(`localStorage.setItem("presenter-inspelning", JSON.stringify({ mode: ${JSON.stringify(mode)}, noiseSuppression: false }))`);
  await send("Page.navigate", { url: `${base}/${slug}` });
  await sleep(4000);

  console.log(`Provar ${mode} på ${base}/${slug} med ${browser}`);
  // Öppna panelen med I. Dev-servern kan behöva kompilera färdigt först, så försök tills den syns.
  for (let attempt = 0; attempt < 40 && !(await evaluate(`Boolean(document.querySelector("aside[aria-label=Inspelning]"))`)); attempt++) {
    await key("i", "KeyI", "i");
    await sleep(1500);
  }
  await sleep(1000);
  await click("Spela in");
  // ”Paus” finns först när inspelningen är igång (”Stoppa” syns redan medan den startar).
  const startText = await waitFor(text => text.includes("Paus") || /fick inte tillgång|kunde inte|kan inte/i.test(text), "att inspelningen startar", 60000);
  if (!startText.includes("Paus")) throw new Error(`Inspelningen startade inte: ${startText.replace(/\s+/g, " ")}`);
  console.log("Inspelningen startade.");
  for (let n = 0; n < clicks; n++) {
    await sleep(pace);
    await key("ArrowRight", "ArrowRight");
    if (process.env.PROV_DEBUG) console.log(`efter klick ${n + 1}: ${(await panelText()).replace(/\s+/g, " ").slice(0, 200)} | ${await evaluate("location.href")}`);
    if (n === Math.floor(clicks / 2)) {
      await click("Paus");
      await sleep(1500);
      await click("Fortsätt");
      console.log("Pausade och fortsatte.");
    }
  }
  await sleep(pace);
  if (process.env.PROV_DEBUG) console.log("panel:", await evaluate(`JSON.stringify({ rect: document.querySelector("aside[aria-label=Inspelning]")?.getBoundingClientRect(), vw: innerWidth, vh: innerHeight, panelUtanforSpelaren: !document.querySelector("[data-thumbnail-capture-root] aside[aria-label=Inspelning]") })`));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const shotFile = join(tmpdir(), `inspelning-prov-${slug}.png`);
  writeFileSync(shotFile, Buffer.from(shot.result.data, "base64"));
  await click("Stoppa");
  const doneText = await waitFor(text => text.includes("Sparad"), "att inspelningen sparas", 60000);
  const where = doneText.match(/\.inspelningar\/([a-z0-9-]+)\/(\S+)/);
  if (!where) throw new Error(`Hittar inte inspelningens mapp i panelen: ${doneText}`);
  const [, savedSlug, savedId] = where;
  console.log(`Sparad: .inspelningar/${savedSlug}/${savedId}`);
  ws.close();

  const manifest = JSON.parse(readFileSync(join(root, ".inspelningar", savedSlug, savedId, "inspelning.json"), "utf8"));
  const positions = manifest.timeline.filter(event => event.type === "position");
  console.log(`\nTidslinjen: ${manifest.timeline.length} händelser, ${positions.length} lägen, ${Math.round((manifest.durationMs ?? 0) / 100) / 10} s, avslutad ${manifest.ended ? "ja" : "NEJ"}`);
  for (const event of manifest.timeline) console.log(`  ${(event.t / 1000).toFixed(2).padStart(7)} s  ${event.type}${event.type === "position" ? `  slide ${event.index + 1}${event.slideId ? ` (${event.slideId})` : ""} steg ${event.step}/${event.steps}` : ""}`);
  if (!manifest.ended) problems.push("Manifestet saknar ended.");
  if (positions.length < 2) problems.push("Tidslinjen har färre än två lägen.");

  const probe = ffprobe();
  for (const [track, info] of Object.entries(manifest.tracks)) {
    const file = join(root, ".inspelningar", savedSlug, savedId, info.file);
    if (!existsSync(file) || info.bytes === 0) { problems.push(`Spåret ${track} saknas eller är tomt.`); continue; }
    let detail = "";
    if (probe) {
      try {
        const out = JSON.parse(execFileSync(probe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,sample_rate", "-of", "json", file], { encoding: "utf8" }));
        const streams = out.streams.map(s => s.codec_type === "video" ? `${s.codec_name} ${s.width}×${s.height}` : `${s.codec_name} ${s.sample_rate} Hz`).join(" + ");
        // Webbläsarens filer saknar ofta längd i huvudet; räkna då paketens tid.
        let duration = Number(out.format?.duration);
        if (!Number.isFinite(duration)) {
          const last = execFileSync(probe, ["-v", "error", "-select_streams", "0", "-show_entries", "packet=pts_time", "-of", "csv=p=0", file], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).pop();
          duration = Number(last);
        }
        detail = `${streams}, ${Number.isFinite(duration) ? `${duration.toFixed(1)} s` : "okänd längd"}`;
      } catch (error) {
        problems.push(`ffprobe kunde inte läsa ${track}: ${String(error.message).split("\n")[0]}`);
      }
    }
    console.log(`Spår ${track}: ${info.file}, ${(info.bytes / 1024 / 1024).toFixed(2)} MB, ${info.mime}${info.capture ? `, inspelning: ${info.capture}` : ""}${detail ? `, ${detail}` : ""}, start +${info.startOffsetMs} ms`);
  }
  console.log(`\nSkärmbild under inspelningen: ${shotFile}`);
} catch (error) {
  problems.push(error.message || String(error));
} finally {
  stop();
}
if (problems.length) {
  console.error(`\n${problems.length} problem:\n${problems.map(p => `  · ${p}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nInga problem.");
}
