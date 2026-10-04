// Referensen över Stage-motorns former, ur formregistret (3 oktober 2026).
//
//   node scripts/stage-referens.mjs        skriv docs/STAGE-FORMER.md
//
// Varje form får sin etikett, sitt bildläge, sina egna fält med etiketter och regeln för hur många
// klicklägen innehållet ger. De fält som alla former har står en gång överst. Referensen genereras:
// ändra inte docs/STAGE-FORMER.md för hand, utan kör skriptet igen när en form har lagts till eller
// ändrats.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { stageForms, stageFormFieldLabel, stageFormFieldType } = await import("../src/templates/stage/stage-forms.ts");

const ids = Object.keys(stageForms);
// Fälten som alla former har.
const common = stageForms[ids[0]].fields.filter((field) => ids.every((id) => stageForms[id].fields.includes(field)));
const type = (name) => ({ image: "bild", multiline: "flera rader", text: "text" })[stageFormFieldType(name)];
// Numrerade fält (msg1, msg2 …) visas en gång, som msg1…msgN.
function grouped(fields) {
  const out = [];
  const seen = new Map();
  for (const field of fields) {
    const m = /^([a-zA-Z]+?)(\d+)$/.exec(field);
    if (m && fields.includes(`${m[1]}${Number(m[2]) + 1}`) || m && seen.has(m[1])) {
      const entry = seen.get(m[1]) ?? { base: m[1], first: field, last: field };
      entry.last = field;
      if (!seen.has(m[1])) { seen.set(m[1], entry); out.push(entry); }
      continue;
    }
    out.push({ base: field, first: field, last: field });
  }
  return out;
}

const lines = [
  "# Stage-formerna",
  "",
  `> Genereras av \`node presenter/scripts/stage-referens.mjs\` ur formregistret (\`src/templates/stage/stage-forms.ts\`). Ändra inte för hand. ${ids.length} former.`,
  "",
  "En slide i Stage-motorn skrivs `<Stage form=\"<form>\" slideId=\"…\" …fält… />`. Fälten är props; all synlig text och alla bilder är fält, så att R-editorn kan ändra dem. Hur formerna fungerar, textsyntaxen och världarna står i `STAGE.md`.",
  "",
  "## Fält som alla former har",
  "",
  "| Fält | Betydelse |",
  "|---|---|",
  ...common.map((name) => `| \`${name}\` | ${stageFormFieldLabel(name).replace(/\|/g, "\\|")} |`),
  "",
  "## Formerna",
  "",
];
for (const id of ids) {
  const form = stageForms[id];
  const own = grouped(form.fields.filter((field) => !common.includes(field)));
  const layouts = form.layouts ? form.layouts.join(", ") : form.layout;
  lines.push(`### \`${id}\` · ${form.label}`, "");
  lines.push(`Bildläge: ${layouts}. Klicklägen: \`${String(form.steps).replace(/\s+/g, " ")}\``, "");
  if (own.length) {
    lines.push("| Fält | Betydelse | Typ |", "|---|---|---|");
    for (const entry of own) {
      const many = entry.first !== entry.last;
      const name = many ? `\`${entry.first}\` … \`${entry.last}\`` : `\`${entry.first}\``;
      // Numrerade fält får etiketten utan sitt nummer.
      const label = stageFormFieldLabel(entry.first, id).replace(many ? / 1$/ : /$^/, "");
      lines.push(`| ${name} | ${label.replace(/\|/g, "\\|")} | ${type(entry.first)} |`);
    }
    lines.push("");
  }
}
const file = path.join(root, "docs", "STAGE-FORMER.md");
fs.writeFileSync(file, lines.join("\n"));
console.log(`Skrev docs/STAGE-FORMER.md: ${ids.length} former, ${common.length} gemensamma fält.`);
