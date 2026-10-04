/**
 * Test för klickstegen per slide (src/lib/step-config.ts).
 *
 * Körs med:  npm run test:klicksteg
 */
import assert from "node:assert/strict";
import { firstStepBeforeCount, formatSkipList, keptSteps, parseSkipList, parseStepConfig, snapStep, toggleSkip } from "../src/lib/step-config.ts";

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed++;
  console.log(`✓ ${name}`);
};

test("utan props är stegen som förut", () => {
  assert.equal(parseStepConfig({ title: "x" }), undefined);
  assert.equal(parseStepConfig(null), undefined);
  assert.deepEqual(keptSteps(4, undefined), [0, 1, 2, 3]);
  assert.deepEqual(keptSteps(0, undefined), []);
});

test("stegAv visar bara slutläget", () => {
  const config = parseStepConfig({ stegAv: true });
  assert.deepEqual(config, { final: true });
  assert.deepEqual(parseStepConfig({ stegAv: "true" }), { final: true });
  assert.deepEqual(keptSteps(5, config), [4]);
  assert.equal(firstStepBeforeCount(config), 0);
});

test("hoppaSteg hoppar över lägen, 1-baserat som editorns Steg x/y", () => {
  const config = parseStepConfig({ hoppaSteg: "3, 2" });
  assert.deepEqual(config, { skip: [2, 3] });
  assert.deepEqual(keptSteps(5, config), [0, 3, 4]);
  assert.deepEqual(keptSteps(5, { skip: [1] }), [1, 2, 3, 4]);
  assert.equal(firstStepBeforeCount({ skip: [1, 2] }), 2);
  assert.deepEqual(keptSteps(3, { skip: [1, 2, 3] }), [2], "hoppas allt över visas slutläget");
  assert.deepEqual(parseSkipList("0, x, 2, 2, 7"), [2, 7]);
  assert.equal(formatSkipList([4, 2, 2]), "2,4");
});

test("närmaste läge som visas", () => {
  const kept = [0, 3, 4];
  assert.equal(snapStep(0, kept), 0);
  assert.equal(snapStep(1, kept), 3);
  assert.equal(snapStep(4, kept), 4);
  assert.equal(snapStep(9, kept), 4);
  assert.equal(snapStep(2, []), 2);
});

test("slå av och på ett läge", () => {
  assert.deepEqual(toggleSkip([2, 4], 3), [2, 3, 4]);
  assert.deepEqual(toggleSkip([2, 3, 4], 3), [2, 4]);
});

console.log(`\n${passed} tester godkända`);
