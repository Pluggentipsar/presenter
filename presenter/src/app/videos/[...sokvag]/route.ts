import { servePublicFile } from "@/lib/public-file.server";

/**
 * /videos/… för filmer som lagts i public/videos efter att servern startade —
 * se lib/public-file.server.ts. Filer som fanns vid start serveras av Next själv.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ sokvag: string[] }> }) {
  const { sokvag } = await params;
  return servePublicFile("videos", sokvag, request);
}
