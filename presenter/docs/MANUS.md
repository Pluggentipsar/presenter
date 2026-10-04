# Manus i Notes

Varje slide kan ha ett manus i ett `<Notes>`-block direkt efter sliden. Föreläsaren ser det i presentatörsvyn och med N i spelaren; publiken ser det aldrig. Manuset är också underlaget för läsläget, taltiden och kontrollen av klicken.

```mdx
<Stage form="poster" slideId="ex_varfor" title="En bild visar
~hur det ser ut." title2="~En form visar
~hur det går till." />

<Notes>
De flesta presentationsprogram visar bilder. Det räcker långt.
[Klick] Men när vi förklarar ett förlopp hjälper det om sliden får hända medan vi pratar.
</Notes>
```

## Reglerna

- **`[Klick]`** står där föreläsaren klickar. En slide med n lägen har n − 1 klick i manuset. Det som står före första `[Klick]` sägs medan första läget visas.
- **Tal mellan klicken.** Två `[Klick]` i rad utan tal emellan betyder att publiken ser ett läge som ingen pratar om. Det är sällan meningen.
- **`REGI:`** inleder en anvisning till föreläsaren, till exempel om en paus eller en film. Den räknas inte som tal.
- **Anvisningar inom hakparentes**, som `[Visa bilden och vänta]`, räknas inte heller som tal.
- **NY TEXT** märker en formulering som föreläsaren inte har sagt eller godkänt, på sliden eller i manuset. Den skrivs som ett eget REGI-stycke, `REGI: NY TEXT – <vad som är nytt>`, och samma rad samlas med slidens `slideId` i `planering/<slug>.md` under *Ny text som väntar på ja*. Raden stryks på båda ställena när föreläsaren har sagt ja.
- **En lägesbeskrivning** får inleda manuset, till exempel ”Tre lägen: frågan, svaret, slutsatsen.”

Ett REGI-stycke står för sig, med en tom rad före och efter. Kontrollerna hoppar över hela stycket, så ett `[Klick]` i samma stycke räknas inte.

```mdx
<Notes>
Tre lägen: frågan, svaret, slutsatsen.

REGI: NY TEXT – rubriken och slutsatsen

Vad tror ni händer om vi frågar chattboten om källan finns?
[Klick] Den svarar ja. Samma chatt bekräftar sin egen gissning.
[Klick] Att fråga samma källa är ingen kontroll.
</Notes>
```

## Kontrollerna

```bash
node scripts/klick-manus.mjs <slug>   # [Klick] mot lägena, tysta klick
node scripts/taltid.mjs <slug>        # taltid vid 130–140 ord per minut
```

Taltiden räknar bort `REGI`, lägesbeskrivningar, anvisningar inom hakparentes och dolda slides. Bildpauser, filmer och samtal tillkommer.

## Det som är internt

Manus, anteckningar och instruktioner på sliderna (`claude="…"`) följer aldrig med när en föreläsning delas publikt; den publika exporten tar bort dem. Skriv ändå aldrig något i manuset som inte tål att läsas av fel person.
