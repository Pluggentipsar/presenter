/**
 * Presenter som app — ett tunt Electron-skal runt Next-appen.
 *
 * Joel (21 september 2026): öppna appen, hitta föreläsningen, presentera
 * därifrån. Skalet gör bara det webbläsaren inte kan: startar servern, är ett
 * eget fönster med ikon, hämtar senaste från GitHub, öppnar mappar i
 * Utforskaren. Allt annat är samma app som på localhost:3000.
 *
 *   npm run app             utvecklingsservern (standard), eller den som redan kör
 *   npm run app -- --snabb  snabbt läge: appen bygger själv och kör next start
 *                           (också menyvalet Presenter → Snabbt läge, som sparas)
 *   npm run app -- --port 3020
 *   npm run app -- --repo C:\annan\presenter   (annars: repot skalet ligger i)
 *   npm run app -- --smoke [--smoke-deck <slug>]   startar, väntar in sidan, skriver titeln, avslutar
 *
 * Installerad (scripts/bygg-app.mjs → Presenter-Setup-*.exe) arbetar appen i
 * en föreläsningsmapp som väljs första gången (eller hämtas från GitHub) och
 * minns i config.json under appens datamapp. Paketen som Next behöver ligger
 * inbyggda i appen och läggs in i mappen vid första start — ingen Node
 * behövs på datorn.
 */

import { app, BrowserWindow, Menu, dialog, session, shell } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  startServer,
  readLog,
  presenterDir,
  repoDir,
  checkoutRepoDir,
  setRepoDir,
  isRepoDir,
  ensureModules,
  fastBuildIsCurrent,
} from "./server.mjs";
import { currentCommit, hasGit, installPackages, pullLatest } from "./update.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// Appens identitet: namn, id, föreläsningsmappen som Hämta från GitHub klonar och mappens namn.
const identitet = JSON.parse(fs.readFileSync(path.join(here, "identitet.json"), "utf8"));
const REPO_URL = identitet.repo;
const MAPP = identitet.mapp;
const argv = process.argv.slice(1);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const smoke = flag("smoke");
const preferredPort = Number(option("port", process.env.PRESENTER_APP_PORT ?? "3000"));

let server = null;
let mainWindow = null;
let statusLine = "Startar …";
let modules = null;
// Snabbt läge: appen bygger Presenter färdigt och kör next start (se server.mjs).
// Flaggan gäller en start; menyvalet sparas i config.json.
let fastMode = flag("snabb") || flag("prod");

