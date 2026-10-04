import {
  MAX_THUMBNAIL_BYTES,
  isWebp,
  parseThumbnailKey,
  readThumbnail,
  thumbnailStoreEnabled,
  writeThumbnail,
} from "@/lib/thumbnail-store.server";

/**
 * /api/miniatyr?s=<namnrymd>&i=<id>&h=<renderhash>
 *
 * GET  — en sparad miniatyr (image/webp), eller 404.
 * PUT  — spara en nyss fångad miniatyr (kroppen är WebP-filen).
 *
 * Den gemensamma lagringen bakom Cache Storage — se lib/thumbnail-store.server.ts.
 * Finns bara i den lokala verkstaden; publika och skrivskyddade byggen svarar 404.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!thumbnailStoreEnabled()) return new Response(null, { status: 404 });
  const key = parseThumbnailKey(new URL(request.url).searchParams);
  if (!key) return new Response("Ogiltig nyckel", { status: 400 });
  const data = readThumbnail(key);
  if (!data) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // Nyckeln innehåller renderhashen: samma adress betyder alltid samma bild.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function PUT(request: Request) {
  if (!thumbnailStoreEnabled()) return new Response(null, { status: 404 });
  const key = parseThumbnailKey(new URL(request.url).searchParams);
  if (!key) return new Response("Ogiltig nyckel", { status: 400 });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_THUMBNAIL_BYTES) return new Response("För stor", { status: 413 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.length === 0 || data.length > MAX_THUMBNAIL_BYTES) return new Response("Fel storlek", { status: 413 });
  if (!isWebp(data)) return new Response("Bara WebP", { status: 415 });
  try {
    writeThumbnail(key, data);
  } catch (error) {
    console.error("Miniatyren kunde inte sparas:", error);
    return new Response("Kunde inte spara", { status: 500 });
  }
  return new Response(null, { status: 204 });
}
