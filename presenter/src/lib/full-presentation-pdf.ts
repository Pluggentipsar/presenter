"use client";

import type { StepController } from "./slide-steps";

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
  /** Callback för progressindikation. */
  onProgress?: (current: number, total: number, label: string) => void;
}

/**
 * Bygger en visuell PDF-export av hela presentationen.
 *
 * För varje slide:
 *   1. Navigerar dit och väntar på entry-animation
 *   2. Stegar igenom alla steps om sliden är stegvis-byggd, så att slutbilden
 *      visar fullt revealade innehåll i PDF:en
 *   3. Fångar slide-stage som canvas via html2canvas
 *   4. Lägger in canvas som en sida i PDF:en (16:9 landscape)
 *
 * Använder html2canvas med useCORS för Midjourney-bakgrunder och liknande.
 * Backdrop-blur och mix-blend-mode kan ha varierande renderkvalitet eftersom
 * html2canvas inte stödjer alla CSS-features perfekt.
 */
export async function exportFullPresentationPdf({
  slideStageRef,
  currentIndex,
  total,
  setIndex,
  stepsControllerRef,
  title,
  slug,
  onProgress,
}: ExportInput): Promise<void> {
  // modern-screenshot använder SVG foreignObject under huven och stödjer
  // moderna CSS-funktioner (color(), oklch(), calc(), backdrop-filter etc.)
  // som html2canvas + html2canvas-pro inte hanterar tillförlitligt.
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ]);

  // 1920×1080 px-baserad 16:9 PDF — matchar slide-canvas
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1920, 1080],
    hotfixes: ["px_scaling"],
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

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
      // Låt långa entry-animationer avsluta:
      //   - AiHyperobject taggar: ~2.5s float-in
      //   - ParallaxTimeline kort: ~1.5s stagger
      //   - BigStat siffer-uppräkning: ~2s
      //   - PowerStack kort + tagline: ~2.5s total
      //   - MediaCarousel: aktiv video stable ~0.5s
      await sleep(2200);

      // Fånga slide-stage
      const stage = slideStageRef.current;
      if (!stage) continue;

      const canvas = await domToCanvas(stage, {
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

      // Beräkna proportionellt så bilden passar i PDF-sidan
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = pageW / pageH;
      let drawW = pageW;
      let drawH = pageH;
      let drawX = 0;
      let drawY = 0;
      if (imgRatio > pageRatio) {
        // Bilden är bredare → fit till bredd, centrera vertikalt
        drawW = pageW;
        drawH = pageW / imgRatio;
        drawY = (pageH - drawH) / 2;
      } else {
        // Bilden är högre → fit till höjd, centrera horisontellt
        drawH = pageH;
        drawW = pageH * imgRatio;
        drawX = (pageW - drawW) / 2;
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) doc.addPage([1920, 1080], "landscape");
      // Svart fond bakom bilden om det blir letterbox
      doc.setFillColor(10, 9, 8);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.addImage(imgData, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");

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
  doc.save(`${fileStem}.pdf`);
}
