/**
 * Test för bibliotekets datamodell (src/lib/library.ts).
 *
 * Körs med:  npm run test:bibliotek
 */
import assert from "node:assert/strict";
import {
  EMPTY_LIBRARY,
  applyLibraryOp,
  currentVersion,
  familyIdFor,
  familyMembers,
  folderPath,
  folderTree,
  folderWithDescendants,
  looksLikeNoise,
  normalizeLibrary,
  serializeLibrary,
  suggestFamilies,
  type Library,
  type LibraryOp,
} from "../src/lib/library.ts";

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
};
const run = (library: Library, ...ops: LibraryOp[]) => ops.reduce(applyLibraryOp, library);

const base = () =>
  run(
    EMPTY_LIBRARY,
    { type: "createFolder", id: "m_host2026", name: "Hösten 2026", parent: null },
    { type: "createFolder", id: "m_solby", name: "Solby", parent: "m_host2026" },
    { type: "createFolder", id: "m_varen2026", name: "Våren 2026", parent: null },
    { type: "moveDecks", slugs: ["modersmal-solby", "solby-konferens"], folder: "m_solby" },
    { type: "moveDecks", slugs: ["lararkurs"], folder: "m_host2026" },
  );

test("mappar i två nivåer, deck i mappar", () => {
  const library = base();
  const tree = folderTree(library);
  assert.deepEqual(tree.map((f) => f.name), ["Hösten 2026", "Våren 2026"]);
  assert.deepEqual(tree[0].children.map((f) => f.name), ["Solby"]);
  assert.equal(library.decks["solby-konferens"].folder, "m_solby");
  assert.deepEqual([...folderWithDescendants(library, "m_host2026")].sort(), ["m_host2026", "m_solby"]);
  assert.deepEqual(folderPath(library, "m_solby").map((f) => f.name), ["Hösten 2026", "Solby"]);
});

test("en undermapp kan inte få egna undermappar", () => {
  const library = run(base(), { type: "createFolder", id: "m_djupare1", name: "Djupare", parent: "m_solby" });
  assert.equal(library.folders.find((f) => f.id === "m_djupare1")?.parent, null);
});

test("ta bort en mapp: decken flyttar upp ett steg, inget försvinner", () => {
  const library = run(base(), { type: "deleteFolder", id: "m_solby" });
  assert.equal(library.decks["solby-konferens"].folder, "m_host2026");
  const top = run(library, { type: "deleteFolder", id: "m_host2026" });
  assert.equal(top.decks["solby-konferens"], undefined);
  assert.equal(top.decks["lararkurs"], undefined);
});

test("ta bort en mapp med undermappar: undermapparna hamnar överst", () => {
  const library = run(base(), { type: "deleteFolder", id: "m_host2026" });
  assert.equal(library.folders.find((f) => f.id === "m_solby")?.parent, null);
  assert.equal(library.decks["modersmal-solby"].folder, "m_solby");
  assert.equal(library.decks["lararkurs"], undefined);
});

test("flytta till osorterat tar bort posten helt", () => {
  const library = run(base(), { type: "moveDecks", slugs: ["lararkurs"], folder: null });
  assert.equal("lararkurs" in library.decks, false);
});

test("flytta till en mapp som inte finns → osorterat", () => {
  const library = run(base(), { type: "moveDecks", slugs: ["lararkurs"], folder: "m_finnsinte" });
  assert.equal("lararkurs" in library.decks, false);
});

test("fäst och arkivera — arkivering lossar nålen", () => {
  let library = run(base(), { type: "setPinned", slugs: ["lararkurs", "norrby"], pinned: true });
  assert.equal(library.decks.norrby.pinned, true);
  library = run(library, { type: "setArchived", slugs: ["norrby"], archived: true });
  assert.deepEqual(library.decks.norrby, { archived: true });
  library = run(library, { type: "setArchived", slugs: ["norrby"], archived: false });
  assert.equal("norrby" in library.decks, false);
  assert.deepEqual(library.decks["lararkurs"], { folder: "m_host2026", pinned: true });
});

test("mappar byter plats bara med syskon", () => {
  const library = run(base(), { type: "moveFolder", id: "m_varen2026", direction: -1 });
  assert.deepEqual(folderTree(library).map((f) => f.name), ["Våren 2026", "Hösten 2026"]);
  assert.deepEqual(folderTree(library)[1].children.map((f) => f.name), ["Solby"]);
  const same = run(library, { type: "moveFolder", id: "m_varen2026", direction: -1 });
  assert.equal(same, library);
});

