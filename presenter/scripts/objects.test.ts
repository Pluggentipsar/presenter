/**
 * Test för objektlagrets geometri (src/lib/objects.ts): procent, snäpp,
 * storleksändring, stapling, beskärning och flerval.
 *
 * Körs med:  npm run test:objekt
 */
import assert from "node:assert/strict";
import type { ParsedComponent } from "../src/lib/mdx-parser.ts";
import {
  alignBoxes,
  boxesInRect,
  cropImageStyle,
  defaultPlacement,
  distributeBoxes,
  effectiveZ,
  extremeZ,
  formatCrop,
  formatPercent,
  frameHeightForCrop,
  nudgeBox,
  objectLabel,
  panCrop,
  parseCrop,
  parsePercent,
  resizeBox,
  rotationFromPointer,
  snapBox,
  snapEdge,
  snapTargets,
  stackingOrder,
  stepZ,
  textSizeForWidth,
  zoomCrop,
  fullImageRect,
  cropFromFrame,
  coverCrop,
  coverFrame,
  panImage,
  zoomImage,
  clampFrameToImage,
  resizeBoxRotated,
  expandGroups,
  newGroupId,
  stepLabel,
  stepRange,
  type ObjectBox,
} from "../src/lib/objects.ts";

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const overlay = (tag: string, props: Record<string, unknown>, content: string | null = null): ParsedComponent =>
  ({ tag, props, content, children: [] }) as ParsedComponent;

const box = (x: number, y: number, w: number, h: number, rotation = 0): ObjectBox => ({ x, y, w, h, rotation });

test("procent tolkas och skrivs som i MDX:en", () => {
  assert.equal(parsePercent("23.4%"), 23.4);
  assert.equal(parsePercent("40"), 40);
  assert.equal(parsePercent(12), 12);
  assert.equal(parsePercent("280px"), null);
  assert.equal(parsePercent(""), null);
  assert.equal(parsePercent(undefined), null);
  assert.equal(formatPercent(23.44), "23.4%");
  assert.equal(formatPercent(40), "40%");
  assert.equal(formatPercent(39.96), "40%");
});

test("etiketter i lagerlistan", () => {
  assert.equal(objectLabel(overlay("FloatingText", { text: "AI **vidgar klyftan**" })), "AI vidgar klyftan");
  assert.equal(objectLabel(overlay("FloatingText", {}, "Text i\nkroppen")), "Text i kroppen");
  assert.equal(objectLabel(overlay("FloatingText", {})), "Tom textruta");
  assert.equal(objectLabel(overlay("FloatingImage", { src: "/bilder/skola/l%C3%A4rare.png" })), "lärare.png");
  assert.equal(objectLabel(overlay("FloatingVideo", { src: "" })), "Video");
  assert.equal(objectLabel(overlay("FloatingShape", { shape: "ellipse" })), "Ellips");
  assert.equal(objectLabel(overlay("FloatingImage", { src: "/x.png", name: "Bussen" })), "Bussen");
  assert.equal(objectLabel(overlay("FloatingChat", {})), "Chat");
});

test("stapling: standardnivåer, ordning och steg", () => {
  const items = [
    overlay("FloatingImage", { layer: "back" }),
    overlay("FloatingText", {}),
    overlay("FloatingImage", { zIndex: 12 }),
    overlay("FloatingText", { zIndex: "10" }),
  ];
  assert.equal(effectiveZ(items[0]), -1);
  assert.equal(effectiveZ(items[1]), 10);
  assert.equal(effectiveZ(items[2]), 12);
  assert.equal(effectiveZ(items[3]), 10);
  assert.deepEqual(stackingOrder(items), [0, 1, 3, 2]);
  // Text 1 ligger under text 3 (lika z, senare i filen vinner): ett steg upp
  // måste hoppa förbi den, inte bara bli 11 och hamna bakom 12.
  assert.equal(stepZ(items, 1, 1), 11);
  assert.equal(stepZ(items, 2, 1), 12);
  assert.equal(stepZ(items, 0, -1), -1);
  assert.equal(stepZ(items, 3, -1), 9);
  assert.equal(extremeZ(items, 1), 13);
  assert.equal(extremeZ(items, -1), -2);
});

