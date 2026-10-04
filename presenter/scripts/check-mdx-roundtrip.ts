/**
 * Vakt mot destruktiv MDX-roundtrip.
 *
 * Editorn och storyboarden sparar genom parseMdx → serializeMdx. Allt som
 * parsern inte förstår försvinner därför ur filen vid nästa sparning. Det har
 * hänt på riktigt: 127 planeringskommentarer i norrby-gymnasiet.mdx raderades
 * av en enda dold slide, `<ComparisonColumn ComparisonColumn …>` skrevs in som
 * skräp-prop, och template-literal-promptar blev backticks som syntes på duken.
 *
 * Ren omformattering (YAML-citering, prop-layout, radslut) är OK. Det som
 * kontrolleras är att inget INNEHÅLL går förlorat eller korrumperas.
 *
 * Körs med:  npm run check:mdx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";
import { parseMdx, serializeMdx } from "../src/lib/mdx-parser.ts";
import { stripNotesBlocks } from "../src/lib/extract-notes.ts";

const CONTENT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "content",
);

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

/** Taggnamn som råkat bli boolean-prop: `<ComparisonColumn ComparisonColumn …`. */
const JUNK_PROP = /<([A-Z][A-Za-z0-9]*)\s+\1[\s>]/g;
/** Template literal som skrivits ut som quoted attribut: `prompt="` + backtick. */
const BROKEN_TEMPLATE = /=\s*"`/g;
/** Top-level MDX-kommentar. */
const COMMENT = /^\{\/\*/gm;

interface Problem {
  file: string;
  issue: string;
}

const problems: Problem[] = [];
let checked = 0;

// R-editing must preserve what was typed, not merely become idempotent after
// the first save has already changed a newline into the two characters \\n.
for (const value of [
  'Å, ä, ö — "citat" och \'citat\'.\nNästa rad.',
  '"C:\\bilder\\ny.png" och \'ord\' — bokstavligt \\n.',
  "Rubrik\nmed radbrytning",
]) {
  let fixture = parseMdx('<Statement slideId="editor-text-fixture" />');
  fixture.slides[0].props.title = value;
  for (let save = 0; save < 3; save++) {
    fixture = parseMdx(serializeMdx(fixture));
    if (fixture.slides[0].props.title !== value) {
      problems.push({ file: "editor-text-fixture", issue: `text ändras vid sparning ${save + 1}: ${JSON.stringify(value)}` });
      break;
    }
  }
}

for (const file of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"))) {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");

  let once: string;
  let twice: string;
  try {
    const parsed = parseMdx(raw);
    once = serializeMdx(parsed);
    twice = serializeMdx(parseMdx(once));
  } catch (err) {
    problems.push({ file, issue: `kunde inte parsa/serialisera — ${String(err)}` });
    continue;
  }
  checked++;

  // 1. Kommentarer och lös markdown måste överleva sparningen.
  const before = count(raw, COMMENT);
  const after = count(once, COMMENT);
  if (after < before) {
    problems.push({ file, issue: `${before - after} av ${before} kommentarer raderas` });
  }

  // 2. Sparningen får inte införa skräp-props.
  const junkAdded = count(once, JUNK_PROP) - count(raw, JUNK_PROP);
  if (junkAdded > 0) {
    problems.push({ file, issue: `${junkAdded} dubblerade taggnamn skrivs in som props` });
  }

  // 3. Template literals måste tillbaka som expression, inte quoted attribut.
  const brokenAdded = count(once, BROKEN_TEMPLATE) - count(raw, BROKEN_TEMPLATE);
  if (brokenAdded > 0) {
    problems.push({ file, issue: `${brokenAdded} template-literal-props korrumperas` });
  }

  // 4. Idempotens: andra sparningen måste ge exakt samma fil som första.
  //    Utan detta växte nästlade containrar med en tomrad per sparcykel.
  if (once !== twice) {
    const grew = twice.length - once.length;
    problems.push({
      file,
      issue: `icke-idempotent — sparning två ger ${grew >= 0 ? "+" : ""}${grew} bytes mot sparning ett`,
    });
  }

  // 5. Slides får varken försvinna eller byta template.
  const a = parseMdx(raw);
  const b = parseMdx(once);
  if (a.slides.length !== b.slides.length) {
    problems.push({
      file,
      issue: `slide-antalet ändras ${a.slides.length} → ${b.slides.length}`,
    });
  } else {
    const drifted = a.slides.filter((s, i) => s.tag !== b.slides[i].tag).length;
    if (drifted > 0) problems.push({ file, issue: `${drifted} slides byter template` });
  }

  // 6. Frontmatter jämförs semantiskt — citeringsstil får skifta, värden inte.
  const fmA = JSON.stringify(a.frontmatter, Object.keys(a.frontmatter).sort());
  const fmB = JSON.stringify(b.frontmatter, Object.keys(b.frontmatter).sort());
  if (fmA !== fmB) problems.push({ file, issue: "frontmatter-värden ändras" });

  // 7. Resultatet måste faktiskt gå att kompilera som MDX.
  //
  //    Kontrollerna ovan är alla parserns egen spegel, och parsern är
  //    generösare än MDX. Ett attribut som `title="han sa \"hej\""` läser den
  //    tillbaka utan knot — men MDX vägrar kompilera det, för JSX har inga
  //    escape-sekvenser i attributvärden. Hela presentationen blev omöjlig
  //    att ladda medan den här vakten rapporterade OK. Utan ett riktigt
  //    kompileringsförsök fångas bara det parsern redan råkar förstå.
  //
  //    Samma omfång som appen kompilerar: frontmatter och <Notes> lyfts ur
  //    innan källan når MDXRemote. Talmanus får alltså innehålla `<100` utan
  //    att det är ett fel — det är prosa, inte JSX.
  for (const [label, source] of [["filen", raw], ["sparningen", once]] as const) {
    try {
      await compile(stripNotesBlocks(source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      problems.push({ file, issue: `${label} kompilerar inte som MDX — ${msg}` });
      break;
    }
  }
}

if (problems.length > 0) {
  console.error(`\nMDX-roundtrip förlorar innehåll i ${new Set(problems.map((p) => p.file)).size} presentationer:\n`);
  for (const p of problems) console.error(`  ${p.file}\n      ${p.issue}`);
  console.error(
    `\nSpara inte dessa via editorn förrän parsern hanterar innehållet — ` +
      `varje sparning skriver om hela filen.\n`,
  );
  process.exit(1);
}

console.log(`OK — ${checked} presentationer roundtrippar utan innehållsförlust.`);
