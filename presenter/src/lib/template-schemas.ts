/**
 * Schema-definitioner för alla templates.
 *
 * Varje template har en lista med fält (props). Fälttyper:
 * - text: Enkel-rads text
 * - multiline: Flera rader (textarea)
 * - select: Dropdown med fasta val
 * - number: Numeriskt värde (som string i MDX)
 * - boolean: On/off
 * - image: Bildpath (string)
 * - color: CSS-färg
 * - list: Lista av strängar (markdown-punkter eller comma-separerade)
 * - json: En lista eller ett objekt som egenskap (`categories={[["Namn","…"]]}`).
 *         Redigeras som JSON och sparas bara när det går att läsa.
 * - children: Innehåll mellan taggar (för templates som tar children)
 *
 * Används av redigeringsläget för att rendera rätt input per fält.
 */

import { createSlideId } from "./slide-ids";
import { commonTemplateSchemas } from "./template-schemas-vanliga";
import { modelTemplateSchemas } from "./template-schemas-modeller";
import { schemaFamilies } from "./template-schemas-familjer";
import { buildDefaultSlide } from "./field-form";

export type FieldType =
  | "text"
  | "multiline"
  | "select"
  | "number"
  | "boolean"
  | "image"
  | "color"
  | "list"
  | "json"
  | "children";

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[]; // för select
  default?: string | number | boolean;
  /** Visuell variant. "pills" ger segmented control istället för dropdown. */
  variant?: "pills";
  /**
   * Finjustering: visas hopfälld under "Fler inställningar" i editorn. Ett
   * `default` här är bara vad formuläret visar när egenskapen saknas (mallens
   * eget standardvärde) — det skrivs inte in i nya slides.
   */
  advanced?: boolean;
}

export interface TemplateSchema {
  name: string;
  description: string;
  fields: FieldSchema[];
  /** Special: templates som tar barn-komponenter (Timeline → TimelineEvent, Comparison → ComparisonColumn) */
  childrenType?: "slot" | "TimelineEvent" | "ComparisonColumn";
  /** När template har children som är ren text/markdown */
  hasContent?: boolean;
  /** Vad innehållet ÄR i den här mallen: "Meningen", "Replikerna". Standard "Innehåll (markdown)". */
  contentLabel?: string;
  /** Formatet, med mallens egna ord: vad en rad är, vad **fet** betyder. */
  contentHint?: string;
  /** Texten en ny slide börjar med. Utan den: två punkter. */
  defaultContent?: string;
  /** Orden ÄR sliden (HookStatement, PromptWindow): innehållet står överst i formuläret. */
  contentFirst?: boolean;
}

