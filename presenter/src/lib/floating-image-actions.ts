"use server";

import { promises as fs } from "fs";
import path from "path";
import { assertValidSlug } from "./slug";

/**
 * Server actions för att hantera FloatingImage-bilder.
 *
 * Bilder lagras i `public/bilder/[slug]/` och nås via web-path
 * `/bilder/[slug]/filename.ext`. Detta funkar både lokalt och via
 * Cloudflare-tunneln eftersom Next.js servar `public/`-mappen.
 *
 * Vi använder server actions istället för API-routes eftersom:
 *  - Det är enklare (ingen request/response-hantering)
 *  - Vi har redan use-server-pattern via Pexels-integrationen
 *  - Caller kan await:a direkt i React-komponenten
 */

export interface FloatingImageItem {
  /** Filnamn med ändelse, t.ex. "diktbilder.png". */
  name: string;
  /** Web-path till bilden, t.ex. "/bilder/lara-med-ai/diktbilder.png". */
  path: string;
  /** Filstorlek i bytes. */
  size: number;
  /** Senast modifierad (ISO-string). */
  mtime: string;
}

function safeBilderDir(slug: string): string {
  assertValidSlug(slug);
  return path.join(process.cwd(), "public", "bilder", slug);
}

/**
 * Lista alla bilder i `public/bilder/[slug]/`.
 *
 * Returnerar tom lista om mappen inte finns. Filtrerar bort dolda filer
 * och underordnade kataloger.
 */
export async function listFloatingImages(slug: string): Promise<FloatingImageItem[]> {
  const dir = safeBilderDir(slug);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items: FloatingImageItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("_")) continue; // hoppa över _credits.json etc.

      const filePath = path.join(dir, entry.name);
      const stat = await fs.stat(filePath);
      items.push({
        name: entry.name,
        path: `/bilder/${slug}/${entry.name}`,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }

    // Senast ändrad först
    items.sort((a, b) => b.mtime.localeCompare(a.mtime));
    return items;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Säkrar ett filnamn — strippar path-segments, behåller bara basename
 * och konverterar till lowercase-friendly format.
 */
function sanitizeFilename(originalName: string): string {
  // Behåll bara basename (avlägsna ev path-injection)
  const base = path.basename(originalName);
  // Lowercase + ersätt mellanslag och konstiga tecken med bindestreck
  const cleaned = base
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || `image-${Date.now()}`;
}

/**
 * Lägg till en bild i `public/bilder/[slug]/`.
 *
 * Tar emot FormData med fältet "file". Skapar mappen om den inte finns.
 * Om filnamnet redan existerar läggs en timestamp på.
 *
 * Returnerar web-path till uppladdad bild.
 */
export async function uploadFloatingImage(
  slug: string,
  formData: FormData,
): Promise<{ path: string; name: string }> {
  const dir = safeBilderDir(slug);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Ingen fil hittades i formData");
  }

  // Säkerhets-check: bara bildtyper
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Otillåten filtyp: ${file.type}. Tillåtet: PNG, JPG, WEBP, GIF, SVG.`);
  }

  // Säkerhets-check: max storlek 10 MB
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Filen är för stor (${Math.round(file.size / 1024 / 1024)} MB). Max 10 MB.`);
  }

  // Skapa mappen om den inte finns
  await fs.mkdir(dir, { recursive: true });

  // Säkra filnamnet
  let filename = sanitizeFilename(file.name);

  // Om filen redan finns, lägg på timestamp
  const targetPath = path.join(dir, filename);
  try {
    await fs.access(targetPath);
    // Filen finns — generera unikt namn
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    filename = `${base}-${Date.now()}${ext}`;
  } catch {
    // Filen finns inte — använd ursprungsnamn
  }

  const finalPath = path.join(dir, filename);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(finalPath, buffer);

  return {
    path: `/bilder/${slug}/${filename}`,
    name: filename,
  };
}

/**
 * Radera en bild från `public/bilder/[slug]/`.
 * Bara filer i exakt den katalogen tillåts (för säkerhet).
 */
export async function deleteFloatingImage(slug: string, filename: string): Promise<void> {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("Ogiltigt filnamn");
  }
  const dir = safeBilderDir(slug);
  const filePath = path.join(dir, filename);

  // Verifiera att filen ligger inom dir (skydd mot path traversal)
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(dir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    throw new Error("Path traversal upptäckt");
  }

  await fs.unlink(filePath);
}
