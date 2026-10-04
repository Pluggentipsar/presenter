#!/usr/bin/env node
// Exporterar ETT deck som statisk sajt: landningssida, visning, läsläge och scenruta.
//
//   node scripts/dela-export.mjs <slug>                bygg + exportera till .delning/<slug>/site
//   node scripts/dela-export.mjs <slug> --skip-build   återanvänd senaste bygget i .next-share
//   node scripts/dela-export.mjs <slug> --port=3100
//
// Så går det till:
//   1. Produktionsbygge till en egen mapp (.next-share) med PRESENTER_PUBLIC=1 — manus
//      (<Notes>), claude=-fält och planeringsprops rensas ur källan, och next/image
//      pekar direkt på filerna (en statisk värd har ingen /_next/image-tjänst).
//   2. `next start` på egen port. Dev-servern på 3000 rörs aldrig.
//   3. En headless Chrome går igenom landningssidan, HELA läsläget block för block och
//      HELA visningen klick för klick, och spelar in varje fil webbläsaren begär.
//   4. Exakt de filerna sparas. public/ är flera GB för alla deck tillsammans; den här
//      kopian innehåller bara det decket faktiskt laddar.
//
// Sidorna sparas som <väg>/index.html med samma adresser som i appen, så alla
// absoluta länkar (/<slug>/las, /_next/…, /bilder/…) fungerar oförändrade. Sajtens
// rot skickar vidare till landningssidan. Länkklick mellan sidorna blir vanliga
// sidladdningar: Next försöker hämta en RSC-payload, får HTML och faller tillbaka.
//
// Kräver Node 22+ och Chrome/Edge (CHROME_PATH). Se docs/DELNINGSPAKET.md.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const skipBuild = args.includes("--skip-build");
const port = Number(option("port", "3100"));
const distDir = ".next-share";
const outDir = path.resolve(root, option("out", path.join(".delning", slug ?? "", "site")));
const base = `http://localhost:${port}`;
const env = { ...process.env, PRESENTER_PUBLIC: "1", PRESENTER_DIST_DIR: distDir, NEXT_TELEMETRY_DISABLED: "1" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...parts) => console.log(`[dela-export]`, ...parts);

// I en git-worktree är node_modules en länk till huvudmappens, och Turbopack vägrar
// bygga när länken pekar utanför roten. Roten blir då den gemensamma föräldern,
// samma lösning som scripts/dev-worktree.mjs använder.
if (!env.PRESENTER_TURBOPACK_ROOT && fs.existsSync(path.join(root, "node_modules"))) {
  const realModules = fs.realpathSync(path.join(root, "node_modules"));
  if (!realModules.startsWith(root + path.sep)) {
    const a = root.split(path.sep);
    const b = realModules.split(path.sep);
    let i = 0;
    while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
    env.PRESENTER_TURBOPACK_ROOT = a.slice(0, i).join(path.sep);
    log(`node_modules är länkad → Turbopack-rot: ${env.PRESENTER_TURBOPACK_ROOT}`);
  }
}

if (!slug || !fs.existsSync(path.join(root, "content", `${slug}.mdx`))) {
  console.error("Användning: node scripts/dela-export.mjs <slug> [--skip-build] [--port=3100] [--out=mapp]");
  process.exit(2);
}
if (typeof WebSocket === "undefined") {
  console.error("Kräver Node 22 eller senare (inbyggd WebSocket).");
  process.exit(2);
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
let server = null;
let chrome = null;
let profile = null;
const cleanup = () => {
  try { chrome?.kill(); } catch {}
  try { server?.kill(); } catch {}
  if (profile) try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch {}
};
process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(130));