export const templateSchemas: Record<string, TemplateSchema> = {
  JthBusQuote: {
    name: "JthBusQuote",
    description: "Busscitat med illustrerad mobilchatt. manualReplies ger citat → prompt → svar → reaktion på separata klick.",
    fields: [
      { name: "story", label: "Mobilberättelse", type: "select", options: ["svar", "emojis", "dejt"], required: true },
      { name: "kicker", label: "Överrubrik", type: "text" },
      { name: "footnote", label: "Fotrad", type: "text" },
      { name: "lines", label: "Citat (| mellan rader)", type: "multiline" },
      { name: "manualReplies", label: "Manuella klick för prompt, svar och reaktion", type: "boolean", default: false },
    ],
    hasContent: false,
  },
  BrowserError: {
    name: "BrowserError",
    description: "Stilla Chrome-liknande felsida för en avsiktlig komisk paus. Föreläsningsläget förstorar texten för projektion. Egen Chrome-form oberoende av temat.",
    fields: [
      { name: "domain", label: "Domän", type: "text", default: "exempel.se" },
      { name: "title", label: "Rubrik", type: "text", default: "Webbplatsen kan inte nås" },
      { name: "errorCode", label: "Felkod", type: "text", default: "DNS_PROBE_STARTED" },
      { name: "status", label: "Statusrad", type: "text", default: "Diagnostiserar problemet." },
      { name: "presentation", label: "Större text för föreläsningssal", type: "boolean", default: false },
    ],
    hasContent: false,
  },
  MetrHorizon: {
    name: "MetrHorizon",
    description: "METR: förklara måttet, visa tidiga och senare mätningar, illustrera en daterad fördubblingstakt. Tre eller fyra clickersteg.",
    fields: [
      { name: "title", label: "Rubrik", type: "text", default: "Längre uppgifter. Snabb utveckling." },
      { name: "chapter", label: "Kapitel", type: "text", default: "Förmåga över tid · METR" },
      { name: "dataset", label: "Daterat mätunderlag (JSON)", type: "multiline", hint: "Tomt = TH 1.1, data 8 maj 2026. Eget underlag: följ MetrHorizon i docs/TEMPLATES.md. Graf och perioder följer underlaget." },
      { name: "report", label: "Rapporterad fördubblingstakt (JSON)", type: "multiline", hint: "Ange days, period, published och sourceUrl tillsammans. Tomt med standarddata = 88,6 dagar, rapporterat 29 januari 2026. Eget dataset kräver egen rapport; null döljer slutsteget." },
    ],
  },
  WordSteps: {
    name: "WordSteps",
    description:
      "Den typografiska stegaren — orden ÄR bilden. Faserna står som ett massivt ord-band längst ner (fyller bredden); den aktiva är bläcksvart, de andra ljusgrå. Ovanför, i linje med det aktiva ordet, fasens kicker/underrad/punkter. Klick byter fas. Rad: `ORD · kicker · underrad · punkt | punkt`.",
    fields: [
      { name: "chapter", label: "Kapitel-markör", type: "text" },
      { name: "width", label: "Andel av bredden (0,3–1)", type: "number", default: 1 },
      { name: "dim", label: "Opacitet inaktiva ord", type: "number", default: 0.07 },
      { name: "startBlank", label: "Börja utan aktiv fas", type: "boolean", default: false },
      { name: "accent", label: "Accentfärg", type: "color" },
    ],
    hasContent: true,
  },
  RapidFire: {
    name: "RapidFire",
    description:
      "Kortstacken som byter av sig själv — ett kort per bygge (rubrik + en rad prompt + resultatbild + kräver-tagg), räknare och en stapel som rinner ur på `interval` sekunder. Klick byter kort för hand. Steg 1 = översikten: alla kort som rutnät. Rad: `Rubrik · prompt · bild · kräver`.",
    fields: [
      { name: "chapter", label: "Kapitel-markör", type: "text" },
      { name: "interval", label: "Sekunder per kort (0 = bara klick)", type: "number", default: 20 },
      { name: "overviewTitle", label: "Rubrik på översikten", type: "text", default: "Allt det här finns i sandlådan." },
      { name: "accent", label: "Accentfärg", type: "color" },
    ],
    hasContent: true,
  },
  GapText: {
    name: "GapText",
    description:
      "Samma text i flera grader av begriplighet (95 %-regeln upplevd): en version per rad, ett klick per version, ord som skiljer sig från sista versionen markeras i accent. Etikett per version i `labels` (åtskilda med |).",
    fields: [
      { name: "chapter", label: "Kapitel-markör", type: "text" },
      { name: "labels", label: "Etiketter per version (| mellan)", type: "text", default: "80 % kända ord | 95 % | 100 %" },
      { name: "source", label: "Källa", type: "text" },
      { name: "accent", label: "Accentfärg", type: "color" },
    ],
    hasContent: true,
  },
  PopDivider: {
    name: "PopDivider",
    description:
      "Aktdivider i fyrfärgen: jättetypografi ett ord per rad i nedre halvan, sektionsnumret som kontur, mono-metablock uppe till höger, valfria stegade rader (text :: lead|soft|land). Färg, rutnät, löpremsa, markord och klistermärke kommer från slidens register=/ticker=/mark=/figure=.",
    fields: [
      { name: "number", label: "Nummer", type: "text" },
      { name: "title", label: "Titel (ett ord per rad, **fet** = accent)", type: "text" },
      { name: "subtitle", label: "Underrubrik", type: "text" },
      { name: "kicker", label: "Metablock (| mellan rader)", type: "text" },
    ],
    hasContent: true,
  },
  PosterHero: {
    name: "PosterHero",
    description:
      "Ordet som affisch (betong): ett ord så stort att kanten skär det, figuren framför (figure= på sliden), stegade rader nere till vänster (:: l / :: r = två spalter längs underkanten). wordStyle solid|outline|melt.",
    fields: [
      { name: "word", label: "Ordet", type: "text" },
      { name: "wordStyle", label: "Stil (solid | outline | melt)", type: "text", default: "solid" },
      { name: "wordSize", label: "Storlek (vw)", type: "text" },
      { name: "kicker", label: "Liten rad ovanför ordet", type: "text" },
      { name: "chapter", label: "Kapitel (uppe vänster)", type: "text" },
      { name: "meta", label: "Meta (uppe höger, | mellan rader)", type: "text" },
    ],
    hasContent: true,
  },
  PosterDivider: {
    name: "PosterDivider",
    description:
      "Aktdividern i betong: rasterfoto (background= + halftone), konturord genom övre högra kanten, numret i accent, titel + underrubrik på ett vridet accentblock, mono-meta i hörnen, valfria stegade rader (text :: lead|soft|land).",
    fields: [
      { name: "number", label: "Nummer", type: "text" },
      { name: "title", label: "Titel (**fet** = aktens ord)", type: "text" },
      { name: "subtitle", label: "Underrubrik", type: "text" },
      { name: "word", label: "Konturordet (default: det feta)", type: "text" },
      { name: "kicker", label: "Metablock (| mellan rader)", type: "text" },
      { name: "meta", label: "Meta nere höger", type: "text" },
    ],
    hasContent: true,
  },
  EditorialColumns: {
    name: "EditorialColumns",
    description:
      "Tidningsuppslaget: numrerade spalter med linjaler, ett stort ord + en rad per spalt, valfritt foto (rad :: /bild.png). **Fett** ord = accent. Spalterna tänds klick för klick.",
    fields: [
      { name: "chapter", label: "Band vänster", type: "text" },
      { name: "lead", label: "Band höger", type: "text" },
      { name: "foot", label: "Fot vänster", type: "text" },
      { name: "footRight", label: "Fot höger", type: "text" },
    ],
    hasContent: true,
  },
  TornStack: {
    name: "TornStack",
    description:
      "Rivet papper över fotot: pappersbit med riven kant täcker vänstra halvan (background= + halftone på sliden), raderna staplade i smal massiv Archivo (stort · etikett, :: now = accent). Rivs in vid uppslag, tänds klick för klick.",
    fields: [
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "caption", label: "Bildtext (i pappret)", type: "text" },
      { name: "meta", label: "Meta nere höger (| mellan rader)", type: "text" },
      { name: "width", label: "Pappersbredd", type: "text", default: "50vw" },
    ],
    hasContent: true,
  },
  BleedStat: {
    name: "BleedStat",
    description:
      "Siffran som skärs av kanten (betong, register=rott): räknas upp vid uppslag, förklaring i spalt uppe till höger på klick, källa i mono, konturord uppe till vänster. Figur via figure= på sliden.",
    fields: [
      { name: "value", label: "Värde", type: "text" },
      { name: "unit", label: "Enhet", type: "text", default: "%" },
      { name: "text", label: "Förklaring", type: "multiline" },
      { name: "source", label: "Källa", type: "text" },
      { name: "word", label: "Konturord", type: "text" },
      { name: "chapter", label: "Kapitel (nere vänster)", type: "text" },
    ],
    hasContent: false,
  },
  ArchetypePoster: {
    name: "ArchetypePoster",
    description:
      "En arketyp som affisch (betong_natt). Nattversionen av ArchetypeProfile: numret som jättekontur, namnet med registerförskjutning, säger/döljer som två tryckta block, rasterfoto till höger. Fältet echo lägger en röst ur juli-incidenten under strecket.",
    fields: [
      { name: "number", label: "Nummer", type: "text" },
      { name: "name", label: "Arketyp", type: "text" },
      { name: "tagline", label: "En mening under namnet", type: "multiline" },
      { name: "habitat", label: "Var berättelsen bor (mono, uppe höger)", type: "text" },
      { name: "says", label: "Vad berättelsen säger", type: "multiline" },
      { name: "hides", label: "Vad berättelsen döljer", type: "multiline" },
      { name: "echo", label: "Röst ur juli-incidenten", type: "multiline" },
      { name: "echoLabel", label: "Etikett över ekot", type: "text", default: "Så lät den i juli" },
      { name: "lesson", label: "I klassrummet", type: "text" },
      { name: "image", label: "Bild", type: "text" },
      { name: "imageCaption", label: "Bildtext", type: "text" },
      { name: "sources", label: "Källrad (visas om echo saknas)", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text", default: "§ Sex berättelser" },
    ],
    hasContent: false,
  },
  DriftingNotes: {
    name: "DriftingNotes",
    description:
      "Overlay: korta meningar som flyter in en i taget över hela sliden och sedan sakta rör sig kvar. Läggs efter en slide. Raderna som punktlista: text :: x,y :: rotation.",
    fields: [
      {name: "delay", label: "Fördröjning (ms)", type: "text", default: "1200"},
      {name: "beat", label: "Mellan meningarna (ms)", type: "text", default: "1000"},
      {name: "color", label: "Textfärg", type: "text"},
      {name: "opacity", label: "Opacitet 0-1", type: "text", default: "0.6"},
      {name: "size", label: "Storlek i vw", type: "text", default: "1.5"},
    ],
    hasContent: true,
  },
  TwoAnswers: {
    name: "TwoAnswers",
    description:
      "Samma prompt, två modeller, olika svar. Steg: prompten ensam · vänsterpanelen · högerpanelen tänds · omdömen och slutrad. Raderna som punktlista med prefix L eller R.",
    fields: [
      {name: "kicker", label: "Kicker", type: "text"},
      {name: "chapter", label: "Meta uppe höger", type: "text"},
      {name: "title", label: "Rubrik", type: "text"},
      {name: "promptLabel", label: "Etikett över prompten", type: "text", default: "Prompten"},
      {name: "prompt", label: "Prompten", type: "multiline"},
      {name: "leftApp", label: "Vänster app", type: "text"},
      {name: "leftCaption", label: "Vänster datum", type: "text"},
      {name: "leftVerdict", label: "Vänster omdöme", type: "text"},
      {name: "leftMore", label: "Vänster avklippsrad", type: "text"},
      {name: "rightApp", label: "Höger app", type: "text"},
      {name: "rightCaption", label: "Höger datum", type: "text"},
      {name: "rightVerdict", label: "Höger omdöme", type: "text"},
      {name: "rightMore", label: "Höger avklippsrad", type: "text"},
      {name: "bottomLine", label: "Slutrad", type: "text"},
    ],
    hasContent: true,
  },
  TraitChats: {
    name: "TraitChats",
    description:
      "Egenskapskort till vänster, en illustrerande minikonversation till höger. Ett steg per rad; den aktiva radens chatt animeras in. Raderna som punktlista: Rubrik · Beskrivning · Du: text || AI: text.",
    fields: [
      {name: "kicker", label: "Kicker", type: "text"},
      {name: "chapter", label: "Kapitel", type: "text"},
      {name: "title", label: "Rubrik", type: "text"},
      {name: "footer", label: "Rad längst ned", type: "text"},
    ],
    hasContent: true,
  },
  StagedVoices: {
    name: "StagedVoices",
    description:
      "Röster som klickas fram en i taget, var och en med en telefon till höger som skriver fram en rekonstruerad konversation. Rad: **Avsändare:** citat :: App · HH:MM · Du: text || AI: text. Rad utan telefondel ger en mörk telefon.",
    fields: [
      {name: "kicker", label: "Kicker", type: "text"},
      {name: "title", label: "Rubrik", type: "text"},
      {name: "body", label: "Ingress", type: "text"},
      {name: "phoneX", label: "Telefon x", type: "text", default: "68.5%"},
      {name: "phoneY", label: "Telefon y", type: "text", default: "11%"},
      {name: "phoneWidth", label: "Telefon bredd", type: "text", default: "23%"},
      {name: "accent", label: "Bubbelfärg", type: "text"},
      {name: "beat", label: "ms mellan repliker", type: "text", default: "1900"},
    ],
    hasContent: true,
  },
  WordAudit: {
    name: "WordAudit",
    description:
      "Ordlistan (betong_natt): ordet, vad det antyder, vad som händer. Ett ord per klick. Raderna som punktlista: ordet · antyder · händer.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "meta", label: "Meta uppe höger", type: "text" },
      { name: "impliesLabel", label: "Kolumnrubrik 2", type: "text", default: "Vad ordet antyder" },
      { name: "actualLabel", label: "Kolumnrubrik 3", type: "text", default: "Vad som händer" },
      { name: "footer", label: "Rad längst ned", type: "text" },
    ],
    hasContent: true,
  },
  DiscourseSpread: {
    name: "DiscourseSpread",
    description:
      "En händelse, många berättelser (betong_natt). Visar en röst i taget medan en markör vandrar längs en axel mellan två poler. Rösterna som punktlista: namn, roll · sammanfattning · citat. Lägg :: 0.72 sist för manuell placering på axeln.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "event", label: "Händelsen (mono uppe höger)", type: "text" },
      { name: "poleLeft", label: "Vänster pol", type: "text", default: "Ingenting hände" },
      { name: "poleRight", label: "Höger pol", type: "text", default: "Allt förändras" },
      { name: "footer", label: "Rad under axeln", type: "text" },
    ],
    hasContent: true,
  },
  PosterQuote: {
    name: "PosterQuote",
    description:
      "Citatet som klistrad remsa (betong): vridet accentblock med citatet i papper, attribution i mono, kicker uppe till vänster. Figur via figure= på sliden.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "quote", label: "Citat", type: "multiline" },
      { name: "attribution", label: "Attribution", type: "text" },
      { name: "meta", label: "Meta uppe höger (| mellan rader)", type: "text" },
      { name: "width", label: "Bredd", type: "text", default: "60vw" },
      { name: "tilt", label: "Lutning (grader)", type: "text", default: "-3" },
    ],
    hasContent: false,
  },
  PosterCompare: {
    name: "PosterCompare",
    description:
      "Två kolumner med jättesiffror (betong): mono-rubrik per kolumn, linjal mellan, ★-raden som vriden accentremsa. Rader: Label · vänster | underrad · höger | underrad. Tänds klick för klick.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Titel (**fet** = accent)", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "text" },
      { name: "leftHeader", label: "Vänster rubrik", type: "text" },
      { name: "leftSubLabel", label: "Vänster etikett", type: "text" },
      { name: "rightHeader", label: "Höger rubrik", type: "text" },
      { name: "rightSubLabel", label: "Höger etikett", type: "text" },
      { name: "source", label: "Källa", type: "text" },
    ],
    hasContent: true,
  },
  FrictionTriage: {
    name: "FrictionTriage",
    description:
      "Friktion i tre sorter: falsk (låt AI ta den) · meningsfull (skydda den) · ny (AI tillför — designa bort). Tre kolumner som tänds per klick. Rader som children-lista: `kolumn (1|2|3) · text`.",
    fields: [
      { name: "chapter", label: "Kapitel-markör", type: "text" },
      { name: "title", label: "Titel", type: "text", default: "Friktion i tre sorter." },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "col1Label", label: "Kolumn 1 · etikett", type: "text", default: "Falsk" },
      { name: "col1Caption", label: "Kolumn 1 · underrad", type: "text", default: "Låt AI ta den" },
      { name: "col2Label", label: "Kolumn 2 · etikett", type: "text", default: "Meningsfull" },
      { name: "col2Caption", label: "Kolumn 2 · underrad", type: "text", default: "Skydda den" },
      { name: "col3Label", label: "Kolumn 3 · etikett", type: "text", default: "Ny" },
      { name: "col3Caption", label: "Kolumn 3 · underrad", type: "text", default: "AI tillför den — designa bort" },
      { name: "col1Icon", label: "Kolumn 1 · symbol (alfa-PNG)", type: "text" },
      { name: "col2Icon", label: "Kolumn 2 · symbol (alfa-PNG)", type: "text" },
      { name: "col3Icon", label: "Kolumn 3 · symbol (alfa-PNG)", type: "text" },
      { name: "iconSize", label: "Symbolhöjd", type: "text", default: "9vh" },
      { name: "landing", label: "Slutrad (landar med kolumn 3)", type: "multiline" },
      { name: "accent", label: "Accentfärg", type: "color" },
    ],
    hasContent: true,
  },
  PosterText: {
    name: "PosterText",
    description:
      "Avgångstavlan — texten ÄR bilden. Varje rad mäts och sätts så att den fyller slidens bredd; kort rad = enorm. `**fet**` → accent, `~~text~~` → kontur. Rader som children-lista eller i `lines` åtskilda med |.",
    fields: [
      { name: "kicker", label: "Kicker (mono, uppe vänster)", type: "text" },
      { name: "footnote", label: "Fotnot (mono, nere vänster)", type: "text" },
      {
        name: "lines",
        label: "Rader",
        type: "multiline",
        hint: "Åtskilj raderna med | eller radbrytning. **ord** → accent, ~~ord~~ → kontur. Lämna tomt om raderna ligger som lista mellan taggarna.",
      },
      {
        name: "fit",
        label: "Passning",
        type: "select",
        options: ["width", "uniform"],
        default: "width",
        variant: "pills",
        hint: "width: varje rad fyller bredden var för sig. uniform: alla rader i samma grad, den längsta bestämmer.",
      },
      { name: "align", label: "Justering", type: "select", options: ["left", "center"], default: "left", variant: "pills" },
      { name: "leading", label: "Radhöjd", type: "number", default: 1, hint: "1,0 default. Under 0,95 nuddar Ö-prickarna raden ovanför i affischgrad." },
      { name: "width", label: "Andel av bredden (0–1)", type: "number", default: 1 },
      { name: "stepped", label: "En rad per klick", type: "boolean", default: false },
      {
        name: "tone",
        label: "Register",
        type: "select",
        options: ["paper", "dark", "kobalt", "glod", "barnsten"],
        default: "paper",
        variant: "pills",
        hint: "paper = temats ark. dark = nattsvart→kobalt-gradient med ljus text. kobalt = massivt kobaltblock, cremevit text, svart accentord. glod = bärnsten→brunsvart med ljus text. barnsten = massivt bärnstensblock, bläck som text, kobalt som accentord.",
      },
      { name: "accent", label: "Accentfärg", type: "color" },
      { name: "background", label: "Bakgrundsbild", type: "image", hint: "Bildsökväg eller URL — t.ex. blå rök. Med tone=dark förblir texten ljus. Lämna tomt för temats ark eller registrets gradient." },
      { name: "overlay", label: "Overlay-opacity (0–1)", type: "number", hint: "Tonad film över bilden för läsbarhet." },
      { name: "overlayMode", label: "Overlay-läge", type: "select", options: ["dark", "light"], default: "dark", variant: "pills" },
    ],
    hasContent: true,
  },
  LoopStep: {
    name: "LoopStep",
    description:
      "Ett steg i en återkommande arbetsloop — ring med alla steg till vänster (aktivt steg glöder, progress-båge), stegnamn + fråga till höger. Klick 1 fäller in promptglimt + artefaktglimt. Output-rader som children-lista: `Etikett · beskrivning`.",
    fields: [
      { name: "chapter", label: "Kapitel-markör (uppe till vänster)", type: "text" },
      {
        name: "step",
        label: "Stegnummer (1-baserat)",
        type: "number",
        required: true,
        hint: "Vilket av loopens steg denna slide är.",
      },
      {
        name: "steps",
        label: "Loopens alla steg (kommaseparerade)",
        type: "text",
        default:
          "Fråga,Utmana,Omvärldsbevaka,Designa,Simulera,Prototypa,Kommunicera",
      },
      { name: "title", label: "Stegets namn (stort)", type: "text", required: true },
      { name: "question", label: "Fråga/grepp (**fet** → accent)", type: "multiline" },
      { name: "prompt", label: "Promptglimt (visas vid klick)", type: "multiline" },
      { name: "promptLabel", label: "Etikett promptkort", type: "text", default: "Prompten" },
      { name: "outputLabel", label: "Etikett artefaktkort", type: "text", default: "Ur svaret" },
      { name: "uppstuds", label: "Uppstuds-tagg (nere till höger)", type: "text" },
      {
        name: "uppstudsHref",
        label: "Länk på uppstuds-taggen (öppnas i ny flik)",
        type: "text",
        hint: "T.ex. chatten/notebooken där arbetet gjordes. Kräver inloggning i presentationsdatorns webbläsare.",
      },
      { name: "accent", label: "Accent", type: "color" },
    ],
    hasContent: true,
  },
  MultiplierStack: {
    name: "MultiplierStack",
    description:
      "Mängdskiftet som bild: ETT ensamt dokumentkort till vänster — klick delar ut SEX dokumentkort som flyger in i ett 3×2-rutnät under en tidschip, och slutraden landar. Artefakter som children-lista: `Titel · detalj` (4–6 rader).",
    fields: [
      { name: "chapter", label: "Kapitel-markör (uppe till vänster)", type: "text" },
      { name: "beforeLabel", label: "Etikett under ensamma kortet", type: "text", default: "Förr" },
      { name: "beforeTitle", label: "Titel på ensamma kortet", type: "text", default: "En analys" },
      { name: "beforeCaption", label: "Underrad på ensamma kortet", type: "text" },
      { name: "afterLabel", label: "Tidschip ovanför rutnätet", type: "text", default: "Nu · innan lunch" },
      { name: "closing", label: "Slutrad (**fet** → accent)", type: "text" },
      { name: "accent", label: "Accent", type: "color" },
    ],
    hasContent: true,
  },
  Utkast: {
    name: "Utkast",
    description:
      "PLANERINGSLAGRET — arbetsverktyg, visas aldrig för publik. Ritningsestetik med streckad ram. Skriv hela decket som utkast, läs igenom i manusläget, redigera formuleringarna, konvertera sedan en slide i taget till riktig template. Sätt `mall=\"NY: Namn\"` för en template som ska byggas — manusläget samlar alla sådana i en lista. Children = orden som faktiskt ska stå på sliden.",
    fields: [
      { name: "syfte", label: "Syfte — vad sliden gör i bågen", type: "text" },
      {
        name: "mall",
        label: "Planerad template",
        type: "text",
        hint: "Prefixa med NY: för en template som inte finns än.",
      },
      { name: "tid", label: "Uppskattad tid", type: "text" },
      {
        name: "visuell",
        label: "Visuell intention",
        type: "text",
        hint: "Hur ska den se ut? Vilken kod-fördel utnyttjas?",
      },
      { name: "kalla", label: "Källa", type: "text" },
      {
        name: "media",
        label: "Media",
        type: "text",
        hint: 'Format: "url :: hur den ska användas ;; url2 :: hur2". Redigeras enklast i manusläget, där man kan dra in och klistra in länkar.',
      },
      { name: "accent", label: "Accent", type: "color" },
    ],
    hasContent: true,
  },
  HitZone: {
    name: "HitZone",
    description:
      "Arbetsuppgifter som utspridda, gungande kort — vid klick tecknas AI:ns träffyta (streckad ellips) över ytan, kort innanför tonas i accent (geometriskt beräknat: kort nära randen får streckad kant-ram) och slutraden landar. Kort som children-lista: `Verb · detalj · x · y` (procent).",
    fields: [
      { name: "chapter", label: "Kapitel-markör (uppe till vänster)", type: "text" },
      { name: "title", label: "Rubrik (uppe till vänster)", type: "text" },
      { name: "zoneLabel", label: "Etikett på zonens rand", type: "text", default: "AI:ns träffyta" },
      { name: "closing", label: "Slutrad (**fet** → accent)", type: "text" },
      {
        name: "zone",
        label: "Zonens ellips (cx,cy,rx,ry i %)",
        type: "text",
        default: "54,46,45,42",
        hint: "Kortens status (inne/kant/ute) räknas ut ur denna geometri.",
      },
      { name: "accent", label: "Accent", type: "color" },
    ],
    hasContent: true,
  },
  DynamoFactory: {
    name: "DynamoFactory",
    description:
      "Elektrifieringsanalogin (Paul David 1990): två fabriksgolv — elmotor i gammal layout (remmar snurrar) → stat i mitten → golvet omritat med motor per maskin. Tre klicksteg.",
    fields: [
      { name: "chapter", label: "Kapitel-markör (uppe till vänster)", type: "text" },
      { name: "kicker", label: "Kicker", type: "text", default: "Paul A. David 1990" },
      {
        name: "title",
        label: "Rubrik (**fet** → accent)",
        type: "text",
        default: "Fabrikerna bytte motor. Och fick ingenting.",
      },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "leftLabel", label: "Etikett vänster panel", type: "text", default: "1895 · Ny kraft, gammal layout" },
      { name: "rightLabel", label: "Etikett höger panel", type: "text", default: "1920-tal · Golvet ritas om" },
      { name: "stat", label: "Statistik i mitten", type: "text", default: "~30 år" },
      { name: "statCaption", label: "Statistik-caption", type: "text", default: "utan mätbar produktivitetsvinst" },
      { name: "closing", label: "Slutrad (**fet** → accent)", type: "multiline" },
      { name: "source", label: "Källrad (nere till vänster)", type: "text" },
      { name: "accent", label: "Accent", type: "color" },
    ],
  },
  DualityReveal: {
    name: "DualityReveal",
    description:
      "Hero-bild (tvåpanels-serie) som växer fram och utvecklas panel för panel (staged) → landar AI:ns dualitet (genial ↔ aningslös). Mörk botten.",
    fields: [
      { name: "image", label: "Bild (tvåpanels-serie)", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      {
        name: "splitPercent",
        label: "Panel-delning (% av bildhöjden)",
        type: "text",
        default: "43",
        hint: "Var täckskärmens kant sitter (% av bildhöjden). Skrivs som STRÄNG — numeriska {expression}-props tappas i renderingsvägen.",
      },
      { name: "kicker", label: "Kicker (uppe)", type: "text" },
      { name: "brilliant", label: "Chip vänster — det geniala", type: "text" },
      { name: "clueless", label: "Chip höger — det aningslösa", type: "text" },
      { name: "payoff", label: "Payoff-rad (nederst)", type: "text" },
    ],
  },
  NeuralDissolve: {
    name: "NeuralDissolve",
    description:
      "Cinematisk divider: titeln löses upp i partiklar över ett neuralt nätverk (staged reveal). Mörk botten.",
    fields: [
      { name: "chapter", label: "Kapitel-markör (uppe till vänster)", type: "text" },
      { name: "title", label: "Titel (löses upp vid klick)", type: "text", required: true },
      { name: "subtitle", label: "Undertitel (tonar in efter upplösning)", type: "text" },
      {
        name: "accent",
        label: "Neon-accent (nätverket)",
        type: "color",
        default: "#5EE6A8",
        hint: "Ljus färg som syns på mörk botten.",
      },
    ],
  },
  EmotionsSpectrum: {
    name: "EmotionsSpectrum",
    description:
      "Fem känslor/reaktioner som kort, avtäckta i steg. Valfri full-bleed bakgrundsbild.",
    fields: [
      { name: "chapter", label: "Kapitel (uppe till höger)", type: "text" },
      { name: "kicker", label: "Kicker (uppe till vänster)", type: "text" },
      { name: "title", label: "Titel", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Full-bleed foto bakom korten. Sätter man en bild mörkas sliden (mörk overlay + ljus text) — utan bild följer den temat.",
      },
      {
        name: "overlay",
        label: "Overlay-mörker (0–1)",
        type: "number",
        default: 0.55,
        hint: "Hur mörk overlayen på bakgrundsbilden är. Endast relevant med bakgrundsbild.",
      },
    ],
    hasContent: true,
  },
  TitleSlide: {
    name: "TitleSlide",
    description: "Titelsida med titel, undertitel och meta",
    fields: [
      { name: "title", label: "Titel", type: "text", required: true },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "author", label: "Författare", type: "text" },
      { name: "event", label: "Event", type: "text" },
      { name: "date", label: "Datum", type: "text", placeholder: "2026-04-29" },
      {
        name: "titleSize",
        label: "Titel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "subtitleSize",
        label: "Undertitel-storlek",
        type: "select",
        options: ["sm", "md", "lg"],
        default: "md",
      },
    ],
  },

  GiantText: {
    name: "GiantText",
    description: "Stort uttalande. **text** blir accent-färgad.",
    fields: [
      {
        name: "align",
        label: "Justering",
        type: "select",
        options: ["left", "center"],
        default: "left",
      },
      {
        name: "size",
        label: "Textstorlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default-bakgrund.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk tonad film över bilden för läsbarhet. Default 0.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  Quote: {
    name: "Quote",
    description: "Citat med vertikal linje och attribution",
    fields: [
      { name: "attribution", label: "Avsändare", type: "text" },
      { name: "context", label: "Kontext (UPPERCASE tag)", type: "text" },
      {
        name: "size",
        label: "Citat-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  ImageText: {
    name: "ImageText",
    description: "Bild + text, split-layout",
    fields: [
      { name: "image", label: "Bild", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      {
        name: "layout",
        label: "Bildens position",
        type: "select",
        options: ["left", "right"],
        default: "left",
      },
    ],
    hasContent: true,
  },

  BulletBuild: {
    name: "BulletBuild",
    description: "Punktlista som byggs fram med steg",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "bulletSize",
        label: "Punkt-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true, // innehåller markdown-lista
  },

  SideScrollList: {
    name: "SideScrollList",
    description: "Stor blobb med siffra, scrollar in",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "blobColor", label: "Blobb-färg", type: "color" },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "pointSize",
        label: "Punkt-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  NumberedReveal: {
    name: "NumberedReveal",
    description: "Numrerad lista med pil-animation",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "itemSize",
        label: "Punkt-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  Timeline: {
    name: "Timeline",
    description: "Tidslinje med noder",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "orientation",
        label: "Riktning",
        type: "select",
        options: ["horizontal", "vertical"],
        default: "horizontal",
      },
    ],
    childrenType: "TimelineEvent",
  },

  TimelineEvent: {
    name: "TimelineEvent",
    description: "Händelse i en tidslinje",
    fields: [
      { name: "date", label: "Datum/år", type: "text", required: true, placeholder: "2023" },
      { name: "title", label: "Titel", type: "text" },
    ],
    hasContent: true,
  },

  Reflection: {
    name: "Reflection",
    description: "Reflektionsfrågor med steg",
    fields: [
      { name: "title", label: "Huvudfråga", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text", default: "Reflektion" },
      { name: "duration", label: "Duration", type: "text", placeholder: "5 min i par" },
      {
        name: "titleSize",
        label: "Huvudfråge-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "questionSize",
        label: "Fråge-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  Comparison: {
    name: "Comparison",
    description: "Två kolumner sida vid sida",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "accentSide",
        label: "Accent-sida",
        type: "select",
        options: ["left", "right", "none"],
        default: "right",
      },
    ],
    childrenType: "ComparisonColumn",
  },

  ComparisonColumn: {
    name: "ComparisonColumn",
    description: "Kolumn i en jämförelse",
    fields: [{ name: "title", label: "Kolumn-titel", type: "text", required: true }],
    hasContent: true,
  },

  StatCounter: {
    name: "StatCounter",
    description: "Animerad siffra",
    fields: [
      { name: "value", label: "Siffra", type: "number", required: true },
      { name: "suffix", label: "Suffix (t.ex. %)", type: "text" },
      { name: "prefix", label: "Prefix", type: "text" },
      { name: "label", label: "Förklarande text", type: "multiline" },
      { name: "source", label: "Källa (UPPERCASE)", type: "text" },
      { name: "decimals", label: "Antal decimaler", type: "number", default: 0 },
      { name: "duration", label: "Animationstid (sek)", type: "number", default: 1.6 },
    ],
  },

  CodeReveal: {
    name: "CodeReveal",
    description: "Kod/prompt som typas ut",
    fields: [
      { name: "language", label: "Språk", type: "text", default: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "caption", label: "Undertext", type: "text" },
      { name: "speed", label: "Hastighet (ms/tecken)", type: "number", default: 15 },
      {
        name: "mode",
        label: "Läge",
        type: "select",
        options: ["typewriter", "instant"],
        default: "typewriter",
      },
    ],
    hasContent: true,
  },

  PromptAnimation: {
    name: "PromptAnimation",
    description: "Prompt typas och resultat visas bredvid",
    fields: [
      { name: "promptText", label: "Prompt-text", type: "multiline", required: true },
      { name: "resultText", label: "Resultattext", type: "multiline" },
      {
        name: "layout",
        label: "Layout",
        type: "select",
        options: ["left", "right"],
        default: "right",
      },
      { name: "typeSpeed", label: "Typhastighet (ms)", type: "number", default: 25 },
      {
        name: "codeSnippet",
        label: "Kodexempel (valfritt)",
        type: "multiline",
        hint: "Visas mellan prompt och resultat. Lämna tomt för att hoppa över.",
      },
    ],
  },

  HeroImage: {
    name: "HeroImage",
    description: "Full-bild bakgrund med text-overlay",
    fields: [
      { name: "src", label: "Bild", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      {
        name: "align",
        label: "Textposition",
        type: "select",
        options: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
        default: "bottom-left",
      },
      {
        name: "gradient",
        label: "Gradient-riktning",
        type: "select",
        options: ["top", "bottom", "left", "right", "none"],
        default: "bottom",
      },
      { name: "overlay", label: "Mörker-opacity (0-1)", type: "number", default: 0.35 },
      { name: "blur", label: "Blurra bild", type: "boolean" },
    ],
    hasContent: true,
  },

  LayeredText: {
    name: "LayeredText",
    description: "Text + urklippt subjekt (PNG rekommenderas)",
    fields: [
      { name: "image", label: "Bild", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      {
        name: "imagePosition",
        label: "Bildposition",
        type: "select",
        options: ["left", "right", "center"],
        default: "right",
      },
      { name: "imageSize", label: "Storlek (%)", type: "number", default: 85 },
      { name: "background", label: "Bakgrundsfärg", type: "color" },
      { name: "textColor", label: "Textfärg", type: "color" },
      { name: "textInFront", label: "Text framför bild", type: "boolean" },
    ],
    hasContent: true,
  },

  ImageBleed: {
    name: "ImageBleed",
    description: "Bild spiller ut i hörn med rotation",
    fields: [
      { name: "image", label: "Bild", type: "image", required: true },
      {
        name: "corner",
        label: "Hörn",
        type: "select",
        options: ["top-right", "bottom-right", "top-left", "bottom-left"],
        default: "top-right",
      },
      { name: "size", label: "Storlek (%)", type: "number", default: 55 },
      { name: "rotate", label: "Rotation (grader)", type: "number", default: 0 },
    ],
    hasContent: true,
  },

  Collage: {
    name: "Collage",
    description: "Flera bilder i rutnät",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "images", label: "Bilder (komma-separerat)", type: "multiline", required: true },
      {
        name: "layout",
        label: "Layout",
        type: "select",
        options: ["grid-2", "grid-3", "grid-4", "grid-5-hero", "auto"],
        default: "auto",
      },
    ],
  },

  PictureQuote: {
    name: "PictureQuote",
    description: "Citat med porträttbild",
    fields: [
      { name: "image", label: "Porträttbild", type: "image", required: true },
      { name: "attribution", label: "Namn", type: "text", required: true },
      { name: "context", label: "Kontext (UPPERCASE)", type: "text" },
      {
        name: "imagePosition",
        label: "Bildposition",
        type: "select",
        options: ["left", "right"],
        default: "left",
      },
      {
        name: "size",
        label: "Citat-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  VideoEmbed: {
    name: "VideoEmbed",
    description: "Inbäddad video",
    fields: [
      { name: "src", label: "Video-URL/path", type: "text", required: true },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "caption", label: "Undertext", type: "text" },
      { name: "autoplay", label: "Autoplay", type: "boolean" },
      { name: "loop", label: "Loop", type: "boolean" },
      { name: "muted", label: "Muted", type: "boolean" },
      {
        name: "aspectRatio",
        label: "Aspect ratio",
        type: "select",
        options: ["16/9", "4/3", "1/1", "9/16"],
        default: "16/9",
      },
    ],
  },

  VideoBackground: {
    name: "VideoBackground",
    description: "Video som bakgrund",
    fields: [
      { name: "src", label: "Video-path", type: "text", required: true },
      {
        name: "align",
        label: "Textposition",
        type: "select",
        options: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
        default: "bottom-left",
      },
      {
        name: "gradient",
        label: "Gradient",
        type: "select",
        options: ["top", "bottom", "left", "right", "none"],
        default: "bottom",
      },
      { name: "overlay", label: "Mörker-opacity", type: "number", default: 0.4 },
      { name: "blur", label: "Blurra video", type: "boolean" },
      { name: "paused", label: "Pausad", type: "boolean", hint: "Stanna första rutan" },
    ],
    hasContent: true,
  },

  SlideshowMorph: {
    name: "SlideshowMorph",
    description: "Bildmorfning mellan flera bilder",
    fields: [
      { name: "images", label: "Bilder (komma-separerat)", type: "multiline", required: true },
      { name: "captions", label: "Rubriker (komma-separerat)", type: "multiline" },
      {
        name: "morph",
        label: "Morfning",
        type: "select",
        options: ["crossfade", "scale", "slide", "zoom-blur"],
        default: "crossfade",
      },
      { name: "showCounter", label: "Visa räknare", type: "boolean", default: true },
      {
        name: "autoPlay",
        label: "Auto-play (sekunder per bild)",
        type: "number",
        hint: "Lämna tomt för manuell stegning",
      },
    ],
  },

  GiantScroll: {
    name: "GiantScroll",
    description: "Gigantisk text som rullar",
    fields: [
      { name: "text", label: "Text", type: "text", required: true },
      {
        name: "direction",
        label: "Riktning",
        type: "select",
        options: ["left", "right"],
        default: "left",
      },
      {
        name: "secondsPerInstance",
        label: "Sekunder per instans",
        type: "number",
        default: 30,
        hint: "Högre = lugnare tempo. 30-60 är lagom.",
      },
      { name: "heightRatio", label: "Höjd (0-1)", type: "number", default: 0.66 },
      { name: "loop", label: "Oändlig loop", type: "boolean", default: true },
      { name: "color", label: "Färg", type: "color" },
      { name: "outline", label: "Endast kontur", type: "boolean" },
    ],
  },

  LayeredScroll: {
    name: "LayeredScroll",
    description: "Bakgrund + rullande ord + objekt framför (editorial moment)",
    fields: [
      { name: "text", label: "Highlight-ord", type: "text", required: true },
      { name: "bgImage", label: "Bakgrundsbild (URL)", type: "text" },
      { name: "bgColor", label: "Bakgrundsfärg (om ingen bild)", type: "color" },
      { name: "foregroundImage", label: "Objektbild (transparent PNG)", type: "text" },
      { name: "foregroundAlt", label: "Alt-text objekt", type: "text" },
      {
        name: "foregroundHeightRatio",
        label: "Objektets höjd (0-1)",
        type: "number",
        default: 0.75,
      },
      { name: "textColor", label: "Textfärg", type: "color", default: "#1a1a1a" },
      {
        name: "direction",
        label: "Riktning",
        type: "select",
        options: ["left", "right"],
        default: "left",
      },
      {
        name: "secondsPerInstance",
        label: "Sekunder per instans",
        type: "number",
        default: 22,
        hint: "Högre = lugnare tempo",
      },
      { name: "heightRatio", label: "Textens höjd (0-1)", type: "number", default: 0.55 },
      {
        name: "fontStyle",
        label: "Font-style",
        type: "select",
        options: ["italic", "normal"],
        default: "italic",
      },
      { name: "loop", label: "Oändlig loop", type: "boolean", default: true },
    ],
  },

  ParticleField: {
    name: "ParticleField",
    description: "Canvas-baserat partikelsystem",
    fields: [
      { name: "count", label: "Antal partiklar", type: "number", default: 600 },
      {
        name: "formations",
        label: "Formations (komma-sep)",
        type: "text",
        hint: "scatter, circle, square, cross, heart, wave, spiral",
      },
      { name: "color", label: "Färg", type: "color" },
      { name: "size", label: "Storlek (px)", type: "number", default: 2.5 },
    ],
  },

  LoadingSlide: {
    name: "LoadingSlide",
    description: "Loading-indikator",
    fields: [
      {
        name: "variant",
        label: "Variant",
        type: "select",
        options: ["spinner", "dots", "pulse", "progress", "orbit"],
        default: "spinner",
      },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Undertext", type: "multiline" },
    ],
  },

  PollQuestion: {
    name: "PollQuestion",
    description: "Interaktiv flervalsfråga",
    fields: [
      { name: "question", label: "Frågan", type: "multiline", required: true },
      { name: "options", label: "Alternativ (komma-sep)", type: "multiline", required: true },
      {
        name: "results",
        label: "Resultat (%, komma-sep)",
        type: "text",
        placeholder: "5, 15, 55, 25",
      },
      { name: "correct", label: "Rätt alternativ (0-indexerat)", type: "number" },
      { name: "reveal", label: "Reveal-text", type: "multiline" },
    ],
  },

  SectionDivider: {
    name: "SectionDivider",
    description: "Avsnittsövergång",
    fields: [
      { name: "number", label: "Nummer (01, 02...)", type: "text" },
      { name: "title", label: "Titel", type: "text", required: true },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "duration", label: "Duration", type: "text", placeholder: "30 min" },
      {
        name: "variant",
        label: "Variant",
        type: "select",
        options: ["centered", "left", "hero"],
        default: "centered",
      },
      {
        name: "titleSize",
        label: "Titel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "subtitleSize",
        label: "Undertitel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
  },

  Callout: {
    name: "Callout",
    description: "Uppmärksamhetsruta med ikon",
    fields: [
      {
        name: "variant",
        label: "Variant",
        type: "select",
        options: ["info", "insight", "warning", "success", "quote", "danger"],
        default: "insight",
      },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      { name: "title", label: "Titel", type: "text" },
      { name: "preHeading", label: "För-rubrik", type: "text" },
      {
        name: "titleSize",
        label: "Titel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "bodySize",
        label: "Brödtext-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  VoiceCollage: {
    name: "VoiceCollage",
    description: "Grid av korta citat - röster från fältet",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  EmotionRow: {
    name: "EmotionRow",
    description: "Rad med färgade kategori-pills (emojis + label)",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "stepped",
        label: "Stega fram en i taget",
        type: "boolean",
        hint: "Space/pil triggar nästa kategori",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  BeforeAfter: {
    name: "BeforeAfter",
    description: "Prompt + faktiskt resultat (bild/video/text) sida vid sida",
    fields: [
      { name: "promptText", label: "Prompt-text", type: "multiline", required: true },
      { name: "promptLabel", label: "Prompt-etikett", type: "text", default: "Prompt" },
      { name: "resultImage", label: "Resultat (bild)", type: "image" },
      { name: "resultVideo", label: "Resultat (video-path)", type: "text" },
      { name: "resultText", label: "Resultat (text)", type: "multiline" },
      { name: "resultLabel", label: "Resultat-etikett", type: "text", default: "Resultat" },
      { name: "resultCaption", label: "Resultat-caption", type: "text" },
      {
        name: "layout",
        label: "Layout",
        type: "select",
        options: ["row", "column"],
        default: "row",
      },
      { name: "typeSpeed", label: "Typhastighet (ms)", type: "number", default: 20 },
    ],
  },

  Outro: {
    name: "Outro",
    description: "Avslutnings-slide med tack/kontakt/QR-kod",
    fields: [
      { name: "title", label: "Rubrik", type: "text", default: "Tack" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "email", label: "E-post", type: "text" },
      { name: "web", label: "Webbadress", type: "text" },
      { name: "socials", label: "Sociala medier", type: "text" },
      { name: "qrUrl", label: "URL för QR-kod", type: "text" },
      { name: "qrCaption", label: "QR-caption", type: "text" },
      { name: "cta", label: "Call-to-action", type: "text" },
      {
        name: "titleSize",
        label: "Titel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "lg",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
  },

  StatCompare: {
    name: "StatCompare",
    description: "Två siffror i relation med pil (tex 3% → 68%)",
    fields: [
      { name: "from", label: "Från (siffra)", type: "number", required: true },
      { name: "fromPrefix", label: "Från-prefix", type: "text" },
      { name: "fromSuffix", label: "Från-suffix (tex %)", type: "text" },
      { name: "fromLabel", label: "Från-etikett (tex 2022)", type: "text" },
      { name: "to", label: "Till (siffra)", type: "number", required: true },
      { name: "toPrefix", label: "Till-prefix", type: "text" },
      { name: "toSuffix", label: "Till-suffix", type: "text" },
      { name: "toLabel", label: "Till-etikett", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "caption", label: "Caption (förklarar statistiken)", type: "multiline" },
      { name: "duration", label: "Animationstid (s)", type: "number", default: 1.8 },
      { name: "decimals", label: "Decimaler", type: "number", default: 0 },
    ],
  },

  Passage: {
    name: "Passage",
    description: "Långform text med highlights (**fet** = accent)",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      {
        name: "align",
        label: "Justering",
        type: "select",
        options: ["left", "center"],
        default: "left",
      },
      {
        name: "width",
        label: "Bredd",
        type: "select",
        options: ["narrow", "wide"],
        default: "narrow",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "textSize",
        label: "Text-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  MapPins: {
    name: "MapPins",
    description: "Karta med animerade pins på angivna koordinater",
    fields: [
      { name: "mapImage", label: "Karta (bild)", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "stepped",
        label: "Stega fram en pin i taget",
        type: "boolean",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  VideoChapters: {
    name: "VideoChapters",
    description: "Video med klickbara tidsmarkörer i sidopanel",
    fields: [
      { name: "src", label: "Video-path", type: "text", required: true },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "autoPlay", label: "Autoplay", type: "boolean", default: true },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  HotspotImage: {
    name: "HotspotImage",
    description: "Bild med klickbara/stegbara hotspots som visar tooltip",
    fields: [
      { name: "src", label: "Bild", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      {
        name: "stepped",
        label: "Stega fram med space",
        type: "boolean",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  AiConversation: {
    name: "AiConversation",
    description: "Simulerad chatt-dialog - meddelanden typas fram med typing-indikator",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      { name: "userLabel", label: "Användaretikett", type: "text", default: "Du" },
      { name: "aiLabel", label: "AI-etikett", type: "text", default: "AI" },
      {
        name: "stepped",
        label: "Stega fram med space",
        type: "boolean",
        hint: "Annars auto-play",
      },
      {
        name: "userSpeed",
        label: "User-typhastighet (ms)",
        type: "number",
        default: 8,
      },
      {
        name: "aiSpeed",
        label: "AI-typhastighet (ms)",
        type: "number",
        default: 12,
      },
      {
        name: "thinkingDelay",
        label: "AI tänker (ms)",
        type: "number",
        default: 700,
      },
      {
        name: "betweenDelay",
        label: "Paus mellan meddelanden (ms)",
        type: "number",
        default: 500,
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  BrandIntro: {
    name: "BrandIntro",
    description: "Logo-dominerande öppnings-/avslutsslide med tagline och meta",
    fields: [
      { name: "logo", label: "Logo (path)", type: "image", required: true },
      { name: "alt", label: "Alt-text", type: "text" },
      {
        name: "logoHeight",
        label: "Logo-höjd (vh)",
        type: "number",
        default: 28,
        hint: "Procent av slide-höjd",
      },
      { name: "tagline", label: "Tagline", type: "multiline" },
      { name: "eyebrow", label: "Eyebrow (UPPERCASE)", type: "text" },
      { name: "meta", label: "Meta-rad i botten (UPPERCASE)", type: "text" },
      {
        name: "background",
        label: "Bakgrundsstil",
        type: "select",
        options: ["solid", "radial", "split"],
        default: "radial",
        variant: "pills",
      },
      { name: "bgColor", label: "Bakgrundsfärg (override)", type: "color" },
    ],
    hasContent: true,
  },

  BigStat: {
    name: "BigStat",
    description: "Editorial chock-siffra med kontext ovanför, under och källa",
    fields: [
      { name: "value", label: "Siffra", type: "number", required: true },
      { name: "prefix", label: "Prefix", type: "text" },
      { name: "suffix", label: "Suffix (tex %)", type: "text" },
      { name: "eyebrow", label: "Eyebrow (UPPERCASE)", type: "text" },
      { name: "contextAbove", label: "Kontext ovanför", type: "multiline" },
      { name: "contextBelow", label: "Kontext under", type: "multiline" },
      { name: "source", label: "Källa (UPPERCASE)", type: "text" },
      {
        name: "duration",
        label: "Animationstid (s)",
        type: "number",
        default: 2,
      },
      { name: "decimals", label: "Decimaler", type: "number", default: 0 },
      {
        name: "layout",
        label: "Layout",
        type: "select",
        options: ["editorial", "centered", "frame"],
        default: "editorial",
        variant: "pills",
      },
      { name: "color", label: "Sifferfärg (override)", type: "color" },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
  },

  ChatPreview: {
    name: "ChatPreview",
    description: "Mockad chattwidget i faux browser-frame bredvid text",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      { name: "description", label: "Beskrivning under titeln", type: "multiline" },
      { name: "widgetName", label: "Widget-namn", type: "text", default: "Chatt" },
      {
        name: "widgetStatus",
        label: "Widget-status",
        type: "text",
        default: "Online nu",
      },
      { name: "widgetAccent", label: "Widget-accent (override)", type: "color" },
      {
        name: "chatPosition",
        label: "Chatt-position",
        type: "select",
        options: ["left", "right"],
        default: "right",
        variant: "pills",
      },
      {
        name: "autoplay",
        label: "Spela upp automatiskt",
        type: "boolean",
        default: true,
      },
      {
        name: "beat",
        label: "Paus mellan meddelanden (ms)",
        type: "number",
        default: 900,
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  MetricGrid: {
    name: "MetricGrid",
    description: "Rutnät av metric-cards (dashboards, vinster, KPI:er) med stagger-reveal",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      {
        name: "columns",
        label: "Kolumner",
        type: "number",
        hint: "Lämna tomt för auto (2/3/4 baserat på antal items)",
      },
      {
        name: "variant",
        label: "Variant",
        type: "select",
        options: ["card", "minimal", "dashboard"],
        default: "card",
        variant: "pills",
      },
      {
        name: "stagger",
        label: "Stagger mellan items (ms)",
        type: "number",
        default: 80,
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  TierStack: {
    name: "TierStack",
    description: "Stigande accent-nivåer (samtycke, severity, Bloom-stege)",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      { name: "description", label: "Beskrivning", type: "multiline" },
      {
        name: "orientation",
        label: "Riktning",
        type: "select",
        options: ["horizontal", "vertical"],
        default: "horizontal",
        variant: "pills",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    hasContent: true,
  },

  TeamIntro: {
    name: "TeamIntro",
    description:
      "Founder/team-presentation med video- eller bild-bakgrund, gradient för läsbarhet och glassmorphism-kort per medlem",
    fields: [
      {
        name: "background",
        label: "Bakgrund (video-path eller bild)",
        type: "text",
        required: true,
      },
      {
        name: "backgroundType",
        label: "Bakgrundstyp",
        type: "select",
        options: ["video", "image"],
        default: "video",
        variant: "pills",
      },
      { name: "title", label: "Stor titel (UPPERCASE)", type: "text", required: true },
      { name: "eyebrow", label: "Eyebrow (UPPERCASE)", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      {
        name: "gradient",
        label: "Gradient",
        type: "select",
        options: ["both", "top", "bottom", "center", "none"],
        default: "both",
        variant: "pills",
      },
      {
        name: "overlay",
        label: "Bakgrunds-mörkning (0–1)",
        type: "number",
        default: 0.35,
      },
      {
        name: "columns",
        label: "Kolumner",
        type: "number",
        hint: "Lämna tomt för auto",
      },
      {
        name: "titleSize",
        label: "Titel-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "lg",
      },
    ],
    childrenType: "slot",
  },

  SpotlightContrast: {
    name: "SpotlightContrast",
    description:
      "Två kort där det andra (hero) växer och stjäl scenen i steg 2 — perfekt för 'A vs B där B är hjälten'",
    fields: [
      { name: "title", label: "Rubrik", type: "text" },
      { name: "tag", label: "Tag (UPPERCASE)", type: "text" },
      {
        name: "hero",
        label: "Hjälte-position",
        type: "select",
        options: ["left", "right"],
        default: "right",
        variant: "pills",
      },
      {
        name: "intensity",
        label: "Storleksskillnad",
        type: "select",
        options: ["subtle", "balanced", "dramatic"],
        default: "balanced",
        variant: "pills",
      },
      {
        name: "titleSize",
        label: "Rubrik-storlek",
        type: "select",
        options: ["sm", "md", "lg", "xl"],
        default: "md",
      },
    ],
    childrenType: "slot",
  },

  GameReveal: {
    name: "GameReveal",
    description:
      "AI-bygger-spel-reveal. Steg 0: kod-regn med prompten överst. Steg 1: kod-regnet dimmas och spel-iframe pop:as in centrerat med 'Detta spel'-rubrik (interaktion låst). Steg 2: iframe får full fokus — du kan klicka och spela.",
    fields: [
      { name: "prompt", label: "Prompt (visas i steg 0)", type: "multiline" },
      {
        name: "src",
        label: "Spel-URL (iframe)",
        type: "text",
        required: true,
        placeholder: "/spel/moonrex.html",
      },
      { name: "gameTitle", label: "Spelets visningsnamn", type: "text", placeholder: "MoonRex" },
      { name: "credit", label: "Krediteringsrad", type: "text", placeholder: "Byggt med claude.ai" },
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "accent", label: "Accent-färg (rosa)", type: "color", default: "#EF4F8F" },
      { name: "accent2", label: "Sekundär accent (cyan)", type: "color", default: "#22D3EE" },
    ],
  },

  SentencePredictor: {
    name: "SentencePredictor",
    description:
      "Visa hur en språkmodell rankar fortsättningar. Prefix står i svart med pulserande '...' — klassen gissar muntligt. Klick (space) avslöjar AI:ns top-N fortsättningar i rosa, en åt gången, med animerad sannolikhets-bar. Format per rad i INNEHÅLL: 'Prefix... · Option 1 (34%), Option 2 (22%), Option 3 (15%)'.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      {
        name: "predictionsLabel",
        label: "Predictions-label",
        type: "text",
        default: "AI:n gissar",
        hint: "Texten ovanför fortsättnings-korten.",
      },
      {
        name: "size",
        label: "Prefix-storlek",
        type: "select",
        options: ["lg", "xl", "2xl"],
        default: "xl",
        variant: "pills",
      },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
    hasContent: true,
  },

  SentenceSlot: {
    name: "SentenceSlot",
    description:
      "Mening med ett ord som roterar i en slot, t.ex. 'Det var en ___'. Två lägen: (1) Single — fyll i prefix + words. (2) Multi — lämna prefix/words tomma och skriv flera meningar i INNEHÅLL, en per markdown-punkt i formatet 'Prefix · ord1, ord2, ord3'. Klick (space) byter mening i multi-läget.",
    fields: [
      {
        name: "prefix",
        label: "Prefix (single-läge)",
        type: "text",
        placeholder: "Det var en",
        hint: "Lämna tomt om du använder multi-läge via INNEHÅLL.",
      },
      {
        name: "words",
        label: "Ord som roterar (single-läge)",
        type: "text",
        placeholder: "gång, gammal, pojke, prinsessa",
        hint: "Comma-separerade. Lämna tomt om du använder multi-läge.",
      },
      {
        name: "suffix",
        label: "Suffix (single-läge)",
        type: "text",
        hint: "Valfri text efter slotten.",
      },
      {
        name: "interval",
        label: "Ord-byte-intervall (ms)",
        type: "number",
        default: 1800,
      },
      {
        name: "size",
        label: "Textstorlek",
        type: "select",
        options: ["lg", "xl", "2xl"],
        default: "xl",
        variant: "pills",
      },
      { name: "centered", label: "Centrera vertikalt", type: "boolean", default: true },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
        variant: "pills",
      },
    ],
    hasContent: true,
  },

  IdeaGrid: {
    name: "IdeaGrid",
    description:
      "Memphis-trogen idé-grid med stora nummer per kort. Innehåll: en markdown-punkt per idé i formatet 'Titel · Beskrivning'. Prefix ★ markerar climax-kort.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "bottomLine", label: "Avslutande rad", type: "text" },
      { name: "who", label: "Vem bär (Eleven / Jag …)", type: "text", default: "Eleven" },
      {
        name: "columns",
        label: "Antal kolumner",
        type: "number",
        hint: "Lämna tomt för auto baserat på antal items.",
      },
      {
        name: "contentMaxWidth",
        label: "Content-bredd",
        type: "text",
        placeholder: "62%",
        hint: "Begränsa innehållet — frigör utrymme till höger för overlays (FloatingImage/Video).",
      },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text", placeholder: "0.3" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
    hasContent: true,
  },

  ChatMockup: {
    name: "ChatMockup",
    description:
      "Telefon-stylad chattmockup. Children är meddelanden, en rad per meddelande: **Avsändare:** Text. Prefix L eller R i split-mode för vänster/höger fönster.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "bottomLine", label: "Avslutande rad", type: "text" },
      {
        name: "split",
        label: "Split-läge (två chats sida-vid-sida)",
        type: "boolean",
      },
      { name: "app", label: "App-namn (single-mode)", type: "text" },
      { name: "leftApp", label: "Vänster app-namn (split)", type: "text" },
      { name: "leftCaption", label: "Vänster caption", type: "text" },
      { name: "rightApp", label: "Höger app-namn (split)", type: "text" },
      { name: "rightCaption", label: "Höger caption", type: "text" },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
    hasContent: true,
  },

  SpotTheAI: {
    name: "SpotTheAI",
    description:
      "Multi-round quiz: AI eller riktig? Varje rad är en runda i formatet 'AI/RIKTIG · /bild-eller-video · Caption · Reveal-text'. Bilder och videos (.mp4/.webm/.mov) stöds.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "bottomLine", label: "Avslutande rad", type: "text" },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
    hasContent: true,
  },

  Tankartrappan: {
    name: "Tankartrappan",
    description:
      "Pedagogisk trapp-modell 'Jag → AI → Jag → Iterera'. Använder default-stegen om inga 'steps' anges.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "multiline" },
      { name: "bottomLine", label: "Avslutande rad", type: "text" },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
  },

  PromptVsPrompt: {
    name: "PromptVsPrompt",
    description:
      "Jämför två promptar sida-vid-sida med typewriter-animation. Visar effekten (pil-tag) under varje prompt.",
    fields: [
      { name: "eyebrow", label: "Eyebrow (UPPERCASE tag)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "bottomLine", label: "Avslutande rad", type: "text" },
      { name: "leftLabel", label: "Vänster label", type: "text" },
      { name: "leftPrompt", label: "Vänster prompt", type: "multiline" },
      { name: "leftEffect", label: "Vänster effekt-tag", type: "text" },
      { name: "rightLabel", label: "Höger label", type: "text" },
      { name: "rightPrompt", label: "Höger prompt", type: "multiline" },
      { name: "rightEffect", label: "Höger effekt-tag", type: "text" },
      {
        name: "typingSpeed",
        label: "Typing-hastighet (ms per tecken)",
        type: "number",
        default: 28,
      },
      {
        name: "rightDelay",
        label: "Höger-fördröjning (sek)",
        type: "number",
      },
      { name: "background", label: "Bakgrund (URL/CSS)", type: "text" },
      { name: "overlay", label: "Overlay-opacitet", type: "text" },
      {
        name: "overlayMode",
        label: "Overlay-läge",
        type: "select",
        options: ["dark", "light"],
        default: "light",
        variant: "pills",
      },
    ],
  },

  Narration: {
    name: "Narration",
    description:
      "Berättartext där varje paragraf (åtskild med tomrad) fadar in som en mening. Bra för dramatiska öppningar.",
    fields: [
      { name: "kicker", label: "Kicker (uppe vänster)", type: "text" },
      { name: "chapter", label: "Kapitel (uppe höger)", type: "text" },
      {
        name: "align",
        label: "Justering",
        type: "select",
        options: ["left", "right", "center"],
        default: "left",
      },
      {
        name: "size",
        label: "Textstorlek",
        type: "select",
        options: ["sm", "md", "lg"],
        default: "md",
      },
      { name: "ornament", label: "Visa ornament-linje", type: "boolean" },
      {
        name: "pause",
        label: "Paus mellan meningar (sek)",
        type: "number",
        default: 0.9,
      },
      {
        name: "typewriter",
        label: "Skrivmaskinseffekt",
        type: "boolean",
        hint: "Texten typas fram tecken-för-tecken med blinkande caret.",
      },
      {
        name: "speed",
        label: "Hastighet (ms/tecken)",
        type: "number",
        default: 35,
        hint: "Endast vid skrivmaskinseffekt. Lägre = snabbare. ~25 = snabb, ~50 = långsam.",
      },
      { name: "attribution", label: "Avsändare", type: "text" },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  CaseQuote: {
    name: "CaseQuote",
    description:
      "Editorial profil-citat för spegel-moment. Profile-beats (staccato) → kontext → citat (korall-röd, dominant) → översättning → attribution → källa.",
    fields: [
      { name: "kicker", label: "Kicker (uppe vänster)", type: "text" },
      { name: "chapter", label: "Kapitel (uppe höger)", type: "text" },
      {
        name: "context",
        label: "Kontextstycke",
        type: "multiline",
        hint: "Sekundärtext under profile-beats, kursiv. Beskriver vad som hände — 2–3 rader.",
      },
      {
        name: "quote",
        label: "Citat (engelska, dominant)",
        type: "multiline",
        required: true,
      },
      {
        name: "quoteTranslation",
        label: "Översättning (svenska)",
        type: "multiline",
        hint: "Visas mindre och kursivt under huvudcitatet.",
      },
      {
        name: "attribution",
        label: "Avsändare",
        type: "text",
        placeholder: "ChatGPT till Eugene Torres · juni 2025",
      },
      {
        name: "source",
        label: "Källa (nere höger)",
        type: "text",
        placeholder: "Kashmir Hill · The New York Times · 13 juni 2025",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  JagAIJagCircles: {
    name: "JagAIJagCircles",
    description:
      "Tre cirklar: Jag → AI → Jag. Alla värden har defaults — fyll bara i det du vill ändra.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "tagline", label: "Tagline under cirklarna", type: "multiline" },
      { name: "firstLabel", label: "Första cirkel — label", type: "text", default: "Jag" },
      { name: "firstSubtitle", label: "Första cirkel — underrubrik", type: "text" },
      {
        name: "firstQuestions",
        label: "Första cirkel — frågor",
        type: "multiline",
        hint: "Separera med · (mittenpunkt)",
      },
      { name: "middleLabel", label: "AI-cirkel — label", type: "text", default: "AI" },
      { name: "middleSubtitle", label: "AI-cirkel — underrubrik", type: "text" },
      {
        name: "middleQuestions",
        label: "AI-cirkel — frågor",
        type: "multiline",
        hint: "Separera med · (mittenpunkt)",
      },
      { name: "lastLabel", label: "Sista cirkel — label", type: "text", default: "Jag" },
      { name: "lastSubtitle", label: "Sista cirkel — underrubrik", type: "text" },
      {
        name: "lastQuestions",
        label: "Sista cirkel — frågor",
        type: "multiline",
        hint: "Separera med · (mittenpunkt)",
      },
    ],
  },

  AnnotatedChat: {
    name: "AnnotatedChat",
    description:
      "Chatt-mockup där delar av AI-svaret markeras med numrerade förklaringar. Innehåll: markdown-lista i formatet `- HIGHLIGHT_TEXT · FÖRKLARING`.",
    fields: [
      {
        name: "tone",
        label: "Markeringarnas färg",
        type: "text",
        default: "alert",
        hint: '"alert" = signal-röd (blottläggning). "accent" = temats accent, för deck utan alerts.',
      },
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "userMessage",
        label: "Användarens meddelande",
        type: "multiline",
        required: true,
      },
      {
        name: "aiMessage",
        label: "AI:ns svar",
        type: "multiline",
        required: true,
        hint: "Highlight-texterna nedan måste vara exakta substrings i detta svar",
      },
      { name: "footer", label: "Footer-text (källa/kommentar)", type: "text" },
    ],
    hasContent: true,
  },

  BookQuote: {
    name: "BookQuote",
    description:
      "Citat som ett bokuppslag — lugn fade-in, klassisk italic. Använd \\n i citatet för radbryt.",
    fields: [
      { name: "kicker", label: "Kicker (källa/datum)", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "quote",
        label: "Citat",
        type: "multiline",
        required: true,
        hint: "\\n ger radbryt",
      },
      { name: "attribution", label: "Avsändare", type: "text" },
      {
        name: "variant",
        label: "Stämpel",
        type: "select",
        options: ["default", "alert"],
        default: "default",
        hint: "alert = röd-tonat för blottande citat",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
  },

  CrossedQuestion: {
    name: "CrossedQuestion",
    description:
      "Stor fråga med diagonalt rött streck över — pivot-momentet där frågan visas vara fel.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "question",
        label: "Frågan som ska 'krossas'",
        type: "multiline",
        required: true,
      },
      {
        name: "correction",
        label: "Korrigerande text",
        type: "text",
        default: "Fel fråga.",
      },
      {
        name: "newQuestion",
        label: "Ny fråga som ersätter (valfritt)",
        type: "multiline",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
  },

  CompareCriteria: {
    name: "CompareCriteria",
    description:
      "Bokuppslag-jämförelse mellan 'var' och 'är också'. Innehåll: markdown-lista i formatet `- VÄNSTER_TEXT | HÖGER_TEXT`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "leftTitle",
        label: "Vänster spalt — rubrik",
        type: "text",
        required: true,
      },
      {
        name: "rightTitle",
        label: "Höger spalt — rubrik",
        type: "text",
        required: true,
      },
    ],
    hasContent: true,
  },

  TwoLensesFlow: {
    name: "TwoLensesFlow",
    description:
      "Tre rader som leder mot en 'landning'. Innehåll: markdown-lista i formatet `- ANTECEDENT → CONSEQUENT`. Sista raden får extra vikt.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
    ],
    hasContent: true,
  },

  PhoneFeedReveal: {
    name: "PhoneFeedReveal",
    description:
      "Stiliserad smartphone med stegvis feed-reveal. Innehåll: markdown-lista i formatet `- SRC · CAPTION · KIND · TAG` (KIND = image|video).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Källkritik i AI-eran",
      },
      { name: "subtitle", label: "Underrubrik / kontext", type: "multiline" },
    ],
    hasContent: true,
  },

  TonalityQuestion: {
    name: "TonalityQuestion",
    description:
      "Stor central provocerande fråga som hängs i tystnad. Eventuell uppföljande tagline efter paus.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "question",
        label: "Stor central fråga",
        type: "multiline",
        required: true,
      },
      {
        name: "followUp",
        label: "Uppföljande tagline (efter paus)",
        type: "multiline",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
  },

  MindMechanisms: {
    name: "MindMechanisms",
    description:
      "Numrerad lista av psykologiska bias-mekanismer i bokuppslag-stil. Innehåll: markdown-lista i formatet `- NAMN — BESKRIVNING` (stöder både — och -).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "prefix", label: "Övergripande prefix/rubrik", type: "text" },
    ],
    hasContent: true,
  },

  BiasInAction: {
    name: "BiasInAction",
    description:
      "Bias-lista till vänster + telefon med chat-exempel till höger. Stegas fram. Innehåll: markdown-lista i formatet `- NAMN · BESKRIVNING · user:MSG | ai:MSG | user:MSG | ai:MSG`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "prefix", label: "Övergripande prefix-rubrik", type: "text" },
    ],
    hasContent: true,
  },

  LonelyTeenChat: {
    name: "LonelyTeenChat",
    description:
      "Chatt-mockup för sårbart scenario — användarmeddelandet typas fram, AI-svar markeras rött. Innehåll: markdown-lista i formatet `- HIGHLIGHT_TEXT · FÖRKLARING`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "context",
        label: "Kontext-text (under telefon i steg 1)",
        type: "multiline",
      },
      {
        name: "userMessage",
        label: "Användarens meddelande",
        type: "multiline",
        required: true,
      },
      {
        name: "aiMessage",
        label: "AI:ns svar",
        type: "multiline",
        required: true,
        hint: "Highlight-texterna nedan måste vara exakta substrings i detta svar",
      },
      { name: "footer", label: "Footer-text (visas i steg 2)", type: "text" },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  ConsequenceTimeline: {
    name: "ConsequenceTimeline",
    description:
      "Värdig datum-tidslinje för 'när det går illa'. Innehåll: markdown-lista i formatet `- DATUM · TEXT`. En rad kan markeras som alert (röd).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Det här fick konsekvenser.",
      },
      {
        name: "helpLines",
        label: "Hjälplinjer i footer",
        type: "multiline",
        hint: "Komma- eller punkt-separerade",
      },
      {
        name: "alertRow",
        label: "Alert-rad (1-indexerat)",
        type: "number",
        hint: "Markerar en rad röd. Lämna tomt för ingen alert.",
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  ExerciseThemes: {
    name: "ExerciseThemes",
    description:
      "Slide A i klassrumsövning — tre tema-kort eleven kan välja mellan. Innehåll: markdown-lista, en rad per tema-kort.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Välj ett tema.",
      },
      { name: "subtitle", label: "Underrubrik / instruktion", type: "multiline" },
      {
        name: "caveat",
        label: "Etisk anmärkning (under korten)",
        type: "multiline",
      },
    ],
    hasContent: true,
  },

  ExerciseCodebook: {
    name: "ExerciseCodebook",
    description:
      "Slide B i klassrumsövning — bias-kodbok med bokstavscirklar. Innehåll: markdown-lista i formatet `- BOKSTAV · NAMN · BESKRIVNING · EX1 | EX2 | EX3`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Markera med bokstäver.",
      },
      { name: "subtitle", label: "Underrubrik / instruktion", type: "multiline" },
    ],
    hasContent: true,
  },

  ExerciseReflection: {
    name: "ExerciseReflection",
    description:
      "Slide C i klassrumsövning — diskussionsfrågor i bokuppslag-stil. Sista raden får extra vikt (klimax-frågan). Innehåll: markdown-lista med frågor.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Reflektera tillsammans.",
      },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "footer", label: "Footer-text under frågorna", type: "text" },
    ],
    hasContent: true,
  },

  StatsWithQuote: {
    name: "StatsWithQuote",
    description:
      "Tre (eller fler) siffror i editorial bokstil + citat under. Innehåll: markdown-lista i formatet `- VÄRDE · SUFFIX · LABEL`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "source", label: "Källa (mono, små caps)", type: "text" },
      { name: "quote", label: "Citat under stats", type: "multiline" },
      { name: "quoteSource", label: "Attribution för citatet", type: "text" },
      {
        name: "countDuration",
        label: "Count-up animationstid (sek)",
        type: "number",
        default: 1.4,
      },
      {
        name: "background",
        label: "Bakgrundsbild",
        type: "image",
        hint: "Bildsökväg eller URL. Lämna tomt för temats default.",
      },
      {
        name: "overlay",
        label: "Overlay-opacity (0–1)",
        type: "number",
        hint: "Mörk eller ljus film över bilden för läsbarhet.",
      },
      {
        name: "overlayMode",
        label: "Overlay-färg",
        type: "select",
        options: ["dark", "light"],
        default: "dark",
      },
    ],
    hasContent: true,
  },

  SycophancyTest: {
    name: "SycophancyTest",
    description:
      "Handout-slide: testa samma prompt på två chattbotar. platformA, platformB och steps har hardcodade defaults som kan överskridas i raw MDX. Innehåll: markdown-lista i formatet `- NAMN · PROMPT-TEXT`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        default: "Testa själv: hur sykofantisk är AI:n?",
      },
      {
        name: "subtitle",
        label: "Definition / underrubrik",
        type: "multiline",
        default: "Sykofantism = AI:n håller med dig — också när du har fel.",
      },
      { name: "footer", label: "Footer-text längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  AiCompanions: {
    name: "AiCompanions",
    description:
      "AI-vänskap som produktkategori — rubrik, numrerade appar, vändning och landning. Innehåll: markdown-lista i formatet `- NAMN · BESKRIVNING`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        required: true,
        hint: "Stöd **fet**",
      },
      { name: "turn", label: "Vändning (berättande mening)", type: "multiline" },
      {
        name: "landing",
        label: "Landning",
        type: "multiline",
        hint: "Stöd **fet**",
      },
    ],
    hasContent: true,
  },

  AiCompanionsMedia: {
    name: "AiCompanionsMedia",
    description:
      "Två-kol-variant av AiCompanions för slides med bild/film som visuell evidens. Vänster: turn + branschlista. Höger: bild + video med captions. Innehåll: markdown-lista i formatet `- NAMN · BESKRIVNING` (sista item får alert-prick).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        required: true,
        hint: "Stöd **fet**",
      },
      { name: "turn", label: "Vändning (berättande mening)", type: "multiline" },
      {
        name: "landing",
        label: "Landning",
        type: "multiline",
        hint: "Stöd **fet**",
      },
      { name: "image", label: "Bild (path eller URL)", type: "image" },
      { name: "imageAlt", label: "Bild-alt", type: "text" },
      { name: "imageCaption", label: "Bild-caption", type: "text" },
      { name: "video", label: "Video (path)", type: "image" },
      { name: "videoCaption", label: "Video-caption", type: "text" },
    ],
    hasContent: true,
  },

  ClassFriendReveal: {
    name: "ClassFriendReveal",
    description:
      "Klassrum som rutnät av elevfigurer — andelar fylls i med accent. En egen observation som visuell gut-punch.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "context", label: "Setup-mening", type: "multiline" },
      {
        name: "title",
        label: "Rubrik (påståendet)",
        type: "text",
        required: true,
      },
      {
        name: "classSize",
        label: "Antal elever i rutnätet",
        type: "text",
        default: "24",
      },
      { name: "friendFraction", label: "Bråktal — bred grupp", type: "text", default: "2 av 3" },
      { name: "friendLabel", label: "Etikett — bred grupp", type: "text" },
      { name: "nearFraction", label: "Bråktal — delmängd", type: "text", default: "1 av 3" },
      { name: "nearLabel", label: "Etikett — delmängd", type: "text" },
      { name: "closing", label: "Avslutande mening", type: "multiline" },
    ],
  },

  FrictionContrast: {
    name: "FrictionContrast",
    description:
      "Brygga mellan systemkritik och relationskritik — friktionskällor vs AI utan motstånd. Innehåll: markdown-lista i formatet `- KÄLLA · FRIKTIONEN DEN GER`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "title",
        label: "Rubrik",
        type: "text",
        required: true,
        hint: "Stöd **fet**",
      },
      { name: "label", label: "Liten etikett ovanför listan", type: "text" },
      {
        name: "turn",
        label: "AI-vändningen",
        type: "multiline",
        hint: "Stöd **fet**",
      },
      {
        name: "landing",
        label: "Landning",
        type: "multiline",
        hint: "Stöd **fet**",
      },
    ],
    hasContent: true,
  },

  FriendshipKinds: {
    name: "FriendshipKinds",
    description:
      "Relationskritik-modellen — Aristoteles tre sorters vänskap + ett öppet fjärde kort. Innehåll: markdown-lista i formatet `- NAMN · BESKRIVNING · AI-OMDÖME`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "intro", label: "Intro-mening", type: "multiline" },
      { name: "openTitle", label: "Öppna kortet — rubrik", type: "multiline" },
      { name: "openQuestion", label: "Öppna kortet — fråga", type: "multiline" },
    ],
    hasContent: true,
  },

  LeadStatement: {
    name: "LeadStatement",
    description:
      "Vänsterställt påstående som lämnar plats för en overlay (t.ex. FloatingPhone) på högersidan. Innehåll: själva påståendet (markdown, stöd **fet**).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "size", label: "Textstorlek (sm/md/lg)", type: "text", default: "md" },
      {
        name: "maxWidth",
        label: "Maxbredd på textblocket",
        type: "text",
        default: "32rem",
        hint: "Håll smal när sliden delar yta med en overlay",
      },
    ],
    hasContent: true,
  },

  BotnetReveal: {
    name: "BotnetReveal",
    description:
      "Två-kol botnät-slide: vänster har staged-reveal-kort med dot-clusters som växer (3 → 24 → 96), höger har prominent video. Sista steget får alert-färg.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      { name: "video", label: "Video-path", type: "image", hint: "Påverkar höger panel" },
      {
        name: "steps",
        label: "Steg (3 st)",
        type: "multiline",
        required: true,
        hint: "Format: `Titel · Beskrivning | Titel · Beskrivning | Titel · Beskrivning`. Sista får alert.",
      },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
  },

  ThreeQuestions: {
    name: "ThreeQuestions",
    description:
      "Tre frågor med exempel-bubblor — stepped reveal (klick fram en åt gången). Markera den centrala med `★`. Innehåll: markdown-lista i formatet `- Fråga · Hint · Exempel`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  WarningConstellation: {
    name: "WarningConstellation",
    description:
      "Varningstecken som konstellation: ★-tecknet ligger i centrum med alert-glow, övriga noder ligger i orbit och kopplas via tunna linjer. Stepped reveal — varje orbit-nod klickas fram. Innehåll: markdown-lista i formatet `- Titel · Beskrivning`.",
    fields: [
      {
        name: "centerTone",
        label: "Centrumnodens färg",
        type: "text",
        default: "alert",
        hint: '"alert" = signal-röd (blottläggning). "accent" = temats accent, för deck som medvetet kör utan alerts.',
      },
      { name: "centerLabel", label: "Etikett över centrumnoden", type: "text", default: "★ Allvarligast" },
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  FrictionRiver: {
    name: "FrictionRiver",
    description:
      "Friktion visualiserad som dammar längs en vågig flod. Stepped reveal — varje friktion-punkt klickas fram. Innehåll: markdown-lista i formatet `- Titel · Beskrivning` (en rad per damm).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      {
        name: "flowStart",
        label: "Etikett — flödets start",
        type: "text",
        default: "AI-flöde",
      },
      {
        name: "flowEnd",
        label: "Etikett — flödets slut",
        type: "text",
        default: "Lärande",
      },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  AiPusselbit: {
    name: "AiPusselbit",
    description:
      "AI som pusselbiten som saknas. En glas-tavla (helheten) har ett pusselbit-format hål — luckan, 'var du inte räcker till'. Steg 2: en AI-märkt glasbit flyger in och slottar i hålet med glow-puls. Symboliserar det kompensatoriska uppdraget. Stegbar (2 steg).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "body", label: "Stödmening", type: "multiline" },
      { name: "tagline", label: "Tagline (tonar in på steg 2)", type: "text" },
      { name: "pieceLabel", label: "Text i biten", type: "text", default: "AI" },
    ],
    hasContent: false,
  },

  PromptTransform: {
    name: "PromptTransform",
    description:
      "Prompt-driven före→efter-förvandling. Prompt-bar överst; vänster = den svåra texten som en tät vägg; höger = den rena, strukturerade versionen som revealas (steg 2). För NPF-förtydligande / tillgängliggörande / 'samma innehåll, navigerbart'. Efter-innehåll som markdown via children: `# Titel`, `## Sektion`, brödtext, `- punkt`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "prompt", label: "Prompt", type: "multiline", required: true },
      { name: "promptLabel", label: "Prompt-etikett", type: "text", default: "Min prompt" },
      { name: "beforeLabel", label: "Vänster-etikett", type: "text", default: "Före" },
      { name: "beforeTitle", label: "Före-rubrik", type: "text" },
      { name: "beforeText", label: "Före-text (väggen)", type: "multiline", required: true },
      { name: "afterLabel", label: "Höger-etikett", type: "text", default: "Efter" },
      { name: "afterPlaceholder", label: "Höger-platshållare (steg 0)", type: "text" },
    ],
    hasContent: true,
  },

  AudioGenHero: {
    name: "AudioGenHero",
    description:
      "AI-genererad ljud-showcase i nattglas-stil: premium glaskort med levande glödande vågform (equalizer), intresse-pills + glosor-chips och en play-knapp som spelar den riktiga ljudfilen. Vågformen ampas upp medan det spelar. För 'utgå från elevernas intressen'-hörförståelse, Suno-låtar, AI-poddar.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Stödmening", type: "text" },
      { name: "prompt", label: "Prompt", type: "multiline" },
      { name: "trackLabel", label: "Spår-etikett", type: "text" },
      { name: "voiceLabel", label: "Röst/verktyg-etikett", type: "text" },
      { name: "interests", label: "Intressen (· separerade)", type: "text" },
      { name: "glosor", label: "Glosor (· separerade)", type: "text" },
      { name: "audioSrc", label: "Ljud-/videokälla", type: "text" },
      { name: "accentImage", label: "Cut-out-bild bakom (t.ex. EPA-traktor)", type: "text" },
    ],
    hasContent: false,
  },

  ModalityCascade: {
    name: "ModalityCascade",
    description:
      "En källbild följer fem format: sammanfattning, infografik, podd, låt och spel. Standardvarianten har 6 lägen; visualStyle=sta har 12 med separat prompt och resultat för varje format samt avslutande överblick. Mediestart på framåtsteg, pausat vid återgång.",
    fields: [
      { name: "visualStyle", label: "Formspråk (en variant ur modality-cascade-varianter.ts)", type: "text" },
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "sourceImage", label: "Källbild (foto på tavlan)", type: "text", required: true },
      { name: "sourceCaption", label: "Bildtext källa", type: "text" },
      { name: "autoPlayMedia", label: "Spela media automatiskt på clickersteget", type: "boolean", default: false },
      { name: "summaryPrompt", label: "Prompt · sammanfattning", type: "multiline" },
      { name: "summaryHeading", label: "Rubrik · sammanfattning", type: "text" },
      { name: "summaryItems", label: "Punkter (|| separerade)", type: "multiline" },
      { name: "summaryOvning", label: "Övning", type: "text" },
      { name: "infographicPrompt", label: "Prompt · infografik", type: "multiline" },
      { name: "infographicImage", label: "Infografik-bild", type: "text" },
      { name: "podcastPrompt", label: "Prompt · podd", type: "multiline" },
      { name: "podcastSrc", label: "Podd-källa", type: "text" },
      { name: "podcastTitle", label: "Podd-titel", type: "text" },
      { name: "podcastHosts", label: "Podd-värdar", type: "text" },
      { name: "songPrompt", label: "Prompt · låt", type: "multiline" },
      { name: "songSrc", label: "Låt-källa", type: "text" },
      { name: "songTitle", label: "Låt-titel", type: "text" },
      { name: "gamePrompt", label: "Prompt · spel", type: "multiline" },
      { name: "gameSrc", label: "Spel-källa", type: "text" },
      { name: "gameTitle", label: "Spel-titel", type: "text" },
    ],
    hasContent: false,
  },

  WilliamMorph: {
    name: "WilliamMorph",
    description:
      "Bild + prompt morfar in till ett citat. Steg 0: porträtt + ChatGPT-fönster där prompten skrivs in. Steg 1 (klick): bild och prompt löses upp i blur medan citatet kondenseras fram med ljus-bloom. Tekniken blir människan. Prompten som children.",
    fields: [
      { name: "portrait", label: "Porträtt", type: "text" },
      { name: "portraitAlt", label: "Alt-text", type: "text" },
      { name: "modelName", label: "Modellnamn", type: "text", default: "ChatGPT" },
      { name: "quote", label: "Citatet (morf-mål)", type: "multiline" },
      { name: "quoteAttribution", label: "Attribution", type: "text" },
    ],
    hasContent: true,
  },

  SealStatement: {
    name: "SealStatement",
    description:
      "Ett citat med premium certifierings-sigill. Det sigillade ordet glöder; sigillet (roterande ring, tick-markeringar, orbiterande ljuspunkt, ✓) stämplas in. 'Det som säkrar det' som chips. För payoff/bevis ('din undervisning är NPF-säkrad').",
    fields: [
      { name: "quotePre", label: "Citat före sigill", type: "text" },
      { name: "quoteSeal", label: "Sigillat ord (accent)", type: "text" },
      { name: "attribution", label: "Attribution", type: "text" },
      { name: "subline", label: "Underrad", type: "multiline" },
      { name: "ingredients", label: "Det som säkrar (· separerat)", type: "text" },
      { name: "ingredientsLabel", label: "Etikett · ingredienser", type: "text" },
      { name: "sealLabel", label: "Text i sigillet", type: "text" },
    ],
    hasContent: false,
  },

  ElevtypAnalys: {
    name: "ElevtypAnalys",
    description:
      "AI som bollplank — GDPR-säkert. Ett bibliotek av FIKTIVA elevtyper (inga riktiga elever) vägs mot en uppgift via en prompt; AI ger en strukturerad 4-delad analys som blommar fram på klick. Visar flödet + outputen. Stegbar.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "gdprNote", label: "GDPR-badge-text", type: "text" },
      { name: "elevtyper", label: "Fiktiva elevtyper (|| separerade)", type: "multiline" },
      { name: "prompt", label: "Prompt", type: "multiline" },
      { name: "out1", label: "Output · reaktioner", type: "multiline" },
      { name: "out2", label: "Output · risker", type: "multiline" },
      { name: "out3", label: "Output · förbättringar", type: "multiline" },
      { name: "out4", label: "Output · förbättrad instruktion", type: "multiline" },
    ],
    hasContent: false,
  },

  StarterPrompts: {
    name: "StarterPrompts",
    description:
      "Ett rutnät av steal-bara prompt-kort för läraren som vill komma igång. Varje kort: kategori-chip + prompt i chat-input-stil med send-pil. Staggrad entré. Innehåll: markdown-lista `- Kategori :: Prompt`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "columns", label: "Antal kolumner", type: "number", default: 3 },
    ],
    hasContent: true,
  },

  LeverAmplify: {
    name: "LeverAmplify",
    description:
      "Hävstång-visualisering: liten insats (ditt omdöme) trycker, AI är armen som lyfter en stor last (varje elev), vilopunkt = det vi vet om lärande. CSS-hävstång som tippar in. För 'AI är hävstången — inte ersättningen' / omdömes-/guardrail-beats.",
    fields: [
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "truths", label: "Tre sanningar (|| separerade)", type: "multiline" },
      { name: "handoff", label: "Överlämningsrad", type: "text" },
      { name: "inputLabel", label: "Etikett · effort", type: "text" },
      { name: "loadLabel", label: "Etikett · last", type: "text" },
      { name: "beamLabel", label: "Etikett · armen", type: "text" },
      { name: "fulcrumLabel", label: "Etikett · vilopunkt", type: "text" },
    ],
    hasContent: false,
  },

  GapStart: {
    name: "GapStart",
    description:
      "Landning: en glödande pusselbit-formad lucka märkt 'Börja här' (callback till AiPusselbit) bredvid en stor rad där del 2 är accent. För 'vet du var du inte räcker till → då vet du var du ska börja'-bookends.",
    fields: [
      { name: "lead", label: "Inledande rad", type: "text" },
      { name: "heroA", label: "Stor rad · del 1", type: "text" },
      { name: "heroB", label: "Stor rad · del 2 (accent)", type: "text" },
      { name: "markerLabel", label: "Etikett vid luckan", type: "text" },
    ],
    hasContent: false,
  },

  GapTitle: {
    name: "GapTitle",
    description:
      "Titelslide i pusselfältet — bookend till GapStart: dimmade pusselbitar över hela ytan, EN lucka som andas svagt i accent (utan markör — frågan är obesvarad än). Centrerad hierarki: event-kicker, stor titel med ord-för-ord-reveal och avslutande ? i accent, italic subtitle, divider + författarrad.",
    fields: [
      { name: "event", label: "Event-rad", type: "text" },
      { name: "title", label: "Titel", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "text" },
      { name: "author", label: "Författare", type: "text" },
    ],
    hasContent: false,
  },

  TranslationBridge: {
    name: "TranslationBridge",
    description:
      "Översättningsbron: svensk panel (vänster brofäste) och arabisk panel (höger — texten skriver sig själv ord för ord, RTL) med begreppen som glödande brostenar i honung mellan panelerna, trådar ut mot båda texterna. Typografiska ordmärken i stället för flaggor. 4 steg: prompt → svenskan → arabiskan → bron + caption. terms-prop: [{ sv, ar }].",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Undertitel", type: "text" },
      { name: "prompt", label: "Prompt", type: "multiline" },
      { name: "swedishText", label: "Svensk text", type: "multiline" },
      { name: "arabicText", label: "Arabisk text", type: "multiline" },
      { name: "swedishLabel", label: "Ordmärke · vänster", type: "text" },
      { name: "arabicLabel", label: "Ordmärke · höger", type: "text" },
      { name: "caption", label: "Caption", type: "text" },
    ],
    hasContent: false,
  },

  LiquidChatCompare: {
    name: "LiquidChatCompare",
    description:
      "Två LiquidChat-paneler sida vid sida. Vänster pane = alert-tonad (×Genväg), höger = accent (✓Lärande). Båda stegas i takt. Innehåll: markdown-lista där varje rad börjar med `L ` eller `R ` följt av `**Roll:** Text`. Roller som matchar elev/du/jag = elev-bubbla (vänster i pane, blå).",
    fields: [
      { name: "eyebrow", label: "Kicker (vänster)", type: "text" },
      { name: "chapter", label: "Kapitel (höger)", type: "text" },
      { name: "title", label: "Rubrik", type: "text" },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      {
        name: "leftLabel",
        label: "Vänster pane-etikett",
        type: "text",
        required: true,
      },
      { name: "leftCaption", label: "Vänster pane-tagline", type: "text" },
      { name: "leftApp", label: "Vänster app-namn", type: "text", default: "ChatGPT" },
      {
        name: "rightLabel",
        label: "Höger pane-etikett",
        type: "text",
        required: true,
      },
      { name: "rightCaption", label: "Höger pane-tagline", type: "text" },
      { name: "rightApp", label: "Höger app-namn", type: "text", default: "ChatGPT" },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  LiftedDoors: {
    name: "LiftedDoors",
    description:
      "Tre portaler som peek:ar in i samtalen som följer — varje portal är en miniatyr chat-window-mockup med elev-bubbla + AI-svar. Markera den centrala med `★`. Innehåll: markdown-lista i formatet `- Titel · Beskrivning · Elev-citat · AI-citat`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      {
        name: "itemFooter",
        label: "Footer-text per kort",
        type: "text",
        default: "Se hela samtalet →",
      },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  RolesReleased: {
    name: "RolesReleased",
    description:
      "Finalen där rollerna tas tillbaka. Öppnar med samma omloppsbana som RoleOrbit gav i akt 0 — sedan lossas en roll per klick: kontaktlinjen dras tillbaka, namnet stryks över och föreställningen byts mot sitt förnekande. Mitten står orörd. Sist landar vändningen. Innehåll: markdown-lista i formatet `- Rollnamn · Föreställningen · Förnekandet` (max 4).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      {
        name: "turn",
        label: "Vändningen",
        type: "multiline",
        hint: "Landar först när alla roller lossats",
      },
    ],
    hasContent: true,
  },

  SupportDial: {
    name: "SupportDial",
    description:
      "Stödnivå som ratt + chatt: nivåerna till vänster med styrkemätare, elevens fråga och AI:ns svar till höger. Elevens fråga står stilla — tillägget och svaret byts när man stegar. Steg-template (mellanslag), nivåerna är också klickbara. Innehåll: markdown-lista i formatet `- Nivå · Elevens tillägg · AI:ns svar`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      {
        name: "question",
        label: "Elevens fråga (konstant)",
        type: "multiline",
        hint: "Står oförändrad genom alla nivåer — det är tillägget som ändras",
      },
      { name: "userLabel", label: "Namn över elevens bubblor", type: "text" },
      { name: "aiLabel", label: "Namn över AI:ns bubbla", type: "text" },
      { name: "levelLabel", label: "Etikett över nivålistan", type: "text" },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },

  MethodCodex: {
    name: "MethodCodex",
    description:
      "Editorial codex: vänster kolumn med rubrik + bottomLine, höger med metoder som lista med romerska tal och accent-linjer. Markera central med `★`. Innehåll: markdown-lista i formatet `- Titel · Beskrivning`.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      { name: "bottomLine", label: "Payoff längst ner (visas i vänster kolumn)", type: "multiline" },
    ],
    hasContent: true,
  },

  FeedExhibit: {
    name: "FeedExhibit",
    description:
      "2x2-grid med kort till vänster + stor media (video eller bild) till höger. Tänkt för 'vad finns i ditt feed'-slides där högerytan är konkret bevis. Markera central med `★`. Innehåll: markdown-lista i formatet `- Titel · Beskrivning` (4 punkter rekommenderas).",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "chapter", label: "Kapitel", type: "text" },
      { name: "title", label: "Rubrik", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "multiline" },
      { name: "video", label: "Video-path", type: "image", hint: "Visas i höger panel (har företräde över bild)" },
      { name: "image", label: "Bild-path", type: "image", hint: "Visas i höger panel om ingen video" },
      { name: "imageAlt", label: "Bild-alt", type: "text" },
      { name: "mediaCaption", label: "Media-caption", type: "text" },
      { name: "bottomLine", label: "Payoff längst ner", type: "multiline" },
    ],
    hasContent: true,
  },
  // De mest använda mallarna har sina formulär i en egen fil (ren modul, testad
  // mot hur mallarna faktiskt används): template-schemas-vanliga.ts.
  ...commonTemplateSchemas,
  // Modellerna som återkommer en gång per föreläsning: template-schemas-modeller.ts.
  ...modelTemplateSchemas,
  // Mallfamiljerna med scheman i sina egna mappar: template-schemas-familjer.ts.
  ...Object.assign({}, ...schemaFamilies.map((family) => family.schemas)),
};

