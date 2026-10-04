---
name: bygga
description: Bygg och förfina föreläsningar i Presenter. Välj en form för varje tanke, skriv manus i Notes, generera eller välj bilder, och kontrollera varje klickläge. Använd vid nya föreläsningar, varianter och större formpass; planera går före.
---

# Bygga en föreläsning

## Startpunkt

Läs innan du bygger:

- `presenter/DESIGN.md` — vad som är rätt känsla.
- `presenter/docs/STAGE.md` — formerna, bildlägena, fälten och klicklägena.
- `presenter/docs/MANUS.md` — manusformatet.
- `presenter/content/presenter-valkommen.mdx` — referensdecket. Det visar formerna i sitt sammanhang, med manus.
- `profil/` — föreläsarens röst. Börjar filerna med raden `> **MALL – inte ifylld.**` är profilen inte ifylld och räknas som saknad: skriv inte i mallens påhittade röst och följ inte dess preferenser. Fråga om tilltal och ton, eller skriv neutralt och märk all text NY TEXT.
- `planering/<slug>.md` i repots rot, anteckningarna och instruktionerna på sliderna om decket finns.

## Välj en form för varje tanke

Börja med vad publiken ska se hända, inte med layouten. Varje rad i tråden blir en slide, och varje slide gör en sak:

- **Ett stort påstående** blir en affisch, ett ordfält som landar i ett påstående eller stora tal.
- **Ett exempel i flera steg** blir en form där varje klick visar nästa led: chatten, tre ord, trappan, eftertexten.
- **En tät läsyta**, som en hel prompt eller ett utdrag, får en egen stor läsyta: svaret i utdrag eller utdraget.
- **En brygga** mellan delarna får andas: en affisch, en zoom eller bryggan.

Prompt och svar står på olika klick. Märk konstruerade svar som illustration. En slide som skulle fungera precis likadant i ett vanligt presentationsprogram har inte använt det som koden kan, men en välgjord affisch får vara stilla.

Börja i Stage-formerna (`<Stage form="…">`). De har klicklägen, temaroller, R-redigering och clicker inbyggda. Bygg en ny form först när ingen befintlig visar resonemanget, och följ då avsnittet om nya former i `presenter/docs/STAGE.md`. Det du bygger nytt följer kontraktets punkt 7: inga generiska rutor. De befintliga formernas ytor, som chattens bubblor och linsens ruta, byter du inte ut i förbigående.

Ett nytt tema provas på tre scener innan det sprids: ett stort påstående, ett exempel i flera steg och en tät läsyta.

## Bildläge och läsbarhet i en sal

Många former står som standard i bildläget `talare`: innehållet till vänster och en tom yta till höger, där en talare står i bild vid en inspelning. Hålls föreläsningen live i en sal, sätt `layout="full"` på de former som har ett helbildsläge, så att texten får hela bredden och större grad. Vilka former det är står i `presenter/docs/STAGE.md`, avsnittet Bildlägen. Övriga former står kvar till vänster; välj då hellre en form som redan använder hela bilden.

Formerna sätter själva sina grader och har inget storleksfält. Rubriker och stora tal är stora, men löptext, repliker och etiketter är i flera former 17–32 px (svaret i `answer`, utdraget i `utdrag`, raderna i `stack`, frågorna i `lins`). I en stor sal:

- skriv färre ord per läge och flytta resten till manuset
- välj former där det bärande är stort: `poster`, `words`, `stats`, `treord`, `quote`
- dela en lång text på fler klick i stället för att låta den stå tät
- använd `full` där formen har det

Granskningen flaggar bara text under 14 px. Den minsta graden per läge står i rapporten; läs den, och titta på bilderna som publiken längst bak skulle se dem.

## Tre pass

Ett nytt deck byggs i tre pass. Varje pass slutar med din egen granskning och en punkt där föreläsaren svarar.

1. **Montera.** Bygg hela decket ur tråden, med manus i Notes och en form per tanke.
2. **Formpass.** Gå igenom decket slide för slide: finns en form, ett medium eller ett exempel som gör jobbet bättre?
3. **Rörelsepass.** Var kan rörelse förklara det som annars bara står där? Rörelse ska visa samband, jämförelse eller förändring, inte pynta.

Förslag i formpasset och rörelsepasset numreras. Varje förslag har rubrikerna *Idag*, *Förslag*, *Tittaren ser*, *Hur*, *Ny text* (ordagrant, eller ”ingen”) och *Insats*. Avsluta med *Övervägt men avråder* och en rekommenderad ordning. Föreläsaren svarar per nummer.

## Text och manus

Skriv i föreläsarens röst ur `profil/`. Ändra inte godkänd text när uppdraget gäller formen.

**NY TEXT.** En formulering som föreläsaren inte har sagt eller godkänt, på sliden eller i manuset, får ett eget stycke i slidens Notes, med en tom rad före och efter:

```
REGI: NY TEXT – rubriken och de tre frågorna
```

Samma rad, med slidens `slideId`, samlas i `planering/<slug>.md` under rubriken *Ny text som väntar på ja*. När föreläsaren har sagt ja stryks raden både i Notes och i planeringen.

Varje slide får manus i `<Notes>` enligt `presenter/docs/MANUS.md`, med en `[Klick]` per klick. Den synliga texten är kort; resten hör hemma i manuset.

## Bilder

Använd föreläsarens egna bilder, licensierade bilder eller bilder som genereras lokalt:

```bash
node presenter/scripts/bild.mjs --deck <slug> --name <namn> --prompt "<prompt>" --n 3
```

Skriptet kräver ComfyUI och loggar prompt och frö bredvid bilden. Välj den bästa varianten, konvertera till webp och ta bort de andra. Verkliga personer visas aldrig med genererade ansikten.

## Tekniskt kontrakt

- All synlig text och alla utbytbara medier är props med schemafält, så att R fungerar.
- Färger och typsnitt kommer ur temats roller; prova T och Shift+T.
- Stabila `slideId` på varje slide.
- En ny mall registreras på alla ställen (export, spelare, editor, schema) och dokumenteras.

## Kontroller före överlämning

```bash
node presenter/scripts/klick-manus.mjs <slug>
node presenter/scripts/taltid.mjs <slug>
node presenter/scripts/kallalder.mjs <slug>
```

Granska sedan enligt `.agents/skills/granska/SKILL.md`. Rätta det du själv kan se innan föreläsaren tittar: generiska rutor i det du har byggt, otydliga chattar, text utanför bild, text som är för liten för salen och oläsbara bilder ska inte vara hens sak att upptäcka.
