/**
 * Test för "byt mall" (src/lib/convert-slide.ts), mot den riktiga parsern:
 * sliden byter form, skrivs till MDX, läses in igen — och tanken är kvar.
 *
 * Körs med:  npm run test:bytmall
 */
import assert from "node:assert/strict";
import { convertSlide, isListShaped, mainTextOf, mainTextSlot, plannedTemplate } from "../src/lib/convert-slide.ts";
import { parseMdx, serializeMdx, type ParsedComponent } from "../src/lib/mdx-parser.ts";

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const deck = (body: string) => parseMdx(`---\ntitle: "Test"\ntheme: default\n---\n\n${body}\n`);
const first = (body: string): ParsedComponent => deck(body).slides[0];

const DRAFT = `<Utkast
  slideId="sl_utkast01"
  syfte="Visa att spannet glider från vardag till relation"
  mall="HookStatement"
  tid="2 min"
  akt="Relationen"
  claude="Bygg den som en krok, inte som en lista."
  visuell="Staplar som sjunker, understa glöder"
  kalla="Mediemyndigheten 2026, n=1745"
>
52 % råd om vardagsproblem. **15 % som sällskap.**
</Utkast>

<Notes>
SÄG: Det börjar i vardagen och slutar i en relation.
</Notes>`;

const HOOK = `<HookStatement chapter="§ 0 · Anslag" register="natt" slideId="sl_exempel01">
Åk 4. **Assyriska.** Arbetsområde: vikingatiden.
</HookStatement>`;

const BIGSTAT = `<BigStat slideId="sl_exempel02" value="62 %" title="använder AI varje vecka" source="SCB 2026" />`;

const TIMELINE = `<Timeline slideId="sl_exempel03">
  <TimelineEvent date="2022" title="ChatGPT">
    Allt börjar.
  </TimelineEvent>
</Timeline>`;

test("utkast → HookStatement: orden hamnar i mallen, tanken följer med", () => {
  const { slide, textWent } = convertSlide(first(DRAFT), first(HOOK));
  assert.equal(slide.tag, "HookStatement");
  assert.equal(textWent, "content");
  assert.equal(slide.content?.trim(), "52 % råd om vardagsproblem. **15 % som sällskap.**");
  // Identitet och planering från utkastet …
  assert.equal(slide.props.slideId, "sl_utkast01");
  assert.equal(slide.props.syfte, "Visa att spannet glider från vardag till relation");
  assert.equal(slide.props.tid, "2 min");
  assert.equal(slide.props.akt, "Relationen");
  assert.equal(slide.props.claude, "Bygg den som en krok, inte som en lista.");
  // … formen från exemplet …
  assert.equal(slide.props.chapter, "§ 0 · Anslag");
  assert.equal(slide.props.register, "natt");
  // … och utkastets egna fält blir INTE props på en vanlig mall.
  for (const key of ["visuell", "kalla", "mall", "media"]) assert.equal(key in slide.props, false, key);
  assert.match(slide.notes ?? "", /SÄG: Det börjar i vardagen/);
  assert.match(slide.notes ?? "", /Visuell idé: Staplar som sjunker/);
  assert.match(slide.notes ?? "", /Källa: Mediemyndigheten 2026/);
});

test("bytet överlever filen: skriv MDX, läs in igen", () => {
  const parsed = deck(`${DRAFT}\n\n<GiantText slideId="sl_nasta">\nNästa slide.\n</GiantText>`);
  parsed.slides[0] = convertSlide(parsed.slides[0], first(HOOK)).slide;
  const again = parseMdx(serializeMdx(parsed));
  assert.deepEqual(again.slides.map((s) => s.tag), ["HookStatement", "GiantText"]);
  assert.equal(again.slides[0].props.slideId, "sl_utkast01");
  assert.equal(again.slides[0].props.claude, "Bygg den som en krok, inte som en lista.");
  assert.equal(again.slides[0].content?.trim(), "52 % råd om vardagsproblem. **15 % som sällskap.**");
  assert.match(again.slides[0].notes ?? "", /Källa: Mediemyndigheten 2026/);
  assert.equal(again.slides[1].content?.trim(), "Nästa slide.");
});

test("mall utan children: orden hamnar i första textfältet, på en rad", () => {
  const draft = first(`<Utkast slideId="sl_u2" syfte="Siffran som vänder rummet">\nSex av tio\nanvänder AI varje vecka.\n</Utkast>`);
  const { slide, textWent } = convertSlide(draft, first(BIGSTAT));
  assert.equal(textWent, "prop");
  assert.equal(slide.props.title, "Sex av tio använder AI varje vecka.");
  assert.equal(slide.props.value, "62 %");
  assert.equal(slide.content, null);
});

