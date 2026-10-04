import { kunskapEnabled, vaultIndex } from "@/lib/kunskap/valv.server";

/**
 * /api/kunskap: Kunskapsbankens index (2 oktober 2026). Alla sidor i valvet med titel, grupp,
 * taggar och länkar, och föreläsningarna. Bara i den lokala verkstaden. Se docs/KUNSKAPSBANKEN.md.
 */

export const dynamic = "force-dynamic";

export function GET() {
  if (!kunskapEnabled()) return new Response(null, { status: 404 });
  return Response.json(vaultIndex(), { headers: { "Cache-Control": "no-store" } });
}
