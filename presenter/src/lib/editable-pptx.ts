/**
 * Redigerbar PowerPoint-export (server-side).
 *
 * Till skillnad från `full-presentation-pptx.ts` (som fotograferar slides som
 * bilder) bygger den här exporten RIKTIGA textrutor som mottagaren kan
 * redigera i PowerPoint. Priset är att layouten förenklas: varje slide blir
 * kicker + rubrik + brödtext/punkter/citat i temats färger — inte en kopia
 * av presenter-designen. Animationer, partiklar och mockups följer inte med.
 *
 * Användningsfall: någon annan (arrangör, chef, kollega) ska kunna ta över
 * och redigera innehållet utan tillgång till presenter.
 */

import PptxGenJS from "pptxgenjs";
import { parseMdx, type ParsedComponent, type PropValue } from "./mdx-parser";
import { getTheme } from "@/themes";
import { AGARE } from "./agare";

const PAGE_W = 13.333;
const PAGE_H = 7.5;

/** Props som bär "liten rad ovanför rubriken". Ordningen är prioritet. */
const KICKER_KEYS = ["kicker", "chapter", "eyebrow", "label", "kapitel", "context"];
/** Props som bär slidens huvudrubrik. Ordningen är prioritet. */
const TITLE_KEYS = [
  "title",
  "heading",
  "statement",
  "question",
  "definition",
  "term",
  "word",
  "name",
  "headline",
];
/** Props som bär underrubrik/ingress. */
const SUBTITLE_KEYS = ["subtitle", "subheading", "lead", "intro", "tagline", "description"];
/** Props som bär citat + attribution. */
const QUOTE_KEYS = ["quote", "citat"];
const ATTRIBUTION_KEYS = ["author", "quoteSource", "attribution", "person", "speaker"];
/** Props som bär källhänvisning (liten text nederst). */
const SOURCE_KEYS = ["source", "sources", "kalla"];

/**
 * Props som aldrig är slide-text: media, layout, styling, beteende.
 * Allt som inte träffas av listorna ovan och inte står här blir brödtext.
 */
const NON_TEXT_KEYS = new Set([
  "src", "image", "images", "video", "poster", "audio", "href", "url", "link",
  "bg", "background", "backgroundImage", "overlay", "overlayMode", "logo",
  "theme", "variant", "layout", "align", "position", "size", "mode", "style",
  "color", "accent", "textColor", "id", "className", "qr", "code", "icon",
  "delay", "duration", "speed", "steps", "step", "autoplay", "loop", "muted",
  "x", "y", "w", "h", "width", "height", "scale", "rotate", "opacity",
]);

/** Ser värdet ut som en sökväg, URL eller färg snarare än läsbar text? */
function looksLikeAsset(value: string): boolean {
  const v = value.trim();
  return (
    v.startsWith("/") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("#") ||
    v.startsWith("rgba(") ||
    v.startsWith("var(") ||
    /\.(png|jpe?g|webp|gif|svg|mp4|webm|mp3|wav)$/i.test(v)
  );
}

/**
 * Ser värdet ut som ett config-token (variant, storlek, ton) snarare än
 * innehåll? Fångar t.ex. size="lg", tone="positive", align="left" på props
 * vars nyckelnamn vi inte känner igen.
 */
const CONFIG_VALUES =
  /^(xs|sm|md|lg|xl|2xl|3xl|left|right|center|top|bottom|start|end|dark|light|positive|negative|neutral|primary|secondary|muted|none|true|false|auto|full|half|whisper|bridge|shout|landing|fade|slide|scale|snap)$/i;
function looksLikeConfig(value: string): boolean {
  const v = value.trim();
  // Korta token-värden utan mellanslag är nästan alltid config, inte innehåll
  // (size="lg", number="02"). Riktig slide-text är längre eller flerordig.
  return CONFIG_VALUES.test(v) || (v.length <= 3 && !v.includes(" "));
}

/** Ta bort markdown-/MDX-syntax men behåll läsbar text. */
function stripMarkup(text: string): string {
  return text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<[^>\n]+>/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/** Plocka första fontfamiljen ur en CSS font-stack: '"SF Pro", Inter, ...' → 'SF Pro'. */
function firstFont(stack: string): string {
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || "Calibri";
}

/** '#aabbcc' → 'AABBCC'. Icke-hex (rgba/var) → fallback. */
function hex(color: string, fallback: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color.trim());
  return m ? m[1].toUpperCase() : fallback;
}

interface SlideText {
  kicker?: string;
  title?: string;
  subtitle?: string;
  paragraphs: string[];
  bullets: string[];
  quote?: string;
  attribution?: string;
  source?: string;
  notes?: string;
}

/** Extrahera läsbara textvärden ur en array-prop (strängar eller objekt). */
function textFromArray(arr: unknown[]): string[] {
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === "string") {
      if (!looksLikeAsset(item) && item.trim()) out.push(stripMarkup(item));
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      const parts = Object.entries(item as Record<string, unknown>)
        .filter(
          ([k, v]) =>
            typeof v === "string" &&
            !NON_TEXT_KEYS.has(k) &&
            !looksLikeAsset(v) &&
            // Endast rena config-ord filtreras här — korta värden ("52", "%")
            // är ofta statistik i array-objekt och ska behållas.
            !CONFIG_VALUES.test(v.trim()) &&
            v.trim(),
        )
        .map(([, v]) => stripMarkup(String(v)));
      if (parts.length) out.push(parts.join(" — "));
    }
  }
  return out;
}

