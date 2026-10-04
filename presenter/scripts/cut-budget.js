/**
 * Mäter tidsbudgeten per cut — vad varje version faktiskt levererar.
 *
 *   node scripts/cut-budget.js content/deck.mdx
 *
 * Fanns inte när cut-namnen sattes i norrby-gymnasiet-v2, och det syntes:
 * "90 min · tajt" levererade 104 min och "100 min · smal" hette en gång
 * "60 min". Ett cut-namn som ljuger får en att välja fel version i rummet.
 *
 * Läser cuts ur frontmatter, cutSkip ur slidetaggarna och tiden ur Notes-
 * fältens `**~N min.**`-markeringar — samma källa som slide-catalog.js.
 *
 * Varnar också för det som gick sönder i v2: cut-taggar som pekar på en cut
 * som inte är deklarerad (taggen gör då ingenting alls).
 */
const fs = require("fs");

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText",
]);

const file = process.argv[2];
if (!file) {
  console.error("Användning: node scripts/cut-budget.js <fil.mdx>");
  process.exit(1);
}

// CRLF normaliseras — filerna checkas ut med Windows-radslut och regexarna
// nedan förutsätter \n. Utan detta hittas noll deklarerade cuts.
const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
const fm = fmMatch ? fmMatch[1] : "";

// Deklarerade cuts: rader som "  - id: nittio" följt av "    name: ..."
const declared = [];
{
  const lines = fm.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*-\s*id:\s*(\S+)/.exec(lines[i]);
    if (!m) continue;
    let name = "";
    for (let j = i + 1; j < lines.length && j < i + 4; j++) {
      const n = /^\s*name:\s*(.+?)\s*(?:#.*)?$/.exec(lines[j]);
      if (n) { name = n[1].trim(); break; }
      if (/^\s*-\s*id:/.test(lines[j])) break;
    }
    declared.push({ id: m[1], name });
  }
}

const body = raw.slice(fmMatch ? fmMatch[0].length : 0);
const L = body.split("\n");

const slides = [];
let cur = null;
for (const l of L) {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(l);
  if (m && m[1] !== "Notes" && !OVERLAY_TAGS.has(m[1])) {
    cur = { tag: m[1], min: 0, cuts: "" };
    slides.push(cur);
  }
  if (cur && !cur.cuts) {
    const c = /cutSkip="([^"]+)"/.exec(l);
    if (c) cur.cuts = c[1];
  }
  const t = /\*\*~([\d,.]+)(?:[–—-][\d,.]+)?\s*(min|sek)/.exec(l);
  if (t && cur) {
    const v = parseFloat(t[1].replace(",", "."));
    cur.min += t[2] === "min" ? v : v / 60;
  }
}

const tagsOf = (s) => (s.cuts ? s.cuts.split(/[\s,]+/).filter(Boolean) : []);
const total = slides.reduce((a, b) => a + b.min, 0);

console.log(`\n${file}\n`);
console.log("| Version | Slides | Talad tid |");
console.log("|---|---|---|");
console.log(`| FULL | ${slides.length} | ${Math.round(total)} min |`);

for (const c of declared) {
  const kept = slides.filter((s) => !tagsOf(s).includes(c.id));
  const min = kept.reduce((a, b) => a + b.min, 0);
  console.log(`| ${c.name || c.id} | ${kept.length} | ${Math.round(min)} min |`);
}

// Cut-taggar som inte motsvarar någon deklarerad cut gör ingenting —
// det är så en slide tyst blir kvar i en version den var tänkt att lämna.
const declaredIds = new Set(declared.map((c) => c.id));
const orphans = new Map();
slides.forEach((s, i) => {
  for (const t of tagsOf(s)) {
    if (!declaredIds.has(t)) {
      if (!orphans.has(t)) orphans.set(t, []);
      orphans.get(t).push(`${i + 1} ${s.tag}`);
    }
  }
});
if (orphans.size) {
  console.log("\n⚠ DÖDA CUT-TAGGAR (cutten är inte deklarerad — taggen gör inget):");
  for (const [t, where] of orphans) {
    console.log(`  "${t}" på ${where.length} slides: ${where.slice(0, 6).join(", ")}${where.length > 6 ? " …" : ""}`);
  }
}

const untimed = slides.filter((s) => !s.min).length;
if (untimed) {
  console.log(`\nNot: ${untimed} slides saknar **~N min.**-markering och räknas som 0.`);
}
console.log("");