test("döp om, med städat namn", () => {
  const library = run(base(), { type: "renameFolder", id: "m_varen2026", name: "  Våren   2026 · klart " });
  assert.equal(library.folders.find((f) => f.id === "m_varen2026")?.name, "Våren 2026 · klart");
  assert.equal(run(library, { type: "renameFolder", id: "m_varen2026", name: "   " }), library);
});

test("filen går runt: serialisera → läs in ger samma bibliotek", () => {
  const library = run(base(), { type: "setPinned", slugs: ["lararkurs"], pinned: true });
  assert.deepEqual(normalizeLibrary(JSON.parse(serializeLibrary(library))), library);
});

test("skräp i filen tål vi: okända mappar, trasiga poster, cirklar", () => {
  const library = normalizeLibrary({
    folders: [
      { id: "m_aaaa1111", name: "A", parent: "m_aaaa1111" },
      { id: "m_bbbb2222", name: "B", parent: "m_saknas00" },
      { id: "fel id", name: "C" },
      { id: "m_cccc3333", name: "" },
      "skräp",
    ],
    decks: { norrby: { folder: "m_saknas00", pinned: true }, "../etc": { pinned: true }, tom: {}, vastby: "x" },
  });
  assert.deepEqual(library.folders, [
    { id: "m_aaaa1111", name: "A", parent: null },
    { id: "m_bbbb2222", name: "B", parent: null },
  ]);
  assert.deepEqual(library.decks, { norrby: { pinned: true } });
  assert.deepEqual(normalizeLibrary(null), EMPTY_LIBRARY);
});

test("förslag till arkivet: prov, demo och kopior — inte riktiga föreläsningar", () => {
  const noise = ["demo", "demo-retro", "mockup-arkadnatt", "testar", "zzz-demo-daylight-bg", "elever-formprov",
    "modersmal-solby-sprak-tankande-ai-designprov", "solby-konferens_fargprov", "nattglas-showcase",
    "vastby_codex-kopia", "norrby_codex2", "demo-kopia"];
  const real = ["norrby", "vastby", "lararkurs", "modersmal-solby-sprak-tankande-ai", "solby-konferens",
    "vem-skrev-din-kurs", "skogsby-fm1-v2", "kommunal-utveckling-v2", "demokrati-och-ai"];
  assert.deepEqual(noise.filter((slug) => !looksLikeNoise(slug)), []);
  assert.deepEqual(real.filter((slug) => looksLikeNoise(slug)), []);
});

// ── Versioner av samma föreläsning ─────────────────────────────────────────

const NORR = ["norrby-gymnasiet", "norrby-gymnasiet-v2", "norrby-gymnasiet-v3"];
const family = () => run(base(), { type: "groupVersions", slugs: NORR, family: "norrby-gymnasiet", current: "norrby-gymnasiet-v2" });

test("samla versioner: en familj, exakt en stjärna", () => {
  const library = family();
  assert.deepEqual(familyMembers(library, "norrby-gymnasiet"), NORR);
  assert.deepEqual(NORR.filter((slug) => library.decks[slug].current), ["norrby-gymnasiet-v2"]);
  assert.equal(currentVersion(library, "norrby-gymnasiet"), "norrby-gymnasiet-v2");
  assert.equal(currentVersion(library, "norrby-gymnasiet-v3"), "norrby-gymnasiet-v2");
  assert.equal(currentVersion(library, "lararkurs"), "lararkurs");
});

test("flytta stjärnan", () => {
  const library = run(family(), { type: "setCurrent", slug: "norrby-gymnasiet-v3" });
  assert.deepEqual(NORR.filter((slug) => library.decks[slug].current), ["norrby-gymnasiet-v3"]);
  assert.equal(run(library, { type: "setCurrent", slug: "lararkurs" }), library);
});

test("utan angiven stjärna får den sista i bokstavsordning den (v3 efter v2)", () => {
  const library = run(base(), { type: "groupVersions", slugs: NORR, family: "norrby-gymnasiet", current: "finns-inte" });
  assert.equal(currentVersion(library, "norrby-gymnasiet"), "norrby-gymnasiet-v3");
});

