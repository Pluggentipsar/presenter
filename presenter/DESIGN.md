# DESIGN.md · stilbibeln

Det här är den korta stilbibeln för Presenter. Agenten läser den vid varje slidebygge, och föreläsaren när hen granskar. Den beskriver vad som är rätt känsla. Formerna och deras fält står i `docs/STAGE.md`; föreläsarens egen smak står i `profil/`. En konkret instruktion i en föreläsning går före en regel här.

## Nordstjärnan: bygg det som inte går i PowerPoint

Presenter finns i kod för att kunna göra det som vanliga presentationsprogram inte kan. Om en slide skulle se ut och fungera likadant där, har vi inte använt mediet.

- **Rörelse, visualisering och förvandling lyfter innehållet.** När ett tal räknas upp, ett förlopp sker steg för steg eller ett samtal fyller skärmen, gör mediet jobbet.
- **Genomarbetad typografi och komposition.** En stor fråga, en väntbild eller en slutaffisch kan bära hela ytan. Stillhet under läsning är ett medvetet val.
- **Produktionskvalitet på varje element.** Halvfärdiga komponenter, standardstil och ”good enough” passerar inte.

## Berättelse och stillhet

Visualisera där det tillför förståelse. Huvudresonemanget ska gå att följa även utan föreläsarens tal, och talet ska ge mer djup. Skriv en begriplig poäng och ge exemplet tillräckligt sammanhang, men fyll inte sliden med manuset.

Lägg inte till animation, partiklar eller bakgrundsliv bara för att en slide annars är stilla. Färg ska ha en betydelse som håller genom hela föreläsningen. Ett motiv från öppningen kan komma tillbaka i avslutningen med ny innebörd.

## Clicker först

Huvudspåret ska fungera när föreläsaren står ute i rummet med en clicker. Flera led i samma resonemang visas med klicklägen: framåt visar nästa led, bakåt återger det föregående. Lägg aldrig huvudpoängen bakom knappar, hover, scroll, skrivfält eller en automatisk timer. Ett verkligt verktyg eller spel kan öppnas som en valfri fördjupning, men huvudspåret ska hålla utan det.

## Läsbart från sista raden

Föreläsningar ska gå att läsa i en sal med omkring 70 personer. Utgå från sista raden. I en vy på 1600 × 900 är cirka 30–44 px en bra utgångspunkt för det publiken måste läsa. Källhänvisningar och avsnittsmarkörer får vara mindre.

Stage-formerna sätter själva sina grader, och det finns inget fält för att ändra dem. Påståenden, rubriker och stora tal är stora, men löptext, repliker och etiketter ritas i flera former i 17–32 px. Riktmärket är alltså ett mål för det du väljer och skriver, inte något formerna garanterar. Därför, i en stor sal:

- **Färre ord per läge.** Den synliga texten bär poängen; detaljerna står i manuset.
- **En form med stor grad** för det som måste läsas, som `poster`, `words`, `stats`, `treord` eller `quote`, hellre än en tät läsyta.
- **Fler klick** när en text är lång: dela den, i stället för att låta den stå tät.
- **Hela bilden.** Många former står som standard i bildläget `talare`, med en tom yta till höger för en talare i bild. Live i en sal används `layout="full"` där formen har det; se `docs/STAGE.md`, avsnitten Bildlägen och Textstorlek.

Mindre grad är aldrig lösningen. Granskningen flaggar bara text under 14 px och visar minsta graden per läge; läsbarheten i den verkliga lokalen avgörs där.

## Vem gör vad i ett AI-exempel

Publiken ska kunna skilja beställningen, svaret, materialet och föreläsarens bearbetning åt. En prompt är ett utgående meddelande, svaret kommer tillbaka i chatten, ett färdigt material visas som det det är. Konstruerade svar märks som illustration; verkliga körningar får sin faktiska källa. Hitta aldrig på produktloggor, körningar eller resultat.

**Prompt först, svar på nästa klick:**

1. Prompten ensam, så att publiken hinner läsa.
2. Svaret efter ett manuellt framåt. Prompten får stå kvar som sammanhang.
3. Granskning eller bearbetning på ett senare klick.

Bakåt döljer svaret igen. En fördröjning i en animation räknas inte som ett klick.

## Publikens fokus

Planera vad publiken ser först och vilken enda ny tanke varje klick tillför. Dölj det som kommer och låt det som har varit bli mindre eller dämpat. Flytta upprepningar och långt bakgrundsmaterial till manuset. Följ gärna samma ord, mening eller föremål genom en förvandling, så syns det vad som ändras. En stilla affisch är ett giltigt formval.

