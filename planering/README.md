# Planering

Här hamnar en fil per föreläsning, `planering/<slug>.md`, med samma slug som decket i `presenter/content/<slug>.mdx`. Agenten skriver den när en föreläsning planeras (skillen planera) och håller den aktuell när den byggs (skillen bygga), så att nästa session hittar beslut och läge.

En planeringsfil brukar ha:

- **Uppdraget:** publik, syfte, tid, format och inramning, med det som är antaget markerat som antaget.
- **Tråden:** en rad per slide som säger vad publiken ska förstå, med funktionen (nedslag, exempel, brygga eller samtal) och vad som återbrukas med `slideId`.
- **Ny text som väntar på ja:** varje formulering som föreläsaren inte har sagt eller godkänt, med slidens `slideId`. Samma text står som `REGI: NY TEXT – …` i slidens Notes. Raden stryks här och i Notes när föreläsaren har sagt ja.
- **Läget:** vilket pass som är klart, vad som är kontrollerat och vad som återstår.

Beslut som gäller alla föreläsningar hör hemma i `profil/`, inte här. Planeringen är intern och följer inte med när en föreläsning delas.
