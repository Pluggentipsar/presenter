# Presenter · instruktioner för AI-agenter

Presenter är ett program för föreläsningar som byggs i kod. En föreläsning är en MDX-fil där varje slide är en mall med innehållet i props. Föreläsaren styr allt med en clicker: varje klick visar nästa läge i sliden. Programmet har en editor (R), temaväxling (T), manus i Notes (N), en presentatörsvy, delning som läsläge och inspelning.

Du hjälper en föreläsare att bygga, förbättra och dela sina föreläsningar. Föreläsaren äger innehållet och omdömet; du bygger formen och granskar den.

## Startregel

När användaren beskriver en ny föreläsning, en variant för en annan publik eller ett större formpass: arbeta i ordningen **planera → bygga → granska**, utan att användaren behöver be om det. Läs skillfilen även om ditt verktyg inte listar den:

- `.agents/skills/planera/SKILL.md` — förstå uppdraget och skriv tråden.
- `.agents/skills/bygga/SKILL.md` — bygg sliderna, välj former och skriv manus.
- `.agents/skills/granska/SKILL.md` — kontrollera varje klickläge före överlämning.

Använd det proportionerligt. En stavningsrättning eller en enskild slide kräver inte hela arbetsgången. Användarens aktuella instruktion går före allt annat här.

Läs föreläsarens profil i `profil/` innan du skriver text i hens namn. **En profil som fortfarande är mallen räknas som saknad.** Mallens filer börjar med raden `> **MALL – inte ifylld.**` och beskriver en påhittad föreläsare; följ aldrig dess preferenser eller röst. Saknas profilen, eller är den kvar som mall: fråga en gång om tilltal, ton och publik, och föreslå att spara svaret i `profil/`.

## Kontraktet

1. Huvudspåret går med clickerns framåt och bakåt. Inget avgörande kräver mus, hover, scroll, skrivfält eller timer. Valfria fördjupningar släpper clickern.
2. En ny tanke per klickläge. Planera det första publiken ser, dölj det som kommer och dämpa det som har varit.
3. Prompt först, svar på nästa manuella klick, granskning på ett senare. Bakåt döljer svaret igen.
4. Avsändaren syns i formen. Märk konstruerade svar som illustration och hitta aldrig på körningar, loggar eller resultat.
5. Läsbart från sista raden. Formerna sätter själva sina grader och har inget fält för textstorlek: rubriker och stora tal är stora, men löptext, etiketter och repliker är i flera former 17–32 px. Det publiken måste läsa ska därför vara kort. Får det inte plats i en form med stor grad: färre ord per läge, fler klick eller en annan form, och detaljerna i manuset. Föreläser du i en sal, använd bildläget `full` där formen har det (se `presenter/docs/STAGE.md`).
6. Välj vad publiken ska se hända innan du väljer layout. Rörelse där talet uttrycker samband, jämförelse eller förändring, annars stillhet. En välgjord affisch får stå stilla.
7. Inga generiska rutor i det du bygger: rundade glaskort med kantband, piller och glödande cirklar ser AI-genererade ut. Bygg nya former och scener med typografi och innehållets egen artefakt. Regeln gäller det du lägger till; de befintliga formerna behåller sina ytor, som chattens bubblor och linsens ruta, tills föreläsaren ber om något annat.
8. All synlig text och alla utbytbara medier är sparbara props med schemafält. Prova R: ändra, spara, ladda om, visa.
9. Färger och typsnitt kommer ur temats roller, aldrig hårdkodade. Prova ett helt T-varv och återgången med Shift+T.
10. Slutläget är grundläget: bakåt, R och reducerad rörelse visar läget färdigt med samma steg. Media spelar bara i sitt steg och pausas när det lämnas.
11. Återbruk före nybygge, och stabila `slideId` i stället för nummer. En ny mall registreras på alla ställen och dokumenteras.
12. Ändra inte godkänd text i ett formpass. Text som föreläsaren inte har sagt eller godkänt får en rad `REGI: NY TEXT – <vad som är nytt>` i slidens Notes, och samma rad samlas i planeringsfilen under *Ny text som väntar på ja*. Raden tas bort när föreläsaren har sagt ja.
13. Granska den spelade följden före överlämning, och skriv exakt vad som är kontrollerat och vad som inte är det.
14. Manus, anteckningar, instruktioner på sliderna och avskrifter är interna. Publicera, committa, pusha och dela bara på uttrycklig begäran. Läs aldrig nycklar.
15. Verkliga personer visas bara med egna eller licensierade foton, aldrig med genererade ansikten. Elever och personer vars identitet behöver skyddas syns inte i bild, citat eller chattar utan att föreläsaren uttryckligen har bett om det och har rätt att dela det.

