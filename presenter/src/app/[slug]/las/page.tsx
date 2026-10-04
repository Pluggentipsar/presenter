import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { getArticle } from "@/lib/share/article";
import { ReaderView } from "@/components/share/ReaderView";
import { ShareThemeRoot } from "@/components/share/ShareThemeRoot";

// Delningspaketets läsläge. Finns bara för deck som har en lästext i
// content/las/<slug>.md. Se presenter/docs/DELNINGSPAKET.md.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPresentationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) return {};
  const article = getArticle(slug, presentation.content, presentation.meta.title);
  if (!article) return {};
  return { title: `Läs: ${article.title}`, description: article.intro };
}

export default async function ReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();
  const article = getArticle(slug, presentation.content, presentation.meta.title);
  if (!article || article.blocks.length === 0) notFound();

  return (
    <ShareThemeRoot meta={presentation.meta}>
      <ReaderView article={article} />
    </ShareThemeRoot>
  );
}
