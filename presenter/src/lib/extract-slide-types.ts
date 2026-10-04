/**
 * Extraherar slide-metadata från MDX-källkoden.
 *
 * Vi parsar MDX själva eftersom `slide.type` är en opaque reference när
 * templates kommer via RSC (next-mdx-remote/rsc) - displayName och name
 * är inte tillgängliga på klienten.
 *
 * Returnerar: array med metadata per slide (template-namn + primär text).
 *
 * VIKTIGT: overlay-komponenter (FloatingImage etc.) räknas INTE som egna
 * slides — de bifogas föregående slide, precis som parseTopLevelComponents
 * gör. Annars hamnar metadatan i otakt med den faktiska slide-listan så
 * fort en presentation har overlays (fel template-tagg/text per kort).
 */

import { OVERLAY_TAGS } from "./mdx-parser";
import { parseStepConfig, type StepConfig } from "./step-config";

export interface SlideMeta {
  templateName: string;
  /** Slidens stabila id (slideId i MDX), om det står i öppningstaggen. Inspelningens tidslinje loggar det. */
  slideId?: string;
  primaryText?: string;
  secondaryText?: string;
  /** Scene identifier for content-bound templates with their own choreography. */
  scene?: string;
  /** Opt-in: adjacent windows of the same scene keep their mounted objects. */
  sceneGroup?: string;
  /** Versioner/cuts som sliden är BORTTAGEN ur (via cut-skip-markör i MDX). */
  cutSkip?: string[];
  /**
   * Landningsmarkör: sliden som L-tangenten hoppar till i presenterläget —
   * punkten där ~10 minuter återstår, så talaren kan runda av snyggt när
   * tiden runnit i väg. Sätts med `landing="true"` på valfri slide i MDX:en.
   * Markören sitter på sliden (inte på ett positionsnummer) och överlever
   * därför omflyttningar och raderingar i studion.
   */
  landing?: boolean;
  /**
   * Vändpunkten för temat Röstens röstlinje: från och med denna slide talar
   * linjen med människans röst (bärnsten) i stället för maskinens (mint).
   * Sätts med `voiceTurn="true"` på en slide i MDX:en.
   */
  voiceTurn?: boolean;
  /**
   * Tidsmarkör för J-tangenten: `remaining="30"` betyder "härifrån är det
   * ~30 minuter kvar". J hoppar till nästa markör FRAMFÖR talaren, så en
   * deck kan ha flera (45, 30, 20) och samma tangent bär hela vägen.
   * Landningen räknas som remaining=10 utan att behöva skrivas ut.
   */
  remaining?: number;
  /**
   * Bakgrundsprop på sliden (bild-sökväg, videosökväg eller godtyckligt
   * CSS-värde). M-lägets designpanel behöver den för att kunna visa vad som
   * faktiskt är satt — och för att kunna varna när en gradient läggs under en
   * bakgrund som ändå målar över den.
   */
  background?: string;
  /** Overlay-styrka som sträng, samma form som props:en skrivs i MDX:en. */
  overlay?: string;
  /** "light" när overlayen ska tona upp i stället för ner. */
  overlayMode?: string;
  /** Oskärpa på bakgrundslagret i px, som strängen skrivs i MDX:en. */
  backgroundBlur?: string;
  /** stegAv / hoppaSteg: vilka av mallens klicksteg som visas (lib/step-config.ts). */
  steps?: StepConfig;
  /**
   * Linjen (linjen): vems perspektiv sliden har, ur `perspective` eller
   * `kulPerspective` (”LÄRARENS …” ger larare, annars elev). Ger linjens färg.
   */
  perspective?: "elev" | "larare";
  /** Linjen: `station="…"` markerar första sliden i en ny akt, en hållplats på linjen. */
  station?: string;
  /** Linjen: `dygn="natt|dag|kväll|gryning"` byter himmel från och med sliden. */
  dygn?: "natt" | "dag" | "kvall" | "gryning";
  /**
   * Vätterresan (Stage): `resa="ner|upp|in|ut|hoger|vanster|stilla"`
   * ger riktningen för resan till denna slide; utan `resa` går den nedåt. Ett
   * deck med minst en `resa` får sjön att ligga kvar mellan slides
   * (templates/stage/world.tsx).
   */
  resa?: string;
  /**
   * Tiopotenserna (Stage): `skala="7"` eller per steg `"7,4"`. Ett deck
   * med `resa` och minst en `skala` ritar zoomen i stället för sjön
   * (templates/stage/skala.tsx).
   */
  skala?: string;
}

