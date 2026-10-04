import fs from "fs";
import path from "path";
import { buildEditablePptx } from "@/lib/editable-pptx";

/**
 * GET /api/pptx/<slug> — ladda ner presentationen som REDIGERBAR PowerPoint.
 *
 * Bygger .pptx server-side från MDX-källan med riktiga textrutor (se
 * `src/lib/editable-pptx.ts`). Funkar därmed även på Vercel-deployen —
 * mottagare av en presentationslänk kan hämta en redigerbar fil direkt
 * utan att köra presenter lokalt.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Endast enkla slugs — inga path-traversals
  if (!/^[a-z0-9åäö_-]+$/i.test(slug)) {
    return new Response("Ogiltig slug", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "content", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return new Response("Presentationen finns inte", { status: 404 });
  }

  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const buffer = await buildEditablePptx(source);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${slug}-redigerbar.pptx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Redigerbar PPTX-export misslyckades:", err);
    return new Response("Export misslyckades", { status: 500 });
  }
}