test("storleksändring: kanten mitt emot står still", () => {
  const b = box(10, 10, 40, 30);
  assert.deepEqual(resizeBox(b, "e", 5, 0), box(10, 10, 45, 30));
  assert.deepEqual(resizeBox(b, "w", 5, 0), box(15, 10, 35, 30));
  assert.deepEqual(resizeBox(b, "s", 0, 4), box(10, 10, 40, 34));
  assert.deepEqual(resizeBox(b, "n", 0, -4), box(10, 6, 40, 34));
  assert.deepEqual(resizeBox(b, "se", 5, 4), box(10, 10, 45, 34));
  assert.deepEqual(resizeBox(b, "nw", 5, 4), box(15, 14, 35, 26));
  // Minsta storlek
  assert.deepEqual(resizeBox(b, "e", -60, 0), box(10, 10, 2, 30));
});

test("storleksändring med bevarad proportion", () => {
  const b = box(10, 10, 40, 30);
  const se = resizeBox(b, "se", 8, 6, { keepAspect: true });
  assert.equal(Math.round((se.w / se.h) * 100) / 100, Math.round((40 / 30) * 100) / 100);
  assert.ok(se.w > 40 && se.h > 30);
  assert.equal(se.x, 10);
  assert.equal(se.y, 10);
  // Dra bara i sidan: höjden följer, rutan växer symmetriskt i höjdled.
  const e = resizeBox(b, "e", 10, 0, { keepAspect: true });
  assert.equal(e.w, 50);
  assert.equal(e.h, 37.5);
  assert.equal(e.y, 10 - 3.75);
  // Krympa förbi minimum: proportionen hålls.
  const tiny = resizeBox(b, "se", -60, -60, { keepAspect: true, minW: 4 });
  assert.equal(tiny.w, 4);
  assert.equal(tiny.h, 3);
});

test("piltangenter och rotation", () => {
  const b = box(10, 10, 20, 10);
  assert.deepEqual(nudgeBox(b, "ArrowRight", false), box(10.5, 10, 20, 10));
  assert.deepEqual(nudgeBox(b, "ArrowUp", true), box(10, 8, 20, 10));
  assert.equal(nudgeBox(b, "a", false), null);
  assert.deepEqual(nudgeBox(box(-39.8, 0, 20, 10), "ArrowLeft", false), box(-40, 0, 20, 10));
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 0, y: -10 }, false), 0);
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 10, y: 0 }, false), 90);
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 0, y: 10 }, false), 180);
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: -10, y: 0 }, false), -90);
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 10, y: -9 }, true), 45);
});

test("textstorleken behåller bokstäverna när rutan breddas", () => {
  assert.equal(textSizeForWidth(10, 30, 60), 5);
  assert.equal(textSizeForWidth(10, 30, 15), 20);
  assert.equal(textSizeForWidth(10, 0, 15), 10);
  assert.equal(textSizeForWidth(90, 30, 15), 100);
});

test("snäpp mot slidens linjer och andra objekt", () => {
  const targets = snapTargets([box(60, 20, 20, 20)]);
  assert.ok(targets.v.includes(50) && targets.v.includes(60) && targets.v.includes(70) && targets.v.includes(80));
  assert.ok(targets.h.includes(20) && targets.h.includes(30) && targets.h.includes(40));
  // Vänsterkanten 1 % från 50 → snäpper till 50, guide ritas där.
  const near = snapBox(box(49, 10, 20, 10), targets, 1.5, 1.5);
  assert.equal(near.box.x, 50);
  assert.deepEqual(near.guides.v, [50]);
  // Mitt på sliden i höjdled: mitten 45+5 = 50.
  const middle = snapBox(box(10, 44.5, 20, 10), targets, 1.5, 1.5);
  assert.equal(middle.box.y, 45);
  assert.deepEqual(middle.guides.h, [50]);
  // Utanför tröskeln: oförändrad, inga guider.
  const far = snapBox(box(20, 12, 20, 5), targets, 1, 1);
  assert.deepEqual(far.box, box(20, 12, 20, 5));
  assert.deepEqual(far.guides, { v: [], h: [] });
  // Högerkanten mot ett annat objekts vänsterkant.
  // Närmaste linje vinner: högerkanten (60.2 → 60) före mitten (49.7 → 50).
  const edge = snapBox(box(39.2, 10, 21, 10), targets, 1, 1);
  assert.equal(Math.round(edge.box.x * 10) / 10, 39);
  assert.deepEqual(edge.guides.v, [60]);
  assert.deepEqual(snapEdge(49.4, targets.v, 1), { value: 50, guide: 50 });
  assert.deepEqual(snapEdge(45, targets.v, 1), { value: 45, guide: null });
});

