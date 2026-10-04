---
name: granska
description: Granska en föreläsning i Presenter före överlämning. Gå igenom varje klickläge med granskningsvyn, kontrollera framåt, bakåt, R och T, och redovisa ärligt vad som är kontrollerat. Använd efter varje byggpass och innan något delas.
---

# Granska en föreläsning

## Kör granskningsvyn

Granskningsvyn `/<slug>/granska` spelar upp varje läge i 1600 × 900 och mäter det som bryter mot kontraktet. När webbläsarens förhandsvisning är dold fryser tidtagare och övergångar; kör den då headless:

```bash
node presenter/scripts/granska-edge.mjs <slug> --base http://127.0.0.1:3000 --alla
```

Skriptet frågar först servern om decket. Svarar den inte, är slugen ogiltig eller saknas decket, stannar skriptet direkt och säger varför; rätta det och kör igen.

Rapporten (`rapport.md`) och en bild per läge (`bilder/NN-LL-<slideId>.webp`, slide och läge) hamnar i `presenter/.granska/<slug>/`. Läs rapporten och titta på bilderna i nummerordning: först lägena med fynd, sedan resten för helhetens rytm. Någon kontaktkarta skrivs inte till disk; den finns bara i vyn när den öppnas i en vanlig webbläsare.

Granskningsvyn flaggar:

- text utanför bild, klippt text och text under 14 px (minsta graden per läge står i rapporten)
- trasiga medier och konsolfel
- prompt och svar på samma klick
- manus där antalet `[Klick]` inte stämmer med lägena

Bilderna visar varje läge färdigt: övergångar är avstängda och räknare står på sitt slutvärde.

### Ett annat tema

```bash
node presenter/scripts/granska-edge.mjs <slug> --tema kobolt_natt
```

`--tema` granskar decket i ett annat tema, som när T byter tema i spelaren. Rapporten och bilderna hamnar i `presenter/.granska/<slug>--<tema>/`, så att deckets egen granskning står kvar. Kör minst ett ljust och ett mörkt tema som inte är deckets eget. Temanamnen står i `presenter/src/themes/index.ts`.

### Ett läge mitt i ett förlopp

```bash
node presenter/scripts/mellanlagen.mjs <slug> --base http://127.0.0.1:3000 6:0:0.6 9:1:1.2:poCell
```

Varje argument är `slide:läge:sekunder` (sliden från 1, läget från 0), med ett valfritt mönster för CSS-förloppens namn sist. Bilderna hamnar i `presenter/.granska/<slug>/mellan/`. Tiden gäller inte allt:

- Bilden tas efter ungefär 1,8 sekunder, eller 3 sekunder med ett mönster, vilken tid du än anger.
- Vid den angivna tiden visas bara det som läser tiden ur adressen (`?simtid`): canvasvärldar, förlopp ur `useStepClock` och formernas räknare.
- Med ett mönster spolas de CSS-förlopp vars namn matchar till den tiden. Övriga förlopp har gått i 1,8 eller 3 sekunder. Ett brett mönster träffar också slidens resa in i bilden, så att två lägen syns på en gång; välj ett smalt namn ur formens CSS-modul.

## Kontrollera det som rapporten inte ser

- **Första blickfånget:** vad ser publiken först, och tillför varje klick en enda ny tanke?
- **Framåt, bakåt och bakifrån:** bakåt återställer föregående läge direkt och döljer ett svar igen. Gå också in i en slide bakifrån.
- **Snabba tryck** över en slidegräns, och att en valfri fördjupning inte fångar clickern.
- **Media** spelar bara i sitt steg och pausas när det lämnas.
- **R:** ändra en text, spara, ladda om och visa. Svenska tecken, radbrytningar och manus överlever.
- **T och Shift+T:** ett helt varv bland temana och tillbaka till deckets eget.
- **Reducerad rörelse** visar samma lägen färdiga.
- **Läsbarhet:** det publiken måste läsa är stort nog för salen. Formerna sätter själva sina grader; se avsnittet om bildläge och läsbarhet i bygga-skillen. Kontrast mot faktiska foton.
- **Formen:** generiska rutor i det som är byggt nytt, upprepade kompositioner, för täta lägen och svag hierarki.

### Utan webbläsare

Har du ingen webbläsare att styra kommer du så här långt, och resten lämnar du till föreläsaren:

| Kontroll | Så långt kommer du utan webbläsare | Lämna till föreläsaren |
|---|---|---|
| T | `granska-edge.mjs --tema` i ett ljust och ett mörkt tema; jämför bilderna med deckets egna. | Ett helt varv med T och återgången med Shift+T i spelaren. |
| R | Att varje synlig text är ett fält: granskningen flaggar fält utan R-schema, och texten ska stå ordagrant i MDX. | Ändra, spara, ladda om och visa i editorn. |
| Bakåt | Att varje läge är ett eget, färdigt informationsläge: bilderna är tagna så som bakåt och R visar dem. Kontrollera i MDX att svar och slutsatser ligger på egna klick. | Bakåt, bakifrån och snabba tryck med clicker. |
| Reducerad rörelse | Granskningens bilder visar slutlägena med övergångarna avstängda. Det liknar reducerad rörelse men är inte samma sak. Kontrollera i koden att en ny form läser `still` (se `presenter/docs/STAGE.md`). | Att lägena stämmer med rörelsen avstängd i operativsystemet. |
| Media och ljud | Att filerna laddas: granskningen flaggar trasiga medier. | Att ljud och film spelar i rätt steg och pausas. |

## Redovisa

Rätta det som är fel och kör om. Skriv sedan exakt vad som är kontrollerat och hur, och vad som inte är det. Säg uttryckligen vilka kontroller i tabellen ovan som har gjorts i en webbläsare och vilka som lämnas till föreläsaren. Läsbarheten i en verklig lokal och på en verklig projektor går inte att intyga från skärmen; säg det. Medvetna val som rapporten flaggar lämnas till föreläsaren med en motivering.
