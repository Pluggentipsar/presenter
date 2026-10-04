---
name: planera
description: Planera en föreläsning eller workshop i Presenter. Förstå uppdraget, föreslå resan och skriv tråden, en rad per slide, innan något byggs. Använd när föreläsaren beskriver ett uppdrag eller ber om ett upplägg; lämna över till bygga när sliderna ska byggas.
---

# Planera en föreläsning

## Förstå uppdraget

Utgå från det föreläsaren redan har sagt om publik, syfte, tid, format, förkunskaper och inramning. Fråga bara om luckor som avgör resultatet, och fråga inte två gånger om samma sak. Föreläsaren styr tidsbudgeten. Räkna inte minuter ur antalet slides eller klick: ett snabbt nedslag och ett genomarbetat exempel tar olika lång tid.

Läs `profil/` innan du skriver text i föreläsarens namn. Börjar filerna fortfarande med raden `> **MALL – inte ifylld.**` är profilen inte ifylld och räknas som saknad: mallens påhittade föreläsare, hens ämne, ton och preferenser gäller inte. Fråga då en gång om tilltal, ton och publik, och skriv det du har antagit som antaget i planeringen.

Finns decket redan: läs `planering/<slug>.md`, `presenter/content/anteckningar/<slug>.md` och instruktionerna på sliderna (`grep -n 'claude="' presenter/content/<slug>.mdx`).

Slugen blir filnamnet för både decket och planeringen. Den har bara a–z, 0–9, bindestreck och understreck och börjar med en bokstav eller siffra (se AGENTS.md).

## Återbruk först

Sök i `presenter/content/` efter föreläsningar som redan säger något av det som behövs. Läs aktuell MDX och Notes för de få block som passar, och hänvisa till dem med `slideId`, inte med nummer. Ett äldre innehåll kan få en nyare form. Siffror och produktuppgifter i äldre deck är sökingångar, inte aktuella fakta: kontrollera källa och datum innan de används igen.

## Föreslå resan

Visa en kort karta:

- avsnitten och publikens fråga i varje avsnitt
- de centrala exemplen och vad föreläsaren berättar
- vilka delar som är snabba nedslag, längre förlopp, bryggor eller samtal
- vad som återbrukas (slug och `slideId`), vad som anpassas och vad som är nytt
- en uppskattning av tiden per del, inom den givna budgeten

Välj övningar som gör ett pedagogiskt jobb. En muntlig fråga, fyra hörn eller ett samtal i par räcker ofta. Interaktiva verktyg behövs bara när de tillför något, och huvudspåret ska hålla utan dem.

## Skriv tråden

Tråden är en rad per slide som säger vad publiken ska förstå, inte vad sliden innehåller. Markera funktionen: nedslag, exempel, brygga eller samtal. Visa tråden för föreläsaren och vänta på besked innan du bygger. Ändrar hen ordningen eller stryker: följ det.

Spara upplägget i `planering/<slug>.md` i repots rot (mappen finns redan, se `planering/README.md`), så att nästa session hittar det:

- **Uppdraget**, med det som är antaget markerat som antaget.
- **Tråden**, en rad per slide.
- **Ny text som väntar på ja**: tom tills bygget skriver formuleringar som föreläsaren inte har godkänt.
- **Läget**: vad som är klart och vad som återstår.

## När sliderna ska byggas

Fortsätt med `.agents/skills/bygga/SKILL.md` när föreläsaren har sagt ja till tråden. Bara diskussion: stanna vid ett användbart upplägg.
