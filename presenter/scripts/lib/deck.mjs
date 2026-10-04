// Läser ett deck som skripten kan räkna på: slides i spelordning med props,
// Notes, dolda reserver och klicklägen. Används av taltid.mjs, klick-manus.mjs
// och kallalder.mjs (snabbare till finish, 30 september 2026).
//
// Klicklägen räknas utan webbläsare där mallen har ett register: Stage-formerna
// (Stage) och `stegAv`, som gäller alla mallar. Övriga mallar får
// `steps.known = false`; granskningsvyn mäter dem i spelaren i stället.
import "./ts-import.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { parseMdx } = await import("../../src/lib/mdx-parser.ts");
const { keptSteps, parseStepConfig } = await import("../../src/lib/step-config.ts");
const { stageForms, resolveStageForm } = await import("../../src/templates/stage/stage-forms.ts");
// Filmscenerna finns inte i den publika versionen; samma reserv som i formkatalog.mjs.
const { stageScenes, resolveStageScene, stageText } = await import("../../src/templates/stage/stage-scenes.ts")
  .catch(() => ({ stageScenes: {}, resolveStageScene: () => null, stageText: () => "" }));

/** Mallar vars lägen går att räkna ur props. Lägg till fler familjer här. */
const counters = {
  Stage(props) {
    const form = resolveStageForm(props.form);
    if (form) return stageForms[form].steps(props);
    const scene = resolveStageScene(props.scene);
    // En bussröst utan prompt och svar är en återkomst med ett läge (som i Stage.tsx).
    const quoteOnly = scene === "buss" && !stageText(props, scene, "prompt") && !stageText(props, scene, "response");
    // En okänd scen (eller en filmscen i den publika versionen) räknas som ett läge.
    return quoteOnly ? 1 : (stageScenes[scene]?.steps ?? 1);
  },
};

export function deckPath(slugOrPath) {
  if (slugOrPath.endsWith(".mdx")) return path.resolve(slugOrPath);
  return path.join(root, "content", `${slugOrPath}.mdx`);
}

export function loadDeck(slugOrPath) {
  const file = deckPath(slugOrPath);
  if (!fs.existsSync(file)) throw new Error(`Saknas: ${path.relative(root, file)}`);
  const parsed = parseMdx(fs.readFileSync(file, "utf8"));
  const hidden = new Set((Array.isArray(parsed.frontmatter.hiddenSlides) ? parsed.frontmatter.hiddenSlides : []).map(Number));
  const slides = parsed.slides.map((slide, i) => {
    const props = slide.props ?? {};
    return {
      n: i + 1,
      slideId: typeof props.slideId === "string" ? props.slideId : "",
      tag: slide.tag,
      props,
      notes: slide.notes ?? "",
      hidden: hidden.has(i + 1),
      steps: countSteps(slide.tag, props),
    };
  });
  return { slug: path.basename(file, ".mdx"), file, frontmatter: parsed.frontmatter, slides };
}

function countSteps(tag, props) {
  const config = parseStepConfig(props);
  if (config?.final) return { known: true, total: null, kept: 1, skipped: [] };
  const counter = counters[tag];
  if (!counter) return { known: false, total: null, kept: null, skipped: config?.skip ?? [] };
  const total = counter(props);
  return { known: true, total, kept: keptSteps(total, config).length, skipped: config?.skip ?? [] };
}

/* ---------------------------------------------------------------- Notes */

// Samma läsning av Notes som granskningsvyn: src/lib/manus-check.ts.
const manus = await import("../../src/lib/manus-check.ts");
export const { paragraphs, isRegi, isStageNote, spoken, wordCount, statedSteps, clickMarkers } = manus;

export function mmss(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Tid i intervallet 130–140 ord per minut (projektets tumregel för Joels tal). */
export const talkRange = (words, slow = 130, fast = 140) => `${mmss((words / fast) * 60)}–${mmss((words / slow) * 60)}`;
