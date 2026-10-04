/**
 * Bygg en CSS-`background`-sträng från en bakgrundskälla + valfri overlay.
 *
 * Stödjer:
 * - Bildsökväg (`/foo.png` eller `https://...`) → renderas som `url('...') cover`
 * - CSS-värde (gradient, färg, etc) → används som det är
 * - undefined → fallback (default: temats `var(--bg)`)
 *
 * Overlay läggs som en `linear-gradient`-tonad färg på TOPP av bakgrunden.
 * Mörk = svart, ljus = vit. Värdet 0-1 = opacity.
 *
 * Exempel:
 * ```ts
 * buildBackgroundCss("https://foo.jpg", 0.4, "dark")
 * // → "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://foo.jpg') center/cover no-repeat"
 * ```
 */
export function buildBackgroundCss(
  bg: string | undefined,
  overlay?: number | string,
  overlayMode: "dark" | "light" = "dark",
  fallback: string = "var(--slide-base, var(--bg))"
): string {
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const hasOverlay =
    typeof overlayNum === "number" && !isNaN(overlayNum) && overlayNum > 0;

  const overlayLayer = hasOverlay
    ? `linear-gradient(${
        overlayMode === "light"
          ? `rgba(255,255,255,${overlayNum}), rgba(255,255,255,${overlayNum})`
          : `rgba(0,0,0,${overlayNum}), rgba(0,0,0,${overlayNum})`
      })`
    : "";

  if (!bg) {
    return hasOverlay ? `${overlayLayer}, ${fallback}` : fallback;
  }

  const isImage = bg.startsWith("/") || bg.startsWith("http");
  const bgValue = isImage ? `url('${bg}') center/cover no-repeat` : bg;

  return hasOverlay ? `${overlayLayer}, ${bgValue}` : bgValue;
}

/**
 * Overlay-presets för M-menyn. Värdet `overlay` lagras som sträng i frontmatter
 * och tolkas av buildBackgroundCss; `overlayMode` är light eller dark.
 */
export interface OverlayPreset {
  id: string;
  label: string;
  overlay: number;
  mode: "dark" | "light";
}

export const OVERLAY_PRESETS: OverlayPreset[] = [
  { id: "dark-subtle", label: "Mörk · subtil", overlay: 0.3, mode: "dark" },
  { id: "dark-medium", label: "Mörk · medium", overlay: 0.5, mode: "dark" },
  { id: "dark-strong", label: "Mörk · stark", overlay: 0.7, mode: "dark" },
  { id: "light-subtle", label: "Ljus · subtil", overlay: 0.3, mode: "light" },
  { id: "light-medium", label: "Ljus · medium", overlay: 0.5, mode: "light" },
  { id: "light-strong", label: "Ljus · stark", overlay: 0.7, mode: "light" },
];
