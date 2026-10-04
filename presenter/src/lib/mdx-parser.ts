/**
 * Parser för vårt MDX-subset.
 *
 * Vi parsar bara det vi behöver: frontmatter + top-level JSX-komponenter.
 * Varje slide är en top-level komponent. Notes är speciella block mellan slides.
 *
 * Vi använder en enkel line-baserad parser istället för en full MDX AST -
 * det räcker för vårt strukturerade format och är lättare att serialisera tillbaka.
 */

import matter from "gray-matter";

/**
 * lineWidth: -1 stänger av js-yamls radvikning. Utan den bryts långa
 * `description:`-fält till folded scalars (`>-` + indenterade rader) vid
 * varje sparning — semantiskt samma sak, men gör frontmattern svårläst
 * och ger onödigt stora git-diffar.
 */
// gray-matter skickar vidare options till js-yaml, men typerna beskriver bara
// gray-matters egna fält — därav omvägen via unknown.
const YAML_OPTS = { lineWidth: -1 } as unknown as Parameters<typeof matter.stringify>[2];

export type PropValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

export interface ParsedComponent {
  tag: string;
  /** Props som key-value. Värden är strängrepresentation från MDX-källan. */
  props: Record<string, PropValue>;
  /** Råa children-strängen (mellan öppnings- och stängtaggen), eller null om self-closing */
  content: string | null;
  /** Barn-komponenter om tag är container (Timeline, Comparison) */
  children: ParsedComponent[];
  /** Notes-block som följde direkt efter denna komponent (för slides) */
  notes?: string;
  /** Overlay-komponenter (t.ex. FloatingImage) som ligger ovanpå denna slide */
  overlays?: ParsedComponent[];
  /**
   * 0-indexerade radpositioner i source efter att frontmatter strippats.
   * Inkluderar self + tillhörande Notes-block. När overlays bifogas en
   * slide utökas dess sourceEnd för att täcka overlays också.
   * Behövs för slide-kopiering mellan presentationer.
   */
  sourceStart?: number;
  sourceEnd?: number;
  /**
   * Rå MDX som stod före komponenten men inte tillhör någon komponent —
   * i praktiken `{/* ... *\/}`-kommentarer (aktstruktur, MEDIA-BEHOV-listor,
   * TODO-noteringar) och lös markdown. Utan detta fält raderar varje
   * parse→serialize-cykel sådant innehåll, eftersom serializeMdx bygger om
   * filen enbart ur frontmatter + slides. Rena tomradsgap lagras INTE här —
   * de återskapas av serializerns blankradsrytm.
   */
  leadingRaw?: string;
}

/**
 * Tag-namn som ska behandlas som "overlays" istället för fristående slides.
 * När parsern ser en av dessa som top-level efter en annan slide, bifogas
 * den till föregående slides `overlays`-array istället för att räknas som
 * egen slide.
 */
export const OVERLAY_TAGS = new Set([
  "FloatingImage",
  "FloatingVideo",
  "FloatingAudio",
  "FloatingChat",
  "FloatingPills",
  "FloatingPhone",
  "FloatingText",
  "FloatingShape",
  "DriftingNotes",
]);

export interface ParsedPresentation {
  frontmatter: Record<string, unknown>;
  slides: ParsedComponent[];
  /** Rå MDX efter sista sliden som inte tillhör någon komponent. Se `leadingRaw`. */
  trailingRaw?: string;
}

/**
 * Parse MDX source → struktur.
 */
export function parseMdx(source: string): ParsedPresentation {
  const { data: frontmatter, content } = matter(source);
  const { components, trailingRaw } = parseTopLevel(content);
  return { frontmatter, slides: components, trailingRaw };
}

function parseTopLevelComponents(content: string): ParsedComponent[] {
  return parseTopLevel(content).components;
}

/**
 * Behåll bara gap-text som innehåller något annat än tomrader. Ledande och
 * avslutande tomrader trimmas bort — blankradsrytmen mellan block återskapas
 * av serializern, så att filer utan kommentarer roundtrippar byte-identiskt.
 */