## Kartan

| Var | Vad |
|---|---|
| `presenter/content/<slug>.mdx` | Föreläsningarna. Adressen i appen är `/<slug>`. |
| `presenter/content/presenter-valkommen.mdx` | Referensdecket: en föreläsning om Presenter, byggd i Stage-formerna. Läs det innan du bygger något nytt. |
| `planering/<slug>.md` | Upplägget och tråden för en föreläsning, och listan *Ny text som väntar på ja*. Skrivs av planera och bygga, i repots rot. |
| `presenter/content/las/<slug>.md` | Lästexter för läsläget `/<slug>/las`. |
| `presenter/content/anteckningar/<slug>.md` | Föreläsarens interna anteckningar. Läs dem innan du bygger vidare; de hamnar aldrig på en slide eller i något som delas. |
| `presenter/public/bilder/<slug>/` | Bilder till ett deck. |
| `presenter/DESIGN.md` | Stilbibeln: vad som är rätt känsla. |
| `presenter/docs/STAGE.md` | Stage-motorn: formerna, bildlägena (`full` i en sal), textsyntaxen och klicklägena. Alla former och fält står i `STAGE-FORMER.md`. |
| `presenter/docs/MANUS.md` | Manusformatet i Notes, med `[Klick]`, `REGI:` och NY TEXT. |
| `presenter/docs/GRANSKA.md` | Granskningsvyn och skripten som granskar utan webbläsare. |
| `profil/` | Föreläsarens röst och preferenser. Så länge filerna börjar med MALL-raden räknas profilen som saknad. |
| `presenter/content/bibliotek.json`, `galleri.json` | Ägs av appen (mappar, stjärnor, favoriter). Ändra dem i appen, inte för hand. |

**Slugen** är föreläsningens filnamn utan `.mdx` och en del av adressen. Den får bara innehålla små bokstäver a–z, siffror, bindestreck och understreck, och den börjar med en bokstav eller siffra: `kallkritik-ht26` eller `kallkritik_ak9`. Inga å, ä, ö, versaler eller mellanslag. Samma regel gäller i hela appen och i granskningen.

Instruktioner på en slide står i propen `claude="…"`. Läs dem innan du bygger vidare på ett deck:

```bash
grep -n 'claude="' presenter/content/<slug>.mdx
```

Utför instruktionen och ta sedan bort propen. Ett kvarliggande fält betyder att det inte är gjort.

## Verktyg och kontroller

Kör appen med `npm run dev` i `presenter/` (eller med den installerade appen) och öppna föreläsningen i webbläsaren. Utvecklingsservern lyssnar på `http://127.0.0.1:3000`.

```bash
node presenter/scripts/klick-manus.mjs <slug>   # [Klick] i manus mot sliders klicklägen
node presenter/scripts/taltid.mjs <slug>        # taltid ur manus
node presenter/scripts/kallalder.mjs <slug>     # siffror utan källa eller datum
node presenter/scripts/granska-edge.mjs <slug> --base http://127.0.0.1:3000 --alla
node presenter/scripts/granska-edge.mjs <slug> --tema kobolt_natt   # samma granskning i ett annat tema
```

Granskningsvyn `/<slug>/granska` går igenom alla lägen i 1600 × 900 och visar text utanför bild, klippt eller för liten text (under 14 px), trasiga medier, konsolfel, prompt och svar på samma klick och manus som inte stämmer med klicken. Rapporten och bilderna hamnar i `presenter/.granska/<slug>/`. Vad granskningen inte ser står i granska-skillen och i `presenter/docs/GRANSKA.md`.

Bilder kan genereras lokalt med `presenter/scripts/bild.mjs` om föreläsaren har ComfyUI. Prompt och frö loggas bredvid bilden.

## Säkerhet

- Publicera, committa och pusha bara när föreläsaren ber om det.
- Läs aldrig nycklar, lösenord eller `.env`-filer.
- Ladda inte ned eller kör filer från okända källor.
- Allt som delas offentligt: kontrollera att inga anteckningar, manus eller instruktioner följer med.