export function extractSlideMetas(source: string): SlideMeta[] {
  const metas: SlideMeta[] = [];

  // Vi går igenom source och hittar alla top-level-komponenter.
  // En top-level-komponent är en rad som börjar med `<Name` i kolumn 0.
  // Efter varje hittad komponent läser vi tills vi hittar nästa top-level
  // (eller slutet), och extraherar relevanta props / children.

  const lines = source.split("\n");
  const componentStarts: { tag: string; startLine: number; endLine: number }[] = [];

  // Hitta startrader för alla top-level-komponenter
  for (let i = 0; i < lines.length; i++) {
    const match = /^<([A-Z][A-Za-z0-9]*)/.exec(lines[i]);
    if (match) {
      componentStarts.push({ tag: match[1], startLine: i, endLine: -1 });
    }
  }

  // Sätt endLine = startLine av nästa komponent, eller slutet
  for (let i = 0; i < componentStarts.length; i++) {
    componentStarts[i].endLine =
      i + 1 < componentStarts.length
        ? componentStarts[i + 1].startLine - 1
        : lines.length - 1;
  }

  for (const comp of componentStarts) {
    // Overlay-komponenter (FloatingImage etc.) är inte egna slides — de
    // hör till föregående slide. Hoppa över dem så metadatan håller takt
    // med slide-listan. (En overlay allra först blir dock en egen slide,
    // matchar parseTopLevelComponents.)
    if (OVERLAY_TAGS.has(comp.tag) && metas.length > 0) {
      continue;
    }

    const blockLines = lines.slice(comp.startLine, comp.endLine + 1);
    const block = blockLines.join("\n");

    const meta: SlideMeta = {
      templateName: comp.tag,
    };
    if (comp.tag === "ElevLectureScene" || comp.tag === "VemScene") meta.scene = extractRawProp(block, "scene");
    if (["LectureScene", "LectureSequence"].includes(comp.tag)) meta.sceneGroup = extractRawProp(block, "sceneGroup");

    const cutProp = extractProp(block, "cutSkip");
    const cutSkip = cutProp
      ? cutProp.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    if (cutSkip.length > 0) {
      meta.cutSkip = cutSkip;
    }

    // Landningsmarkören kräver exakt landing="true" — flera templates
    // (JaggedReveal, FrictionMap, RoleConstellation, …) har en landing-prop
    // som är payoff-TEXT, och de får inte fånga L-hoppet.
    if (extractRawProp(block, "landing") === "true") {
      meta.landing = true;
    }
    if (extractRawProp(block, "voiceTurn") === "true") meta.voiceTurn = true;

    // Tidsmarkören kräver ett rent heltal. Skräpvärden ignoreras hellre än
    // att bli ett hopp till fel ställe — J trycks i tidsnöd inför en sal,
    // och då är "ingenting händer" ett mycket bättre fel än "fel slide".
    const remainingRaw = extractRawProp(block, "remaining");
    if (remainingRaw && /^\d{1,3}$/.test(remainingRaw)) {
      meta.remaining = Number(remainingRaw);
    }

    // Klickstegen per slide. Letas bara i öppningstaggen — ett ord i texten
    // mellan taggarna får inte slå av stegen.
    const opening = openingTag(block);
    const slideIdRaw = extractRawProp(opening, "slideId")?.trim();
    if (slideIdRaw) meta.slideId = slideIdRaw;
    // Linjen: perspektiv och hållplatser läses bara i öppningstaggen.
    const perspectiveRaw = extractRawProp(opening, "perspective") ?? extractRawProp(opening, "kulPerspective");
    if (perspectiveRaw) meta.perspective = /^LÄRAR/i.test(perspectiveRaw.trim()) ? "larare" : "elev";
    const stationRaw = extractRawProp(opening, "station");
    if (stationRaw) meta.station = stationRaw;
    const dygnRaw = extractRawProp(opening, "dygn")?.trim().toLowerCase().replace("ä", "a");
    if (dygnRaw === "natt" || dygnRaw === "dag" || dygnRaw === "kvall" || dygnRaw === "gryning") meta.dygn = dygnRaw;
    if (comp.tag === "Stage") {
      const resaRaw = extractRawProp(opening, "resa")?.trim().toLowerCase();
      if (resaRaw) meta.resa = resaRaw;
      const skalaRaw = extractRawProp(opening, "skala")?.trim();
      if (skalaRaw) meta.skala = skalaRaw;
    }
    const steps = parseStepConfig({
      stegAv: /(?:^|\s)stegAv(?=[\s/>])|\bstegAv=(?:\{true\}|"true")/.test(opening),
      hoppaSteg: extractRawProp(opening, "hoppaSteg"),
    });
    if (steps) meta.steps = steps;

    // Bakgrund läses RÅ — cleanText är byggd för prosa och skulle kunna
    // förvanska en sökväg. Designpanelen jämför värdet tecken för tecken.
    const background = extractRawProp(block, "background");
    if (background) meta.background = background;
    const overlay = extractRawProp(block, "overlay");
    if (overlay) meta.overlay = overlay;
    const overlayMode = extractRawProp(block, "overlayMode");
    if (overlayMode) meta.overlayMode = overlayMode;
    const backgroundBlur = extractRawProp(block, "backgroundBlur");
    if (backgroundBlur) meta.backgroundBlur = backgroundBlur;

    // Extrahera relevanta fält per template
    switch (comp.tag) {
      case "TitleSlide":
      case "SectionDivider":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText = extractProp(block, "subtitle");
        break;
      case "GiantText":
        meta.primaryText = extractInnerText(block, "GiantText");
        break;
      case "Quote":
      case "PictureQuote":
        meta.primaryText = extractInnerText(block, comp.tag);
        meta.secondaryText = extractProp(block, "attribution");
        break;
      case "GiantScroll":
        meta.primaryText = extractProp(block, "text");
        break;
      case "LayeredScroll":
        meta.primaryText = extractProp(block, "text");
        meta.secondaryText = extractProp(block, "foregroundImage") ?? extractProp(block, "bgImage");
        break;
      case "StatCounter": {
        const value = extractProp(block, "value");
        const suffix = extractProp(block, "suffix") ?? "";
        meta.primaryText = value ? `${value}${suffix}` : undefined;
        meta.secondaryText = extractProp(block, "label");
        break;
      }
      case "PromptAnimation":
        meta.primaryText = extractProp(block, "resultText");
        meta.secondaryText = extractProp(block, "promptText");
        break;
      case "PollQuestion":
        meta.primaryText = extractProp(block, "question");
        break;
      case "HeroImage":
      case "VideoBackground":
      case "ImageBleed":
      case "LayeredText":
        meta.primaryText = extractFirstHeading(block);
        break;
      case "Callout":
      case "Reflection":
        meta.primaryText = extractProp(block, "title");
        break;
      case "BulletBuild":
      case "SideScrollList":
      case "NumberedReveal":
      case "Timeline":
      case "Comparison":
        meta.primaryText = extractProp(block, "title");
        break;
      case "CodeReveal":
        meta.primaryText = extractProp(block, "title") ?? extractProp(block, "caption");
        meta.secondaryText = extractProp(block, "language");
        break;
      case "VideoEmbed":
        meta.primaryText = extractProp(block, "title") ?? extractProp(block, "src");
        break;
      case "SlideshowMorph":
        meta.primaryText = extractProp(block, "morph");
        meta.secondaryText = extractProp(block, "captions");
        break;
      case "ParticleField":
        meta.primaryText = "Partiklar";
        meta.secondaryText = extractProp(block, "formations");
        break;
      case "LoadingSlide":
        meta.primaryText = extractProp(block, "title") ?? extractProp(block, "variant");
        meta.secondaryText = extractProp(block, "subtitle");
        break;
      case "Collage":
        meta.primaryText = extractProp(block, "title") ?? "Collage";
        meta.secondaryText = extractProp(block, "layout");
        break;
      case "ImageText":
        meta.primaryText = extractFirstHeading(block);
        break;

      // === Floating overlays (också top-level för slides ibland) ===
      case "FloatingImage":
      case "FloatingVideo":
      case "FloatingAudio":
      case "FloatingChat":
      case "FloatingPhone":
      case "FloatingPills":
      case "FloatingText": {
        const src = extractProp(block, "src");
        const caption = extractProp(block, "caption");
        meta.primaryText = caption ?? (src ? shortPath(src) : comp.tag);
        meta.secondaryText = src && caption ? shortPath(src) : undefined;
        break;
      }

      // === Memphis-tema-templates (vanliga i mellanstadiet) ===
      case "ChatMockup":
      case "IdeaGrid":
      case "SpotTheAI":
      case "Tankartrappan":
      case "SentencePredictor":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "subtitle") ?? extractProp(block, "eyebrow");
        break;

      case "SentenceSlot": {
        const prefix = extractProp(block, "prefix");
        const words = extractProp(block, "words");
        meta.primaryText = prefix ? `${prefix} ___` : extractFirstListItem(block);
        meta.secondaryText = words?.split(",").slice(0, 3).join(", ");
        break;
      }

      // === Prompt/genererings-templates ===
      case "PromptCompare":
      case "PromptVsPrompt":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "leftPrompt") ?? extractProp(block, "bottomLine");
        break;

      case "PromptToImage":
        meta.primaryText = extractProp(block, "prompt");
        meta.secondaryText = extractProp(block, "chapter");
        break;

      case "FakeProofs":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "subtitle") ?? extractProp(block, "kicker");
        break;

      case "TruthVacuum":
        meta.primaryText = extractProp(block, "title") ?? "Vilken är riktig?";
        meta.secondaryText =
          extractProp(block, "kicker") ?? extractProp(block, "subtitle");
        break;

      case "CouldBeReal":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "kicker") ?? extractProp(block, "subtitle");
        break;

      case "RevealReel":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "kicker") ?? extractProp(block, "subtitle");
        break;

      case "PrebunkingLab":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "prompt") ?? extractProp(block, "subtitle");
        break;

      case "SAILDCycle":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "caseTitle") ?? extractProp(block, "subtitle");
        break;

      case "GenerativeAIIntro":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "prompt") ?? extractProp(block, "subtitle");
        break;

      case "GameReveal":
        meta.primaryText = extractProp(block, "gameTitle") ?? "Spel";
        meta.secondaryText = extractProp(block, "prompt");
        break;

      // === Hook/Statement-templates ===
      case "HookStatement":
      case "Manifesto":
      case "BigDefinition":
      case "HeroStatement":
      case "EditorialQuote":
      case "GrowingStatement":
        meta.primaryText =
          extractInnerText(block, comp.tag) ?? extractProp(block, "title");
        meta.secondaryText = extractProp(block, "chapter");
        break;

      // === Big number / stat ===
      case "BigStat":
      case "ParadoxStat":
      case "StatCompare": {
        const value = extractProp(block, "value");
        const label = extractProp(block, "label");
        meta.primaryText = value ?? extractProp(block, "title");
        meta.secondaryText = label;
        break;
      }

      // === Voice/audio-templates ===
      case "VoiceCallAI":
      case "VoiceCollage":
      case "VoiceFeedback":
      case "VoiceReveal":
      case "VoiceToReply":
        meta.primaryText =
          extractProp(block, "question") ??
          extractProp(block, "title") ??
          comp.tag;
        meta.secondaryText = extractProp(block, "subtitle");
        break;

      // === Image/marquee/decoder ===
      case "ImageMarquee":
      case "AIDecoder":
      case "PhoneScreenAI":
        meta.primaryText =
          extractProp(block, "title") ?? extractProp(block, "eyebrow");
        meta.secondaryText =
          extractProp(block, "subtitle") ?? extractProp(block, "closer");
        break;

      // === Bubble/question templates ===
      case "BigQuestionBubble":
        meta.primaryText = extractProp(block, "question");
        meta.secondaryText = extractProp(block, "sender");
        break;

      case "PromptInput":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText = extractProp(block, "prompt");
        break;

      // === Bias-flöde ===
      case "WeirdReveal":
      case "WeirdSummary":
      case "BiasShowcase":
      case "BiasCode":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "subtitle") ?? extractProp(block, "chapter");
        break;

      // === Three-up / process ===
      case "ThreeUp":
      case "ProcessBeats":
      case "ProcessChain":
        meta.primaryText = extractProp(block, "title");
        meta.secondaryText =
          extractProp(block, "subtitle") ?? extractProp(block, "kicker");
        break;

      default: {
        meta.primaryText =
          extractProp(block, "title") ??
          extractProp(block, "question") ??
          extractProp(block, "prompt") ??
          extractProp(block, "caption") ??
          extractProp(block, "eyebrow");
        if (!meta.secondaryText) {
          meta.secondaryText =
            extractProp(block, "subtitle") ??
            extractProp(block, "chapter") ??
            extractProp(block, "src");
        }
      }
    }

    metas.push(meta);
  }

  return metas;
}