export function getTemplateSchema(name: string): TemplateSchema | undefined {
  return templateSchemas[name];
}

// ============================================================================
// FALLBACK-SCHEMA — auto-genererat från slide.props för templates som inte
// har en explicit schema-definition. Inferens-heuristik:
//   • Boolean-värde      → boolean
//   • Number-värde       → number
//   • Array/Object       → json (redigeras som JSON, sparas bara när det går att läsa)
//   • String:
//      - URL/path        → image (media-picker fungerar för bild + video)
//      - hex-färg        → color
//      - newline ELLER >120 tecken → multiline
//      - annars           → text
//   • Namn-hints kan tvinga en typ:
//      - innehåller "color" eller "accent" → color
//      - är "size" eller slutar på "Size" → select sm/md/lg/xl
//      - är vanligt media-namn → image
// ============================================================================

const MEDIA_PROP_NAMES = new Set([
  "src",
  "image",
  "background",
  "video",
  "videoSrc",
  "audio",
  "logo",
  "leftImage",
  "rightImage",
  "portrait",
  "bookSrc",
]);

const MULTILINE_PROP_NAMES = new Set([
  "subtitle",
  "body",
  "tagline",
  "intro",
  "description",
  "caption",
  "quote",
  "transcript",
  "tags",
  "closing",
  "tumregel",
  "headline",
  "prompt",
  "safePrompt",
  "decisionsText",
  "forbiddenText",
]);

