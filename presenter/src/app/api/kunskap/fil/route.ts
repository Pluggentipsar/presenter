import fs from "node:fs";
import { findImage, kunskapEnabled } from "@/lib/kunskap/valv.server";

/**
 * /api/kunskap/fil: en bild ur valvet till läsvyn (2 oktober 2026). Bara bildfiler.
 *
 * ?path=raw/bilder/x.png            — en sökväg från valvets rot.
 * ?namn=x.png&fran=wiki/a/sida.md   — ![[x.png]]: letas bredvid sidan, bland Obsidians bilagor och i roten.
 */

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (!kunskapEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const found = findImage(params.get("path"), params.get("namn"), params.get("fran"));
  if (!found) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(found.file)), {
    headers: {
      "Content-Type": found.type,
      "Cache-Control": "no-store",
      // En SVG ur valvet får inte köra skript i appens ursprung.
      "Content-Security-Policy": "script-src 'none'; sandbox",
    },
  });
}
