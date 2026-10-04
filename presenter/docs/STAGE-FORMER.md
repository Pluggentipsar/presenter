# Stage-formerna

> Genereras av `node presenter/scripts/stage-referens.mjs` ur formregistret (`src/templates/stage/stage-forms.ts`). Ändra inte för hand. 67 former.

En slide i Stage-motorn skrivs `<Stage form="<form>" slideId="…" …fält… />`. Fälten är props; all synlig text och alla bilder är fält, så att R-editorn kan ändra dem. Hur formerna fungerar, textsyntaxen och världarna står i `STAGE.md`.

## Fält som alla former har

| Fält | Betydelse |
|---|---|
| `kicker` | Överrubrik |
| `credit` | Ursprung / fotrad |
| `adress` | Adress som visas stort nere till höger (till exempel exempel.se/material) |
| `layout` | Bildläge (talare, full eller horn = du liten nere till höger; per steg med komma) |
| `horizon` | Horisontens höjd (0,5–0,95) |
| `light` | Ljusets läge i procent av bredden, per steg med komma (till exempel 20,50,80) |
| `ambient` | Vattnet (flow eller still) |
| `backdrop` | Bakgrund (tomt = sjön med horisont och ljus, vag = den rörliga vågen, vag-delad = vågen i delad färg, tema = bara temats bakgrund) |
| `tone` | Tid på dygnet (tomt = temat, dag = dagsljus) |
| `dygn` | Gryning över sjön (natt, gryning eller morgon; per steg med komma; himlen ljusnar långsamt dit) |
| `enter` | Rörelseriktning in (upp, ner, hoger, vanster, djup eller nara) |
| `play` | Ord som rör sig: ord:effekt, skilj med \| (vax, krymp, glid, lyft, sjunk, skaka, oppna, stang, samlas, bygg, tand, blekna, flimmer, vand, stryk, bro) |
| `resa` | Resan hit genom världen (in = nytt kapitel, upp = återkomst, ut = helheten, stilla = fråga, hoger/vanster bara mellan helbilder; tomt = ner) |
| `filmfarg` | Ljusets färg på just den här sliden (profilfärg som aprikos eller #rrggbb; tomt = deckets filmfarg) |
| `background` | Foto som bakgrund |
| `backgroundAlt` | Fotots beskrivning |
| `skala` | Tiopotensen (zoomen; 7 = planeten, 0 = ett bord, −2 = en duk; per steg med komma) |
| `vy` | Slöjan över zoomen (full, dov, mork eller 0–1; per steg med komma) |
| `plats` | Platsen i skalmätaren (tomt = nivåns egen) |
| `kamera` | Kameran inom nivån (tomt, nara, fjarran eller horisont; per steg med komma) |
| `inkomst` | Inträdet (portal = sliden öppnas ur bryggans portal) |

## Formerna

### `poster` · Affisch · ett till tre led

Bildläge: talare. Klicklägen: `props => Math.max(1, ["title", "title2", "title3"].filter(key => has(props, key)).length)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `title2` … `title3` | Andra ledet (nästa klick) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `caption` | Bildtext | flera rader |
| `size` | Storlek (xl, l, m, s) | text |
| `image` | Bild | bild |
| `imageAlt` | Bildbeskrivning | text |
| `imageCaption` | Bildtext under bilden (till exempel AI-genererad illustration) | text |
| `echo` | Ekot som blir rubriken (samma antal rader; orden som skiljer glider ut och in när sliden kommer) | flera rader |
| `vis` | Visualisering bredvid (prisfall = logaritmisk kurva som faller) | text |
| `visText` | Visualiseringens etikett och källrad (skilj med \|) | text |
| `visData` | Visualiseringens tal (prisfall: från\|till\|faktor per år, till exempel 2023\|2025\|40) | text |

### `quote` · Citat · valfri bild och framhävning

Bildläge: talare. Klicklägen: `props => has(props, "after") || has(props, "emphasis") ? 2 : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `quote` | Citat · rad som börjar med ~ blir mjukare | flera rader |
| `attribution` | Avsändare | text |
| `image` | Bild | bild |
| `imageAlt` | Bildbeskrivning | text |
| `imagePlace` | Bildens plats (side eller below) | text |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `after` | Följdrad (nästa klick) | flera rader |
| `size` | Storlek (xl, l, m, s) | text |

### `chat` · Chatt · en replik per klick

Bildläge: full. Klicklägen: `props => Math.max(1, count(props, "msg", MAX_MESSAGES) + (has(props, "note") ? 1 : 0))`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `chatTitle` | Chattens rubrik | text |
| `device` | Form (panel eller telefon) | text |
| `size` | Storlek (xl, l, m, s) | text |
| `who1` … `who6` | Avsändare (du, elev, ai, talare, not) | text |
| `label1` … `label6` | Etikett | text |
| `msg1` … `msg6` | Replik | flera rader |
| `mark1` … `mark6` | Framhävt i repliken, skilj med \| | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `image` | Bild | bild |
| `imageAlt` | Bildbeskrivning | text |

### `words` · Ordfält → påstående

Bildläge: talare. Klicklägen: `props => has(props, "words") && has(props, "title") ? 2 : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `words` | Ord, skilj med \| | flera rader |
| `title` | Rubrik | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `stats` · Stora tal → slutsats

Bildläge: talare. Klicklägen: `props => 1 + (has(props, "note") ? 1 : 0) + (has(props, "note2") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `unit` | Enhet | text |
| `value1` … `value4` | Värde | text |
| `label1` … `label4` | Etikett | text |
| `dots1` … `dots4` | Prickar av 10 | text |
| `from1` … `from4` | Förra värdet 1 (räknas om till värdet på notens klick) | text |
| `fromLabel` | När det förra värdet gällde (till exempel 2025) | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `note2` | Tillägg (nästa klick) | flera rader |

### `split` · Två sidor → slutsats

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `leftLabel` | Vänster · etikett | text |
| `leftText` | Vänster · text | flera rader |
| `leftRole` | Vänster · roll | text |
| `rightLabel` | Höger · etikett | text |
| `rightText` | Höger · text | flera rader |
| `rightRole` | Höger · roll | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `stack` · Rader, en i taget

Bildläge: talare. Klicklägen: `props => Math.max(1, count(props, "item", MAX_ITEMS) + (has(props, "note") ? 1 : 0) + (Number(props.pile) > 0 ? 1 : 0))`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `tag1` … `tag8` | Etikett | text |
| `item1` … `item8` | Rad | flera rader |
| `role1` … `role8` | Roll (human, ai, shared, alert) | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `image` | Bild | bild |
| `imageAlt` | Bildbeskrivning | text |
| `imageCaption` | Bildtext under bilden (till exempel AI-genererad illustration) | text |
| `pile` | Hög före listan: antal chattskärmbilder utan text (till exempel 20; eget klick, sedan glider högen undan) | text |
| `sink1` … `sink3` | Formel som sjunker 1 (glittrar och sjunker när sliden kommer) | text |

### `media` · Bild, film eller ljud · valfri prompt före

Bildläge: full. Klicklägen: `props => { let steps = 0; for (let i = 1; i <= MAX_MEDIA; i++) if (has(props, `media${i}`) || has(props, `caption${i}`) || has(props, `doc${i}`)) steps += has(props, `prompt${i}`) ? 2 : 1; return Math.max(1, steps + (has(props, "note") ? 1 : 0)); }`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `promptLabel` | Promptens etikett (tomt = Prompt) | text |
| `prompt1` … `prompt6` | Prompt före | flera rader |
| `media1` … `media6` | Fil | bild |
| `kind1` … `kind6` | Typ (image, video, audio, placeholder) | text |
| `doc1` … `doc6` | Dokument på papper (rad som slutar med kolon blir rubrik) | flera rader |
| `caption1` … `caption6` | Bildtext | flera rader |
| `alt1` … `alt6` | Beskrivning | text |
| `sound1` … `sound6` | Filmens ljud (ja eller tomt) | text |
| `stamp1` … `stamp6` | stamp | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `noteStyle` | Slutradens form (notis = en notis glider in över mediet; tomt = stor rad) | text |
| `noteLabel` | Notisens avsändare och tid (till exempel Mitt röriga liv · nu) | text |
| `anchor` | Underlaget som stannar (mediets nummer, till exempel 1): de andra samlas under det och fälls ut runt det vid slutraden | text |

### `title` · Filmens titel

Bildläge: talare. Klicklägen: `() => 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `series` | Serienamn | text |
| `filmLabel` | Filmnummer | text |
| `filmTitle` | Filmens titel | flera rader |
| `speaker` | Namn | text |
| `speakerRole` | Titel | flera rader |
| `film` | Filmens nummer i serien (ljusen på vattnet; tomt = inga ljus) | text |
| `films` | Antal filmer i serien (standard 4) | text |
| `next` | Nästa films nummer (slutskylt: ljuset glider dit) | text |
| `puzzle` | Pusslet med den lediga platsen bredvid titeln (ja eller tomt) | text |

### `raster` · En sak till → ett lager över allt

Bildläge: talare. Klicklägen: `() => 2`

| Fält | Betydelse | Typ |
|---|---|---|
| `rows` | Rader, skilj med \| | flera rader |
| `box` | Rutans ord | text |
| `q1` … `q2` | Fråga när rutan står bredvid | flera rader |

### `tokens` · Väskan · så växer ett svar fram

Bildläge: full. Klicklägen: `() => 7`

| Fält | Betydelse | Typ |
|---|---|---|
| `prompt` | Prompt | flera rader |
| `cand1` … `cand3` | Förslag | flera rader |
| `candNote` | Rad under förslagen (samma klick) | flera rader |
| `trainSources` | Träningsdata, skilj med \| | flera rader |
| `trainWord` | Träningens ord | flera rader |
| `train2` | Fortsatt träning, skilj med \| | flera rader |
| `tokens` | Textbitar, skilj med \| | flera rader |
| `tokenLabel` | Förklaring av token | text |
| `prompt2` | Prompt med sammanhang | flera rader |
| `answer2` | Svar med sammanhang | flera rader |
| `final` | Slutrad | flera rader |
| `image` | Föremål till meningen och slutraden (frilagt, valfritt) | bild |
| `imageAlt` | Föremålets beskrivning | text |
| `image2` | Föremål till sammanhanget (frilagt, valfritt) | bild |
| `image2Alt` | Föremålets beskrivning | text |

### `gym` · Gymmet · tre ton

Bildläge: talare. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `q` | Fråga | flera rader |
| `a1` … `a4` | Svar | flera rader |
| `a1b` | Svar 1 · stort | flera rader |
| `a2b` | Fråga 2 | flera rader |
| `a3b` | Svar 3 | flera rader |
| `image` | Bild | bild |
| `imageAlt` | Bildbeskrivning | text |
| `image2` | Bild 2 | bild |
| `image2Alt` | Bild 2 · beskrivning | text |

### `krets` · Strömkretsen · förutsäg först

Bildläge: full. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `prompt` | Prompt | flera rader |
| `question` | Förutsägelsefrågan | flera rader |
| `u1` … `u2` | Spänning före (V) | flera rader |
| `r` | Resistans (Ω) | flera rader |
| `final` | Slutrad | flera rader |

### `pussel` · Pusselbiten

Bildläge: talare. Klicklägen: `() => 2`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `label` | Pusselbitens ord | text |

### `evidence` · Studien · med stöd, sedan själv

Bildläge: full. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `study` | Studien | flera rader |
| `g1` … `g3` | Grupp | flera rader |
| `phase1` … `phase2` | Fas | flera rader |
| `v1b` | Fas 1 · grupp 2 | flera rader |
| `v1c` | Fas 1 · grupp 3 | flera rader |
| `v2b` | Fas 2 · grupp 2 | flera rader |
| `v2c` | Fas 2 · grupp 3 | flera rader |
| `foot` | Fotnot | flera rader |
| `final` | Slutrad | flera rader |

### `sources` · Vad bygger svaret på?

Bildläge: full. Klicklägen: `() => 6`

| Fält | Betydelse | Typ |
|---|---|---|
| `answer` | Svarets text | flera rader |
| `answerLabel` | Svarets ursprung | text |
| `seg1` … `seg3` | Markerad del | flera rader |
| `tag1` … `tag3` | Etikett | text |
| `cardTitle1` … `cardTitle3` | Kort · rubrik | flera rader |
| `cardText1` … `cardText3` | Kort · text | flera rader |
| `cardLabel1` … `cardLabel3` | Kort · etikett | text |
| `note1` … `note3` | Notering | flera rader |

### `bro` · Bron · ett föremål flyger över vattnet

Bildläge: talare. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `image` | Föremålet som flyger (frilagt) | bild |
| `imageAlt` | Bildbeskrivning | text |
| `leftLabel` | Startsidan · etikett | text |
| `leftText` | Startsidan · ord | flera rader |
| `rightLabel` | Målet · etikett | text |
| `rightText` | Målet · ord | flera rader |
| `excerptLabel` | Utdragets märkning | text |
| `excerpt` | Utdrag (andra klicket) | flera rader |
| `title` | Rubrik när föremålet flyger | flera rader |
| `title2` | Andra ledet (sista klicket) | flera rader |
| `route` | Vägen vidare (sista klicket) | flera rader |

### `variation` · Variation · vad hålls lika, vad varierar?

Bildläge: full. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik (första klicket) | flera rader |
| `themeLabel` | Etikett före temat | text |
| `media1` … `media3` | Fil | bild |
| `alt1` … `alt3` | Beskrivning | text |
| `theme1` … `theme3` | Tema | text |
| `plot1` … `plot3` | Handling | flera rader |
| `same1` … `same2` | Lika (andra klicket) | text |
| `vary1` … `vary2` | Varierar (andra klicket) | text |
| `question` | Fråga (sista klicket) | flera rader |

### `instruktion` · Från behov till instruktion

Bildläge: full. Klicklägen: `props => 1 + [1, 2, 3].filter(n => has(props, `part${n}`)).length + (has(props, "badEnd") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `startLabel` | Första beställningen · avsändare | text |
| `start` | Första beställningen | text |
| `startNote` | Kommentar till första beställningen | flera rader |
| `panelLabel` | Instruktionens märkning | text |
| `part1Tag` | Del 1 · etikett | text |
| `part1` … `part3` | Del | flera rader |
| `part2Tag` | Del 2 · etikett | text |
| `part3Tag` | Del 3 · etikett | text |
| `zoom` | Förstorad rad (står ordagrant i del 3) | flera rader |
| `endLabel` | Exemplets märkning | text |
| `badEnd` | Slutet som ger bort temat (stryks) | flera rader |
| `goodEnd` | Handlingen som ersätter det | flera rader |

### `bok` · Föremål → ett förlopp i tre led

Bildläge: talare. Klicklägen: `props => has(props, "loop1") ? 2 : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `image` | Föremålet (frilagt) | bild |
| `imageAlt` | Bildbeskrivning | text |
| `title` | Rubrik | flera rader |
| `subtitle` | Underrad | flera rader |
| `loopLabel` | Förloppets etikett (andra klicket) | text |
| `loop1` … `loop4` | Led | text |
| `loopNote` | Rad under förloppet | flera rader |
| `loopKind` | Form (loop eller list) | text |

### `answer` · Lång prompt → svar i utdrag

Bildläge: full. Klicklägen: `props => 2 + (has(props, "flag") ? 1 : 0) + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `promptLabel` | Promptens avsändare | text |
| `prompt` | Prompten | flera rader |
| `material` | Inklistrat underlag (visas som inslag i prompten) | flera rader |
| `answerLabel` | Svarets ursprung (tjänst, modell, datum) | text |
| `answer` | Svaret i utdrag · rad som börjar med # blir rubrik | flera rader |
| `highlight` | Lyfts fram när svaret kommer, skilj med \| | text |
| `flag` | Markeras som överdrift på nästa klick, skilj med \| | text |
| `flagNote` | Rad under svaret när överdriften markeras | flera rader |
| `note` | Slutrad (sista klicket) | flera rader |

### `friktion` · Friktion · tre lägen i samma uppgift

Bildläge: talare. Klicklägen: `() => 5`

| Fält | Betydelse | Typ |
|---|---|---|
| `context` | Uppgiften | flera rader |
| `work1` … `work3` | Arbete | text |
| `pupilLabel` | Etikett · eleven arbetar | text |
| `helpLabel` | Etikett · AI hjälper | text |
| `aiLabel` | Etikett · AI tar över | text |
| `label1` … `label3` | Läge 1 · rubrik | text |
| `detail1` … `detail3` | Läge 1 · text | flera rader |
| `extra1` … `extra3` | Extra arbete | text |
| `question` | Fråga (sista klicket) | flera rader |

### `utdrag` · Utdrag · en rad ur en längre text

Bildläge: talare. Klicklägen: `() => 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `label` | Textens märkning | text |
| `text` | Hela texten (liten) | flera rader |
| `line` | Raden som lyfts fram (står ordagrant i texten) | flera rader |

### `bredd` · Bredden · bättre var för sig, mer lika tillsammans

Bildläge: talare. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `stage1` … `stage3` | Rad 1 (korten spridda) | flera rader |
| `question` | Fråga (sista klicket) | flera rader |

### `bryt` · Uppgiften bryts upp · målet avgör

Bildläge: talare. Klicklägen: `() => 3`

| Fält | Betydelse | Typ |
|---|---|---|
| `taskLabel` | Uppgiftens etikett | text |
| `task` | Uppgiften | flera rader |
| `part1` … `part6` | Arbete | flera rader |
| `goal` | Arbeten som målet gäller (nummer, till exempel 3,4) | text |
| `focus` | Fråga om målet | flera rader |
| `detail` | Målet | flera rader |

### `tvilling` · Tvillingar · behåll kunnandet, byt förutsättningen

Bildläge: full. Klicklägen: `props => 1 + [1, 2, 3].filter(n => has(props, `task${n}`)).length + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `leftLabel` | Kolumnrubrik · uppgiften | text |
| `rightLabel` | Kolumnrubrik · tvillingen | text |
| `subj1` … `subj3` | Ämne | text |
| `task1` … `task3` | Uppgift | flera rader |
| `twin1` … `twin3` | Tvilling | flera rader |
| `note` | Slutsats (sista klicket) | flera rader |

### `privat` · Skärmbilden · vad följer med när eleven ber om hjälp?

Bildläge: full. Klicklägen: `() => 6`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `appLabel` | Chattens namn | text |
| `promptLabel` | Elevens avsändare | text |
| `prompt` | Elevens prompt | flera rader |
| `attachLabel` | Bilagans namn | text |
| `screenshotLabel` | Skärmbildens märkning | text |
| `image` | Kompisens profilbild (skapad) | bild |
| `imageAlt` | Bildbeskrivning | text |
| `contactName` | Kompisens namn (påhittat) | text |
| `contactDetail` | Klass | text |
| `chatDate` | Dag | text |
| `message1` … `message3` | Kompisens meddelande | flera rader |
| `highlight1` … `highlight2` | Markeras i meddelande 1 (ordagrant) | flera rader |
| `mark1` … `mark4` | Markering | text |
| `question` | Frågan (står ensam) | flera rader |
| `serviceLabel1` … `serviceLabel2` | Tjänst A · etikett | text |
| `service1` … `service2` | Tjänst A · svar | flera rader |
| `note` | Slutsats under tjänsterna | flera rader |

### `lyktor` · Frågan · svaren tänds som ljus på vattnet

Bildläge: full. Klicklägen: `props => has(props, "answers") ? 2 + (has(props, "title") ? 1 : 0) : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `question` | Frågan | flera rader |
| `hint` | Rad under frågan (försvinner när svaren kommer) | flera rader |
| `answersLabel` | Svarens märkning (till exempel Exempelsvar) | text |
| `answers` | Svar, skilj med \| (de tolv första får text, resten blir ljus) | flera rader |
| `title` | Påståendet när ljusen samlas (sista klicket) | flera rader |
| `after` | Rad under påståendet | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `vecka` · Veckan · sortera i ÅT MIG, MED MIG, MOT MIG

Bildläge: full. Klicklägen: `props => 4 + (has(props, "keepLabel") || has(props, "keepText") ? 1 : 0) + (count(props, "result", MAX_WEEK) ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `subtitle` | Underrad till veckan | flera rader |
| `days` | Dagar, skilj med \| (fem stycken) | text |
| `item1` … `item12` | Rad | flera rader |
| `day1` … `day12` | Dag (1–5) | text |
| `time1` … `time12` | Klockslag | text |
| `role1` … `role12` | Roll (human, ai, shared, alert) | text |
| `result1` … `result12` | Resultatet som bild (sista klicket) | bild |
| `resultLabel1` … `resultLabel12` | Resultatets märkning | flera rader |
| `atLabel` | ÅT MIG · rubrik | text |
| `atText` | ÅT MIG · förklaring | flera rader |
| `medLabel` | MED MIG · rubrik | text |
| `medText` | MED MIG · förklaring | flera rader |
| `motLabel` | MOT MIG · rubrik | text |
| `motText` | MOT MIG · förklaring | flera rader |
| `keepLabel` | Det som stannar · rubrik | text |
| `keepText` | Det som stannar · förklaring | flera rader |
| `resultTitle` | Resultaten · rubrik (sista klicket) | text |
| `resultText` | Resultaten · förklaring | flera rader |

### `strander` · Två stränder · JAG → AI → JAG

Bildläge: full. Klicklägen: `props => 4 + (has(props, "title") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `left` | Vänstra stranden · ord | text |
| `mid` | Vattnet · ord | text |
| `right` | Högra stranden · ord | text |
| `leftLabel` | Före · etikett | text |
| `leftText` | Före · frågor (första klicket) | flera rader |
| `midLabel` | Vattnet · etikett | text |
| `midText` | Vattnet · frågor (andra klicket) | flera rader |
| `rightLabel` | Efter · etikett | text |
| `rightText` | Efter · frågor (tredje klicket) | flera rader |
| `title` | Påståendet (sista klicket) | flera rader |
| `after` | Rad under påståendet | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `mot` · MOT MIG · beslutet får motstånd

Bildläge: full. Klicklägen: `props => 1 + count(props, "prompt", 4) + (["note1", "note2", "note3", "note4"].some(key => has(props, key)) ? 1 : 0) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `decisionLabel` | Beslutets märkning | text |
| `decision` | Beslutet (papperet) | flera rader |
| `context` | Bakgrund på papperet · rad som börjar med • blir punkt | flera rader |
| `move1` … `move4` | Drag 1 · namn | text |
| `prompt1` … `prompt4` | Drag 1 · prompt | flera rader |
| `note1` … `note4` | Drag 1 · AI:ns motstånd (samlat efter sista draget) | flera rader |
| `notesLabel` | Motståndets märkning | text |
| `final` | Slutsats (sista klicket) | flera rader |
| `finalNote` | Rad under slutsatsen | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `bygga` · AI kan också bygga · beställning → skärm → förmågor

Bildläge: full. Klicklägen: `props => 1 + (has(props, "prompt") ? 1 : 0) + (has(props, "result") ? 1 : 0) + (count(props, "tile", 4) ? 1 : 0) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `promptLabel` | Beställningens avsändare | text |
| `prompt` | Beställningen (första klicket) | flera rader |
| `attachment` | Bifogad fil | text |
| `result` | Det som byggdes (skärmbild, zoomas in) | bild |
| `resultAlt` | Skärmbildens beskrivning | text |
| `resultLabel` | Märkning på skärmbilden (till exempel Gjord med Claude) | text |
| `url` | Adressraden | text |
| `tile1` … `tile4` | Kort 1 · namn | text |
| `tileText1` … `tileText4` | Kort 1 · text | flera rader |
| `tileChip1` … `tileChip4` | Kort 1 · märkning | text |
| `tileIcon1` … `tileIcon4` | Kort 1 · ikon (research, analys, kod, agent) | text |
| `webTile` | Kortet som skärmbilden blir (1–4, standard 3) | text |
| `final` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `sortera` · Sortera · varje papper faller i sitt fack

Bildläge: full. Klicklägen: `props => 1 + count(props, "doc", 8) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `lane1` … `lane3` | Fack 1 · namn | text |
| `rule1` … `rule3` | Fack 1 · regel | flera rader |
| `laneRole1` … `laneRole3` | Fack 1 · roll (human, shared, ai; tomt = grönt) | text |
| `doc1` … `doc8` | Papper 1 (ett per klick) | flera rader |
| `docLane1` … `docLane8` | Papperets fack (1–3) | text |
| `floor` | Fackens golv i px (standard 820; 760 håller papperen ovanför textningen) | text |
| `final` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `kurva` · U-kurvan · ljuset följer kurvan

Bildläge: full. Klicklägen: `props => Math.max(1, count(props, "point", 3)) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `xLabel` | Etikett längs x-axeln | text |
| `yLabel` | Etikett längs y-axeln | text |
| `point1` … `point3` | Början · namn | text |
| `pointText1` … `pointText3` | Början · text | flera rader |
| `note` | Fotnot under x-axeln (till exempel Schematisk bild) | flera rader |
| `final` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `trappa` · Trappan · ett steg nedåt per klick

Bildläge: full. Klicklägen: `props => 1 + count(props, "stepLabel", 6) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `stepLabel1` … `stepLabel6` | Steg · namn | text |
| `stepText1` … `stepText6` | Steg · text | flera rader |
| `stepRole1` … `stepRole6` | Steg · roll (human, shared, ai) | text |
| `stepWho1` … `stepWho6` | Steg · vem (JAG, VI, AI) | text |
| `image` | Skärmbild som visas med ett av stegen | bild |
| `imageAlt` | Skärmbildens beskrivning | text |
| `imageCaption` | Bildtext | text |
| `imageStep` | Steget där bilden kommer (standard 4) | text |
| `final` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `efter` · Jag efter · ljusen stiger, sjunker och samlas

Bildläge: full. Klicklägen: `props => 1 + count(props, "question", 3) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `question1` … `question3` | Fråga 1 · ljus stiger | flera rader |
| `final` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `lights` | Antal ljus på vattnet (standard 27) | text |

### `genvag` · Genvägen · AI hoppar över elevens arbete

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik (valfri) | flera rader |
| `taskLabel` | Uppgiftens etikett | text |
| `task` | Uppgiften | flera rader |
| `pathLabel` | Elevens väg · etikett | text |
| `work1` … `work3` | Arbete | text |
| `aiLabel` | Genvägens etikett (nästa klick) | text |
| `resultLabel` | Resultatets etikett | text |
| `result` | Det färdiga svaret | bild |
| `note` | Frågan (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `detektor` · Detektorn · siffran och omdömet

Bildläge: full. Klicklägen: `() => 4`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `contextLabel` | Textens etikett | text |
| `context` | Elevens text (påhittad) | flera rader |
| `toolLabel` | Verktygets etikett (andra klicket) | text |
| `value` | Siffran i procent | text |
| `verdict` | Verktygets bedömning | text |
| `reaction` | Lärarens reaktion (tredje klicket) | flera rader |
| `concept` | Begreppet | text |
| `explanation` | Begreppets förklaring | flera rader |
| `focus` | Forskningen · rad 1 (fjärde klicket) | flera rader |
| `detail` | Forskningen · rad 2 | flera rader |
| `quote` | Citatet | flera rader |
| `quoteSource` | Citatets källa | text |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `insattning` · En modell får ett led till · EPA → ECPA

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `letter1` … `letter4` | Bokstav | text |
| `name1` … `name4` | Namn | text |
| `detail1` … `detail4` | Förklaring | flera rader |
| `role1` … `role4` | Roll 1 (human, ai, shared) | text |
| `insert` | Ledet som skjuts in på andra klicket (1–4, standard 2) | text |
| `note` | Slutrad (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `vagg` · Videoväggen · klipp som kunde vara sanna

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubriken (andra klicket) | flera rader |
| `caption` | Rad under rubriken | flera rader |
| `media1` … `media6` | Klipp 1 (tyst loop eller bild) | bild |
| `alt1` … `alt6` | Beskrivning | text |
| `caption1` … `caption6` | Märkning 1 (syns med rubriken) | flera rader |
| `note` | Slutrad (valfri) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `ord` · Hörde ni? · människoorden tänds

Bildläge: talare. Klicklägen: `props => 2 + (has(props, "title") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `line1` … `line4` | Mening | flera rader |
| `source1` … `source4` | Avsändare | text |
| `word1` … `word4` | Människoordet i mening 1 (ordagrant) | text |
| `wordsLabel` | Raden när orden tänds (andra klicket) | text |
| `title` | Slutraden (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `verben` · Vem får verben? · skyltarna byter rad

Bildläge: talare. Klicklägen: `props => 3 + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `rowA` | Rad 1 · vem | text |
| `verbsA` | Rad 1 · verb, skilj med \| | text |
| `swapA` | Rad 1 · verb efter bytet | text |
| `rowB` | Rad 2 · vem (andra klicket) | text |
| `verbsB` | Rad 2 · verb | text |
| `swapB` | Rad 2 · verb efter bytet (tredje klicket) | text |
| `final` | Frågan (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `eftertext` · Eftertext · en roll per klick

Bildläge: talare. Klicklägen: `props => 1 + count(props, "role", 4)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Titel | flera rader |
| `role1` … `role4` | Roll | text |
| `credit1` … `credit4` | Namn 1 (tomt = en rad att fylla i) | text |
| `foot` | Fotrad (namn och titel) | flera rader |
| `films` | Antal ljus på vattnet, ett per film (tomt = inga ljus) | text |
| `fifth` | Klicket där ett ljus till tänds nära (0 = direkt; tomt = inget) | text |

### `lins` · Linsen · tre frågor till en röst

Bildläge: talare. Klicklägen: `props => Math.max(1, count(props, "focus", 3)) + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `contextLabel` | Röstens etikett | text |
| `context` | Rösten (citat) | flera rader |
| `answer` | AI:ns dom (valfri) | flera rader |
| `focus1` … `focus3` | Fråga | text |
| `detail1` … `detail3` | Svar | flera rader |
| `note` | Slutrad (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `gapet` · Gapet · två banor från samma ljus

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik (valfri, viker undan för slutsatsen) | flera rader |
| `startLabel` | Startpunktens text (valfri) | text |
| `upperLabel` | Övre banan · etikett | text |
| `upperText` | Övre banan · text (tecknas när sliden kommer) | flera rader |
| `lowerLabel` | Nedre banan · etikett (nästa klick) | text |
| `lowerText` | Nedre banan · text | flera rader |
| `gapLabel` | Gapets namn (valfritt, kommer med den nedre banan) | text |
| `note` | Slutsats (sista klicket): den nedre banan vänder uppåt och gapet sluts | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `closes` | Sluts gapet vid slutsatsen? (tomt = ja, nej = gapet står kvar) | text |

### `taggig` · Taggiga gränsen · toppen, dalen och gränsen som flyttar sig

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `peakLabel` | Toppen · etikett | text |
| `peakText` | Toppen · text (stort när sliden kommer; en rad som börjar med ~ blir mindre) | flera rader |
| `dipLabel` | Dalen · etikett (nästa klick) | text |
| `dipText` | Dalen · text | flera rader |
| `image` | Föremål som faller ned i dalen (frilagd bild) | bild |
| `imageAlt` | Föremålets beskrivning | text |
| `note` | Slutsats (sista klicket): gränsen flyttar sig och den gamla står kvar streckad | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `moves` | Flyttar sig gränsen vid slutsatsen? (tomt = ja, nej = den står still) | text |

### `kran` · Kranen · intelligens på kran blir agens

Bildläge: talare. Klicklägen: `props => 1 + (has(props, "flow1") ? 1 : 0) + ["thesis", "tool", "practice"].filter(key => has(props, key)).length`

| Fält | Betydelse | Typ |
|---|---|---|
| `image` | Kranen (frilagd bild, vattnet rinner åt vänster) | bild |
| `imageAlt` | Bildbeskrivning | text |
| `title` | Rubrik vid kranen | flera rader |
| `flow1` … `flow4` | Förmåga 1 (nästa klick: rinner ut på vattnet) | text |
| `thesis` | Tesen (stiger ur ljuset): rad 1 stor, rad 2 tecken, rad 3 sjunker | flera rader |
| `tool` | Verktygsraden (nästa klick) | flera rader |
| `practice` | Agensraden (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `lateral` · Lateral läsning · i sidled, och chatten i en cirkel

Bildläge: talare. Klicklägen: `props => 1 + ["leftText", "ask", "reply"].filter(key => has(props, key)).length`

| Fält | Betydelse | Typ |
|---|---|---|
| `pageUrl` | Sidans adress (påhittad) | text |
| `pageLabel` | Sidans märkning (till exempel Illustration) | text |
| `pageTitle` | Sidans rubrik | flera rader |
| `tab1` … `tab2` | Flik 1 (nästa klick: öppnas i sidled) | text |
| `leftLabel` | Förklaringens etikett | text |
| `leftText` | Förklaringen (när flikarna öppnas) | flera rader |
| `chatLabel` | Chattens märkning (valfri) | text |
| `askLabel` | Frågans avsändare (tomt = Du) | text |
| `ask` | Frågan till chatten (nästa klick) | text |
| `replyLabel` | Svarets avsändare (tomt = AI) | text |
| `reply` | Svaret (klicket efter frågan) | text |
| `note` | Slutraden (kommer med svaret) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `zoom` · Zoom · ett kapitel i tiopotenserna

Bildläge: full. Klicklägen: `() => 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Kort rad över zoomen (valfri) | flera rader |
| `caption` | Bildtext under raden (valfri) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `flode` · Flödet · en rubrik i taget i telefonen

Bildläge: full. Klicklägen: `props => { const items = Array.from({ length: MAX_FEED }, (_, i) => i + 1).filter(n => has(props, `head${n}`) || has(props, `media${n}`)).length; const first = Math.max(1, Math.min(items, Math.round(Number(props.start)) || 1)); return Math.max(1, items - first + 1) + (has(props, "note") ? 1 : 0); }`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik bredvid telefonen | flera rader |
| `feedTitle` | Flödets namn överst i telefonen | text |
| `start` | Poster som syns direkt (standard 1; resten kommer en per klick) | text |
| `media1` … `media6` | Post 1 · skärmdump (i stället för rubrik) | bild |
| `alt1` … `alt6` | Beskrivning | text |
| `head1` … `head6` | Post 1 · rubrik | flera rader |
| `source1` … `source6` | Källa | text |
| `date1` … `date6` | Datum | text |
| `tone1` … `tone6` | Post 1 · ton (hot, pengar eller tomt) | text |
| `note` | Slutraden (sista klicket, telefonen dämpas) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `sandlada` · Sandlådan · agenterna tar sig ut

Bildläge: full. Klicklägen: `props => 2 + (["fact1", "fact2", "fact3"].some(key => has(props, key)) ? 1 : 0) + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `boxLabel` | Rutans etikett (till exempel Sandlådan · testmiljön) | text |
| `count` | Prickar i rutan (schematiskt, 40–160) | text |
| `escaped` | Prickar som tar sig ut (nästa klick) | text |
| `outLabel` | Dit de tar sig (till exempel Internet) | text |
| `fact1` … `fact3` | Fakta 1 (klicket efter) | flera rader |
| `note` | Slutraden (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `berattelser` · Berättelserna · affischerna, en i taget

Bildläge: full. Klicklägen: `props => { let steps = 1; for (let i = 1; i <= MAX_POSTERS; i++) if (has(props, `name${i}`)) steps += has(props, `hides${i}`) ? 2 : 1; return steps + (has(props, "bottomLine") ? 1 : 0) + (has(props, "question") ? 1 : 0); }`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Påståendet över väggen | flera rader |
| `hidesLabel` | Etiketten före det som döljs (tomt = Döljer) | text |
| `name1` … `name6` | Affischens namn | text |
| `tagline1` … `tagline6` | Affischens rad | flera rader |
| `habitat1` … `habitat6` | Bor i | flera rader |
| `hides1` … `hides6` | Det berättelsen döljer (eget klick) | flera rader |
| `genre1` … `genre6` | Affischens stil (fralsare, forgorare, gud, tjanare, spegel, partner) | text |
| `media1` … `media6` | Affisch 1 · hjälteobjektet (frilagd bild) | bild |
| `alt1` … `alt6` | Affisch 1 · bildbeskrivning | text |
| `top1` … `top6` | Affisch 1 · topptext (tomt = En berättelse om AI) | text |
| `bill1` … `bill6` | Affisch 1 · rollistan (tomt = AI i huvudrollen) | text |
| `pull1` … `pull6` | Affisch 1 · rubriker ur flödet som dras in när väggen kommer (skilj med \|) | text |
| `bottomLine` | Slutraden när alla står på väggen igen (klicket efter affischerna) | flera rader |
| `questionLabel` | Frågans etikett (till exempel Bikupa · två minuter) | text |
| `question` | Fråga medan väggen står kvar (eget klick sist) | flera rader |
| `questionCaption` | Rad under frågan | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `snoboll` · Snöbollen · prototypen och allt som växer runt den

Bildläge: full. Klicklägen: `props => 1 + (has(props, "features") ? 1 : 0) + (has(props, "final") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik vid prototypen | flera rader |
| `core` | Kärnan (prototypen, en rad) | flera rader |
| `coreLabel` | Kärnans etikett (till exempel Måndag 15.00) | text |
| `features` | Funktionerna som snöbollar (skilj med \|, nästa klick) | flera rader |
| `title2` | Rubrik när det snöbollar | flera rader |
| `ring` | Ordet vid ringen (till exempel Ring in) | text |
| `final` | Slutraden (sista klicket, ringen dras) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `duken` · Duken · agenter och du på samma yta

Bildläge: full. Klicklägen: `props => 2 + (has(props, "comment") ? 2 : 0) + (has(props, "question") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik ovanför duken | flera rader |
| `canvasTitle` | Arbetsytans namn (i duken) | text |
| `canvasLabel` | Märkning (till exempel Illustration, inspirerad av Doop) | text |
| `artTitle` | Affischens rubrik på duken (ny rad bryter) | flera rader |
| `artTitle2` | Affischens rubrik efter kommentaren | flera rader |
| `agent1` … `agent6` | Agentens namn | text |
| `agentDoes1` … `agentDoes6` | Vad agenten gör på duken | flera rader |
| `commentLabel` | Kommentarens avsändare (tomt = Du) | text |
| `comment` | Kommentaren på duken (klicket efter agenterna) | flera rader |
| `reply` | Agenternas svar (klicket efter kommentaren, när de gör om) | text |
| `you` | Din markör (tomt = Du) | text |
| `question` | Frågan (sista klicket, din markör står ensam) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `stege` · Skalstegen · ett exempel per tiopotens

Bildläge: full. Klicklägen: `props => Math.max(1, count(props, "name", MAX_RUNGS)) + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik ovanför stegen | flera rader |
| `scale1` … `scale9` | Steg 1 · skala och plats (till exempel 10⁷ m · Planeten) | text |
| `name1` … `name9` | Steg 1 · namn | text |
| `text1` … `text9` | Steg 1 · exemplet | flera rader |
| `source1` … `source9` | Steg 1 · källa med datum | text |
| `vis1` … `vis9` | Steg 1 · visualisering i världen (vind, batar, flod, skanning, karta, film, lunga, rulle, molekyler) | text |
| `visText1` … `visText9` | Steg 1 · visualiseringens etiketter (skilj med \|; film: rubrik\|källa; lunga: rubrik\|staplarna; rulle: rullen\|utrullad\|kolumner\|märkning; molekyler: tre rader) | text |
| `visData1` … `visData9` | Steg 1 · visualiseringens tal (skanning: 100>56\|100>129, karta: minuter, film: start i sekunder, lunga: 98\|-20, rulle: kolumner, molekyler: 100\|86\|72) | text |
| `media1` … `media9` | Steg 1 · film (vis=film) eller utrullad text (vis=rulle) | bild |
| `poster1` … `poster9` | Steg 1 · filmens stillbild eller röntgenbilden (vis=rulle) | bild |
| `alt1` … `alt9` | Steg 1 · filmens beskrivning | text |
| `note` | Slutraden (sista klicket, hela stegen står kvar) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `sidor` · Sidorna · ett dokument i proportioner

Bildläge: full. Klicklägen: `props => Math.max(1, ["question", "question2"].filter(key => has(props, key)).length + Array.from({ length: MAX_PARTS }, (_, i) => i + 1).filter(n => has(props, `part${n}`) && Number(props[`pages${n}`]) > 0).length)`

| Fält | Betydelse | Typ |
|---|---|---|
| `question` | Frågan (första läget) | flera rader |
| `question2` | Andra frågan (nästa klick) | text |
| `docLabel` | Dokumentets etikett ovanför sidorna (tomt = antal sidor) | text |
| `pages` | Dokumentets sidor totalt (till exempel 261) | text |
| `part1` … `part3` | Del 1 · namn (ett klick per del) | flera rader |
| `pages1` … `pages3` | Del 1 · sidor | text |
| `role1` … `role3` | Del 1 · färg (alert, human, ai, ink) | text |
| `quote1` … `quote3` | Del 1 · citat under sidorna | flera rader |
| `quoteSource` | Varifrån citaten kommer (under citatet) | text |
| `after` | Rad med sista delen (till höger, samma klick) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `slinga` · Slingan · chattboten och agentens varv

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `leftLabel` | Chattboten · etikett | text |
| `ask` | Chattboten · din fråga (ut) | text |
| `answer` | Chattboten · svaret (tillbaka) | flera rader |
| `rightLabel` | Agenten · etikett (nästa klick) | text |
| `goal` | Agenten · målet | text |
| `loop1` … `loop4` | Station 1 (överst) | text |
| `note` | Slutraden (sista klicket, punkten lämnar ringen) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `veckan` · Veckoremsan · veckans block, sedan en dag som växer

Bildläge: full. Klicklägen: `props => Math.max(1, count(props, "item", MAX_WEEK_ITEMS)) + (has(props, "note") ? 1 : 0) + (count(props, "question", 3))`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `days` | Dagarna (fem, skilj med \|) | text |
| `item1` … `item6` | Block 1 · namn (ett klick per block) | flera rader |
| `text1` … `text6` | Block 1 · text | flera rader |
| `from1` … `from6` | Block 1 · första dagen (1–5) | text |
| `to1` … `to6` | Block 1 · sista dagen (1–5) | text |
| `role1` … `role6` | Block 1 · roll (human, shared, ai) | text |
| `note` | Slutraden (klicket efter blocken) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `focusDay` | Dagen som växer (1–5, standard 5) | text |
| `focusTitle` | Den växande dagens rubrik (till exempel Till fredag) | text |
| `question1` … `question3` | Fråga 1 (dagen växer) | flera rader |

### `pyramid` · Pyramiden · uppåt som skolan, nedåt som veckan

Bildläge: full. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `level1` … `level6` | Nivå 1 (nederst) | text |
| `upLabel` | Uppåt · etikett | text |
| `upText` | Uppåt · text (första läget) | flera rader |
| `downLabel` | Nedåt · etikett (nästa klick) | text |
| `downText` | Nedåt · text | flera rader |
| `here` | Markören vid toppen (till exempel Ni börjar här) | text |
| `note` | Slutraden (sista klicket, pyramiden dämpas) | flera rader |
| `image` | Föremål vid slutraden (frilagd bild) | bild |
| `imageAlt` | Bildbeskrivning | text |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `treord` · Tre ord · JAG → AI → JAG utan sjön

Bildläge: full. Klicklägen: `props => 4 + (has(props, "title") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `left` | Vänster ord | text |
| `mid` | Mittenordet (mono) | text |
| `right` | Höger ord | text |
| `leftLabel` | Vänster · etikett | text |
| `leftText` | Vänster · frågor (första klicket) | flera rader |
| `midLabel` | Mitten · etikett | text |
| `midText` | Mitten · frågor (andra klicket) | flera rader |
| `rightLabel` | Höger · etikett | text |
| `rightText` | Höger · frågor (tredje klicket) | flera rader |
| `title` | Påståendet (sista klicket) | flera rader |
| `after` | Rad under påståendet | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `byra` · Byrån · agenterna som teamsida

Bildläge: full. Klicklägen: `props => 1 + (has(props, "title2") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `title2` | Andra ledet (nästa klick, en sjunde plats står tom) | flera rader |
| `agent1` … `agent6` | Agentens namn | text |
| `agentDoes1` … `agentDoes6` | Vad agenten gör på duken | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `sattning` · Sättningen · meningen sätts av koden

Bildläge: full. Klicklägen: `() => 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Meningen (ny rad bryter; ~ framför en rad ger den människans färg) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `counterLabel` | Räknarens etikett (tomt = Sättning) | text |

### `brygga` · Bryggan · en loop eller en film mellan delarna

Bildläge: full. Klicklägen: `() => 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Nästa dels namn | flera rader |
| `fran` | Tiopotensen bryggan börjar på (till exempel 2) | text |
| `till` | Nästa dels tiopotens (portalens bild, till exempel 0) | text |
| `portal` | Portalens tiopotens (nästa slides nivå; tomt = till) | text |
| `riktning` | Zoomens riktning (in eller ut; tomt = efter fran och till) | text |
| `del` | Nästa dels nummer på färdkartan (1–6) | text |
| `delar` | Föreläsningens delar på färdkartan (skilj med \|) | text |
| `nivaer` | Delarnas tiopotenser på färdkartan (skilj med \|, till exempel 7\|7\|0\|-2\|2) | text |
| `image` | Bild i portalen (tomt = portalnivåns egen bild) | bild |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `film` | Film i stället för loop: nio, tre, pixlar, vecka eller ja (tomt = loopen) | text |
| `filmText` | Filmens texter (skilj med \|). nio: exemplen; tre: valfria namn vid märkena; pixlar: AI-pekarnas namn och sist människans | flera rader |
| `filmNivaer` | nio: exemplens tiopotenser (skilj med \|, till exempel 7\|6\|5\|4\|2\|0\|-1\|-3\|-9) | flera rader |
| `filmPunkter` | tre: märkenas platser i bilden, x,y i scenens pixlar (skilj med \|; tomt = kalendern, datorn, telefonen) | flera rader |
| `filmDagar` | vecka: dagarna på klockan (skilj med \|; tomt = Mån\|Tis\|Ons\|Tor\|Fre) | flera rader |

### `poang` · Poängtavlan · därför lönar det sig att gissa

Bildläge: talare. Klicklägen: `props => 2 + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Rubrik | flera rader |
| `value1` … `value3` | Regel 1 · poäng | text |
| `label1` … `label3` | Regel 1 · för vad | text |
| `questions` | Frågor i provet (standard 10) | text |
| `known` | Svar som båda kan (standard 7) | text |
| `lucky` | Lyckade gissningar (standard 1) | text |
| `rowALabel` | Rad 1 · den som skriver vet inte (nästa klick) | text |
| `rowBLabel` | Rad 2 · den som gissar | text |
| `pointsLabel` | Poängens enhet (tomt = poäng) | text |
| `note` | Slutsats (sista klicket) | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |

### `omslag` · Omslag · titeln stiger ur ljuset

Bildläge: full, talare. Klicklägen: `props => has(props, "speaker") ? 2 : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `series` | Serienamn | text |
| `filmLabel` | Filmnummer | text |
| `filmTitle` | Filmens titel (ljuspunkterna och titelkortet; rad som börjar med ~ blir mjukare) | flera rader |
| `title` | Annan titel i ljuspunkterna (tomt = filmens titel) | flera rader |
| `q1` … `q3` | Fråga 1 i ljuspunkter | flera rader |
| `speaker` | Namn (ger ett andra läge: titelkortet där du presenterar dig) | text |
| `speakerRole` | Titel under namnet | flera rader |
| `film` | Filmens nummer i serien (ljusen på vattnet) | text |
| `films` | Antal filmer i serien (standard 4) | text |
| `puzzle` | Pusslet på titelkortet (ja eller tomt) | text |

### `presentation` · Presentation · talaren och presentationsfilmen

Bildläge: full. Klicklägen: `props => has(props, "media1") ? 2 : 1`

| Fält | Betydelse | Typ |
|---|---|---|
| `name` | Namn | flera rader |
| `role1` … `role3` | Rad | text |
| `contact` | Kontaktrad | flera rader |
| `media1` | Presentationsfilmen (nästa klick startar den, med ljud) | bild |
| `alt1` | Filmens beskrivning | text |
| `poster` | Stillbild innan filmen startar | bild |

### `nal` · Nålen · krafterna drar, gränsen känns, motståndet väljs

Bildläge: horn. Klicklägen: `props => 2 + count(props, "force", 3) + (has(props, "note") ? 1 : 0)`

| Fält | Betydelse | Typ |
|---|---|---|
| `title` | Frågan (står överst tills slutsatsen kommer) | flera rader |
| `left` | Riktningen dit kraft 2 drar, längs horisonten (till exempel Gör själv; till vänster, till höger med spegel) | text |
| `up` | Riktning uppåt (nålen lyfts dit på klicket efter krafterna) | text |
| `right` | Riktningen dit kraft 1 drar, längs horisonten (till exempel Lämna över; till höger, till vänster med spegel) | text |
| `forceLabel1` … `forceLabel3` | Kraft 1 · etikett | text |
| `force1` … `force3` | Kraft 1 · drar nålen ned under ytan, förbi Lämna över (eget klick) | text |
| `ghostLabel` | Spårets etikett (med slutsatsen) | text |
| `ghost` | Vid nålens streckade spår under ytan (med slutsatsen) | text |
| `note` | Slutsats (sista klicket) · ersätter frågan; rad som börjar med ~ blir mjukare | flera rader |
| `emphasis` | Framhävda ord, skilj med \| | text |
| `spegel` | Spegelvänd (ja = Gör själv till höger och Lämna över till vänster, som i ett fack med AI till vänster) | text |
