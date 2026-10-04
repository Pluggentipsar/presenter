import { MDXRemote } from "next-mdx-remote/rsc";
import * as Templates from "@/templates";
import { Slide } from "./Slide";
import { AudienceViewer } from "./AudienceViewer";
import { extractNotes } from "@/lib/extract-notes";
import { extractSlideMetas } from "@/lib/extract-slide-types";
import { preprocessOverlaysForPresenter } from "@/lib/mdx-parser";
import { AudienceEditProvider } from "@/lib/inline-edit";
import { getTheme, themeToCssVars } from "@/themes";
import type { AudienceSession } from "@/lib/audience-session";

interface AudiencePresentationProps {
  source: string;
  session: AudienceSession;
  presentationTitle: string;
  theme?: string;
  /** Deploy-läge från presentationens frontmatter. Påverkar media-rendering i audience. */
  deployMode?: "full" | "cloud-media" | "local-only";
}

// Alla mallar som exporteras från @/templates, plus Slide (som i spelaren).
const mdxComponents = {
  ...Templates,
  Slide,
};

export async function AudiencePresentation({
  source,
  session,
  presentationTitle,
  theme,
  deployMode = "full",
}: AudiencePresentationProps) {
  const { content } = extractNotes(source);
  // Wrap slides med overlays (FloatingImage etc.) i SlideWithOverlays.
  const processedContent = preprocessOverlaysForPresenter(content);
  // Metadata från RÅ-content så overlays hoppas över och hålls i takt
  // med slide-listan (se PresentationRenderer).
  const slideMetas = extractSlideMetas(content);
  const themeTokens = getTheme(theme);
  const cssVars = themeToCssVars(themeTokens);

  return (
    <div
      style={cssVars as React.CSSProperties}
      data-ornament={themeTokens.ornamentStyle}
      data-theme={theme ?? "default"}
      className="min-h-screen"
    >
      <AudienceEditProvider mediaMode={deployMode}>
        <AudienceViewer
          session={session}
          slideMetas={slideMetas}
          presentationTitle={presentationTitle}
        >
          {/*
            Samma skäl som i PresentationRenderer: next-mdx-remote 6 strippar
            som default alla prop={…}-attribut. Utan det här renderar publikvyn
            samma slide annorlunda än presentatörsvyn — scrims, kolumnantal och
            timingar skulle saknas här men finnas där.
          */}
          <MDXRemote
            source={processedContent}
            components={mdxComponents}
            options={{ blockJS: false }}
          />
        </AudienceViewer>
      </AudienceEditProvider>
    </div>
  );
}
