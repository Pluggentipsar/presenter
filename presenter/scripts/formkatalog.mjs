// Formkatalogen: varje form i Stage-motorn (Stage) i alla sina lägen.
//
//   node scripts/formkatalog.mjs            skriv content/formkatalog.mdx
//   node scripts/formkatalog.mjs --lista    visa vilket exempel varje form får
//
// Exemplen är riktiga och godkända: för varje form väljs den användning i decken som
// har flest lägen (de utvalda decken först, sedan övriga deck med Stage-former).
// Talet i Notes byts mot en beskrivning av formen, och kickern får formens namn så
// att katalogen går att läsa i presentationsvyn. hoppaSteg, stegAv, resa och akt tas
// bort, så att alla lägen syns och ingen resa hänger kvar mellan orelaterade slides.
//
// Katalogen genereras: ändra inte content/formkatalog.mdx för hand. Kör skriptet
// igen när en form har lagts till eller ändrats, och gå igenom /formkatalog och
// /formkatalog/granska. Då blir katalogen också ett regressionstest för motorn.
import fs from "node:fs";
import path from "node:path";
import { loadDeck, root } from "./lib/deck.mjs";

const { extractSlideRaw } = await import("../src/lib/mdx-parser.ts");
const { stageForms } = await import("../src/templates/stage/stage-forms.ts");
// Filmscenerna är privata och följer inte med i den publika versionen; där visar katalogen bara formerna.
const { stageScenes } = await import("../src/templates/stage/stage-scenes.ts").catch(() => ({ stageScenes: {} }));

const contentDir = path.join(root, "content");
const preferred = ["presenter-valkommen"];
const skip = new Set(["formkatalog"]);
const decks = [
  ...preferred,
  ...fs.readdirSync(contentDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.slice(0, -4))
    .filter((slug) => !preferred.includes(slug) && !skip.has(slug))
    .filter((slug) => fs.readFileSync(path.join(contentDir, `${slug}.mdx`), "utf8").includes("<Stage"))
    .sort(),
];

// Alla användningar av varje form och scen.
const uses = new Map();
for (const slug of decks) {
  const file = path.join(contentDir, `${slug}.mdx`);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  for (const slide of loadDeck(slug).slides) {
    if (slide.tag !== "Stage") continue;
    const key = typeof slide.props.form === "string" && slide.props.form in stageForms ? slide.props.form : `scene:${slide.props.scene ?? "william"}`;
    const list = uses.get(key) ?? [];
    // Dolda reserver används bara när formen inte finns någon annanstans (privat i film 4).
    list.push({ slug, slide, source, rank: (slide.hidden ? 2 : 0) + (preferred.includes(slug) ? 0 : 1) });
    uses.set(key, list);
  }
}

const keys = [...Object.keys(stageForms), ...Object.keys(stageScenes).map((s) => `scene:${s}`)];
const pick = (key) => (uses.get(key) ?? [])
  .slice()
  .sort((a, b) => a.rank - b.rank || (b.slide.steps.total ?? 0) - (a.slide.steps.total ?? 0))[0];

if (process.argv.includes("--lista")) {
  for (const key of keys) {
    const p = pick(key);
    console.log(`${key.padEnd(18)} ${p ? `${p.slug} · ${p.slide.slideId} · ${p.slide.steps.total} lägen · ${(uses.get(key) ?? []).length} användningar` : "INGEN ANVÄNDNING"}`);
  }
  process.exit(0);
}

