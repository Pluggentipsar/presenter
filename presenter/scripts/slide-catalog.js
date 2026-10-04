/**
 * Dumpar en slide-katalog i markdown-tabellform för en wiki.
 *
 *   node scripts/slide-catalog.js content/deck.mdx
 *
 * Kolumner: nummer · template · kicker/titel · tid · cut-flaggor.
 * Skriven för att slippa handskriva 100+ rader och för att katalogen ska
 * stämma med filen i stället för med minnet av den.
 */
const fs = require("fs");

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText",
]);

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const L = raw.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n");

const slides = [];
let cur = null;
for (const l of L) {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(l);
  if (m && m[1] !== "Notes" && !OVERLAY_TAGS.has(m[1])) {
    cur = { n: slides.length + 1, tag: m[1], label: "", min: 0, cuts: "" };
    slides.push(cur);
    const c = /cutSkip="([^"]+)"/.exec(l);
    if (c) cur.cuts = c[1];
  } else if (cur) {
    if (!cur.cuts) {
      const c = /cutSkip="([^"]+)"/.exec(l);
      if (c) cur.cuts = c[1];
    }
    if (!cur.label) {
      const t = /(?:title|kicker|eyebrow|term|quoteSeal)="([^"]{4,70})"/.exec(l);
      if (t) cur.label = t[1];
    }
  }
  const t = /\*\*~([\d,.]+)(?:[–—-][\d,.]+)?\s*(min|sek)/.exec(l);
  if (t && cur) {
    const v = parseFloat(t[1].replace(",", "."));
    cur.min += t[2] === "min" ? v : v / 60;
  }
}

const clean = (s) => s.replace(/\*\*/g, "").replace(/\|/g, "·").trim();
console.log("| # | Template | Innehåll | Tid | Cut |");
console.log("|---|----------|----------|-----|-----|");
for (const s of slides) {
  console.log(
    `| ${s.n} | \`${s.tag}\` | ${clean(s.label) || "—"} | ${s.min ? s.min.toFixed(1) : "—"} | ${s.cuts || ""} |`,
  );
}
const tot = slides.reduce((a, b) => a + b.min, 0);
console.error(`\n${slides.length} slides · ${Math.round(tot)} min`);
