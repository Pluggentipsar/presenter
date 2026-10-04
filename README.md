# Presenter

Ett program för föreläsningar som går att göra mer med än i PowerPoint: rörelse, visualiseringar, förvandlingar och modeller som publiken kan följa klick för klick. Föreläsaren styr allt med en clicker. Varje slide går att redigera i programmet, temat byts med en tangent, och föreläsningen kan delas som läsläge, spelas in och exporteras.

Presenter byggs bäst tillsammans med en AI-agent, till exempel Claude Code eller Codex: du beskriver föreläsningen, och agenten bygger den med programmets former och regler. Redigeringen fungerar också utan agent.

Skapat av Joel Rangsjö. Namnet är Presenter, som i *press Enter*. Webbsidan: https://amber-palm-6ewp.here.now/

> Det här är en tidig version. Windows först.

## Kom igång

### Installationsfilen för Windows

Ladda ned den senaste `Presenter-Setup-<version>.exe` under [Releases](https://github.com/Pluggentipsar/presenter/releases) och kör den. Vid första starten väljer du var föreläsningsmappen ska ligga. Appen hämtar den från det här repot och öppnar biblioteket, där välkomstdecket ligger. Hämtningen kräver [Git for Windows](https://git-scm.com/download/win), som också gör att *Hämta senaste* i appens meny fungerar. Utan Git går det också: ladda ned källkoden som zip under Releases, packa upp den och välj den mappen när appen frågar.

Installationsfilen är inte kodsignerad än. Windows SmartScreen kan därför varna för en okänd utgivare: välj *Mer information* och sedan *Kör ändå*.

### Från källkoden

Du behöver [Node.js](https://nodejs.org) 22 eller senare och Git.

```bash
cd presenter
npm install
npm run dev
```

Öppna sedan http://127.0.0.1:3000. Börja med välkomstdecket, *Presenter · föreläsningar som rör sig*: gå framåt med piltangenten eller en clicker, tryck N för manuset och M för menyn.

### Livefrågor (valfritt)

Publiken kan ansluta med en kod och svara från mobilen, med frågor, quiz och reflektioner. Det kräver en egen databas i Supabase. Kör migreringarna i `presenter/supabase/migrations` (se `presenter/supabase/README.md`) och fyll i `presenter/.env.local` enligt `presenter/.env.example`.

## Bygg med en agent

Öppna mappen i Claude Code, Codex eller ett annat verktyg som läser `AGENTS.md`, och beskriv föreläsningen du vill ha. Agenten följer arbetsgången planera → bygga → granska:

1. Den frågar om det som saknas och föreslår en **tråd**, en rad per slide.
2. Den bygger sliderna med en **form för varje tanke** och skriver manus i Notes.
3. Den **granskar** varje klickläge innan den lämnar över.

Fyll gärna i `profil/` först, så att texterna låter som du. Filerna där är mallar med en påhittad föreläsare tills du har skrivit om dem och tagit bort MALL-raden överst; dessförinnan frågar agenten dig om tilltal och ton i stället. Planeringen för varje föreläsning hamnar i `planering/`.

| Fil | Innehåll |
|---|---|
| `AGENTS.md` | Startregeln, kontraktet och kartan för agenter |
| `.agents/skills/` | Arbetsgången: planera, bygga och granska |
| `presenter/DESIGN.md` | Stilbibeln |
| `presenter/docs/STAGE.md` | Formerna och hur de fungerar |
| `presenter/docs/MANUS.md` | Manusformatet |
| `presenter/docs/GRANSKA.md` | Granskningen av varje klickläge |
| `profil/` | Din röst och dina preferenser |
| `planering/` | Upplägg och tråd per föreläsning |

## Tangenter i spelaren

| Tangent | Gör |
|---|---|
| → eller mellanslag | Nästa läge |
| ← | Föregående läge |
| N | Manus |
| M | Menyn |
| R | Redigera direkt i sliden |
| T, Shift+T | Byt tema, tillbaka till deckets eget |
| F | Helskärm |

## Licens

Koden är fri under MIT-licensen. Exempelinnehållet, som välkomstdecket och dess bild, är licensierat under CC BY 4.0. Se `LICENSE`. Tredjepartsmaterial, som NASA-bilder, typsnitt, loggor och FFmpeg i installationsfilen, står i `THIRD-PARTY-NOTICES`.
