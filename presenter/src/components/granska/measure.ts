/**
 * Mätningarna i granskningsvyn, körda mot scenrutans dokument (samma origin).
 * Allt räknas om till scenens pixlar, 1600 × 900.
 *
 * Kontraktet kommer ur en filmserie och DESIGN.md:
 *   talarens yta          x 1068–1546, y 108–900 när bildläget är `talare`
 *                      x 1200–1600, y 440–900 när bildläget är `horn` (liten i hörnet)
 *   textningsmarginal  nedersta 135 px (y 765) i Stage-scener; källraden får 8 px
 *   minsta text        under 14 px flaggas, så att fotrader och etiketter syns i rapporten
 *
 * Text med sammanlagd opacitet under 0,35 räknas som dekor (vattenstämplar,
 * spegelbilder, promptens spöktext) och mäts inte. Text som en förälder klipper
 * bort (overflow: hidden eller clip) räknas bara med den del som syns.
 */

export const TALARE = { x1: 1068, x2: 1546, y1: 108 };
export const CORNER = { x1: 1200, y1: 440 };
export const MARGIN_Y = 765;
export const CREDIT_SLACK = 8;
export const MIN_FONT = 14;
export const DECOR_OPACITY = 0.35;

export type FlagType =
  | "talare" | "marginal" | "utanfor" | "klippt" | "liten" | "media" | "konsol" | "prompt" | "klick" | "schema" | "laddning";

export interface Flag {
  typ: FlagType;
  text: string;
}

export interface Measurement {
  flags: Flag[];
  minFont: number | null;
  texts: number;
  /** Synliga avsändare (chattrutor, prompt- och svarsmarkeringar) för prompt före svar. */
  senders: { key: string; who: "human" | "ai" }[];
  stage: boolean;
  layout: string | null;
}

const HUMAN = new Set(["elev", "du", "human", "larare", "lärare", "talare", "user", "manniska", "människa"]);
const clip = (text: string, n = 48) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
/** Alfa ur en beräknad färg: rgb(), rgba() och color(srgb … / a). */
function alphaOf(color: string): number {
  if (!color || color === "transparent") return 0;
  const slash = color.match(/\/\s*([\d.]+)(%)?\s*\)$/);
  if (slash) return slash[2] ? Number(slash[1]) / 100 : Number(slash[1]);
  const rgba = color.match(/rgba\([^)]*,\s*([\d.]+)\s*\)$/);
  return rgba ? Number(rgba[1]) : 1;
}

