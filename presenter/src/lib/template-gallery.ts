/**
 * Komponentgalleriet — hur mallarna är sorterade när man väljer en ny slide.
 *
 * Den gamla väljaren listade bara de mallar som har ett handskrivet schema
 * (142 st) som namn + en rad text. Decken använder över 460 mallar, och de
 * vanligaste — HookStatement används 300 gånger — gick inte ens att välja.
 * Galleriet utgår därför från vad som faktiskt ANVÄNDS i Joels föreläsningar,
 * visar varje mall med en riktig slide som exempel, och delar upp dem i
 * familjer efter vad de gör i en föreläsning.
 *
 * Familjerna bestäms i tre steg: uttryckliga listor för de mallar vi känner,
 * sedan namnmönster, sist "Fler modeller". Det blir inte perfekt för 460
 * namn — sökningen går alltid över allt, så en mall i fel familj går ändå att
 * hitta. Modulen är ren.
 */

export type FamilyId =
  | "oppna"
  | "avdelare"
  | "stora-ord"
  | "citat"
  | "listor"
  | "jamfor"
  | "siffror"
  | "chatt"
  | "media"
  | "ai"
  | "pedagogik"
  | "publik"
  | "scener"
  | "modeller";

export interface Family {
  id: FamilyId;
  label: string;
  /** Vad familjen gör i en föreläsning — visas under rubriken. */
  blurb: string;
}

export const FAMILIES: Family[] = [
  { id: "stora-ord", label: "Stora ord", blurb: "En tanke som får hela ytan: påståenden, vändningar, definitioner." },
  { id: "avdelare", label: "Avdelare", blurb: "Andningspaus mellan akter." },
  { id: "citat", label: "Citat och röster", blurb: "Någon annans ord: forskare, elever, böcker." },
  { id: "listor", label: "Listor och steg", blurb: "Punkter, processer och förlopp som byggs upp klick för klick." },
  { id: "jamfor", label: "Jämförelser", blurb: "Två sidor, före och efter, det ena mot det andra." },
  { id: "siffror", label: "Siffror och diagram", blurb: "Statistik, kurvor och evidens." },
  { id: "chatt", label: "Chatt och prompt", blurb: "Samtal med AI: prompt först, svar på nästa klick." },
  { id: "media", label: "Bild, film och ljud", blurb: "När bilden eller klippet är poängen." },
  { id: "ai", label: "Så fungerar AI", blurb: "Mekanik, bias, fejk och agenter — förklarat i bild." },
  { id: "pedagogik", label: "Pedagogiska modeller", blurb: "Jag–AI–Jag, SAMR, Bloom, linser och roller." },
  { id: "publik", label: "Publik och övning", blurb: "Frågor, omröstningar, reflektion och överlämning till workshop." },
  { id: "oppna", label: "Öppna och avsluta", blurb: "Titel, presentation av dig, tack." },
  { id: "scener", label: "Föreläsningens egna scener", blurb: "Scenregister byggda för en viss föreläsning — varje scenkod är en egen komposition." },
  { id: "modeller", label: "Fler modeller och förklaringar", blurb: "Specialbyggda visualiseringar som inte passar i någon annan låda." },
];

/** Hör till en annan slide, är underdelar — eller får inte användas (Manifesto: se DESIGN.md). */
export const NOT_IN_GALLERY = new Set([
  "Notes",
  "Manifesto",
  "TimelineEvent",
  "ComparisonColumn",
  "FloatingImage",
  "FloatingVideo",
  "FloatingAudio",
  "FloatingChat",
  "FloatingPills",
  "FloatingPhone",
  "FloatingText",
  "FloatingShape",
]);