/**
 * Extrahera ett prop-värde från en komponent-block.
 * Hanterar: propName="value", propName="value med space"
 */
/**
 * Läs ett prop-värde exakt som det står i MDX:en — ingen textstädning.
 * Regexen är ankrad på ordgräns så `overlay` inte matchar `overlayMode`.
 */
/** Öppningstaggen: fram till första > utanför citat och klamrar. */
function openingTag(block: string): string {
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ">" && depth === 0) return block.slice(0, i + 1);
  }
  return block;
}

function extractRawProp(block: string, propName: string): string | undefined {
  const patterns = [
    new RegExp(`\\b${propName}="([^"]*)"`),
    new RegExp(`\\b${propName}='([^']*)'`),
    new RegExp(`\\b${propName}=\\{"([^"]*)"\\}`),
    new RegExp(`\\b${propName}=\\{([0-9.]+)\\}`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(block);
    if (match) return match[1];
  }
  return undefined;
}

function extractProp(block: string, propName: string): string | undefined {
  // Dubbel-citattecken (hanterar även escapade citattecken inuti)
  const dblQuote = new RegExp(`${propName}="((?:[^"\\\\]|\\\\.)*)"`, "s");
  const dblMatch = dblQuote.exec(block);
  if (dblMatch) return cleanText(dblMatch[1]);

  // Enkla citattecken
  const singleQuote = new RegExp(`${propName}='((?:[^'\\\\]|\\\\.)*)'`, "s");
  const singleMatch = singleQuote.exec(block);
  if (singleMatch) return cleanText(singleMatch[1]);

  // JSX expression {...} - försök läsa ut string literals
  const jsxExpr = new RegExp(`${propName}=\\{"([^"]*)"\\}`);
  const jsxMatch = jsxExpr.exec(block);
  if (jsxMatch) return cleanText(jsxMatch[1]);

  return undefined;
}

/**
 * Extrahera första h1/h2 heading eller textinnehåll inuti en komponent.
 */
function extractFirstHeading(block: string): string | undefined {
  const h1 = /^#\s+(.+)$/m.exec(block);
  if (h1) return cleanText(h1[1]);
  const h2 = /^##\s+(.+)$/m.exec(block);
  if (h2) return cleanText(h2[1]);
  return undefined;
}

/**
 * Extrahera text mellan <Tag>...</Tag>. Första raden av icke-whitespace.
 */
function extractInnerText(block: string, tag: string): string | undefined {
  const start = block.indexOf(`<${tag}`);
  if (start < 0) return undefined;

  // Ett `>` kan förekomma i ett citerat prop-värde, exempelvis
  // chapter="Agens > intelligens". En vanlig `[^>]*`-regex avslutar då
  // öppningstaggen för tidigt och råkar visa resten av attributen som
  // slide-text. Skanna därför till första verkliga taggslut.
  let quote: '"' | "'" | null = null;
  let braceDepth = 0;
  let openingEnd = -1;
  for (let index = start + tag.length + 1; index < block.length; index++) {
    const char = block[index];
    const previous = block[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (char === ">" && braceDepth === 0) {
      openingEnd = index;
      break;
    }
  }
  if (openingEnd < 0) return undefined;

  const closingStart = block.indexOf(`</${tag}>`, openingEnd + 1);
  if (closingStart < 0) return undefined;
  const inner = block.slice(openingEnd + 1, closingStart);
  // Ta bort prop-rader som står före innehållet (self-closing tags, attribut över flera rader)
  const firstNonEmpty = inner
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("-"))[0];
  return firstNonEmpty ? cleanText(firstNonEmpty) : undefined;
}

/**
 * Plocka första listrad inom en komponents children (för templates som
 * SentenceSlot multi-mode, IdeaGrid, ThreeUp …).
 */
function extractFirstListItem(block: string): string | undefined {
  const lines = block.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2).trim();
      // Vid format "- L **Du:** Text" eller "- ★ Title · Desc" → ta före första separator
      const firstSeg = text.split(/\s·\s|\s\|\s/)[0].trim();
      return cleanText(firstSeg.slice(0, 80));
    }
  }
  return undefined;
}

/**
 * Kortare visning av en path — bara filnamnet (inkl. parent-mapp om finns).
 */
function shortPath(p: string): string {
  if (p.startsWith("http")) {
    try {
      const u = new URL(p);
      const name = u.pathname.split("/").pop() || p;
      return `${u.hostname}/…/${name}`.slice(0, 50);
    } catch {
      return p.slice(0, 50);
    }
  }
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 1) return p;
  return `…/${parts.slice(-2).join("/")}`;
}

function cleanText(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
