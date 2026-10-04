# Granskningsvyn · `/<slug>/granska`

Granskningen går igenom en föreläsning läge för läge innan den lämnas över, så att den egna kontrollen tar minuter i stället för en kväll med skärmbilder. Arbetsgången kring den står i `.agents/skills/granska/SKILL.md` i repots rot.

## Vad den gör

Vyn går igenom alla aktiva slides och alla klicklägen i en scenruta på 1600 × 900. Varje läge mäts mot kontraktet i `AGENTS.md`, och om bildfångsten är på sparas en bild av läget. När körningen är klar finns en rapport på disk.

**Per läge:**

| Fynd | Regel |
|---|---|
| Talarens yta | Synlig text i x 1068–1546, y 108–900 när Stage-scenen står i bildläget `talare`. Bara i greenscreen-deck, se nedan |
| Textningsmarginal | Synlig text under y 765 i en Stage-scen. Källraden (`credit`, 15 px på y 748) får 8 px. Bara i greenscreen-deck |
| Utanför bild | Text som går utanför 1600 × 900 (ibland avsiktligt) |
| Klippt text | Synlig text som en förälder (overflow: hidden eller clip) skär av en bit av, axelvis och med en tolerans på en femtedel av textstorleken. Helt bortklippt text räknas inte, eftersom dolda framtida lägen ofta ligger så |
| Liten text | Under 14 px. Minsta textstorlek per läge står i rapporten. Riktmärket 30–44 px för det publiken måste läsa mäts inte; se läsbarheten i `DESIGN.md` och Textstorlek i `STAGE.md` |
| Medier | Bilder som inte laddas, video och ljud med fel |
| Konsolfel | `console.error`, fel och avvisade löften i scenrutan medan läget visas |
| Prompt och svar | En ny prompt och ett nytt svar på samma klick, eller båda synliga i första läget. Kontrolleras där avsändarna är märkta: chattrutor med `data-who`, annars prickarna `humanDot` och `aiDot` |

**Per slide:**

| Fynd | Regel |
|---|---|
| Klick mot manus | `[Klick]` i Notes mot uppmätta lägen, lägesbeskrivningen (”Tre lägen: …”) och tysta klick. Samma läsning som `scripts/klick-manus.mjs` (`src/lib/manus-check.ts`), men lägena mäts i spelaren och gäller därför alla mallar |
| R-schema | Mallen saknar eget schema (reservformulär), eller sliden har props utan fält |
| Laddning | Scenrutan visade inte sliden eller läget, eller bilden kunde inte fångas |

`hoppaSteg` och `stegAv` räknas med: bara de lägen publiken ser granskas.

**Synlig text** är text vars sammanlagda opacitet gånger textfärgens alfa är minst 0,35. Svagare text räknas som dekor och mäts inte, till exempel vattenstämplar, spegelbilder i vattnet och spöktext bakom ett citat. Skärmläsarkopior i rutor på ett par pixlar räknas inte heller.

**Slutlägen.** Övergångar och animationer stängs av i scenrutan, och räknare som räknas upp visar sitt slutvärde. Bilderna visar alltså varje läge färdigt.

**Greenscreen-deck.** Talarens yta och textningsmarginalen gäller bara föreläsningar som spelas in med talaren i bild framför en greenscreen. Skriv i frontmattern:

```yaml
granska: greenscreen
```

Ett deck utan manus kan stänga av klickkontrollen med `granska: { manus: false }`. I vyn går greenscreen att slå på och av med en ruta (eller `?greenscreen=1`).

## Så används den

Öppna `http://127.0.0.1:3000/<slug>/granska` och tryck *Starta granskning*. Vyn finns bara i den lokala verkstaden; publika och skrivskyddade byggen svarar 404.

Frågeparametrar för att köra direkt eller avgränsa:

| Parameter | Betydelse |
|---|---|
| `start=1` | Börja direkt när sidan öppnas |
| `bilder=0` | Ingen bildfångst (snabbare, bara mätning) |
| `full=1` | Bilder i 1600 × 900 i stället för 800 × 450 |
| `alla=1` | Ta med dolda reserver |
| `vila=900` | Väntetid per läge i ms (standard 500) |
| `fran=10&till=20` | Bara slides 10–20 |
| `greenscreen=1` | Mät talarens yta och textningsmarginalen även om frontmattern inte säger det (`0` stänger av) |
| `tema=kobolt_natt` | Granska i ett annat tema än frontmatterns, som när T byter tema i spelaren |

Liverutan uppe till höger visar läget som granskas. Tabellen *Att titta på* listar fynden med länk till läget i `/<slug>/scen`. Kontaktkartan längst ned visar alla lägen i ordning, och lägen med fynd har en orange ram. Kontaktkartan finns bara på sidan; den sparas inte på disk.

**Rapporten** sparas i `presenter/.granska/<slug>/`:

- `rapport.md`: sammanfattning och fynd per slide, med minsta textstorlek per slide
- `rapport.json`: samma sak maskinläsbart, med minsta textstorlek och bildfil per läge
- `bilder/NN-LL-<slideId>.webp`: slide NN, läge LL

Med `tema` hamnar allt i `presenter/.granska/<slug>--<tema>/`, så att deckets egen granskning står kvar. Mappen är gitignorerad. Varje ny körning med bilder tar bort förra körningens bilder i samma mapp. Kan rapporten inte sparas visar sidan skälet.

## Utan webbläsarpanelen

