/**
 * Fältformulär för de mallar Joel använder mest.
 *
 * Mätt över alla deck (september 2026) saknade de flitigast använda mallarna
 * eget schema: HookStatement står på 309 slides, LiquidQuote på 120. Editorn
 * visade då ett härlett formulär — engelska fältnamn, `slideId` bland fälten,
 * inga tomma fält att fylla i, och "Lägg till tom" i galleriet gav en slide
 * utan något innehåll alls.
 *
 * Schemana här är skrivna ur mallarnas egen kod (egenskaper, standardvärden,
 * vad `**fet**` betyder i just den mallen) och kontrollerade mot hur mallarna
 * faktiskt används i decken.
 *
 * Konventioner:
 *   - Fält som bär slidens ORD står först. Finjustering (`advanced: true`)
 *     hamnar under "Fler inställningar" i editorn.
 *   - Bakgrund och mörkläggning finns med där mallen har dem som egna
 *     egenskaper, men designfliken har bättre reglage för dem.
 *   - Markord, figur, symbol och register gäller ALLA mallar (withSlideBg) och
 *     står därför inte här. Finns de på en slide visas de under "Övriga
 *     egenskaper".
 *   - `default` skrivs in i nya slides. Sätt det bara där en ny slide ska bära
 *     värdet — eller där tomt betyder något eget (en dold etikett). Undantag:
 *     `advanced`-fält. Deras `default` är bara vad formuläret VISAR när
 *     egenskapen saknas (mallens eget standardvärde) och skrivs aldrig in.
 *   - Ja/nej-egenskaper är alltid `boolean`, aldrig en rullista med "true" och
 *     "false": mallarna läser värdet som det är, och texten "false" är sann.
 *   - `defaultContent` är texten en ny slide börjar med, i mallens eget format.
 *
 * Ren modul: importerar bara typer, så att testet kan läsa den i Node.
 */

import type { TemplateSchema } from "./template-schemas";
import { accent, background, chapter, overlay } from "./template-schema-fields.ts";
import { AGARE } from "./agare.ts";

