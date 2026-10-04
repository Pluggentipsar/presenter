"use client";

const CACHE_NAME = "presenter-thumbnails-v3";
const CACHE_PREFIX = "/__presenter-thumbnail-cache__/v3/";

function canUseCacheStorage(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

function cacheUrl(
  slug: string,
  slideId: string,
  renderHash: string,
): string {
  const path = [
    CACHE_PREFIX,
    encodeURIComponent(slug),
    "/",
    encodeURIComponent(slideId),
    "/",
    encodeURIComponent(renderHash),
    ".webp",
  ].join("");
  return new URL(path, window.location.origin).toString();
}

/**
 * Serverns gemensamma lagring (app/api/miniatyr). Cache Storage gäller en
 * adress i ett program; filerna på disk delas av Chrome, appens fönster och
 * varje port på datorn. Se lib/thumbnail-store.server.ts.
 */
function storeUrl(slug: string, slideId: string, renderHash: string): string {
  const query = new URLSearchParams({ s: slug, i: slideId, h: renderHash });
  return `/api/miniatyr?${query.toString()}`;
}

/** Av efter första nekande svaret (publik värd, skrivskyddat bygge). */
let storeAvailable = true;

async function loadStoredThumbnail(slug: string, slideId: string, renderHash: string): Promise<Blob | null> {
  if (!storeAvailable) return null;
  try {
    const response = await fetch(storeUrl(slug, slideId, renderHash));
    if (response.ok) {
      const blob = await response.blob();
      return blob.size > 0 ? blob : null;
    }
    if (response.status !== 404) storeAvailable = false;
    return null;
  } catch {
    return null;
  }
}

function saveStoredThumbnail(slug: string, slideId: string, renderHash: string, blob: Blob): void {
  if (!storeAvailable) return;
  void fetch(storeUrl(slug, slideId, renderHash), {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": blob.type || "image/webp" },
  })
    .then((response) => {
      if (response.status === 404) storeAvailable = false;
    })
    .catch(() => {
      // Lagringen är en genväg. Bilden finns ändå i Cache Storage och i minnet.
    });
}

function toCacheResponse(blob: Blob, renderHash: string): Response {
  return new Response(blob, {
    headers: {
      "Content-Type": blob.type || "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Presenter-Render-Hash": renderHash,
    },
  });
}

export async function loadCachedThumbnail(
  slug: string,
  slideId: string,
  renderHash: string,
): Promise<Blob | null> {
  if (!canUseCacheStorage()) return loadStoredThumbnail(slug, slideId, renderHash);
  try {
    const cache = await caches.open(CACHE_NAME);
    const targetUrl = cacheUrl(slug, slideId, renderHash);
    const response = await cache.match(targetUrl);
    if (response?.ok) return await response.blob();

    // Fångad i en annan webbläsare, i appen eller på en annan port: läs filen
    // och lägg den i den här webbläsarens cache till nästa gång.
    const stored = await loadStoredThumbnail(slug, slideId, renderHash);
    if (stored) {
      await cache.put(targetUrl, toCacheResponse(stored, renderHash));
      return stored;
    }

    // När en äldre presentation får permanenta slideId:n byts cache-nyckeln,
    // men renderHash är fortfarande densamma. Återanvänd då den gamla bilden
    // och flytta den tyst till den nya nyckeln i stället för att rendera om
    // presentationens samtliga slides en enda gång.
    const slugPrefix = new URL(
      `${CACHE_PREFIX}${encodeURIComponent(slug)}/`,
      window.location.origin,
    ).toString();
    const renderSuffix = `/${encodeURIComponent(renderHash)}.webp`;
    const requests = await cache.keys();
    const legacyRequest = requests.find(
      (request) =>
        request.url.startsWith(slugPrefix) &&
        request.url.endsWith(renderSuffix),
    );
    if (!legacyRequest) return null;
    const legacyResponse = await cache.match(legacyRequest);
    if (!legacyResponse?.ok) return null;
    await cache.put(targetUrl, legacyResponse.clone());
    return await legacyResponse.blob();
  } catch {
    return null;
  }
}

export async function storeCachedThumbnail(
  slug: string,
  slideId: string,
  renderHash: string,
  blob: Blob,
): Promise<void> {
  saveStoredThumbnail(slug, slideId, renderHash, blob);
  if (!canUseCacheStorage()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheUrl(slug, slideId, renderHash), toCacheResponse(blob, renderHash));
  } catch {
    // CacheStorage är en optimering. Minnescachen fortsätter fungera även
    // i privata browserlägen eller miljöer där Cache API är avstängt.
  }
}

export async function pruneCachedThumbnails(
  slug: string,
  validEntries: Array<{ slideId: string; renderHash: string }>,
): Promise<void> {
  if (!canUseCacheStorage()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const slugPrefix = new URL(
      `${CACHE_PREFIX}${encodeURIComponent(slug)}/`,
      window.location.origin,
    ).toString();
    const valid = new Set(
      validEntries.map(({ slideId, renderHash }) =>
        cacheUrl(slug, slideId, renderHash),
      ),
    );
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter(
          (request) =>
            request.url.startsWith(slugPrefix) && !valid.has(request.url),
        )
        .map((request) => cache.delete(request)),
    );
  } catch {
    // Se kommentaren i storeCachedThumbnail.
  }
}