/** Hämta första sträng-propen som matchar någon av nycklarna. */
function pickProp(
  props: Record<string, PropValue>,
  keys: string[],
  used: Set<string>,
): string | undefined {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === "string" && v.trim() && !looksLikeAsset(v)) {
      used.add(key);
      return stripMarkup(v);
    }
  }
  return undefined;
}

/**
 * Generisk textextraktion ur en parsad slide-komponent. Templates har 150+
 * olika prop-scheman, så vi jobbar heuristiskt: kända nycklar → roller,
 * övriga strängar → brödtext, arrays → punktlistor, children-markdown →
 * stycken/punkter. Målet är att ALLT textinnehåll följer med, i rimlig
 * hierarki — inte att återskapa layouten.
 */
function extractSlideText(slide: ParsedComponent): SlideText {
  const used = new Set<string>();
  const result: SlideText = { paragraphs: [], bullets: [] };

  result.kicker = pickProp(slide.props, KICKER_KEYS, used);
  result.title = pickProp(slide.props, TITLE_KEYS, used);
  result.subtitle = pickProp(slide.props, SUBTITLE_KEYS, used);
  result.quote = pickProp(slide.props, QUOTE_KEYS, used);
  result.attribution = pickProp(slide.props, ATTRIBUTION_KEYS, used);
  result.source = pickProp(slide.props, SOURCE_KEYS, used);
  KICKER_KEYS.concat(TITLE_KEYS, SUBTITLE_KEYS, QUOTE_KEYS, ATTRIBUTION_KEYS, SOURCE_KEYS)
    .forEach((k) => used.add(k));

  // Övriga props: strängar → brödtext, arrays → punkter
  for (const [key, value] of Object.entries(slide.props)) {
    if (used.has(key) || NON_TEXT_KEYS.has(key)) continue;
    if (
      typeof value === "string" &&
      value.trim() &&
      !looksLikeAsset(value) &&
      !looksLikeConfig(value)
    ) {
      result.paragraphs.push(stripMarkup(value));
    } else if (Array.isArray(value)) {
      result.bullets.push(...textFromArray(value));
    }
  }

  // Children-markdown (mellan öppnings- och stängtagg): "- rad" → punkt,
  // annat → stycke. Nestade JSX-barn (Timeline → TimelineEvent) tas via
  // children-parsningen istället, så rader som är taggar filtreras bort.
  if (slide.content) {
    const lines = slide.content.split("\n");
    let inJsxBlock = 0;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^<[A-Za-z/]/.test(line)) {
        // Håll koll på om vi är inne i ett nested JSX-block (räknas via children)
        if (/^<[A-Z]/.test(line) && !/\/>\s*$/.test(line) && !/<\/[A-Z]/.test(line)) inJsxBlock++;
        if (/^<\/[A-Z]/.test(line) && inJsxBlock > 0) inJsxBlock--;
        continue;
      }
      if (inJsxBlock > 0) continue;
      if (line.startsWith("{/*")) continue;
      const clean = stripMarkup(line.replace(/^[-*]\s+/, ""));
      if (!clean) continue;
      if (/^[-*]\s+/.test(line)) result.bullets.push(clean);
      else result.paragraphs.push(clean);
    }
  }

  // Nestade komponenter (TimelineEvent, ComparisonColumn, …): deras text-props
  // blir punkter med "rubrik — text"-form.
  for (const child of slide.children) {
    if (child.tag === "Notes") continue;
    const childUsed = new Set<string>();
    const childTitle = pickProp(child.props, TITLE_KEYS.concat(KICKER_KEYS), childUsed);
    const childTexts: string[] = [];
    for (const [key, value] of Object.entries(child.props)) {
      if (childUsed.has(key) || NON_TEXT_KEYS.has(key)) continue;
      if (
        typeof value === "string" &&
        value.trim() &&
        !looksLikeAsset(value) &&
        !looksLikeConfig(value)
      ) {
        childTexts.push(stripMarkup(value));
      } else if (Array.isArray(value)) {
        childTexts.push(...textFromArray(value));
      }
    }
    if (child.content) {
      const clean = stripMarkup(child.content);
      if (clean) childTexts.push(clean);
    }
    const combined = [childTitle, childTexts.join(" · ")].filter(Boolean).join(" — ");
    if (combined) result.bullets.push(combined);
  }

  // Ingen rubrik-prop men kort children-text (HookStatement, GiantText m.fl.):
  // lyft styckena till rubrik.
  if (!result.title && result.paragraphs.length > 0) {
    const joined = result.paragraphs.join("\n");
    if (joined.length <= 220) {
      result.title = joined;
      result.paragraphs = [];
    }
  }
  if (!result.title) {
    // Fallback: kickern blir rubrik — men då ska den inte stå dubbelt
    result.title = result.kicker ?? slide.tag;
    result.kicker = undefined;
  }

  result.notes = slide.notes ? stripMarkup(slide.notes) : undefined;
  return result;
}

