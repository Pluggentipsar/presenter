// Källålder: vilka siffror i decket kan ha åldrats?
//
//   node scripts/kallalder.mjs <slug> [fler slugs]
//   node scripts/kallalder.mjs <slug> --dagar=60      annan gräns (standard 90 dagar)
//   node scripts/kallalder.mjs <slug> --idag=2026-12-01
//
// Går igenom aktiva slides med siffror på skärmen (procent, ”1 av 4”, stats-formens
// värden) eller procent i talet. För varje sådan slide läses källraden (credit) och
// REGI, och det senaste datumet räknas som det senast belagda. Skriptet flaggar
//   SAKNAR KÄLLA   siffror utan källrad på sliden och utan källa i REGI
//   SAKNAR DATUM   källa utan datum eller år
//   GAMMAL         senaste datum äldre än gränsen: kolla om det finns nyare siffror
//   FORSKNING      publicerad studie; åldern visas men flaggas inte (resultatet åldras inte som statistik)
// ”Kontrollerat 23 september 2026” i REGI räknas som kontrolldatum och vinner över
// publiceringsdatumet. Skriv det när en siffra har stämts av mot källan.
import { isRegi, loadDeck, paragraphs, spoken } from "./lib/deck.mjs";

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith("--"));
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const limit = Number(option("dagar") ?? 90);
const today = option("idag") ? new Date(`${option("idag")}T12:00:00`) : new Date();

if (slugs.length === 0) {
  console.error("Användning: node scripts/kallalder.mjs <slug> [fler slugs] [--dagar=90] [--idag=ÅÅÅÅ-MM-DD]");
  process.exit(2);
}

const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
const monthIndex = (name) => MONTHS.indexOf(name.toLowerCase());
const HIDDEN_KEYS = /^(slideId|form|scene|layout|resa|dygn|ambient|enter|play|horizon|light|backdrop|tone|dim|size|anchor|pile|sink\d|kind\d*|media\d*|image\d*|background|sound\d*|doc\d*|films?|fifth|next|who\d*|role\d*|hoppaSteg|stegAv|claude|videoSrc|emphasis|credit)$|Alt$|^alt\d*$|Role$|Place$/;
const RESEARCH = /\b(Science|Nature|PNAS|Patterns|JALT|ZDM|arXiv|Lancet|BMJ|Journal|Proceedings|Advances|Review|m\.fl\.|et al\.)\b/;

/**
 * Alla datum i en text, som Date. Ett ungefärligt datum räknas generöst, till
 * periodens slut: ”juni 2026” blir 30 juni och ett ensamt år 31 december. Då
 * flaggas en rapport från i år inte förrän året är slut plus gränsen.
 */
function datesIn(text) {
  const found = [];
  const taken = [];
  const push = (date, at, length) => { found.push(date); taken.push([at, at + length]); };
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(new Date(+m[1], +m[2] - 1, +m[3]), m.index, m[0].length);
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2}) (${MONTHS.join("|")}) (\\d{4})\\b`, "gi"))) push(new Date(+m[3], monthIndex(m[2]), +m[1]), m.index, m[0].length);
  const free = (at) => !taken.some(([a, b]) => at >= a && at < b);
  for (const m of text.matchAll(new RegExp(`\\b(${MONTHS.join("|")}) (\\d{4})\\b`, "gi"))) if (free(m.index)) push(new Date(+m[2], monthIndex(m[1]) + 1, 0), m.index, m[0].length);
  for (const m of text.matchAll(/\b(20[0-4]\d|19\d\d)\b/g)) if (free(m.index)) push(new Date(+m[1], 11, 31), m.index, m[0].length);
  return found;
}

/** Kontrolldatum i REGI: ”Kontrollerat 23 september 2026”, ”kontrollerad 2026-09-30”. */
function checkedIn(text) {
  const m = text.match(new RegExp(`kontroller\\w*\\s+(?:den\\s+)?(\\d{4}-\\d{2}-\\d{2}|\\d{1,2} (?:${MONTHS.join("|")}) \\d{4})`, "i"));
  return m ? datesIn(m[1])[0] ?? null : null;
}

const days = (date) => Math.round((today - date) / 86_400_000);
const fmt = (date) => `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
const visibleText = (props) => Object.entries(props)
  .filter(([key, value]) => typeof value === "string" && !HIDDEN_KEYS.test(key) && !/^(\/|https?:)/.test(value))
  .map(([, value]) => value)
  .join(" · ");
const FIGURE = /\d+(?:[,.]\d+)?\s?(?:%|procent\b)|\b\d+ av (?:\d+|tio|fyra|fem)\b/i;
// ”Film 4 av 4” och ”steg 2 av 3” är numrering, inga siffror att belägga.
const numbering = (text) => text.replace(/\b(film|del|avsnitt|kapitel|steg|scen|läge|fråga)\s+\d+ av \d+/gi, " ");

for (const slug of slugs) {
  const deck = loadDeck(slug);
  const rows = [];
  for (const slide of deck.slides.filter((s) => !s.hidden)) {
    const visible = numbering(visibleText(slide.props));
    const talk = numbering(spoken(slide.notes));
    const stats = slide.props.form === "stats";
    const onScreen = visible.match(FIGURE)?.[0] ?? (stats ? `värden ${[1, 2, 3, 4].map((i) => slide.props[`value${i}`]).filter(Boolean).join("/")}` : null);
    const inTalk = talk.match(FIGURE)?.[0] ?? null;
    if (!onScreen && !inTalk) continue;
    const credit = typeof slide.props.credit === "string" ? slide.props.credit : "";
    const regi = paragraphs(slide.notes).filter(isRegi).join(" ");
    const sourceText = `${credit} ${regi}`;
    // Källradens datum gäller. REGI har också byggdatum, så de används bara när källraden saknar datum.
    const dates = datesIn(credit).length ? datesIn(credit) : datesIn(regi);
    const checked = checkedIn(regi);
    const newest = dates.length ? new Date(Math.max(...dates.map(Number))) : null;
    const research = RESEARCH.test(sourceText);
    let status;
    if (!credit && !regi) status = "SAKNAR KÄLLA";
    else if (checked && days(checked) <= limit) status = `ok (kontrollerat ${fmt(checked)})`;
    else if (research) status = "FORSKNING";
    else if (!newest) status = "SAKNAR DATUM";
    else if (days(checked ?? newest) > limit) status = `GAMMAL · senast ${fmt(checked ?? newest)} (${days(checked ?? newest)} dagar)`;
    else status = `ok · ${fmt(newest)}`;
    rows.push({ slide, status, figure: onScreen ?? `i talet: ${inTalk}`, credit });
  }
  const flagged = rows.filter((r) => !r.status.startsWith("ok"));
  console.log(`${deck.slug}: ${rows.length} slides med siffror · ${flagged.filter((r) => !r.status.startsWith("FORSKNING")).length} att kolla · gräns ${limit} dagar`);
  for (const { slide, status, figure, credit } of rows) {
    console.log(`  ${String(slide.n).padStart(3)}  ${slide.slideId.padEnd(26)} ${status}`);
    console.log(`       ${figure}${credit ? ` · ${credit.slice(0, 110)}${credit.length > 110 ? "…" : ""}` : ""}`);
  }
}
