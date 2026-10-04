#!/usr/bin/env node
/**
 * Kör granskningsvyn (/<slug>/granska) i en headless Edge eller Chrome och väntar tills rapporten är
 * skriven. Den inbyggda webbläsarpanelen stryper tidtagare när den är dold, så en hel granskning kan ta
 * en evighet där; headless är sidan aldrig dold och samma körning tar ungefär en och en halv minut.
 *
 * Användning (dev-servern måste vara igång):
 *   node scripts/granska-edge.mjs <slug> [--base http://127.0.0.1:3000] [--fran 4 --till 24] [--alla] [--tema <tema>]
 *
 * --tema granskar decket i ett annat tema än frontmatterns, som när T byter tema i spelaren. Rapporten
 * och bilderna hamnar då i presenter/.granska/<slug>--<tema>/, så att deckets egen granskning står kvar.
 *
 * Skriptet frågar först granskningens API om decket, slugen och temat. Svarar servern inte, eller med
 * ett fel, stannar skriptet direkt med skälet i stället för att vänta på en rapport som aldrig kommer.
 *
 * Webbläsaren får en egen tillfällig profil och stängs efteråt (bara den, inte användarens egen
 * webbläsare). Rapporten och bilderna hamnar i presenter/.granska/<slug>/. Se docs/GRANSKA.md.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
// Slugen är det första argumentet som varken är en flagga eller en flaggas värde.
const slug = args.find((arg, i) => !arg.startsWith("--") && !(args[i - 1]?.startsWith("--") && args[i - 1] !== "--alla"));
const usage = "Användning: node scripts/granska-edge.mjs <slug> [--base http://127.0.0.1:3000] [--fran N --till M] [--alla] [--tema <tema>]";
if (!slug) {
  console.error(usage);
  process.exit(1);
}

const base = (option("base") || process.env.GRANSKA_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const tema = option("tema");
const query = new URLSearchParams({ start: "1", full: "1" });
if (option("fran")) query.set("fran", option("fran"));
if (option("till")) query.set("till", option("till"));
if (args.includes("--alla")) query.set("alla", "1");
if (tema) query.set("tema", tema);
const url = `${base}/${slug}/granska?${query}`;

// Först en fråga till granskningens API: finns servern, decket, slugen och temat?
const check = new URLSearchParams({ slug });
if (tema) check.set("tema", tema);
let answer;
try {
  answer = await fetch(`${base}/api/granska?${check}`, { signal: AbortSignal.timeout(120_000) });
} catch (error) {
  console.error(`Ingen server svarar på ${base} (${error.cause?.code ?? error.message}). Starta dev-servern med npm run dev i presenter/, eller ange rätt adress med --base.`);
  process.exit(1);
}
// 405: en äldre server utan frågan. Då får granskningen försöka ändå.
if (answer.status >= 400 && answer.status !== 405) {
  const reason = answer.status < 500 ? (await answer.text()).trim() : "";
  if (reason) console.error(`Granskningen kan inte börja: ${reason}`);
  else if (answer.status === 404) console.error(`Granskningen finns inte på ${base}: servern körs i publikt eller skrivskyddat läge (PRESENTER_PUBLIC eller PRESENTER_READONLY), eller så är det en annan app.`);
  else console.error(`Granskningen kan inte börja: servern svarade ${answer.status}. Se dev-serverns logg.`);
  process.exit(1);
}

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
const folder = join(root, ".granska", tema ? `${slug}--${tema}` : slug);
const report = join(folder, "rapport.json");
const before = existsSync(report) ? statSync(report).mtimeMs : 0;
const profile = mkdtempSync(join(tmpdir(), "granska-edge-"));

console.log(`Granskar ${url}\nmed ${browser}`);
const child = spawn(browser, [
  "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run", "--no-default-browser-check",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
  `--user-data-dir=${profile}`, "--window-size=1700,1000", url,
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

const started = Date.now();
const limit = 15 * 60 * 1000;
const timer = setInterval(() => {
  const done = existsSync(report) && statSync(report).mtimeMs > before;
  if (!done && Date.now() - started < limit) return;
  clearInterval(timer);
  stop();
  if (!done) { console.error(`Ingen ny rapport efter 15 minuter. Öppna ${url.replace("start=1&", "")} i en webbläsare och se var granskningen stannar.`); process.exit(1); }
  const markdown = join(folder, "rapport.md");
  const summary = existsSync(markdown) ? readFileSync(markdown, "utf8").split("\n").slice(0, 20).join("\n") : "";
  console.log(`Klar efter ${Math.round((Date.now() - started) / 1000)} s.\n\n${summary}`);
  process.exit(0);
}, 2000);
process.on("SIGINT", () => { stop(); process.exit(130); });