test("justera och fördela flera objekt", () => {
  const boxes = [box(10, 10, 10, 10), box(40, 30, 20, 10), box(70, 50, 10, 20)];
  const left = alignBoxes(boxes, "left");
  assert.deepEqual(left.map((b) => b.x), [10, 10, 10]);
  const right = alignBoxes(boxes, "right");
  assert.deepEqual(right.map((b) => b.x), [70, 60, 70]);
  const middle = alignBoxes(boxes, "middle");
  // Gemensam yta 10–70 i höjdled → mitt 40.
  assert.deepEqual(middle.map((b) => b.y), [35, 35, 30]);
  // Ett enda objekt centreras på sliden.
  assert.deepEqual(alignBoxes([box(0, 0, 20, 10)], "center")[0].x, 40);
  const spread = distributeBoxes(boxes, "x");
  // Ytterkanter kvar (10 och 80), mellanrummen lika: (70 − 40)/2 = 15.
  assert.deepEqual(spread.map((b) => b.x), [10, 35, 70]);
  assert.deepEqual(distributeBoxes(boxes.slice(0, 2), "x"), boxes.slice(0, 2));
});

test("markeringsram träffar objekt den överlappar", () => {
  const boxes = [box(10, 10, 10, 10), box(50, 50, 10, 10)];
  assert.deepEqual(boxesInRect(boxes, { x: 5, y: 5, w: 10, h: 10 }), [0]);
  assert.deepEqual(boxesInRect(boxes, { x: 70, y: 70, w: -30, h: -30 }), [1]);
  assert.deepEqual(boxesInRect(boxes, { x: 0, y: 0, w: 100, h: 100 }), [0, 1]);
  assert.deepEqual(boxesInRect(boxes, { x: 30, y: 30, w: 5, h: 5 }), []);
});

