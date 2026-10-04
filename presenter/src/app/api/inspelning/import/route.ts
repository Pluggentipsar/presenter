import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { renameWithRetry } from "@/lib/recording/rename.server";
import { IMPORT_FILE_PATTERN, finishImport, importDir, recordingDir, recordingsEnabled, validId, validSlug } from "@/lib/recording/store.server";

/**
 * /api/inspelning/import: ta in en inspelning från en annan dator (2 oktober 2026). Spela in på
 * laptopen, kopiera mappen hit och exportera här, där friläggningen finns. Se docs/INSPELNING.md.
 *
 * PUT    ?slug=&id=&file=<namn> — en fil (kroppen) till den tillfälliga mappen; spåren först, manifestet sist.
 * POST   { slug, id }           — klart: manifestet och spårens storlek kontrolleras, mappen får sitt namn.
 * DELETE ?slug=&id=             — avbryt: den tillfälliga mappen tas bort.
 */

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function PUT(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id"), name = params.get("file");
  if (!validSlug(slug) || !validId(id) || !name || !IMPORT_FILE_PATTERN.test(name)) return new Response("Ogiltig fil", { status: 400 });
  if (fs.existsSync(recordingDir(slug, id))) return new Response("Inspelningen finns redan här.", { status: 409 });
  if (!request.body) return new Response("Tom fil", { status: 400 });
  const dir = importDir(slug, id);
  fs.mkdirSync(dir, { recursive: true });
  const part = path.join(dir, `${name}.part`);
  try {
    await pipeline(Readable.fromWeb(request.body as unknown as WebReadableStream), fs.createWriteStream(part));
    await renameWithRetry(part, path.join(dir, name));
  } catch (error) {
    fs.rmSync(part, { force: true });
    console.error("Importen:", error);
    return new Response("Kunde inte spara filen", { status: 500 });
  }
  return json({ bytes: fs.statSync(path.join(dir, name)).size });
}

export async function POST(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => ({})) as { slug?: unknown; id?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : null, id = typeof body.id === "string" ? body.id : null;
  if (!validSlug(slug) || !validId(id)) return new Response("Okänd inspelning", { status: 400 });
  try {
    const manifest = await finishImport(slug, id);
    const deckExists = fs.existsSync(path.join(process.cwd(), "content", `${slug}.mdx`));
    return json({ manifest, deckExists });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 409 });
  }
}

export async function DELETE(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id");
  if (!validSlug(slug) || !validId(id)) return new Response("Okänd inspelning", { status: 400 });
  fs.rmSync(importDir(slug, id), { recursive: true, force: true });
  return json({ removed: true });
}
