// Jämför vilka block som förekommer i BÅDA decken (slidetext, ej Notes/kommentarer).
const fs = require("fs");
const strip = (s) =>
  s.replace(/<Notes>[\s\S]*?<\/Notes>/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const F = strip(fs.readFileSync(process.argv[2], "utf8"));
const E = strip(fs.readFileSync(process.argv[3], "utf8"));

const tags = (s) => {
  const out = new Map();
  for (const m of s.matchAll(/^<([A-Z][A-Za-z0-9]*)/gm)) {
    if (m[1] === "Notes") continue;
    out.set(m[1], (out.get(m[1]) ?? 0) + 1);
  }
  return out;
};

const a = tags(F), b = tags(E);
const both = [...a.keys()].filter((k) => b.has(k)).sort();
const onlyF = [...a.keys()].filter((k) => !b.has(k)).sort();
const onlyE = [...b.keys()].filter((k) => !a.has(k)).sort();

console.log(`FM1: ${[...a.values()].reduce((x, y) => x + y, 0)} block · ${a.size} olika templates`);
console.log(`EM1: ${[...b.values()].reduce((x, y) => x + y, 0)} block · ${b.size} olika templates`);
console.log(`\nI BÅDA decken (${both.length}) — kontrollera att innehållet skiljer:`);
for (const k of both) console.log(`  ${k.padEnd(22)} FM1:${a.get(k)}  EM1:${b.get(k)}`);
console.log(`\nBara FM1 (${onlyF.length}): ${onlyF.join(", ")}`);
console.log(`\nBara EM1 (${onlyE.length}): ${onlyE.join(", ")}`);
