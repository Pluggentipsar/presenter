import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { extractNotes } from "@/lib/extract-notes";
import { PresenterView } from "@/components/PresenterView";
import type { DeckQuery } from "@/lib/deck-familj";
import { composeDeck } from "@/lib/deck-familjer";

// Force dynamic rendering så ändringar i MDX/extractNotes når presenter-mode
// direkt utan rebuild. (Static rendering cachar resultatet annars.)
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPresentationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) return {};
  return {
    title: `${presentation.meta.title} - Presenter mode`,
  };
}

export default async function PresenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<DeckQuery>;
}) {
  const { slug } = await params;
  // Ett deck som sätts ihop ur adressen (lib/deck-familjer.ts) får sin egen synkkanal och visning.
  const composed = composeDeck(slug, await searchParams);
  if (composed === "saknas") notFound();
  const presentation = composed ? composed.presentation : getPresentation(slug);

  if (!presentation) {
    notFound();
  }

  const { notes } = extractNotes(presentation.content);

  return <PresenterView slug={slug} syncId={composed?.syncId} mainUrl={composed?.mainUrl} meta={presentation.meta} notes={notes} />;
}