function captureRawGap(gap: string[]): string | undefined {
  if (!gap.some((l) => l.trim() !== "")) return undefined;
  let start = 0;
  let end = gap.length;
  while (start < end && gap[start].trim() === "") start++;
  while (end > start && gap[end - 1].trim() === "") end--;
  return gap.slice(start, end).join("\n");
}

function parseTopLevel(content: string): {
  components: ParsedComponent[];
  trailingRaw?: string;
} {
  const lines = content.split("\n");
  const components: ParsedComponent[] = [];
  let gap: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const startMatch = /^<([A-Z][A-Za-z0-9]*)/.exec(line);

    if (!startMatch) {
      gap.push(line);
      i++;
      continue;
    }

    const tag = startMatch[1];

    // Hitta slutet på öppningstagg (kan sträcka sig över flera rader)
    const openingEnd = findOpeningTagEnd(lines, i);
    if (openingEnd === -1) {
      gap.push(line);
      i++;
      continue;
    }

    // Är det self-closing?
    const openingLines = lines.slice(i, openingEnd + 1).join("\n");
    const isSelfClosing = /\/>\s*$/.test(openingLines.trim());

    let contentText: string | null = null;
    let endIndex = openingEnd;

    if (!isSelfClosing) {
      // Hitta motsvarande closing tag på top-level (kolumn 0)
      const closingRe = new RegExp(`^</${tag}>`);
      let depth = 1;
      for (let j = openingEnd + 1; j < lines.length; j++) {
        const candidate = lines[j];
        // Hoppa över nestade öppnings-/stängningstaggar av SAMMA typ
        if (new RegExp(`^<${tag}[\\s>]`).test(candidate)) depth++;
        if (closingRe.test(candidate)) {
          depth--;
          if (depth === 0) {
            contentText = lines.slice(openingEnd + 1, j).join("\n");
            endIndex = j;
            break;
          }
        }
      }
    }

    // Tolka notes-block efter komponenten.
    //
    // Loopen är nödvändig: står flera <Notes>-block i rad hör de alla till
    // samma slide. Tidigare konsumerades bara det första, varpå nästa block
    // parsades som en egen top-level-komponent — en spök-slide i decket, och
    // talmanuset förskjöts ett steg för allt som följde efter den.
    let notesContent: string | undefined;
    let notesEndIndex = endIndex;
    for (;;) {
      const nextNonBlankIndex = findNextNonBlank(lines, notesEndIndex + 1);
      if (nextNonBlankIndex === -1 || !/^<Notes>/.test(lines[nextNonBlankIndex])) {
        break;
      }
      let closingIndex = -1;
      for (let j = nextNonBlankIndex + 1; j < lines.length; j++) {
        if (/^<\/Notes>/.test(lines[j])) {
          closingIndex = j;
          break;
        }
      }
      if (closingIndex === -1) break;
      const block = lines
        .slice(nextNonBlankIndex + 1, closingIndex)
        .join("\n")
        .trim();
      notesContent =
        notesContent != null && notesContent !== ""
          ? `${notesContent}\n\n${block}`
          : block;
      notesEndIndex = closingIndex;
    }

    const props = parseProps(openingLines);
    const children = contentText != null ? parseInnerComponents(contentText) : [];

    const parsedComponent: ParsedComponent = {
      tag,
      props,
      content: contentText,
      children,
      notes: notesContent,
      sourceStart: i,
      sourceEnd: notesEndIndex,
      leadingRaw: captureRawGap(gap),
    };
    gap = [];

    // Overlay-komponenter (t.ex. FloatingImage) bifogas som overlays till
    // föregående slide istället för att räknas som egen slide. Det ger
    // "äkta overlay på existing template"-funktionalitet utan att behöva
    // modifiera varje template-implementation. Utöka parent-slidens
    // sourceEnd så overlay-radar följer med vid kopiering.
    if (OVERLAY_TAGS.has(tag) && components.length > 0) {
      const last = components[components.length - 1];
      if (!last.overlays) last.overlays = [];
      last.overlays.push(parsedComponent);
      last.sourceEnd = Math.max(last.sourceEnd ?? 0, notesEndIndex);
    } else {
      components.push(parsedComponent);
    }

    i = notesEndIndex + 1;
  }

  return { components, trailingRaw: captureRawGap(gap) };
}