test("beskärning: tolkning, ramstil och panorering", () => {
  assert.equal(parseCrop(undefined), null);
  assert.equal(parseCrop("0 0 1 1"), null);
  assert.equal(parseCrop("0.5 0 0.7 1"), null);
  assert.deepEqual(parseCrop("0.1 0.2 0.5 0.6"), { x: 0.1, y: 0.2, w: 0.5, h: 0.6 });
  assert.equal(formatCrop({ x: 0.1, y: 0.2, w: 0.5, h: 0.6 }), "0.1 0.2 0.5 0.6");
  assert.equal(formatCrop({ x: 1 / 3, y: 0, w: 0.5, h: 1 }), "0.333 0 0.5 1");
  const style = cropImageStyle({ x: 0.25, y: 0, w: 0.5, h: 1 });
  assert.deepEqual(style, { left: "-50%", top: "0%", width: "200%", height: "100%" });
  // En 2:1-bild, halva bredden utskuren → utsnittet blir 1:1 → ramen kvadratisk i pixlar.
  assert.equal(Math.round(frameHeightForCrop(20, 2, { x: 0.25, y: 0, w: 0.5, h: 1 }) * 100) / 100, Math.round(((20 * 16) / 9) * 100) / 100);
  assert.equal(Math.round(frameHeightForCrop(20, 16 / 9, null) * 1000) / 1000, 20);
  const panned = panCrop({ x: 0.25, y: 0, w: 0.5, h: 1 }, 0.2, 0.5);
  assert.deepEqual(panned, { x: 0.15, y: 0, w: 0.5, h: 1 });
  assert.deepEqual(panCrop({ x: 0.25, y: 0, w: 0.5, h: 1 }, -2, 0), { x: 0.5, y: 0, w: 0.5, h: 1 });
  const zoomed = zoomCrop({ x: 0, y: 0, w: 1, h: 1 }, 2);
  assert.deepEqual(zoomed, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  assert.deepEqual(zoomCrop(zoomed, 0.5), { x: 0, y: 0, w: 1, h: 1 });
});

test("nya objekt hamnar mitt på sliden och inte ovanpå varandra", () => {
  assert.deepEqual(defaultPlacement("image", []), { x: 35, y: 30, w: 30 });
  assert.deepEqual(defaultPlacement("text", []), { x: 33, y: 42, w: 34 });
  assert.deepEqual(defaultPlacement("image", [box(35, 30, 30, 20)]), { x: 38, y: 33, w: 30 });
});

test("beskärning på duken: ram, bild och utsnitt hänger ihop", () => {
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const frame = { x: 20, y: 20, w: 30, h: 20 };
  const crop = { x: 0.25, y: 0, w: 0.5, h: 1 };
  const image = fullImageRect(frame, crop);
  assert.deepEqual(image, { x: 5, y: 20, w: 60, h: 20 });
  const back = cropFromFrame(frame, image);
  assert.deepEqual({ x: r3(back.x), y: r3(back.y), w: r3(back.w), h: r3(back.h) }, crop);
  // Cover-utsnittet: en 2:1-bild i en kvadratisk ram (30 % × 53,3 % är kvadrat i pixlar) visar halva bredden.
  const square = coverCrop(30, (30 * 16) / 9, 2);
  assert.deepEqual({ x: r3(square.x), y: r3(square.y), w: r3(square.w), h: r3(square.h) }, { x: 0.25, y: 0, w: 0.5, h: 1 });
  // En bred ram runt en stående bild klipper i höjdled.
  const wide = coverCrop(40, 10, 1);
  assert.equal(wide.w, 1);
  assert.ok(wide.h < 1 && wide.y > 0);
  assert.deepEqual(coverCrop(0, 10, 1), { x: 0, y: 0, w: 1, h: 1 });
  // Panorering stannar när ramen annars skulle visa kanten.
  assert.deepEqual(panImage(frame, image, 5, 0), { x: 10, y: 20, w: 60, h: 20 });
  assert.deepEqual(panImage(frame, image, 50, 0), { x: 20, y: 20, w: 60, h: 20 });
  assert.deepEqual(panImage(frame, image, -50, 3), { x: -10, y: 20, w: 60, h: 20 });
  // Zoom runt ramens mitt; utzoomning stoppas när bilden skulle bli mindre än ramen.
  const zoomed = zoomImage(frame, image, 2);
  // Ramens mitt är (35, 30): x = 35 − (35 − 5)·2 = −25, y = 30 − (30 − 20)·2 = 10.
  assert.deepEqual(zoomed, { x: -25, y: 10, w: 120, h: 40 });
  const shrunk = zoomImage(frame, image, 0.1);
  assert.equal(shrunk.w, 60);
  assert.equal(shrunk.h, 20);
  // Ramen får inte lämna bilden.
  assert.deepEqual(clampFrameToImage({ x: 0, y: 15, w: 30, h: 40 }, image), { x: 5, y: 20, w: 30, h: 20 });
  assert.deepEqual(coverFrame({ x: 30, y: 30, w: 60, h: 20 }, frame), { x: 20, y: 20, w: 60, h: 20 });
});

test("storleksändring av en roterad ruta: motstående kant står still på skärmen", () => {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const aspect = 16 / 9;
  const b = box(40, 40, 20, 10, 90);
  // Rutan står på högkant: handtaget e pekar nedåt på skärmen och dras 5 nedåt.
  const r = resizeBoxRotated(b, "e", 0, 5);
  assert.equal(r2(r.w), r2(20 + 5 / aspect));
  assert.equal(r.h, 10);
  assert.equal(r2(r.y), 42.5);
  assert.equal(r2(r.x), r2(50 - (20 + 5 / aspect) / 2));
  // Överkanten på skärmen (rutans lokala w-kant) ligger kvar.
  const topBefore = 45 - (20 * aspect) / 2;
  const topAfter = r.y + r.h / 2 - (r.w * aspect) / 2;
  assert.equal(r2(topBefore), r2(topAfter));
  // Utan rotation: samma som resizeBox.
  assert.deepEqual(resizeBoxRotated(box(10, 10, 40, 30), "se", 5, 4), resizeBox(box(10, 10, 40, 30), "se", 5, 4));
});

test("grupper: markeringen tar hela gruppen, nya namn är lediga", () => {
  const items = [
    overlay("FloatingImage", { group: "g1" }),
    overlay("FloatingText", {}),
    overlay("FloatingShape", { group: "g1" }),
    overlay("FloatingShape", { group: "g3" }),
  ];
  assert.deepEqual(expandGroups(items, [0]), [0, 2]);
  assert.deepEqual(expandGroups(items, [1]), [1]);
  assert.deepEqual(expandGroups(items, [2, 1]), [2, 1, 0]);
  assert.deepEqual(expandGroups(items, []), []);
  assert.equal(newGroupId(items), "g2");
  assert.equal(newGroupId([]), "g1");
});

test("klicksteg: intervall och etikett", () => {
  assert.deepEqual(stepRange(undefined, undefined), { from: 0, to: null });
  assert.deepEqual(stepRange(2, undefined), { from: 2, to: null });
  assert.deepEqual(stepRange("2", "4"), { from: 2, to: 4 });
  assert.deepEqual(stepRange(3, 2), { from: 3, to: null });
  assert.deepEqual(stepRange(-1, ""), { from: 0, to: null });
  assert.equal(stepLabel({}), null);
  assert.equal(stepLabel({ step: 2 }), "efter klick 2");
  assert.equal(stepLabel({ until: 3 }), "till klick 3");
  assert.equal(stepLabel({ step: 1, until: 3 }), "klick 1–3");
});

console.log(`\n${passed} tester godkända`);