try {
  // ── 1. Bygg ────────────────────────────────────────────────────────────────
  if (!skipBuild) {
    // Next lägger till distDir i tsconfig.json vid bygge. Det är en spårad fil —
    // återställ den byte för byte, annars följer ändringen med i nästa commit.
    const tsconfigPath = path.join(root, "tsconfig.json");
    const tsconfig = fs.readFileSync(tsconfigPath);
    log(`bygger till ${distDir} (PRESENTER_PUBLIC=1) …`);
    const build = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env, stdio: "inherit" });
    fs.writeFileSync(tsconfigPath, tsconfig);
    if (build.status !== 0) throw new Error("bygget misslyckades — se utskriften ovan");
  } else if (!fs.existsSync(path.join(root, distDir, "BUILD_ID"))) {
    throw new Error(`${distDir} saknar bygge — kör utan --skip-build`);
  }

  // ── 2. Starta produktionsservern ──────────────────────────────────────────
  log(`startar next start på port ${port} …`);
  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { cwd: root, env, stdio: "ignore" });
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    await sleep(500);
    up = await fetch(`${base}/${slug}/dela`).then((r) => r.ok, () => false);
  }
  if (!up) throw new Error(`servern svarade inte på ${base}/${slug}/dela`);

  // Ett sista skydd: manus får inte finnas i någon av sidorna.
  for (const route of ["", "/scen", "/las", "/dela"]) {
    const html = await fetch(`${base}/${slug}${route}`).then((r) => (r.ok ? r.text() : ""));
    if (/SÄG:|STEG OCH PUBLIKENS FOKUS|PROVENIENS:/.test(html))
      throw new Error(`manustext hittades i /${slug}${route} — PRESENTER_PUBLIC verkar inte gälla`);
  }

  // ── 3. Spela in allt webbläsaren laddar ───────────────────────────────────
  const requested = new Map(); // väg → { mime, status }
  const cdp = await launchChrome();
  cdp.on("Network.responseReceived", ({ response }) => {
    let url;
    try { url = new URL(response.url); } catch { return; }
    if (url.origin !== base) return;
    if (url.searchParams.has("_rsc") || url.pathname.startsWith("/api/")) return;
    if (![200, 206, 304].includes(response.status)) return;
    const key = url.pathname + (url.pathname.startsWith("/_next/image") ? url.search : "");
    if (!requested.has(key)) requested.set(key, { mime: response.mimeType ?? "" });
  });
  const failures = new Set();
  cdp.on("Network.responseReceived", ({ response }) => {
    if (response.url.startsWith(base) && response.status >= 400 && !response.url.includes("_rsc="))
      failures.add(`${response.status} ${response.url.slice(base.length)}`);
  });

  log("landningssidan …");
  await cdp.goto(`${base}/${slug}/dela`, 7000);

  log("läsläget, block för block …");
  await cdp.goto(`${base}/${slug}/las`, 7000);
  const blocks = await cdp.evaluate(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const sections = [...document.querySelectorAll('section[id^="b-"]')];
    for (const el of sections) {
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.42 + 30);
      await sleep(850);
    }
    await sleep(1500);
    return sections.length;
  })()`);
  log(`  ${blocks} block`);

  log("visningen, klick för klick …");
  await cdp.goto(`${base}/${slug}`, 9000);
  let presses = 0, still = 0, last = "";
  while (still < 14 && presses < 1500) {
    await cdp.key("ArrowRight", 39);
    presses++;
    await sleep(420);
    const now = await cdp.evaluate("location.search + '|' + document.body.innerText.length");
    still = now === last ? still + 1 : 0;
    last = now;
  }
  await sleep(2500);
  log(`  ${presses} klick, slutade på ${last.split("|")[0] || "(första sliden)"}`);
  cdp.close();

  // ── 4. Spara exakt de filerna ─────────────────────────────────────────────
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  let files = 0, bytes = 0;
  const skipped = [];
  // Filer som decket använder i rummet men som inte får följa med ut, till exempel en film
  // som manuset säger ska länkas i stället för laddas upp (publish/utelamna.json, per slug).
  const excludeFile = path.join(root, "publish", "utelamna.json");
  const excluded = new Set((fs.existsSync(excludeFile) ? JSON.parse(fs.readFileSync(excludeFile, "utf8"))[slug] ?? [] : []).map((p) => p.replace(/^\/+/, "")));
  for (const [key, info] of requested) {
    if (key.startsWith("/_next/image")) { skipped.push(key); continue; }
    if (excluded.has(decodeURIComponent(key).replace(/^\/+/, ""))) { skipped.push(`utelämnad: ${key}`); log(`utelämnar ${key} (publish/utelamna.json)`); continue; }
    const response = await fetch(base + key);
    if (!response.ok) { skipped.push(`${response.status} ${key}`); continue; }
    const type = response.headers.get("content-type") ?? info.mime;
    const isPage = type.startsWith("text/html");
    const relative = decodeURIComponent(key).replace(/^\/+/, "");
    const target = path.join(outDir, isPage ? path.join(relative, "index.html") : relative);
    if (!target.startsWith(outDir)) { skipped.push(`utanför: ${key}`); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const body = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(target, body);
    files++; bytes += body.length;
  }
  fs.writeFileSync(
    path.join(outDir, "index.html"),
    `<!doctype html><html lang="sv"><meta charset="utf-8"><title>Delad föreläsning</title>` +
      `<meta http-equiv="refresh" content="0; url=/${slug}/dela/"><link rel="canonical" href="/${slug}/dela/">` +
      `<script>location.replace("/${slug}/dela/" + location.hash)</script>` +
      `<p><a href="/${slug}/dela/">Till föreläsningen</a></p></html>\n`,
  );
  files++;

  // ── 5. Läckagekontroll på det som faktiskt ska publiceras ──────────────────
  // HTML styr vi själva (public-source.ts): manus där är ett fel. JS-buntar kan
  // bära manustext som ligger inbakad i en scens content-register — det går inte
  // att rensa härifrån, men den som publicerar ska få veta det.
  // Minifierad JS skriver Ä som teckenföljden \xc4, därav båda formerna. I HTML
  // ligger sidans data som JSON i en sträng, så citattecknen där är \"…\".
  const NOTE_MARKERS = [/S(?:Ä|\\xc4)G:/, /PROVENIENS/, /K(?:Ä|\\xc4)LLGR(?:Ä|\\xc4)NS/, /Repetitionsbudget/, /STEG OCH PUBLIKENS/];
  const AUTHORING = /\\?"(syfte|visuell|kalla|claude)\\?":/g;
  const leaks = { html: [], js: [], authoringProps: [] };
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  for (const file of walk(outDir)) {
    const ext = path.extname(file);
    if (ext !== ".html" && ext !== ".js") continue;
    const text = fs.readFileSync(file, "utf8");
    const name = path.relative(outDir, file).split(path.sep).join("/");
    const hits = NOTE_MARKERS.filter((re) => re.test(text)).map((re) => re.source);
    if (hits.length) leaks[ext === ".html" ? "html" : "js"].push({ file: name, markers: hits });
    if (ext === ".html") {
      const props = [...new Set([...text.matchAll(AUTHORING)].map((m) => m[1]))];
      if (props.length) leaks.authoringProps.push({ file: name, props });
    }
  }

  const report = {
    slug, exportedAt: new Date().toISOString(), files, bytes,
    pages: [...requested].filter(([, v]) => v.mime.startsWith("text/html")).map(([k]) => k),
    skipped, failures: [...failures], leaks,
  };
  fs.writeFileSync(path.join(path.dirname(outDir), "export.json"), JSON.stringify(report, null, 2));
  log(`klart: ${files} filer, ${(bytes / 1048576).toFixed(1)} MB → ${path.relative(root, outDir)}`);
  if (skipped.length) log(`hoppade över ${skipped.length}: ${skipped.slice(0, 6).join(", ")}${skipped.length > 6 ? " …" : ""}`);
  if (failures.size) log(`OBS — ${failures.size} anrop misslyckades under genomgången: ${[...failures].slice(0, 8).join(", ")}`);
  if (files > 2500) log("VARNING: över 2 500 filer — here.now tar inte emot fler per sajt.");
  if (leaks.authoringProps.length)
    log(`OBS — planeringsfält finns kvar i sidans data (${[...new Set(leaks.authoringProps.flatMap((l) => l.props))].join(", ")}). Kontrollera att mallen inte läser dem och lägg till den i AUTHORING_PROPS (src/lib/share/public-source.ts).`);
  if (leaks.js.length)
    log(`OBS — manusliknande text ligger inbakad i ${leaks.js.length} JS-fil(er) (scenens content-register, inte <Notes>). Se export.json → leaks.js.`);
  if (leaks.html.length) {
    log(`FEL — manustext i HTML: ${leaks.html.map((l) => l.file).join(", ")}`);
    process.exit(1);
  }
  // claude= är aldrig innehåll: det är Joels arbetsinstruktioner till en AI.
  // Finns ett sådant fält kvar ska kopian inte publiceras.
  if (leaks.authoringProps.some((l) => l.props.includes("claude"))) {
    log("FEL — claude=-fält finns kvar i sidans data. Publicera inte; rätta rensningen i src/lib/share/public-source.ts.");
    process.exit(1);
  }
  process.exit(0);
} catch (error) {
  console.error(`[dela-export] FEL: ${error.message}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
function findChrome() {
  return [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

async function launchChrome() {
  const executable = findChrome();
  if (!executable) throw new Error("hittar ingen Chrome/Edge — sätt CHROME_PATH");
  const debugPort = 9500 + Math.floor(Math.random() * 300);
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "dela-export-"));
  chrome = spawn(executable, [
    "--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--mute-audio", "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required", "--window-size=1600,900", "about:blank",
  ], { stdio: "ignore" });
  let socketUrl = null;
  for (let i = 0; i < 80 && !socketUrl; i++) {
    await sleep(250);
    socketUrl = await fetch(`http://127.0.0.1:${debugPort}/json`)
      .then((r) => r.json()).then((list) => list.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? null)
      .catch(() => null);
  }
  if (!socketUrl) throw new Error("Chrome startade inte");
  const ws = new WebSocket(socketUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("CDP-anslutningen bröts")); });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    else if (message.method) (listeners.get(message.method) ?? []).forEach((fn) => fn(message.params));
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params }));
  });
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  return {
    on: (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]),
    goto: async (url, settle) => { await send("Page.navigate", { url }); await sleep(settle); },
    evaluate: async (expression) =>
      (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value,
    key: async (key, code) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: code });
    },
    close: () => ws.close(),
  };
}