/**
 * Extrahera rådatan för en specifik slide (1-indexerad) ur en MDX-källfil.
 * Inkluderar slidens egna rader, ev. <Notes>-block direkt efter, och alla
 * overlays (FloatingImage, FloatingVideo, …) som hör till sliden.
 *
 * Returnerar null om slideIndex är out-of-range. Behåller original-
 * whitespace mellan element så formatering bevaras vid kopiering.
 */
export function extractSlideRaw(
  source: string,
  slideIndex1Based: number,
): string | null {
  const { content } = matter(source);
  const slides = parseTopLevelComponents(content);
  const idx = slideIndex1Based - 1;
  if (idx < 0 || idx >= slides.length) return null;
  const slide = slides[idx];
  if (slide.sourceStart == null || slide.sourceEnd == null) return null;
  const lines = content.split("\n");
  return lines.slice(slide.sourceStart, slide.sourceEnd + 1).join("\n");
}

/**
 * För nestade containers: parse komponenter INUTI en parent.
 * Letar efter rader med `<TagName` på kolumn 0 ELLER indenterat första bokstav stor.
 */
function parseInnerComponents(content: string): ParsedComponent[] {
  // För enkelhet: leta efter alla <TagName som inte är <Tag/> på en rad, och
  // försök matcha dem. Viktigt främst för Timeline → TimelineEvent,
  // Comparison → ComparisonColumn.
  const components: ParsedComponent[] = [];
  const lines = content.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const startMatch = /^<([A-Z][A-Za-z0-9]*)/.exec(trimmed);

    if (!startMatch) {
      i++;
      continue;
    }

    const tag = startMatch[1];
    const openingEnd = findOpeningTagEnd(lines, i);
    if (openingEnd === -1) {
      i++;
      continue;
    }

    const openingLines = lines.slice(i, openingEnd + 1).join("\n");
    const isSelfClosing = /\/>\s*$/.test(openingLines.trim());

    let contentText: string | null = null;
    let endIndex = openingEnd;

    if (!isSelfClosing) {
      const closingRe = new RegExp(`</${tag}>`);
      for (let j = openingEnd + 1; j < lines.length; j++) {
        if (closingRe.test(lines[j])) {
          contentText = lines.slice(openingEnd + 1, j).join("\n");
          // Om stängtaggen är på samma rad som content, ta bort den delen.
          // Bara om det FINNS innehåll före den: en indenterad stängtagg
          // (`  </TimelineEvent>`) gav annars en ny tomrad per sparcykel,
          // så filerna växte obegränsat.
          const lastLineClose = lines[j].indexOf(`</${tag}>`);
          if (lastLineClose > 0 && lines[j].slice(0, lastLineClose).trim() !== "") {
            contentText += "\n" + lines[j].slice(0, lastLineClose);
          }
          endIndex = j;
          break;
        }
      }
    }

    components.push({
      tag,
      props: parseProps(openingLines),
      content: contentText,
      children: [],
    });

    i = endIndex + 1;
  }

  return components;
}

