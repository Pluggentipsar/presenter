"use server";

import { promises as fs } from "fs";
import path from "path";
import { assertValidSlug } from "./slug";

/**
 * Server actions för att hantera FloatingVideo-filer.
 *
 * Videos lagras i `public/videos/[slug]/` och nås via web-path
 * `/videos/[slug]/filename.ext`. Speglar floating-image-actions men med
 * video-MIME-typer och större max-storlek.
 */

export interface FloatingVideoItem {
  /** Filnamn med ändelse, t.ex. "demo.mp4". */
  name: string;
  /** Web-path till videon. */
  path: string;
  /** Filstorlek i bytes. */
  size: number;
  /** Senast modifierad (ISO-string). */
  mtime: string;
}

function safeVideosDir(slug: string): string {
  assertValidSlug(slug);
  return path.join(process.cwd(), "public", "videos", slug);
}

/**
 * Lista alla videos i `public/videos/[slug]/`.
 */
export async function listFloatingVideos(slug: string): Promise<FloatingVideoItem[]> {
  const dir = safeVideosDir(slug);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items: FloatingVideoItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("_")) continue;

      const filePath = path.join(dir, entry.name);
      const stat = await fs.stat(filePath);
      items.push({
        name: entry.name,
        path: `/videos/${slug}/${entry.name}`,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }

    items.sort((a, b) => b.mtime.localeCompare(a.mtime));
    return items;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName);
  const cleaned = base
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || `video-${Date.now()}`;
}

/**
 * Lägg till en video i `public/videos/[slug]/`.
 */
export async function uploadFloatingVideo(
  slug: string,
  formData: FormData,
): Promise<{ path: string; name: string }> {
  const dir = safeVideosDir(slug);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Ingen fil hittades i formData");
  }

  // Tillåtna video-MIME-typer. .mov från iPhone kommer som video/quicktime.
  const allowedTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-m4v",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Otillåten filtyp: ${file.type}. Tillåtet: MP4, WEBM, OGG, MOV, M4V.`);
  }

  // Max storlek 500 MB. Sanity-check — uppladdning sker lokalt så enda
  // praktiska kostnaden är RAM under uppladdning.
  const MAX_SIZE = 500 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Filen är för stor (${Math.round(file.size / 1024 / 1024)} MB). Max 500 MB.`);
  }

  await fs.mkdir(dir, { recursive: true });

  let filename = sanitizeFilename(file.name);

  const targetPath = path.join(dir, filename);
  try {
    await fs.access(targetPath);
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
    path: `/videos/${slug}/${filename}`,
    name: filename,
  };
}

/**
 * Radera en video från `public/videos/[slug]/`.
 */
export async function deleteFloatingVideo(slug: string, filename: string): Promise<void> {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("Ogiltigt filnamn");
  }
  const dir = safeVideosDir(slug);
  const filePath = path.join(dir, filename);

  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(dir);
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    throw new Error("Path traversal upptäckt");
  }

  await fs.unlink(filePath);
}
