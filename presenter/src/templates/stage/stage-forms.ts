/**
 * Stage. Former för filmernas scener.
 *
 * En form är en visuell handling (affisch, citat, chatt, ordfält …). Innehållet
 * ligger som props i MDX; här finns fältlistor, etiketter, standardlägen och
 * hur många clickersteg formen får av sitt innehåll. Se docs/STAGE.md.
 */

/**
 * talare = innehåll till vänster, lugn yta för talaren i greenscreen till höger. full = helbild med voice-over.
 * horn = helbild där Joel står liten nere till höger (x ≥ 1200 under y 440).
 */
export type StageLayout = "talare" | "full" | "horn";

export type StageFormId =
  | "poster" | "quote" | "chat" | "words" | "stats" | "split" | "stack" | "media" | "title"
  | "raster" | "tokens" | "gym" | "krets" | "pussel" | "evidence" | "sources"
  | "bro" | "variation" | "instruktion" | "bok" | "answer"
  | "friktion" | "utdrag" | "bredd" | "bryt" | "tvilling" | "privat"
  | "lyktor" | "vecka" | "strander"
  | "mot" | "bygga" | "sortera" | "kurva" | "trappa" | "efter"
  | "genvag" | "detektor" | "insattning" | "vagg" | "ord" | "verben" | "eftertext" | "lins" | "gapet" | "taggig"
  | "kran" | "lateral" | "poang"
  | "zoom" | "flode" | "sandlada" | "berattelser" | "snoboll" | "duken" | "stege"
  | "sidor" | "slinga" | "veckan" | "pyramid" | "treord" | "byra" | "brygga" | "sattning"
  | "omslag" | "presentation"
  | "nal";

type Props = Record<string, unknown>;
const has = (props: Props, key: string) => typeof props[key] === "string" && (props[key] as string).trim() !== "";
const count = (props: Props, prefix: string, max: number) => Array.from({ length: max }, (_, i) => `${prefix}${i + 1}`).filter(key => has(props, key)).length;

export const MAX_MESSAGES = 6;
export const MAX_ITEMS = 8;
export const MAX_MEDIA = 6;
export const MAX_VALUES = 4;
export const MAX_WEEK = 12;
/** Tiopotenserna (30 september 2026): flödets rubriker, affischerna och agenterna på duken. */
export const MAX_FEED = 6;
export const MAX_POSTERS = 6;
export const MAX_AGENTS = 6;
export const MAX_RUNGS = 9;
/** Formpasset (30 september 2026): dokumentets delar. */
export const MAX_PARTS = 3;
export const MAX_WEEK_ITEMS = 6;

export interface StageFormDefinition {
  label: string;
  layout: StageLayout;
  horizon: number;
  fields: string[];
  /** Etiketter som bara gäller den här formen; annars används de gemensamma. */
  labels?: Record<string, string>;
  /** Ljusets läge längs horisonten per steg, i procent av bredden. Fältet light går före. */
  light?: number[];
  /** Bildläge per steg när fältet layout är tomt (omslaget: helbild, sedan titelkortet med Joel). */
  layouts?: StageLayout[];
  steps: (props: Props) => number;
}

const common = ["kicker", "credit", "adress", "layout", "horizon", "light", "ambient", "backdrop", "tone", "dygn", "enter", "play", "resa", "filmfarg", "background", "backgroundAlt", "skala", "vy", "plats", "kamera", "inkomst"];
const numbered = (prefixes: string[], max: number) => Array.from({ length: max }, (_, i) => prefixes.map(prefix => `${prefix}${i + 1}`)).flat();