function findOpeningTagEnd(lines: string[], start: number): number {
  // Läs rader tills vi hittar `>` på top-level (inte inuti en JSX-expression eller string)
  // Enkel heuristik: räkna balansen av `{` / `}` och kolla för `>` som inte är del av `=>` eller `/>`
  let depth = 0;
  let inString: '"' | "'" | null = null;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      const prev = c > 0 ? line[c - 1] : "";

      if (inString) {
        if (ch === inString && prev !== "\\") inString = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = ch as '"' | "'";
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (ch === ">" && depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findNextNonBlank(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() !== "") return i;
  }
  return -1;
}

/**
 * Tolka en JS-array/objektliteral från MDX till ett riktigt värde.
 *
 * MDX-props skrivs som JavaScript, inte JSON: nycklar är ofta ociterade
 * (`{ sv: "x" }`) och strängar kan vara enkelciterade. JSON.parse klarar
 * ingetdera. Vi normaliserar därför literalen först — men med en scanner,
 * inte en regex, eftersom ett kolon eller kommatecken INUTI en sträng inte
 * får röras ("förklaring: så här" skulle annars förstöras).
 *
 * Returnerar undefined om värdet inte går att tolka; anroparen behåller då
 * råsträngen så den åtminstone roundtrippar oförändrad.
 */
function parseJsLiteral(expr: string): unknown {
  try {
    return JSON.parse(expr);
  } catch {
    // Inte redan giltig JSON — normalisera nedan.
  }

  let out = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    if (quote) {
      if (ch === "\\") {
        out += ch + (expr[i + 1] ?? "");
        i++;
        continue;
      }
      if (ch === quote) {
        out += '"';
        quote = null;
        continue;
      }
      // En dubbelcitat inuti en enkelciterad sträng måste escapas när vi
      // byter citattecken, annars bryts strängen.
      out += ch === '"' ? '\\"' : ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch as '"' | "'";
      out += '"';
      continue;
    }

    // Efterföljande kommatecken före ] eller } — tillåtet i JS, inte i JSON.
    if (ch === ",") {
      const rest = expr.slice(i + 1);
      const next = /^\s*([\]}])/.exec(rest);
      if (next) continue;
    }

    // Ociterad nyckel: efter { eller , och följd av kolon.
    if (/[A-Za-z_$]/.test(ch)) {
      const rest = expr.slice(i);
      const m = /^([A-Za-z_$][A-Za-z0-9_$]*)(\s*):/.exec(rest);
      const prev = out.replace(/\s+$/, "").slice(-1);
      if (m && (prev === "{" || prev === ",")) {
        out += `"${m[1]}"${m[2]}:`;
        i += m[0].length - 1;
        continue;
      }
    }

    out += ch;
  }

  try {
    return JSON.parse(out);
  } catch {
    return undefined;
  }
}

/**
 * Parse props från "<Tag prop1="a" prop2={5} prop3>".
 */
