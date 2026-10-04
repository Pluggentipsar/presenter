#!/usr/bin/env node
// Publicerar en exporterad delning (.delning/<slug>/site) på here.now.
//
//   node scripts/dela-publicera.mjs <slug>              publicera eller uppdatera
//   node scripts/dela-publicera.mjs <slug> --dry-run    visa vad som skulle hända
//
// Kör `node scripts/dela-export.mjs <slug>` först.
//
// Publicering är utåtriktad: gör det bara när Joel uttryckligen bett om det.
// Standardåtkomsten på here.now är "alla med länken". Adressen är svår att gissa
// men inte hemlig — lösenord eller inbjudna sätts efteråt (se docs/DELNINGSPAKET.md).
//
// Samma sajt varje gång: publish/delningar.json (spårad i git) minns vilken here.now-
// sajt som hör till vilket deck. Publiceraren i publish/herenow.mjs har sin egen
// state i .herenow/, men den mappen är ignorerad och finns bara på en dator. Saknas
// den återskapas den ur registret, så att den andra datorn uppdaterar samma adress
// i stället för att skapa en ny.
//
// API-nyckeln läses av herenow.mjs ur here.now-verktygets inställningar i hemkatalogen. Den skrivs aldrig ut.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!slug) {
  console.error("Användning: node scripts/dela-publicera.mjs <slug> [--dry-run]");
  process.exit(2);
}

const siteDir = path.join(root, ".delning", slug, "site");
const reportPath = path.join(root, ".delning", slug, "export.json");
const registryPath = path.join(root, "publish", "delningar.json");
const stateName = `dela-${slug}`;
const statePath = path.join(root, ".herenow", `${stateName}.json`);

if (!fs.existsSync(path.join(siteDir, "index.html"))) {
  console.error(`Ingen export i ${path.relative(root, siteDir)} — kör: node scripts/dela-export.mjs ${slug}`);
  process.exit(2);
}
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : {};
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, "utf8")) : {};
const known = registry[slug];

// Titeln till here.now-instrumentpanelen: lästextens om den finns, annars deckets.
const titleSource = [path.join(root, "content", "las", `${slug}.md`), path.join(root, "content", `${slug}.mdx`)]
  .find((file) => fs.existsSync(file));
const title = /^title:\s*['"]?(.+?)['"]?\s*$/m.exec(titleSource ? fs.readFileSync(titleSource, "utf8") : "")?.[1] ?? slug;
const displayName = `${title} · delad föreläsning`;

console.log(`[dela-publicera] ${slug}`);
console.log(`  export: ${report.files ?? "?"} filer, ${report.bytes ? (report.bytes / 1048576).toFixed(1) : "?"} MB (${report.exportedAt ?? "okänd tid"})`);
console.log(known ? `  uppdaterar befintlig sajt: ${known.url}` : "  ingen tidigare publicering i registret — en ny sajt skapas");
if (report.failures?.length) console.log(`  OBS: exporten noterade ${report.failures.length} misslyckade anrop — se export.json`);
if (dryRun) process.exit(0);

// Återskapa publicerarens state ur registret om den saknas på den här datorn.
if (known && !fs.existsSync(statePath)) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ slug: known.site, siteUrl: known.url }, null, 2));
  console.log("  state återskapad ur publish/delningar.json");
}

process.env.HERENOW_CLIENT ||= "claude-code/presenter";
const { publish } = await import(pathToFileURL(path.join(root, "publish", "herenow.mjs")).href);
const result = await publish(siteDir, stateName, displayName);

registry[slug] = {
  site: result.slug,
  url: result.siteUrl,
  landing: `${result.siteUrl}${slug}/dela/`,
  read: `${result.siteUrl}${slug}/las/`,
  watch: `${result.siteUrl}${slug}/`,
  access: known?.access ?? "anyone_with_link",
  firstPublishedAt: known?.firstPublishedAt ?? new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  files: report.files ?? null,
  bytes: report.bytes ?? null,
};
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`\n  ✓ publicerad`);
console.log(`  ${registry[slug].landing}`);
