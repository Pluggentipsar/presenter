"use client";

import { AGARE } from "./agare";
import type { StepController } from "./slide-steps";
import { buildBlockText, collectTextNodeContainers } from "./text-blocks";

interface ExportInput {
  /** Element vi ska fånga (slide-stage). */
  slideStageRef: React.RefObject<HTMLElement | null>;
  /** Aktuellt slide-index — sparas så vi kan återställa efter export. */
  currentIndex: number;
  /** Totalt antal slides. */
  total: number;
  /** Navigera till slide. */
  setIndex: (i: number) => void;
  /** Step-controller för aktuell slide (kan vara null mellan navigeringar). */
  stepsControllerRef: React.RefObject<StepController | null>;
  /** Presentationens titel — används i filnamn. */
  title: string;
  /** Slug — fallback för filnamn. */
  slug?: string;
  /** Talarnotiser per slide-index — hamnar i PowerPoints anteckningsfält. */
  notes?: (string | null)[];
  /** Callback för progressindikation. */
  onProgress?: (current: number, total: number, label: string) => void;
}

const PAGE_W = 13.333;
const PAGE_H = 7.5;

/** Ett textblock uppmätt i DOM:en, redo att bli en PowerPoint-textruta. */
interface CapturedTextBlock {
  text: string;
  /** Position + storlek i px, relativt slide-stage. */
  x: number;
  y: number;
  w: number;
  h: number;
  fontSizePx: number;
  fontFamily: string;
  colorHex: string;
  alpha: number;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right" | "justify";
  lineHeightPx: number;
  letterSpacingPx: number;
}

/** '"Fraunces", Georgia, serif' → 'Fraunces' */
function firstFontFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || "Calibri";
}

/** 'rgb(16, 20, 28)' / 'rgba(…)' → { hex, alpha } */
function cssColorToHex(color: string): { hex: string; alpha: number } {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/.exec(color);
  if (!m) return { hex: "FFFFFF", alpha: 1 };
  const toHex = (n: string) => Number(n).toString(16).padStart(2, "0").toUpperCase();
  return {
    hex: `${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`,
    alpha: m[4] !== undefined ? parseFloat(m[4]) : 1,
  };
}

/**
 * Samla alla textblock i slide-stage: gå igenom textnoder, klättra upp till
 * närmaste block-container (förbi inline/inline-block-spans så ord-för-ord-
 * reveals hålls ihop som EN ruta), mät position och typografi.
 *
 * Om en container innehåller en annan container ur mängden används bara dess
 * egna textnoder (annars dubbleras den nästlade texten).
 */
function collectTextBlocks(stage: HTMLElement): {
  blocks: CapturedTextBlock[];
  containers: HTMLElement[];
} {
  const stageRect = stage.getBoundingClientRect();
  const ownNodes = collectTextNodeContainers(stage);
  const firstTextParent = new Map<HTMLElement, HTMLElement>();
  for (const [el, nodes] of ownNodes) {
    firstTextParent.set(el, nodes[0]?.parentElement ?? el);
  }

  const containers = [...ownNodes.keys()];
  const blocks: CapturedTextBlock[] = [];

  for (const el of containers) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // Utanför stagen (t.ex. övergångs-slides som animerar ut) → hoppa
    if (
      rect.right < stageRect.left + 1 ||
      rect.left > stageRect.right - 1 ||
      rect.bottom < stageRect.top + 1 ||
      rect.top > stageRect.bottom - 1
    )
      continue;

    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) continue;

    // Typografi tas från elementet närmast texten (spans kan ha egen stil)
    const src = firstTextParent.get(el) ?? el;
    const srcStyle = src === el ? style : getComputedStyle(src);

    const { hex, alpha } = cssColorToHex(srcStyle.color);
    if (alpha < 0.05) continue;

    const fontSizePx = parseFloat(srcStyle.fontSize) || 16;
    const lineHeightPx =
      srcStyle.lineHeight === "normal"
        ? fontSizePx * 1.2
        : parseFloat(srcStyle.lineHeight) || fontSizePx * 1.2;

    let text = buildBlockText(ownNodes.get(el) ?? [], lineHeightPx);
    if (!text) continue;
    if (srcStyle.textTransform === "uppercase") text = text.toUpperCase();
    const letterSpacingPx =
      srcStyle.letterSpacing === "normal" ? 0 : parseFloat(srcStyle.letterSpacing) || 0;
    const align = (["left", "center", "right", "justify"] as const).includes(
      style.textAlign as "left",
    )
      ? (style.textAlign as CapturedTextBlock["align"])
      : "left";

    blocks.push({
      text,
      x: rect.left - stageRect.left,
      y: rect.top - stageRect.top,
      w: rect.width,
      h: rect.height,
      fontSizePx,
      fontFamily: firstFontFamily(srcStyle.fontFamily),
      colorHex: hex,
      alpha,
      bold: parseInt(srcStyle.fontWeight, 10) >= 600,
      italic: srcStyle.fontStyle === "italic",
      align,
      lineHeightPx,
      letterSpacingPx,
    });
  }

  // Sortera uppifrån och ner så textrutornas z-ordning känns naturlig
  blocks.sort((a, b) => a.y - b.y || a.x - b.x);
  return { blocks, containers };
}

