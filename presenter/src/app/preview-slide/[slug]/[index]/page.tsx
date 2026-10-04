/**
 * Isolerad single-slide-rendering — används av ImportSlidesModal för
 * att visa hur en slide från en annan presentation faktiskt ser ut,
 * via en iframe.
 *
 * Tar [slug]/[index] (1-indexerat) som path-params. Extraherar rådatan
 * för just den sliden ur källpresentationens MDX och renderar i
 * PresentationRenderer med källpresentationens tema/frontmatter, så
 * publik och fontval matchar originalet.
 */
import { notFound } from "next/navigation";
import { getPresentation } from "@/lib/mdx";
import { extractSlideRaw } from "@/lib/mdx-parser";
import { PresentationRenderer } from "@/components/PresentationRenderer";
import { PreviewThumbnailCapture } from "@/components/PreviewThumbnailCapture";
import { themes } from "@/themes";

export const dynamic = "force-dynamic";

export default async function SlidePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; index: string }>;
  searchParams: Promise<{ theme?: string | string[] }>;
}) {
  const { slug, index } = await params;
  // ?theme= visar sliden i ett ANNAT decks tema. Komponentgalleriet använder
  // det för att visa hur en mall ur en gammal föreläsning ser ut i den man
  // bygger nu. Okända temanamn ignoreras.
  const requested = (await searchParams).theme;
  const themeOverride = typeof requested === "string" && requested in themes ? requested : undefined;
  const slideIndex = parseInt(index, 10);
  if (!Number.isFinite(slideIndex) || slideIndex < 1) notFound();

  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  // Källpresentationens FULL råtext måste rekonstrueras — getPresentation
  // returnerar redan stripad content + meta. Vi kombinerar ihop dem så
  // extractSlideRaw får frontmatter att hoppa över.
  const fullSource = buildSourceWithFrontmatter(
    presentation.content,
    presentation.meta,
  );
  const raw = extractSlideRaw(fullSource, slideIndex);
  if (!raw) notFound();

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <PresentationRenderer
        source={raw}
        slug={slug}
        theme={themeOverride ?? presentation.meta.theme}
        title={presentation.meta.title}
        brand={presentation.meta.brand}
        ambient={false}
        deckColorVars={presentation.meta.deckColorVars}
      />
      <PreviewThumbnailCapture slideNumber={slideIndex} />
    </div>
  );
}

/**
 * Rekonstruerar en MDX-källfil-strängen från content + minimal frontmatter
 * (bara theme krävs för korrekt rendering). gray-matter behöver ett
 * ---block för att inte felaktigt parse:a content som frontmatter.
 */
function buildSourceWithFrontmatter(
  content: string,
  meta: { theme?: string; title?: string },
): string {
  const fmLines = ["---"];
  if (meta.title) fmLines.push(`title: ${JSON.stringify(meta.title)}`);
  if (meta.theme) fmLines.push(`theme: ${meta.theme}`);
  fmLines.push("---", "");
  return fmLines.join("\n") + content;
}
