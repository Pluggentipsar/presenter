import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { parseMdx } from "@/lib/mdx-parser";
import { ensureStableParsedSlideIds } from "@/lib/slide-ids";
import { createDeckRevision } from "@/lib/deck-revision.server";
import { AuthoringShell } from "@/components/authoring/AuthoringShell";
import { getArticle } from "@/lib/share/article";
import { isLibraryReadOnly, readDeckNote } from "@/lib/library.server";

// Force dynamic som visningen: ett deck som skapas efter bygget (snabbt läge, den
// publika versionen) har ingen förrenderad sida, och sidan läser adressens ?mode=.
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
    title: `Studio: ${presentation.meta.title}`,
  };
}

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ slide?: string | string[]; mode?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  const parsed = parseMdx(presentation.raw);
  ensureStableParsedSlideIds(parsed, presentation.raw);
  const slideParam = Array.isArray(query.slide) ? query.slide[0] : query.slide;
  const initialActiveIndex = Math.max(0, Number(slideParam ?? 1) - 1);
  const modeParam = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  // Lästextens kapitel ger översikten en aktstruktur när decket saknar egen.
  const article = getArticle(slug, presentation.content, presentation.meta.title);
  const readingChapters = (article?.chapters ?? [])
    .map((chapter) => ({
      title: chapter.title,
      slideId: article?.blocks[chapter.firstBlock]?.slideId ?? "",
    }))
    .filter((chapter) => chapter.slideId);

  return (
    <AuthoringShell
      slug={slug}
      meta={presentation.meta}
      initialParsed={parsed}
      initialRevision={createDeckRevision(presentation.raw)}
      initialMode={
        modeParam === "manus" || modeParam === "oversikt" ? modeParam : "storyboard"
      }
      readingChapters={readingChapters}
      initialNote={isLibraryReadOnly() ? null : readDeckNote(slug)}
      initialActiveIndex={initialActiveIndex}
    />
  );
}
