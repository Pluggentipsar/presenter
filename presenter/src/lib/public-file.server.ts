import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Filer som lagts i public/ EFTER att servern startade.
 *
 * `next dev` letar efter filer i public/ vid varje anrop. `next start` — som
 * appens snabba läge kör (electron/server.mjs) — läser in listan över filer en
 * gång när servern startar. En bild som laddas upp i editorn, eller som en agent
 * lägger i public/bilder, svarade då 404 tills servern startades om.
 *
 * Rutterna /bilder/[...sokvag] och /videos/[...sokvag] nås bara när den
 * inbyggda filservern inte hittade filen; de läser den från disk. Filer som
 * fanns vid start serveras som förut av Next själv.
 */

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".json": "application/json",
  ".pdf": "application/pdf",
};

export async function servePublicFile(folder: "bilder" | "videos", segments: string[], request: Request): Promise<Response> {
  const base = path.join(process.cwd(), "public", folder);
  const decoded = segments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  if (decoded.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("\0"))) {
    return new Response("Ogiltig sökväg", { status: 400 });
  }
  const file = path.join(base, ...decoded);
  if (!file.startsWith(base + path.sep)) return new Response("Ogiltig sökväg", { status: 400 });

  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return new Response("Finns inte", { status: 404 });
  }
  if (!stat.isFile()) return new Response("Finns inte", { status: 404 });

  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };

  // Video spolas med Range-anrop; utan stöd för dem går det inte att hoppa i filmen.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = stat.size;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = fs.createReadStream(file, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = fs.createReadStream(file);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}
