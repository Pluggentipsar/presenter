# Stage · scenmotorn

Stage är Presenters motor för scener som rör sig. En slide är en **form**: en visuell handling (affisch, chatt, ordfält, stora tal, zoom …) med innehållet i props. Formen avgör hur många klicklägen sliden får, utifrån innehållet. Världen bakom formerna, temats roller, R-redigeringen och clickern är inbyggda.

```mdx
<Stage
  form="chat"
  slideId="ex_chatt"
  kicker="Så bygger du"
  who1="du"
  msg1="Gör om min punktlista till en slide där publiken ser processen hända."
  who2="ai"
  msg2="Jag föreslår tre lägen: först ljuset, sedan vattnet, sist sockret."
  note="Du beställer.
~Agenten bygger."
/>
```

Alla former, deras fält, standardbildläge och regeln för klicklägena står i [STAGE-FORMER.md](STAGE-FORMER.md), som genereras ur koden. Referensdecket `content/presenter-valkommen.mdx` visar ett tiotal former i sitt sammanhang.

## Välj form efter vad publiken ska se

| Publiken ska … | Former |
|---|---|
| få ett stort påstående | `poster` (ett till tre led), `words` (ordfält som landar i ett påstående), `sattning` |
| se tal och dra en slutsats | `stats` |
| följa ett exempel i flera steg | `chat` (en replik per klick), `treord` (tre stora ord med text under), `trappa`, `eftertext` (en roll per klick), `sortera` |
| läsa något längre | `answer` (en lång prompt och svaret i utdrag), `utdrag`, `lins` |
| se en bild, film eller ljud | `media` (prompten först, sedan mediet), `vagg`, `flode` |
| jämföra två sidor | `split`, `strander`, `gapet` |
| förflytta sig mellan delar | `brygga`, `zoom`, `omslag` |

Prompt och svar står alltid på olika klick. I `chat` och `media` ger varje replik eller varje prompt ett eget läge.

## Textsyntax

- **Radbrytningar** i ett fält blir radbrytningar på sliden.
- **En rad som börjar med `~`** blir den andra rösten: mjukare, eller i temats accentfärg.
- **`emphasis`** framhäver ord ur rubriken; flera skiljs med `|`.
- **`play`** låter ord röra sig: `ord:effekt`, flera med `|`. Effekterna är `vax`, `krymp`, `glid`, `lyft`, `sjunk`, `skaka`, `oppna`, `stang`, `samlas`, `bygg`, `tand`, `blekna`, `flimmer`, `vand`, `stryk` och `bro`. Ordet måste stå ordagrant i texten.
- **`credit`** är källraden längst ned. Skriv källa och datum när sliden visar fakta.
- **`note`** är slutsatsen som kommer efter innehållet, på ett eget klick.

## Bildlägen

Fältet `layout` styr var innehållet står. Det kan skrivas per klickläge, med komma: `layout="talare,full"`.

- `talare`: innehållet till vänster (ungefär x 96–1040 av 1600), en lugn yta till höger där talaren står i bild.
- `full`: hela bilden, ungefär x 150–1450.
- `horn`: hela bilden, med talaren liten nere till höger (x 1200 och uppåt, under y 440).

**Live eller inspelning.** Varje form har ett standardläge, som står i STAGE-FORMER.md. Många former står som standard i `talare`, eftersom motorn byggdes för inspelningar där talaren står i bild. Föreläser du live i en sal finns ingen talare i bilden, och då står omkring 40 procent av bilden tom till höger. Sätt därför `layout="full"` på de former som har ett helbildsläge. Spelar du in med dig själv i bild: behåll `talare`, eller använd `horn` när du står liten i hörnet, och skriv `granska: greenscreen` i frontmattern, så att granskningen varnar för text där du står.

**Vilka former som använder `full`:**

