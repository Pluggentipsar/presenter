#!/usr/bin/env node
// Kontrollerar en lästext (content/las/<slug>.md) mot sitt deck.
//
//   node scripts/las-check.mjs <slug>            statisk kontroll
//   node scripts/las-check.mjs <slug> --steps    + frågar den körande dev-servern
//                                                hur många klicksteg varje slide har
//
// Statisk kontroll: varje @slide-id finns i decket, steg är rimliga, kapitel och
// ordmängd. Deckets slideId som saknar lästext listas, med dolda slides markerade.
//
// --steps: antalet klicksteg registreras av mallarna först när de körs, så det går
// bara att få fram i en webbläsare. Skriptet startar en egen headless Chrome (CDP)
// mot http://127.0.0.1:3000 — appens inbyggda webbläsarpanel duger inte, den fryser
// requestAnimationFrame när den är dold. Kräver Node 22+ (inbyggd WebSocket) och
// Chrome/Edge; sätt CHROME_PATH om den inte hittas. Se docs/DELNINGSPAKET.md.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const wantSteps = args.includes("--steps");
const base = (args.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://127.0.0.1:3000").replace(/\/$/, "");

if (!slug) {
  console.error("Användning: node scripts/las-check.mjs <slug> [--steps] [--base=http://127.0.0.1:3000]");
  process.exit(2);
}

const deckPath = path.join(root, "content", `${slug}.mdx`);
const articlePath = path.join(root, "content", "las", `${slug}.md`);
for (const file of [deckPath, articlePath]) {
  if (!fs.existsSync(file)) {
    console.error(`Saknas: ${path.relative(root, file)}`);
    process.exit(2);
  }
}

// ── Deckets slidelista: samma regel som src/lib/share/article.ts ──────────────
const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText", "DriftingNotes",
]);
const stripFrontmatter = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
const deckRaw = fs.readFileSync(deckPath, "utf8");
// hiddenSlides står antingen som lista på egna rader eller på en rad: [50, 51].
const hidden = new Set(
  ((/^hiddenSlides:\s*\[([^\]]*)\]/m.exec(deckRaw) ??
    /^hiddenSlides:\s*\r?\n((?:\s+-\s*\d+\s*\r?\n)+)/m.exec(deckRaw))?.[1].match(/\d+/g) ?? []).map(Number),
);
const deckLines = stripFrontmatter(deckRaw).replace(/<Notes>[\s\S]*?<\/Notes>/g, "").split(/\r?\n/);
const starts = [];
deckLines.forEach((line, i) => {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(line);
  if (m) starts.push({ tag: m[1], line: i });
});
const slides = []; // { index, id, tag, hidden }
starts.forEach((start, k) => {
  if (OVERLAY_TAGS.has(start.tag) && slides.length > 0) return;
  const block = deckLines.slice(start.line, starts[k + 1]?.line ?? deckLines.length).join("\n");
  const index = slides.length;
  slides.push({ index, id: /\sslideId="([^"]+)"/.exec(block)?.[1] ?? null, tag: start.tag, hidden: hidden.has(index + 1) });
});
const byId = new Map(slides.filter((s) => s.id).map((s) => [s.id, s]));

// ── Lästexten ────────────────────────────────────────────────────────────────
const problems = [];
const notes = [];
const requested = new Map(); // slideIndex → högsta begärda steg (1-baserat)
let chapters = 0, anchors = 0, words = 0, textBeforeAnchor = false, sawAnchor = false;
// Läslägets block numreras b-1, b-2 … i den ordning ankare MED text kommer.
// Block som pekar på steg 2 eller senare används för följ-testet nedan: där
// måste bildtexten visa "klick N av M", och det gör den bara om scenrutan svarat.
const steppedBlocks = [];
let blockCount = 0, pendingAnchor = null, lastAnchor = null;