const EXPLICIT: Record<FamilyId, string[]> = {
  oppna: ["TitleSlide", "LiquidSpeakerIntro", "SpeakerIntro", "TackSlide", "Outro", "BrandIntro", "TeamIntro", "LobbyScreen", "LoadingSlide", "GapTitle", "GapStart"],
  avdelare: ["SectionDivider", "LiquidDivider", "PosterDivider", "PopDivider"],
  "stora-ord": [
    "HookStatement", "GiantText", "GrowingStatement", "TurnStatement", "SealStatement", "LeadStatement", "TriadStatement", "BigDefinition",
    "CoreInsight", "HeroStatement", "PosterText", "PosterHero", "EditorialHero", "RotatingStatement", "ImplodingStatement", "BreathingFrame",
    "LayeredText", "GapText", "WordSteps", "CorrectedClaim", "ClimbingClaim", "Utkast",
  ],
  citat: [
    "Quote", "LiquidQuote", "EditorialQuote", "BookQuote", "PictureQuote", "FigureQuote", "TypewriterQuote", "CaseQuote", "StudentVoices", "QuoteWall",
    "QuoteCollage", "PosterQuote", "NamedPortrait", "QuoteReturn", "JthBusQuote", "StagedVoices", "VoiceCollage", "Passage", "Narration", "StatsWithQuote",
  ],
  listor: [
    "RevealList", "NumberedReveal", "BulletBuild", "SideScrollList", "ProcessBeats", "ProcessChain", "StepSpine", "Timeline", "ParallaxTimeline",
    "PhaseProgression", "EscalationLadder", "PrincipleStack", "ThreeUp", "IdeaGrid", "ExampleHub", "ExampleGrid", "AcronymList", "AcronymInsertion",
    "TierStack", "ConsequenceTimeline", "MythTimeline", "ThreeActs", "CaseGrid", "LiquidGrid", "RapidFire", "RapidFireIdeas", "EditorialColumns",
  ],
  jamfor: [
    "TwoSides", "Comparison", "TwoPaths", "BeforeAfter", "BeforeAfterPhases", "PromptCompare", "PromptVsPrompt", "PosterCompare", "StatCompare",
    "WorkVsLearning", "BildningContrast", "OppositionRows", "LiquidChatCompare", "CompareCriteria", "DualityReveal", "SpotlightContrast",
    "FrictionContrast", "InboxContrast", "TwinOutput", "TwoAnswers", "DualAudience", "DualAffordance", "CanShouldSplit", "RoleSplit", "DownloadVsGrow",
  ],
  siffror: [
    "BigStat", "StatsTriptych", "StatCounter", "ParadoxStat", "MetricGrid", "LiquidStat", "BleedStat", "UCurveChart", "MetrCurve", "MetrTimeHorizon",
    "OccupationRadar", "SOLOGraph", "EvidenceConstellation", "FrictionMap", "LensStats", "StatPhoneReveal", "TimeHorizons", "CompoundInterestLab",
  ],
  chatt: [
    "ChatPreview", "ChatMockup", "AiConversation", "TypedChat", "LiquidChat", "ChatHero", "ChatFullscreen", "ChatSplit", "ChatArtifact", "AnnotatedChat",
    "PromptWindow", "PromptHero", "PromptTransform", "PromptPrinciples", "PromptShowcase", "PromptAnimation", "PromptReveal", "PromptMosaic",
    "PromptToImage", "PromptInput", "PromptMorph", "PromptTriangle", "StarterPrompts", "StarterSentences", "SycophancyMirror", "SycophancyTest",
    "DarkPatternsChat", "DarkPatternsApp", "LonelyTeenChat", "PhoneScreenAI", "PhoneFeedReveal", "VoiceToReply", "VoiceCallAI", "OpenClawTerminal",
    "TraitChats", "StoryToChat", "Bollplank", "InputHero",
  ],
  media: [
    "VideoBackground", "FullscreenVideo", "VideoEmbed", "VideoExhibit", "VideoChapters", "CodeOverVideo", "HeroImage", "ImageText", "ImageBleed",
    "Collage", "MediaCarousel", "ImageMarquee", "HotspotImage", "AiArMedia", "AiArHero", "AudioGenHero", "NewsMontage", "RevealReel", "GlassShowcase",
    "ReferenceGallery", "SlideshowMorph", "MapPins", "HopeMontage", "FeedExhibit", "TargetLanguageImages", "PhotoTranscribe",
  ],
  ai: [
    "NextTokenDemo", "AiHyperobject", "AiKanVara", "AiPusselbit", "CodeGeneration", "CodeReveal", "DataRedaction", "ModalityCascade", "ModalityGrid",
    "SpotTheAI", "RealOrFake", "CouldBeReal", "FakeProofs", "BiasInAction", "BiasShowcase", "BiasCode", "BiasPhone", "NameSwapBias", "JaggedFrontier",
    "JaggedReveal", "AgentCatalog", "AgentAdventure", "SentencePredictor", "SentenceSlot", "NeuralDissolve", "AiSearchReveal", "AiCompanions",
    "AiCompanionsMedia", "BotnetReveal", "GenerativeAIIntro", "AIDecoder", "AIToolTiers", "AlgorithmAudit", "TruthVacuum", "PrebunkingLab",
    "VibeCoding", "NotebookLMExample", "TranslationBridge", "TranslationDemo", "WeirdReveal", "WeirdSummary", "Denials", "AnthropomorphismLine",
    "CatchAIGame", "GameReveal", "ParticleField",
  ],
  pedagogik: [
    "JagAIJagCircles", "JagAIJagFlow", "JagAIJagTriptych", "WithAboutAgainstThrough", "SAMRSpectrum", "SamrLadder", "BloomPyramid", "BloomComparison",
    "LensIntro", "LensApplication", "LensQuestion", "Tankartrappan", "HumanCapacities", "ArchetypeProfile", "ArchetypeWheel", "ArchetypePoster",
    "ThreeLayerTeaching", "AssessmentTwins", "NoviceDilemma", "MethodModeling", "MethodCodex", "LixPanels", "BiestaTriad", "AffordanceSpectrum",
    "AffordanceLenses", "RoleConstellation", "RoleOrbit", "RoleSelector", "ElevtypAnalys", "BaraWorkmap", "BaraTask", "SAILDCycle", "HELFPrinciple",
    "TwoLensesFlow", "LessonArc", "ClassroomAssignment", "AssignmentBreakdown", "SupportDial", "ProtagonistReclaim", "AttentionAttachment",
    "FriendshipKinds", "ClassFriendReveal", "EmotionsSpectrum", "EmotionRow", "MindMechanisms", "StrategySpectrum", "SecuritySpectrum",
  ],
  publik: [
    "Reflection", "LiveReflection", "LivePoll", "PollQuestion", "WorkshopHandoff", "HandsOn", "TryItNow", "ExercisePitch", "ExerciseThemes",
    "ExerciseCodebook", "ExerciseReflection", "QuizDemo", "StudentQuiz", "LiveEmbed", "LiveDemoEmbed", "DemoCue", "ThreeQuestions", "HandoffQuestions",
    "BigQuestionBubble", "CrossedQuestion", "TonalityQuestion", "Callout", "BreakoutBox", "ChallengePromptBurst", "BoundaryQuestions", "QuestionBeneath",
    "Pitfall", "ToolHub", "ThreeLevelMenu",
  ],
  scener: ["SamtalSlide"],
  modeller: [],
};