export const commonTemplateSchemas: Record<string, TemplateSchema> = {
  HookStatement: {
    name: "HookStatement",
    description:
      "En mening som händer: orden kommer ett i taget, betonade ord växer och får accentfärg. En av de mest använda mallarna — påståenden, frågor, övergångar.",
    fields: [
      chapter,
      {
        name: "reveal",
        label: "Andra påståendet · nästa klick",
        type: "multiline",
        hint: "Visas först på nästa klick, medan meningen ovanför tonas ned. Samma **fet** och *kursiv* som i meningen.",
      },
      {
        name: "pauseAfter",
        label: "Paus efter sista ordet (ms)",
        type: "number",
        advanced: true,
        placeholder: "2400",
        hint: "Hur länge sliden håller kvar publiken innan nästa klick går igenom. Standard 2400.",
      },
      {
        name: "boxBreath",
        label: "Andningsram runt texten",
        type: "boolean",
        advanced: true,
        hint: "En glödande punkt vandrar runt texten i fyrtakt: in, håll, ut, håll.",
      },
      accent,
      background,
      overlay("0.7"),
    ],
    hasContent: true,
    contentFirst: true,
    contentLabel: "Meningen",
    contentHint: "**fet** = accentfärg, större och en kort paus efteråt. *kursiv* = kursivt. Håll den kort: den ska gå att läsa på fem meter.",
    defaultContent: "\nEn mening som **landar**.\n",
  },

  LiquidQuote: {
    name: "LiquidQuote",
    description: "Citat i glas. Citatet stort, avsändaren under. Passar forskarröster, elevröster och styrdokument.",
    fields: [
      {
        name: "quote",
        label: "Citatet",
        type: "multiline",
        required: true,
        placeholder: "Det någon faktiskt sa.",
        hint: "**fet** ger accentfärg och glöd. Skriv utan citattecken — mallen sätter dem.",
      },
      { name: "size", label: "Textstorlek", type: "select", options: ["sm", "md", "lg", "xl"], variant: "pills" },
      { name: "attribution", label: "Vem som säger det", type: "text", placeholder: "Namn, roll" },
      { name: "source", label: "Källa, år eller plats", type: "text", placeholder: "Rapport · 2025" },
      { name: "kicker", label: "Kicker", type: "text", hint: "Liten rad ovanför citatet." },
      chapter,
      { name: "accent2", label: "Andra accentfärgen (bakgrundsljuset)", type: "color", advanced: true },
      background,
    ],
    hasContent: false,
  },

  AiArMedia: {
    name: "AiArMedia",
    description: "En film eller en bild med bildtext, under etiketten “AI är…”. Film startas med knapp, bild går att förstora.",
    fields: [
      { name: "video", label: "Film (mp4)", type: "text", placeholder: "/bilder/…/film.mp4", hint: "Fyll i film ELLER bild." },
      { name: "image", label: "Bild", type: "image" },
      { name: "alt", label: "Bildbeskrivning", type: "text", hint: "Vad bilden föreställer, för den som inte ser den." },
      { name: "caption", label: "Bildtext", type: "multiline", hint: "Den korta raden under filmen eller bilden." },
      {
        name: "label",
        label: "Etikett uppe till vänster",
        type: "text",
        default: "AI är…",
        hint: "Töm fältet för att dölja etiketten.",
      },
      {
        name: "aspectRatio",
        label: "Bildformat",
        type: "text",
        advanced: true,
        placeholder: "16/9",
        hint: "Standard 16/9 för film, bildens eget format för bild.",
      },
    ],
    hasContent: false,
  },

  GrowingStatement: {
    name: "GrowingStatement",
    description: "Texten växer fram bokstav för bokstav. För den lugna poängen, den som ska få ta plats.",
    fields: [
      { name: "whisper", label: "Viskning ovanför", type: "text", hint: "Liten kursiv rad som tonar in före huvudtexten." },
      chapter,
      { name: "align", label: "Placering", type: "select", options: ["", "center", "left"], advanced: true },
      accent,
      background,
    ],
    hasContent: true,
    contentFirst: true,
    contentLabel: "Texten",
    contentHint: "En tom rad mellan raderna ger ny rad på sliden. **fet** = accentfärg med pulserande glöd.",
    defaultContent: "\nDet här är **poängen**.\n",
  },

  RevealList: {
    name: "RevealList",
    description: "Rader som kommer en i taget under en rad som står kvar. “Vi skriver… / Vi läser… / Vi tänker…”",
    fields: [
      { name: "prefix", label: "Raden som står kvar", type: "text", placeholder: "Vi skriver…" },
      chapter,
      {
        name: "stagger",
        label: "Sekunder mellan raderna",
        type: "number",
        advanced: true,
        placeholder: "0.9",
      },
      accent,
      background,
      overlay("0.55"),
    ],
    hasContent: true,
    contentLabel: "Raderna",
    contentHint: "En rad per punkt, med - först. **fet** = accentfärg.",
    defaultContent: "\n- Första raden\n- Andra raden\n- **Tredje** raden\n",
  },

  StatsTriptych: {
    name: "StatsTriptych",
    description: "Två till fyra siffror sida vid sida som räknas upp. Jämförelser mellan grupper, år eller skolformer.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "source", label: "Källa", type: "text", placeholder: "Skolverket · 2025" },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentLabel: "Siffrorna",
    contentHint: "En rad per siffra: - värde · etikett. Exempel: - 77 % · Gymnasiet",
    defaultContent: "\n- 77 % · Första gruppen\n- 54 % · Andra gruppen\n- 31 % · Tredje gruppen\n",
  },

  AiKanVara: {
    name: "AiKanVara",
    description: "Ett ord som skrivs fram bredvid ett frilagt föremål: skruvdragaren, hantverkaren, byggföretaget. Byggd för serier där föremålet växer slide för slide.",
    fields: [
      { name: "word", label: "Ordet", type: "text", required: true, placeholder: "Skruvdragaren" },
      { name: "image", label: "Frilagd bild (png)", type: "image" },
      { name: "alt", label: "Bildbeskrivning", type: "text" },
      { name: "size", label: "Storlek", type: "select", options: ["sm", "md", "lg"], default: "md", variant: "pills", hint: "Låt storleken växa genom serien: verktyg, person, system." },
      { name: "label", label: "Etikett uppe till vänster", type: "text", default: "AI kan vara…" },
      { name: "imageRotation", label: "Bildens lutning (grader)", type: "number", advanced: true, placeholder: "-4" },
      {
        name: "imageOffsetY",
        label: "Skjut bilden nedåt (px)",
        type: "number",
        advanced: true,
        hint: "Låter bilden gå ut under kanten så att en avklippt nederkant inte syns.",
      },
      { name: "typeSpeed", label: "Skrivhastighet (ms per tecken)", type: "number", advanced: true, placeholder: "55" },
      background,
    ],
    hasContent: false,
  },

  TwoSides: {
    name: "TwoSides",
    description: "Två sidor mot varandra, med ton: det vi vet mot reservationerna, studie A mot studie B. Vänster visas först, höger på nästa klick.",
    fields: [
      {
        name: "variant",
        label: "Form",
        type: "select",
        options: ["list", "study"],
        default: "list",
        hint: "list = två punktlistor. study = två kort med ett huvudpåstående och en reservation i löptext.",
      },
      chapter,
      { name: "intro", label: "Ingress ovanför", type: "multiline" },
      { name: "leftLabel", label: "Vänster · rubrik", type: "text", required: true, placeholder: "Det vi vet" },
      { name: "leftTone", label: "Vänster · ton", type: "select", options: ["", "positive", "warning", "danger", "neutral"] },
      { name: "leftMeta", label: "Vänster · liten tagg", type: "text", hint: "Syns i study-formen: lärosäte, år, typ av källa." },
      { name: "rightLabel", label: "Höger · rubrik", type: "text", required: true, placeholder: "Reservationerna" },
      { name: "rightTone", label: "Höger · ton", type: "select", options: ["", "positive", "warning", "danger", "neutral"] },
      { name: "rightMeta", label: "Höger · liten tagg", type: "text" },
      { name: "separator", label: "Tecken i mitten", type: "text", placeholder: "vs", advanced: true, hint: "Standard: inget i list, & i study." },
      { name: "stepped", label: "Visa höger sida på nästa klick", type: "boolean", default: true, advanced: true },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentLabel: "De två sidorna",
    contentHint: "Vänster sida först, sedan --- på en egen rad, sedan höger. list: punkter med -. study: första stycket blir påståendet, följande stycken reservationen.",
    defaultContent: "\n- Första punkten\n- Andra punkten\n---\n- Första punkten\n- Andra punkten\n",
  },

  LiquidDivider: {
    name: "LiquidDivider",
    description: "Aktskylt i glas: nummer, titel och en rad om vad som kommer. Räknas som aktgräns i översikten.",
    fields: [
      { name: "number", label: "Aktnummer", type: "text", placeholder: "02" },
      { name: "title", label: "Aktens titel", type: "multiline", required: true, placeholder: "Aktens titel" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "duration", label: "Ungefärlig tid", type: "text", placeholder: "15 min" },
      { name: "accent2", label: "Andra accentfärgen (bakgrundsljuset)", type: "color", advanced: true },
      background,
    ],
    hasContent: false,
  },

  TackSlide: {
    name: "TackSlide",
    description: "Avslutningen: “Tack!”, en bild på föreläsaren, bokomslaget och kontaktvägar med ikoner.",
    fields: [
      { name: "title", label: "Rubrik", type: "text", default: "Tack!" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      chapter,
      { name: "personImage", label: "Bild på föreläsaren", type: "image" },
      { name: "bookImage", label: "Bokomslag", type: "image" },
      accent,
      background,
      overlay("0.78"),
    ],
    hasContent: true,
    contentLabel: "Kontaktvägar",
    contentHint: "En rad per kontaktväg: - plattform · text. Plattformar med ikon: linkedin, instagram, gmail, spotify, web.",
    defaultContent: `\n${AGARE.kontakt.map((rad) => `- ${rad}`).join("\n")}\n`,
  },

  ProcessBeats: {
    name: "ProcessBeats",
    description: "Ett arbetsflöde som en bana med stationer: vem gör vad, i vilken ordning. Kan visa prompten som startade flödet och en länk till det färdiga resultatet.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text", placeholder: "Delegera i steg" },
      { name: "title", label: "Rubrik", type: "multiline" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      chapter,
      {
        name: "prompt",
        label: "Prompten som startade flödet",
        type: "multiline",
        hint: "Visas som ett kort ovanför banan. **fet** markerar Steg 1, Steg 2 …",
      },
      { name: "promptLabel", label: "Etikett på promptkortet", type: "text", placeholder: "Du skickar" },
      { name: "closing", label: "Slutmening", type: "multiline", hint: "Kursiv poäng under banan." },
      { name: "link", label: "Länk till resultatet", type: "text", placeholder: "https://…" },
      { name: "linkLabel", label: "Text på länken", type: "text", placeholder: "Öppna artefakten" },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentLabel: "Stationerna",
    contentHint: "En rad per station: - vad som händer · förklaring · vem. Vem är input, ai, ai-key (det avgörande AI-steget) eller human. Utelämnat = ai.",
    defaultContent:
      "\n- Du beskriver målet · Mål, sammanhang, begränsningar · input\n- AI föreslår · Ett första utkast · ai\n- Du granskar · Beslut och ändringar · human\n",
  },

  TurnStatement: {
    name: "TurnStatement",
    description: "Ett påstående och dess vändning. Först påståendet; på nästa klick ett kopplingsord i marginalen och slutsatsen.",
    fields: [
      { name: "turn", label: "Kopplingsordet", type: "text", placeholder: "Alltså", hint: "Alltså, Nu, För, Svaret …" },
      {
        name: "reveal",
        label: "Slutsatsen · nästa klick",
        type: "multiline",
        required: true,
        placeholder: "Slutsatsen som följer.",
        hint: "**fet** = accentfärg.",
      },
      chapter,
      {
        name: "photoLayout",
        label: "Håll texten till vänster (fotobakgrund)",
        type: "boolean",
        advanced: true,
      },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentFirst: true,
    contentLabel: "Påståendet",
    contentHint: "Det publiken läser först. **fet** = accentfärg.",
    defaultContent: "\nPåståendet som publiken först håller med om.\n",
  },

  LiquidSpeakerIntro: {
    name: "LiquidSpeakerIntro",
    description: "Presentationen av föreläsaren: film, namn, roll, bok och kontaktvägar i glas.",
    fields: [
      { name: "name", label: "Namn", type: "text", required: true, placeholder: AGARE.namn || "Förnamn Efternamn" },
      { name: "title", label: "Roll", type: "multiline" },
      { name: "eyebrow", label: "Kicker", type: "text" },
      { name: "videoSrc", label: "Film", type: "text", required: true, placeholder: "/bilder/…/film.mp4" },
      { name: "videoPoster", label: "Filmens väntbild", type: "image" },
      { name: "bookSrc", label: "Bokomslag", type: "image" },
      { name: "bookAlt", label: "Bokens titel (bildbeskrivning)", type: "text" },
      { name: "linkedin", label: "LinkedIn", type: "text" },
      { name: "instagram", label: "Instagram", type: "text" },
      { name: "email", label: "E-post", type: "text" },
      { name: "website", label: "Webbplats", type: "text" },
      { name: "spotify1", label: "Podd 1 (Spotify)", type: "text" },
      { name: "spotify2", label: "Podd 2 (Spotify)", type: "text" },
      { name: "accent2", label: "Andra accentfärgen (bakgrundsljuset)", type: "color", advanced: true },
      background,
    ],
    hasContent: false,
  },

  PromptWindow: {
    name: "PromptWindow",
    description: "Ett chattfönster där prompten skrivs fram. Visar beställningen — svaret hör hemma på nästa slide eller nästa klick.",
    fields: [
      { name: "modelName", label: "Modellens namn i fönstret", type: "text", placeholder: "Claude" },
      {
        name: "label",
        label: "Etikett uppe till vänster",
        type: "text",
        default: "AI är…",
        hint: "Töm fältet för att dölja etiketten.",
      },
      { name: "portrait", label: "Porträtt bredvid fönstret", type: "image" },
      { name: "portraitAlt", label: "Porträttets bildbeskrivning", type: "text" },
      { name: "portraitCaption", label: "Text under porträttet", type: "text", placeholder: "William" },
      { name: "typeSpeed", label: "Skrivhastighet (ms per tecken)", type: "number", advanced: true, placeholder: "8" },
      background,
      {
        name: "darken",
        label: "Mörkläggning av bakgrunden",
        type: "text",
        advanced: true,
        placeholder: "0.6",
        hint: "0 = ingen, 1 = helt mörk. Standard 0.6.",
      },
    ],
    hasContent: true,
    contentFirst: true,
    contentLabel: "Prompten",
    contentHint: "Hela prompten, som den skrevs. Radbrytningar behålls.",
    defaultContent: "\nSkriv prompten här.\n",
  },

  EditorialQuote: {
    name: "EditorialQuote",
    description: "En text satt i rytm: varje rad får sin egen röst — viskning, brygga, rop, landning. För resonemang som ska läsas som ett uppslag.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      chapter,
      { name: "align", label: "Justering", type: "select", options: ["", "left", "center", "right"] },
      {
        name: "decoration",
        label: "Stort tecken bakom texten",
        type: "text",
        advanced: true,
        placeholder: "“",
        hint: "Standard: ett öppnande citattecken.",
      },
      accent,
      background,
    ],
    hasContent: true,
    contentLabel: "Raderna och deras röst",
    contentHint: "En rad per led: - text · röst. Röster: whisper (lågmält), bridge (leder vidare), shout (det som ska minnas), landing (landar), pause (tom rad).",
    defaultContent:
      "\n- En lågmäld inledning · whisper\n- som leder vidare · bridge\n- **till det som ska minnas.** · shout\n",
  },

  WorkshopHandoff: {
    name: "WorkshopHandoff",
    description: "QR-kod och adress till materialet. Övergången från föreläsning till eget arbete, eller det publiken tar med sig hem.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text", placeholder: "§ Materialet" },
      { name: "corner", label: "Hörnet uppe till höger", type: "text", placeholder: "handoff|↗ workshop", hint: "Två ord med | emellan. Tomt döljer hörnet." },
      { name: "title", label: "Rubrik", type: "multiline", placeholder: "Skanna. Eller skriv in." },
      {
        name: "url",
        label: "Adressen (blir QR-koden)",
        type: "text",
        required: true,
        placeholder: AGARE.webbplats?.href ?? "https://example.com",
      },
      {
        name: "displayUrl",
        label: "Adressen som den visas",
        type: "text",
        placeholder: AGARE.webbplats?.label ?? "example.com",
        hint: "Kort form att skriva av. Tomt = adressen utan https://.",
      },
      { name: "caption", label: "Vad som finns där", type: "multiline" },
      { name: "closing", label: "Slutmening", type: "multiline", hint: "Kursiv rad längst ner." },
      chapter,
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: false,
  },

  LiquidChat: {
    name: "LiquidChat",
    description: "Ett chattsamtal i glas, i meddelandeappens form. Replikerna klickas fram en i taget.",
    fields: [
      { name: "eyebrow", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline" },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "bottomLine", label: "Raden längst ner", type: "multiline", hint: "Kursiv poäng under chatten." },
      chapter,
      { name: "app", label: "Appens namn i fönstret", type: "text", placeholder: "ChatGPT" },
      { name: "status", label: "Statusrad i fönstret", type: "text", placeholder: "Online" },
      { name: "showTyping", label: "Visa skrivindikator före AI-svar", type: "boolean", default: true, advanced: true },
      { name: "userColor", label: "Färg på egna bubblor", type: "color", advanced: true },
      { name: "accent2", label: "Andra accentfärgen (bakgrundsljuset)", type: "color", advanced: true },
      background,
    ],
    hasContent: true,
    contentLabel: "Replikerna",
    contentHint: "En rad per replik: - **Vem:** text. Du, Jag, Elev och User hamnar till höger som egna bubblor, alla andra till vänster.",
    defaultContent: "\n- **Elev:** Frågan som ställs.\n- **AI:** Svaret som kommer tillbaka.\n",
  },

  LivePoll: {
    name: "LivePoll",
    description: "Omröstning med QR-kod. Publiken röstar i mobilen och staplarna växer på skärmen.",
    fields: [
      { name: "title", label: "Frågan", type: "multiline", placeholder: "Hur ofta använder du AI i jobbet?" },
      { name: "subtitle", label: "Förklaring under frågan", type: "multiline" },
      {
        name: "pollKey",
        label: "Omröstningens nyckel",
        type: "text",
        required: true,
        placeholder: "ny-omrostning",
        hint: "Kort och unik, utan mellanslag: klass-frekvens. Rösterna sparas under nyckeln — byt den och staplarna börjar om.",
      },
      chapter,
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentLabel: "Svarsalternativen",
    contentHint: "En rad per alternativ: - alternativ · ton · förklaring. Ton: neutral, accent, success eller danger.",
    defaultContent:
      "\n- Varje dag · neutral · En del av vardagen\n- Någon gång i veckan · neutral · När det passar\n- Sällan eller aldrig · neutral · Inte kommit igång\n",
  },

  LiveReflection: {
    name: "LiveReflection",
    description: "Öppen fråga med QR-kod. Publiken skriver fritt i mobilen och svaren kommer upp som kort.",
    fields: [
      { name: "title", label: "Frågan", type: "multiline", placeholder: "Vad hoppas du få ut av idag?" },
      { name: "subtitle", label: "Förklaring under frågan", type: "multiline" },
      {
        name: "pollKey",
        label: "Frågans nyckel",
        type: "text",
        required: true,
        placeholder: "ny-reflektion",
        hint: "Kort och unik, utan mellanslag. Svaren sparas under nyckeln.",
      },
      { name: "placeholder", label: "Hjälptext i publikens skrivruta", type: "text" },
      chapter,
      { name: "maxCards", label: "Högst antal kort på skärmen", type: "text", advanced: true, placeholder: "24" },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: false,
  },

  TypedChat: {
    name: "TypedChat",
    description: "Ett samtal som skrivs fram av sig självt, replik för replik, bredvid prompten som startade det. För demonstrationer där förloppet är poängen.",
    fields: [
      { name: "title", label: "Rubrik", type: "multiline" },
      chapter,
      { name: "tool", label: "Verktygets namn", type: "text", placeholder: "Copilot" },
      { name: "prompt", label: "Prompten som startade samtalet", type: "multiline" },
      { name: "userLabel", label: "Namn på den som skriver", type: "text", placeholder: "Eleven" },
      { name: "aiLabel", label: "Namn på AI:n", type: "text", placeholder: "Copilot" },
      { name: "typeSpeed", label: "Skrivhastighet (ms per tecken)", type: "number", advanced: true, placeholder: "20" },
      accent,
      { name: "aiAccent", label: "Färg på AI:ns bubblor", type: "color", advanced: true },
      background,
    ],
    hasContent: true,
    contentLabel: "Replikerna",
    contentHint: "En rad per replik: - **Vem:** text. Namnet måste vara samma som i fälten ovan. || ger ny rad i en replik, || || ger blankrad.",
    defaultContent: "\n- **Eleven:** Frågan som ställs.\n- **Copilot:** Svaret som skrivs fram.\n",
  },

  ParadoxStat: {
    name: "ParadoxStat",
    description: "En siffra som säger emot det man väntar sig. Först sammanhanget, sedan bryggordet, sedan siffran som räknas upp.",
    fields: [
      { name: "setup", label: "Sammanhanget", type: "multiline", hint: "Den dämpade första meningen. **fet** = accentfärg." },
      { name: "bridge", label: "Bryggan", type: "text", placeholder: "Ändå…", hint: "Kursivt, i accentfärg: Ändå…, Men…" },
      { name: "value", label: "Siffran", type: "text", required: true, placeholder: "95" },
      { name: "prefix", label: "Före siffran", type: "text", placeholder: "+" },
      { name: "suffix", label: "Efter siffran", type: "text", placeholder: " %" },
      { name: "caption", label: "Vad siffran betyder", type: "multiline", hint: "**fet** = accentfärg." },
      { name: "source", label: "Källa", type: "text" },
      chapter,
      { name: "decimals", label: "Decimaler", type: "text", advanced: true, placeholder: "0" },
      { name: "duration", label: "Uppräkningens längd (s)", type: "text", advanced: true, placeholder: "2.0" },
      accent,
      background,
      overlay("0.78"),
    ],
    hasContent: false,
  },

  BigDefinition: {
    name: "BigDefinition",
    description: "Ett begrepp, stort, med sin definition under. När ett ord ska sätta sig.",
    fields: [
      { name: "term", label: "Begreppet", type: "text", required: true, placeholder: "Begreppet" },
      { name: "fullName", label: "Utskrivet namn ovanför", type: "text", placeholder: "Artificial General Intelligence" },
      { name: "definition", label: "Definitionen", type: "multiline", hint: "**fet** = accentfärg." },
      { name: "source", label: "Källa", type: "text" },
      chapter,
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: false,
  },

  TriadStatement: {
    name: "TriadStatement",
    description: "Två eller tre premisser och en landning. Refrängformen: det, det — och därför det här.",
    fields: [chapter, accent, background, overlay("0.6")],
    hasContent: true,
    contentFirst: true,
    contentLabel: "Premisserna och landningen",
    contentHint: "Ett stycke per premiss, med en tom rad emellan. Efter --- på en egen rad kommer landningen; utan --- blir sista stycket landning. **fet** = accentfärg.",
    defaultContent: "\nFörsta premissen.\n\nAndra premissen.\n\n---\n\nOch därför: **landningen**.\n",
  },

  FullscreenVideo: {
    name: "FullscreenVideo",
    description: "En film över hela ytan, utan ram. Startar av sig själv, utan ljud, om inget annat väljs.",
    fields: [
      { name: "src", label: "Film", type: "text", required: true, placeholder: "/bilder/…/film.mp4" },
      { name: "poster", label: "Väntbild innan filmen startar", type: "image" },
      { name: "controls", label: "Visa spelarens kontroller", type: "boolean", hint: "Behövs om filmen ska ha ljud eller kunna pausas." },
      { name: "fit", label: "Inpassning", type: "select", options: ["", "cover", "contain"], hint: "cover fyller ytan och beskär. contain visar hela bilden med kanter." },
      { name: "loop", label: "Spela om och om igen", type: "boolean", advanced: true },
      { name: "autoPlay", label: "Starta av sig själv", type: "boolean", default: true, advanced: true },
      {
        name: "muted",
        label: "Utan ljud",
        type: "boolean",
        default: true,
        advanced: true,
        hint: "Webbläsare startar inte film med ljud av sig själva.",
      },
      { name: "background", label: "Färg bakom filmen (vid contain)", type: "color", advanced: true },
    ],
    hasContent: false,
  },

  TypewriterQuote: {
    name: "TypewriterQuote",
    description: "Ett citat som skrivs fram tecken för tecken, som i en tidningsspalt. För den skrivna rösten: en krönika, ett mejl, ett inlägg.",
    fields: [
      {
        name: "text",
        label: "Texten som skrivs fram",
        type: "multiline",
        required: true,
        placeholder: "Det någon faktiskt skrev.",
      },
      { name: "attribution", label: "Vem som skrev det", type: "text" },
      { name: "kicker", label: "Kicker", type: "text", placeholder: "Namn · tidning · datum" },
      chapter,
      { name: "align", label: "Justering", type: "select", options: ["", "left", "center"] },
      { name: "typeSpeed", label: "Skrivhastighet (tecken per sekund)", type: "number", advanced: true, placeholder: "35" },
      { name: "startDelay", label: "Väntan innan skrivandet börjar (ms)", type: "number", advanced: true, placeholder: "600" },
    ],
    hasContent: false,
  },

  ThreeUp: {
    name: "ThreeUp",
    description: "Tre bilder sida vid sida med var sin etikett. Tre exempel, tre verktyg, tre elevarbeten.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline", required: true, placeholder: "Tre exempel" },
      { name: "body", label: "Ingress", type: "multiline" },
      {
        name: "imageFit",
        label: "Inpassning av bilderna",
        type: "select",
        options: ["", "cover", "contain"],
        hint: "cover beskär till rutan. contain visar hela bilden.",
      },
      { name: "stepped", label: "Visa en i taget med klick", type: "boolean", advanced: true },
      accent,
      background,
    ],
    hasContent: true,
    contentLabel: "De tre rutorna",
    contentHint: "En rad per ruta: - **Etikett** · kort text · /sökväg/till/bild.png · tag:Märkning. Bild och märkning är frivilliga.",
    defaultContent: "\n- **Första** · Kort förklaring\n- **Andra** · Kort förklaring\n- **Tredje** · Kort förklaring\n",
  },

  StudentVoices: {
    name: "StudentVoices",
    description: "Flera röster på samma yta, var och en med sin avsändare. Elevröster, lärarröster, röster ur en enkät.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline" },
      { name: "body", label: "Ingress", type: "multiline" },
      accent,
      background,
    ],
    hasContent: true,
    contentLabel: "Rösterna",
    contentHint: "En rad per röst: - **Avsändare:** citatet.",
    defaultContent: "\n- **Elev, åk 8:** Det första citatet.\n- **Elev, åk 9:** Det andra citatet.\n",
  },

  QuoteCollage: {
    name: "QuoteCollage",
    description: "Citat som skrivs fram ett efter ett och blir liggande som ett kollage. Byggd för blottläggning: det chattboten faktiskt svarade.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "header", label: "Rad ovanför citaten", type: "text", placeholder: "Adam, 16 · samtal med ChatGPT" },
      { name: "source", label: "Källa", type: "text" },
      { name: "typingSpeed", label: "Skrivhastighet (ms per tecken)", type: "text", advanced: true, placeholder: "24" },
      { name: "betweenPause", label: "Paus mellan citaten (ms)", type: "text", advanced: true, placeholder: "1100" },
      {
        name: "accent",
        label: "Accentfärg",
        type: "color",
        advanced: true,
        hint: "Standard är signalrött — mallen är tänkt för blottläggning.",
      },
      background,
    ],
    hasContent: true,
    contentLabel: "Citaten",
    contentHint: "En rad per citat. Börja raden med ALERT: för det citat som ska slå i rött.",
    defaultContent: "\n- Det första citatet.\n- ALERT: Citatet som ska slå.\n",
  },

  PromptHero: {
    name: "PromptHero",
    description: "Stor rubrik till vänster, bild till höger och en chattbubbla med prompten. Öppnar ett exempel: så här frågade någon.",
    fields: [
      { name: "eyebrow", label: "Kicker", type: "text", hint: "**fet** = accentfärg." },
      { name: "title", label: "Rubrik", type: "multiline", required: true, placeholder: "Rubriken" },
      { name: "titleSize", label: "Rubrikens storlek", type: "select", options: ["md", "lg", "xl"], variant: "pills", default: "xl", advanced: true },
      { name: "subtitle", label: "Underrubrik", type: "multiline", hint: "**fet** = accentfärg." },
      { name: "prompt", label: "Prompten i chattbubblan", type: "multiline" },
      { name: "promptModel", label: "Avsändare i bubblan", type: "text", placeholder: "ChatGPT" },
      { name: "image", label: "Bild till höger", type: "image", required: true },
      { name: "imageAlt", label: "Bildbeskrivning", type: "text" },
      {
        name: "imageOffsetY",
        label: "Flytta bilden i höjdled",
        type: "text",
        advanced: true,
        placeholder: "10%",
        hint: "CSS-värde: 10% eller 4rem.",
      },
      accent,
      background,
    ],
    hasContent: false,
  },

  NamedPortrait: {
    name: "NamedPortrait",
    description: "Ett porträtt, med namnet rullande stort och långsamt i bakgrunden. Presenterar en person som berättelsen handlar om.",
    fields: [
      { name: "name", label: "Namnet", type: "text", required: true, placeholder: "Namnet" },
      { name: "image", label: "Porträtt", type: "image", required: true },
      { name: "alt", label: "Bildbeskrivning", type: "text" },
      { name: "direction", label: "Namnet rullar åt", type: "select", options: ["", "left", "right"], advanced: true },
      { name: "scrollDuration", label: "Sekunder per varv", type: "number", advanced: true, placeholder: "40" },
      background,
      {
        name: "darken",
        label: "Mörkläggning av bakgrunden",
        type: "number",
        advanced: true,
        placeholder: "0.55",
        hint: "0 = ingen, 1 = helt mörk. Standard 0.55.",
      },
    ],
    hasContent: false,
  },

  ProcessChain: {
    name: "ProcessChain",
    description: "En kedja av led med var sin symbol: text blir bild blir ljud blir film. Visar hur ett material byter form.",
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline" },
      { name: "body", label: "Ingress", type: "multiline" },
      { name: "direction", label: "Riktning", type: "select", options: ["", "horizontal", "vertical"] },
      accent,
      background,
      overlay("0.6"),
    ],
    hasContent: true,
    contentLabel: "Leden",
    contentHint: "En rad per led: - **Etikett** · kort text · sort. Sorter: text, image, audio, video, code, story. En bild läggs till med image:/sökväg/bild.png.",
    defaultContent: "\n- **Texten** · Det eleven skrev · text\n- **Bilden** · Samma innehåll som bild · image\n- **Podden** · Samma innehåll som samtal · audio\n",
  },

  ChatHero: {
    name: "ChatHero",
    description: "Stor rubrik till vänster och ett chattsamtal som spelas upp till höger. Öppnar ett exempel med samtalet i centrum.",
    fields: [
      { name: "eyebrow", label: "Kicker", type: "text" },
      { name: "title", label: "Rubrik", type: "multiline", required: true, placeholder: "Rubriken" },
      { name: "titleSize", label: "Rubrikens storlek", type: "select", options: ["md", "lg", "xl"], variant: "pills", default: "xl", advanced: true },
      { name: "subtitle", label: "Underrubrik", type: "multiline" },
      { name: "image", label: "Bild", type: "image" },
      { name: "imageAlt", label: "Bildbeskrivning", type: "text" },
      { name: "aiLabel", label: "AI:ns etikett i bubblan", type: "text", placeholder: "AI" },
      { name: "voice", label: "Visa mikrofon vid rubriken", type: "boolean", hint: "För exempel där eleven talar in." },
      {
        name: "userPattern",
        label: "Vilka namn som är användaren",
        type: "text",
        advanced: true,
        placeholder: "elev|du|user|jag",
        hint: "Namn som hamnar till höger som egna bubblor, skilda med |.",
      },
      { name: "beat", label: "Tid mellan replikerna (ms)", type: "text", advanced: true, placeholder: "1600" },
      accent,
      background,
    ],
    hasContent: true,
    contentLabel: "Replikerna",
    contentHint: "En rad per replik: - **Vem:** text. Elev, Du, Jag och User hamnar till höger, alla andra till vänster.",
    defaultContent: "\n- **Elev:** Frågan som ställs.\n- **AI:** Svaret som kommer tillbaka.\n",
  },
};