const SIZE_OPTIONS = ["sm", "md", "lg", "xl"];

/**
 * Konverterar camelCase eller snake_case till "Title Case" för label-fältet.
 * Exempel: "leftAccent" → "Left accent", "video_src" → "Video src".
 */
function humanizeName(name: string): string {
  const spaced = name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isHexColor(s: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s);
}

function isUrlOrPath(s: string): boolean {
  return /^(\/|https?:\/\/)/.test(s);
}

function inferFieldType(name: string, value: unknown): FieldType | null {
  // Namn-hints först — de slår alltid värdebaserad inferens
  if (MEDIA_PROP_NAMES.has(name)) return "image";
  if (name === "size" || /Size$/.test(name)) return "select";
  if (
    /accent$|color$|Color$|Accent$/.test(name) &&
    typeof value === "string"
  ) {
    return "color";
  }

  // Värdebaserad inferens
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    // Ett vanligt textfält hade gjort om listan till text vid första tangenttryckningen.
    return "json";
  }
  if (typeof value === "string") {
    if (isHexColor(value)) return "color";
    if (isUrlOrPath(value)) return "image";
    if (
      MULTILINE_PROP_NAMES.has(name) ||
      value.includes("\n") ||
      value.length > 120
    ) {
      return "multiline";
    }
    return "text";
  }
  // null/undefined utan namn-hint kan inte slutas — visa som text
  if (value == null) return "text";
  return null;
}

