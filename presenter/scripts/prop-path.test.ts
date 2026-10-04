/**
 * Test för sökvägar in i props (src/lib/prop-path.ts) — och att en redigering
 * av en post i en lista överlever en tur genom MDX-filen.
 *
 * Körs med:  npm run test:sokvag
 */
import assert from "node:assert/strict";
import { parseMdx, serializeMdx } from "../src/lib/mdx-parser.ts";
import { getAtPath, isNestedPropPath, parsePropPath, removeAtPath, setAtPath } from "../src/lib/prop-path.ts";

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed++;
  console.log(`✓ ${name}`);
};

test("läser sökvägar", () => {
  assert.deepEqual(parsePropPath("title"), ["title"]);
  assert.deepEqual(parsePropPath("tiers[0].name"), ["tiers", 0, "name"]);
  assert.deepEqual(parsePropPath("voices.2.quote"), ["voices", 2, "quote"]);
  assert.deepEqual(parsePropPath("levels[1].items[3]"), ["levels", 1, "items", 3]);
  assert.equal(parsePropPath("tiers[x]"), null);
  assert.equal(parsePropPath("[0]"), null);
  assert.equal(parsePropPath("a..b"), null);
  assert.equal(isNestedPropPath("title"), false);
  assert.equal(isNestedPropPath("tiers[0].name"), true);
});

test("sätter en post utan att röra resten", () => {
  const tiers = [{ name: "Grön", attributes: ["a", "b"] }, { name: "Gul" }];
  const next = setAtPath(tiers, [0, "name"], "Blå") as typeof tiers;
  assert.deepEqual(next, [{ name: "Blå", attributes: ["a", "b"] }, { name: "Gul" }]);
  assert.equal(tiers[0].name, "Grön", "originalet är orört");
  assert.deepEqual(setAtPath(tiers, [0, "attributes", 1], "B"), [{ name: "Grön", attributes: ["a", "B"] }, { name: "Gul" }]);
  assert.equal(getAtPath(next, [0, "name"]), "Blå");
});

test("vägrar när listan inte finns eller har fel form", () => {
  assert.equal(setAtPath(undefined, [0, "name"], "x"), undefined);
  assert.equal(setAtPath("[{name:'a'}]", [0, "name"], "x"), undefined);
  assert.equal(setAtPath([{ name: "a" }], [5, "name"], "x"), undefined);
  assert.equal(setAtPath({ a: 1 }, [0], "x"), undefined);
  assert.equal(setAtPath([{ name: "a" }], [0, "missing", "deep"], "x"), undefined);
});

test("tar bort en post", () => {
  assert.deepEqual(removeAtPath(["a", "b", "c"], [1]), ["a", "c"]);
  assert.deepEqual(removeAtPath([{ items: ["x", "y"] }], [0, "items", 0]), [{ items: ["y"] }]);
  assert.deepEqual(removeAtPath({ a: 1, b: 2 }, ["a"]), { b: 2 });
  assert.equal(removeAtPath(["a"], [3]), undefined);
});

test("en redigerad post i en lista-prop överlever MDX", () => {
  const source = [
    "---",
    "title: Test",
    "---",
    "",
    '<AIToolTiers title="Verktyg" tiers={[{ name: "Grön", attributes: ["a", "b"] }, { name: "Gul" }]} />',
    "",
  ].join("\n");
  const parsed = parseMdx(source);
  const slide = parsed.slides[0];
  assert.ok(Array.isArray(slide.props.tiers), "listan läses som en lista");
  const next = setAtPath(slide.props.tiers, [0, "name"], 'Blå med "citat" och å ä ö');
  const again = parseMdx(serializeMdx({ ...parsed, slides: [{ ...slide, props: { ...slide.props, tiers: next as never } }] }));
  const tiers = again.slides[0].props.tiers;
  assert.ok(Array.isArray(tiers), "listan är kvar efter en tur genom filen");
  assert.equal(getAtPath(tiers, [0, "name"]), 'Blå med "citat" och å ä ö');
  assert.deepEqual(getAtPath(tiers, [0, "attributes"]), ["a", "b"]);
  assert.equal((tiers as unknown[]).length, 2);
});

console.log(`\n${passed} tester godkända`);
