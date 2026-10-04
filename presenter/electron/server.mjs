/**
 * Servern bakom fönstret.
 *
 * Skalet är tunt: Presenter är samma Next-app som i webbläsaren. Här avgörs bara
 * var den körs:
 *
 *   1. Kör Joels vanliga dev-server redan på port 3000 (startad i en terminal)?
 *      Då används den — inget startas dubbelt, och terminalen behåller sina loggar.
 *   2. Annars startas `next dev` på första lediga port från 3000, med
 *      föreläsningsmappens presenter/ som arbetskatalog. Den stoppas när appen
 *      avslutas.
 *
 * Snabbt läge (menyn, eller --snabb): appen bygger Presenter färdigt själv
 * (`next build` till presenter/.next-app, en halv minut första gången, några
 * sekunder sedan tack vare byggcachen) och kör `next start`. Sidor öppnas
 * utan kompilering, gränssnittet svarar två till fyra gånger fortare och
 * miniatyrerna fångas snabbare. Bygget görs om när koden har ändrats sedan
 * förra gången — vid start, efter "Hämta senaste" och med "Bygg om nu". En
 * dev-server på 3000 används inte i snabbt läge.
 *
 * Next körs med Electrons inbyggda Node (ELECTRON_RUN_AS_NODE), så datorn
 * behöver inte ha Node installerat. Paketen (node_modules) kommer antingen
 * från en vanlig `npm install` i repot, eller — i den installerade appen —
 * från en inbyggd kopia som läggs in i föreläsningsmappen första gången.
 *
 * Utvecklingsläget är standard av samma skäl som i terminalen: sidorna läser
 * MDX-filerna från disk, och kod som en agent ändrar syns direkt. I snabbt
 * läge läses decken också från disk vid varje sidvisning — det är bara koden
 * (mallarna, verkstaden) som är fryst till nästa bygge.
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repot som skalet själv ligger i — gäller när appen körs med `npm run app`. */
export const checkoutRepoDir = path.resolve(here, "..", "..");

/** Föreläsningsmappen (repot) och dess presenter/. Sätts av main.mjs vid start. */
export let repoDir = checkoutRepoDir;
export let presenterDir = path.join(repoDir, "presenter");

export function setRepoDir(dir) {
  repoDir = path.resolve(dir);
  presenterDir = path.join(repoDir, "presenter");
}

/** Ser mappen ut som repot: presenter/ med package.json och content/? */
export function isRepoDir(dir) {
  if (!dir) return false;
  return fs.existsSync(path.join(dir, "presenter", "package.json")) && fs.existsSync(path.join(dir, "presenter", "content"));
}

const logFile = () => path.join(presenterDir, ".presenter-app.log");

/** Svarar Presenter på den här adressen? (Inte bara "någon" server — sidan ska vara vår.) */
export async function isPresenter(url, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal, redirect: "manual" });
    clearTimeout(timer);
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes("Presenter");
  } catch {
    return false;
  }
}

/** Ledig = ingen svarar på porten. (Att lyssna på prov är inte tillförlitligt på Windows: en annan lyssnare kan dela porten.) */
function portIsFree(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (free) => { socket.destroy(); resolve(free); };
    socket.once("connect", () => done(false));
    socket.once("error", (error) => done(error.code === "ECONNREFUSED"));
    socket.setTimeout(1500, () => done(false));
  });
}

async function firstFreePort(from) {
  for (let port = from; port < from + 20; port++) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`Ingen ledig port mellan ${from} och ${from + 19}.`);
}

export function readLog(lines = 80) {
  try {
    return fs.readFileSync(logFile(), "utf8").split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
}

/* ── Paketen ─────────────────────────────────────────────────────────────── */

/** Den installerade appens medpackade verktyg (finns bara i paketerad app). */
export function bundledToolsDir() {
  const dir = path.join(process.resourcesPath ?? "", "verktyg");
  return fs.existsSync(path.join(dir, "verktyg.json")) ? dir : null;
}

/** Den installerade appens inbyggda node_modules (finns bara i paketerad app). */
export function bundledModulesDir() {
  const dir = path.join(process.resourcesPath ?? "", "node_modules");
  return fs.existsSync(path.join(dir, "next", "dist", "bin", "next")) ? dir : null;
}

function lockHash(file) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

const MARKER = ".presenter-app.json";

function readMarker(modulesDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(modulesDir, MARKER), "utf8"));
  } catch {
    return null;
  }
}

