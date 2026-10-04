/**
 * Test för översiktens aktlogik (src/lib/oversikt-acts.ts).
 *
 * Körs med:  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/oversikt-acts.test.ts
 */
import assert from "node:assert/strict";
import {
  deriveActs,
  handOverActBeforeDelete,
  relocateSlide,
  setActTitle,
  stepSlide,
  type Act,
  type RelocateResult,
} from "../src/lib/oversikt-acts.ts";

type Slide = {
  tag: string;
  props: Record<string, string>;
  content: string | null;
  children: never[];
  leadingRaw?: string;
};
type Deck = { frontmatter: Record<string, unknown>; slides: Slide[] };

const mk = (id: string, extra: Partial<Slide> & { akt?: string } = {}): Slide => {
  const { akt, ...rest } = extra;
  return {
    tag: "Text",
    props: { slideId: id, ...(akt ? { akt } : {}) },
    content: null,
    children: [],
    ...rest,
  };
};
const deck = (slides: Slide[]): Deck => ({ frontmatter: {}, slides });
const ids = (d: Deck) => d.slides.map((s) => s.props.slideId);
const acts = (d: Deck, suggested: { slideId: string; title: string }[] = []): Act[] =>
  deriveActs(d.slides as never, { slideIds: ids(d), headings: ids(d), suggested }).acts;
/** Tillämpar resultatet som vyn gör: gränserna först, sedan ordningen. */
const apply = (result: RelocateResult): Deck => {
  assert.ok(result.ok, `flytten nekades: ${result.ok ? "" : result.reason}`);
  const parsed = result.parsed as unknown as Deck;
  return { ...parsed, slides: result.order.map((i) => parsed.slides[i]) };
};
const shape = (d: Deck, suggested: { slideId: string; title: string }[] = []) => {
  const list = acts(d, suggested);
  return list
    .map((act, i) => `${act.title}[${ids(d).slice(act.start, list[i + 1]?.start ?? d.slides.length).join(",")}]`)
    .join(" ");
};

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const SUGGESTED = [
  { slideId: "a", title: "Ett" },
  { slideId: "c", title: "Två" },
  { slideId: "e", title: "Tre" },
];
const plain = () => deck(["a", "b", "c", "d", "e", "f"].map((id) => mk(id)));
const marked = () =>
  deck([mk("a", { akt: "Ett" }), mk("b"), mk("c", { akt: "Två" }), mk("d"), mk("e", { akt: "Tre" }), mk("f")]);

test("lästextens kapitel blir föreslagna akter", () => {
  const d = plain();
  const result = deriveActs(d.slides as never, { slideIds: ids(d), headings: ids(d), suggested: SUGGESTED });
  assert.equal(result.suggestedOnly, true);
  assert.equal(shape(d, SUGGESTED), "Ett[a,b] Två[c,d] Tre[e,f]");
});

test("att döpa om en föreslagen akt skriver in ALLA förslag i decket", () => {
  const d = plain();
  const next = setActTitle(d as never, acts(d, SUGGESTED), 2, "Mitten") as unknown as Deck;
  assert.equal(shape(next), "Ett[a,b] Mitten[c,d] Tre[e,f]");
  assert.deepEqual(
    next.slides.map((s) => s.props.akt ?? ""),
    ["Ett", "", "Mitten", "", "Tre", ""],
  );
});

test("tomt namn tar bort gränsen — akten går ihop med den föregående", () => {
  const d = marked();
  const next = setActTitle(d as never, acts(d), 2, "") as unknown as Deck;
  assert.equal(shape(next), "Ett[a,b,c,d] Tre[e,f]");
});

test("ett steg ner inom akten byter bara plats", () => {
  const d = deck([mk("a", { akt: "Ett" }), mk("b"), mk("c"), mk("d", { akt: "Två" })]);
  const next = apply(stepSlide(d as never, acts(d), 1, 1));
  assert.equal(shape(next), "Ett[a,c,b] Två[d]");
});

test("aktens sista slide går ner → blir nästa akts första, utan att byta plats", () => {
  const d = marked();
  const result = stepSlide(d as never, acts(d), 1, 1);
  const next = apply(result);
  assert.equal(shape(next), "Ett[a] Två[b,c,d] Tre[e,f]");
  assert.equal(result.ok && result.newIndex, 1);
});

test("aktens första slide går upp → blir föregående akts sista, gränsen stannar", () => {
  const d = marked();
  const result = stepSlide(d as never, acts(d), 2, -1);
  const next = apply(result);
  assert.equal(shape(next), "Ett[a,b,c] Två[d] Tre[e,f]");
  assert.equal(result.ok && result.newIndex, 2);
});

test("aktens andra slide går upp → blir aktens första och tar över gränsen", () => {
  const d = marked();
  const next = apply(stepSlide(d as never, acts(d), 3, -1));
  assert.equal(shape(next), "Ett[a,b] Två[d,c] Tre[e,f]");
  assert.equal(next.slides[2].props.akt, "Två");
  assert.equal(next.slides[3].props.akt, undefined);
});

test("aktens första slide går ner inom akten → gränsen stannar överst", () => {
  const d = deck([mk("a", { akt: "Ett" }), mk("b"), mk("c"), mk("d", { akt: "Två" })]);
  const next = apply(stepSlide(d as never, acts(d), 0, 1));
  assert.equal(shape(next), "Ett[b,a,c] Två[d]");
});

