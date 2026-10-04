// Listar riktiga slides (exkl. Notes och overlay-taggar) med position + slideId.
// Positionen är 1-indexerad och matchar frontmatterns designnycklar.
const fs = require("fs");

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText",
]);

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
// Klipp bort frontmatter
const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
const lines = body.split("\n");

const slides = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(lines[i]);
  if (!m) continue;
  const tag = m[1];
  if (tag === "Notes") continue;
  if (OVERLAY_TAGS.has(tag)) continue;

  // Leta slideId i blocket (fram till nästa toppnivåtagg eller >)
  let slideId = null;
  for (let j = i; j < Math.min(i + 40, lines.length); j++) {
    const idm = /slideId=["']([^"']+)["']/.exec(lines[j]);
    if (idm) { slideId = idm[1]; break; }
    if (j > i && /^<[A-Z]/.test(lines[j])) break;
  }
  slides.push({ pos: slides.length + 1, tag, slideId, line: i + 1 });
}

const keys = process.argv.slice(3);
if (keys.length) {
  for (const k of keys) {
    const s = slides[Number(k) - 1];
    console.log(k.padStart(3) + "  " + (s ? `${s.tag.padEnd(22)} rad ${String(s.line).padEnd(6)} ${s.slideId ?? "SAKNAR slideId"}` : "FINNS INTE"));
  }
} else {
  console.log(`${slides.length} slides`);
  const utan = slides.filter((s) => !s.slideId);
  console.log(`${utan.length} utan slideId: ${utan.map((s) => `${s.pos}:${s.tag}`).join(", ")}`);
}
