import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { getPresentation } from "@/lib/mdx";
import { slideIdIndex } from "@/lib/share/article";
import { ShareThemeRoot } from "@/components/share/ShareThemeRoot";
import { BodyScrollEffect } from "@/components/BodyScrollEffect";
import { ListenView, type ListenPosition } from "@/components/recording/ListenView";
import { sentencesOf, type Avskrift } from "@/lib/recording/avskrift";
import { exportDir } from "@/lib/recording/export.server";
import { listRecordings, readManifest, recordingsEnabled, validId } from "@/lib/recording/store.server";
import { chaptersOf } from "@/lib/recording/timeline";
import { slideTitles } from "@/lib/recording/titles.server";

// Lyssningsläget (2 oktober 2026): en inspelad föreläsning med ljudet, sliden som följer
// tidslinjen klick för klick, kapitel per slide och avskriften. Bara i den lokala verkstaden
// tills ljudet publiceras. Se docs/INSPELNING.md.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, title: "Lyssna" };

export default async function ListenPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ id?: string | string[] }> }) {
  const { slug } = await params;
  const query = await searchParams;
  if (!recordingsEnabled()) notFound();
  const presentation = getPresentation(slug);
  if (!presentation) notFound();
  const wanted = Array.isArray(query.id) ? query.id[0] : query.id;
  // Utan id: den senaste inspelningen som har en ljudfil, annars den senaste som är klar.
  const recordings = listRecordings(slug).filter(recording => recording.ended);
  const hasAudio = (id: string) => fs.existsSync(path.join(exportDir(slug, id), "ljud.m4a"));
  const manifest = validId(wanted ?? null) ? readManifest(slug, wanted!) : (recordings.find(recording => hasAudio(recording.id)) ?? recordings[0] ?? null);
  if (!manifest) notFound();

  // Slidens plats i decket som det ser ut nu (slideId), så att en ändrad ordning inte förskjuter bilden.
  const ids = slideIdIndex(presentation.content);
  const positions: ListenPosition[] = manifest.timeline
    .filter(event => event.type === "position" && event.index !== undefined)
    .map(event => ({ t: event.t / 1000, slide: (event.slideId ? ids.get(event.slideId) : undefined) ?? event.index!, step: event.step ?? 1 }));
  const titles = slideTitles(slug);
  const chapters = chaptersOf(manifest, titles).map(chapter => ({ start: chapter.start, end: chapter.end, title: chapter.title }));
  let sentences: { start: number; end: number; text: string }[] = [];
  try {
    const avskrift = JSON.parse(fs.readFileSync(path.join(exportDir(slug, manifest.id), "avskrift.json"), "utf8")) as Avskrift;
    sentences = sentencesOf(avskrift.words);
  } catch {
    // Ingen avskrift ännu: lyssningsläget fungerar utan.
  }

  return (
    <ShareThemeRoot meta={presentation.meta}>
      <BodyScrollEffect />
      <ListenView
        slug={slug}
        id={manifest.id}
        title={presentation.meta.title ?? slug}
        recorded={manifest.started}
        duration={(manifest.durationMs ?? 0) / 1000}
        audio={hasAudio(manifest.id) ? `/api/inspelning?${new URLSearchParams({ slug, id: manifest.id, file: "export/ljud.m4a" })}` : null}
        positions={positions}
        chapters={chapters}
        sentences={sentences}
      />
    </ShareThemeRoot>
  );
}