const LOCK_NOTICE =
  "Paketlistan i föreläsningsmappen (presenter/package-lock.json) är inte den som appens inbyggda paket byggdes från. Fungerar något inte: hämta en nyare version av appen från GitHub.";

/**
 * Se till att presenter/node_modules finns i föreläsningsmappen.
 *
 * - Finns paketen redan från `npm install` används de som de är.
 * - Saknas de och appen har en inbyggd kopia läggs den in (första gången —
 *   det tar en stund). En markörfil i mappen minns vilken paketlista kopian
 *   byggdes från.
 * - Är kopian från en annan version av appen byts den ut mot appens.
 *
 * Returnerar { source, copied, notice }: source är "npm" eller "app", notice
 * ett meddelande att visa när repots paketlista inte stämmer med kopian.
 */
export async function ensureModules(onLine = () => {}) {
  const target = path.join(presenterDir, "node_modules");
  const hasNext = fs.existsSync(path.join(target, "next", "dist", "bin", "next"));
  const bundled = bundledModulesDir();
  const bundledLock = bundled ? lockHash(path.join(path.dirname(bundled), "package-lock.json")) : null;
  const repoLock = lockHash(path.join(presenterDir, "package-lock.json"));
  const marker = hasNext ? readMarker(target) : null;

  if (hasNext && !marker) return { source: "npm", copied: false, notice: null };
  if (hasNext && marker && (!bundledLock || marker.lockHash === bundledLock)) {
    return { source: "app", copied: false, notice: repoLock && marker.lockHash !== repoLock ? LOCK_NOTICE : null };
  }
  if (!bundled) {
    throw new Error(`Paketen saknas i ${presenterDir}. Kör \`npm install\` där — eller använd den installerade appen, som har paketen inbyggda.`);
  }

  if (hasNext) {
    onLine("Appen har andra paket än de som ligger i föreläsningsmappen — byter ut dem …");
    await fs.promises.rm(target, { recursive: true, force: true });
  } else {
    onLine("Lägger in appens paket i föreläsningsmappen (första gången — det tar en stund) …");
  }
  await fs.promises.cp(bundled, target, { recursive: true, force: true });
  fs.writeFileSync(path.join(target, MARKER), JSON.stringify({ lockHash: bundledLock, copiedAt: new Date().toISOString() }, null, 2));
  onLine("Paketen är på plats.");
  return { source: "app", copied: true, notice: repoLock && bundledLock !== repoLock ? LOCK_NOTICE : null };
}

/* ── Snabbt läge: bygget ─────────────────────────────────────────────────── */

/** Byggmappen för snabbt läge. Ignorerad i git (presenter/.next-*). */
export const FAST_DIST = ".next-app";
const FAST_STAMP = "presenter-app-bygge.json";

/** Mappar och filer vars ändring kräver ett nytt bygge. Decken (content/) gör det inte. */
const CODE_FILES = ["package-lock.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json"];

/**
 * Ett fingeravtryck av koden: storlek och ändringstid för varje fil under
 * src/, och innehållet i konfigurationen. Ändras det sedan förra bygget byggs
 * appen om. (tsconfig.json läses utan de rader Next själv lägger till vid bygget.)
 */
export function codeFingerprint() {
  const hash = crypto.createHash("sha1");
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const stat = fs.statSync(full);
        hash.update(`${path.relative(presenterDir, full)}\0${stat.size}\0${Math.round(stat.mtimeMs)}\n`);
      }
    }
  };
  walk(path.join(presenterDir, "src"));
  for (const name of CODE_FILES) {
    try {
      let text = fs.readFileSync(path.join(presenterDir, name), "utf8");
      if (name === "tsconfig.json") text = text.replace(/^\s*"\.next-[^"]*",?\s*$/gm, "");
      hash.update(`${name}\0${text}\n`);
    } catch {
      hash.update(`${name}\0-\n`);
    }
  }
  return hash.digest("hex").slice(0, 20);
}