/**
 * Bygg en redigerbar .pptx från MDX-källa. Returnerar filen som Buffer
 * (körs server-side — i API-routen eller i skript).
 */
export async function buildEditablePptx(source: string): Promise<Buffer> {
  const { frontmatter, slides } = parseMdx(source);
  const theme = getTheme(typeof frontmatter.theme === "string" ? frontmatter.theme : undefined);

  const bg = hex(theme.bg, "0A0908");
  const text = hex(theme.text, "F5F5F4");
  const textMuted = hex(theme.textMuted, "A8A29E");
  const accent = hex(theme.accent, "22D3EE");
  const fontDisplay = firstFont(theme.fontDisplay);
  const fontBody = firstFont(theme.fontBody);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PRESENTER_16_9", width: PAGE_W, height: PAGE_H });
  pptx.layout = "PRESENTER_16_9";
  pptx.title = typeof frontmatter.title === "string" ? frontmatter.title : "Presentation";
  pptx.author = typeof frontmatter.author === "string" ? frontmatter.author : AGARE.namn;

  slides.forEach((parsed, i) => {
    const t = extractSlideText(parsed);
    const slide = pptx.addSlide();
    slide.background = { color: bg };

    let y = 0.55;

    if (t.kicker) {
      slide.addText(t.kicker.toUpperCase(), {
        x: 0.7, y, w: PAGE_W - 1.4, h: 0.4,
        fontFace: fontBody, fontSize: 12, color: accent,
        charSpacing: 3, bold: true,
      });
      y += 0.5;
    }

    // Accent-linje under kicker/ovanför rubrik — temats signatur
    slide.addShape("rect", {
      x: 0.7, y: y + 0.05, w: 0.55, h: 0.045, fill: { color: accent }, line: { type: "none" },
    });
    y += 0.25;

    const hasBody =
      t.paragraphs.length > 0 || t.bullets.length > 0 || !!t.quote || !!t.subtitle;
    const titleH = hasBody ? 1.6 : 4.2;
    slide.addText(t.title ?? "", {
      x: 0.7, y, w: PAGE_W - 1.4, h: titleH,
      fontFace: fontDisplay, fontSize: hasBody ? 32 : 40, color: text,
      valign: hasBody ? "top" : "middle",
      fit: "shrink", lineSpacingMultiple: 1.05,
    });
    y += titleH + 0.1;

    if (t.subtitle) {
      slide.addText(t.subtitle, {
        x: 0.7, y, w: PAGE_W - 1.4, h: 0.7,
        fontFace: fontBody, fontSize: 16, color: textMuted,
        fit: "shrink", valign: "top",
      });
      y += 0.8;
    }

    const bodyBottom = PAGE_H - 0.75;
    const bodyH = Math.max(bodyBottom - y, 0.8);

    if (t.quote) {
      const quoteRuns: PptxGenJS.TextProps[] = [
        {
          text: `”${t.quote}”`,
          options: { fontFace: fontDisplay, fontSize: 22, color: text, italic: true },
        },
      ];
      if (t.attribution) {
        quoteRuns.push({
          text: `\n— ${t.attribution}`,
          options: { fontFace: fontBody, fontSize: 14, color: textMuted, breakLine: true },
        });
      }
      slide.addText(quoteRuns, {
        x: 0.7, y, w: PAGE_W - 1.4, h: Math.min(1.8, bodyH),
        valign: "top", fit: "shrink",
      });
      y += Math.min(1.9, bodyH);
    }

    const bodyRuns: PptxGenJS.TextProps[] = [];
    for (const p of t.paragraphs) {
      bodyRuns.push({
        text: p,
        options: { breakLine: true, paraSpaceAfter: 8 },
      });
    }
    for (const b of t.bullets) {
      bodyRuns.push({
        text: b,
        options: { breakLine: true, bullet: { characterCode: "2022", indent: 12 }, paraSpaceAfter: 6 },
      });
    }
    if (bodyRuns.length > 0 && y < bodyBottom - 0.4) {
      slide.addText(bodyRuns, {
        x: 0.7, y, w: PAGE_W - 1.4, h: bodyBottom - y,
        fontFace: fontBody, fontSize: 16, color: text,
        valign: "top", fit: "shrink", lineSpacingMultiple: 1.15,
      });
    }

    if (t.source) {
      slide.addText(t.source, {
        x: 0.7, y: PAGE_H - 0.55, w: PAGE_W - 2.4, h: 0.35,
        fontFace: fontBody, fontSize: 10, color: textMuted,
      });
    }
    slide.addText(String(i + 1), {
      x: PAGE_W - 1.1, y: PAGE_H - 0.55, w: 0.5, h: 0.35,
      fontFace: fontBody, fontSize: 10, color: textMuted, align: "right",
    });

    if (t.notes) slide.addNotes(t.notes);
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
