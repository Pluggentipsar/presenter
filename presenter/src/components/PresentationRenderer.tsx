import { MDXRemote } from "next-mdx-remote/rsc";
import * as Templates from "@/templates";
import { Slide } from "./Slide";
import { SlideViewer } from "./SlideViewer";
import { extractNotes } from "@/lib/extract-notes";
import { extractSlideMetas } from "@/lib/extract-slide-types";
import { extractMediaUrls } from "@/lib/extract-media-urls";
import { preloadFor } from "@/lib/deck-familjer";
import {
  preprocessOverlaysForPresenter,
} from "@/lib/mdx-parser";
import { getTheme, themeToCssVars } from "@/themes";
import { PresentationPreloader } from "./PresentationPreloader";
import type { BrandWatermark } from "@/lib/types";
import { wrapWithSlideBg, type SlideComponent } from "./withSlideBg";

interface PresentationRendererProps {
  source: string;
  syncId?: string;
  editTargets?: {slug: string; slideIndex: number}[];
  slug?: string;
  theme?: string;
  title?: string;
  brand?: BrandWatermark;
  ambient?: boolean | string;
  hiddenSlides?: number[];
  cuts?: import("@/lib/types").CutDef[];
  sliderEffects?: Record<string, import("@/lib/types").SliderEffectValue>;
  slideGradients?: Record<string, import("@/lib/types").SlideGradientValue>;
  slideAccents?: Record<string, string>;
  slideTextColors?: Record<string, string>;
  slideMutedColors?: Record<string, string>;
  accentOverride?: string;
  /** Deckets egna färger (filmfarg, seriefarger) som CSS-variabler. Se lib/deck-colors.ts. */
  deckColorVars?: Record<string, string>;
  textOverride?: string;
  mutedOverride?: string;
}

// Notes: <Notes>...</Notes> blocks parsas ut innan MDX-rendering
// (se extractNotes). De finns inte kvar i MDX-källkoden när den når MDXRemote.
// Alla mallar som exporteras från @/templates, plus Slide. Listan skrevs förr för hand och låg efter
// mallarna; nu följer den registret, och den publika versionen får bara de mallar som följer med.
const mdxComponents = {
  ...Templates,
  Slide,
};

/**
 * Alla mallar wrappas → bakgrunder (designpanelens "Bakgrund") funkar på
 * vilken slide som helst, oavsett om mallen har inbyggt bakgrundsstöd.
 * withSlideBg bor numera i en egen modul så editorns preview kan wrappa exakt
 * likadant — annars såg bakgrunder olika ut i de två lägena.
 */
// Exporteras för delningspaketets scenruta (src/app/[slug]/scen), som måste
// kompilera slides med exakt samma mallregister som visaren.
export const wrappedMdxComponents = Object.fromEntries(
  Object.entries(mdxComponents).map(([name, Component]) => [
    name,
    wrapWithSlideBg(Component as SlideComponent),
  ]),
) as unknown as typeof mdxComponents;

export async function PresentationRenderer({ source, editTargets, syncId, slug, theme, title, brand, ambient, hiddenSlides, cuts, sliderEffects, slideGradients, slideAccents, slideTextColors, slideMutedColors, accentOverride, deckColorVars, textOverride, mutedOverride }: PresentationRendererProps) {
  const { content, notes } = extractNotes(source);
  // Wrap slides med overlays (FloatingImage etc.) i SlideWithOverlays så de
  // renderas tillsammans med sin parent-template istället för som egen slide.
  const processedContent = preprocessOverlaysForPresenter(content);
  // OBS: metadata extraheras från RÅ-content (inte processedContent) så att
  // overlay-komponenter kan hoppas över och slideMetas hålls i takt med den
  // faktiska slide-listan (overlays mergas in i sin parent-slide).
  const slideMetas = extractSlideMetas(content);
  // Samla alla media-URL:er för preload (server-side för att undvika hydration-mismatch), plus det som
  // föreläsningsfamiljerna hämtar ur kod (lib/deck-familjer.ts).
  const mediaUrls = [...extractMediaUrls(processedContent), ...preloadFor(slug, source)];
  const themeTokens = getTheme(theme);
  const cssVars = themeToCssVars(themeTokens);
  // Global color overrides (frontmatter) appliceras ovanpå tema-tokens. Per-slide
  // override hanteras separat i SlideViewer (motion.div per slide-render).
  const globalColorVars: Record<string, string> = {};
  if (accentOverride) globalColorVars["--accent"] = accentOverride;
  if (textOverride) globalColorVars["--text"] = textOverride;
  if (mutedOverride) globalColorVars["--text-muted"] = mutedOverride;
  if (deckColorVars) Object.assign(globalColorVars, deckColorVars);

  return (
    <div
      style={{ ...cssVars, ...globalColorVars, background: "var(--bg)", color: "var(--text)" } as React.CSSProperties}
      data-ornament={themeTokens.ornamentStyle}
      data-theme={theme ?? "default"}
      className="h-screen w-screen"
    >
      <PresentationPreloader
        slug={slug ?? "unknown"}
        title={title ?? slug ?? "Presentation"}
        mediaUrls={mediaUrls}
      >
        <SlideViewer
          editTargets={editTargets}
          syncId={syncId}
          notes={notes}
          slideMetas={slideMetas}
          slug={slug}
          theme={theme ?? "default"}
          title={title}
          brand={brand}
          ambient={ambient}
          hiddenSlides={hiddenSlides}
          cuts={cuts}
          sliderEffects={sliderEffects}
          slideGradients={slideGradients}
          slideAccents={slideAccents}
          slideTextColors={slideTextColors}
          slideMutedColors={slideMutedColors}
          accentOverride={accentOverride}
          textOverride={textOverride}
          mutedOverride={mutedOverride}
        >
          {/*
            blockJS: false är INTE valfritt här.

            next-mdx-remote 6 slår som default på en remark-plugin som tar bort
            varje JSX-attribut vars värde är ett uttryck — alltså allt på formen
            prop={…}. Skyddet finns för MDX som kommer utifrån. Våra filer är
            Joels egna, men defaulten gällde ändå: 376 props i 306 slides över
            53 presentationer försvann tyst på vägen till mallen. overlay={0.35}
            gav ingen scrim, columns={3} gav default-antal kolumner,
            pauseAfter={2800} ignorerades, arrayer nådde aldrig fram.

            Inget felmeddelande, inget i konsolen — propen bara fanns inte.

            blockDangerousJS är kvar påslaget, så eval, Function, require,
            process och liknande globaler blockeras fortfarande.
          */}
          <MDXRemote
            source={processedContent}
            components={wrappedMdxComponents}
            options={{ blockJS: false }}
          />
        </SlideViewer>
      </PresentationPreloader>
    </div>
  );
}