const parts = [];
const missing = [];
let total = 0;
for (const key of keys) {
  const p = pick(key);
  if (!p) { missing.push(key); continue; }
  const isScene = key.startsWith("scene:");
  const id = isScene ? key.slice(6) : key;
  const definition = isScene ? stageScenes[id] : stageForms[id];
  const label = definition.label;
  let raw = extractSlideRaw(p.source, p.slide.n).replace(/\n<Notes>[\s\S]*<\/Notes>\s*$/, "").trim();
  raw = raw.replace(/\bslideId\s*=\s*(["'])[^"']*\1/, `slideId="fk_${isScene ? "scen_" : ""}${id}"`);
  raw = raw.replace(/\n\s*(hoppaSteg|stegAv|resa|akt|claude)="[^"]*"/g, "");
  const name = isScene ? `scene=${id}` : id;
  raw = /\bkicker="/.test(raw)
    ? raw.replace(/\bkicker="([^"]*)"/, (_, k) => `kicker="${name} · ${k}"`)
    : raw.replace(/(<Stage)/, `$1\n  kicker="${name}"`);
  const steps = p.slide.steps.total;
  total += steps ?? 0;
  const fields = isScene ? Object.keys(definition.fields ?? {}) : definition.fields;
  const note = [
    `${isScene ? "Scen" : "Form"} \`${name}\` · ${label}. ${steps} ${steps === 1 ? "läge" : "lägen"} i exemplet.`,
    "",
    `Exemplet kommer ur ${p.slug} (${p.slide.slideId}). ${(uses.get(key) ?? []).length} användningar i decken.`,
    "",
    `Fält: ${fields.join(", ")}.`,
    "",
    "REGI: Genererat av scripts/formkatalog.mjs. Ändra inte här; ändra källdecket eller formen och kör skriptet igen. Fälten och lägena beskrivs i docs/STAGE.md.",
  ].join("\n");
  parts.push(`${raw}\n\n<Notes>\n${note}\n</Notes>`);
}

// Grepp som formernas grundexempel inte visar: eko, play-orden, högen, pusslet och gryningen.
const grepp = [
];
for (const [name, slug, slideId, what, extra = {}] of grepp) {
  const source = fs.readFileSync(path.join(contentDir, `${slug}.mdx`), "utf8").replace(/\r\n/g, "\n");
  const slide = loadDeck(slug).slides.find((x) => x.slideId === slideId);
  if (!slide) { missing.push(`grepp ${name} (${slideId})`); continue; }
  const id = `fk_grepp_${name.normalize("NFD").replace(/[^a-z]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
  let raw = extractSlideRaw(source, slide.n).replace(/\n<Notes>[\s\S]*<\/Notes>\s*$/, "").trim();
  raw = raw.replace(/\bslideId\s*=\s*(["'])[^"']*\1/, `slideId="${id}"`);
  // Gryningen ska synas i sitt exempel, så dygn får stå kvar här.
  raw = raw.replace(/\n\s*(hoppaSteg|stegAv|resa|akt|claude)="[^"]*"/g, "");
  // Fält som greppet visar men som exemplet inte har (backdrop="tema").
  for (const [key, value] of Object.entries(extra)) raw = raw.replace(/(<Stage)/, `$1\n  ${key}="${value}"`);
  raw = /\bkicker="/.test(raw)
    ? raw.replace(/\bkicker="([^"]*)"/, (_, k) => `kicker="grepp: ${name} · ${k}"`)
    : raw.replace(/(<Stage)/, `$1\n  kicker="grepp: ${name}"`);
  total += slide.steps.total ?? 0;
  parts.push(`${raw}\n\n<Notes>\nGrepp: ${what}. Exemplet kommer ur ${slug} (${slideId}).\n\nREGI: Genererat av scripts/formkatalog.mjs. Greppen beskrivs i docs/STAGE-FORMER.md.\n</Notes>`);
}

const today = new Date().toISOString().slice(0, 10);
const front = [
  "---",
  "title: Formkatalog · Stage-motorn",
  "event: Arbetsverktyg",
  "author: Presenter",
  `date: '${today}'`,
  `description: 'Alla ${Object.keys(stageForms).length} former${Object.keys(stageScenes).length ? ` och ${Object.keys(stageScenes).length} scener` : ""} i Stage, med riktiga exempel ur decken i alla lägen. Genereras av scripts/formkatalog.mjs; ändra inte för hand.'`,
  "theme: glas",
  "granska:",
  "  greenscreen: true",
  "  manus: false",
  "---",
].join("\n");
fs.writeFileSync(path.join(contentDir, "formkatalog.mdx"), `${front}\n\n${parts.join("\n\n")}\n`);
console.log(`Skrev content/formkatalog.mdx: ${parts.length} slides, ${total} lägen.${missing.length ? ` Saknar exempel: ${missing.join(", ")}` : ""}`);
