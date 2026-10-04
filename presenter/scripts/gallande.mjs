#!/usr/bin/env node
// Vilken version av en föreläsning gäller?
//
//   node scripts/gallande.mjs                      alla föreläsningar som finns i flera versioner
//   node scripts/gallande.mjs norrby-gymnasiet     den version som gäller (bara adressen, för skript)
//   node scripts/gallande.mjs norrby-gymnasiet-v2  samma svar — vilken version som helst duger som fråga
//   node scripts/gallande.mjs --json               allt som JSON
//
// Joel sätter en stjärna i biblioteket (startsidan) på den version som gäller.
// Stjärnan sparas i content/bibliotek.json som `"current": true` på det decket,
// och alla versioner av samma föreläsning delar `"family"`. Den som hänvisar till
// föreläsningen — i ett samtal, i wikin, i ett byggpass — menar i första hand den
// stjärnmärkta. Skriptet är till för agenter (Claude Code, Codex) och för egna
// skript, så att ingen behöver gissa mellan -v2 och -v3.
//
// Beroendefritt: läser bara JSON-filen. Reglerna finns i src/lib/library.ts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// PRESENTER_LIBRARY_FILE pekar ut en annan fil — används av testerna.
const file = process.env.PRESENTER_LIBRARY_FILE ?? path.join(root, "content", "bibliotek.json");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const query = args.find((arg) => !arg.startsWith("--"));

let decks = {};
try {
  decks = JSON.parse(fs.readFileSync(file, "utf8")).decks ?? {};
} catch {
  // Ingen biblioteksfil = inga samlade versioner. Varje deck gäller då själv.
}

const families = new Map();
for (const [slug, entry] of Object.entries(decks)) {
  if (!entry || typeof entry.family !== "string") continue;
  const family = families.get(entry.family) ?? { family: entry.family, current: null, versions: [] };
  family.versions.push(slug);
  if (entry.current === true) family.current = slug;
  families.set(entry.family, family);
}
for (const family of families.values()) {
  family.versions.sort();
  // Samma reservregel som biblioteket: saknas stjärnan gäller den sista i bokstavsordning.
  family.current ??= family.versions[family.versions.length - 1];
  family.exists = family.versions.filter((slug) => fs.existsSync(path.join(root, "content", `${slug}.mdx`)));
}

if (query) {
  const family = families.get(query) ?? families.get(decks[query]?.family);
  const answer = family?.current ?? query;
  if (asJson) console.log(JSON.stringify({ asked: query, current: answer, family: family?.family ?? null, versions: family?.versions ?? [query] }));
  else console.log(answer);
  if (!fs.existsSync(path.join(root, "content", `${answer}.mdx`))) {
    console.error(`(obs: content/${answer}.mdx finns inte på den här datorn)`);
    process.exitCode = 1;
  }
} else if (asJson) {
  console.log(JSON.stringify([...families.values()], null, 2));
} else if (families.size === 0) {
  console.log("Inga versioner är samlade ännu. Varje föreläsning gäller själv.");
} else {
  for (const family of [...families.values()].sort((a, b) => a.family.localeCompare(b.family))) {
    console.log(`${family.family}`);
    for (const slug of family.versions) console.log(`  ${slug === family.current ? "★" : " "} ${slug}${family.exists.includes(slug) ? "" : "   (finns inte här)"}`);
  }
}
