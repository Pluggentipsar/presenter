#!/usr/bin/env node
/**
 * Bilder mitt i förloppen: en headless Edge eller Chrome tar skärmbilder av /<slug>/scen vid en viss tid
 * in i ett läge. Granskningsvyn visar varje lägen färdig; det här visar vad publiken ser medan något
 * händer (agenter som rör sig, en text som skrivs, sidor som delas ut).
 *
 * Användning (dev-servern måste vara igång):
 *   node scripts/mellanlagen.mjs <slug> [--base http://127.0.0.1:3000] <slide>:<läge>:<sekunder>[:<css-mönster>] ...
 *
 *   13:1:3.2           canvasvärldar och tidsförlopp (useStepClock) ritas vid 3,2 s via ?simtid=
 *   8:0:2.2:pull       CSS-förlopp vars namn matchar mönstret spolas dessutom till 2,2 s och pausas
 *
 * Sliden räknas från 1 som i granskningsvyn och läget från 0 som i ?step=. Bilderna hamnar i presenter/.granska/<slug>/mellan/.
 *
 * Tiden gäller inte allt på sidan. Bilden tas efter ungefär 1,8 sekunder (3 sekunder med ett mönster),
 * vilken tid som än anges. Bara det som läser ?simtid visas vid den angivna tiden: canvasvärldar,
 * förlopp ur useStepClock och formernas räknare (CountUp). CSS-förlopp vars namn matchar mönstret spolas
 * via DevTools-protokollets Animation-domän, så även förlopp som redan har gått klart kan spolas
 * tillbaka; sidans övriga förlopp har då gått i 1,8 eller 3 sekunder. Ett brett mönster träffar också
 * slidens resa in, så att bilden kan visa två lägen på en gång. Se docs/GRANSKA.md.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const rest = args.filter((arg, i) => !arg.startsWith("--") && !args[i - 1]?.startsWith("--"));
const [slug, ...specs] = rest;
if (!slug || !specs.length) {
  console.error("Användning: node scripts/mellanlagen.mjs <slug> [--base http://127.0.0.1:3000] <slide>:<läge>:<sekunder>[:<css-mönster>] ...");
  process.exit(1);
}
const shots = specs.map(spec => {
  const [slide, step, time, pattern] = spec.split(":");
  if (!/^\d+$/.test(slide) || !/^\d+$/.test(step) || !Number.isFinite(Number(time))) { console.error(`Kan inte läsa ${spec}`); process.exit(1); }
  return { slide, step, time: Number(time), pattern };
});

const base = (option("base") || process.env.GRANSKA_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
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
const out = join(root, ".granska", slug, "mellan");
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "mellanlagen-"));
const port = 9300 + Math.floor(Math.random() * 600);
const child = spawn(browser, [
  "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1600,900", "about:blank",
], { stdio: "ignore", detached: process.platform !== "win32" });

/** Stänger webbläsaren med den tillfälliga profilen (på Windows lever den kvar efter startprogrammet). */
function stop() {
  try {
    if (process.platform === "win32") {
      const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${profile.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
      execFileSync("powershell", ["-NoProfile", "-Command", script], { stdio: "ignore" });
    } else if (child.pid) process.kill(-child.pid);
  } catch { /* redan stängd */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* låst en stund till */ }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let targets;
  for (let i = 0; i < 100 && !targets; i++) {
    try { const res = await fetch(`http://127.0.0.1:${port}/json/list`); if (res.ok) targets = await res.json(); } catch { await sleep(200); }
  }
  const page = targets?.find(target => target.type === "page");
  if (!page) throw new Error("Webbläsaren svarade inte.");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));
  let id = 0, started = [];
  const pending = new Map();
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Animation.animationStarted") started.push(message.params.animation);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });

  await send("Page.enable");
  await send("Animation.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const shot of shots) {
    started = [];
    await send("Page.navigate", { url: `${base}/${slug}/scen?slide=${shot.slide}&step=${shot.step}&direkt=1&simtid=${shot.time}` });
    // Sidan får ladda och sidans egna inträden gå klart innan förloppen spolas.
    await sleep(shot.pattern ? 3000 : 1800);
    // Utvecklingsserverns märke nere i hörnet hör inte till föreläsningen.
    await send("Runtime.evaluate", { expression: "document.head.append(Object.assign(document.createElement('style'), { textContent: 'nextjs-portal { display: none !important; }' }))" });
    let note = "";
    if (shot.pattern) {
      const match = new RegExp(shot.pattern);
      const ids = started.filter(animation => match.test(animation.name || "")).map(animation => animation.id);
      if (ids.length) {
        await send("Animation.setPaused", { animations: ids, paused: true });
        await send("Animation.seekAnimations", { animations: ids, currentTime: Math.round(shot.time * 1000) });
      }
      note = ` (${ids.length} CSS-förlopp spolade)`;
    }
    await sleep(250);
    const image = await send("Page.captureScreenshot", { format: "png" });
    const file = join(out, `${shot.slide}-${shot.step}-${shot.time}s.png`);
    writeFileSync(file, Buffer.from(image.result.data, "base64"));
    console.log(`${file}${note}`);
  }
  ws.close();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  stop();
}