/**
 * Bygger ett fallback-schema baserat på slide.props + ev. content. Templates
 * UTAN explicit schema kan därigenom redigeras via standard-sidopanelen.
 */
export function deriveFallbackSchema(
  tag: string,
  props: Record<string, unknown>,
  hasContent: boolean
): TemplateSchema {
  const fields: FieldSchema[] = [];

  // Sortera props i en pedagogisk ordning: title-liknande först, sen text,
  // sen bilder, sen bool/number/färg sist.
  const ORDER_PRIORITY: Record<string, number> = {
    title: 0,
    chapter: 1,
    kicker: 1,
    eyebrow: 1,
    subtitle: 2,
    tagline: 3,
    body: 4,
    intro: 4,
    description: 4,
    background: 90,
    accent: 95,
  };

  const propEntries = Object.entries(props);
  propEntries.sort(([a], [b]) => {
    const pa = ORDER_PRIORITY[a] ?? 50;
    const pb = ORDER_PRIORITY[b] ?? 50;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  for (const [name, value] of propEntries) {
    const type = inferFieldType(name, value);
    if (!type) continue;

    const field: FieldSchema = {
      name,
      label: humanizeName(name),
      type,
    };

    if (type === "select") {
      field.options = SIZE_OPTIONS;
      field.variant = "pills";
    }

    fields.push(field);
  }

  return {
    name: tag,
    description: `Auto-genererat schema · ${tag} saknar formell schema-definition. Lägg till en i src/lib/template-schemas.ts för bättre fält-design.`,
    fields,
    hasContent,
  };
}

/**
 * Hämta schema med fallback. Använd alltid denna i editor-vyer så du får
 * något att rendera även för templates utan explicit schema.
 */
export function getTemplateSchemaOrFallback(
  tag: string,
  props: Record<string, unknown>,
  hasContent: boolean
): { schema: TemplateSchema; isFallback: boolean } {
  for (const family of schemaFamilies) {
    const resolved = family.resolve?.(tag, props);
    if (resolved) return resolved;
  }
  const explicit = templateSchemas[tag];
  if (explicit) return { schema: explicit, isFallback: false };
  return {
    schema: deriveFallbackSchema(tag, props, hasContent),
    isFallback: true,
  };
}

/**
 * Lista alla slide-templates (exkluderar sub-components som TimelineEvent,
 * ComparisonColumn som bara används som children).
 */
export const SUB_COMPONENTS = new Set(["TimelineEvent", "ComparisonColumn"]);

export function getSlideTemplates(): Array<{ tag: string; schema: TemplateSchema }> {
  return Object.entries(templateSchemas)
    .filter(([tag]) => !SUB_COMPONENTS.has(tag))
    .map(([tag, schema]) => ({ tag, schema }));
}

/**
 * Skapa en ny slide med standardvärden för angiven template.
 * Fyller required-fält med placeholder-text och sätter select-defaults.
 */
export function createDefaultSlide(
  tag: string
): { tag: string; props: Record<string, string | number | boolean | null>; content: string | null; children: never[] } {
  const schema = templateSchemas[tag];
  if (!schema) {
    return {
      tag,
      props: { slideId: createSlideId() },
      content: null,
      children: [],
    };
  }

  const built = buildDefaultSlide(schema);
  const props = { slideId: createSlideId(), ...built.props };
  const content = built.content;

  return { tag, props, content, children: [] };
}