const BY_TAG = new Map<string, FamilyId>();
for (const [family, tags] of Object.entries(EXPLICIT) as [FamilyId, string[]][]) {
  for (const tag of tags) if (!BY_TAG.has(tag)) BY_TAG.set(tag, family);
}

/** Namnmönster, prövade i ordning. Det första som träffar vinner. */
const PATTERNS: [RegExp, FamilyId][] = [
  [/Scene$/, "scener"],
  [/Divider$/, "avdelare"],
  [/^(Title|Tack)|Intro$|Outro/, "oppna"],
  [/Quote|Voices?$|Citat/, "citat"],
  [/Chat|Prompt|Conversation|Terminal/, "chatt"],
  [/Live|Poll|Exercise|Workshop|Quiz|Question|Reflection|HandsOn/, "publik"],
  [/Stat(s|Counter)?($|[A-Z])|Metric|Chart|Curve|Graph|Radar/, "siffror"],
  [/Video|Image|Photo|Picture|Collage|Media|Audio|Montage|Gallery|Carousel|Reel/, "media"],
  [/Compare|Contrast|^Two|Vs[A-Z]|Twin|^Dual|Split$/, "jamfor"],
  [/^A[Ii][A-Z]|Bias|Token|Agent|Neural|Fake|Jagged|Modality/, "ai"],
  [/Lens|Bloom|SAMR|Samr|JagAI|Archetype|Affordance|Teaching|Teacher|Lesson|Assessment|Method|Learning|Learner|Classroom|Student|Feedback|Language|Reading/, "pedagogik"],
  [/Statement$|^Giant|Definition|Insight|^Poster/, "stora-ord"],
  [/List$|Beats$|Chain$|Ladder$|Stack$|Steps$|Timeline|Grid$|Progression$/, "listor"],
];

