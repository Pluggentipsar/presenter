/**
 * Extrahera alla media-URL:er från en MDX-källa.
 *
 * Scannar för vanliga media-props som används i templates:
 * src, background, image, videoSrc, audio, bookSrc, logo, poster
 *
 * Accepterar både lokala paths (`/bilder/foo.png`) och absoluta URL:er
 * (`https://...`). Dubletter dedupliceras.
 *
 * Returnerar strukturerad lista så preloadern kan välja rätt teknik
 * (Image vs Video vs Audio) för varje.
 */

export interface MediaUrl {
  url: string;
  type: "image" | "video" | "audio";
}

/** Media-props vi letar efter i template-anrop. */
const MEDIA_PROPS = [
  "src",
  "background",
  "image",
  "secondaryImage",
  "backdrop",
  "videoSrc",
  "audio",
  "bookSrc",
  "logo",
  "poster",
  "imageAlt", // skip
] as const;

/** Filändelser → media-typ. */
function guessType(url: string): "image" | "video" | "audio" {
  const lower = url.toLowerCase().split("?")[0];
  if (/\.(mp4|webm|mov|mkv|m4v|ogv)$/.test(lower)) return "video";
  if (/\.(mp3|wav|m4a|ogg|aac|flac)$/.test(lower)) return "audio";
  return "image";
}

/** Är värdet en hanterbar URL (lokal path eller http/https)? */
function isValidUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  return false;
}

export function extractMediaUrls(mdxSource: string): MediaUrl[] {
  const found = new Map<string, MediaUrl>();

  // Pattern: propname="value"  eller  propname='value'
  // Greedy-handling: matchar inte \" eller \' så vi bryter vid första äkta quote
  const propPatterns = MEDIA_PROPS.filter((p) => p !== "imageAlt").map(
    (prop) => new RegExp(`\\b${prop}${prop === "image" || prop === "videoSrc" ? "\\d*" : ""}\\s*=\\s*["']([^"']+)["']`, "g")
  );

  for (const pattern of propPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(mdxSource)) !== null) {
      const value = match[1].trim();
      if (!isValidUrl(value)) continue;
      // Dedup via map-key
      if (found.has(value)) continue;
      found.set(value, { url: value, type: guessType(value) });
    }
  }

  // Extra pattern: CSS url() inne i style-attribut (background-image via style-prop)
  const cssUrlPattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  let cssMatch: RegExpExecArray | null;
  while ((cssMatch = cssUrlPattern.exec(mdxSource)) !== null) {
    const value = cssMatch[1].trim();
    if (!isValidUrl(value)) continue;
    if (found.has(value)) continue;
    found.set(value, { url: value, type: guessType(value) });
  }

  return Array.from(found.values());
}
