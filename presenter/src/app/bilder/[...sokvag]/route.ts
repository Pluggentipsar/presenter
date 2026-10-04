import { servePublicFile } from "@/lib/public-file.server";

/**
 * /bilder/… för bilder som lagts i public/bilder efter att servern startade —
 * se lib/public-file.server.ts. Filer som fanns vid start serveras av Next själv.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ sokvag: string[] }> }) {
  const { sokvag } = await params;
  return servePublicFile("bilder", sokvag, request);
}
