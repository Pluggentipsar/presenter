"use server";

import fs from "fs";
import path from "path";
import type {
  PexelsPhoto,
  PexelsSearchResult,
  PexelsDownloadResult,
} from "./pexels-types";

/**
 * Pexels API-integration för bildpicker i editorn.
 *
 * Sökning görs via server action (nyckel exponeras aldrig i klient).
 * Vald bild laddas ner till public/bilder/pexels/ så presentationen
 * fungerar offline (viktigt vid SETT-mässor m.m. med flaky wifi).
 * Attribution sparas i public/bilder/pexels/_credits.json.
 *
 * Types ligger i pexels-types.ts eftersom "use server"-filer endast
 * får exportera async functions.
 */

const PEXELS_DIR = path.join(process.cwd(), "public", "bilder", "pexels");
const CREDITS_FILE = path.join(PEXELS_DIR, "_credits.json");

/**
 * Sök bilder på Pexels.
 */
export async function searchPexels(
  query: string,
  page = 1
): Promise<PexelsSearchResult> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return {
      photos: [],
      totalResults: 0,
      page,
      perPage: 0,
      error: "PEXELS_API_KEY saknas i .env.local",
    };
  }

  if (!query.trim()) {
    return { photos: [], totalResults: 0, page, perPage: 0 };
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=24&page=${page}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      // Ingen caching — Pexels resultat ska vara färska
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        photos: [],
        totalResults: 0,
        page,
        perPage: 0,
        error: `Pexels svarade ${res.status}`,
      };
    }
    const data = await res.json();
    return {
      photos: data.photos ?? [],
      totalResults: data.total_results ?? 0,
      page: data.page ?? page,
      perPage: data.per_page ?? 24,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nätverksfel";
    return { photos: [], totalResults: 0, page, perPage: 0, error: message };
  }
}

/**
 * Ladda ner en Pexels-bild lokalt och returnera relativ path
 * (att lagra i MDX). Sparar också credit i _credits.json.
 */
export async function downloadPexelsImage(
  photo: PexelsPhoto
): Promise<PexelsDownloadResult> {
  try {
    if (!fs.existsSync(PEXELS_DIR)) {
      fs.mkdirSync(PEXELS_DIR, { recursive: true });
    }

    const filename = `pexels-${photo.id}.jpg`;
    const filePath = path.join(PEXELS_DIR, filename);
    const publicPath = `/bilder/pexels/${filename}`;

    // Skippa om redan nedladdad
    if (!fs.existsSync(filePath)) {
      const res = await fetch(photo.src.large2x ?? photo.src.large);
      if (!res.ok) {
        return { ok: false, error: `Kunde inte ladda ner (${res.status})` };
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    }

    // Uppdatera credits
    await appendCredit({
      id: photo.id,
      file: filename,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      pexels_url: photo.url,
      alt: photo.alt,
      downloaded_at: new Date().toISOString(),
    });

    return { ok: true, path: publicPath };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okänt fel";
    return { ok: false, error: message };
  }
}

interface CreditEntry {
  id: number;
  file: string;
  photographer: string;
  photographer_url: string;
  pexels_url: string;
  alt: string;
  downloaded_at: string;
}

async function appendCredit(entry: CreditEntry): Promise<void> {
  let credits: CreditEntry[] = [];
  if (fs.existsSync(CREDITS_FILE)) {
    try {
      const raw = fs.readFileSync(CREDITS_FILE, "utf-8");
      credits = JSON.parse(raw);
    } catch {
      credits = [];
    }
  }
  // Ta bort gammal entry med samma id om finns
  credits = credits.filter((c) => c.id !== entry.id);
  credits.push(entry);
  fs.writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2), "utf-8");
}
