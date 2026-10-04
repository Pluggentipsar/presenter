import type { CSSProperties, ReactNode } from "react";
import { getTheme, themeToCssVars } from "@/themes";
import type { PresentationMeta } from "@/lib/types";
import { ShareScrollEffect } from "./ShareScrollEffect";

/**
 * Ger delningspaketets sidor samma tema som decket: samma CSS-variabler och
 * data-theme som PresentationRenderer sätter runt visaren.
 */
export function ShareThemeRoot({ meta, children }: { meta: PresentationMeta; children: ReactNode }) {
  const tokens = getTheme(meta.theme);
  const overrides: Record<string, string> = {};
  if (meta.accentOverride) overrides["--accent"] = meta.accentOverride;
  if (meta.textOverride) overrides["--text"] = meta.textOverride;
  if (meta.mutedOverride) overrides["--text-muted"] = meta.mutedOverride;
  if (meta.deckColorVars) Object.assign(overrides, meta.deckColorVars);
  return (
    <div
      style={{ ...themeToCssVars(tokens), ...overrides } as CSSProperties}
      data-ornament={tokens.ornamentStyle}
      data-theme={meta.theme ?? "default"}
      data-share-root=""
    >
      <ShareScrollEffect />
      {children}
    </div>
  );
}