function parseProps(openingTag: string): Record<string, PropValue> {
  const props: Record<string, PropValue> = {};

  // Ta bort ledande < och taggnamn, och avslutande /> eller >.
  // `\s*` före `<` är nödvändigt: nästlade barn (TimelineEvent, ComparisonColumn)
  // skickas hit med sin indentering kvar. Utan den matchade inte strip-regexen,
  // taggnamnet blev kvar och tolkades som boolean-prop — vilket skrev
  // `<ComparisonColumn ComparisonColumn ...>` tillbaka till filen.
  const inner = openingTag
    .replace(/^\s*<[A-Z][A-Za-z0-9]*\s*/, "")
    .replace(/\s*\/?>\s*$/, "")
    .trim();

  if (!inner) return props;

  // Scan values separately: datasets can nest objects inside arrays inside
  // objects. A fixed-depth regex silently turned their keys into boolean props.
  const propRe = /([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)?/g;

  let match;
  while ((match = propRe.exec(inner)) !== null) {
    const name = match[1];
    let rawValue: string | undefined;
    if (match[2]) {
      const start = propRe.lastIndex;
      let pos = start;
      let depth = 0;
      let quote: string | null = null;
      for (; pos < inner.length; pos++) {
        const ch = inner[pos];
        if (quote) {
          if (ch === "\\") { pos++; continue; }
          if (ch === quote) {
            quote = null;
            if (depth === 0) { pos++; break; }
          }
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) { pos++; break; }
        else if (depth === 0 && /\s/.test(ch)) break;
      }
      rawValue = inner.slice(start, pos);
      propRe.lastIndex = pos;
    }

    if (rawValue === undefined) {
      props[name] = true;
      continue;
    }

    if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
      // String literal
      props[name] = rawValue.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    } else if (rawValue.startsWith("{")) {
      // JSX expression - försök tolka som primitiv eller komplex
      const expr = rawValue.slice(1, -1).trim();
      if (expr === "true") props[name] = true;
      else if (expr === "false") props[name] = false;
      else if (/^-?\d+(\.\d+)?$/.test(expr)) props[name] = parseFloat(expr);
      else if (/^"(?:[^"\\]|\\.)*"$/.test(expr)) {
        // serializeAttr uses JSON for text containing both quote styles.
        // Decode ALL JSON escapes, including newlines and literal backslashes.
        const decoded = parseJsLiteral(expr);
        props[name] = typeof decoded === "string" ? decoded : expr;
      }
      else if (
        (expr.startsWith("[") && expr.endsWith("]")) ||
        (expr.startsWith("{") && expr.endsWith("}"))
      ) {
        // Array eller object literal. MDX skrivs som JavaScript, inte JSON —
        // { sv: "x" } är giltig JS men ogiltig JSON. Misslyckades parsningen
        // föll värdet tillbaka till en sträng, och templaten fick något den
        // inte kunde .map():a. I presentationsvyn märktes det inte (MDX
        // evaluerar uttrycket som riktig JS), men editorn kraschade.
        const parsed = parseJsLiteral(expr);
        props[name] = parsed === undefined ? expr : (parsed as PropValue);
      } else {
        props[name] = expr; // behåll som string (går att skriva ut igen)
      }
    }
  }

  return props;
}

/**
 * Serialize parsed structure tillbaka till MDX-källa.
 *
 * Overlays serialiseras som top-level komponenter EFTER sin parent — det är
 * formatet användaren skrev från början, så det rundtripping:ar rent.
 */
export function serializeMdx(parsed: ParsedPresentation): string {
  const frontmatter = matter.stringify("", parsed.frontmatter, YAML_OPTS).replace(/\n\s*$/, "\n");
  const blocks: string[] = [];

  for (const s of parsed.slides) {
    // Kommentarer och lös markdown som stod före sliden skrivs tillbaka som
    // eget block, annars raderas de vid varje sparning.
    if (s.leadingRaw) blocks.push(s.leadingRaw);

    let main = serializeComponent(s, 0);
    if (s.overlays && s.overlays.length > 0) {
      for (const o of s.overlays) {
        if (o.leadingRaw) main += `\n\n${o.leadingRaw}`;
        main += `\n\n${serializeComponent(o, 0, { skipOverlays: true })}`;
      }
    }
    blocks.push(main);
  }

  if (parsed.trailingRaw) blocks.push(parsed.trailingRaw);

  return `${frontmatter}\n${blocks.join("\n\n")}\n`;
}

/** Liten deterministisk sträng-hash (djb2) → kort base36-sträng. */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * Stabil innehålls-identitet per slide — en hash som ändras bara när slidens
 * faktiska innehåll ändras, INTE när den byter position.
 *
 * Härleds via parseMdx (samma parser som driver den faktiska slide-listan +
 * renderingen) → garanterat i takt med slide-ordningen och slide-antalet.
 * Overlays räknas in i sin parent-slides identitet.
 *
 * Används som React-nyckel för previewkorten i M-läget: korten kan då ligga
 * kvar i DOM:en (CSS `order` styr visuell placering) i stället för att
 * flyttas → iframe-previewerna laddas inte om vid omflyttning.
 */
export function slideIdentityHashes(rawMdx: string): string[] {
  return parseMdx(rawMdx).slides.map(slideContentHash);
}

