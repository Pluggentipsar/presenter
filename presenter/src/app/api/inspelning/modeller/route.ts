import { transcribeTools } from "@/lib/recording/avskrift-tools.server";
import { MODEL_CATALOGUE, downloadStates, startDownload } from "@/lib/recording/modeller.server";
import { recordingsEnabled } from "@/lib/recording/store.server";

/**
 * /api/inspelning/modeller: avskriftens modeller (2 oktober 2026). De hämtas en gång till den här datorn.
 *
 * GET               — vilka modeller som finns och hur långt pågående hämtningar har kommit.
 * POST { model }    — hämta en modell ur katalogen (kb-whisper-large, kb-whisper-medium, voxrex …).
 */

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function GET() {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const catalogue = Object.fromEntries(Object.entries(MODEL_CATALOGUE).map(([key, entry]) => [key, { label: entry.label, license: entry.license, bytes: entry.files.reduce((sum, file) => sum + file.bytes, 0) }]));
  return json({ models: transcribeTools().models, downloads: downloadStates(), catalogue });
}

export async function POST(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => ({})) as { model?: unknown };
  if (typeof body.model !== "string" || !MODEL_CATALOGUE[body.model]) return new Response("Okänd modell", { status: 400 });
  try {
    return json(startDownload(body.model), 202);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 409 });
  }
}
