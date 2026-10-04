import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { PresentationRenderer } from "@/components/PresentationRenderer";
import type { DeckQuery } from "@/lib/deck-familj";
import { composeDeck, hiddenSlidesFor } from "@/lib/deck-familjer";

// Force dynamic så ändringar i MDX (inkl <Notes>-block och frontmatter)
// når sidan vid varje request utan rebuild.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPresentationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DeckQuery>;
}) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) return {};
  // Ett deck som sätts ihop ur adressen (lib/deck-familjer.ts) har sin egen titel.
  const composed = composeDeck(slug, await searchParams);
  return {
    title: composed && composed !== "saknas" ? composed.presentation.meta.title : presentation.meta.title,
    description: presentation.meta.description,
  };
}

export default async function PresentationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DeckQuery>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const composed = composeDeck(slug, query);
  if (composed === "saknas") notFound();
  const presentation = composed ? composed.presentation : getPresentation(slug);

  if (!presentation) {
    notFound();
  }

  return (
    <PresentationRenderer
      source={presentation.content}
      editTargets={composed?.editTargets}
      syncId={composed?.syncId}
      slug={slug}
      theme={presentation.meta.theme}
      title={presentation.meta.title}
      brand={presentation.meta.brand}
      ambient={presentation.meta.ambient}
      hiddenSlides={composed ? [] : hiddenSlidesFor(slug, presentation.content, query, presentation.meta.hiddenSlides)}
      cuts={presentation.meta.cuts}
      sliderEffects={presentation.meta.sliderEffects}
      slideGradients={presentation.meta.slideGradients}
      slideAccents={presentation.meta.slideAccents}
      slideTextColors={presentation.meta.slideTextColors}
      slideMutedColors={presentation.meta.slideMutedColors}
      accentOverride={presentation.meta.accentOverride}
      deckColorVars={presentation.meta.deckColorVars}
      textOverride={presentation.meta.textOverride}
      mutedOverride={presentation.meta.mutedOverride}
    />
  );
}