// En instans åt gången — utom i --smoke, som ska kunna köras medan appen är igång.
if (!smoke && !app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

const windowOptions = () => ({
  width: 1440,
  height: 920,
  minWidth: 900,
  minHeight: 600,
  backgroundColor: "#f4f2ec",
  title: "Presenter",
  icon: iconPath(),
  autoHideMenuBar: false,
  webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
});

function iconPath() {
  const icon = path.join(here, "icon.png");
  return fs.existsSync(icon) ? icon : undefined;
}

/** Sidan som visas medan servern startar. */
function splashUrl(message) {
  const html = `<!doctype html><html lang="sv"><meta charset="utf-8"><title>Presenter</title>
<style>html,body{margin:0;height:100%;background:#f4f2ec;color:#16150f;font:16px/1.5 "Segoe UI",system-ui,sans-serif}
main{display:grid;place-items:center;height:100%;text-align:center}h1{font-size:2.6rem;letter-spacing:-.03em;margin:0 0 .3rem}
p{color:#6d695e;margin:0;max-width:34rem;white-space:pre-line}i{display:block;width:2.6rem;height:.35rem;background:#243cff;margin:1.4rem auto 0;border-radius:.2rem;animation:p 1.1s ease-in-out infinite alternate}
@keyframes p{to{width:8rem}}</style><main><div><h1>Presenter</h1><p>${message.replace(/</g, "&lt;")}</p><i></i></div></main></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/* ── Föreläsningsmappen ──────────────────────────────────────────────────── */

const configFile = () => path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(next, null, 2));
}

/** Klona repot till target och visa gits framsteg i splashen. */
function cloneRepo(target) {
  return new Promise((resolve) => {
    const child = spawn("git", ["clone", "--progress", REPO_URL, target], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => {
        for (const line of String(chunk).split(/\r|\n/)) {
          if (!line.trim()) continue;
          statusLine = `Hämtar föreläsningarna från GitHub …\n${line.trim()}`;
          tail = `${tail}\n${line.trim()}`.slice(-1500);
        }
      });
    }
    child.on("error", (error) => resolve({ ok: false, out: String(error.message) }));
    child.on("exit", (code) => resolve({ ok: code === 0, out: tail.trim() }));
  });
}

/**
 * Var finns föreläsningarna? I ordning: --repo, repot skalet ligger i (när
 * appen körs med npm run app), sparat val, annars frågar vi — och kan hämta
 * repot från GitHub. null = användaren avbröt.
 */
async function resolveRepoDir() {
  const fromFlag = option("repo");
  if (fromFlag) {
    const dir = path.resolve(fromFlag);
    if (isRepoDir(dir)) return dir;
    throw new Error(`${dir} ser inte ut som föreläsningsmappen (saknar presenter/package.json eller presenter/content).`);
  }
  if (!app.isPackaged && isRepoDir(checkoutRepoDir)) return checkoutRepoDir;
  const saved = readConfig().repoDir;
  if (isRepoDir(saved)) return saved;

  for (;;) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Var finns föreläsningarna?",
      message: "Välj föreläsningsmappen",
      detail:
        `Presenter arbetar i föreläsningsmappen (${MAPP}, med presenter/content). ` +
        `Finns den på den här datorn: välj den. Annars kan appen hämta den från GitHub — det kräver Git for Windows.` +
        (saved ? `\n\nSenast: ${saved} (hittas inte längre)` : ""),
      buttons: ["Välj mapp …", "Hämta från GitHub …", "Avsluta"],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (response === 2) return null;

    if (response === 0) {
      const picked = await dialog.showOpenDialog(mainWindow, { title: `Föreläsningsmappen (${MAPP})`, properties: ["openDirectory"] });
      const dir = picked.filePaths[0];
      if (!dir) continue;
      const candidate = isRepoDir(dir) ? dir : isRepoDir(path.join(dir, MAPP)) ? path.join(dir, MAPP) : null;
      if (!candidate) {
        await dialog.showMessageBox(mainWindow, { type: "warning", title: "Inte föreläsningsmappen", message: `${dir} saknar presenter/content.`, detail: `Välj mappen ${MAPP} — den som har presenter/ i sig.`, buttons: ["Stäng"] });
        continue;
      }
      writeConfig({ repoDir: candidate });
      return candidate;
    }

    if (!(await hasGit())) {
      await dialog.showMessageBox(mainWindow, { type: "warning", title: "Git saknas", message: "Git finns inte på den här datorn.", detail: "Installera Git for Windows (git-scm.com) och försök igen, eller välj en mapp där repot redan finns.", buttons: ["Stäng"] });
      continue;
    }
    const picked = await dialog.showOpenDialog(mainWindow, { title: `Var ska mappen ${MAPP} läggas?`, properties: ["openDirectory", "createDirectory"] });
    const parent = picked.filePaths[0];
    if (!parent) continue;
    const target = path.join(parent, MAPP);
    if (fs.existsSync(target)) {
      await dialog.showMessageBox(mainWindow, { type: "warning", title: "Mappen finns redan", message: `${target} finns redan.`, detail: "Välj den i stället, eller en annan plats.", buttons: ["Stäng"] });
      continue;
    }
    statusLine = "Hämtar föreläsningarna från GitHub …";
    const result = await cloneRepo(target);
    if (!result.ok || !isRepoDir(target)) {
      await dialog.showMessageBox(mainWindow, { type: "error", title: "Hämtningen misslyckades", message: "Kunde inte hämta repot.", detail: result.out.slice(-1500) || "git clone gav inget svar.", buttons: ["Stäng"] });
      continue;
    }
    writeConfig({ repoDir: target });
    return target;
  }
}

async function changeRepoDir() {
  const picked = await dialog.showOpenDialog(mainWindow, { title: `Föreläsningsmappen (${MAPP})`, properties: ["openDirectory"] });
  const dir = picked.filePaths[0];
  if (!dir) return;
  if (!isRepoDir(dir)) {
    await dialog.showMessageBox(mainWindow, { type: "warning", title: "Inte föreläsningsmappen", message: `${dir} saknar presenter/content.`, buttons: ["Stäng"] });
    return;
  }
  writeConfig({ repoDir: dir });
  app.relaunch();
  app.quit();
}

/* ── Fönster och meny ────────────────────────────────────────────────────── */

/** Nya fönster (presentatörsvyn, "öppna i nytt fönster") stannar i appen; externa länkar går till webbläsaren. */
function attachNavigation(win, origin) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) {
      return { action: "allow", overrideBrowserWindowOptions: { ...windowOptions(), width: 1280, height: 800 } };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(origin) || url.startsWith("data:")) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
  win.webContents.on("did-create-window", (child) => attachNavigation(child, origin));
}

function buildMenu(origin) {
  const go = (route) => () => mainWindow?.loadURL(`${origin}${route}`);
  const template = [
    {
      label: "Presenter",
      submenu: [
        { label: "Biblioteket", accelerator: "CmdOrCtrl+B", click: go("/") },
        { type: "separator" },
        { label: "Hämta senaste från GitHub", accelerator: "CmdOrCtrl+Shift+U", click: () => void update() },
        { label: "Starta om servern", enabled: Boolean(server?.spawned), click: () => void restartServer() },
        {
          label: "Snabbt läge (färdigbyggt)",
          type: "checkbox",
          checked: fastMode,
          click: (item) => void setFastMode(item.checked),
        },
        { label: "Bygg om nu", accelerator: "CmdOrCtrl+Shift+B", enabled: fastMode && Boolean(server?.spawned), click: () => void rebuildNow() },
        { type: "separator" },
        { label: "Öppna föreläsningarnas mapp (content)", click: () => void shell.openPath(path.join(presenterDir, "content")) },
        { label: "Öppna bildmappen (public/bilder)", click: () => void shell.openPath(path.join(presenterDir, "public", "bilder")) },
        { label: "Öppna repot", click: () => void shell.openPath(repoDir) },
        ...(app.isPackaged ? [{ label: "Byt föreläsningsmapp …", click: () => void changeRepoDir() }] : []),
        { type: "separator" },
        { label: "Serverns logg", click: () => void showLog() },
        { label: "Om Presenter", click: () => void about(origin) },
        { type: "separator" },
        { role: "quit", label: "Avsluta" },
      ],
    },
    {
      label: "Visa",
      submenu: [
        { label: "Bakåt", accelerator: "Alt+Left", click: () => mainWindow?.webContents.navigationHistory.goBack() },
        { label: "Framåt", accelerator: "Alt+Right", click: () => mainWindow?.webContents.navigationHistory.goForward() },
        { role: "reload", label: "Ladda om" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Fullskärm" },
        { role: "zoomIn", label: "Zooma in" },
        { role: "zoomOut", label: "Zooma ut" },
        { role: "resetZoom", label: "Normal storlek" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Utvecklarverktyg" },
      ],
    },
    { label: "Fönster", submenu: [{ role: "minimize", label: "Minimera" }, { role: "close", label: "Stäng fönstret" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function showLog() {
  const text = readLog(60) || "Servern startades inte av appen — loggen finns i terminalen där den kör.";
  await dialog.showMessageBox(mainWindow, { type: "info", title: "Serverns logg", message: server?.url ?? "Presenter", detail: text.slice(-3000), buttons: ["Stäng"] });
}

async function about(origin) {
  const commit = await currentCommit();
  const packages = modules?.source === "app" ? "appens inbyggda (kopierade till presenter/node_modules)" : "npm install i presenter/";
  await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Om Presenter",
    message: "Presenter",
    detail:
      `Server: ${origin}${server?.spawned ? " (startad av appen)" : " (kör sedan tidigare)"}\n` +
      `Läge: ${server?.fast ? "snabbt (färdigbyggt — koden gäller från senaste bygget)" : "utveckling (koden kompileras när den behövs)"}\n` +
      `Föreläsningarna: ${commit}\nMapp: ${repoDir}\nPaket: ${packages}\n` +
      `${app.isPackaged ? `Appen: ${app.getVersion()} · ` : ""}Electron ${process.versions.electron} · Node ${process.versions.node}`,
    buttons: ["Stäng"],
  });
}

/**
 * Starta om servern — i det läge som gäller nu. Samma port om det går, så att
 * webbläsarens inställningar och miniatyrer (som hör till adressen) finns kvar.
 * Går snabbt läge inte att bygga fortsätter appen i utvecklingsläge och säger varför.
 */
async function restartServer({ force = false } = {}) {
  if (!force && !server?.spawned) return;
  const win = mainWindow;
  const back = win && !win.isDestroyed() ? win.webContents.getURL() : "";
  const port = server?.spawned ? server.port : preferredPort;
  statusLine = fastMode ? "Startar snabbt läge …" : "Startar om servern …";
  win?.loadURL(splashUrl(statusLine));
  const ticker = setInterval(() => {
    if (win && !win.isDestroyed() && win.webContents.getURL().startsWith("data:")) win.loadURL(splashUrl(statusLine));
  }, 1200);
  try {
    if (server?.spawned) await server.stop();
    try {
      server = await startServer({ preferredPort: port, fast: fastMode, onLine: (line) => (statusLine = line) });
    } catch (error) {
      if (!fastMode) throw error;
      fastMode = false;
      await dialog.showMessageBox(win, {
        type: "warning",
        title: "Snabbt läge",
        message: "Bygget gick inte igenom — appen fortsätter i utvecklingsläge.",
        detail: String(error?.message ?? error).slice(-2500),
        buttons: ["Stäng"],
      });
      server = await startServer({ preferredPort: port, fast: false, onLine: (line) => (statusLine = line) });
    }
  } finally {
    clearInterval(ticker);
  }
  buildMenu(server.url);
  // Tillbaka till samma sida, på den nya serverns adress.
  let target = `${server.url}/`;
  try {
    if (back && !back.startsWith("data:")) {
      const was = new URL(back);
      target = `${server.url}${was.pathname}${was.search}`;
    }
  } catch {
    /* startsidan duger */
  }
  win?.loadURL(target);
}

async function setFastMode(on) {
  fastMode = on;
  writeConfig({ fast: on });
  await restartServer({ force: true });
}

async function rebuildNow() {
  if (fastBuildIsCurrent()) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Bygg om",
      message: "Koden är oförändrad sedan förra bygget.",
      detail: "Decken läses från disk vid varje sidvisning, så ändringar i dem syns utan nytt bygge. Bygg om när mallar eller verkstadens kod har ändrats.",
      buttons: ["Stäng"],
    });
    return;
  }
  await restartServer();
}

/** Hämta senaste: git pull --ff-only, npm install vid behov, omstart vid behov, sedan omladdning. */
async function update() {
  const win = mainWindow;
  const result = await pullLatest();
  if (!result.changed) {
    await dialog.showMessageBox(win, { type: "info", title: "Hämta senaste", message: result.message, buttons: ["Stäng"] });
    return;
  }
  let detail = result.message;
  if (result.needsInstall) {
    win?.loadURL(splashUrl("Paketlistan ändrades — kör npm install …"));
    detail += `\n\n${await installPackages()}`;
  }
  // I snabbt läge är koden byggd: ändrad kod i hämtningen kräver ett nytt bygge.
  const codeChanged = (result.files ?? []).some((file) => /^presenter\/(src\/|next\.config|postcss|tsconfig|package)/.test(file));
  if ((result.needsRestart || (fastMode && codeChanged)) && server?.spawned) {
    await restartServer();
  } else {
    win?.webContents.reload();
  }
  await dialog.showMessageBox(win, { type: "info", title: "Hämta senaste", message: "Klart.", detail, buttons: ["Stäng"] });
}

/* ── Inspelningen ────────────────────────────────────────────────────────── */

/**
 * Inspelningen (tangenten I, 2 oktober 2026) spelar in slidesen ur spelarens egen
 * flik med getDisplayMedia. Electron har ingen egen väljare, så skalet svarar:
 * sidan får spela in sin egen ram, och bara när sidan kommer från appens server.
 * Spelaren begränsar sedan bilden till slidescenen (Element Capture).
 */
function allowSlideCapture(serverUrl) {
  const origin = new URL(serverUrl).origin;
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    const frame = request.frame;
    // Bara sidans huvudram: en inbäddad ram skulle annars få spela in sidan runt sig.
    const allowed = frame && !frame.parent && request.videoRequested && new URL(request.securityOrigin || "about:blank").origin === origin;
    try {
      callback(allowed ? { video: frame } : {});
    } catch {
      // Ramen hann försvinna (sidan laddades om): ingen inspelning den här gången.
    }
  });
}

/* ── Start ───────────────────────────────────────────────────────────────── */

function smokeWrite(line) {
  process.stdout.write(`${line}\n`);
  try {
    fs.appendFileSync(path.join(presenterDir, ".presenter-app.log"), `${line}\n`);
  } catch {
    /* loggen är bara en bonus */
  }
}

async function fail(message) {
  if (smoke) {
    process.stderr.write(`smoke: fel: ${message}\n${readLog(20)}\n`);
    app.exit(1);
    return;
  }
  await dialog.showMessageBox(mainWindow, { type: "error", title: "Presenter kunde inte starta", message, detail: readLog(20), buttons: ["Avsluta"] });
  app.quit();
}

async function main() {
  await app.whenReady();
  app.setAppUserModelId(identitet.id);
  mainWindow = new BrowserWindow(windowOptions());
  mainWindow.on("closed", () => (mainWindow = null));
  mainWindow.loadURL(splashUrl(statusLine));
  const ticker = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.getURL().startsWith("data:")) mainWindow.loadURL(splashUrl(statusLine));
  }, 1500);

  try {
    const dir = await resolveRepoDir();
    if (!dir) {
      clearInterval(ticker);
      app.quit();
      return;
    }
    setRepoDir(dir);
    if (!flag("snabb") && !flag("prod") && !flag("dev")) {
      // Den installerade appen är till för att använda och presentera: snabbt
      // läge tills man själv väljer annat i menyn. Ur repot (npm run app), där
      // agenter ändrar koden medan man tittar, är utvecklingsläget standard.
      const saved = readConfig().fast;
      fastMode = typeof saved === "boolean" ? saved : app.isPackaged;
    }
    modules = await ensureModules((line) => (statusLine = line));
    try {
      server = await startServer({ preferredPort, fast: fastMode, onLine: (line) => (statusLine = line) });
    } catch (error) {
      if (!fastMode || smoke) throw error;
      // Går bygget inte igenom (en agent kan ha lämnat trasig kod) startar
      // appen ändå — i utvecklingsläge — och säger varför.
      fastMode = false;
      await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Snabbt läge",
        message: "Bygget gick inte igenom — appen startar i utvecklingsläge.",
        detail: String(error?.message ?? error).slice(-2500),
        buttons: ["Stäng"],
      });
      server = await startServer({ preferredPort, fast: false, onLine: (line) => (statusLine = line) });
    }
  } catch (error) {
    clearInterval(ticker);
    await fail(String(error?.message ?? error));
    return;
  }
  clearInterval(ticker);
  buildMenu(server.url);
  attachNavigation(mainWindow, server.url);
  allowSlideCapture(server.url);
  await mainWindow.loadURL(`${server.url}/`);

  if (smoke) {
    const packages = modules.source === "app" ? (modules.copied ? "paket kopierade från appen" : "appens paket fanns redan") : "paket från npm install";
    smokeWrite(`smoke: ${server.url} · ${server.spawned ? "startad av appen" : "befintlig server"} · ${server.fast ? "snabbt läge" : "utvecklingsläge"} · ${packages} · mapp ${repoDir} · titel "${mainWindow.getTitle()}"`);
    const deck = option("smoke-deck");
    if (deck) {
      await mainWindow.loadURL(`${server.url}/${deck}`);
      const response = await fetch(`${server.url}/${deck}`);
      smokeWrite(`smoke: /${deck} · ${response.status} · titel "${mainWindow.getTitle()}"`);
    }
    app.quit();
    return;
  }
  if (modules?.notice) {
    await dialog.showMessageBox(mainWindow, { type: "warning", title: "Paketen", message: modules.notice, buttons: ["Stäng"] });
  }
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (!server?.spawned || server.stopped) return;
  event.preventDefault();
  server.stopped = true;
  void server.stop().then(() => app.quit());
});

void main();
