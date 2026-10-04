#!/usr/bin/env node
// Tar fram underlaget för en lästext ur ett deck: per aktiv slide det Joel säger
// (SÄG), vad varje klick visar (STEG), bryggan vidare och källgränserna.
//
//   node scripts/las-underlag.mjs <slug>                 alla aktiva slides
//   node scripts/las-underlag.mjs <slug> --from=16 --to=30
//   node scripts/las-underlag.mjs <slug> --full          hela Notes, oavkortade
//   node scripts/las-underlag.mjs <slug> --hidden        ta med dolda slides
//
// Utdata är arbetsmaterial för den som skriver content/las/<slug>.md — Notes är
// talarstöd till Joel och får aldrig klistras in i lästexten. Se docs/DELNINGSPAKET.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const from = Number(option("from") ?? 1);
const to = Number(option("to") ?? Infinity);
const full = args.includes("--full");
const includeHidden = args.includes("--hidden");

if (!slug) {
  console.error("Användning: node scripts/las-underlag.mjs <slug> [--from=N] [--to=N] [--full] [--hidden]");
  process.exit(2);
}
const deckPath = path.join(root, "content", `${slug}.mdx`);
if (!fs.existsSync(deckPath)) {
  console.error(`Saknas: content/${slug}.mdx`);
  process.exit(2);
}

const OVERLAY_TAGS = new Set([
  "FloatingImage", "FloatingVideo", "FloatingAudio", "FloatingChat",
  "FloatingPills", "FloatingPhone", "FloatingText", "DriftingNotes",
]);
const raw = fs.readFileSync(deckPath, "utf8");
// hiddenSlides står antingen som lista på egna rader eller på en rad: [50, 51].
const hidden = new Set(
  ((/^hiddenSlides:\s*\[([^\]]*)\]/m.exec(raw) ??
    /^hiddenSlides:\s*\r?\n((?:\s+-\s*\d+\s*\r?\n)+)/m.exec(raw))?.[1].match(/\d+/g) ?? []).map(Number),
);
const lines = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").split(/\r?\n/);
const starts = [];
lines.forEach((line, i) => {
  const m = /^<([A-Z][A-Za-z0-9]*)/.exec(line);
  if (m) starts.push({ tag: m[1], line: i });
});

const slides = [];
starts.forEach((start, k) => {
  const block = lines.slice(start.line, starts[k + 1]?.line ?? lines.length).join("\n");
  if (start.tag === "Notes") {
    // Bara det som står mellan taggarna — MDX-kommentarer efter </Notes> hör till nästa slide.
    const inner = /<Notes>([\s\S]*?)<\/Notes>/.exec(block)?.[1] ?? "";
    if (slides.length) slides[slides.length - 1].notes = inner.trim();
    return;
  }
  if (OVERLAY_TAGS.has(start.tag) && slides.length > 0) return;
  const prop = (name) => new RegExp(`\\s${name}="([^"]*)"`).exec(block)?.[1] ?? "";
  slides.push({
    n: slides.length + 1, tag: start.tag, id: prop("slideId"), scene: prop("scene"),
    title: prop("title"), kicker: prop("kicker"), source: prop("kalla"), notes: "",
  });
});

const HEADINGS = "SÄG|SÄG OCH STEGA|STEG|STEG OCH PUBLIKENS FOKUS|CLICKER|FOKUS OCH CLICKER|ÖVERGÅNG|PROVENIENS|KÄLLGRÄNS|KÄLLA OCH AVGRÄNSNING|REGI|KONTEXT|PROMPT|FÖLJDPROMPT|LÄRARGRANSKNING|SYFTE";
const section = (text, names) => {
  const m = new RegExp(`(?:^|\\n)(?:${names})[^\\n:]*:\\s*([\\s\\S]*?)(?=\\n(?:${HEADINGS}|HELA [^\\n:]*|###)[^\\n]*:?\\s*(?:\\n|$)|$)`).exec(text);
  return m ? m[1].trim() : "";
};
const clip = (text, max) => (full || text.length <= max ? text : `${text.slice(0, max)} …[avkortat, kör --full]`);
const flat = (text) => text.replace(/\n{2,}/g, "\n").replace(/\n/g, "\n      ");

let shown = 0;
for (const slide of slides) {
  if (slide.n < from || slide.n > to) continue;
  const isHidden = hidden.has(slide.n);
  if (isHidden && !includeHidden) continue;
  shown++;
  console.log(`\n══ ${slide.n}${isHidden ? " (DOLD)" : ""} · ${slide.id || "(inget slideId!)"} · ${slide.tag}${slide.scene ? ` ${slide.scene}` : ""}${slide.kicker ? ` · kicker: ${slide.kicker}` : ""}`);
  if (slide.title) console.log(`   TITEL: ${slide.title}`);
  if (!slide.notes) { console.log("   (inga Notes)"); continue; }
  if (full) { console.log(`   NOTES:\n      ${flat(slide.notes)}`); continue; }
  const say = section(slide.notes, "SÄG|SÄG OCH STEGA");
  const steps = section(slide.notes, "STEG|STEG OCH PUBLIKENS FOKUS");
  const bridge = section(slide.notes, "ÖVERGÅNG");
  const limits = section(slide.notes, "KÄLLGRÄNS|KÄLLA OCH AVGRÄNSNING") || slide.source;
  if (!say && !steps) { console.log(`   NOTES (ingen SÄG/STEG-struktur):\n      ${flat(clip(slide.notes, 1600))}`); continue; }
  if (say) console.log(`   SÄG:\n      ${flat(clip(say, 1400))}`);
  if (steps) console.log(`   STEG:\n      ${flat(clip(steps, 1400))}`);
  if (bridge) console.log(`   ÖVERGÅNG: ${clip(bridge.replace(/\n+/g, " "), 300)}`);
  if (limits) console.log(`   KÄLLGRÄNS: ${clip(limits.replace(/\n+/g, " "), 500)}`);
}
console.log(`\n${shown} slides visade (${slides.length} i decket, ${hidden.size} dolda).`);
