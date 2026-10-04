import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { getPresentation } from "@/lib/mdx";
import { parseMdx } from "@/lib/mdx-parser";
import { parseStepConfig } from "@/lib/step-config";
import { clickMarkers, statedSteps } from "@/lib/manus-check";
import { getTemplateSchemaOrFallback } from "@/lib/template-schemas";
import { thumbnailStoreEnabled } from "@/lib/thumbnail-store.server";
import { Granskning, type GranskaSlide } from "@/components/granska/Granskning";

// Granskningsvyn: går igenom alla slides och lägen i 1600 × 900 och mäter dem
// mot kontraktet (docs/GRANSKA.md). Servern läser decket: klicksteg, [Klick] i
// Notes och fält utan R-schema. Mätningen och bildfångsten sker i webbläsaren.
// Ett arbetsverktyg i den lokala verkstaden, som miniatyrerna.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Granskning" };

/** Props som styr sliden eller arbetet, inte innehåll som ska ha ett fält. */
const STRUCTURAL = new Set(["slideId", "akt", "claude", "stegAv", "hoppaSteg", "cutSkip", "tid", "syfte", "mall", "visuell", "kalla", "media"]);

export default async function GranskaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!thumbnailStoreEnabled()) notFound();
  const presentation = getPresentation(slug);
  if (!presentation) notFound();
  const hidden = new Set((presentation.meta.hiddenSlides ?? []).map(Number));
  // Hela filen, så att frontmatterns granska-inställningar kommer med.
  const file = path.join(process.cwd(), "content", `${slug}.mdx`);
  const { frontmatter, slides } = parseMdx(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : presentation.content);
  // granska: greenscreen (eller { greenscreen: true, manus: false }) i frontmattern.
  const settings = frontmatter.granska;
  const greenscreen = settings === "greenscreen" || (typeof settings === "object" && settings !== null && (settings as Record<string, unknown>).greenscreen === true);
  const manus = !(typeof settings === "object" && settings !== null && (settings as Record<string, unknown>).manus === false);

  const rows: GranskaSlide[] = slides.map((slide, i) => {
    const props = slide.props as Record<string, unknown>;
    const config = parseStepConfig(props);
    const notes = slide.notes ?? "";
    const { schema, isFallback } = getTemplateSchemaOrFallback(slide.tag, props, Boolean(slide.content?.trim()));
    const known = new Set(schema.fields.map((field) => field.name));
    const missing = isFallback ? [] : Object.keys(props).filter((key) => !known.has(key) && !STRUCTURAL.has(key));
    const label = [props.form ?? props.scene, props.kicker ?? props.title ?? props.quote]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => String(value).replace(/\s+/g, " ").slice(0, 60))
      .join(" · ");
    return {
      n: i + 1,
      slideId: typeof props.slideId === "string" ? props.slideId : "",
      tag: slide.tag,
      label: label || slide.tag,
      hidden: hidden.has(i + 1),
      skip: config?.skip ?? [],
      final: Boolean(config?.final),
      clicks: clickMarkers(notes),
      stated: statedSteps(notes),
      schema: { fallback: isFallback, missing },
    };
  });

  return <Granskning slug={slug} title={presentation.meta.title ?? slug} slides={rows} greenscreen={greenscreen} manus={manus} />;
}