## Inga generiska rutor

Rundade glaskort med tonad fyllning, kantband till vänster, piller, färgprickar och glödande cirklar ser AI-genererade ut. Låt formen komma ur innehållets verkliga artefakt: eftertexter, en kalender, ett sekvensdiagram, kartotekskort, beskärningsmärken. Hårfina linjer, etiketter i mono och plana färgfält med en betydelse bär strukturen. Ett medvetet gränssnitt, som en chatt eller en telefon, är ett undantag när gränssnittet är poängen.

Regeln styr det som byggs nytt: nya former, nya scener och det som läggs till i en slide. De befintliga Stage-formerna behåller sina ytor, som chattens bubblor och linsens ruta, tills föreläsaren ber om något annat.

## Färger

Färger kommer alltid ur temats roller, aldrig som hex i en mall eller ett deck.

| Roll | CSS | Används till |
|---|---|---|
| `bg` | `--bg` | Slidens bakgrund |
| `bgSurface` | `--bg-surface` | Ytor ovanpå bakgrunden |
| `text` | `--text` | Primär text |
| `textMuted` | `--text-muted` | Källor, etiketter, hjälptext |
| `accent` | `--accent` | Temats signatur: linjer, framhävningar |
| `accentAlert` | `--accent-alert` | **Bara för blottläggning** |

`accentAlert`, oftast rött, används bara där något blottläggs för publiken: ett fabricerat svar, en falsk källa, ett mönster som manipulerar. Inte för vanliga framhävningar och inte för att kritik är negativ. Två blottläggningar i en föreläsning räcker ofta.

## Teman

Temat väljs i frontmattern (`theme: glas`) som ett val utifrån publik, ämnets register och bildmaterialet. Standard för nya deck är `glas`. T i spelaren byter tema medan du presenterar, och Shift+T tar dig tillbaka. Byt inte tema mitt i en föreläsning utan dramaturgisk anledning.

| Tema | Uttryck |
|---|---|
| `glas` | Papper, bläck, kobolt och gula markeringar. Archivo och Familjen Grotesk. |
| `kobolt`, `kobolt_natt` | Samma familj, ljust papper och dess mörka tvilling. |
| `betong`, `betong_natt` | Brutalistiskt: tunga versaler, hårda kontraster. |
| `tiopotenser` | Rymdsvart och varmvitt, människans bärnsten och AI:s cyan. Zoomvärlden. |
| `arkana` | Rymd och gryning: ljuspunkter, smala versaler och fakta i mono. |
| `rost` | Natt i plommon; människans röst i bärnsten, maskinens i mint. |
| `linjen` | En busslinje i natt med hållplatser och prickskyltar. |
| `berattelser` | Varm dokumentär på beige papper. För citat och fördjupning. |
| `editorial` | Tidskrift, lugn och vågad. |
| `minimal` | Svart på vitt, när innehållet ska stå ensamt. |
| `dagsljus`, `nattglas` | Ljust och mörkt glas. `dagsljus` är säkert i ljusa lokaler och på svaga projektorer. |

## Typografi

Tre roller sätts av temat: rubriker, brödtext och mono. En slide har en primär rubrik. Stora rubriker ska kunna läsas på fem meter. Kräver texten mer än tre rader, dela den på fler slides eller ge den en läsyta.

## Rytm

En bra föreläsning har rytm. Variera mellan stora påståenden, exempel i flera steg, läsytor och stilla affischer; kedja inte sex citat eller fyra sidor med tal i rad. Ge bryggor mellan delarna så att publiken får andas.

## Gör inte

- Bygg inte återkommande standardsidor utan hierarki. Nya rubriker på samma mall räcker inte.
- Bygg inte generiska rutor.
- Lägg inte till bakgrundsliv av plikt.
- Använd inte `accentAlert` som accent.
- Lägg inte emoji i rubriker.
- Hitta inte på färger i ett deck; använd temats roller.
- Använd inte systemtypsnitt för rubriker.
- Leverera inte halvfärdigt. Hellre färre slides med full kvalitet.

## Innan du bygger en slide

1. Vilken del av föreläsningen, och vilken funktion: nedslag, exempel, brygga eller samtal?
2. Vad ska publiken se hända? Välj form efter det.
3. Krockar den med sliden före och efter?
4. Behövs `accentAlert`? Bara om något blottläggs.
5. Är all svensk text korrekt, med å, ä och ö?
6. Skulle en designbyrå lämna den som färdig?
