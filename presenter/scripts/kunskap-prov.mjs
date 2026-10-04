#!/usr/bin/env node
// Prov av Kunskapsbanken (2 oktober 2026) i en huvudlös Edge: grafen och förklaringen, en
// begreppssida, en presentationssida med omslaget, sökningen, ett länkklick och bakåt, en ny sida,
// autosparningen och en konflikt mot en ändring på disken. Provsidan tas bort efteråt.
//
//   node scripts/kunskap-prov.mjs [--base http://127.0.0.1:3000] [--bilder <mapp>] [--valv <mapp>]
//
// --valv är mappen servern läser (standard: repot, som i appen; PRESENTER_VALV om den är satt).
// Se docs/KUNSKAPSBANKEN.md.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const base = (option("base") || process.env.GRANSKA_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const vault = option("valv") || process.env.PRESENTER_VALV || join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = option("bilder") || mkdtempSync(join(tmpdir(), "kunskap-bilder-"));

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

const profile = mkdtempSync(join(tmpdir(), "kunskap-prov-"));
const port = 9300 + Math.floor(Math.random() * 600);
const child = spawn(browser, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-background-timer-throttling", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1600,1000", "about:blank"], { stdio: "ignore", detached: process.platform !== "win32" });
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
const problems = [];
const failures = [];
const check = (ok, label) => { console.log(`${ok ? "ok  " : "FEL "} ${label}`); if (!ok) failures.push(label); };
const testRel = "wiki/begrepp/Provsida kunskapsbanken.md";
const testFile = join(vault, ...testRel.split("/"));
const api = path => fetch(`${base}/api/kunskap/sida?path=${encodeURIComponent(path)}`, { cache: "no-store" }).then(r => (r.ok ? r.json() : null));

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
  const shot = async name => { const res = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, name), Buffer.from(res.result.data, "base64")); };
  const waitFor = async (expression, label, limit = 60000) => {
    const until = Date.now() + limit;
    while (Date.now() < until) { if (await evaluate(expression)) return true; await sleep(250); }
    throw new Error(`Väntade förgäves på ${label}.`);
  };
  const click = async selector => {
    const box = await evaluate(`(() => { const e = ${selector}; if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    if (!box) throw new Error(`Hittar inte ${selector}.`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  };
  const setValue = (selector, value) => evaluate(`(() => { const i = ${selector}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  /** Andel ifyllda bildpunkter i grafens duk. */
  const inked = selector => evaluate(`(() => { const c = document.querySelector(${JSON.stringify(selector)}); if (!c || !c.width || !c.height) return 0; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return Math.round(1000 * n / (d.length / 16)) / 10; })()`);

  await send("Runtime.enable");
  await send("Page.enable");

  // 1. Grafen
  await send("Page.navigate", { url: `${base}/kunskap` });
  await waitFor(`!!document.querySelector("[class*=graphView] canvas")`, "grafen");
  await sleep(4000);
  const canvas = await evaluate(`(() => { const c = document.querySelector("[class*=graphView] canvas"); return { w: c.clientWidth, h: c.clientHeight }; })()`);
  check(canvas.w > 300 && canvas.h > 300, `grafens duk har en yta (${canvas.w} × ${canvas.h})`);
  check((await inked("[class*=graphView] canvas")) > 1, "grafen är ritad");
  console.log("     ", await evaluate(`document.querySelector("[class*=hint]")?.textContent`));
  await setValue(`document.querySelector("[class*=legendSearch]")`, "syko");
  await sleep(600);
  check(/träff/.test((await evaluate(`document.querySelector("[class*=legendHits]")?.textContent`)) ?? ""), "Lyft fram ger träffar");
  await shot("1-grafen.png");

  // 2. En begreppssida
  await send("Page.navigate", { url: `${base}/kunskap?sida=${encodeURIComponent("wiki/begrepp/agens.md")}` });
  await waitFor(`!!document.querySelector("[class*=article] [class*=md]")`, "sidan");
  await sleep(2500);
  const article = await evaluate(`(() => { const a = document.querySelector("[class*=article]"); return { h1: a.querySelector("h1")?.textContent ?? "", tables: a.querySelectorAll("table").length, links: a.querySelectorAll("a[class*=link]").length }; })()`);
  check(article.h1.length > 0 && article.tables > 0 && article.links > 0, `sidan har rubrik, tabell och länkar (${JSON.stringify(article)})`);
  check((await inked("[class*=localGraph] canvas")) > 1, "grannskapet är ritat");
  await shot("2-begrepp.png");

  // 3. En presentationssida med föreläsningen
  await send("Page.navigate", { url: `${base}/kunskap?sida=${encodeURIComponent("wiki/presentationer/presenter-valkommen.md")}` });
  await waitFor(`!!document.querySelector("[class*=article] [class*=md]")`, "presentationssidan");
  await sleep(1500);
  check(!!(await evaluate(`document.querySelector("[class*=deckTitle]")?.textContent`)), "presentationssidan visar sin föreläsning");
  await shot("3-presentation.png");

  // 4. Sökning
  await click(`document.querySelector("[class*=search] input")`);
  await send("Input.insertText", { text: "sykofanti" });
  await waitFor(`document.querySelectorAll("[class*=results] li a").length > 0 && !!document.querySelector("[class*=resultSnippet]")`, "sökträffarna", 20000);
  check(true, `sökningen ger ${await evaluate(`document.querySelectorAll("[class*=results] li a").length`)} träffar med utdrag`);
  await shot("4-sok.png");

  // 5. Ett länkklick och bakåt
  await send("Page.navigate", { url: `${base}/kunskap?sida=${encodeURIComponent("wiki/begrepp/agens.md")}` });
  await waitFor(`!!document.querySelector("[class*=article] a[class*=link]")`, "en länk");
  const target = await evaluate(`document.querySelector("[class*=article] a[class*=link]").getAttribute("href")`);
  await click(`document.querySelector("[class*=article] a[class*=link]")`);
  await sleep(1500);
  check(decodeURIComponent(await evaluate("location.pathname + location.search")) === decodeURIComponent(target), "länken öppnar sidan i appen");
  await evaluate("history.back()");
  await sleep(1200);
  check(decodeURIComponent(await evaluate("location.search")).includes("agens.md"), "bakåt går tillbaka");

  // 6. Ny sida
  if (existsSync(testFile)) rmSync(testFile);
  await click(`[...document.querySelectorAll("[class*=sideNav] button")].find(b => b.textContent === "Ny sida")`);
  await waitFor(`!!document.querySelector("[class*=dialog] input")`, "dialogen");
  await setValue(`document.querySelector("[class*=dialog] input")`, "Provsida kunskapsbanken");
  await sleep(200);
  await click(`[...document.querySelectorAll("[class*=dialog] button")].find(b => b.textContent === "Skapa sidan")`);
  await waitFor(`!!document.querySelector("[class*=editor] textarea")`, "redigeringen");
  check((await api(testRel))?.text?.startsWith("# Provsida kunskapsbanken"), "sidan finns på disken");

  // 7. Autosparningen
  await evaluate(`(() => { const t = document.querySelector("[class*=editor] textarea"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); })()`);
  await send("Input.insertText", { text: "Ett prov med [[agens]] och [[finns inte än]].\n\n| Kolumn | Värde |\n|---|---|\n| å | ö |\n" });
  await sleep(2600);
  check((await api(testRel))?.text?.includes("| å | ö |"), "texten sparas av sig själv, med å och ö");
  await shot("5-redigera.png");

  // 8. Konflikt mot en ändring på disken (som om Obsidian sparade under tiden)
  const current = await api(testRel);
  await fetch(`${base}/api/kunskap/sida?path=${encodeURIComponent(testRel)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `${current.text}\nRad från Obsidian.\n`, hash: current.hash }) });
  await send("Input.insertText", { text: "\nMin rad.\n" });
  await waitFor(`!!document.querySelector("[class*=conflict]")`, "konflikten", 10000);
  const disk = (await api(testRel)).text;
  check(disk.includes("Rad från Obsidian.") && !disk.includes("Min rad."), "konflikten skriver ingenting");
  await shot("6-konflikt.png");
  await click(`[...document.querySelectorAll("[class*=conflict] button")].find(b => b.textContent.startsWith("Spara min text"))`);
  await sleep(1500);
  const after = (await api(testRel)).text;
  check(after.includes("Min rad.") && !after.includes("Rad från Obsidian."), "”Spara min text över den” sparar min text");
  await click(`[...document.querySelectorAll("[class*=noteActions] button")].find(b => b.textContent === "Klar")`);
  await waitFor(`!!document.querySelector("[class*=article]")`, "läsläget efter Klar", 8000).catch(() => {});
  await shot("7-klar.png");
  const reading = await evaluate(`(() => ({ article: !!document.querySelector("[class*=article]"), missing: document.querySelector("[class*=article] a[class*=missing]")?.textContent ?? null, status: document.querySelector("[class*=status]")?.textContent ?? null }))()`);
  check(reading.article && reading.missing === "finns inte än", `Klar går till läsläget, som visar den saknade länken (${JSON.stringify(reading)})`);
} catch (error) {
  problems.push(String(error?.stack || error));
} finally {
  stop();
  if (existsSync(testFile)) rmSync(testFile);
  console.log(`\nBilder: ${out}`);
  if (problems.length) console.log(`Problem:\n${problems.join("\n")}`);
  console.log(failures.length || problems.length ? `${failures.length} kontroller föll.` : "Alla kontroller gick igenom.");
  process.exit(failures.length || problems.length ? 1 : 0);
}
