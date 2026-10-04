#!/usr/bin/env node
/**
 * Bryggfilmerna som riktiga filmer (3 oktober 2026). En headless Edge eller Chrome spelar en bryggfilm
 * (formen brygga med fältet film) bildruta för bildruta, och den medpackade ffmpeg gör en mp4 av
 * bilderna. Skriptet sätter själv tiden (?filmfangst=1 och händelsen filmtid), så varje bildruta blir
 * exakt och filmen jämn hur långsam datorn än är. Bra för att visa en film på telefonen innan den
 * prövas i rummet.
 *
 * Användning (dev-servern måste vara igång):
 *   node scripts/film-fanga.mjs <slug> [--base http://127.0.0.1:3000] [--fps 30] [--vila 2] [--bredd 1600] <slide> ...
 *
 * Sliden räknas från 1 som i granskningsvyn. --vila är sekunderna slutbilden står kvar efter filmen,
 * --bredd filmens bredd i bildpunkter (scenen fångas i 1600 × 900). Med flera slides görs också
 * en sammanklippt film. Allt hamnar i presenter/.granska/<slug>/filmer/.
 */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const rest = args.filter((arg, i) => !arg.startsWith("--") && !args[i - 1]?.startsWith("--"));
const [slug, ...slides] = rest;
if (!slug || !slides.length || slides.some(slide => !/^\d+$/.test(slide))) {
  console.error("Användning: node scripts/film-fanga.mjs <slug> [--base http://127.0.0.1:3000] [--fps 30] [--vila 2] [--bredd 1600] <slide> ...");
  process.exit(1);
}
const fps = Number(option("fps") || 30);
const hold = Number(option("vila") ?? 2);
const width = Number(option("bredd") || 1600);
const base = (option("base") || process.env.GRANSKA_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ffmpeg = [join(root, ".verktyg", "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"), "ffmpeg"].find(path => path === "ffmpeg" || existsSync(path));
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

/** Första kodaren som fungerar här: grafikkortets, Windows egen, sedan OpenH264 (samma ordning som filmexporten). */
const ENCODERS = [
  ["h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p6", "-tune", "hq", "-rc", "vbr", "-cq", "20", "-b:v", "0", "-profile:v", "high", "-pix_fmt", "yuv420p"]],
  ["h264_qsv", ["-c:v", "h264_qsv", "-global_quality", "20", "-pix_fmt", "nv12"]],
  ["h264_amf", ["-c:v", "h264_amf", "-quality", "quality", "-rc", "cqp", "-qp_i", "20", "-qp_p", "22", "-pix_fmt", "yuv420p"]],
  ["libx264", ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p"]],
  ["h264_mf", ["-c:v", "h264_mf", "-rate_control", "quality", "-quality", "85", "-pix_fmt", "nv12"]],
  ["libopenh264", ["-c:v", "libopenh264", "-b:v", "14M", "-pix_fmt", "yuv420p"]],
];
function encoder() {
  for (const [name, flags] of ENCODERS) {
    const probe = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=black:s=320x180:d=0.2", ...flags, "-f", "null", "-"], { stdio: "ignore" });
    if (probe.status === 0) return [name, flags];
  }
  throw new Error("Ingen H.264-kodare fungerar i ffmpeg.");
}

const out = join(root, ".granska", slug, "filmer");
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "film-fanga-"));
const port = 9300 + Math.floor(Math.random() * 600);
const child = spawn(browser, [
  "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--force-color-profile=srgb",
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
  const [encoderName, encoderFlags] = encoder();
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
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expression => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || "Fel i sidan");
    return reply.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  const made = [];
  for (const slide of slides) {
    await send("Page.navigate", { url: `${base}/${slug}/scen?slide=${slide}&step=0&filmfangst=1` });
    let length = 0;
    for (let i = 0; i < 150 && !length; i++) {
      await sleep(200);
      length = await evaluate("window.__filmRedo ? window.__filmLangd : 0").catch(() => 0);
    }
    if (!length) { console.error(`Slide ${slide}: ingen bryggfilm (fältet film saknas?)`); continue; }
    // Utvecklingsserverns märke i hörnet ska inte med i filmen.
    await evaluate(`document.fonts.ready.then(() => { const style = document.createElement("style"); style.textContent = "nextjs-portal{display:none!important}"; document.head.append(style); return true; })`);
    await sleep(1200);
    const frames = mkdtempSync(join(tmpdir(), "film-fanga-bilder-"));
    const total = Math.round((length + hold) * fps);
    const started = Date.now();
    for (let frame = 0; frame <= total; frame++) {
      const time = Math.min(length, frame / fps);
      // Sätt tiden, vänta tills alla bilder är avkodade och sidan har ritats två gånger.
      await evaluate(`(async () => {
        window.dispatchEvent(new CustomEvent("filmtid", { detail: ${time} }));
        await new Promise(r => requestAnimationFrame(() => r()));
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return true;
      })()`);
      const image = await send("Page.captureScreenshot", { format: "jpeg", quality: 94 });
      writeFileSync(join(frames, `${String(frame).padStart(5, "0")}.jpg`), Buffer.from(image.result.data, "base64"));
      if (frame % (fps * 2) === 0) process.stdout.write(`\rslide ${slide}: ${Math.round((frame / total) * 100)} %   `);
    }
    const file = join(out, `brygga-${slide}.mp4`);
    const scale = width === 1600 ? [] : ["-vf", `scale=${width}:-2:flags=lanczos`];
    const encoded = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(fps), "-i", join(frames, "%05d.jpg"), ...scale, ...encoderFlags, "-r", String(fps), "-movflags", "+faststart", file], { stdio: "inherit" });
    rmSync(frames, { recursive: true, force: true });
    if (encoded.status !== 0) throw new Error(`ffmpeg kunde inte göra ${file}`);
    made.push(file);
    console.log(`\r${file} (${length} s film + ${hold} s vila, ${total + 1} bilder på ${Math.round((Date.now() - started) / 1000)} s, ${encoderName})`);
  }
  if (made.length > 1) {
    const list = join(out, "lista.txt");
    writeFileSync(list, made.map(file => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
    const reel = join(out, "bryggor.mp4");
    const joined = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", reel], { stdio: "inherit" });
    rmSync(list, { force: true });
    if (joined.status === 0) console.log(reel);
  }
  ws.close();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  stop();
}