test("ensam slide i markerad akt går ner → akten upphör, sliden går in i nästa", () => {
  const d = deck([mk("a", { akt: "Ett" }), mk("b", { akt: "Solo" }), mk("c", { akt: "Två" }), mk("d")]);
  const next = apply(stepSlide(d as never, acts(d), 1, 1));
  assert.equal(shape(next), "Ett[a] Två[b,c,d]");
});

test("ensam slide i markerad akt går upp → akten upphör, sliden blir föregående akts sista", () => {
  const d = deck([mk("a", { akt: "Ett" }), mk("b", { akt: "Solo" }), mk("c", { akt: "Två" })]);
  const next = apply(stepSlide(d as never, acts(d), 1, -1));
  assert.equal(shape(next), "Ett[a,b] Två[c]");
});

const AKT2 = "{/* ═══ AKT 2 · MITTEN (~10 min) ═══ */}";
const MEDIA = "{/* MEDIA-BEHOV: bild på bussen */}";

test("aktkommentaren stannar hos akten, slidens egna kommentarer följer med sliden", () => {
  const d = deck([mk("a"), mk("b", { leadingRaw: `${AKT2}\n\n${MEDIA}` }), mk("c"), mk("d")]);
  assert.equal(shape(d), "Inledning[a] Akt 2 · mitten[b,c,d]");
  const next = apply(stepSlide(d as never, acts(d), 1, 1));
  assert.equal(shape(next), "Inledning[a] Akt 2 · mitten[c,b,d]");
  assert.equal(next.slides[1].leadingRaw, AKT2);
  assert.equal(next.slides[2].leadingRaw, MEDIA);
});

test("ensam slide i kommentarsakt flyttas inte — kommentaren får inte raderas", () => {
  const d = deck([mk("a"), mk("b", { leadingRaw: AKT2 }), mk("c", { akt: "Tre" })]);
  const down = stepSlide(d as never, acts(d), 1, 1);
  assert.deepEqual(down, { ok: false, reason: "ensam i kommentarsakt" });
  const up = stepSlide(d as never, acts(d), 1, -1);
  assert.deepEqual(up, { ok: false, reason: "ensam i kommentarsakt" });
});

test("avdelare är egna rader: sliden hoppar över dem", () => {
  const d = deck([mk("a"), mk("b"), mk("div", { tag: "SectionDivider" }), mk("c")]);
  const down = apply(stepSlide(d as never, acts(d), 1, 1));
  assert.deepEqual(ids(down), ["a", "div", "b", "c"]);
  const up = apply(stepSlide(d as never, acts(d), 3, -1));
  assert.deepEqual(ids(up), ["a", "b", "c", "div"]);
});

test("dra en slide till övre halvan av en akts första rad → blir aktens första", () => {
  const d = marked();
  const next = apply(relocateSlide(d as never, acts(d), 1, 4, true));
  assert.equal(shape(next), "Ett[a] Två[c,d] Tre[b,e,f]");
});

test("dra en slide till nedre halvan av en akts sista rad → blir aktens sista", () => {
  const d = marked();
  const next = apply(relocateSlide(d as never, acts(d), 5, 2, false));
  assert.equal(shape(next), "Ett[a,b,f] Två[c,d] Tre[e]");
});

test("dra aktens första slide till en annan akt → gränsen stannar kvar", () => {
  const d = marked();
  const next = apply(relocateSlide(d as never, acts(d), 2, 6, false));
  assert.equal(shape(next), "Ett[a,b] Två[d] Tre[e,f,c]");
});

test("dra i ett deck med föreslagna akter skriver in förslagen först", () => {
  const d = plain();
  const next = apply(relocateSlide(d as never, acts(d, SUGGESTED), 1, 4, true));
  assert.equal(shape(next), "Ett[a] Två[c,d] Tre[b,e,f]");
});

test("släpp på samma plats gör ingenting", () => {
  const d = marked();
  assert.deepEqual(relocateSlide(d as never, acts(d), 3, 3, true), { ok: false, reason: "samma plats" });
  assert.deepEqual(relocateSlide(d as never, acts(d), 3, 4, false), { ok: false, reason: "samma plats" });
});

test("dolda rader hoppas över när de inte visas", () => {
  const d = deck([mk("a", { akt: "Ett" }), mk("b"), mk("h"), mk("c")]);
  const next = apply(stepSlide(d as never, acts(d), 1, 1, (i) => i === 2));
  assert.deepEqual(ids(next), ["a", "h", "c", "b"]);
});

test("ta bort aktens första slide → markeringen går vidare till nästa", () => {
  const d = marked();
  const next = handOverActBeforeDelete(d as never, acts(d), 2) as unknown as Deck;
  assert.equal(next.slides[3].props.akt, "Två");
  const solo = deck([mk("a", { akt: "Ett" }), mk("b", { akt: "Solo" }), mk("c", { akt: "Två" })]);
  const kept = handOverActBeforeDelete(solo as never, acts(solo), 1) as unknown as Deck;
  assert.equal(kept.slides[2].props.akt, "Två");
});

console.log(`\n${passed} test gick igenom.`);