| Formerna | Med `layout="full"` |
|---|---|
| Alla former med standardläget `full` i STAGE-FORMER.md, till exempel `chat`, `split`, `media`, `answer`, `treord`, `gapet` och `brygga` | Använder redan hela bilden. |
| `poster`, `quote` (utan bild), `stats`, `stack`, `lins`, `lateral`, `poang` | Breddas till hela bilden. `lins`, `lateral` och `poang` får också större text. |
| `words`, `title`, `raster`, `gym`, `pussel`, `bro`, `bok`, `friktion`, `utdrag`, `bredd`, `bryt`, `ord`, `verben`, `eftertext`, `kran` | Står kvar till vänster. I en sal: välj en annan form, eller låt den tomma ytan vara ett medvetet val. |

`omslag` börjar i `full` och går till `talare` på titelkortet när fältet `speaker` finns. `nal` står i `horn`.

## Textstorlek

Formerna sätter själva sina grader, och det finns inget fält för att göra texten större. Påståenden, rubriker och stora tal ritas i 34–150 px. Löptext, repliker och etiketter är mindre: till exempel svaret i `answer` (22–24 px), utdraget i `utdrag` (17 px), bildtexten i `media` (22 px), raderna i `stack` (32 px), svaren i `lins` (26 px) och etiketterna i `stats` (24 px). Överrubriken (`kicker`) är 17 px och källraden (`credit`) 15 px.

DESIGN.md säger att brödtext bör vara omkring 30–44 px i en sal. Formerna når inte alltid dit, så i en stor sal:

- skriv färre ord per läge, och lägg detaljerna i manuset
- välj en form där det bärande är stort: `poster`, `words`, `stats`, `treord` eller `quote`
- dela en lång text på fler klick
- använd `layout="full"` där formen har det

Granskningen flaggar bara text under 14 px och skriver den minsta graden per läge i rapporten.

## Världen bakom

Formerna står i en värld som temat väljer. Standard är en sjö med horisont och ljus; ljuset kan vandra med `light` och tiden på dygnet ändras med `tone` och `dygn`. `backdrop="tema"` ger bara temats bakgrund, och `background` lägger ett foto bakom.

**Zoomvärlden** tar fram tiopotenser: `skala="7"` är planeten och `skala="0"` ett bord. Slides i följd med olika `skala` zoomar mellan nivåerna. `vy`, `plats` och `kamera` styr slöjan, skalmätarens text och kameran. Formen `zoom` är ett kapitelkort i zoomvärlden, och `brygga` binder ihop delarna i en föreläsning.

## Klicklägen och manus

Antalet lägen räknas ur innehållet: en affisch med `title` och `title2` får två lägen, en chatt med tre repliker och en `note` får fyra. Manuset i `<Notes>` har en `[Klick]` per klick, och `node scripts/klick-manus.mjs <slug>` kontrollerar att de stämmer. Se [MANUS.md](MANUS.md).

## En ny form

Bygg en ny form först när ingen befintlig visar resonemanget. Den följer kontraktets punkt 7: inga generiska rutor, utan typografi och innehållets egen artefakt.

1. **Registrera** formen i `src/templates/stage/stage-forms.ts`: etikett, standardbildläge, fält, etiketter och regeln för klicklägen.
2. **Rita** den i en egen modul under `src/templates/stage/`, med en CSS-modul som bara använder temats roller (`--accent`, `--text`, `--bg` …), aldrig hårdkodade färger. Ge den ett helbildsläge med `:global([data-layout="full"])` om standardläget är `talare`, och bestäm graderna för en sal.
3. **Stilla läge:** formen får `still` när läget nås bakåt, i R och med reducerad rörelse. Rita då läget färdigt utan förlopp. Räknare och förlopp som drivs av tiden läser också granskningens adressfält med `useSceneReview` (`src/lib/share/scene-review.ts`), så att granskningens bilder visar slutläget och `?simtid` kan visa en sekund mitt i.
4. **Koppla in** den i formkartan i `src/templates/stage/Stage.tsx`.
5. **Prova** den i tre teman (ljust, mörkt och ett uttalat), med R (ändra, spara, ladda om, visa), T och Shift+T, framåt och bakåt och reducerad rörelse. `granska-edge.mjs --tema` granskar samma deck i ett annat tema.
6. **Generera** referensen igen med `node scripts/stage-referens.mjs`, och formkatalogen med `node scripts/formkatalog.mjs`.