/**
 * Samma identitet som ovan, men för EN redan parsad slide.
 *
 * Funktionen är ren och beror bara på slidens eget innehåll, vilket gör den
 * memoiserbar på slide-objektets identitet: eftersom alla mutationer är
 * spread-baserade behåller orörda slides sin referens, och då behöver bara
 * den ändrade sliden hashas om.
 *
 * Notera att `leadingRaw` medvetet INTE ingår — ett ändrat kommentarsblock
 * ska inte ogiltigförklara slidens miniatyr.
 */
export function slideContentHash(slide: ParsedComponent): string {
  // `slideId` är lagringsteknisk identitet, inte visuellt innehåll.
  // Om den räknas in här skulle första migreringen till permanenta ID:n
  // ogiltigförklara samtliga miniatyrer trots att ingen slide ändrats.
  const contentSlide = {
    ...slide,
    props: { ...slide.props },
  };
  delete contentSlide.props.slideId;
  let text = serializeComponent(contentSlide, 0, { skipOverlays: true });
  if (slide.overlays && slide.overlays.length > 0) {
    text +=
      "\n~ov~\n" +
      slide.overlays
        .map((o) => serializeComponent(o, 0, { skipOverlays: true }))
        .join("\n~ov~\n");
  }
  // Whitespace-normalisera: ren omformatering vid serialisering
  // (indentering, radbrytningar) ska INTE räknas som innehållsändring —
  // bara faktiska text-/prop-ändringar. Annars laddas container-templates
  // (Timeline m.fl.) om i onödan vid varje omflyttning.
  const norm = text.replace(/\s+/g, " ").trim();
  // Hash + längd → kollisionsrisken mellan olika slides blir försumbar.
  return `${hashString(norm)}_${norm.length.toString(36)}`;
}

interface SerializeOpts {
  /** Hoppa över komponentens egna overlays (de hanteras separat i top-level). */
  skipOverlays?: boolean;
}

export function serializeComponent(
  comp: ParsedComponent,
  indent: number,
  opts: SerializeOpts = {},
): string {
  const pad = "  ".repeat(indent);
  const propsStr = serializeProps(comp.props);

  const hasContent = comp.content !== null && comp.content !== undefined;
  const hasChildren = comp.children.length > 0;
  const isSelfClosing = !hasContent && !hasChildren;

  if (isSelfClosing) {
    // Enradig om props får plats, annars multi-line
    const singleLine = `${pad}<${comp.tag}${propsStr.inline} />`;
    if (singleLine.length <= 100 && !propsStr.inline.includes("\n")) {
      let result = singleLine;
      if (comp.notes) {
        result += `\n\n${pad}<Notes>\n${comp.notes}\n${pad}</Notes>`;
      }
      return result;
    }
    let result = `${pad}<${comp.tag}${propsStr.multiline}\n${pad}/>`;
    if (comp.notes) {
      result += `\n\n${pad}<Notes>\n${comp.notes}\n${pad}</Notes>`;
    }
    return result;
  }

  // Med children/content
  const openTag = propsStr.inline.length < 80 && !propsStr.inline.includes("\n")
    ? `<${comp.tag}${propsStr.inline}>`
    : `<${comp.tag}${propsStr.multiline}\n${pad}>`;

  // Prefer children när det finns — children är den strukturerade formen.
  // Content för templates som har nested JSX (Timeline, Comparison) är bara
  // råtext med samma JSX-taggar och skulle dubblera innehållet vid save.
  let body = "";
  if (hasChildren) {
    body = comp.children
      .map((child) => serializeComponent(child, indent + 1, opts))
      .join("\n");
  } else if (hasContent) {
    body = comp.content ?? "";
  }

  let result = `${pad}${openTag}\n${body}\n${pad}</${comp.tag}>`;
  if (comp.notes) {
    result += `\n\n${pad}<Notes>\n${comp.notes}\n${pad}</Notes>`;
  }
  return result;
}

// ============================================================================
// Pre-processing för presenter-mode (MDXRemote-rendering)
// ============================================================================