test("mall med underkomponenter: orden sparas i manuset i stället för att förstöra strukturen", () => {
  const draft = first(`<Utkast slideId="sl_u3">\nTre år på tre rader.\n</Utkast>`);
  const { slide, textWent } = convertSlide(draft, first(TIMELINE));
  assert.equal(textWent, "notes");
  assert.match(slide.content ?? "", /TimelineEvent/);
  assert.match(slide.notes ?? "", /TEXTEN FRÅN UTKASTET:\nTre år på tre rader\./);
});

test("tomt utkast (bara syfte): exemplets text står kvar som platshållare", () => {
  const draft = first(`<Utkast slideId="sl_u4" syfte="Brygga till nästa exempel">\n</Utkast>`);
  const { slide, textWent } = convertSlide(draft, first(HOOK));
  assert.equal(textWent, "nowhere");
  assert.match(slide.content ?? "", /Assyriska/);
  assert.equal(slide.props.syfte, "Brygga till nästa exempel");
  assert.equal(slide.notes, undefined);
});

test("mall → annan mall: texten, manus, överlägg och aktkommentar följer med; exemplets planering gör det inte", () => {
  const source = deck(`{/* ═══ AKT 2 · MITTEN ═══ */}

<GiantText slideId="sl_g1" syfte="Landa poängen">
AI är inte en sak till.
</GiantText>

<Notes>
SÄG: Det är en förändring i villkoren.
</Notes>

<FloatingImage src="/bilder/x.png" x="10%" y="10%" width="20%" />`).slides[0];
  const target = first(`<HookStatement slideId="sl_ex" syfte="EXEMPLETS syfte" claude="EXEMPLETS instruktion" tid="9 min">\nExempeltext.\n</HookStatement>`);
  const { slide } = convertSlide(source, target);
  assert.equal(slide.tag, "HookStatement");
  assert.equal(slide.content?.trim(), "AI är inte en sak till.");
  assert.equal(slide.props.syfte, "Landa poängen");
  assert.equal("claude" in slide.props, false);
  assert.equal("tid" in slide.props, false);
  assert.equal(slide.overlays?.length, 1);
  assert.match(slide.leadingRaw ?? "", /AKT 2/);
  assert.match(slide.notes ?? "", /förändring i villkoren/);
});

test("huvudtext och plats hittas rätt", () => {
  assert.equal(mainTextOf(first(HOOK)), "Åk 4. **Assyriska.** Arbetsområde: vikingatiden.");
  assert.equal(mainTextOf(first(BIGSTAT)), "använder AI varje vecka");
  assert.equal(mainTextOf(first(TIMELINE)), "");
  assert.equal(mainTextSlot(first(HOOK)), "content");
  assert.equal(mainTextSlot(first(BIGSTAT)), "title");
  assert.equal(mainTextSlot(first(TIMELINE)), null);
});

test("utkastets planerade mall läses ur mall-fältet", () => {
  assert.equal(plannedTemplate(first(DRAFT)), "HookStatement");
  assert.equal(plannedTemplate(first(`<Utkast mall="NY: Spannet">\nx\n</Utkast>`)), null);
  assert.equal(plannedTemplate(first(HOOK)), null);
});

const TRIPTYCH = `<StatsTriptych slideId="sl_exempel05" title="Vem använder AI?" source="Skolverket 2025">
- 77 % · Gymnasiet
- 54 % · Högstadiet
</StatsTriptych>`;

test("löpande text i en listmall: orden följer med men syns inte — och bytet säger det", () => {
  const { slide, textWent, wordsFit } = convertSlide(first(DRAFT), first(TRIPTYCH));
  assert.equal(textWent, "content");
  assert.equal(wordsFit, "list-expected");
  // Orden ligger i innehållsfältet, och exemplets siffror är borta: de hör till en annan föreläsning.
  assert.ok(slide.content?.includes("15 % som sällskap"));
  assert.ok(!slide.content?.includes("Gymnasiet"));
});

test("ord som redan är en lista passar en listmall, och fri text passar en textmall", () => {
  const listDraft = first(`<Utkast slideId="sl_utkast09">
- 52 % · råd om vardagsproblem
- 15 % · som sällskap
</Utkast>`);
  assert.equal(convertSlide(listDraft, first(TRIPTYCH)).wordsFit, "ok");
  assert.equal(convertSlide(first(DRAFT), first(HOOK)).wordsFit, "ok");
  assert.equal(convertSlide(first(DRAFT), first(BIGSTAT)).wordsFit, "ok");
  assert.equal(isListShaped("\n- en rad\n"), true);
  assert.equal(isListShaped("Ett - tankstreck mitt i en mening."), false);
  assert.equal(isListShaped(null), false);
});

console.log(`\n${passed} test gick igenom.`);
