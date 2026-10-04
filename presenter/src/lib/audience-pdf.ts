"use client";

import type { SlideMeta } from "./extract-slide-types";
import type { AudienceNotes } from "./use-audience-notes";

interface BuildPdfInput {
  presentationTitle: string;
  sessionCode: string;
  slideMetas: SlideMeta[];
  notes: AudienceNotes;
}

/**
 * Genererar en PDF klient-sida med jsPDF.
 * Layout:
 *   1. Titelsida med presentationens titel + sessionskod + datum
 *   2. "Löpande anteckningar" (om de finns)
 *   3. Per slide: rubrik + åhörarens anteckning (bara de med anteckningar)
 *   4. Fotnot: alla slides i presentationen (även utan anteckningar) för referens
 */
export async function buildAudiencePdf({
  presentationTitle,
  sessionCode,
  slideMetas,
  notes,
}: BuildPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size: number, lineGap = 1.35) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    for (const line of lines) {
      addPageIfNeeded(size * lineGap);
      doc.text(line, margin, y);
      y += size * lineGap;
    }
  };

  // ============ Titelsida ============
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 30);
  writeWrapped(presentationTitle, 22);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 100);
  writeWrapped(`Sessionskod: ${sessionCode}`, 11);
  writeWrapped(
    `Exporterad: ${new Date().toLocaleString("sv-SE", {
      dateStyle: "long",
      timeStyle: "short",
    })}`,
    11
  );
  y += 16;

  // Subtil skiljelinje
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  // ============ Löpande anteckningar ============
  if (notes.general.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    writeWrapped("Löpande anteckningar", 16);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 50);
    writeWrapped(notes.general.trim(), 11, 1.5);
    y += 20;
  }

  // ============ Per-slide-anteckningar ============
  const slideIndexesWithNotes = Object.keys(notes.perSlide)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n) && notes.perSlide[n]?.trim())
    .sort((a, b) => a - b);

  if (slideIndexesWithNotes.length > 0) {
    addPageIfNeeded(60);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    writeWrapped("Anteckningar per slide", 16);
    y += 8;

    for (const i of slideIndexesWithNotes) {
      const meta = slideMetas[i];
      const title = meta?.primaryText ?? `Slide ${i + 1}`;

      addPageIfNeeded(60);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 30);
      writeWrapped(`${i + 1}. ${title}`, 13);
      y += 2;

      if (meta?.secondaryText) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 130);
        writeWrapped(meta.secondaryText, 10);
        y += 4;
      }

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 50);
      writeWrapped(notes.perSlide[i].trim(), 11, 1.45);
      y += 14;
    }
  }

  // ============ Referens: alla slides ============
  if (slideMetas.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    writeWrapped("Samtliga slides", 16);
    y += 8;

    slideMetas.forEach((meta, i) => {
      addPageIfNeeded(24);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 70);
      writeWrapped(`${i + 1}. ${meta.primaryText ?? `Slide ${i + 1}`}`, 10, 1.5);
    });
  }

  const fileStem = presentationTitle
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "presentation";
  doc.save(`${fileStem}-anteckningar.pdf`);
}
