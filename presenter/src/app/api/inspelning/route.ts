import fs from "node:fs";
import {
  appendChunk,
  listRecordings,
  readManifest,
  recordingFile,
  recordingsEnabled,
  revealRecording,
  saveTimeline,
  startRecording,
  validId,
  validSlug,
  validTrack,
} from "@/lib/recording/store.server";
import type { RecordingMode, RecordingTrack, TimelineEvent } from "@/lib/recording/types";

/**
 * /api/inspelning: föreläsningens inspelning på den lokala datorn (2 oktober 2026).
 *
 * GET  ?slug=                       — inspelningarna (alla, eller ett decks), nyast först.
 * GET  ?slug=&id=                   — en inspelnings manifest.
 * GET  ?slug=&id=&file=             — en fil i inspelningen eller export/<namn> (med Range, så att filmen
 *                                     går att spola; &ladda=1 sparar den med ett tydligt namn).
 * POST { action: "start", … }       — ny inspelning; svarar med manifestet (id och filnamn).
 * PUT  ?slug=&id=&track=&seq=&off=  — en bit av ett spår (kroppen är bitens bytes), i ordning.
 * POST { action: "timeline", … }    — tidslinjen hittills (skickas om under inspelningen och vid stopp).
 * POST { action: "visa", slug, id }  — öppna inspelningens mapp i Utforskaren (på den här datorn).
 *
 * Finns bara i den lokala verkstaden; publika och skrivskyddade byggen svarar 404.
 */

export const dynamic = "force-dynamic";

const MAX_CHUNK = 64 * 1024 * 1024;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const MIME_BY_EXT: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", wav: "audio/wav", m4a: "audio/mp4", json: "application/json", txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8", srt: "text/plain; charset=utf-8", vtt: "text/vtt; charset=utf-8" };

export async function GET(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id"), name = params.get("file");
  if (slug !== null && !validSlug(slug)) return new Response("Ogiltigt deck", { status: 400 });
  if (!id) return json({ recordings: listRecordings(slug ?? undefined) });
  if (!validSlug(slug) || !validId(id)) return new Response("Ogiltig inspelning", { status: 400 });
  if (!name) {
    const manifest = readManifest(slug, id);
    return manifest ? json(manifest) : new Response(null, { status: 404 });
  }
  const file = recordingFile(slug, id, name);
  if (!file) return new Response(null, { status: 404 });
  const size = fs.statSync(file).size;
  const type = MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
  const download: Record<string, string> = params.get("ladda") === "1" ? { "Content-Disposition": `attachment; filename="${slug}-${id}-${name.split("/").pop()}"` } : {};
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && size > 0) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2] || 0));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: { "Content-Type": type, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store", ...download },
    });
  }
  return new Response(fs.createReadStream(file) as unknown as ReadableStream, {
    headers: { "Content-Type": type, "Content-Length": String(size), "Accept-Ranges": "bytes", "Cache-Control": "no-store", ...download },
  });
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
  if (!validSlug(slug)) return new Response("Ogiltigt deck", { status: 400 });
  try {
    if (body.action === "start") {
      const mode = (["ljud", "kamera", "film"] as RecordingMode[]).includes(body.mode as RecordingMode) ? body.mode as RecordingMode : "ljud";
      const tracks = (body.tracks ?? {}) as Partial<Record<RecordingTrack, { mime: string; width?: number; height?: number; capture?: "element" | "region" | "flik" }>>;
      for (const key of Object.keys(tracks)) if (!validTrack(key) || typeof tracks[key as RecordingTrack]?.mime !== "string") return new Response("Ogiltigt spår", { status: 400 });
      const manifest = startRecording({
        slug,
        title: typeof body.title === "string" ? body.title.slice(0, 200) : slug,
        mode,
        tracks,
        devices: typeof body.devices === "object" && body.devices ? body.devices as { microphone?: string; camera?: string } : undefined,
      });
      return json(manifest, 201);
    }
    if (body.action === "visa") {
      const id = typeof body.id === "string" ? body.id : null;
      if (!validId(id)) return new Response("Ogiltig inspelning", { status: 400 });
      return revealRecording(slug, id) ? json({ shown: true }) : new Response(null, { status: 404 });
    }
    if (body.action === "timeline") {
      const id = typeof body.id === "string" ? body.id : null;
      if (!validId(id)) return new Response("Ogiltig inspelning", { status: 400 });
      const timeline = Array.isArray(body.timeline) ? body.timeline as TimelineEvent[] : [];
      const manifest = saveTimeline(slug, id, timeline, { durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined, ended: body.ended === true });
      return json(manifest);
    }
  } catch (error) {
    console.error("Inspelningen:", error);
    return new Response("Kunde inte spara", { status: 500 });
  }
  return new Response("Okänd åtgärd", { status: 400 });
}

export async function PUT(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id"), track = params.get("track");
  const seq = Number(params.get("seq")), offset = params.get("off");
  if (!validSlug(slug) || !validId(id) || !validTrack(track) || !Number.isInteger(seq) || seq < 0) return new Response("Ogiltig bit", { status: 400 });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_CHUNK) return new Response("För stor", { status: 413 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.length > MAX_CHUNK) return new Response("För stor", { status: 413 });
  try {
    return json(appendChunk(slug, id, track, data, seq, offset === null ? undefined : Number(offset)));
  } catch (error) {
    console.error("Inspelningens bit:", error);
    return new Response("Kunde inte spara", { status: 500 });
  }
}
