/**
 * Tema-system.
 *
 * Ett tema definierar ett komplett formspråk:
 * - Färger
 * - Typografi (fonts, weights, letter-spacing, case)
 * - Geometri (radius, borders, shadows)
 * - Motion (easing, durations, entrance-stil)
 * - Ornamentik (accent-linjer, decorations)
 *
 * Tema sätts i MDX frontmatter: theme: sunset
 */

export interface ThemeTokens {
  /** Defaultuttryck för horisontscener. H kan tillfälligt växla. */
  horizonExpression?: "classic" | "horizon";
  /** Lugn bakgrund för allmänna slide-mallar; media kan överstyra den. */
  slideBackground?: string;
  /** Preserve a scene's authored colour nuances; other themes supply its semantic palette. */
  scenePalette?: "authored";
  // Färger
  bg: string;
  bgSurface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  accentDim: string;
  /** Sekundär "avslöjande"-accent. Används sparsamt — för att markera moments
   * där något blottläggs (felaktigt beteende, dark patterns, signal-data).
   * Default: röd #E63946 om inte deklarerad. */
  accentAlert?: string;
  /** Mörkare, högkontrast-variant av accent — säker som text/linje på LJUS
   * bakgrund (>=4.5:1). Används av ljus-teman för finare linjer/länkar där
   * huvudaccenten inte når kontrastkravet. Default: faller tillbaka på accent. */
  accentInk?: string;
  /** Ljus, mättad fyllnadsfärg — ENDAST för fyllnad/ornament (pills, svep,
   * stat-fyllnad), aldrig text. På ljus bakgrund klarar den inte textkontrast.
   * Default: faller tillbaka på accent. */
  accentBright?: string;
  /** Kompletterande färg för visualiseringar; inte automatiskt textfärg. */
  accentSecondary?: string;
  /** Gemensamt, bekräftat eller etablerat i en visualisering. */
  accentPositive?: string;

  // Typografi
  fontDisplay: string; // För rubriker (heading)
  fontBody: string; // För löptext
  fontMono: string; // För kod och caption-text
  /** Berättelsens röst: citat och slagord i en serif. Emitteras som
   * --font-quote; teman utan egen roll faller tillbaka på fontDisplay. */
  fontQuote?: string;
  /** Strukturens etiketter (hörn, rubriketiketter). Emitteras som
   * --font-label med --label-stretch; teman utan egen roll faller tillbaka
   * på fontMono i normal bredd. */
  fontLabel?: string;
  labelStretch?: string;
  /** Multiplikator på scenernas negativa rubrikspärrning (--display-track).
   * Tunga groteskrubriker tål tät spärrning; en serif behöver mindre. */
  displayTrack?: number;
  /** Multiplikator på rubrikernas bredd i specialbyggda scener
   * (--display-condense, 1 = oförändrad). */
  displayCondense?: number;
  /** Vikt för meningar som sätts i rubrikfonten (--heading-weight-text). */
  headingWeightText?: number;
  /** Etiketterna i ramen som plåtar: bakgrund i textfärg, text i bakgrundsfärg. */
  labelPlate?: boolean;
  /** Scenbakgrund i specialbyggda scener: "space" = stjärnor och horisont.
   * Emitteras som --scenery (1/0) så att andra teman döljer lagret. */
  scenery?: "space";
  headingWeight: number | string; // 400, 500, 700, etc
  headingTracking: string; // letter-spacing (tex "-0.03em")
  headingCase: "normal" | "uppercase" | "lowercase";
  bodyTracking: string;

  // Geometri
  radius: string; // border-radius (tex "0.75rem" eller "0")
  borderWidth: string; // border thickness (tex "1px")
  slideMaxWidth: string; // content max-width (tex "72rem")
  /** Multiplikator på displaygraden i statement-mallarna (GiantText,
   * HookStatement, SectionDivider, CorrectedClaim, .slide-prose h1).
   * Emitteras som --display-scale; default 1 = oförändrat. Affischteman
   * (kobolt) kör 1.3. */
  displayScale?: number;

  // Motion
  motionEase: string; // CSS cubic-bezier
  motionDuration: string; // "0.6s"
  entranceStyle: "fade" | "slide" | "scale" | "snap"; // slide entry-animation

  // Ornament
  ornamentStyle: "line" | "starburst" | "dot" | "none" | "square";
  ornamentColor: string; // brukar matcha accent eller text

  // Decoration system — chunky offsets, solid borders, noise overlay.
  // Sätts av "tema-uttalade" stilar som memphis_riso. Lämna undefined
  // på minimalistiska teman → templates får neutral fallback.
  /** text-shadow för stora rubriker. T.ex. "4px 4px 0 #FF4F8B" */
  titleShadow?: string;
  /** Primär offset-skugga på kort/boxar. T.ex. "5px 5px 0 #FF4F8B" */
  cardShadow?: string;
  /** Alternerande offset-skugga (för pink/blå-pattern). */
  cardShadowAlt?: string;
  /** Tjock solid kantlinje på kort. T.ex. "3px solid #1A1A1A" */
  cardBorder?: string;

  // Valfri decoration-URL (tex noise-texture)
  backgroundTexture?: string;

  // Glass-system — används av nattglas och framtida liquid-glass-teman.
  // Lämna undefined på vanliga teman.
  /** Z-axel-elevation: brighter bakgrund för glass-paneler närmast user. */
  bgElevated?: string;
  /** Subtle färgtint som blandas in i glass-paneler (rgba). */
  glassTint?: string;
  /** Border-färg på glass-paneler (rgba). */
  glassBorder?: string;
  /** Border-färg på TOPPEN av glass-paneler (simulerar ljus uppifrån). */
  glassBorderTop?: string;
  /**
   * Valfria tonfärger för Lecture-scenernas natt, papper och sol. Utan dem gäller
   * de ljusa temanas logik: natt byter plats på bg och text, sol lägger text på
   * accentBright. Mörka teman behöver sätta dem själva.
   */
  toneNightSurface?: string;
  toneNightInk?: string;
  tonePaperSurface?: string;
  tonePaperInk?: string;
  toneSunSurface?: string;
  toneSunInk?: string;
  /** Signaturgrepp som scenerna kan rita när temat är aktivt, t.ex. "voice" (vågformer). */
  signature?: "voice" | "linjen";
  /** Världen bakom Stage-scenerna (Stage). Utan den: Vättern, en kommuns
   * sjö. Ett formprov (1 oktober 2026): smedja, an och plattor. Följer T. */
  stageWorld?: "vattern" | "smedja" | "an" | "plattor";
  /** Valfria Sta-blandfärger. Utan dem blandas accenten in i bakgrunden, vilket blir grumligt i mörka teman med varm accent. */
  staIce?: string;
  staFocus?: string;
  staWarm?: string;
}

