// Taltid ur Notes: det Joel säger, utan REGI, lägesbeskrivningar, anvisningar i
// hakparentes och dolda reserver. Räknat vid 130–140 ord per minut, projektets
// tumregel (ingen uppmätt talhastighet). Bildpauser, uppläsning ovanpå och media
// tillkommer, så jämför med den tid formatet har.
//
//   node scripts/taltid.mjs <slug>                  summa + de längsta slidesen
//   node scripts/taltid.mjs <slug> --per-slide      en rad per aktiv slide
//   node scripts/taltid.mjs <slug> --hidden         räkna också de dolda reserverna
//   node scripts/taltid.mjs film-1 film-2 film-3    flera deck, en rad var + summa
import { loadDeck, spoken, talkRange, wordCount } from "./lib/deck.mjs";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
const perSlide = args.includes("--per-slide");
const withHidden = args.includes("--hidden");

if (slugs.length === 0) {
  console.error("Användning: node scripts/taltid.mjs <slug> [fler slugs] [--per-slide] [--hidden]");
  process.exit(2);
}

let grand = 0;
for (const slug of slugs) {
  const deck = loadDeck(slug);
  const rows = deck.slides
    .filter((slide) => withHidden || !slide.hidden)
    .map((slide) => ({ slide, words: wordCount(spoken(slide.notes)) }));
  const total = rows.reduce((sum, row) => sum + row.words, 0);
  grand += total;
  const active = rows.filter((row) => !row.slide.hidden).length;
  console.log(`${deck.slug}: ${total} ord · ${talkRange(total)} min tal · ${active} aktiva slides${withHidden ? ` + ${rows.length - active} dolda` : ""}`);
  if (perSlide) {
    for (const { slide, words } of rows) {
      console.log(`  ${String(slide.n).padStart(3)}  ${(slide.slideId || slide.tag).padEnd(28)} ${String(words).padStart(4)} ord  ${talkRange(words).padStart(11)}${slide.hidden ? "  (dold)" : ""}`);
    }
  } else if (slugs.length === 1) {
    const longest = [...rows].sort((a, b) => b.words - a.words).slice(0, 5);
    console.log("  Längst:");
    for (const { slide, words } of longest) console.log(`  ${String(slide.n).padStart(3)}  ${(slide.slideId || slide.tag).padEnd(28)} ${String(words).padStart(4)} ord  ${talkRange(words)}`);
  }
}
if (slugs.length > 1) console.log(`Summa: ${grand} ord · ${talkRange(grand)} min tal`);
