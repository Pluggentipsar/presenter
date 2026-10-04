import fs from "node:fs";
import path from "node:path";
import { isValidSlug } from "@/lib/slug";
import { thumbnailStoreEnabled } from "@/lib/thumbnail-store.server";
import { themes } from "@/themes";

/**
 * /api/granska?slug=<slug>&fil=<namn>[&tema=<tema>]
 *
 * GET    — kontrollera adressen innan en granskning börjar: 204 om decket finns
 *          och slugen och temat går att spara under, annars 400 eller 404 med
 *          skälet i klartext. scripts/granska-edge.mjs frågar här först, så att
 *          ett fel syns direkt i stället för efter en kvarts väntan.
 * PUT    — spara en bild eller rapport från granskningsvyn i presenter/.granska/<slug>/
 *          (rapport.json, rapport.md, bilder/<slide>-<läge>-<slideId>.webp).
 * DELETE — ta bort förra körningens bilder. Bara filer med granskningsvyns
 *          egna namn tas bort.
 *
 * Med tema (granskning i ett annat tema än deckets, ?tema= i granskningsvyn)
 * hamnar allt i presenter/.granska/<slug>--<tema>/ i stället.
 *
 * Slugen prövas med samma regel som resten av appen (lib/slug.ts). Mappen är
 * gitignorerad, så att bilderna inte hamnar i några commits. Finns bara i den
 * lokala verkstaden, som miniatyrerna; publika och skrivskyddade byggen svarar
 * 404. Se docs/GRANSKA.md.
 */

export const dynamic = "force-dynamic";

const ROOT = path.join(process.cwd(), ".granska");
const CONTENT = path.join(process.cwd(), "content");
const FILE = /^(?:bilder\/)?[a-z0-9][a-z0-9_.-]{0,160}\.(?:webp|png|json|md)$/i;
const IMAGE = /^\d{2,3}-\d{2,3}-[a-z0-9_-]+\.(?:webp|png)$/i;
const THEME = /^[a-z0-9_]{1,60}$/;
const MAX_BYTES = 12 * 1024 * 1024;

const query = (url: string) => {
  const params = new URL(url).searchParams;
  return { slug: params.get("slug") ?? "", file: params.get("fil") ?? "", tema: params.get("tema") ?? "" };
};

/** Varför adressen inte går att använda, i klartext, eller null när den går bra. */
function problem(url: string): string | null {
  const { slug, file, tema } = query(url);
  if (!isValidSlug(slug)) {
    return `Ogiltig slug: ”${slug}”. En slug är filnamnet utan .mdx, med bara a–z, 0–9, bindestreck och understreck, och den börjar med en bokstav eller siffra.`;
  }
  if (tema && !(THEME.test(tema) && Object.hasOwn(themes, tema))) return `Okänt tema: ”${tema}”.`;
  if (file && (!FILE.test(file) || file.includes(".."))) return `Ogiltigt filnamn: ”${file}”.`;
  return null;
}

/**
 * Mappen och filen för en godkänd adress (se problem). Returnerar null i stället för ett felobjekt:
 * Turbopack följer returvärdet in i fs-anropen, och ett objekt utan dir får den att spåra hela projektet.
 */
function target(url: string) {
  if (problem(url)) return null;
  const { slug, file, tema } = query(url);
  return { slug, file, dir: path.join(ROOT, tema ? `${slug}--${tema}` : slug) };
}

export async function GET(request: Request) {
  if (!thumbnailStoreEnabled()) return new Response(null, { status: 404 });
  const reason = problem(request.url);
  const where = target(request.url);
  if (reason || !where) return new Response(reason, { status: 400 });
  if (!fs.existsSync(path.join(CONTENT, `${where.slug}.mdx`))) {
    return new Response(`Decket finns inte: content/${where.slug}.mdx.`, { status: 404 });
  }
  return new Response(null, { status: 204 });
}

export async function PUT(request: Request) {
  if (!thumbnailStoreEnabled()) return new Response(null, { status: 404 });
  const reason = problem(request.url);
  const where = target(request.url);
  if (reason || !where) return new Response(reason, { status: 400 });
  if (!where.file) return new Response("Filnamn saknas (fil=).", { status: 400 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.length === 0 || data.length > MAX_BYTES) return new Response("Fel storlek", { status: 413 });
  const file = path.join(where.dir, where.file);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  } catch (error) {
    console.error("Granskningen kunde inte sparas:", error);
    return new Response("Kunde inte spara", { status: 500 });
  }
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  if (!thumbnailStoreEnabled()) return new Response(null, { status: 404 });
  const reason = problem(request.url);
  const where = target(request.url);
  if (reason || !where) return new Response(reason, { status: 400 });
  const dir = path.join(where.dir, "bilder");
  let removed = 0;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!IMAGE.test(name)) continue;
      fs.unlinkSync(path.join(dir, name));
      removed++;
    }
  }
  return Response.json({ removed });
}