stripFrontmatter(fs.readFileSync(articlePath, "utf8")).split(/\r?\n/).forEach((raw, n) => {
  const line = raw.trim();
  const where = `rad ${n + 1}`;
  // Text efter en kapitelrubrik utan nytt ankare blir ett eget block på föregående slide.
  if (/^# /.test(line)) { chapters++; pendingAnchor = lastAnchor; return; }
  if (line.startsWith("@")) {
    const m = /^@slide\s+(\S+)(?:\s+steg=(\S+))?$/.exec(line);
    if (!m) { problems.push(`${where}: går inte att tolka: "${line}" (väntat: @slide <slideId> [steg=N|sist])`); return; }
    anchors++; sawAnchor = true;
    const slide = byId.get(m[1]);
    if (!slide) { problems.push(`${where}: okänt slideId "${m[1]}"`); return; }
    if (slide.hidden) notes.push(`${where}: ${m[1]} är en dold slide (hiddenSlides) — avsiktligt?`);
    let step = 1;
    if (m[2] && !/^(sist|last)$/i.test(m[2])) {
      step = Number(m[2]);
      if (!Number.isInteger(step) || step < 1) { problems.push(`${where}: steg="${m[2]}" — steg är 1-baserade heltal eller "sist"`); return; }
    }
    requested.set(slide.index, Math.max(requested.get(slide.index) ?? 1, step));
    pendingAnchor = lastAnchor = { step, slide: slide.index };
    return;
  }
  if (line) {
    if (!sawAnchor && !textBeforeAnchor) { textBeforeAnchor = true; problems.push(`${where}: text före första @slide visas aldrig`); }
    words += line.split(/\s+/).length;
    if (pendingAnchor) {
      blockCount++;
      if (pendingAnchor.step >= 2) steppedBlocks.push({ id: `b-${blockCount}`, slide: pendingAnchor.slide + 1 });
      pendingAnchor = null;
    }
  }
});

const uncovered = slides.filter((s) => !s.hidden && !requested.has(s.index));
console.log(`${slug}`);
console.log(`  deck: ${slides.length} slides (${hidden.size} dolda) · lästext: ${chapters} kapitel, ${anchors} ankare på ${requested.size} slides, ≈ ${words} ord (≈ ${Math.max(1, Math.round(words / 200))} min)`);
if (uncovered.length)
  console.log(`  utan lästext (${uncovered.length}): ${uncovered.map((s) => `${s.index + 1}:${s.id ?? s.tag}`).join(", ")}`);
notes.forEach((note) => console.log(`  obs — ${note}`));

// ── Klicksteg i en riktig webbläsare ─────────────────────────────────────────
if (wantSteps && problems.length === 0) {
  try {
    // Tre stickprov spridda över texten, alla på steg 2 eller senare.
    const samples = [0.25, 0.55, 0.85]
      .map((f) => steppedBlocks[Math.floor(steppedBlocks.length * f)])
      .filter((b, i, all) => b && all.indexOf(b) === i);
    const { totals, follow } = await readStepTotals([...requested.keys()], samples);
    for (const [index, step] of requested) {
      const total = totals[index];
      if (total == null) notes.push(`slide ${index + 1}: scenrutan rapporterade inget stegantal`);
      else if (step > Math.max(1, total))
        problems.push(`slide ${index + 1} (${slides[index].id}): lästexten begär steg ${step}, sliden har ${total}`);
    }
    console.log(`  klicksteg kontrollerade mot ${base} för ${Object.keys(totals).length} slides`);
    // Följer sliden texten? Bildtexten visar "klick N av M" först när scenrutan
    // svarat på läslägets EGET kommando. Saknas det står sliden kvar medan texten
    // rullar — felet som bara syntes publicerat (scenrutan blev klar före sidan).
    for (const sample of follow) {
      const ok = new RegExp(`^Slide ${sample.slide}\\b.*klick \\d+ av \\d+`, "i").test(sample.caption ?? "");
      if (!ok) problems.push(`sliden följer inte texten vid ${sample.id}: bildtexten är "${sample.caption}" (väntat "Slide ${sample.slide} · klick N av M")`);
    }
    if (follow.length) console.log(`  sliden följer texten: ${follow.map((s) => `${s.id} → ${s.caption}`).join(" · ")}`);
  } catch (error) {
    problems.push(`--steps misslyckades: ${error.message}`);
  }
}

if (problems.length) {
  console.log(`\n  ${problems.length} fel:`);
  problems.forEach((p) => console.log(`   ✗ ${p}`));
  process.exit(1);
}
console.log("  ✓ inga fel");
process.exit(0);

// ─────────────────────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function readStepTotals(indices, samples) {
  if (typeof WebSocket === "undefined") throw new Error("kräver Node 22 eller senare (inbyggd WebSocket)");
  const chrome = findChrome();
  if (!chrome) throw new Error("hittar ingen Chrome/Edge — sätt CHROME_PATH");
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "las-check-"));
  const proc = spawn(chrome, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--mute-audio", "--window-size=1440,900", "about:blank",
  ], { stdio: "ignore" });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let socketUrl = null;
    for (let i = 0; i < 60 && !socketUrl; i++) {
      await sleep(250);
      socketUrl = await fetch(`http://127.0.0.1:${port}/json`)
        .then((r) => r.json()).then((list) => list.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? null)
        .catch(() => null);
    }
    if (!socketUrl) throw new Error("Chrome startade inte");
    const ws = new WebSocket(socketUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("CDP-anslutningen bröts")); });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params }));
    });
    await send("Page.enable");
    await send("Page.navigate", { url: `${base}/${slug}/las` });
    // Vänta tills scenrutan säger "ready" — ett meddelande till en iframe som inte
    // hunnit hydrera försvinner tyst (första kompileringen i dev kan ta en halv minut).
    const expression = `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const totals = {}; let ready = false;
      window.addEventListener('message', (e) => {
        if (!e.data || e.data.channel !== 'delningspaket') return;
        if (e.data.type === 'ready') ready = true;
        if (e.data.type === 'state') { ready = true; totals[e.data.slide] = Math.max(totals[e.data.slide] || 0, e.data.totalSteps); }
      });
      // 1. Följ-testet FÖRST, utan att vi själva skickar något: här prövas appens
      //    egen handskakning mellan läsläget och scenrutan.
      const follow = [];
      // Vänta in sidan: före start är dokumentet låst (globals.css) och går inte att rulla.
      for (let i = 0; i < 240 && !(document.querySelector('section[id^="b-"]') && document.documentElement.style.overflow === 'auto'); i++) await sleep(500);
      for (const sample of ${JSON.stringify(samples)}) {
        const el = document.getElementById(sample.id);
        if (!el) { follow.push({ ...sample, caption: null }); continue; }
        const aim = () => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.42 + 30);
        aim();
        let caption = null;
        for (let i = 0; i < (follow.length ? 24 : 120); i++) {
          await sleep(500);
          if (i % 6 === 5) aim(); // typsnitt och bilder kan flytta stycket efter första siktet
          caption = document.querySelector('[class*="stageCaption"] span')?.innerText ?? null;
          if (caption && /klick/i.test(caption) && caption.toLowerCase().startsWith('slide ' + sample.slide + ' ')) break;
        }
        follow.push({ ...sample, caption });
      }
      window.scrollTo(0, 0);
      // 2. Stegantal per slide: fråga scenrutan direkt.
      let frame = null;
      for (let i = 0; i < 240 && !(frame && ready); i++) {
        frame = document.querySelector('iframe');
        if (frame && !ready) frame.contentWindow.postMessage({ channel: 'delningspaket', type: 'show', slide: 0, step: 0 }, location.origin);
        await sleep(500);
      }
      if (!ready) return { error: 'scenrutan svarade aldrig' };
      for (const slide of ${JSON.stringify(indices)}) {
        frame.contentWindow.postMessage({ channel: 'delningspaket', type: 'show', slide, step: 'last' }, location.origin);
        for (let i = 0; i < 16 && totals[slide] === undefined; i++) await sleep(250);
        await sleep(700);
      }
      return { totals, follow };
    })()`;
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    ws.close();
    const value = reply.result?.result?.value;
    if (!value || value.error) throw new Error(value?.error ?? "inget svar från sidan (kör dev-servern?)");
    return { totals: value.totals, follow: value.follow ?? [] };
  } finally {
    proc.kill();
    await sleep(400);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}