/**
 * Wrap:ar slides som har overlays i en `<SlideWithOverlays>`-komponent så
 * MDXRemote i presenter-mode kan rendera template + overlays tillsammans
 * inom samma slide-canvas.
 *
 * Editor-mode använder vår egen SlideRenderer som hanterar overlays direkt
 * från ParsedComponent.overlays-arrayen — denna pre-processing behövs bara
 * för presenter-mode.
 */
export function preprocessOverlaysForPresenter(rawMdx: string): string {
  const { frontmatter, slides } = parseMdx(rawMdx);

  let body = "";
  for (const slide of slides) {
    if (slide.overlays && slide.overlays.length > 0) {
      // Wrap template + overlays i SlideWithOverlays
      body += "\n<SlideWithOverlays>\n";
      body += serializeComponent(slide, 0, { skipOverlays: true });
      for (const overlay of slide.overlays) {
        body += "\n\n" + serializeComponent(overlay, 0, { skipOverlays: true });
      }
      body += "\n</SlideWithOverlays>\n";
    } else {
      body += "\n" + serializeComponent(slide, 0) + "\n";
    }
  }

  const fm = matter.stringify("", frontmatter).replace(/\n\s*$/, "\n");
  return `${fm}\n${body}`;
}

function serializeProps(props: Record<string, PropValue>): {
  inline: string;
  multiline: string;
} {
  const entries = Object.entries(props);
  if (entries.length === 0) return { inline: "", multiline: "" };

  const parts = entries.map(([k, v]) => {
    if (v === true) return k;
    if (typeof v === "string") {
      // Om stringen ser ut som en JSX-expression (array/object literal),
      // wrappa i {...}-syntax istället för "..." för att bevara
      // ursprungliga expression-formen (t.ex. options={[...]}).
      const trimmed = v.trim();
      const isArrayExpr = trimmed.startsWith("[") && trimmed.endsWith("]");
      const isObjectExpr = trimmed.startsWith("{") && trimmed.endsWith("}");
      // Template literals (prompt={`flerradig text`}) måste tillbaka som
      // expression. Som quoted attribut hamnade backtickarna som synlig text
      // på duken och radbrytningarna inuti ett "..."-attribut.
      const isTemplateExpr =
        trimmed.length >= 2 && trimmed.startsWith("`") && trimmed.endsWith("`");
      if (isArrayExpr || isObjectExpr || isTemplateExpr) {
        return `${k}={${v}}`;
      }
      return serializeAttr(k, v);
    }
    if (typeof v === "number") return `${k}={${v}}`;
    if (typeof v === "boolean") return `${k}={${v}}`;
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      // Arrays och objects serialiseras som JSON inom {...} så MDX kan
      // evaluera dem tillbaka till samma JS-värden.
      return `${k}={${JSON.stringify(v)}}`;
    }
    return `${k}="${String(v)}"`;
  });

  return {
    inline: " " + parts.join(" "),
    multiline: "\n  " + parts.join("\n  "),
  };
}

/**
 * Skriv ut ett prop som ett giltigt JSX-attribut.
 *
 * JSX har INGA escape-sekvenser i attributvärden: `title="han sa \"hej\""`
 * är inte ett citattecken utan ett syntaxfel — MDX vägrar kompilera filen
 * ("Unexpected character `\`"). De enda giltiga vägarna för ett värde som
 * innehåller citattecken är enkelfnuttar eller en JS-expression.
 *
 * Detta bet på riktigt: en underrubrik som Joel skrev med citattecken i
 * editorn gjorde hela presentationen omöjlig att ladda.
 */
function serializeAttr(name: string, value: string): string {
  if (!value.includes('"')) return `${name}="${value}"`;
  if (!value.includes("'")) return `${name}='${value}'`;
  // Båda sorternas fnuttar — då är en JS-sträng enda utvägen. JSON.stringify
  // ger giltig JS-syntax, och parseProps läser tillbaka {"..."} som sträng.
  return `${name}={${JSON.stringify(value)}}`;
}
