import { kunskapEnabled, readNote, safePath, writeNote } from "@/lib/kunskap/valv.server";

/**
 * /api/kunskap/sida: en sida i Kunskapsbanken (2 oktober 2026).
 *
 * GET ?path=                       — sidan: hela texten, frontmattern, ändringstid och fingeravtryck.
 * PUT ?path=  { text, hash }       — spara. Har filen ändrats sedan `hash` (i Obsidian, av en agent)
 *                                    svarar servern 409 med den nya versionen och skriver ingenting.
 * PUT ?path=  { text, create: true } — skapa en ny sida (409 om den redan finns).
 */

export const dynamic = "force-dynamic";

const MAX_TEXT = 2_000_000;

export function GET(request: Request) {
  if (!kunskapEnabled()) return new Response(null, { status: 404 });
  const rel = safePath(new URL(request.url).searchParams.get("path"), "note");
  if (!rel) return new Response("Ogiltig sökväg", { status: 400 });
  const page = readNote(rel);
  return page ? Response.json(page, { headers: { "Cache-Control": "no-store" } }) : new Response("Sidan finns inte", { status: 404 });
}

export async function PUT(request: Request) {
  if (!kunskapEnabled()) return new Response(null, { status: 404 });
  const rel = safePath(new URL(request.url).searchParams.get("path"), "note");
  if (!rel) return new Response("Ogiltig sökväg", { status: 400 });
  const body = (await request.json().catch(() => null)) as { text?: unknown; hash?: unknown; create?: unknown } | null;
  if (!body || typeof body.text !== "string") return new Response("Texten saknas", { status: 400 });
  if (body.text.length > MAX_TEXT) return new Response("Sidan är för stor", { status: 413 });
  const result = writeNote(rel, body.text, typeof body.hash === "string" ? body.hash : null, body.create === true);
  if (result.ok) return Response.json(result.page);
  if (result.reason === "konflikt") return Response.json({ reason: "konflikt", page: result.page }, { status: 409 });
  return Response.json({ reason: result.reason, message: result.message }, { status: result.reason === "fel" ? 500 : 409 });
}
