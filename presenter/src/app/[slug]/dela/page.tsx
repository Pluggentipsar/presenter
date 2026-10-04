import { notFound } from "next/navigation";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { getArticle } from "@/lib/share/article";
import { formatShareDate } from "@/lib/share/author";
import { ShareLanding } from "@/components/share/ShareLanding";
import { ShareThemeRoot } from "@/components/share/ShareThemeRoot";

// Delningspaketets landningssida. Se presenter/docs/DELNINGSPAKET.md.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPresentationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) return {};
  const article = getArticle(slug, presentation.content, presentation.meta.title);
  return {
    title: article?.title ?? presentation.meta.title,
    // Deckets description är ofta en intern arbetsbeskrivning. Publik text
    // kommer bara ur lästextens intro.
    description: article?.intro,
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  const { meta } = presentation;
  const article = getArticle(slug, presentation.content, meta.title);
  const kicker = article?.kicker ?? meta.event;
  const facts = [formatShareDate(meta.date), meta.author].filter((v): v is string => !!v);

  return (
    <ShareThemeRoot meta={meta}>
      <ShareLanding
        slug={slug}
        title={article?.title ?? meta.title}
        kicker={kicker}
        intro={article?.intro}
        meta={facts}
        hero={article?.hero ?? { slideIndex: 0, step: "last" }}
        article={article}
      />
    </ShareThemeRoot>
  );
}
