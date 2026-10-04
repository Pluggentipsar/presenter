"use client";

/**
 * Hämta den bästa versionen av en bild som ligger i urklippet.
 *
 * Bakgrund: när man kopierar en bild i PowerPoint hamnar flera format i
 * Windows-urklippet. Paste-händelsens `clipboardData.files` ger oss en PNG som
 * webbläsaren syntetiserat ur bitmap-formatet — och det formatet bär varken
 * alfa-kanal eller full upplösning. En bild med genomskinlig bakgrund kommer
 * därför tillbaka platt, med det genomskinliga ifyllt i vitt.
 *
 * Uppmätt på samma urklipp (PowerPoint → Chromium):
 *
 *   clipboardData.files        720×720   färgtyp 2 (RGB)    0 % genomskinligt
 *   navigator.clipboard.read() 1125×1125 färgtyp 6 (RGBA)  80 % genomskinligt
 *
 * `navigator.clipboard.read()` läser PNG-formatet direkt och behåller både
 * alfa och upplösning. Vi provar därför det först, och faller tillbaka på
 * paste-filen om läsningen inte går igenom — en platt bild är bättre än ingen.
 *
 * Fallbacken är inte teoretisk: async-läsningen kräver behörigheten
 * `clipboard-read`, som webbläsaren frågar om första gången per origin. Nekar
 * man, eller kör i en webbläsare utan stöd, ska inklistringen fungera ändå.
 */

/**
 * PowerPoint lägger även en `image/svg+xml` i urklippet. Den är vektor och
 * skulle vara skarpast av alla — men SVG:n refererar teckensnitt och effekter
 * som inte nödvändigtvis renderas likadant i en `<img>`. Vi väljer medvetet
 * PNG:en, som är en trogen rastrering av det man faktiskt såg.
 */
function pickImageType(types: readonly string[]): string | null {
  if (types.includes("image/png")) return "image/png";
  return (
    types.find((t) => t.startsWith("image/") && t !== "image/svg+xml") ?? null
  );
}

/**
 * @param fallback Bildfilen från `event.clipboardData.files`. Måste plockas ut
 *   synkront i paste-hanteraren — DataTransfer-objektet töms när hanteraren
 *   returnerar, så det går inte att läsa efter ett `await`.
 * @returns Den bästa tillgängliga versionen. Aldrig null om `fallback` fanns.
 */
export async function bestClipboardImage(fallback: File): Promise<File> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    return fallback;
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = pickImageType(item.types);
      if (!type) continue;

      const blob = await item.getType(type);
      // Ett tomt blob är ingen bild — hellre paste-filen då.
      if (blob.size === 0) continue;

      const ext = type === "image/png" ? "png" : type.split("/")[1] || "png";
      return new File([blob], `urklipp.${ext}`, {
        type: blob.type || type,
      });
    }
  } catch {
    // Nekad behörighet, tappat fokus eller webbläsare utan stöd. Inklistringen
    // ska fungera ändå — bara utan genomskinlighet.
  }

  return fallback;
}