export function measure(doc: Document, win: Window, greenscreen = true): Measurement {
  const flags: Flag[] = [];
  const canvas = doc.querySelector<HTMLElement>("section[data-scene]");
  const box = canvas?.getBoundingClientRect();
  const k = box && box.width > 0 ? 1600 / box.width : 1;
  const ox = box ? box.left : 0;
  const oy = box ? box.top : 0;
  const layout = canvas?.dataset.layout ?? null;
  const stage = Boolean(canvas);

  /** Sammanlagd opacitet (0 = dold) och de rutor som föräldrarna klipper till. */
  type Clip = { box: DOMRect; x: boolean; y: boolean };
  const view = (el: Element | null): { opacity: number; clips: Clip[] } => {
    let opacity = 1;
    const clips: Clip[] = [];
    for (let e = el; e && e !== doc.documentElement; e = e.parentElement) {
      const cs = win.getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return { opacity: 0, clips };
      opacity *= Number(cs.opacity);
      if (opacity < 0.05) return { opacity: 0, clips };
      // Behållare som täcker hela bilden räknas inte: då skulle text utanför bild aldrig synas i mätningen.
      // Axelvis: overflow-x: clip klipper bara i sidled (ekot), overflow-y bara i höjdled.
      const x = /hidden|clip/.test(cs.overflowX), y = /hidden|clip/.test(cs.overflowY);
      if (e !== doc.body && (x || y)) {
        const box = e.getBoundingClientRect();
        if (box.width < win.innerWidth * 0.9 || box.height < win.innerHeight * 0.9) clips.push({ box, x, y });
      }
    }
    return { opacity, clips };
  };
  const isHidden = (el: Element | null): boolean => view(el).opacity < 0.05;
  const clipTo = (r: DOMRect, clips: Clip[]) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (const c of clips) {
      if (c.x) { x1 = Math.max(x1, c.box.left); x2 = Math.min(x2, c.box.right); }
      if (c.y) { y1 = Math.max(y1, c.box.top); y2 = Math.min(y2, c.box.bottom); }
    }
    // Rutor på ett par pixlar är skärmläsarkopior (sr-only), inte synlig text.
    return x2 - x1 > 2 && y2 - y1 > 2 ? { x1, y1, x2, y2 } : null;
  };

  let minFont: number | null = null;
  let texts = 0;
  const found: Record<"talare" | "marginal" | "utanfor" | "liten" | "klippt", string[]> = { talare: [], marginal: [], utanfor: [], liten: [], klippt: [] };
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest("script, style, noscript, nextjs-portal, [data-pdf-exclude='true']")) continue;
    const { opacity, clips } = view(el);
    // Textens egen färg räknas också: en kontur utan fyllning på 0,15 är en vattenstämpel.
    const cs = win.getComputedStyle(el);
    const strokeWidth = parseFloat(cs.getPropertyValue("-webkit-text-stroke-width")) || 0;
    const paint = Math.max(alphaOf(cs.color), strokeWidth > 0 ? alphaOf(cs.getPropertyValue("-webkit-text-stroke-color")) : 0);
    if (opacity * paint < DECOR_OPACITY) continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    const raw = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    const cut = raw.map((r) => clipTo(r, clips));
    const rects = cut.filter((r): r is NonNullable<typeof r> => r !== null);
    if (rects.length === 0) continue;
    texts++;
    const size = parseFloat(cs.fontSize) * k;
    // Klippt: synlig text som en förälder skär av en bit av. Helt bortklippt text (dolda framtida lägen) räknas inte.
    // Toleransen följer textstorleken: negativ spärrning i stor stil sticker ut några pixlar utan att något syns avskuret.
    const tolerance = Math.max(3, parseFloat(cs.fontSize) * 0.2);
    if (raw.some((r, i) => cut[i] && (cut[i]!.x2 - cut[i]!.x1 < r.width - tolerance || cut[i]!.y2 - cut[i]!.y1 < r.height - tolerance))) found.klippt.push(clip(text, 40));
    if (minFont === null || size < minFont) minFont = size;
    if (size < MIN_FONT) found.liten.push(`${clip(text)} (${Math.round(size)} px)`);
    const credit = /credit/i.test(el.className?.toString() ?? "") || Boolean(el.closest("[class*=credit]"));
    let inTalare = false;
    let inMargin = false;
    let outside = false;
    // Textens rutor följer typsnittets innehållsyta, som kan vara högre än radhöjden. Mät radboxen.
    const lineHeight = parseFloat(cs.lineHeight);
    for (const r of rects) {
      const x1 = (r.x1 - ox) * k, x2 = (r.x2 - ox) * k;
      let y1 = (r.y1 - oy) * k, y2 = (r.y2 - oy) * k;
      const excess = Number.isFinite(lineHeight) ? (y2 - y1 - lineHeight) / 2 : 0;
      if (excess > 0) { y1 += excess; y2 -= excess; }
      if (greenscreen && layout === "talare" && x2 > TALARE.x1 + 1 && x1 < TALARE.x2 && y2 > TALARE.y1) inTalare = true;
      if (greenscreen && layout === "horn" && x2 > CORNER.x1 + 1 && y2 > CORNER.y1 + 1) inTalare = true;
      if (greenscreen && stage && y2 > MARGIN_Y + (credit ? CREDIT_SLACK : 1)) inMargin = true;
      if (x1 < -2 || y1 < -2 || x2 > 1602 || y2 > 902) outside = true;
    }
    if (inTalare) found.talare.push(clip(text));
    if (inMargin) found.marginal.push(`${clip(text)}${credit ? " (källrad)" : ""}`);
    if (outside) found.utanfor.push(clip(text));
  }
  if (found.talare.length) flags.push({ typ: "talare", text: `Text i talarens yta: ${found.talare.slice(0, 4).join(" · ")}` });
  if (found.marginal.length) flags.push({ typ: "marginal", text: `Text i textningsmarginalen: ${found.marginal.slice(0, 4).join(" · ")}` });
  if (found.utanfor.length) flags.push({ typ: "utanfor", text: `Text utanför bild: ${found.utanfor.slice(0, 4).join(" · ")}` });
  if (found.liten.length) flags.push({ typ: "liten", text: `Liten text: ${found.liten.slice(0, 4).join(" · ")}` });
  if (found.klippt.length) flags.push({ typ: "klippt", text: `Text som skärs av: ${found.klippt.slice(0, 4).join(" · ")}` });

  // Medier som inte har laddats.
  const broken: string[] = [];
  for (const img of doc.querySelectorAll<HTMLImageElement>("img")) {
    if (img.getAttribute("src") && img.complete && img.naturalWidth === 0) broken.push(img.getAttribute("src")!);
  }
  for (const media of doc.querySelectorAll<HTMLMediaElement>("video, audio")) {
    const src = media.currentSrc || media.getAttribute("src") || media.querySelector("source")?.getAttribute("src") || "";
    if (media.error || (src && media.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) broken.push(src || media.tagName.toLowerCase());
  }
  if (broken.length) flags.push({ typ: "media", text: `Trasiga medier: ${broken.slice(0, 4).join(" · ")}` });

  // Avsändare: chattrutor (data-who) i första hand. Finns inga används prompt- och
  // svarsmarkeringarna (humanDot, aiDot). Chattfönstrets rubrik har en AI-prick som
  // dekor och ska inte räknas som ett svar.
  const senders: Measurement["senders"] = [];
  const bubbles = doc.querySelectorAll<HTMLElement>("[data-who]");
  const candidates = bubbles.length ? bubbles : doc.querySelectorAll<HTMLElement>("[class*=humanDot], [class*=aiDot]");
  candidates.forEach((el, i) => {
    if (el.closest("[aria-hidden='true']") || isHidden(el)) return;
    const who = el.dataset.who
      ? (el.dataset.who === "ai" ? "ai" : HUMAN.has(el.dataset.who) ? "human" : null)
      : (/aiDot/.test(el.className.toString()) ? "ai" : "human");
    if (!who) return;
    senders.push({ key: `${el.tagName}:${i}`, who });
  });

  return { flags, minFont: minFont === null ? null : Math.round(minFont * 10) / 10, texts, senders, stage, layout };
}