export const themes: Record<string, ThemeTokens> = {
  larare_solkraft: {
    bg:"#F2F0E9",bgSurface:"#FCFCF7",text:"#101E2A",textMuted:"#50616B",
    accent:"#315F72",accentInk:"#264B60",accentBright:"#F4D45D",accentSecondary:"#9DCADB",accentPositive:"#A7CEC2",
    accentGlow:"rgba(157,202,219,.25)",accentDim:"rgba(16,30,42,.08)",accentAlert:"#EF927C",
    fontDisplay:"var(--font-archivo)",fontBody:"var(--font-manrope)",fontMono:"var(--font-jetbrains-mono)",
    headingWeight:850,headingTracking:"-.055em",headingCase:"normal",bodyTracking:"-.02em",
    radius:"1.5rem",borderWidth:"1px",slideMaxWidth:"80rem",displayScale:1.15,
    motionEase:"cubic-bezier(.16,1,.3,1)",motionDuration:".65s",entranceStyle:"fade",
    ornamentStyle:"none",ornamentColor:"var(--accent)",glassTint:"rgba(237,243,245,.08)",glassBorder:"rgba(175,207,223,.22)",glassBorderTop:"rgba(237,243,245,.42)",
  },
  prisma: {
    bg: '#160F24', bgSurface: '#351C43', text: '#FFF7FC', textMuted: '#D9C5E9',
    accent: '#D7BFFF', accentGlow: '#D7BFFF55', accentDim: '#D7BFFF22', accentInk: '#624275',
    fontDisplay: '"Manrope", sans-serif', fontBody: '"Manrope", sans-serif', fontMono: 'monospace',
    headingWeight: 650, headingTracking: '-0.045em', headingCase: 'normal', bodyTracking: '-0.02em',
    radius: '1.5rem', borderWidth: '1px', slideMaxWidth: '80rem',
    motionEase: 'cubic-bezier(.22,1,.36,1)', motionDuration: '0.7s', entranceStyle: 'fade',
    ornamentStyle: 'none', ornamentColor: '#D7BFFF',
  },
  /* linjen (”Linjen”), vald av Joel 23 september 2026 för
     en föreläsning om elevperspektivet (formprov A med typsystem T2). Föreläsningen
     är en busslinje: den börjar och slutar på bussen, och den röda tråden är
     linjen. Elevens linje är gul (accent), hållplatsskyltarna bärnsten
     (accentBright), AI:s express lila (accentSecondary), lärarens linje isblå
     (accentPositive). Overpass för skyltar och rubriker, Atkinson Hyperlegible för
     läsning, Overpass Mono för tider och etiketter; prickmatrisen (Doto) ritas av
     signaturen linjen. Ligger före elever_solkraft så att T går dit och Shift+T
     tillbaka. */
  linjen: {
    bg: "#070b14",
    bgSurface: "#0e1627",
    bgElevated: "#162036",
    text: "#f2f0ea",
    textMuted: "#98a3b8",
    accent: "#ffe52b",
    accentInk: "#ffe52b",
    accentBright: "#ffb321",
    accentSecondary: "#b9a6ff",
    accentPositive: "#9fd3ff",
    accentGlow: "rgba(255, 179, 33, 0.28)",
    accentDim: "rgba(242, 240, 234, 0.07)",
    accentAlert: "#ff5a4f",
    glassTint: "rgba(14, 22, 39, 0.74)",
    glassBorder: "rgba(242, 240, 234, 0.14)",
    glassBorderTop: "rgba(242, 240, 234, 0.28)",
    slideBackground: "radial-gradient(ellipse at 88% -12%, rgba(52, 86, 150, 0.34), transparent 56%), radial-gradient(ellipse at 6% 118%, rgba(255, 179, 33, 0.1), transparent 54%)",
    fontDisplay: 'var(--font-overpass), "Overpass", system-ui, sans-serif',
    fontBody: 'var(--font-atkinson), "Atkinson Hyperlegible", system-ui, sans-serif',
    fontMono: 'var(--font-overpass-mono), "Overpass Mono", Consolas, monospace',
    fontLabel: 'var(--font-overpass-mono), "Overpass Mono", Consolas, monospace',
    headingWeight: 850,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0",
    radius: "0.9rem",
    borderWidth: "1px",
    slideMaxWidth: "80rem",
    displayScale: 1.1,
    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.6s",
    entranceStyle: "slide",
    ornamentStyle: "none",
    ornamentColor: "var(--accent)",
    toneNightSurface: "#070b14",
    toneNightInk: "#f2f0ea",
    tonePaperSurface: "#101a2d",
    tonePaperInk: "#f2f0ea",
    toneSunSurface: "#ffe52b",
    toneSunInk: "#10131c",
    staIce: "#132038",
    staFocus: "#1b2a47",
    staWarm: "#171d2e",
    signature: "linjen",
  },
  elever_solkraft: {
    bg: "#FFE52B", bgSurface: "#FFFDF1", text: "#19190F", textMuted: "#56502D",
    accent: "#665100", accentInk: "#665100", accentBright: "#FFB321", accentSecondary: "#B5A2FF", accentPositive: "#B6ED8E",
    accentGlow: "rgba(255,179,33,.3)", accentDim: "rgba(25,25,15,.08)", accentAlert: "#CB3524",
    fontDisplay: "var(--font-archivo)", fontBody: "var(--font-manrope)", fontMono: "var(--font-jetbrains-mono)",
    headingWeight: 900, headingTracking: "-.065em", headingCase: "normal", bodyTracking: "-.025em",
    radius: "1.5rem", borderWidth: "2px", slideMaxWidth: "80rem", displayScale: 1.25,
    motionEase: "cubic-bezier(.16,1,.3,1)", motionDuration: ".65s", entranceStyle: "snap",
    ornamentStyle: "none", ornamentColor: "var(--text)",
  },
  glas: {
    scenePalette: "authored",
    bg: "#f2f0e9", bgSurface: "#e9e5da", bgElevated: "#ffffff",
    text: "#131311", textMuted: "#45443c",
    accent: "#243CFF", accentInk: "#243CFF", accentBright: "#BCD3F4",
    accentGlow: "rgba(36,60,255,.14)", accentDim: "rgba(36,60,255,.10)", accentAlert: "#b92016",
    fontDisplay: "var(--font-archivo)", fontBody: "var(--font-familjen-grotesk)", fontMono: "var(--font-ibm-plex-mono)",
    headingWeight: 700, headingTracking: "-0.005em", headingCase: "uppercase", bodyTracking: "0",
    radius: "1rem", borderWidth: "1px", slideMaxWidth: "80rem", displayScale: 1.3,
    motionEase: "cubic-bezier(0.16,1,0.3,1)", motionDuration: ".5s", entranceStyle: "slide",
    ornamentStyle: "square", ornamentColor: "var(--accent)",
    glassTint: "rgba(36,60,255,.05)", glassBorder: "rgba(255,255,255,.65)", glassBorderTop: "rgba(255,255,255,.9)",
  },
  /**
   * DEFAULT - Modern elegans.
   * Fraunces (serif) + Inter. Varm mörk palett med cyan accent.
   * Precision och balans.
   */
  default: {
    bg: "#0b0c0f",
    bgSurface: "#14161b",
    text: "#ece9e2",
    textMuted: "#8a8a92",
    accent: "#06b6d4",
    accentGlow: "rgba(6, 182, 212, 0.35)",
    accentDim: "rgba(6, 182, 212, 0.15)",

    fontDisplay: '"Fraunces", "Iowan Old Style", "Palatino", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", "Consolas", monospace',
    headingWeight: 600,
    headingTracking: "-0.025em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0.75rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.6s",
    entranceStyle: "slide",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * SUNSET - Värme, melankoli, berättande.
   * Playfair Display för rubriker, Manrope för text.
   * Mjuka former, varmare färgskala.
   */
  sunset: {
    bg: "#1a0a14",
    bgSurface: "#251320",
    text: "#f4e8dc",
    textMuted: "#a09290",
    accent: "#ff6b6b",
    accentGlow: "rgba(255, 107, 107, 0.4)",
    accentDim: "rgba(255, 107, 107, 0.15)",

    fontDisplay: '"Playfair Display", "Georgia", serif',
    fontBody: '"Manrope", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 700,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "1rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.7s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * EDITORIAL - Som en fin tidskrift. Serif genomgående.
   * Instrument Serif + Inter. Lugn, vågad, självklar.
   */
  editorial: {
    bg: "#14120e",
    bgSurface: "#1d1a14",
    text: "#f2ede0",
    textMuted: "#958e7a",
    accent: "#d4a24c",
    accentGlow: "rgba(212, 162, 76, 0.35)",
    accentDim: "rgba(212, 162, 76, 0.15)",

    fontDisplay: '"Instrument Serif", "Iowan Old Style", "Didot", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 400,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0.01em",

    radius: "0.25rem",
    borderWidth: "1px",
    slideMaxWidth: "68rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * MINIMAL - Ljust, lugnt, svart och vitt.
   * Maxentioness. Inget dekorativt.
   */
  minimal: {
    bg: "#f8f7f4",
    bgSurface: "#ebeae7",
    text: "#0a0a0a",
    textMuted: "#666666",
    accent: "#0a0a0a",
    accentGlow: "rgba(0, 0, 0, 0.1)",
    accentDim: "rgba(0, 0, 0, 0.08)",

    fontDisplay: '"Inter", system-ui, sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 700,
    headingTracking: "-0.03em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0.25rem",
    borderWidth: "1px",
    slideMaxWidth: "64rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.4s",
    entranceStyle: "fade",

    ornamentStyle: "none",
    ornamentColor: "var(--text)",
  },

  /**
   * RETRO_FUTURISM - 80-tals synthwave möter sci-fi.
   * Space Grotesk + mono, glow överallt, magenta/cyan.
   */
  retro_futurism: {
    bg: "#07051a",
    bgSurface: "#0f0a2a",
    text: "#e8e6ff",
    textMuted: "#8a85b8",
    accent: "#ff2a6d",
    accentGlow: "rgba(255, 42, 109, 0.5)",
    accentDim: "rgba(255, 42, 109, 0.18)",

    fontDisplay: '"Space Grotesk", "Inter", sans-serif',
    fontBody: '"Space Grotesk", "Inter", sans-serif',
    fontMono: '"JetBrains Mono", "Courier New", monospace',
    headingWeight: 700,
    headingTracking: "-0.02em",
    headingCase: "uppercase",
    bodyTracking: "0.02em",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    motionDuration: "0.3s",
    entranceStyle: "snap",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /**
   * KONJAK - Editorial, fotografisk, jordnära.
   * Byggd för en variant av AI-grundkursen: konjak-accent,
   * tegel för THE moment-text, djup salvia som sekundärt. Fungerar mot
   * de tre fotobakgrunderna (persika/salvia/karamell) + kräm + svart.
   */
  konjak: {
    bg: "#0a0908",
    bgSurface: "#1a1512",
    text: "#f7f1e6",
    textMuted: "rgba(247, 241, 230, 0.65)",
    accent: "#b4763a",
    accentGlow: "rgba(180, 118, 58, 0.35)",
    accentDim: "rgba(180, 118, 58, 0.15)",

    fontDisplay: '"Fraunces", "Iowan Old Style", "Palatino", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 500,
    headingTracking: "-0.025em",
    headingCase: "normal",
    bodyTracking: "0.01em",

    radius: "0.5rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.7s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * ARKADNATT - Synthwave möter NES. Mörk lila, neon-magenta och cyan.
   * Bungee för rubriker (kantig, chunky), Space Grotesk för text.
   * Tänkt för mellanstadiet — wow-faktor utan att kännas 2018.
   */
  arkadnatt: {
    bg: "#0E0726",
    bgSurface: "#1A0E3D",
    text: "#F4F0FF",
    textMuted: "rgba(244, 240, 255, 0.62)",
    accent: "#FF2D87",
    accentGlow: "rgba(255, 45, 135, 0.55)",
    accentDim: "rgba(255, 45, 135, 0.18)",

    fontDisplay: '"Bungee", "Space Grotesk", sans-serif',
    fontBody: '"Space Grotesk", "Inter", sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 400,
    headingTracking: "0.01em",
    headingCase: "uppercase",
    bodyTracking: "0.01em",

    radius: "0",
    borderWidth: "3px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    motionDuration: "0.35s",
    entranceStyle: "snap",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /**
   * MEMPHIS_RISO - Memphis-design möter risograph. Cremfärgat papper,
   * mättade primärfärger, chunky display-typsnitt.
   * Bagel Fat One (rund, tjock) + Inter. Lekfullt, designmedvetet, inte babyish.
   */
  memphis_riso: {
    bg: "#F4ECD8",
    bgSurface: "#FFFFFF",
    text: "#1A1A1A",
    textMuted: "rgba(26, 26, 26, 0.65)",
    accent: "#FF4F8B",
    accentGlow: "rgba(255, 79, 139, 0.35)",
    accentDim: "rgba(255, 79, 139, 0.15)",

    fontDisplay: '"Bagel Fat One", "Bricolage Grotesque", sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 400,
    headingTracking: "-0.01em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "1.25rem",
    borderWidth: "3px",
    slideMaxWidth: "70rem",

    motionEase: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    motionDuration: "0.5s",
    entranceStyle: "scale",

    ornamentStyle: "dot",
    ornamentColor: "#2E5FFF",

    // Memphis-riso decorations — pink/blå offset-skuggor, chunky kanter
    titleShadow: "4px 4px 0 #FF4F8B",
    cardShadow: "5px 5px 0 #FF4F8B",
    cardShadowAlt: "5px 5px 0 #2E5FFF",
    cardBorder: "3px solid #1A1A1A",
  },

  /**
   * VHS_SKOLA - 90s edutainment. Chunky-mjuk display, varm teal,
   * orange-rött och kalkgul. Som "Carmen Sandiego" remixat 2026.
   * Bricolage Grotesque (mjuk-kantig display) + Inter.
   */
  vhs_skola: {
    bg: "#1B5560",
    bgSurface: "#0F3D45",
    text: "#FFF6E3",
    textMuted: "rgba(255, 246, 227, 0.68)",
    accent: "#FF5E3A",
    accentGlow: "rgba(255, 94, 58, 0.45)",
    accentDim: "rgba(255, 94, 58, 0.18)",

    fontDisplay: '"Bricolage Grotesque", "Inter", sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 800,
    headingTracking: "-0.025em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0.75rem",
    borderWidth: "3px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.55s",
    entranceStyle: "slide",

    ornamentStyle: "starburst",
    ornamentColor: "#FFD23F",
  },

  /**
   * RELATIONSKRITIK — Editorial bokform, varm cream med terrakotta och
   * signal-röd som tvåaccent-system.
   *
   * Byggt för "Från källkritik till relationskritik" — en
   * föreläsning (maj 2026, version 2). Disciplinerad palett med fem
   * färger: cream-papper, brungrå text, terrakotta för värme/relationer,
   * signal-röd ENDAST där något blottläggs (sykofant-svaret, ELEPHANT-
   * siffran, OpenAI-medgivandet, dark patterns), och en neutralgrå för
   * källhänvisningar.
   *
   * När rött dyker upp betyder det: nu blottlägger vi något. Publiken
   * läser det grammatiskt utan att Joel behöver förklara.
   *
   * Fraunces + Source Serif 4 från berattelser-temat — editorial bok-
   * känsla, ingen tech-deck-estetik.
   */
  relationskritik: {
    bg: "#F4EFE5",
    bgSurface: "#EBE4D5",
    text: "#1F1B17",
    textMuted: "#6B6660",
    accent: "#C77352",
    accentGlow: "rgba(199, 115, 82, 0.32)",
    accentDim: "rgba(199, 115, 82, 0.12)",
    accentAlert: "#E63946",

    fontDisplay: '"Fraunces", "Source Serif 4", Georgia, serif',
    fontBody: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    headingWeight: 500,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0.005em",

    radius: "0.25rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * BERATTELSER - Editorial varm dokumentär.
   *
   * Inspirerad av berattelser-fran-skolan.vercel.app — Joels eget projekt
   * med 615 berättelser från svensk skola. Fraunces display + Source Serif 4
   * body på varm beige (paper #faf6ee) med ember orange accent (#c2410c).
   * Inga skuggor, nästan inga rundningar, OpenType-features aktiva.
   *
   * För text-tunga slides, citat, fördjupande material. Inte tech-deck.
   * Lämpar sig för: AI-etik, AI-psykos-fall, forskningsreferenser,
   * tunga citat, ELEPHANT-typ data, bok-format-tänk.
   */
  berattelser: {
    bg: "#faf6ee",
    bgSurface: "#f3ecde",
    text: "#1a1814",
    textMuted: "#6b6155",
    accent: "#c2410c",
    accentGlow: "rgba(194, 65, 12, 0.28)",
    accentDim: "rgba(194, 65, 12, 0.12)",

    fontDisplay: '"Fraunces", "Source Serif 4", Georgia, serif',
    fontBody: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    headingWeight: 600,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0.25rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.5s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * CLAUDIA - Det paradoxalt intima i AI-vänner.
   *
   * Byggt för "AI-vänner"-föreläsningen (maj 2026).
   * Kall midnight blue som natthimmel mot ett samtalsfönster, electric
   * violet som accent — färgen är medvetet vald: violet ligger mellan
   * det varma och det kalla, mellan rött (kärlek) och blått (skärm).
   *
   * Instrument Serif ger tidskriftsmässig editorial-känsla — som om
   * texten pratar till dig som en bok. Brutalist 0.25rem radius —
   * inga mjuka kanter, inga säkerheter.
   *
   * Användningsfält: AI-vänner, AI-medvetande, sycophancy, parasociala
   * relationer, AI-psykos, dark patterns. Allt som handlar om vad som
   * händer när vi pratar med maskiner som om de vore människor.
   */
  midnatt: {
    bg: "#070818",
    bgSurface: "#0E1130",
    text: "#ECEDF5",
    textMuted: "#7D83A3",
    accent: "#C084FC",
    accentGlow: "rgba(192, 132, 252, 0.42)",
    accentDim: "rgba(192, 132, 252, 0.16)",

    fontDisplay: '"Instrument Serif", "Iowan Old Style", "Didot", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", "Courier New", monospace',
    headingWeight: 400,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0.01em",

    radius: "0.25rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.7s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * DARKAPPLE - Premium dark glass.
   * Inspirerat av Apple Liquid Glass (iOS/macOS 26). Två z-axel-nivåer
   * (recessed base + elevated glass-paneler), specular highlights,
   * subtle blue-violet tint som refrakterar mot bakgrund. Apple-spring
   * physics i motion. För tekniska/AI/premium-budskap där publiken
   * förväntar sig "app-känsla", inte "tutorial-glasmorphism".
   *
   * Använd backdrop-filter när du bygger glass-cards i templates.
   * Max 3 glass-lager per slide. Kräver något att refraktera mot —
   * antingen bild-bakgrund, gradient, eller particle-field.
   */
  nattglas: {
    bg: "#06070c",
    bgSurface: "#0f1118",
    bgElevated: "#181b26",
    text: "#e8eaf2",
    textMuted: "#8a91a5",
    accent: "#7aa8ff",
    accentGlow: "rgba(122, 168, 255, 0.45)",
    accentDim: "rgba(122, 168, 255, 0.12)",
    accentAlert: "#ff5c7a",
    glassTint: "rgba(122, 168, 255, 0.06)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassBorderTop: "rgba(255, 255, 255, 0.18)",

    fontDisplay:
      '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontBody:
      '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontMono: '"SF Mono", "JetBrains Mono", "Menlo", monospace',
    headingWeight: 500,
    headingTracking: "-0.025em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "1.125rem",
    borderWidth: "1px",
    slideMaxWidth: "76rem",

    motionEase: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * FOREST - Grön, lugn, naturinspirerad.
   */
  forest: {
    bg: "#0a120c",
    bgSurface: "#121d14",
    text: "#e8ede4",
    textMuted: "#89958c",
    accent: "#7ed957",
    accentGlow: "rgba(126, 217, 87, 0.35)",
    accentDim: "rgba(126, 217, 87, 0.15)",

    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
    headingWeight: 500,
    headingTracking: "-0.02em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0.5rem",
    borderWidth: "1px",
    slideMaxWidth: "72rem",

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.7s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * DAYLIGHT APPLE — ljus, projektor-säker tvilling till nattglas.
   *
   * darkapples bokstavliga ljus-läge: sval pappersvit (#fafbfd), frostat
   * cool-grått glas med skarpa hårfina kanter, en vårgrön som lever ljus i
   * fyllnad och mörk i bläck, samt ett varmt gult dagsljus i ambient-lagret.
   * Samma SF Pro + Inter, samma geometri/motion — bara inverterat. Byggd för
   * svaga projektorer: mörkt bläck (#10141c) på ljus botten ger ~18:1.
   *
   * Glas inverterat från mörk refraktion till ljus frostning: cool-grå-vit
   * veil som läser som ett eget plan. Mörk hårfin kant (inte vit), mjuk
   * cool-tonad skugga (aldrig tung svart), brightness < 100% så panelen
   * tätnar mot bakgrunden. Recept i globals.css ([data-theme="dagsljus"])
   * + GlassDecorations via --glass-card-*.
   *
   * accent (#15692b mörkgrön) klarar 6.6:1 som text/linje. accentBright
   * (#34c759 Apple-grön) ENDAST fyllnad/ornament. Gult (#ffd43b) är ENBART
   * atmosfär (ambient orbs), aldrig text/linje. accentAlert (#c42420).
   */
  dagsljus: {
    bg: "#fafbfd",
    bgSurface: "#f1f3f8",
    bgElevated: "#e9edf4",
    text: "#10141c",
    textMuted: "#565e70",
    accent: "#15692b",
    accentInk: "#15692b",
    accentBright: "#34c759",
    accentGlow: "rgba(52, 199, 89, 0.30)",
    accentDim: "rgba(52, 199, 89, 0.12)",
    accentAlert: "#c42420",
    glassTint: "rgba(120, 135, 160, 0.10)",
    glassBorder: "rgba(16, 20, 28, 0.12)",
    glassBorderTop: "rgba(255, 255, 255, 0.85)",

    fontDisplay:
      '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontBody:
      '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontMono: '"SF Mono", "JetBrains Mono", "Menlo", monospace',
    headingWeight: 500,
    headingTracking: "-0.025em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "1.125rem",
    borderWidth: "1px",
    slideMaxWidth: "76rem",

    motionEase: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * JOELSAI — sajtens identitet på duk, maxad.
   *
   * Papper, bläck och EN elblå signal. Archivo kondenserad versal i
   * affischgrad (avgångstavlan), IBM Plex Mono som kicker-röst, Familjen
   * Grotesk i brödtext, rödpennan (#b92016) som varningsaccent. Inga
   * rundningar, 2 px bläckkanter, kobaltskugga i stället för glas.
   * Rutnät, filmkorn och blå rök ligger i globals.css.
   *
   * Tokens hämtade ur webbplatsens designfil (ljust läge)
   * 2026-09-02, byggt för en lärarkurs. Fonterna laddas i app/layout.tsx —
   * Archivo MED breddaxel, annars faller font-stretch tyst.
   */
  kobolt: {
    bg: "#f2f0e9",
    bgSurface: "#e9e5da",
    bgElevated: "#ffffff",
    text: "#131311",
    textMuted: "#45443c",
    accent: "#1533ff",
    accentInk: "#1533ff",
    accentBright: "#6a8aff",
    /* Låg glöd med flit: på papper är glöd smuts, inte ljus. */
    accentGlow: "rgba(21, 51, 255, 0.14)",
    accentDim: "rgba(21, 51, 255, 0.10)",
    accentAlert: "#b92016",
    glassTint: "rgba(21, 51, 255, 0.05)",
    glassBorder: "rgba(19, 19, 17, 0.9)",
    glassBorderTop: "rgba(19, 19, 17, 0.9)",
    cardBorder: "2px solid #131311",
    cardShadow: "8px 8px 0 #1533ff",
    cardShadowAlt: "8px 8px 0 #b92016",

    fontDisplay:
      '"Archivo", Bahnschrift, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    fontBody: '"Familjen Grotesk", "Archivo", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", "Consolas", monospace',
    headingWeight: 700,
    headingTracking: "-0.005em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.3,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.5s",
    entranceStyle: "slide",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /**
   * JOELSAI · MÖRK — samma identitet i sajtens mörka läge.
   * Ark och bläck byter plats, signalen ljusnar till #6a8aff så att den
   * bär som text mot nästan svart. Kobaltskuggan behåller den djupa
   * #1533ff — det är den som gör att korten läses som samma system.
   */
  kobolt_natt: {
    bg: "#0f0f0e",
    bgSurface: "#1a1a18",
    bgElevated: "#1c1e22",
    text: "#f2f0e9",
    textMuted: "#aeaba1",
    accent: "#6a8aff",
    accentInk: "#8fa8ff",
    accentBright: "#1533ff",
    accentGlow: "rgba(106, 138, 255, 0.40)",
    accentDim: "rgba(106, 138, 255, 0.14)",
    accentAlert: "#e8483a",
    glassTint: "rgba(106, 138, 255, 0.06)",
    glassBorder: "rgba(242, 240, 233, 0.85)",
    glassBorderTop: "rgba(242, 240, 233, 0.85)",
    cardBorder: "2px solid #f2f0e9",
    cardShadow: "8px 8px 0 #1533ff",
    cardShadowAlt: "8px 8px 0 #e8483a",

    fontDisplay:
      '"Archivo", Bahnschrift, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    fontBody: '"Familjen Grotesk", "Archivo", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", "Consolas", monospace',
    headingWeight: 700,
    headingTracking: "-0.005em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.3,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.5s",
    entranceStyle: "slide",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /**
   * TIOPOTENSER (”Tiopotenser”) — temaveckan
   * Rädda världen med AI (30 september 2026). Föreläsningen zoomar i tiopotenser
   * efter Charles och Ray Eames Powers of Ten (1977, gjord för IBM): rymdsvart
   * grund, varmvit text, människans ljus i bärnsten (accentBright, samma betydelse
   * som i Rösten och Linjen), AI i kallt cyan (accentSecondary) och ljuset/glöden
   * varmvitt (accent). Rött bara för blottläggning. Schibsted Grotesk bär rubrik
   * och läsning; IBM Plex Mono skalmätaren och etiketterna (en blinkning åt IBM).
   * Världen ritas av `skala` i Stage-motorn (templates/stage/skala.tsx).
   * Ligger efter kobolt_natt (inget deck) och före fyrfärgen, så att T går till
   * Fyrfärg och inget annat decks T ändras. Shift+T tillbaka.
   */
  tiopotenser: {
    bg: "#05070a",
    bgSurface: "#10141b",
    bgElevated: "#171c25",
    text: "#f3efe7",
    textMuted: "#a6abb5",
    accent: "#ffe0a3",
    accentInk: "#ffe0a3",
    accentBright: "#ffb547",
    accentSecondary: "#6ad4ff",
    accentPositive: "#6ad4ff",
    accentGlow: "rgba(255, 213, 140, 0.28)",
    accentDim: "rgba(243, 239, 231, 0.07)",
    accentAlert: "#ff5a5f",
    glassTint: "rgba(16, 20, 27, 0.72)",
    glassBorder: "rgba(243, 239, 231, 0.14)",
    glassBorderTop: "rgba(243, 239, 231, 0.28)",
    slideBackground: "radial-gradient(ellipse at 50% 120%, rgba(106, 212, 255, 0.07), transparent 60%)",

    fontDisplay: 'var(--font-schibsted), "Schibsted Grotesk", system-ui, sans-serif',
    fontBody: 'var(--font-schibsted), "Schibsted Grotesk", system-ui, sans-serif',
    fontMono: 'var(--font-ibm-plex-mono), "IBM Plex Mono", Consolas, monospace',
    fontLabel: 'var(--font-ibm-plex-mono), "IBM Plex Mono", Consolas, monospace',
    headingWeight: 760,
    headingTracking: "-0.035em",
    headingCase: "normal",
    bodyTracking: "-0.005em",

    radius: "0.55rem",
    borderWidth: "1px",
    slideMaxWidth: "80rem",
    displayScale: 1.1,

    motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDuration: "0.7s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /**
   * FYRFÄRG (2026-09-03). Samma skelett som kobolt
   * (papper, bläck, Archivo i versaler, 2 px kant, hård offsetskugga) men
   * kobalten är borta. I stället: fyra poppiga pastellregister, en per lins i
   * kartan (withSlideBg register="gul|mint|rosa|lila", plus "tavla" för det
   * mörka), och EN signalfärg — rödorange — för motståndsögonblicken. På
   * papper är signalen accenten; skuggorna går i lila och rosa.
   */
  fyrfarg: {
    bg: "#f2f0e9",
    bgSurface: "#e9e5da",
    bgElevated: "#ffffff",
    text: "#131311",
    textMuted: "#45443c",
    accent: "#ff3b1f",
    accentInk: "#e0300f",
    accentBright: "#ff8bb5",
    accentGlow: "rgba(255, 59, 31, 0.14)",
    accentDim: "rgba(255, 59, 31, 0.10)",
    accentAlert: "#b92016",
    glassTint: "rgba(255, 59, 31, 0.05)",
    glassBorder: "rgba(19, 19, 17, 0.9)",
    glassBorderTop: "rgba(19, 19, 17, 0.9)",
    cardBorder: "2px solid #131311",
    cardShadow: "8px 8px 0 #a48cff",
    cardShadowAlt: "8px 8px 0 #ff8bb5",

    fontDisplay:
      '"Archivo", Bahnschrift, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    fontBody: '"Familjen Grotesk", "Archivo", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", "Consolas", monospace',
    headingWeight: 700,
    headingTracking: "-0.005em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.3,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.5s",
    entranceStyle: "slide",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },
  /* betong — tredje formspråket (2026-09-04).
     Arrangören tyckte fyrfärgen blev för barnslig. Samma skelett som kobolt
     — Archivo i versaler, mono-etiketter, hård kant — men affischen i
     stället för leken: obestruket papper, svartvita rasterfoton av betong,
     bläck, EN färg (signalrött) och en orange sol som bara får finnas när
     något landar. Register i withSlideBg: betong · rott · sol · tavla.
     accentAlert = accent här: rött ÄR blottläggningen. */
  betong: {
    bg: "#e7e2d6",
    bgSurface: "#ddd7c9",
    bgElevated: "#f0ece2",
    text: "#121210",
    textMuted: "#4a4841",
    accent: "#e3321b",
    accentInk: "#c22a15",
    accentBright: "#e8912f",
    accentGlow: "rgba(227, 50, 27, 0.12)",
    accentDim: "rgba(18, 18, 16, 0.08)",
    accentAlert: "#e3321b",
    glassTint: "rgba(18, 18, 16, 0.04)",
    glassBorder: "rgba(18, 18, 16, 0.9)",
    glassBorderTop: "rgba(18, 18, 16, 0.9)",
    cardBorder: "2px solid #121210",
    cardShadow: "8px 8px 0 #121210",
    cardShadowAlt: "8px 8px 0 #e3321b",

    fontDisplay:
      '"Archivo", Bahnschrift, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    fontBody: '"Familjen Grotesk", "Archivo", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", "Consolas", monospace',
    headingWeight: 900,
    headingTracking: "-0.02em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.35,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.5s",
    entranceStyle: "slide",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /* betong_natt — "Vem skrev din kurs?" (2026-09-04). Betongen efter
     mörkrets inbrott: samma skelett, samma geometri, samma papper — men
     inverterat och kylt. Marken är nästan svart betong, papperet blir texten,
     och strukturen bärs av en kall signalcyan. Rött är kvar men BARA som larm,
     och solen är kvar som den enda varma saken i ett kallt deck.
     Registerförskjutningen (markStyle="skift") ger markorden ett rött och ett
     cyanfärgat spöke — feltryck som läser som glitch utan att lämna trycket.
     Register i withSlideBg: signal · larm · betong · sol · tavla. */
  betong_natt: {
    bg: "#0f1113",
    bgSurface: "#171a1d",
    bgElevated: "#1e2226",
    text: "#e7e2d6",
    textMuted: "#8f8b81",
    accent: "#2fd8e0",
    accentInk: "#2fd8e0",
    accentBright: "#e8912f",
    accentGlow: "rgba(47, 216, 224, 0.16)",
    accentDim: "rgba(231, 226, 214, 0.10)",
    accentAlert: "#ff4a2e",
    glassTint: "rgba(231, 226, 214, 0.05)",
    glassBorder: "rgba(231, 226, 214, 0.9)",
    glassBorderTop: "rgba(231, 226, 214, 0.9)",
    cardBorder: "2px solid #e7e2d6",
    cardShadow: "8px 8px 0 #2fd8e0",
    cardShadowAlt: "8px 8px 0 #ff4a2e",

    fontDisplay:
      '"Archivo", Bahnschrift, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    fontBody: '"Familjen Grotesk", "Archivo", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", "Consolas", monospace',
    headingWeight: 900,
    headingTracking: "-0.02em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.35,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.5s",
    entranceStyle: "slide",

    ornamentStyle: "square",
    ornamentColor: "var(--accent)",
  },

  /* protokoll — "Vem skrev din kurs?" v2 (2026-09-23). Nattbetongen
     renad till en filmisk titelsekvens: nästan svart, papper som text, en
     kall signal. Decket har en neutral röst, protokollets, och två till:
     fakta i mono (tidsstämplar, källor, siffror) och berättelse i kursiv
     serif (citat, slagord). Strukturen bärs av Archivo. Rött bara där något
     blottläggs; solen bara i gryningen och i överstrykningen. Nära svarta
     ytor skiljs åt med linjer, inte ton, så att de håller på projektor. */
  protokoll: {
    bg: "#0a0b0c",
    bgSurface: "#131517",
    bgElevated: "#1b1e21",
    text: "#ece6d8",
    textMuted: "#9a948a",
    accent: "#2fd8e0",
    accentInk: "#2fd8e0",
    accentBright: "#f0a23a",
    accentGlow: "rgba(47, 216, 224, 0.14)",
    accentDim: "rgba(236, 230, 216, 0.08)",
    accentAlert: "#ff4a2e",
    glassTint: "rgba(236, 230, 216, 0.04)",
    glassBorder: "rgba(236, 230, 216, 0.22)",
    glassBorderTop: "rgba(236, 230, 216, 0.34)",

    fontDisplay:
      'var(--font-archivo), "Archivo", "Arial Narrow", Arial, sans-serif',
    fontBody: 'var(--font-familjen-grotesk), "Familjen Grotesk", system-ui, sans-serif',
    fontMono: 'var(--font-ibm-plex-mono), "IBM Plex Mono", Consolas, monospace',
    fontQuote: 'var(--font-newsreader), "Newsreader", Georgia, serif',
    headingWeight: 800,
    headingTracking: "-0.035em",
    headingCase: "normal",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "2px",
    slideMaxWidth: "80rem",
    displayScale: 1.2,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent)",
  },

  /* arkana — "Vem skrev din kurs?" v2, grafisk profil godkänd av Joel
     23 september 2026: ljus och betong. Berättelser och arketyper möter
     framtid. Berättelserna är ljus: ljuspunkter, glaskort, stjärnor och
     Newsreader-kursiv. Strukturen och makten är betong: tung smal Archivo i
     versaler som får gå utanför bildytan, etikettplåtar, block med brädgjuten
     yta. Framtiden är gryningshorisonten. Fakta i IBM Plex Mono. Isblått =
     maskin, fakta och instrument; guld = berättelse, kort och stjärnbilder;
     violett bara i horisontens djup; rött bara där något döljs eller
     blottläggs. Scenerna ritar stjärnor och horisont när --scenery är 1. */
  arkana: {
    bg: "#04050b",
    bgSurface: "#0b1022",
    bgElevated: "#141a33",
    text: "#ece6d8",
    textMuted: "#8b90a6",
    accent: "#9fd0ff",
    accentInk: "#9fd0ff",
    accentBright: "#e8bd72",
    accentSecondary: "#7a5cff",
    accentGlow: "rgba(122, 92, 255, 0.26)",
    accentDim: "rgba(236, 230, 216, 0.07)",
    accentAlert: "#ff5a3c",
    glassTint: "rgba(28, 34, 62, 0.72)",
    glassBorder: "rgba(236, 230, 216, 0.16)",
    glassBorderTop: "rgba(236, 230, 216, 0.28)",

    fontDisplay: 'var(--font-archivo), "Archivo", "Arial Narrow", Arial, sans-serif',
    fontBody: 'var(--font-archivo), "Archivo", system-ui, sans-serif',
    fontMono: 'var(--font-ibm-plex-mono), "IBM Plex Mono", Consolas, monospace',
    fontQuote: 'var(--font-newsreader), "Newsreader", Georgia, serif',
    fontLabel: 'var(--font-archivo), "Archivo", system-ui, sans-serif',
    labelStretch: "125%",
    labelPlate: true,
    displayTrack: 0.4,
    displayCondense: 0.8,
    scenery: "space",
    headingWeight: 900,
    headingWeightText: 700,
    headingTracking: "-0.02em",
    headingCase: "uppercase",
    bodyTracking: "0",

    radius: "0",
    borderWidth: "1px",
    slideMaxWidth: "80rem",
    displayScale: 1.5,

    motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    motionDuration: "0.6s",
    entranceStyle: "fade",

    ornamentStyle: "line",
    ornamentColor: "var(--accent-bright)",
  },
};

/**
 * rost (”Rösten”), vald av Joel 23 september 2026 för
 * ”Språket, tänkandet & AI”: språket börjar som röst. Natt i plommon; människans
 * röst i bärnsten (accentBright, Lecture-scenernas --human), maskinens röst i mint
 * (accentSecondary, Lecture-scenernas --ai), violett som bärande fält. Bricolage Grotesque
 * för rubriker, Atkinson Hyperlegible för läsning (gjord för läsbarhet), JetBrains
 * Mono för tidskoder. Mörkt tema: tonfärgerna håller natt och papper mörka och
 * gör sol till bärnstensaffischer med mörk text. Signaturen voice låter scenerna
 * rita ord av ljudstaplar. Ligger sist i registret så att T går till Solkraft.
 */
themes.rost = {
  bg: "#15111f",
  bgSurface: "#211a30",
  bgElevated: "#2c2340",
  text: "#f6f0e6",
  textMuted: "#b1a8c0",
  accent: "#ffb547",
  accentInk: "#ffc873",
  accentBright: "#ffb547",
  accentSecondary: "#5fe0c2",
  accentPositive: "#5fe0c2",
  accentGlow: "rgba(255, 181, 71, 0.24)",
  accentDim: "rgba(246, 240, 230, 0.07)",
  accentAlert: "#ff5c6a",
  glassTint: "rgba(33, 26, 48, 0.72)",
  glassBorder: "rgba(246, 240, 230, 0.14)",
  glassBorderTop: "rgba(246, 240, 230, 0.26)",
  slideBackground: "radial-gradient(ellipse at 12% 110%, rgba(255,138,61,.18), transparent 55%), radial-gradient(ellipse at 95% -10%, rgba(107,79,163,.26), transparent 55%)",

  fontDisplay: 'var(--font-bricolage-grotesque), "Bricolage Grotesque", system-ui, sans-serif',
  fontBody: 'var(--font-atkinson), "Atkinson Hyperlegible", system-ui, sans-serif',
  fontMono: 'var(--font-jetbrains-mono), "JetBrains Mono", Consolas, monospace',
  headingWeight: 800,
  headingTracking: "-0.035em",
  headingCase: "normal",
  bodyTracking: "0",

  radius: "0.9rem",
  borderWidth: "1px",
  slideMaxWidth: "80rem",
  displayScale: 1.1,

  motionEase: "cubic-bezier(0.16, 1, 0.3, 1)",
  motionDuration: "0.65s",
  entranceStyle: "fade",

  ornamentStyle: "none",
  ornamentColor: "var(--accent-bright)",

  toneNightSurface: "#110d19",
  toneNightInk: "#f6f0e6",
  tonePaperSurface: "#1d1729",
  tonePaperInk: "#f6f0e6",
  toneSunSurface: "#ffb547",
  toneSunInk: "#1a1222",
  staIce: "#261d37",
  staFocus: "#3a2c52",
  staWarm: "#2a2139",
  signature: "voice",
};

export function getTheme(name?: string): ThemeTokens {
  if (!name) return themes.default;
  return themes[name] ?? themes.default;
}

/** Legible ink on a theme's solid accent, including bright pink/cyan themes. */
function accentForeground(accent: string): string {
  const hex = accent.replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(hex)) return "#000000";
  const linear = [0, 2, 4].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05)
    ? "#000000" : "#ffffff";
}

/** True när bakgrunden är mörk nog för att accentBright ska fungera som text. */
function isDarkBackground(bg: string): boolean {
  const hex = bg.replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(hex)) return true;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return r * 0.2126 + g * 0.7152 + b * 0.0722 < 0.4;
}

/**
 * Konverterar tema-tokens till CSS-variabler som kan injiceras via style-attribut.
 */
export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  // Authored colours are fallbacks in the illustration, so the glass theme keeps
  // its approved scene variations. Every other theme supplies all roles here.
  // `initial` resets a custom property to its guaranteed-invalid value, activating
  // the local fallback even when a different theme is inherited from an ancestor.
  const scene = (value: string) => theme.scenePalette === "authored" ? "initial" : value;
  return {
    "--horizon-expression": theme.horizonExpression ?? "classic",
    "--theme-slide-background": theme.slideBackground ?? "none",
    /* Tonfärger och signatur: `initial` när temat saknar dem, så att scenernas
       reservvärden gäller även om ett annat tema ligger längre upp i trädet. */
    "--tone-night-surface": theme.toneNightSurface ?? "initial",
    "--tone-night-ink": theme.toneNightInk ?? "initial",
    "--tone-paper-surface": theme.tonePaperSurface ?? "initial",
    "--tone-paper-ink": theme.tonePaperInk ?? "initial",
    "--tone-sun-surface": theme.toneSunSurface ?? "initial",
    "--tone-sun-ink": theme.toneSunInk ?? "initial",
    "--signature": theme.signature ?? "none",
    "--stage-world": theme.stageWorld ?? "vattern",
    "--sta-paper": scene(theme.bg),
    "--sta-surface": scene(theme.bgElevated ?? theme.bgSurface),
    "--sta-ink": scene(theme.text),
    "--sta-muted": scene(theme.textMuted),
    "--sta-accent": scene(theme.accent),
    "--sta-on-accent": scene(accentForeground(theme.accent)),
    "--sta-ice": scene(theme.staIce ?? `color-mix(in srgb, ${theme.accent} 18%, ${theme.bg})`),
    "--sta-focus": scene(theme.staFocus ?? `color-mix(in srgb, ${theme.accent} 24%, ${theme.bgElevated ?? theme.bgSurface})`),
    "--sta-warm": scene(theme.staWarm ?? `color-mix(in srgb, ${theme.accent} 12%, ${theme.bgSurface})`),
    "--sta-alert": scene(theme.accentAlert ?? "#E63946"),
    "--sta-shadow": scene("#000000"),
    // Färger
    "--bg": theme.bg,
    "--bg-surface": theme.bgSurface,
    "--text": theme.text,
    "--text-muted": theme.textMuted,
    "--accent": theme.accent,
    "--accent-glow": theme.accentGlow,
    "--accent-dim": theme.accentDim,
    "--accent-alert": theme.accentAlert ?? "#E63946",
    "--accent-ink": theme.accentInk ?? theme.accent,
    "--accent-bright": theme.accentBright ?? theme.accent,
    "--on-accent-bright": accentForeground(theme.accentBright ?? theme.accent),
    /* accentBright som text bara på mörk bakgrund; på ljus faller den tillbaka
       på accentInk, som är gjord för text där. */
    "--accent-bright-text": isDarkBackground(theme.bg) ? (theme.accentBright ?? theme.accent) : (theme.accentInk ?? theme.accent),
    "--accent-secondary": theme.accentSecondary ?? theme.accentBright ?? theme.accent,
    "--on-accent-secondary": accentForeground(theme.accentSecondary ?? theme.accentBright ?? theme.accent),
    "--accent-positive": theme.accentPositive ?? theme.accentBright ?? theme.accent,

    // Typografi
    "--font-display": theme.fontDisplay,
    "--font-body": theme.fontBody,
    "--font-mono": theme.fontMono,
    "--font-quote": theme.fontQuote ?? theme.fontDisplay,
    "--font-label": theme.fontLabel ?? theme.fontMono,
    "--label-stretch": theme.labelStretch ?? "100%",
    "--display-track": String(theme.displayTrack ?? 1),
    "--display-condense": String(theme.displayCondense ?? 1),
    "--heading-weight-text": String(theme.headingWeightText ?? theme.headingWeight),
    "--plate": theme.labelPlate ? "1" : "0",
    "--scenery": theme.scenery === "space" ? "1" : "0",
    "--heading-weight": String(theme.headingWeight),
    "--heading-tracking": theme.headingTracking,
    "--heading-case": theme.headingCase,
    "--body-tracking": theme.bodyTracking,

    // Geometri
    "--radius": theme.radius,
    "--border-width": theme.borderWidth,
    "--slide-max-width": theme.slideMaxWidth,
    "--display-scale": String(theme.displayScale ?? 1),

    // Motion
    "--motion-ease": theme.motionEase,
    "--motion-duration": theme.motionDuration,

    // Ornament
    "--ornament-color": theme.ornamentColor,

    // Decoration system (memphis-riso och andra uttalade stilar)
    "--title-shadow": theme.titleShadow ?? "none",
    "--card-shadow": theme.cardShadow ?? "none",
    "--card-shadow-alt": theme.cardShadowAlt ?? "none",
    "--card-border": theme.cardBorder ?? "none",

    // Glass system (nattglas och framtida liquid-glass-teman)
    "--bg-elevated": theme.bgElevated ?? theme.bgSurface,
    "--glass-tint": theme.glassTint ?? "rgba(255,255,255,0.03)",
    "--glass-border": theme.glassBorder ?? "rgba(255,255,255,0.08)",
    "--glass-border-top": theme.glassBorderTop ?? "rgba(255,255,255,0.18)",
  };
}