function readStamp() {
  try {
    return JSON.parse(fs.readFileSync(path.join(presenterDir, FAST_DIST, FAST_STAMP), "utf8"));
  } catch {
    return null;
  }
}

/** Behöver snabbt läge ett nytt bygge? */
export function fastBuildIsCurrent() {
  if (!fs.existsSync(path.join(presenterDir, FAST_DIST, "BUILD_ID"))) return false;
  return readStamp()?.fingerprint === codeFingerprint();
}

function nextEnv(extra = {}) {
  const env = {
    ...process.env,
    PRESENTER_APP: "1",
    BROWSER: "none",
    FORCE_COLOR: "0",
    NEXT_TELEMETRY_DISABLED: "1",
    // Next körs med Electrons inbyggda Node — ingen Node behövs på datorn.
    ELECTRON_RUN_AS_NODE: "1",
    ELECTRON_NO_ATTACH_CONSOLE: "1",
    // Verktygen som följer med appen (ffmpeg och Avskrifts verktyg, scripts/hamta-verktyg.mjs), så att
    // export och avskrift fungerar utan att något är installerat på datorn.
    ...(bundledToolsDir() ? { PRESENTER_VERKTYG: bundledToolsDir() } : {}),
    ...extra,
  };
  // Samma sak som scripts/dev-worktree.mjs: i en worktree är node_modules en länk
  // till huvudmappens, och Turbopack måste då få en rot som rymmer båda.
  const realModules = fs.realpathSync(path.join(presenterDir, "node_modules"));
  if (!realModules.startsWith(presenterDir + path.sep)) {
    const a = presenterDir.split(path.sep);
    const b = realModules.split(path.sep);
    let i = 0;
    while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
    env.PRESENTER_TURBOPACK_ROOT = a.slice(0, i).join(path.sep);
  }
  return env;
}

const nextBinPath = () => path.join(presenterDir, "node_modules", "next", "dist", "bin", "next");

/**
 * Bygg för snabbt läge om koden ändrats sedan förra bygget. Byggcachen
 * (PRESENTER_APP_BUILD i next.config.ts) gör ett ombygge på några sekunder.
 * tsconfig.json återställs byte för byte efteråt — Next skriver in byggmappen
 * där, och en spårad fil som ändrats stoppar "Hämta senaste".
 * Returnerar { built, seconds }. Kastar vid byggfel, med slutet av loggen.
 */
export async function ensureFastBuild(onLine = () => {}, { force = false } = {}) {
  if (!force && fastBuildIsCurrent()) return { built: false, seconds: 0 };
  const fingerprint = codeFingerprint();
  const first = !fs.existsSync(path.join(presenterDir, FAST_DIST, "BUILD_ID"));
  onLine(first ? "Bygger Presenter för snabbt läge (första gången en halv minut) …" : "Koden har ändrats — bygger om (några sekunder) …");
  const tsconfigPath = path.join(presenterDir, "tsconfig.json");
  let tsconfig = null;
  try {
    tsconfig = fs.readFileSync(tsconfigPath);
  } catch {
    tsconfig = null;
  }
  fs.appendFileSync(logFile(), `${new Date().toISOString()} next build → ${FAST_DIST}\n`);
  const started = Date.now();
  const child = spawn(process.execPath, [nextBinPath(), "build"], {
    cwd: presenterDir,
    env: nextEnv({ PRESENTER_DIST_DIR: FAST_DIST, PRESENTER_APP_BUILD: "1" }),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let tail = "";
  const log = fs.createWriteStream(logFile(), { flags: "a" });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      log.write(chunk);
      tail = (tail + String(chunk)).slice(-4000);
      for (const line of String(chunk).split(/\r?\n/)) {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, "").trim();
        if (/Compiled|Generating static|Collecting|Finalizing|Creating an optimized/.test(clean)) onLine(`Bygger … ${clean}`);
      }
    });
  }
  const code = await new Promise((resolve) => child.once("exit", (exitCode) => resolve(exitCode ?? 1)));
  log.end();
  if (tsconfig) fs.writeFileSync(tsconfigPath, tsconfig);
  if (code !== 0) {
    throw new Error(`Bygget för snabbt läge misslyckades (kod ${code}).\n\n${tail.replace(/\x1b\[[0-9;]*m/g, "").slice(-1500)}`);
  }
  fs.writeFileSync(path.join(presenterDir, FAST_DIST, FAST_STAMP), JSON.stringify({ fingerprint, builtAt: new Date().toISOString() }, null, 2));
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  onLine(`Bygget klart på ${seconds} s.`);
  return { built: true, seconds };
}