export function familyOf(tag: string): FamilyId {
  const explicit = BY_TAG.get(tag);
  if (explicit) return explicit;
  for (const [pattern, family] of PATTERNS) if (pattern.test(tag)) return family;
  return "modeller";
}

/** `GrowingStatement` → "Growing Statement", `AiKanVara` → "Ai Kan Vara", `SAMRSpectrum` → "SAMR Spectrum". */
export function readableName(tag: string): string {
  return tag
    .replace(/([a-zåäö0-9])([A-ZÅÄÖ])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/** Planeringsfält och manus hör till slidens ursprung, inte till en ny slide som lånar dess form. */
export const PLANNING_PROPS = ["claude", "syfte", "tid", "akt", "visuell", "kalla", "mall", "cutSkip"];

export interface GalleryExample {
  slug: string;
  deckTitle: string;
  /** 1-baserad position i decket. */
  slide: number;
  /** Rubrik eller bärande text, för att känna igen sliden. */
  text: string;
  /** Scenkod, för scenregister där varje kod är en egen komposition. */
  scene?: string;
  /** Byts när exempeldecket ändras, så att förhandsbilden fångas om. */
  stamp: string;
}

export interface GalleryTemplate {
  tag: string;
  family: FamilyId;
  /** Ur det handskrivna schemat, om mallen har ett. */
  description: string;
  /** Har mallen ett schema går den att lägga till TOM, med standardvärden. */
  hasSchema: boolean;
  uses: number;
  decks: number;
  examples: GalleryExample[];
}

/** En mall som bara finns i en enda föreläsning är oftast byggd för just den. */
export function isOneOff(template: Pick<GalleryTemplate, "decks" | "hasSchema" | "family">): boolean {
  return template.decks <= 1 && !template.hasSchema && template.family !== "scener";
}

/**
 * Mallarna heter saker på engelska, men Joel söker på svenska: "kurva" ska
 * hitta UCurveChart och "citat" ska hitta LiquidQuote. Ordlistan översätter
 * delarna av ett mallnamn; familjens namn och ingress är också sökbara.
 */
const GLOSSARY: Record<string, string> = {
  quote: "citat", voices: "röster", voice: "röst", statement: "påstående mening", text: "text", giant: "stor jätte", hook: "krok öppning",
  growing: "växande", divider: "avdelare", section: "avsnitt akt", title: "titel rubrik", intro: "presentation", speaker: "talare föreläsare",
  outro: "avslutning", tack: "tack avslutning", list: "lista punkter", reveal: "avslöja stegvis", numbered: "numrerad", bullet: "punkter",
  steps: "steg", step: "steg", process: "process förlopp", chain: "kedja", timeline: "tidslinje", ladder: "trappa stege", stack: "stapel",
  grid: "rutnät", compare: "jämför", comparison: "jämförelse jämför", contrast: "kontrast jämför", sides: "sidor", paths: "vägar",
  before: "före", after: "efter", stat: "statistik siffra", stats: "statistik siffror", metric: "mått siffror", counter: "räknare siffra",
  chart: "diagram", curve: "kurva", graph: "graf diagram", radar: "radar diagram", chat: "chatt samtal", conversation: "samtal chatt",
  prompt: "prompt", phone: "telefon mobil", terminal: "terminal", video: "video film", image: "bild", picture: "bild", photo: "foto bild",
  collage: "kollage", media: "media", audio: "ljud", montage: "montage", gallery: "galleri", carousel: "karusell", hero: "stor bild",
  background: "bakgrund", bias: "bias fördom", token: "token ord", agent: "agent", fake: "fejk falsk", code: "kod", lens: "lins",
  role: "roll", roles: "roller", archetype: "arketyp elevtyp", pyramid: "pyramid", spectrum: "spektrum skala", reflection: "reflektion",
  poll: "omröstning", question: "fråga", questions: "frågor", exercise: "övning", workshop: "workshop", quiz: "quiz", live: "live publik",
  map: "karta", constellation: "konstellation", circles: "cirklar", triptych: "tre delar", definition: "definition", insight: "insikt",
  poster: "affisch", passage: "stycke läs", book: "bok", student: "elev", teacher: "lärare", lesson: "lektion", friction: "friktion motstånd",
};

function glossed(tag: string): string {
  return readableName(tag)
    .toLowerCase()
    .split(" ")
    .map((word) => GLOSSARY[word] ?? "")
    .join(" ");
}

export function searchTemplates<T extends Pick<GalleryTemplate, "tag" | "description" | "examples">>(templates: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return templates;
  return templates.filter((template) => {
    const family = FAMILIES.find((item) => item.id === familyOf(template.tag));
    const hay = [
      template.tag,
      readableName(template.tag),
      glossed(template.tag),
      family?.label ?? "",
      template.description,
      template.examples.map((e) => `${e.text} ${e.scene ?? ""}`).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => hay.includes(word));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Favoriter — Joels stjärnmärkta mallar
// ─────────────────────────────────────────────────────────────────────────────
//
// Står i `content/galleri.json`, en mall per rad i bokstavsordning. Filen följer
// med i git, så favoriterna finns på alla Joels datorer, och två datorer som
// stjärnmärker var sin mall ger sällan en konflikt: raderna hamnar på olika
// ställen. Ordningen i filen är inte ordningen i galleriet — där står den mest
// använda först, som i resten av galleriet.

export const FAVORITES_VERSION = 1;

/** Ett mallnamn som det skrivs i MDX: `<HookStatement`. Inget annat får in i filen. */
const TEMPLATE_TAG = /^[A-Z][A-Za-z0-9]{1,63}$/;

export function isTemplateTag(value: unknown): value is string {
  return typeof value === "string" && TEMPLATE_TAG.test(value);
}

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Läser filens innehåll tåligt: fel form, dubbletter och annat skräp faller bort. */
export function normalizeFavorites(input: unknown): string[] {
  const list = (input as { favoriter?: unknown } | null)?.favoriter;
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(isTemplateTag))].sort(byName);
}

export function toggleFavorite(favorites: string[], tag: string, on: boolean): string[] {
  if (!isTemplateTag(tag)) return favorites;
  const next = new Set(favorites);
  if (on) next.add(tag);
  else next.delete(tag);
  return [...next].sort(byName);
}

/** En mall per rad, så att git kan slå ihop två datorers ändringar. */
export function serializeFavorites(favorites: string[]): string {
  const rows = [...new Set(favorites.filter(isTemplateTag))].sort(byName).map((tag) => `    ${JSON.stringify(tag)}`);
  return `{\n  "version": ${FAVORITES_VERSION},\n  "favoriter": [\n${rows.join(",\n")}\n  ]\n}\n`;
}