En inbyggd webbläsarpanel stryper tidtagare när den är dold, så en hel granskning kan stanna nästan helt. Kör då granskningen i en headless Edge eller Chrome:

```bash
node scripts/granska-edge.mjs <slug> --base http://127.0.0.1:3000 --alla
node scripts/granska-edge.mjs <slug> --tema kobolt_natt
```

- **Först en fråga till servern.** Skriptet frågar granskningens API (`GET /api/granska?slug=<slug>`) innan webbläsaren startar. Svarar servern inte, är slugen ogiltig, saknas decket eller är temat okänt, stannar skriptet direkt med skälet.
- **Slugen** följer appens regel (`src/lib/slug.ts`): a–z, 0–9, bindestreck och understreck, och den börjar med en bokstav eller siffra.
- **Flaggor:** `--fran` och `--till` granskar ett intervall, `--alla` tar med dolda reserver och `--tema` granskar i ett annat tema.
- **Efteråt:** skriptet ger webbläsaren en egen tillfällig profil, väntar tills `rapport.json` är ny och stänger sedan just den webbläsaren. Rapporten och bilderna hamnar som vanligt i `presenter/.granska/<slug>/`. Någon kontaktkarta skrivs inte; titta på bilderna i nummerordning, eller öppna vyn i en vanlig webbläsare.

### Bilder mitt i ett förlopp

Granskningen visar varje läge färdigt. För att se vad publiken ser medan något händer finns `scripts/mellanlagen.mjs`:

```bash
node scripts/mellanlagen.mjs <slug> --base http://127.0.0.1:3000 6:0:0.6 9:1:1.2:poCell
```

- **Format:** varje argument är `slide:läge:sekunder`, med ett valfritt mönster sist. Sliden räknas som i granskningen (från 1) och läget från 0.
- **Tiden:** bilden tas efter ungefär 1,8 sekunder, eller 3 sekunder med ett mönster, vilken tid som än anges. Vid den angivna tiden visas bara det som läser `?simtid` i adressen: canvasvärldar, förlopp ur `useStepClock` och formernas räknare.
- **CSS-förlopp:** med ett mönster för animationens namn spolas de CSS-förlopp vars namn matchar till samma tid och pausas, via DevTools-protokollets Animation-domän. Även färdiga förlopp går att spola tillbaka. Sidans övriga förlopp har gått i 1,8 eller 3 sekunder.
- **Ett brett mönster** träffar också slidens resa in i bilden, så att bilden visar två lägen på en gång. Välj ett smalt namn ur formens CSS-modul.
- **Bilderna** hamnar i `presenter/.granska/<slug>/mellan/`.

### En bryggfilm som mp4

Formen `brygga` med fältet `film` kan spelas in som en riktig film, till exempel för att visas på en telefon. `scripts/film-fanga.mjs` sätter själv tiden för varje bildruta, så filmen blir jämn hur långsam datorn än är:

```bash
node scripts/film-fanga.mjs <slug> --base http://127.0.0.1:3000 10 15
```

Flaggorna är `--fps` (standard 30), `--vila` (sekunder som slutbilden står kvar, standard 2) och `--bredd` (standard 1600). Skriptet använder ffmpeg ur `presenter/.verktyg/` (som `scripts/hamta-verktyg.mjs` hämtar) eller den ffmpeg som finns på datorn. Filmerna, `brygga-<slide>.mp4` och en sammanklippt `bryggor.mp4`, hamnar i `presenter/.granska/<slug>/filmer/`.

## Det granskningen inte ser

- **Rörelse i realtid.** Vyn mäter slutlägen. Resor, pulser och förlopp behöver ses med clicker, eller med `mellanlagen.mjs`.
- **T, R, bakåt och reducerad rörelse.** `tema` granskar ett tema i taget, men ett helt T-varv, redigering i R, bakåt med clicker och reducerad rörelse kräver spelaren. Granska-skillen beskriver hur långt en agent utan webbläsare kommer.
- **Prompt före svar** kan bara kontrolleras där avsändarna är märkta. I andra mallfamiljer än Stage blir raden tom.
- **Klippt text** kan flagga avsiktlig klippning, till exempel ett utdrag ur ett dokument. Fynden är underlag och inga domar.
- **Text som drivs av JavaScript-timers** kan fångas mitt i förloppet när fliken är dold, eftersom tidtagarna stryps. Kör headless.
- **Läsbarheten i lokalen.** Ingen skärm kan intyga hur texten syns från sista raden på en verklig projektor.

## Hur den fungerar

- `app/[slug]/granska/page.tsx` läser decket på servern: slideId, `hoppaSteg`/`stegAv`, `[Klick]` och lägesbeskrivning i Notes, samt fälten mot R-schemat.
- `components/granska/Granskning.tsx` laddar `/<slug>/scen?direkt=1` en gång i en iframe och styr den med scenprotokollet (`lib/share/stage-protocol.ts`): `show` för varje slide och läge, `capture` för bilden. Direktläget byter slide utan övergång, och formernas räknare och tidsförlopp visar sitt slutläge där (`lib/share/scene-review.ts`).
- `components/granska/measure.ts` mäter texten med `getClientRects` och räknar om till scenens pixlar, också när en Stage-scen är skalad.
- Bildfångsten är samma som miniatyrernas (`modern-screenshot`), körd i scenrutan.
- `app/api/granska/route.ts` svarar på skriptets fråga (GET), skriver filerna (PUT) och tar bort förra körningens bilder (DELETE).