/**
 * Dölj texten i givna containers inför fotografering — layouten behålls
 * (glyferna blir transparenta) så bakgrund, kort, ornament och bilder
 * hamnar i skärmdumpen medan texten läggs tillbaka som redigerbara rutor.
 * Returnerar en restore-funktion.
 */
function hideTextForCapture(containers: HTMLElement[]): () => void {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    [data-pptx-hide-text], [data-pptx-hide-text] * {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      text-shadow: none !important;
      outline: none !important;
    }
  `;
  document.head.appendChild(styleEl);

  const gradientRestores: Array<() => void> = [];
  for (const el of containers) {
    el.setAttribute("data-pptx-hide-text", "true");
    // Gradient-text (background-clip: text) fyller glyferna med bakgrunden —
    // den måste också släckas, annars syns texten ändå i skärmdumpen.
    const candidates = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))];
    for (const c of candidates) {
      const cs = getComputedStyle(c);
      if ((cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text") && cs.backgroundImage !== "none") {
        const prev = c.style.backgroundImage;
        c.style.backgroundImage = "none";
        gradientRestores.push(() => {
          c.style.backgroundImage = prev;
        });
      }
    }
  }

  return () => {
    for (const el of containers) el.removeAttribute("data-pptx-hide-text");
    gradientRestores.forEach((fn) => fn());
    styleEl.remove();
  };
}

/**
 * Bygger en PowerPoint-export (.pptx) av hela presentationen — med designen
 * kvar OCH redigerbar text.
 *
 * Hybridmetod per slide:
 *   1. Navigera dit, vänta in entry-animationer, stega igenom alla steps
 *   2. Mät upp alla textblock (position, typsnitt, storlek, färg)
 *   3. Dölj texten (transparenta glyfer — layouten ligger kvar) och
 *      fotografera sliden → all design utom texten hamnar i bakgrundsbilden
 *   4. Lägg bakgrundsbilden fullbredd + redigerbara textrutor på uppmätta
 *      positioner med matchande typografi
 *
 * Resultatet ser nästan ut som presenter — men rubriker, brödtext och citat
 * går att redigera i PowerPoint. Talarnotiser hamnar i anteckningsfältet.
 * Obs: mottagare utan temats typsnitt installerade får fontsubstitution.
 */
export async function exportFullPresentationPptx({
  slideStageRef,
  currentIndex,
  total,
  setIndex,
  stepsControllerRef,
  title,
  slug,
  notes = [],
  onProgress,
}: ExportInput): Promise<void> {
  const [{ domToCanvas }, { default: PptxGenJS }] = await Promise.all([
    import("modern-screenshot"),
    import("pptxgenjs"),
  ]);

  const pptx = new PptxGenJS();
  // 13.333 × 7.5 tum = PowerPoints standard-widescreen (16:9), matchar 1920×1080
  pptx.defineLayout({ name: "PRESENTER_16_9", width: PAGE_W, height: PAGE_H });
  pptx.layout = "PRESENTER_16_9";
  pptx.title = title;
  pptx.author = AGARE.namn;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  // Vänta på två rAF så vi vet att React + framer-motion har commited
  const nextFrame = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    );

  const originalIndex = currentIndex;

  try {
    for (let i = 0; i < total; i++) {
      onProgress?.(i, total, `Renderar slide ${i + 1} av ${total}`);

      // Navigera till slide
      setIndex(i);
      await nextFrame();
      // Entry-animation för slide-byte (AnimatePresence spring) + tid för
      // mount/useEffect så useSlideSteps registrerar totalSteps
      await sleep(1300);

      // Stega igenom alla steps om sliden är stegvis
      const ctrl = stepsControllerRef.current;
      if (ctrl) {
        const totalSteps = ctrl.getTotalSteps();
        for (let s = ctrl.getCurrentStep(); s < totalSteps - 1; s++) {
          ctrl.tryNextStep();
          // Vänta på stagger + reveal-animationer per steg
          await sleep(700);
        }
      }
      // Låt långa entry-animationer avsluta (samma budget som PDF-exporten)
      await sleep(2200);

      const stage = slideStageRef.current;
      if (!stage) continue;

      const stageRect = stage.getBoundingClientRect();
      const { blocks, containers } = collectTextBlocks(stage);

      // Dölj texten och fotografera designen
      const restoreText = hideTextForCapture(containers);
      await nextFrame();
      let canvas: HTMLCanvasElement;
      try {
        canvas = await domToCanvas(stage, {
          backgroundColor: "#0a0908",
          scale: 1, // 1:1 — slide-stage är redan ~1920×1080 i fullskärm
          // Filtrera bort overlay-element så menu/modaler inte syns i fångsten
          filter: (el) => {
            if (!(el instanceof HTMLElement)) return true;
            const cls = el.className ?? "";
            if (typeof cls !== "string") return true;
            if (cls.includes("z-40") || cls.includes("z-50")) return false;
            if (el.dataset?.pdfExclude === "true") return false;
            return true;
          },
          // Hämta CDN-bilder med crossOrigin så de hamnar i canvas
          fetch: { requestInit: { mode: "cors" } },
        });
      } finally {
        restoreText();
      }

      // Beräkna proportionellt så bilden passar på 16:9-sliden
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = PAGE_W / PAGE_H;
      let drawW = PAGE_W;
      let drawH = PAGE_H;
      let drawX = 0;
      let drawY = 0;
      if (imgRatio > pageRatio) {
        drawW = PAGE_W;
        drawH = PAGE_W / imgRatio;
        drawY = (PAGE_H - drawH) / 2;
      } else {
        drawH = PAGE_H;
        drawW = PAGE_H * imgRatio;
        drawX = (PAGE_W - drawW) / 2;
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const slide = pptx.addSlide();
      // Svart fond bakom bilden om det blir letterbox
      slide.background = { color: "0A0908" };
      slide.addImage({
        data: imgData,
        x: drawX,
        y: drawY,
        w: drawW,
        h: drawH,
      });

      // Redigerbara textrutor ovanpå designbilden. Stage-px → tum via
      // bildens faktiska placering (drawW motsvarar stageRect.width).
      const inPerPx = drawW / stageRect.width;
      const ptPerPx = inPerPx * 72;
      for (const b of blocks) {
        const fontSizePt = Math.max(b.fontSizePx * ptPerPx, 5);

        // Mottagaren har sällan temats typsnitt installerade — PowerPoint
        // substituerar då till ett ofta BREDARE typsnitt, och text som låg
        // på en rad i webbläsaren radbryts ("52" → "5/2", rubriker kraschar
        // in i underrubriker). Motmedel:
        //  - Enradiga block: stäng av radbrytning helt — texten får hellre
        //    sticka ut någon millimeter än brytas.
        //  - Fleradiga block: bredda rutan ~14 % (behåll ankarpunkten efter
        //    justering) och låt PowerPoint autokrympa vid overflow.
        const isSingleLine =
          !b.text.includes("\n") && b.h < b.lineHeightPx * 1.6;
        let x = drawX + b.x * inPerPx;
        let w = b.w * inPerPx + 0.06;
        if (!isSingleLine) {
          const extra = w * 0.14;
          if (b.align === "center") x -= extra / 2;
          else if (b.align === "right") x -= extra;
          w += extra;
        }

        slide.addText(b.text, {
          x,
          y: drawY + b.y * inPerPx,
          w: Math.min(w, PAGE_W),
          h: Math.min(b.h * inPerPx + 0.04, PAGE_H),
          fontFace: b.fontFamily,
          fontSize: Math.round(fontSizePt * 10) / 10,
          color: b.colorHex,
          transparency: b.alpha < 1 ? Math.round((1 - b.alpha) * 100) : undefined,
          bold: b.bold,
          italic: b.italic,
          align: b.align,
          valign: "top",
          margin: 0,
          lineSpacing: Math.round(b.lineHeightPx * ptPerPx * 10) / 10,
          charSpacing: b.letterSpacingPx !== 0
            ? Math.round(b.letterSpacingPx * ptPerPx * 100) / 100
            : undefined,
          fit: isSingleLine ? "none" : "shrink",
          wrap: !isSingleLine,
        });
      }

      const slideNotes = notes[i];
      if (slideNotes) {
        slide.addNotes(
          slideNotes
            .replace(/^#{1,6}\s+/gm, "")
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/\*([^*]+)\*/g, "$1")
            .replace(/^[-*]\s+/gm, "• ")
            .replace(/`([^`]+)`/g, "$1")
            .trim(),
        );
      }

      onProgress?.(i + 1, total, `Klar med slide ${i + 1}`);
    }
  } finally {
    // Återställ ursprunglig slide
    setIndex(originalIndex);
  }

  const fileStem =
    title
      .toLowerCase()
      .replace(/[^a-z0-9åäö]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || slug || "presentation";
  await pptx.writeFile({ fileName: `${fileStem}.pptx` });
}
