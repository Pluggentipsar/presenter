/**
 * Tar bort slides ur ett deck, angivna med slide-NUMMER (1-indexerat, samma
 * numrering som slidemap.js visar).
 *
 *   node scripts/cut-slides.js content/deck.mdx 3,4,29,30 --dry
 *
 * En slides block = dess öppningstagg till och med allt som hör till den:
 * <Notes>, overlay-taggar (FloatingImage m.fl.) och mellanliggande
 * kommentarer. Overlays hör till sliden FÖRE sig och följer med när den
 * kapas — annars blir de föräldralösa och hamnar på fel slide.
 *
 * --dry visar vad som skulle tas bort utan att skriva.
 */
const fs = require("fs");

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText",
]);

const [, , file, listArg, ...rest] = process.argv;
const dry = rest.includes("--dry");
if (!file || !listArg) {
  console.error("Användning: node scripts/cut-slides.js <fil.mdx> <1,2,3> [--dry]");
  process.exit(1);
}
const kill = new Set(listArg.split(",").map((s) => parseInt(s.trim(), 10)));

const raw = fs.readFileSync(file, "utf8");
const fm = (raw.match(/^---\n[\s\S]*?\n---\n/) || [""])[0];
const body = raw.slice(fm.length);
const L = body.split("\n");

// Kartlägg varje slides startrad
const marks = [];
for (let i = 0; i < L.length; i++) {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(L[i]);
  if (!m) continue;
  const tag = m[1];
  if (tag === "Notes") continue;
  if (OVERLAY_TAGS.has(tag)) continue;
  marks.push({ n: marks.length + 1, tag, start: i });
}
// Slutet på en slide = raden före nästa slides start (eller filslut)
marks.forEach((mk, idx) => {
  mk.end = idx + 1 < marks.length ? marks[idx + 1].start - 1 : L.length - 1;
});

// Dra starten uppåt över ett omedelbart föregående kommentarblock. Utan detta
// blir "{/* ── 2.6 · RealOrFake ── */}" kvar som föräldralös rubrik när sliden
// kapas — vilket ser ut som en trasig återkoppling vid nästa genomläsning.
marks.forEach((mk) => {
  let i = mk.start - 1;
  while (i >= 0 && L[i].trim() === "") i--;
  if (i < 0) return;
  // Backa över hela kommentaren, även om den spänner flera rader
  if (L[i].trimEnd().endsWith("*/}")) {
    let j = i;
    while (j >= 0 && !L[j].trimStart().startsWith("{/*")) j--;
    if (j >= 0) mk.start = j;
  }
});

const doomed = marks.filter((m) => kill.has(m.n));
const missing = [...kill].filter((n) => !marks.some((m) => m.n === n));
if (missing.length) console.warn("VARNING: finns inte:", missing.join(", "));

console.log(`${marks.length} slides · tar bort ${doomed.length}:`);
doomed.forEach((d) =>
  console.log(`  ${String(d.n).padStart(3)} ${d.tag.padEnd(20)} rad ${d.start + 1}–${d.end + 1}`),
);

if (dry) { console.log("\n(--dry: inget skrivet)"); process.exit(0); }

const drop = new Set();
doomed.forEach((d) => { for (let i = d.start; i <= d.end; i++) drop.add(i); });
const out = L.filter((_, i) => !drop.has(i));
fs.writeFileSync(file, fm + out.join("\n"));
console.log(`\nSkrivet. ${marks.length - doomed.length} slides kvar.`);