test("ta ur den gällande versionen: stjärnan går vidare, familjen består", () => {
  const library = run(family(), { type: "ungroupVersions", slugs: ["norrby-gymnasiet-v2"], fallback: "norrby-gymnasiet" });
  assert.equal(library.decks["norrby-gymnasiet-v2"], undefined);
  assert.equal(currentVersion(library, "norrby-gymnasiet-v3"), "norrby-gymnasiet");
});

test("en ensam version är ingen familj", () => {
  const library = run(family(), { type: "ungroupVersions", slugs: ["norrby-gymnasiet", "norrby-gymnasiet-v3"] });
  assert.deepEqual(NORR.map((slug) => library.decks[slug]), [undefined, undefined, undefined]);
});

test("lägga till en version i en befintlig familj behåller familjen och stjärnan", () => {
  const library = run(family(), { type: "groupVersions", slugs: ["norrby-gymnasiet-v3", "norrby-gymnasiet-v4"], family: "nytt-namn", current: "" });
  assert.equal(library.decks["norrby-gymnasiet-v4"].family, "norrby-gymnasiet");
  assert.equal(currentVersion(library, "norrby-gymnasiet-v4"), "norrby-gymnasiet-v2");
});

test("versioner rör inte mapp, nål eller arkiv — och tvärtom", () => {
  let library = run(family(), { type: "moveDecks", slugs: ["norrby-gymnasiet-v2"], folder: "m_host2026" });
  library = run(library, { type: "setArchived", slugs: ["norrby-gymnasiet"], archived: true });
  assert.deepEqual(library.decks["norrby-gymnasiet-v2"], { family: "norrby-gymnasiet", current: true, folder: "m_host2026" });
  assert.deepEqual(library.decks["norrby-gymnasiet"], { family: "norrby-gymnasiet", archived: true });
  library = run(library, { type: "moveDecks", slugs: ["norrby-gymnasiet-v2"], folder: null });
  assert.deepEqual(library.decks["norrby-gymnasiet-v2"], { family: "norrby-gymnasiet", current: true });
});

test("versioner överlever filen, och trasiga familjer lagas vid inläsning", () => {
  const library = family();
  assert.deepEqual(normalizeLibrary(JSON.parse(serializeLibrary(library))), library);
  const repaired = normalizeLibrary({
    decks: {
      a: { family: "f", current: true }, b: { family: "f", current: true }, c: { family: "f" },
      ensam: { family: "g", current: true }, stjarna: { current: true, pinned: true },
    },
  });
  assert.deepEqual(["a", "b", "c"].filter((slug) => repaired.decks[slug].current), ["b"]);
  assert.equal(repaired.decks.ensam, undefined);
  assert.deepEqual(repaired.decks.stjarna, { pinned: true });
});

test("förslag på versioner ur namnen — men olika pass är inte versioner", () => {
  const slugs = ["norrby-gymnasiet", "norrby-gymnasiet-v2", "norrby-gymnasiet-v3", "eleverna-om-ai", "eleverna-om-ai2",
    "vastby", "vastby_codex", "vastby_codex-kopia", "skogsby-fm1", "skogsby-fm2", "skogsby-em1", "skogsby-em1-v2",
    "kommunal-utveckling", "kommunal-utveckling-v2", "lararkurs", "norrby"];
  assert.deepEqual(suggestFamilies(slugs), [
    { family: "eleverna-om-ai", slugs: ["eleverna-om-ai", "eleverna-om-ai2"] },
    { family: "kommunal-utveckling", slugs: ["kommunal-utveckling", "kommunal-utveckling-v2"] },
    { family: "norrby-gymnasiet", slugs: NORR },
    { family: "skogsby-em1", slugs: ["skogsby-em1", "skogsby-em1-v2"] },
    { family: "vastby", slugs: ["vastby", "vastby_codex", "vastby_codex-kopia"] },
  ]);
});

test("familjenamn: det adresserna har gemensamt", () => {
  assert.equal(familyIdFor(NORR, new Set()), "norrby-gymnasiet");
  assert.equal(familyIdFor(["modersmal-solby", "modersmal-solby-kodex"], new Set()), "modersmal-solby");
  assert.equal(familyIdFor(NORR, new Set(["norrby-gymnasiet"])), "norrby-gymnasiet-2");
  assert.equal(familyIdFor(["abc", "xyz"], new Set()), "abc");
});

console.log(`\n${passed} test gick igenom.`);
