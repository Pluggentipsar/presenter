/**
 * Lägger till slideId på varje slide som saknar ett.
 *
 * Rör INTE overlay-taggar (FloatingImage m.fl.) eller <Notes> — de är inte
 * slides. ID:t sätts direkt efter tagg-namnet och fungerar både för
 * självstängande taggar och taggar med barn.
 *
 *   node scripts/add-slideids.js content/deck.mdx og2
 *
 * Andra argumentet är ett kort prefix så ID:n blir läsbara: sl_og2_001.
 * ID:n är permanenta identiteter — siffran speglar skapandeordning, inte
 * position. Flyttas en slide behåller den sitt ID.
 */
const fs = require("fs");

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText",
]);

const file = process.argv[2];
const prefix = process.argv[3] || "sl";
if (!file) {
  console.error("Användning: node scripts/add-slideids.js <fil.mdx> <prefix>");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n/);
const frontmatter = fmMatch ? fmMatch[0] : "";
const body = fmMatch ? raw.slice(frontmatter.length) : raw;

const lines = body.split("\n");
let n = 0, added = 0, hadAlready = 0;

for (let i = 0; i < lines.length; i++) {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(lines[i]);
  if (!m) continue;
  const tag = m[1];
  if (tag === "Notes" || OVERLAY_TAGS.has(tag)) continue;

  n++;

  // Finns redan ett slideId i blocket?
  let has = false;
  for (let j = i; j < Math.min(i + 40, lines.length); j++) {
    if (/slideId=/.test(lines[j])) { has = true; break; }
    if (j > i && /^<[A-Z]/.test(lines[j])) break;
  }
  if (has) { hadAlready++; continue; }

  const id = `${prefix}_${String(n).padStart(3, "0")}`;
  lines[i] = lines[i].replace(/^<([A-Z][A-Za-z0-9]*)/, `<$1 slideId="${id}"`);
  added++;
}

fs.writeFileSync(file, frontmatter + lines.join("\n"));
console.log(`${n} slides · ${hadAlready} hade redan slideId · ${added} tillagda`);