/* ── Servern ─────────────────────────────────────────────────────────────── */

/**
 * Hitta eller starta servern. Returnerar { url, spawned, child, stop() }.
 * `onLine` får varje rad från serverns utskrift (för statusraden i splashen).
 */
export async function startServer({ preferredPort = 3000, fast = false, onLine = () => {} } = {}) {
  // Utvecklingsservern kompilerar startsidan vid första anropet: ge den tid.
  // I snabbt läge används inte en dev-server som redan kör — den är långsam.
  const existing = `http://localhost:${preferredPort}`;
  if (!fast && (await isPresenter(existing, 25_000))) {
    onLine(`Använder servern som redan kör på port ${preferredPort}.`);
    return { url: existing, spawned: false, fast: false, child: null, port: preferredPort, stop: async () => {} };
  }

  fs.writeFileSync(logFile(), "");
  if (fast) await ensureFastBuild(onLine);
  const port = await firstFreePort(preferredPort);
  // Servern lyssnar bara på den här datorn (3 oktober 2026). Rutterna som sparar
  // deck, kunskapsbanken och inspelningar har ingen inloggning, så de ska inte nås
  // från skolans nätverk. PRESENTER_HOST=0.0.0.0 öppnar mot nätverket med avsikt.
  const host = process.env.PRESENTER_HOST || "127.0.0.1";
  const args = [fast ? "start" : "dev", "-p", String(port), "-H", host];
  fs.appendFileSync(logFile(), `${new Date().toISOString()} next ${args.join(" ")}\n`);
  onLine(`Startar ${fast ? "snabbt läge" : "utvecklingsservern"} på port ${port} …`);

  const child = spawn(process.execPath, [nextBinPath(), ...args], {
    cwd: presenterDir,
    env: nextEnv(fast ? { PRESENTER_DIST_DIR: FAST_DIST } : {}),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const log = fs.createWriteStream(logFile(), { flags: "a" });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      log.write(chunk);
      output = (output + String(chunk)).slice(-6000);
      for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) onLine(line.trim());
    });
  }

  const url = `http://localhost:${port}`;
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    if (child.exitCode !== null) {
      // Next vägrar starta en andra dev-server i samma mapp och säger var den
      // första kör — till exempel en som blev kvar när appen avslutades onormalt.
      // Använd den i stället för att ge upp.
      const other = /another next dev server is already running[\s\S]*?Local:\s*(http:\/\/(?:localhost|127\.0\.0\.1):(\d+))/i.exec(output.replace(/\x1b\[[0-9;]*m/g, ""));
      if (!fast && other && (await isPresenter(other[1], 25_000))) {
        onLine(`Använder dev-servern som redan kör på port ${other[2]}.`);
        return { url: other[1], spawned: false, fast: false, child: null, port: Number(other[2]), stop: async () => {} };
      }
      throw new Error(`Servern avslutades med kod ${child.exitCode}. Se ${logFile()}.`);
    }
    if (await isPresenter(url)) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  if (!(await isPresenter(url))) throw new Error(`Servern svarade inte inom tre minuter. Se ${logFile()}.`);

  const stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", () => resolve());
      if (process.platform === "win32") {
        // Next startar egna barnprocesser; taskkill tar hela trädet.
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }).once("exit", () => resolve());
      } else child.kill("SIGTERM");
      setTimeout(resolve, 5000);
    });

  return { url, spawned: true, fast, child, port, stop };
}