export const stageForms: Record<StageFormId, StageFormDefinition> = {
  poster: {
    label: "Affisch · ett till tre led",
    layout: "talare", horizon: .72,
    fields: [...common, "title", "title2", "title3", "emphasis", "caption", "size", "image", "imageAlt", "imageCaption", "echo", "vis", "visText", "visData"],
    labels: {
      echo: "Ekot som blir rubriken (samma antal rader; orden som skiljer glider ut och in när sliden kommer)",
      vis: "Visualisering bredvid (prisfall = logaritmisk kurva som faller)", visText: "Visualiseringens etikett och källrad (skilj med |)",
      visData: "Visualiseringens tal (prisfall: från|till|faktor per år, till exempel 2023|2025|40)",
    },
    steps: props => Math.max(1, ["title", "title2", "title3"].filter(key => has(props, key)).length),
  },
  quote: {
    label: "Citat · valfri bild och framhävning",
    layout: "talare", horizon: .72,
    fields: [...common, "quote", "attribution", "image", "imageAlt", "imagePlace", "emphasis", "after", "size"],
    steps: props => has(props, "after") || has(props, "emphasis") ? 2 : 1,
  },
  chat: {
    label: "Chatt · en replik per klick",
    layout: "full", horizon: .9,
    fields: [...common, "title", "chatTitle", "device", "size", ...numbered(["who", "label", "msg", "mark"], MAX_MESSAGES), "note", "emphasis", "image", "imageAlt"],
    steps: props => Math.max(1, count(props, "msg", MAX_MESSAGES) + (has(props, "note") ? 1 : 0)),
  },
  words: {
    label: "Ordfält → påstående",
    layout: "talare", horizon: .72,
    fields: [...common, "words", "title", "emphasis"],
    steps: props => has(props, "words") && has(props, "title") ? 2 : 1,
  },
  stats: {
    label: "Stora tal → slutsats",
    layout: "talare", horizon: .72,
    fields: [...common, "title", "unit", ...numbered(["value", "label", "dots", "from"], MAX_VALUES), "fromLabel", "note", "note2"],
    labels: {
      from1: "Förra värdet 1 (räknas om till värdet på notens klick)", from2: "Förra värdet 2", from3: "Förra värdet 3", from4: "Förra värdet 4",
      fromLabel: "När det förra värdet gällde (till exempel 2025)",
    },
    steps: props => 1 + (has(props, "note") ? 1 : 0) + (has(props, "note2") ? 1 : 0),
  },
  split: {
    label: "Två sidor → slutsats",
    layout: "full", horizon: .86,
    fields: [...common, "title", "leftLabel", "leftText", "leftRole", "rightLabel", "rightText", "rightRole", "note", "emphasis"],
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  stack: {
    label: "Rader, en i taget",
    layout: "talare", horizon: .8,
    fields: [...common, "title", ...numbered(["tag", "item", "role"], MAX_ITEMS), "note", "emphasis", "image", "imageAlt", "imageCaption", "pile", ...numbered(["sink"], 3)],
    labels: {
      pile: "Hög före listan: antal chattskärmbilder utan text (till exempel 20; eget klick, sedan glider högen undan)",
      sink1: "Formel som sjunker 1 (glittrar och sjunker när sliden kommer)", sink2: "Formel som sjunker 2", sink3: "Formel som sjunker 3",
    },
    steps: props => Math.max(1, count(props, "item", MAX_ITEMS) + (has(props, "note") ? 1 : 0) + (Number(props.pile) > 0 ? 1 : 0)),
  },
  media: {
    label: "Bild, film eller ljud · valfri prompt före",
    layout: "full", horizon: .9,
    fields: [...common, "title", "promptLabel", ...numbered(["prompt", "media", "kind", "doc", "caption", "alt", "sound", "stamp"], MAX_MEDIA), "note", "noteStyle", "noteLabel", "anchor"],
    labels: {
      promptLabel: "Promptens etikett (tomt = Prompt)",
      noteStyle: "Slutradens form (notis = en notis glider in över mediet; tomt = stor rad)", noteLabel: "Notisens avsändare och tid (till exempel Mitt röriga liv · nu)",
      anchor: "Underlaget som stannar (mediets nummer, till exempel 1): de andra samlas under det och fälls ut runt det vid slutraden",
    },
    steps: props => {
      let steps = 0;
      for (let i = 1; i <= MAX_MEDIA; i++) if (has(props, `media${i}`) || has(props, `caption${i}`) || has(props, `doc${i}`)) steps += has(props, `prompt${i}`) ? 2 : 1;
      return Math.max(1, steps + (has(props, "note") ? 1 : 0));
    },
  },
  title: {
    label: "Filmens titel",
    layout: "talare", horizon: .72,
    fields: [...common, "series", "filmLabel", "filmTitle", "speaker", "speakerRole", "film", "films", "next", "puzzle"],
    labels: {
      film: "Filmens nummer i serien (ljusen på vattnet; tomt = inga ljus)", films: "Antal filmer i serien (standard 4)",
      next: "Nästa films nummer (slutskylt: ljuset glider dit)", puzzle: "Pusslet med den lediga platsen bredvid titeln (ja eller tomt)",
    },
    steps: () => 1,
  },
  raster: {
    label: "En sak till → ett lager över allt",
    layout: "talare", horizon: .8,
    fields: [...common, "rows", "box", "q1", "q2"],
    steps: () => 2,
  },
  tokens: {
    label: "Väskan · så växer ett svar fram",
    layout: "full", horizon: .9,
    fields: [...common, "prompt", "cand1", "cand2", "cand3", "candNote", "trainSources", "trainWord", "train2", "tokens", "tokenLabel", "prompt2", "answer2", "final", "image", "imageAlt", "image2", "image2Alt"],
    labels: {
      candNote: "Rad under förslagen (samma klick)", image: "Föremål till meningen och slutraden (frilagt, valfritt)", imageAlt: "Föremålets beskrivning",
      image2: "Föremål till sammanhanget (frilagt, valfritt)", image2Alt: "Föremålets beskrivning",
    },
    steps: () => 7,
  },
  gym: {
    label: "Gymmet · tre ton",
    layout: "talare", horizon: .74,
    fields: [...common, "q", "a1", "a1b", "a2", "a2b", "a3", "a3b", "a4", "image", "imageAlt", "image2", "image2Alt"],
    steps: () => 4,
  },
  krets: {
    label: "Strömkretsen · förutsäg först",
    layout: "full", horizon: .9,
    fields: [...common, "prompt", "question", "u1", "r", "u2", "final"],
    steps: () => 4,
  },
  pussel: {
    label: "Pusselbiten",
    layout: "talare", horizon: .74,
    fields: [...common, "title", "label"],
    steps: () => 2,
  },
  evidence: {
    label: "Studien · med stöd, sedan själv",
    layout: "full", horizon: .9,
    fields: [...common, "study", "g1", "g2", "g3", "phase1", "v1b", "v1c", "phase2", "v2b", "v2c", "foot", "final"],
    steps: () => 4,
  },
  sources: {
    label: "Vad bygger svaret på?",
    layout: "full", horizon: .9,
    fields: [...common, "answer", "answerLabel", ...numbered(["seg", "tag"], 3), ...numbered(["cardTitle", "cardText", "cardLabel"], 3), ...numbered(["note"], 3)],
    steps: () => 6,
  },
  bro: {
    label: "Bron · ett föremål flyger över vattnet",
    layout: "talare", horizon: .72,
    fields: [...common, "image", "imageAlt", "leftLabel", "leftText", "rightLabel", "rightText", "excerptLabel", "excerpt", "title", "title2", "route"],
    labels: {
      image: "Föremålet som flyger (frilagt)", leftLabel: "Startsidan · etikett", leftText: "Startsidan · ord", rightLabel: "Målet · etikett", rightText: "Målet · ord",
      excerptLabel: "Utdragets märkning", excerpt: "Utdrag (andra klicket)", title: "Rubrik när föremålet flyger", title2: "Andra ledet (sista klicket)", route: "Vägen vidare (sista klicket)",
    },
    steps: () => 4,
  },
  variation: {
    label: "Variation · vad hålls lika, vad varierar?",
    layout: "full", horizon: .9,
    fields: [...common, "title", "themeLabel", ...numbered(["media", "alt", "theme", "plot"], 3), "same1", "vary1", "same2", "vary2", "question"],
    labels: {
      title: "Rubrik (första klicket)", themeLabel: "Etikett före temat", same1: "Lika (andra klicket)", vary1: "Varierar (andra klicket)",
      same2: "Lika (tredje klicket)", vary2: "Varierar (tredje klicket)", question: "Fråga (sista klicket)",
    },
    steps: () => 4,
  },
  instruktion: {
    label: "Från behov till instruktion",
    layout: "full", horizon: .9,
    fields: [...common, "startLabel", "start", "startNote", "panelLabel", "part1Tag", "part1", "part2Tag", "part2", "part3Tag", "part3", "zoom", "endLabel", "badEnd", "goodEnd"],
    labels: {
      startLabel: "Första beställningen · avsändare", start: "Första beställningen", startNote: "Kommentar till första beställningen", panelLabel: "Instruktionens märkning",
      part1Tag: "Del 1 · etikett", part1: "Del 1", part2Tag: "Del 2 · etikett", part2: "Del 2", part3Tag: "Del 3 · etikett", part3: "Del 3",
      zoom: "Förstorad rad (står ordagrant i del 3)", endLabel: "Exemplets märkning", badEnd: "Slutet som ger bort temat (stryks)", goodEnd: "Handlingen som ersätter det",
    },
    steps: props => 1 + [1, 2, 3].filter(n => has(props, `part${n}`)).length + (has(props, "badEnd") ? 1 : 0),
  },
  bok: {
    label: "Föremål → ett förlopp i tre led",
    layout: "talare", horizon: .72,
    fields: [...common, "image", "imageAlt", "title", "subtitle", "loopLabel", "loop1", "loop2", "loop3", "loop4", "loopNote", "loopKind"],
    labels: { image: "Föremålet (frilagt)", subtitle: "Underrad", loopLabel: "Förloppets etikett (andra klicket)", loopNote: "Rad under förloppet", loopKind: "Form (loop eller list)" },
    steps: props => has(props, "loop1") ? 2 : 1,
  },
  answer: {
    label: "Lång prompt → svar i utdrag",
    layout: "full", horizon: .9,
    fields: [...common, "promptLabel", "prompt", "material", "answerLabel", "answer", "highlight", "flag", "flagNote", "note"],
    labels: {
      promptLabel: "Promptens avsändare", prompt: "Prompten", material: "Inklistrat underlag (visas som inslag i prompten)", answerLabel: "Svarets ursprung (tjänst, modell, datum)",
      answer: "Svaret i utdrag · rad som börjar med # blir rubrik", highlight: "Lyfts fram när svaret kommer, skilj med |", flag: "Markeras som överdrift på nästa klick, skilj med |",
      flagNote: "Rad under svaret när överdriften markeras", note: "Slutrad (sista klicket)",
    },
    steps: props => 2 + (has(props, "flag") ? 1 : 0) + (has(props, "note") ? 1 : 0),
  },
  friktion: {
    label: "Friktion · tre lägen i samma uppgift",
    layout: "talare", horizon: .8,
    fields: [...common, "context", "work1", "work2", "work3", "pupilLabel", "helpLabel", "aiLabel", "label1", "detail1", "label2", "detail2", "label3", "detail3", "extra1", "extra2", "extra3", "question"],
    labels: {
      context: "Uppgiften", work1: "Arbete 1", work2: "Arbete 2", work3: "Arbete 3", pupilLabel: "Etikett · eleven arbetar", helpLabel: "Etikett · AI hjälper", aiLabel: "Etikett · AI tar över",
      label1: "Läge 1 · rubrik", detail1: "Läge 1 · text", label2: "Läge 2 · rubrik", detail2: "Läge 2 · text", label3: "Läge 3 · rubrik", detail3: "Läge 3 · text",
      extra1: "Extra arbete 1", extra2: "Extra arbete 2", extra3: "Extra arbete 3", question: "Fråga (sista klicket)",
    },
    steps: () => 5,
  },
  utdrag: {
    label: "Utdrag · en rad ur en längre text",
    layout: "talare", horizon: .82,
    fields: [...common, "label", "text", "line"],
    labels: { label: "Textens märkning", text: "Hela texten (liten)", line: "Raden som lyfts fram (står ordagrant i texten)" },
    steps: () => 1,
  },
  bredd: {
    label: "Bredden · bättre var för sig, mer lika tillsammans",
    layout: "talare", horizon: .84,
    fields: [...common, "stage1", "stage2", "stage3", "question"],
    labels: { stage1: "Rad 1 (korten spridda)", stage2: "Rad 2 (korten blir bättre)", stage3: "Rad 3 (korten glider ihop)", question: "Fråga (sista klicket)" },
    steps: () => 4,
  },
  bryt: {
    label: "Uppgiften bryts upp · målet avgör",
    layout: "talare", horizon: .84,
    fields: [...common, "taskLabel", "task", ...numbered(["part"], 6), "goal", "focus", "detail"],
    labels: { taskLabel: "Uppgiftens etikett", task: "Uppgiften", goal: "Arbeten som målet gäller (nummer, till exempel 3,4)", focus: "Fråga om målet", detail: "Målet" },
    steps: () => 3,
  },
  tvilling: {
    label: "Tvillingar · behåll kunnandet, byt förutsättningen",
    layout: "full", horizon: .9,
    fields: [...common, "title", "leftLabel", "rightLabel", ...numbered(["subj", "task", "twin"], 3), "note"],
    labels: { leftLabel: "Kolumnrubrik · uppgiften", rightLabel: "Kolumnrubrik · tvillingen", note: "Slutsats (sista klicket)" },
    steps: props => 1 + [1, 2, 3].filter(n => has(props, `task${n}`)).length + (has(props, "note") ? 1 : 0),
  },
  privat: {
    label: "Skärmbilden · vad följer med när eleven ber om hjälp?",
    layout: "full", horizon: .9,
    fields: [...common, "title", "appLabel", "promptLabel", "prompt", "attachLabel", "screenshotLabel", "image", "imageAlt", "contactName", "contactDetail", "chatDate",
      "message1", "message2", "message3", "highlight1", "highlight2", "mark1", "mark2", "mark3", "mark4", "question", "serviceLabel1", "service1", "serviceLabel2", "service2", "note"],
    labels: {
      appLabel: "Chattens namn", promptLabel: "Elevens avsändare", prompt: "Elevens prompt", attachLabel: "Bilagans namn", screenshotLabel: "Skärmbildens märkning", image: "Kompisens profilbild (skapad)",
      contactName: "Kompisens namn (påhittat)", contactDetail: "Klass", chatDate: "Dag", message1: "Kompisens meddelande 1", message2: "Elevens svar", message3: "Kompisens meddelande 2",
      highlight1: "Markeras i meddelande 1 (ordagrant)", highlight2: "Markeras i meddelande 2 (ordagrant)", mark1: "Markering 1", mark2: "Markering 2", mark3: "Markering 3", mark4: "Markering 4",
      question: "Frågan (står ensam)", serviceLabel1: "Tjänst A · etikett", service1: "Tjänst A · svar", serviceLabel2: "Tjänst B · etikett", service2: "Tjänst B · svar", note: "Slutsats under tjänsterna",
    },
    steps: () => 6,
  },
  lyktor: {
    label: "Frågan · svaren tänds som ljus på vattnet",
    layout: "full", horizon: .6,
    fields: [...common, "question", "hint", "answersLabel", "answers", "title", "after", "emphasis"],
    labels: {
      question: "Frågan", hint: "Rad under frågan (försvinner när svaren kommer)", answersLabel: "Svarens märkning (till exempel Exempelsvar)",
      answers: "Svar, skilj med | (de tolv första får text, resten blir ljus)", title: "Påståendet när ljusen samlas (sista klicket)", after: "Rad under påståendet",
    },
    steps: props => has(props, "answers") ? 2 + (has(props, "title") ? 1 : 0) : 1,
  },
  vecka: {
    label: "Veckan · sortera i ÅT MIG, MED MIG, MOT MIG",
    layout: "full", horizon: .95,
    fields: [...common, "title", "subtitle", "days", ...numbered(["item", "day", "time", "role", "result", "resultLabel"], MAX_WEEK),
      "atLabel", "atText", "medLabel", "medText", "motLabel", "motText", "keepLabel", "keepText", "resultTitle", "resultText"],
    labels: {
      subtitle: "Underrad till veckan", days: "Dagar, skilj med | (fem stycken)",
      atLabel: "ÅT MIG · rubrik", atText: "ÅT MIG · förklaring", medLabel: "MED MIG · rubrik", medText: "MED MIG · förklaring", motLabel: "MOT MIG · rubrik", motText: "MOT MIG · förklaring",
      keepLabel: "Det som stannar · rubrik", keepText: "Det som stannar · förklaring", resultTitle: "Resultaten · rubrik (sista klicket)", resultText: "Resultaten · förklaring",
    },
    steps: props => 4 + (has(props, "keepLabel") || has(props, "keepText") ? 1 : 0) + (count(props, "result", MAX_WEEK) ? 1 : 0),
  },
  strander: {
    label: "Två stränder · JAG → AI → JAG",
    layout: "full", horizon: .62,
    light: [50, 20, 50, 80, 50],
    fields: [...common, "left", "mid", "right", "leftLabel", "leftText", "midLabel", "midText", "rightLabel", "rightText", "title", "after", "emphasis"],
    labels: {
      left: "Vänstra stranden · ord", mid: "Vattnet · ord", right: "Högra stranden · ord",
      leftLabel: "Före · etikett", leftText: "Före · frågor (första klicket)", midLabel: "Vattnet · etikett", midText: "Vattnet · frågor (andra klicket)",
      rightLabel: "Efter · etikett", rightText: "Efter · frågor (tredje klicket)", title: "Påståendet (sista klicket)", after: "Rad under påståendet",
    },
    steps: props => 4 + (has(props, "title") ? 1 : 0),
  },
  mot: {
    label: "MOT MIG · beslutet får motstånd",
    layout: "full", horizon: .88,
    fields: [...common, "title", "decisionLabel", "decision", "context", ...numbered(["move", "prompt", "note"], 4), "notesLabel", "final", "finalNote", "emphasis"],
    labels: {
      title: "Rubrik", decisionLabel: "Beslutets märkning", decision: "Beslutet (papperet)", context: "Bakgrund på papperet · rad som börjar med • blir punkt",
      move1: "Drag 1 · namn", prompt1: "Drag 1 · prompt", note1: "Drag 1 · AI:ns motstånd (samlat efter sista draget)",
      move2: "Drag 2 · namn", prompt2: "Drag 2 · prompt", note2: "Drag 2 · AI:ns motstånd",
      move3: "Drag 3 · namn", prompt3: "Drag 3 · prompt", note3: "Drag 3 · AI:ns motstånd",
      move4: "Drag 4 · namn", prompt4: "Drag 4 · prompt", note4: "Drag 4 · AI:ns motstånd",
      notesLabel: "Motståndets märkning", final: "Slutsats (sista klicket)", finalNote: "Rad under slutsatsen",
    },
    steps: props => 1 + count(props, "prompt", 4) + (["note1", "note2", "note3", "note4"].some(key => has(props, key)) ? 1 : 0) + (has(props, "final") ? 1 : 0),
  },
  bygga: {
    label: "AI kan också bygga · beställning → skärm → förmågor",
    layout: "full", horizon: .9,
    fields: [...common, "title", "promptLabel", "prompt", "attachment", "result", "resultAlt", "resultLabel", "url", ...numbered(["tile", "tileText", "tileChip", "tileIcon"], 4), "webTile", "final", "emphasis"],
    labels: {
      title: "Rubrik", promptLabel: "Beställningens avsändare", prompt: "Beställningen (första klicket)", attachment: "Bifogad fil",
      result: "Det som byggdes (skärmbild, zoomas in)", resultAlt: "Skärmbildens beskrivning", resultLabel: "Märkning på skärmbilden (till exempel Gjord med Claude)", url: "Adressraden",
      tile1: "Kort 1 · namn", tileText1: "Kort 1 · text", tileChip1: "Kort 1 · märkning", tileIcon1: "Kort 1 · ikon (research, analys, kod, agent)",
      tile2: "Kort 2 · namn", tileText2: "Kort 2 · text", tileChip2: "Kort 2 · märkning", tileIcon2: "Kort 2 · ikon",
      tile3: "Kort 3 · namn", tileText3: "Kort 3 · text", tileChip3: "Kort 3 · märkning", tileIcon3: "Kort 3 · ikon",
      tile4: "Kort 4 · namn", tileText4: "Kort 4 · text", tileChip4: "Kort 4 · märkning", tileIcon4: "Kort 4 · ikon",
      webTile: "Kortet som skärmbilden blir (1–4, standard 3)", final: "Slutsats (sista klicket)",
    },
    steps: props => 1 + (has(props, "prompt") ? 1 : 0) + (has(props, "result") ? 1 : 0) + (count(props, "tile", 4) ? 1 : 0) + (has(props, "final") ? 1 : 0),
  },
  sortera: {
    label: "Sortera · varje papper faller i sitt fack",
    layout: "full", horizon: .93,
    fields: [...common, "title", ...numbered(["lane", "rule", "laneRole"], 3), ...numbered(["doc", "docLane"], 8), "floor", "final", "emphasis"],
    labels: {
      title: "Rubrik", lane1: "Fack 1 · namn", rule1: "Fack 1 · regel", lane2: "Fack 2 · namn", rule2: "Fack 2 · regel", lane3: "Fack 3 · namn", rule3: "Fack 3 · regel",
      laneRole1: "Fack 1 · roll (human, shared, ai; tomt = grönt)", laneRole2: "Fack 2 · roll (tomt = gult)", laneRole3: "Fack 3 · roll (tomt = rött)",
      floor: "Fackens golv i px (standard 820; 760 håller papperen ovanför textningen)",
      final: "Slutsats (sista klicket)",
      ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`doc${i + 1}`, `Papper ${i + 1} (ett per klick)`])),
    },
    steps: props => 1 + count(props, "doc", 8) + (has(props, "final") ? 1 : 0),
  },
  kurva: {
    label: "U-kurvan · ljuset följer kurvan",
    layout: "full", horizon: .93,
    fields: [...common, "title", "xLabel", "yLabel", ...numbered(["point", "pointText"], 3), "note", "final", "emphasis"],
    labels: {
      title: "Rubrik", xLabel: "Etikett längs x-axeln", yLabel: "Etikett längs y-axeln", note: "Fotnot under x-axeln (till exempel Schematisk bild)",
      point1: "Början · namn", pointText1: "Början · text", point2: "Dalen · namn (nästa klick)", pointText2: "Dalen · text", point3: "Toppen · namn (nästa klick)", pointText3: "Toppen · text",
      final: "Slutsats (sista klicket)",
    },
    steps: props => Math.max(1, count(props, "point", 3)) + (has(props, "final") ? 1 : 0),
  },
  trappa: {
    label: "Trappan · ett steg nedåt per klick",
    layout: "full", horizon: .9,
    fields: [...common, "title", ...numbered(["stepLabel", "stepText", "stepRole", "stepWho"], 6), "image", "imageAlt", "imageCaption", "imageStep", "final", "emphasis"],
    labels: {
      title: "Rubrik", image: "Skärmbild som visas med ett av stegen", imageAlt: "Skärmbildens beskrivning", imageCaption: "Bildtext", imageStep: "Steget där bilden kommer (standard 4)",
      final: "Slutsats (sista klicket)",
    },
    steps: props => 1 + count(props, "stepLabel", 6) + (has(props, "final") ? 1 : 0),
  },
  efter: {
    label: "Jag efter · ljusen stiger, sjunker och samlas",
    layout: "full", horizon: .66,
    fields: [...common, "title", ...numbered(["question"], 3), "final", "emphasis", "lights"],
    labels: {
      title: "Rubrik", question1: "Fråga 1 · ljus stiger", question2: "Fråga 2 · ljus sjunker", question3: "Fråga 3 · ljus samlas vid horisonten",
      final: "Slutsats (sista klicket)", lights: "Antal ljus på vattnet (standard 27)",
    },
    steps: props => 1 + count(props, "question", 3) + (has(props, "final") ? 1 : 0),
  },
  /* Lånade former, 28 september 2026 (lan.tsx): handlingen ur tidigare föreläsningar och Vem skrev din kurs?, formen Vätterljusets. */
  genvag: {
    label: "Genvägen · AI hoppar över elevens arbete",
    layout: "full", horizon: .72,
    fields: [...common, "title", "taskLabel", "task", "pathLabel", ...numbered(["work"], 3), "aiLabel", "resultLabel", "result", "note", "emphasis"],
    labels: {
      title: "Rubrik (valfri)", taskLabel: "Uppgiftens etikett", task: "Uppgiften", pathLabel: "Elevens väg · etikett",
      work1: "Arbete 1", work2: "Arbete 2", work3: "Arbete 3", aiLabel: "Genvägens etikett (nästa klick)", resultLabel: "Resultatets etikett", result: "Det färdiga svaret",
      note: "Frågan (sista klicket)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  detektor: {
    label: "Detektorn · siffran och omdömet",
    layout: "full", horizon: .9,
    fields: [...common, "title", "contextLabel", "context", "toolLabel", "value", "verdict", "reaction", "concept", "explanation", "focus", "detail", "quote", "quoteSource", "emphasis"],
    labels: {
      title: "Rubrik", contextLabel: "Textens etikett", context: "Elevens text (påhittad)", toolLabel: "Verktygets etikett (andra klicket)", value: "Siffran i procent", verdict: "Verktygets bedömning",
      reaction: "Lärarens reaktion (tredje klicket)", concept: "Begreppet", explanation: "Begreppets förklaring",
      focus: "Forskningen · rad 1 (fjärde klicket)", detail: "Forskningen · rad 2", quote: "Citatet", quoteSource: "Citatets källa",
    },
    steps: () => 4,
  },
  insattning: {
    label: "En modell får ett led till · EPA → ECPA",
    layout: "full", horizon: .6,
    fields: [...common, ...numbered(["letter", "name", "detail", "role"], 4), "insert", "note", "emphasis"],
    labels: {
      ...Object.fromEntries([1, 2, 3, 4].flatMap(n => [[`letter${n}`, `Bokstav ${n}`], [`name${n}`, `Namn ${n}`], [`detail${n}`, `Förklaring ${n}`], [`role${n}`, `Roll ${n} (human, ai, shared)`]])),
      insert: "Ledet som skjuts in på andra klicket (1–4, standard 2)", note: "Slutrad (sista klicket)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  vagg: {
    label: "Videoväggen · klipp som kunde vara sanna",
    layout: "full", horizon: .9,
    fields: [...common, "title", "caption", ...numbered(["media", "alt", "caption"], 6), "note", "emphasis"],
    labels: {
      title: "Rubriken (andra klicket)", caption: "Rad under rubriken", note: "Slutrad (valfri)",
      ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap(n => [[`media${n}`, `Klipp ${n} (tyst loop eller bild)`], [`alt${n}`, `Beskrivning ${n}`], [`caption${n}`, `Märkning ${n} (syns med rubriken)`]])),
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  ord: {
    label: "Hörde ni? · människoorden tänds",
    layout: "talare", horizon: .8,
    fields: [...common, ...numbered(["line", "source", "word"], 4), "wordsLabel", "title", "emphasis"],
    labels: {
      ...Object.fromEntries([1, 2, 3, 4].flatMap(n => [[`line${n}`, `Mening ${n}`], [`source${n}`, `Avsändare ${n}`], [`word${n}`, `Människoordet i mening ${n} (ordagrant)`]])),
      wordsLabel: "Raden när orden tänds (andra klicket)", title: "Slutraden (sista klicket)",
    },
    steps: props => 2 + (has(props, "title") ? 1 : 0),
  },
  verben: {
    label: "Vem får verben? · skyltarna byter rad",
    layout: "talare", horizon: .84,
    fields: [...common, "title", "rowA", "verbsA", "swapA", "rowB", "verbsB", "swapB", "final", "emphasis"],
    labels: {
      title: "Rubrik", rowA: "Rad 1 · vem", verbsA: "Rad 1 · verb, skilj med |", swapA: "Rad 1 · verb efter bytet",
      rowB: "Rad 2 · vem (andra klicket)", verbsB: "Rad 2 · verb", swapB: "Rad 2 · verb efter bytet (tredje klicket)", final: "Frågan (sista klicket)",
    },
    steps: props => 3 + (has(props, "final") ? 1 : 0),
  },
  eftertext: {
    label: "Eftertext · en roll per klick",
    layout: "talare", horizon: .72,
    fields: [...common, "title", ...numbered(["role", "credit"], 4), "foot", "films", "fifth"],
    labels: {
      title: "Titel", foot: "Fotrad (namn och titel)",
      films: "Antal ljus på vattnet, ett per film (tomt = inga ljus)", fifth: "Klicket där ett ljus till tänds nära (0 = direkt; tomt = inget)",
      ...Object.fromEntries([1, 2, 3, 4].flatMap(n => [[`role${n}`, `Roll ${n}`], [`credit${n}`, `Namn ${n} (tomt = en rad att fylla i)`]])),
    },
    steps: props => 1 + count(props, "role", 4),
  },
  lins: {
    label: "Linsen · tre frågor till en röst",
    layout: "talare", horizon: .8,
    fields: [...common, "title", "contextLabel", "context", "answer", ...numbered(["focus", "detail"], 3), "note", "emphasis"],
    labels: {
      title: "Rubrik", contextLabel: "Röstens etikett", context: "Rösten (citat)", answer: "AI:ns dom (valfri)",
      ...Object.fromEntries([1, 2, 3].flatMap(n => [[`focus${n}`, `Fråga ${n}`], [`detail${n}`, `Svar ${n}`]])),
      note: "Slutrad (sista klicket)",
    },
    steps: props => Math.max(1, count(props, "focus", 3)) + (has(props, "note") ? 1 : 0),
  },
  /* 1 oktober 2026 (lan.tsx): MatteusGap, i Vätterljus. */
  gapet: {
    label: "Gapet · två banor från samma ljus",
    layout: "full", horizon: .8, light: [14],
    fields: [...common, "title", "startLabel", "upperLabel", "upperText", "lowerLabel", "lowerText", "gapLabel", "note", "emphasis", "closes"],
    labels: {
      title: "Rubrik (valfri, viker undan för slutsatsen)", startLabel: "Startpunktens text (valfri)",
      upperLabel: "Övre banan · etikett", upperText: "Övre banan · text (tecknas när sliden kommer)",
      lowerLabel: "Nedre banan · etikett (nästa klick)", lowerText: "Nedre banan · text",
      gapLabel: "Gapets namn (valfritt, kommer med den nedre banan)",
      note: "Slutsats (sista klicket): den nedre banan vänder uppåt och gapet sluts",
      closes: "Sluts gapet vid slutsatsen? (tomt = ja, nej = gapet står kvar)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  /* 1 oktober 2026 (lan.tsx): JaggedReveal ur elva deck, i Vätterljus. */
  taggig: {
    label: "Taggiga gränsen · toppen, dalen och gränsen som flyttar sig",
    // Ljuset står till höger (82 %), så att glansen på vattnet inte hamnar under en källrad på två rader.
    layout: "full", horizon: .8, light: [82],
    fields: [...common, "peakLabel", "peakText", "dipLabel", "dipText", "image", "imageAlt", "note", "emphasis", "moves"],
    labels: {
      peakLabel: "Toppen · etikett", peakText: "Toppen · text (stort när sliden kommer; en rad som börjar med ~ blir mindre)",
      dipLabel: "Dalen · etikett (nästa klick)", dipText: "Dalen · text",
      image: "Föremål som faller ned i dalen (frilagd bild)", imageAlt: "Föremålets beskrivning",
      note: "Slutsats (sista klicket): gränsen flyttar sig och den gamla står kvar streckad",
      moves: "Flyttar sig gränsen vid slutsatsen? (tomt = ja, nej = den står still)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  /* Rörelsepasset, 28 september 2026 (rorelse.tsx): former där rörelsen bär förklaringen. */
  kran: {
    label: "Kranen · intelligens på kran blir agens",
    layout: "talare", horizon: .74,
    light: [82, 82, 45, 45, 45],
    fields: [...common, "image", "imageAlt", "title", ...numbered(["flow"], 4), "thesis", "tool", "practice", "emphasis"],
    labels: {
      image: "Kranen (frilagd bild, vattnet rinner åt vänster)", title: "Rubrik vid kranen",
      flow1: "Förmåga 1 (nästa klick: rinner ut på vattnet)", flow2: "Förmåga 2", flow3: "Förmåga 3", flow4: "Förmåga 4",
      thesis: "Tesen (stiger ur ljuset): rad 1 stor, rad 2 tecken, rad 3 sjunker", tool: "Verktygsraden (nästa klick)", practice: "Agensraden (sista klicket)",
    },
    steps: props => 1 + (has(props, "flow1") ? 1 : 0) + ["thesis", "tool", "practice"].filter(key => has(props, key)).length,
  },
  lateral: {
    label: "Lateral läsning · i sidled, och chatten i en cirkel",
    layout: "talare", horizon: .9,
    fields: [...common, "pageUrl", "pageLabel", "pageTitle", "tab1", "tab2", "leftLabel", "leftText", "chatLabel", "askLabel", "ask", "replyLabel", "reply", "note", "emphasis"],
    labels: {
      pageUrl: "Sidans adress (påhittad)", pageLabel: "Sidans märkning (till exempel Illustration)", pageTitle: "Sidans rubrik",
      tab1: "Flik 1 (nästa klick: öppnas i sidled)", tab2: "Flik 2", leftLabel: "Förklaringens etikett", leftText: "Förklaringen (när flikarna öppnas)",
      chatLabel: "Chattens märkning (valfri)", askLabel: "Frågans avsändare (tomt = Du)", ask: "Frågan till chatten (nästa klick)",
      replyLabel: "Svarets avsändare (tomt = AI)", reply: "Svaret (klicket efter frågan)", note: "Slutraden (kommer med svaret)",
    },
    steps: props => 1 + ["leftText", "ask", "reply"].filter(key => has(props, key)).length,
  },
  zoom: {
    label: "Zoom · ett kapitel i tiopotenserna",
    layout: "full", horizon: .72,
    fields: [...common, "title", "caption", "emphasis"],
    labels: { title: "Kort rad över zoomen (valfri)", caption: "Bildtext under raden (valfri)" },
    steps: () => 1,
  },
  flode: {
    label: "Flödet · en rubrik i taget i telefonen",
    layout: "full", horizon: .72,
    fields: [...common, "title", "feedTitle", "start", ...numbered(["media", "alt", "head", "source", "date", "tone"], MAX_FEED), "note", "emphasis"],
    labels: {
      title: "Rubrik bredvid telefonen", feedTitle: "Flödets namn överst i telefonen", start: "Poster som syns direkt (standard 1; resten kommer en per klick)",
      note: "Slutraden (sista klicket, telefonen dämpas)",
      ...Object.fromEntries(Array.from({ length: MAX_FEED }, (_, i) => [[`media${i + 1}`, `Post ${i + 1} · skärmdump (i stället för rubrik)`], [`head${i + 1}`, `Post ${i + 1} · rubrik`], [`tone${i + 1}`, `Post ${i + 1} · ton (hot, pengar eller tomt)`]]).flat()),
    },
    steps: props => {
      const items = Array.from({ length: MAX_FEED }, (_, i) => i + 1).filter(n => has(props, `head${n}`) || has(props, `media${n}`)).length;
      const first = Math.max(1, Math.min(items, Math.round(Number(props.start)) || 1));
      return Math.max(1, items - first + 1) + (has(props, "note") ? 1 : 0);
    },
  },
  sandlada: {
    label: "Sandlådan · agenterna tar sig ut",
    layout: "full", horizon: .72,
    fields: [...common, "title", "boxLabel", "count", "escaped", "outLabel", ...numbered(["fact"], 3), "note", "emphasis"],
    labels: {
      title: "Rubrik", boxLabel: "Rutans etikett (till exempel Sandlådan · testmiljön)", count: "Prickar i rutan (schematiskt, 40–160)",
      escaped: "Prickar som tar sig ut (nästa klick)", outLabel: "Dit de tar sig (till exempel Internet)",
      fact1: "Fakta 1 (klicket efter)", fact2: "Fakta 2", fact3: "Fakta 3", note: "Slutraden (sista klicket)",
    },
    steps: props => 2 + (["fact1", "fact2", "fact3"].some(key => has(props, key)) ? 1 : 0) + (has(props, "note") ? 1 : 0),
  },
  berattelser: {
    label: "Berättelserna · affischerna, en i taget",
    layout: "full", horizon: .72,
    fields: [...common, "title", "hidesLabel", ...numbered(["name", "tagline", "habitat", "hides", "genre", "media", "alt", "top", "bill", "pull"], MAX_POSTERS), "bottomLine", "questionLabel", "question", "questionCaption", "emphasis"],
    labels: {
      ...Object.fromEntries(Array.from({ length: MAX_POSTERS }, (_, i) => [`pull${i + 1}`, `Affisch ${i + 1} · rubriker ur flödet som dras in när väggen kommer (skilj med |)`])),
      title: "Påståendet över väggen", hidesLabel: "Etiketten före det som döljs (tomt = Döljer)",
      bottomLine: "Slutraden när alla står på väggen igen (klicket efter affischerna)",
      questionLabel: "Frågans etikett (till exempel Bikupa · två minuter)", question: "Fråga medan väggen står kvar (eget klick sist)", questionCaption: "Rad under frågan",
      ...Object.fromEntries(Array.from({ length: MAX_POSTERS }, (_, i) => [
        [`media${i + 1}`, `Affisch ${i + 1} · hjälteobjektet (frilagd bild)`], [`alt${i + 1}`, `Affisch ${i + 1} · bildbeskrivning`],
        [`top${i + 1}`, `Affisch ${i + 1} · topptext (tomt = En berättelse om AI)`], [`bill${i + 1}`, `Affisch ${i + 1} · rollistan (tomt = AI i huvudrollen)`],
      ]).flat()),
    },
    steps: props => {
      let steps = 1;
      for (let i = 1; i <= MAX_POSTERS; i++) if (has(props, `name${i}`)) steps += has(props, `hides${i}`) ? 2 : 1;
      return steps + (has(props, "bottomLine") ? 1 : 0) + (has(props, "question") ? 1 : 0);
    },
  },
  snoboll: {
    label: "Snöbollen · prototypen och allt som växer runt den",
    layout: "full", horizon: .72,
    fields: [...common, "title", "core", "coreLabel", "features", "title2", "ring", "final", "emphasis"],
    labels: {
      title: "Rubrik vid prototypen", core: "Kärnan (prototypen, en rad)", coreLabel: "Kärnans etikett (till exempel Måndag 15.00)",
      features: "Funktionerna som snöbollar (skilj med |, nästa klick)", title2: "Rubrik när det snöbollar",
      ring: "Ordet vid ringen (till exempel Ring in)", final: "Slutraden (sista klicket, ringen dras)",
    },
    steps: props => 1 + (has(props, "features") ? 1 : 0) + (has(props, "final") ? 1 : 0),
  },
  duken: {
    label: "Duken · agenter och du på samma yta",
    layout: "full", horizon: .72,
    fields: [...common, "title", "canvasTitle", "canvasLabel", "artTitle", "artTitle2", ...numbered(["agent", "agentDoes"], MAX_AGENTS), "commentLabel", "comment", "reply", "you", "question", "emphasis"],
    labels: {
      title: "Rubrik ovanför duken", canvasTitle: "Arbetsytans namn (i duken)", canvasLabel: "Märkning (till exempel Illustration, inspirerad av Doop)",
      artTitle: "Affischens rubrik på duken (ny rad bryter)", artTitle2: "Affischens rubrik efter kommentaren",
      commentLabel: "Kommentarens avsändare (tomt = Du)", comment: "Kommentaren på duken (klicket efter agenterna)", reply: "Agenternas svar (klicket efter kommentaren, när de gör om)",
      you: "Din markör (tomt = Du)", question: "Frågan (sista klicket, din markör står ensam)",
    },
    // Kommentaren och agenternas svar får var sitt klick (prompt före svar).
    steps: props => 2 + (has(props, "comment") ? 2 : 0) + (has(props, "question") ? 1 : 0),
  },
  stege: {
    label: "Skalstegen · ett exempel per tiopotens",
    layout: "full", horizon: .72,
    fields: [...common, "title", ...numbered(["scale", "name", "text", "source", "vis", "visText", "visData", "media", "poster", "alt"], MAX_RUNGS), "note", "emphasis"],
    labels: {
      title: "Rubrik ovanför stegen",
      note: "Slutraden (sista klicket, hela stegen står kvar)",
      ...Object.fromEntries(Array.from({ length: MAX_RUNGS }, (_, i) => [
        [`scale${i + 1}`, `Steg ${i + 1} · skala och plats (till exempel 10⁷ m · Planeten)`], [`name${i + 1}`, `Steg ${i + 1} · namn`],
        [`text${i + 1}`, `Steg ${i + 1} · exemplet`], [`source${i + 1}`, `Steg ${i + 1} · källa med datum`],
        [`vis${i + 1}`, `Steg ${i + 1} · visualisering i världen (vind, batar, flod, skanning, karta, film, lunga, rulle, molekyler)`],
        [`visText${i + 1}`, `Steg ${i + 1} · visualiseringens etiketter (skilj med |; film: rubrik|källa; lunga: rubrik|staplarna; rulle: rullen|utrullad|kolumner|märkning; molekyler: tre rader)`],
        [`visData${i + 1}`, `Steg ${i + 1} · visualiseringens tal (skanning: 100>56|100>129, karta: minuter, film: start i sekunder, lunga: 98|-20, rulle: kolumner, molekyler: 100|86|72)`],
        [`media${i + 1}`, `Steg ${i + 1} · film (vis=film) eller utrullad text (vis=rulle)`], [`poster${i + 1}`, `Steg ${i + 1} · filmens stillbild eller röntgenbilden (vis=rulle)`],
        [`alt${i + 1}`, `Steg ${i + 1} · filmens beskrivning`],
      ]).flat()),
    },
    steps: props => Math.max(1, count(props, "name", MAX_RUNGS)) + (has(props, "note") ? 1 : 0),
  },
  sidor: {
    label: "Sidorna · ett dokument i proportioner",
    layout: "full", horizon: .72,
    fields: [...common, "question", "question2", "docLabel", "pages", ...numbered(["part", "pages", "role", "quote"], MAX_PARTS), "quoteSource", "after", "emphasis"],
    labels: {
      question: "Frågan (första läget)", question2: "Andra frågan (nästa klick)", docLabel: "Dokumentets etikett ovanför sidorna (tomt = antal sidor)",
      pages: "Dokumentets sidor totalt (till exempel 261)", quoteSource: "Varifrån citaten kommer (under citatet)",
      after: "Rad med sista delen (till höger, samma klick)",
      ...Object.fromEntries(Array.from({ length: MAX_PARTS }, (_, i) => [
        [`part${i + 1}`, `Del ${i + 1} · namn (ett klick per del)`], [`pages${i + 1}`, `Del ${i + 1} · sidor`],
        [`role${i + 1}`, `Del ${i + 1} · färg (alert, human, ai, ink)`], [`quote${i + 1}`, `Del ${i + 1} · citat under sidorna`],
      ]).flat()),
    },
    steps: props => Math.max(1, ["question", "question2"].filter(key => has(props, key)).length
      + Array.from({ length: MAX_PARTS }, (_, i) => i + 1).filter(n => has(props, `part${n}`) && Number(props[`pages${n}`]) > 0).length),
  },
  slinga: {
    label: "Slingan · chattboten och agentens varv",
    layout: "full", horizon: .72,
    fields: [...common, "title", "leftLabel", "ask", "answer", "rightLabel", "goal", ...numbered(["loop"], 4), "note", "emphasis"],
    labels: {
      leftLabel: "Chattboten · etikett", ask: "Chattboten · din fråga (ut)", answer: "Chattboten · svaret (tillbaka)",
      rightLabel: "Agenten · etikett (nästa klick)", goal: "Agenten · målet", loop1: "Station 1 (överst)", loop2: "Station 2 (höger)",
      loop3: "Station 3 (nederst)", loop4: "Station 4 (vänster)", note: "Slutraden (sista klicket, punkten lämnar ringen)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  veckan: {
    label: "Veckoremsan · veckans block, sedan en dag som växer",
    layout: "full", horizon: .72,
    fields: [...common, "title", "days", ...numbered(["item", "text", "from", "to", "role"], MAX_WEEK_ITEMS), "note", "emphasis", "focusDay", "focusTitle", ...numbered(["question"], 3)],
    labels: {
      title: "Rubrik", days: "Dagarna (fem, skilj med |)", note: "Slutraden (klicket efter blocken)",
      focusDay: "Dagen som växer (1–5, standard 5)", focusTitle: "Den växande dagens rubrik (till exempel Till fredag)",
      question1: "Fråga 1 (dagen växer)", question2: "Fråga 2 (nästa klick)", question3: "Fråga 3 (nästa klick)",
      ...Object.fromEntries(Array.from({ length: MAX_WEEK_ITEMS }, (_, i) => [
        [`item${i + 1}`, `Block ${i + 1} · namn (ett klick per block)`], [`text${i + 1}`, `Block ${i + 1} · text`],
        [`from${i + 1}`, `Block ${i + 1} · första dagen (1–5)`], [`to${i + 1}`, `Block ${i + 1} · sista dagen (1–5)`], [`role${i + 1}`, `Block ${i + 1} · roll (human, shared, ai)`],
      ]).flat()),
    },
    steps: props => Math.max(1, count(props, "item", MAX_WEEK_ITEMS)) + (has(props, "note") ? 1 : 0) + (count(props, "question", 3)),
  },
  pyramid: {
    label: "Pyramiden · uppåt som skolan, nedåt som veckan",
    layout: "full", horizon: .72,
    fields: [...common, "title", ...numbered(["level"], 6), "upLabel", "upText", "downLabel", "downText", "here", "note", "image", "imageAlt", "emphasis"],
    labels: {
      level1: "Nivå 1 (nederst)", level2: "Nivå 2", level3: "Nivå 3", level4: "Nivå 4", level5: "Nivå 5", level6: "Nivå 6 (överst)",
      upLabel: "Uppåt · etikett", upText: "Uppåt · text (första läget)", downLabel: "Nedåt · etikett (nästa klick)", downText: "Nedåt · text",
      here: "Markören vid toppen (till exempel Ni börjar här)", note: "Slutraden (sista klicket, pyramiden dämpas)", image: "Föremål vid slutraden (frilagd bild)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  treord: {
    label: "Tre ord · JAG → AI → JAG utan sjön",
    layout: "full", horizon: .72,
    fields: [...common, "left", "mid", "right", "leftLabel", "leftText", "midLabel", "midText", "rightLabel", "rightText", "title", "after", "emphasis"],
    labels: {
      left: "Vänster ord", mid: "Mittenordet (mono)", right: "Höger ord",
      leftLabel: "Vänster · etikett", leftText: "Vänster · frågor (första klicket)", midLabel: "Mitten · etikett", midText: "Mitten · frågor (andra klicket)",
      rightLabel: "Höger · etikett", rightText: "Höger · frågor (tredje klicket)", title: "Påståendet (sista klicket)", after: "Rad under påståendet",
    },
    steps: props => 4 + (has(props, "title") ? 1 : 0),
  },
  byra: {
    label: "Byrån · agenterna som teamsida",
    layout: "full", horizon: .72,
    fields: [...common, "title", "title2", ...numbered(["agent", "agentDoes"], MAX_AGENTS), "emphasis"],
    labels: { title: "Rubrik", title2: "Andra ledet (nästa klick, en sjunde plats står tom)" },
    steps: props => 1 + (has(props, "title2") ? 1 : 0),
  },
  sattning: {
    label: "Sättningen · meningen sätts av koden",
    layout: "full", horizon: .72,
    fields: [...common, "title", "emphasis", "counterLabel"],
    labels: { title: "Meningen (ny rad bryter; ~ framför en rad ger den människans färg)", counterLabel: "Räknarens etikett (tomt = Sättning)" },
    steps: () => 1,
  },
  brygga: {
    label: "Bryggan · en loop eller en film mellan delarna",
    layout: "full", horizon: .72,
    fields: [...common, "title", "fran", "till", "portal", "riktning", "del", "delar", "nivaer", "image", "emphasis", "film", "filmText", "filmNivaer", "filmPunkter", "filmDagar"],
    labels: {
      title: "Nästa dels namn", fran: "Tiopotensen bryggan börjar på (till exempel 2)", till: "Nästa dels tiopotens (portalens bild, till exempel 0)",
      riktning: "Zoomens riktning (in eller ut; tomt = efter fran och till)", del: "Nästa dels nummer på färdkartan (1–6)",
      delar: "Föreläsningens delar på färdkartan (skilj med |)", nivaer: "Delarnas tiopotenser på färdkartan (skilj med |, till exempel 7|7|0|-2|2)",
      image: "Bild i portalen (tomt = portalnivåns egen bild)", portal: "Portalens tiopotens (nästa slides nivå; tomt = till)",
      film: "Film i stället för loop: nio, tre, pixlar, vecka eller ja (tomt = loopen)",
      filmText: "Filmens texter (skilj med |). nio: exemplen; tre: valfria namn vid märkena; pixlar: AI-pekarnas namn och sist människans",
      filmNivaer: "nio: exemplens tiopotenser (skilj med |, till exempel 7|6|5|4|2|0|-1|-3|-9)",
      filmPunkter: "tre: märkenas platser i bilden, x,y i scenens pixlar (skilj med |; tomt = kalendern, datorn, telefonen)",
      filmDagar: "vecka: dagarna på klockan (skilj med |; tomt = Mån|Tis|Ons|Tor|Fre)",
    },
    steps: () => 1,
  },
  poang: {
    label: "Poängtavlan · därför lönar det sig att gissa",
    layout: "talare", horizon: .86,
    fields: [...common, "title", ...numbered(["value", "label"], 3), "questions", "known", "lucky", "rowALabel", "rowBLabel", "pointsLabel", "note", "emphasis"],
    labels: {
      title: "Rubrik", value1: "Regel 1 · poäng", label1: "Regel 1 · för vad", value2: "Regel 2 · poäng", label2: "Regel 2 · för vad", value3: "Regel 3 · poäng", label3: "Regel 3 · för vad",
      questions: "Frågor i provet (standard 10)", known: "Svar som båda kan (standard 7)", lucky: "Lyckade gissningar (standard 1)",
      rowALabel: "Rad 1 · den som skriver vet inte (nästa klick)", rowBLabel: "Rad 2 · den som gissar", pointsLabel: "Poängens enhet (tomt = poäng)", note: "Slutsats (sista klicket)",
    },
    steps: props => 2 + (has(props, "note") ? 1 : 0),
  },
  // Introt 30 september 2026 (intro.tsx): omslaget i ljuspunkter och Joels presentationsfilm.
  omslag: {
    label: "Omslag · titeln stiger ur ljuset",
    layout: "full", layouts: ["full", "talare"], horizon: .72,
    fields: [...common, "series", "filmLabel", "filmTitle", "title", "q1", "q2", "q3", "speaker", "speakerRole", "film", "films", "puzzle"],
    labels: {
      filmTitle: "Filmens titel (ljuspunkterna och titelkortet; rad som börjar med ~ blir mjukare)", title: "Annan titel i ljuspunkterna (tomt = filmens titel)",
      q1: "Fråga 1 i ljuspunkter", q2: "Fråga 2 i ljuspunkter", q3: "Fråga 3 i ljuspunkter",
      speaker: "Namn (ger ett andra läge: titelkortet där du presenterar dig)", speakerRole: "Titel under namnet",
      film: "Filmens nummer i serien (ljusen på vattnet)", films: "Antal filmer i serien (standard 4)", puzzle: "Pusslet på titelkortet (ja eller tomt)",
    },
    steps: props => has(props, "speaker") ? 2 : 1,
  },
  presentation: {
    label: "Presentation · talaren och presentationsfilmen",
    layout: "full", horizon: .72,
    fields: [...common, "name", "role1", "role2", "role3", "contact", "media1", "alt1", "poster"],
    labels: {
      kicker: "Överrubrik (till exempel Hej! Jag heter)", name: "Namn", role1: "Rad 1", role2: "Rad 2", role3: "Rad 3 (tom = ingen)", contact: "Kontaktrad",
      media1: "Presentationsfilmen (nästa klick startar den, med ljud)", alt1: "Filmens beskrivning", poster: "Stillbild innan filmen startar",
    },
    steps: props => has(props, "media1") ? 2 : 1,
  },
  /* 2 oktober 2026 (nal.tsx): delegeringskompetens, Joels idé för film 3 i en filmserie. */
  nal: {
    label: "Nålen · krafterna drar, gränsen känns, motståndet väljs",
    // Helbild med Joel liten nere till höger. Ljuset står där nålen vrider sig (x 590).
    layout: "horn", horizon: .7, light: [36.875],
    fields: [...common, "title", "left", "up", "right", ...numbered(["forceLabel", "force"], 3), "ghostLabel", "ghost", "note", "emphasis", "spegel"],
    labels: {
      title: "Frågan (står överst tills slutsatsen kommer)",
      left: "Riktningen dit kraft 2 drar, längs horisonten (till exempel Gör själv; till vänster, till höger med spegel)",
      right: "Riktningen dit kraft 1 drar, längs horisonten (till exempel Lämna över; till höger, till vänster med spegel)",
      up: "Riktning uppåt (nålen lyfts dit på klicket efter krafterna)",
      forceLabel1: "Kraft 1 · etikett", force1: "Kraft 1 · drar nålen ned under ytan, förbi Lämna över (eget klick)",
      forceLabel2: "Kraft 2 · etikett", force2: "Kraft 2 · drar nålen mot Gör själv (eget klick)",
      forceLabel3: "Kraft 3 · etikett", force3: "Kraft 3 · en taggig gräns visar sig och nålen studsar mot den (eget klick)",
      ghostLabel: "Spårets etikett (med slutsatsen)", ghost: "Vid nålens streckade spår under ytan (med slutsatsen)",
      note: "Slutsats (sista klicket) · ersätter frågan; rad som börjar med ~ blir mjukare",
      spegel: "Spegelvänd (ja = Gör själv till höger och Lämna över till vänster, som i ett fack med AI till vänster)",
    },
    // Samma ordning som nal.tsx: vila, krafterna som har text, lyftet, slutsatsen.
    // I ett zoomdeck (fältet skala) ritas nålen som en teknisk ritning på en linjalkant.
    steps: props => 2 + count(props, "force", 3) + (has(props, "note") ? 1 : 0),
  },
};

export const stageFormIds = Object.keys(stageForms) as StageFormId[];

export function resolveStageForm(form: unknown): StageFormId | null {
  return typeof form === "string" && form in stageForms ? form as StageFormId : null;
}

export const stageFormLabels: Record<string, string> = {
  kicker: "Överrubrik", credit: "Ursprung / fotrad", adress: "Adress som visas stort nere till höger (till exempel exempel.se/material)", layout: "Bildläge (talare, full eller horn = du liten nere till höger; per steg med komma)", horizon: "Horisontens höjd (0,5–0,95)",
  light: "Ljusets läge i procent av bredden, per steg med komma (till exempel 20,50,80)",
  backdrop: "Bakgrund (tomt = sjön med horisont och ljus, vag = den rörliga vågen, vag-delad = vågen i delad färg, tema = bara temats bakgrund)", tone: "Tid på dygnet (tomt = temat, dag = dagsljus)", filmfarg: "Ljusets färg på just den här sliden (profilfärg som aprikos eller #rrggbb; tomt = deckets filmfarg)",
  dygn: "Gryning över sjön (natt, gryning eller morgon; per steg med komma; himlen ljusnar långsamt dit)",
  enter: "Rörelseriktning in (upp, ner, hoger, vanster, djup eller nara)",
  imageCaption: "Bildtext under bilden (till exempel AI-genererad illustration)",
  play: "Ord som rör sig: ord:effekt, skilj med | (vax, krymp, glid, lyft, sjunk, skaka, oppna, stang, samlas, bygg, tand, blekna, flimmer, vand, stryk, bro)",
  resa: "Resan hit genom världen (in = nytt kapitel, upp = återkomst, ut = helheten, stilla = fråga, hoger/vanster bara mellan helbilder; tomt = ner)",
  ambient: "Vattnet (flow eller still)", background: "Foto som bakgrund", backgroundAlt: "Fotots beskrivning",
  skala: "Tiopotensen (zoomen; 7 = planeten, 0 = ett bord, −2 = en duk; per steg med komma)",
  vy: "Slöjan över zoomen (full, dov, mork eller 0–1; per steg med komma)", plats: "Platsen i skalmätaren (tomt = nivåns egen)",
  kamera: "Kameran inom nivån (tomt, nara, fjarran eller horisont; per steg med komma)", inkomst: "Inträdet (portal = sliden öppnas ur bryggans portal)",
  title: "Rubrik", title2: "Andra ledet (nästa klick)", title3: "Tredje ledet (nästa klick)", emphasis: "Framhävda ord, skilj med |", caption: "Bildtext", size: "Storlek (xl, l, m, s)",
  quote: "Citat · rad som börjar med ~ blir mjukare", attribution: "Avsändare", image: "Bild", imageAlt: "Bildbeskrivning", imagePlace: "Bildens plats (side eller below)", after: "Följdrad (nästa klick)",
  chatTitle: "Chattens rubrik", device: "Form (panel eller telefon)", note: "Slutsats (sista klicket)",
  words: "Ord, skilj med |", unit: "Enhet", note2: "Tillägg (nästa klick)",
  leftLabel: "Vänster · etikett", leftText: "Vänster · text", leftRole: "Vänster · roll", rightLabel: "Höger · etikett", rightText: "Höger · text", rightRole: "Höger · roll",
  series: "Serienamn", filmLabel: "Filmnummer", filmTitle: "Filmens titel", speaker: "Namn", speakerRole: "Titel",
  rows: "Rader, skilj med |", box: "Rutans ord", q1: "Fråga när rutan står bredvid", q2: "Fråga när den ligger över allt",
  prompt: "Prompt", cand1: "Förslag 1", cand2: "Förslag 2", cand3: "Förslag 3", trainSources: "Träningsdata, skilj med |", trainWord: "Träningens ord", train2: "Fortsatt träning, skilj med |",
  tokens: "Textbitar, skilj med |", tokenLabel: "Förklaring av token", prompt2: "Prompt med sammanhang", answer2: "Svar med sammanhang", final: "Slutrad",
  q: "Fråga", a1: "Svar 1", a1b: "Svar 1 · stort", a2: "Rad 2", a2b: "Fråga 2", a3: "Rad 3", a3b: "Svar 3", a4: "Slutrad",
  image2: "Bild 2", image2Alt: "Bild 2 · beskrivning", question: "Förutsägelsefrågan", u1: "Spänning före (V)", r: "Resistans (Ω)", u2: "Spänning efter (V)",
  label: "Pusselbitens ord", study: "Studien", g1: "Grupp 1", g2: "Grupp 2", g3: "Grupp 3", phase1: "Fas 1", v1b: "Fas 1 · grupp 2", v1c: "Fas 1 · grupp 3",
  phase2: "Fas 2", v2b: "Fas 2 · grupp 2", v2c: "Fas 2 · grupp 3", foot: "Fotnot", answer: "Svarets text", answerLabel: "Svarets ursprung",
};

export function stageFormFieldLabel(name: string, form?: StageFormId | null): string {
  const own = form ? stageForms[form].labels?.[name] : undefined;
  if (own) return own;
  if (stageFormLabels[name]) return stageFormLabels[name];
  const m = name.match(/^([a-zA-Z]+?)(\d+)$/);
  if (!m) return name;
  const [, prefix, n] = m;
  const base: Record<string, string> = {
    who: "Avsändare (du, elev, ai, talare, not)", msg: "Replik", mark: "Framhävt i repliken, skilj med |", label: "Etikett", value: "Värde", dots: "Prickar av 10",
    tag: "Etikett", item: "Rad", role: "Roll (human, ai, shared, alert)", media: "Fil", kind: "Typ (image, video, audio, placeholder)",
    caption: "Bildtext", alt: "Beskrivning", prompt: "Prompt före", seg: "Markerad del", cardTitle: "Kort · rubrik", cardText: "Kort · text",
    cardLabel: "Kort · etikett", note: "Notering", doc: "Dokument på papper (rad som slutar med kolon blir rubrik)", sound: "Filmens ljud (ja eller tomt)",
    theme: "Tema", plot: "Handling", same: "Lika", vary: "Varierar", loop: "Led", part: "Arbete", subj: "Ämne", task: "Uppgift", twin: "Tvilling",
    day: "Dag (1–5)", time: "Klockslag", result: "Resultatet som bild (sista klicket)", resultLabel: "Resultatets märkning",
    docLane: "Papperets fack (1–3)", stepLabel: "Steg · namn", stepText: "Steg · text", stepRole: "Steg · roll (human, shared, ai)", stepWho: "Steg · vem (JAG, VI, AI)", question: "Fråga",
    head: "Rubrik i flödet", source: "Källa", date: "Datum", fact: "Fakta",
    name: "Affischens namn", tagline: "Affischens rad", habitat: "Bor i", hides: "Det berättelsen döljer (eget klick)",
    genre: "Affischens stil (fralsare, forgorare, gud, tjanare, spegel, partner)", agent: "Agentens namn", agentDoes: "Vad agenten gör på duken",
  };
  return `${base[prefix] ?? prefix} ${n}`;
}

export function stageFormFieldType(name: string): "image" | "multiline" | "text" {
  if (/^(image|image2|background|poster)$/.test(name) || /^(media|poster)\d+$/.test(name)) return "image";
  if (/^(result)\d*$/.test(name)) return "image";
  if (/^(kicker|credit|layout|horizon|light|ambient|backdrop|tone|dygn|enter|play|resa|filmfarg|backgroundAlt|size|device|unit|emphasis|attribution|chatTitle|series|filmLabel|speaker|box|label|answerLabel|leftRole|rightRole|imagePlace|days|left|mid|right|atLabel|medLabel|motLabel|keepLabel|resultTitle)$/.test(name)) return "text";
  if (/^(who|label|role|kind|tag|value|dots|cardLabel|mark|alt|theme|same|vary|sound|loop|subj|work|extra|day|time)\d+$/.test(name) || name === "goal") return "text";
  if (/^(move|tile|tileChip|tileIcon|lane|laneRole|docLane|point|stepLabel|stepRole|stepWho)\d+$/.test(name) || /^(attachment|url|webTile|imageStep|lights|imageCaption|floor)$/.test(name)) return "text";
  if (/(Label|Tag|Alt)$/.test(name) || /^(highlight|flag|loopKind|contactName|contactDetail|chatDate)$/.test(name) || /^(stamp|serviceLabel)\d+$/.test(name)) return "text";
  // Lånade former (lan.tsx).
  if (/^(value|verdict|concept|quoteSource|insert|rowA|rowB|verbsA|verbsB|swapA|swapB|closes|moves)$/.test(name) || /^(letter|name|source|word|work|credit|focus)\d+$/.test(name)) return "text";
  // Formpasset 30 september (sidorna, slingan).
  if (/^(pages|question2|focusDay|focusTitle|here|noteStyle|fran|till|riktning|del|delar|nivaer|portal|kamera|inkomst)$/.test(name) || /^level\d+$/.test(name) || /^to\d+$/.test(name) || /^(pages|top|bill)\d+$/.test(name)) return "text";
  // Tiopotenserna 30 september (skala, flödet, sandlådan, affischerna, snöbollen, duken).
  if (/^(skala|vy|plats|start|feedTitle|count|escaped|outLabel|boxLabel|hidesLabel|coreLabel|ring|canvasTitle|canvasLabel|commentLabel|you|counterLabel|vis|visText|visData)$/.test(name) || /^(source|date|tone|genre|agent|scale|vis|visText|visData|pull)\d+$/.test(name)) return "text";
  // Rörelsepasset 28 september (ljusen, tavlan, kranen, fliken, poängen, högen).
  if (/^(film|films|next|fifth|anchor|pile|puzzle|questions|known|lucky|fromLabel|pageUrl|pageLabel|tab1|tab2|ask|reply|rowALabel|rowBLabel|pointsLabel)$/.test(name) || /^(flow|from|sink)\d+$/.test(name)) return "text";
  // Nålen 2 oktober (riktningarna, krafterna och spåret).
  if (/^(up|ghost|spegel)$/.test(name) || /^(force|forceLabel)\d+$/.test(name)) return "text";
  return "multiline";
}
