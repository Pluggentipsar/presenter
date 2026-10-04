import { kunskapEnabled, searchVault } from "@/lib/kunskap/valv.server";

/** /api/kunskap/sok?q= — sök i Kunskapsbankens titlar, taggar och text (2 oktober 2026). */

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (!kunskapEnabled()) return new Response(null, { status: 404 });
  const query = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 200);
  return Response.json(searchVault(query), { headers: { "Cache-Control": "no-store" } });
}
