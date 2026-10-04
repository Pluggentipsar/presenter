#!/usr/bin/env node
// Bygger installationsfilen för Presenter (Windows, NSIS) med electron-builder.
//
//   node scripts/bygg-app.mjs                 → dist-app/bygge/Presenter-Setup-<version>.exe
//   node scripts/bygg-app.mjs --version 2026.9.23
//   node scripts/bygg-app.mjs --dir           → bara dist-app/bygge/win-unpacked/ (snabbt; för --smoke)
//
// Skalet (electron/) paketeras i app.asar; paketen Next behöver (presenter/
// node_modules utom electron) läggs som resurser i installationen och kopieras
// in i föreläsningsmappen vid första start (electron/server.mjs). Bygget sker
// i en egen liten projektmapp (dist-app/skal) så att electron-builder aldrig
// behöver gå igenom content/, public/ eller .next/. electron-builder hämtas
// med npx — den är inte ett beroende i package.json, eftersom den bara behövs
// när installationsfilen byggs.
//
// Versionsnumret är datumet om inget anges (2026.9.23). Ikonen är
// electron/icon.png (512×512, electron-builder gör .ico av den).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const presenter = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const today = new Date();
const version = option("version") ?? `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Versionen måste vara tre tal med punkter (t.ex. 2026.9.23), inte "${version}".`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(presenter, "package.json"), "utf8"));
const electronVersion = pkg.devDependencies?.electron;
if (!/^\d+\.\d+\.\d+$/.test(electronVersion ?? "")) {
  console.error(`devDependencies.electron måste vara en exakt version (är "${electronVersion}").`);
  process.exit(1);
}
if (!fs.existsSync(path.join(presenter, "node_modules", "next", "dist", "bin", "next"))) {
  console.error("presenter/node_modules saknas — kör npm install först.");
  process.exit(1);
}
// Verktygen som gör appen fristående (ffmpeg, Avskrifts verktyg). Saknas de hämtas de nu.
if (!fs.existsSync(path.join(presenter, ".verktyg", "verktyg.json"))) {
  const fetched = spawnSync(process.execPath, [path.join(presenter, "scripts", "hamta-verktyg.mjs")], { stdio: "inherit" });
  if (fetched.status !== 0) {
    console.error("Kunde inte hämta verktygen (node scripts/hamta-verktyg.mjs).");
    process.exit(1);
  }
}

// Electron tas från node_modules/electron/dist (samma binär som `npm run app`
// kör) i stället för att electron-builder hämtar och packar upp en zip. Det
// sparar en nedladdning — och undviker att uppackningens byte av mappnamn
// stoppas av virusskyddet, som gärna håller i nyss uppackade exe-filer.
const electronDist = path.join(presenter, "node_modules", "electron", "dist");
// Electron 44 hämtar binären först när den behövs, inte vid npm install (4 oktober
// 2026: en ny npm ci saknade dist/). Paketets install.js tar den ur cachen om den finns där.
if (!fs.existsSync(path.join(electronDist, "electron.exe"))) {
  spawnSync(process.execPath, [path.join(presenter, "node_modules", "electron", "install.js")], { stdio: "inherit" });
}
if (!fs.existsSync(path.join(electronDist, "electron.exe"))) {
  console.error(`${electronDist} saknar electron.exe — kör npm install och sedan npx install-electron.`);
  process.exit(1);
}
// Chromium skriver debug.log bredvid electron.exe när skalet körts därifrån
// (npm run app); den ska inte följa med in i installationen.
fs.rmSync(path.join(electronDist, "debug.log"), { force: true });

const dist = path.join(presenter, "dist-app");
const stage = path.join(dist, "skal");
const out = path.join(dist, "bygge");
fs.rmSync(stage, { recursive: true, force: true });
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(path.join(presenter, "electron"), path.join(stage, "electron"), { recursive: true });
// Appens identitet (namn, id, beskrivning, upphov) står i electron/identitet.json.
const identitet = JSON.parse(fs.readFileSync(path.join(presenter, "electron", "identitet.json"), "utf8"));
const relative = (target) => path.relative(stage, target).split(path.sep).join("/");

const stagePackage = {
  name: "presenter",
  productName: identitet.namn,
  version,
  description: identitet.beskrivning,
  author: identitet.upphov,
  private: true,
  main: "electron/main.mjs",
  devDependencies: { electron: electronVersion },
  build: {
    appId: identitet.id,
    productName: identitet.namn,
    copyright: identitet.upphov,
    directories: { output: relative(out), buildResources: "resurser" },
    electronDist: relative(electronDist),
    files: ["electron/**/*", "package.json"],
    extraResources: [
      {
        from: relative(path.join(presenter, "node_modules")),
        to: "node_modules",
        filter: ["**/*", "!electron/**", "!.bin/**", "!.cache/**"],
      },
      { from: relative(path.join(presenter, "package-lock.json")), to: "package-lock.json" },
      // Verktygen som gör appen fristående: ffmpeg och Avskrifts verktyg (scripts/hamta-verktyg.mjs).
      { from: relative(path.join(presenter, ".verktyg")), to: "verktyg" },
    ],
    asar: true,
    npmRebuild: false,
    nodeGypRebuild: false,
    win: {
      target: [{ target: args.includes("--dir") ? "dir" : "nsis", arch: ["x64"] }],
      icon: "electron/icon.png",
    },
    nsis: {
      oneClick: true,
      perMachine: false,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: "Presenter",
      artifactName: "Presenter-Setup-${version}.${ext}",
      differentialPackage: false,
      deleteAppDataOnUninstall: false,
    },
  },
};
fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify(stagePackage, null, 2));

console.log(`Bygger Presenter ${version} (Electron ${electronVersion}) i ${stage} → ${out}`);
// npx är ett .cmd-skript på Windows och körs genom skalet; ett färdigt
// kommando (inte argumentlista + shell) så att Node inte varnar.
const result = spawnSync(`npx --yes electron-builder@26.15.3 --win --projectDir "${stage}"`, { cwd: stage, stdio: "inherit", shell: true });
if (result.status !== 0) {
  console.error(`electron-builder avslutades med kod ${result.status ?? result.signal}.`);
  process.exit(result.status ?? 1);
}

const installer = path.join(out, `Presenter-Setup-${version}.exe`);
const unpacked = path.join(out, "win-unpacked", "Presenter.exe");
for (const file of [installer, unpacked]) {
  if (fs.existsSync(file)) console.log(`${file}  (${(fs.statSync(file).size / 1024 / 1024).toFixed(0)} MB)`);
}
