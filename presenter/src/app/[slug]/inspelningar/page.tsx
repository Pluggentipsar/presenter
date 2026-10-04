import { notFound } from "next/navigation";
import { getPresentation } from "@/lib/mdx";
import { listRecordings, recordingsEnabled } from "@/lib/recording/store.server";
import { slideTitles } from "@/lib/recording/titles.server";
import { RecordingsView } from "@/components/recording/RecordingsView";
import { BodyScrollEffect } from "@/components/BodyScrollEffect";

// Inspelningssidan: deckets inspelningar, kapitlen och exporten till en färdig film.
// Ett arbetsverktyg i den lokala verkstaden, som granskningsvyn. Se docs/INSPELNING.md.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Inspelningar" };

export default async function RecordingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ id?: string | string[] }> }) {
  const { slug } = await params;
  const { id } = await searchParams;
  if (!recordingsEnabled()) notFound();
  const presentation = getPresentation(slug);
  if (!presentation) notFound();
  return <>
    <BodyScrollEffect />
    <RecordingsView slug={slug} title={presentation.meta.title ?? slug} recordings={listRecordings(slug)} titles={slideTitles(slug)} initialId={Array.isArray(id) ? id[0] : id} />
  </>;
}
