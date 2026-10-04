// Klick mot manus: stämmer [Klick] i Notes med slidens klicklägen?
//
//   node scripts/klick-manus.mjs <slug> [fler slugs]    avvikelser per deck
//   node scripts/klick-manus.mjs <slug> --alla          lista även slides som stämmer
//
// En slide med n lägen behöver n − 1 klickmarkeringar i talet. Skriptet flaggar
//   FEL    antalet [Klick] skiljer sig från lägena (felkod 1, så att det kan stå i en kontroll)
//   LÄGEN  lägesbeskrivningen (”Sju lägen: …”) säger ett annat antal än spelaren visar
//   TYST   två klick i rad utan tal emellan: tittaren ser ett läge som ingen pratar om
//   ÖPPEN  ”[Klicka fram …]” utan antal: räkna efter i spelaren
// Lägena räknas ur registret för Stage-formerna och ur stegAv/hoppaSteg. Andra
// mallar räknas inte här (”okänt antal”); granskningsvyn mäter dem i spelaren.
import { clickMarkers, loadDeck, statedSteps } from "./lib/deck.mjs";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
const all = args.includes("--alla");

if (slugs.length === 0) {
  console.error("Användning: node scripts/klick-manus.mjs <slug> [fler slugs] [--alla]");
  process.exit(2);
}

let errors = 0;
for (const slug of slugs) {
  const deck = loadDeck(slug);
  const active = deck.slides.filter((slide) => !slide.hidden);
  const unknown = active.filter((slide) => !slide.steps.known);
  const lines = [];
  let clicks = 0;
  for (const slide of active.filter((s) => s.steps.known)) {
    const kept = slide.steps.kept;
    clicks += kept;
    const marks = clickMarkers(slide.notes);
    const stated = statedSteps(slide.notes);
    const flags = [];
    if (marks.open) {
      if (marks.exact > kept - 1) flags.push(`FEL fler [Klick] (${marks.exact}) än klick (${kept - 1})`);
      else flags.push(`ÖPPEN ”[Klicka fram …]”: ${marks.exact} räknade klick av ${kept - 1}`);
    } else if (marks.exact !== kept - 1) {
      flags.push(`FEL ${marks.exact} [Klick] men ${kept - 1} klick (${kept} lägen)`);
    }
    if (stated !== null && stated !== kept) flags.push(`LÄGEN beskrivningen säger ${stated}, spelaren visar ${kept}`);
    if (marks.silent > 0) flags.push(`TYST ${marks.silent} klick utan tal emellan`);
    if (flags.some((f) => f.startsWith("FEL"))) errors++;
    if (flags.length > 0 || all) {
      const skip = slide.steps.skipped.length ? ` · hoppaSteg ${slide.steps.skipped.join(",")}` : "";
      lines.push(`  ${String(slide.n).padStart(3)}  ${slide.slideId.padEnd(26)} ${kept} lägen${skip}${flags.length ? "  " + flags.join(" · ") : "  ok"}`);
    }
  }
  console.log(`${deck.slug}: ${active.length} aktiva slides · ${clicks} klicklägen räknade${unknown.length ? ` · ${unknown.length} med okänt antal (${[...new Set(unknown.map((s) => s.tag))].slice(0, 4).join(", ")})` : ""}`);
  console.log(lines.length ? lines.join("\n") : "  Allt stämmer.");
}
process.exit(errors > 0 ? 1 : 0);
