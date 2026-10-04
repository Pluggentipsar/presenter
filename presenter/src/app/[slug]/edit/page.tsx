import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { parseMdx } from "@/lib/mdx-parser";
import { ensureStableParsedSlideIds } from "@/lib/slide-ids";
import { createDeckRevision } from "@/lib/deck-revision.server";
import { AuthoringShell } from "@/components/authoring/AuthoringShell";

// Force dynamic som visningen: ett deck som skapas efter bygget (snabbt läge, den
// publika versionen) har ingen förrenderad sida, och sidan läser adressens ?slide=.
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
    title: `Redigera: ${presentation.meta.title}`,
  };
}

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ slide?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  const parsed = parseMdx(presentation.raw);
  ensureStableParsedSlideIds(parsed, presentation.raw);
  const slideParam = Array.isArray(query.slide) ? query.slide[0] : query.slide;
  const initialActiveIndex = Math.max(0, Number(slideParam ?? 1) - 1);

  return (
    <AuthoringShell
      slug={slug}
      meta={presentation.meta}
      initialParsed={parsed}
      initialRevision={createDeckRevision(presentation.raw)}
      initialMode="editor"
      initialActiveIndex={initialActiveIndex}
    />
  );
}
