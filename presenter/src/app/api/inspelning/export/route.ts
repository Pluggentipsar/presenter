import { cancelExport, exportTools, isRunning, listExportFiles, readStatus, startExport } from "@/lib/recording/export.server";
import { startTranscription } from "@/lib/recording/transcribe.server";
import { readManifest, recordingsEnabled, validId, validSlug } from "@/lib/recording/store.server";

/**
 * /api/inspelning/export: den färdiga filmen och de separata spåren (2 oktober 2026).
 *
 * GET    ?slug=&id=   — exportens status, de färdiga filerna och vad datorn kan (ffmpeg, grafikkort, friläggning).
 * POST   { slug, id, settings } — starta en export i bakgrunden.
 * POST   { slug, id, kind: "avskrift" } — starta avskriften (text per slide och undertexter).
 * DELETE ?slug=&id=   — avbryt en pågående export.
 *
 * Filerna hämtas från /api/inspelning?slug=&id=&file=export/<namn>. Se docs/INSPELNING.md.
 */

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id");
  if (!validSlug(slug) || !validId(id) || !readManifest(slug, id)) return new Response("Okänd inspelning", { status: 404 });
  const status = readStatus(slug, id);
  // En export som stod som pågående när servern startades om är inte igång längre.
  if (status?.state === "kör" && !isRunning(slug, id)) {
    status.state = "avbruten";
    status.message = "Servern startades om under exporten.";
  }
  return json({ status, files: listExportFiles(slug, id), tools: await exportTools() });
}

export async function POST(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response("Ogiltig JSON", { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : null;
  const id = typeof body.id === "string" ? body.id : null;
  if (!validSlug(slug) || !validId(id)) return new Response("Okänd inspelning", { status: 400 });
  try {
    return json(body.kind === "avskrift" ? await startTranscription(slug, id) : await startExport(slug, id, body.settings), 202);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 409 });
  }
}

export async function DELETE(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id");
  if (!validSlug(slug) || !validId(id)) return new Response("Okänd inspelning", { status: 400 });
  return json({ cancelled: cancelExport(slug, id) });
}
