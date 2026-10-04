import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPresentation, getPresentationSlugs } from "@/lib/mdx";
import { extractNotes } from "@/lib/extract-notes";
import { preprocessOverlaysForPresenter } from "@/lib/mdx-parser";
import { getTheme, themeToCssVars, themes } from "@/themes";
import { wrappedMdxComponents } from "@/components/PresentationRenderer";
import { StageViewer } from "@/components/share/StageViewer";
import type { StepTarget } from "@/lib/share/stage-protocol";
import { extractSlideMetas } from "@/lib/extract-slide-types";
import { linjenSky } from "@/lib/linjen";

// Scenrutan: en enda slide i ett bestämt klickläge, avsedd att ligga i en
// iframe på landningssidan och i läsläget (se lib/share/stage-protocol.ts).
// Manus (<Notes>) tas bort ur källan och skickas aldrig till klienten.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPresentationSlugs().map((slug) => ({ slug }));
}

export const metadata = { robots: { index: false, follow: false } };

function parseStep(raw: string | undefined): StepTarget {
  if (raw === "last" || raw === "sist") return "last";
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default async function StagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ slide?: string; step?: string; direkt?: string; tema?: string }>;
}) {
  const { slug } = await params;
  const { slide, step, direkt, tema } = await searchParams;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  const { meta } = presentation;
  const { content } = extractNotes(presentation.content);
  const source = preprocessOverlaysForPresenter(content);
  const themeTokens = getTheme(meta.theme);
  const colorVars: Record<string, string> = {};
  if (meta.accentOverride) colorVars["--accent"] = meta.accentOverride;
  if (meta.textOverride) colorVars["--text"] = meta.textOverride;
  if (meta.mutedOverride) colorVars["--text-muted"] = meta.mutedOverride;
  if (meta.deckColorVars) Object.assign(colorVars, meta.deckColorVars);
  // ?tema=: ett annat tema för den här visningen, som när T byter tema i spelaren. Temats roller
  // läggs ovanpå deckets färger, precis som spelarens temabyte (granskningen, docs/GRANSKA.md).
  // Ett okänt namn ger deckets eget tema.
  const override = typeof tema === "string" && /^[a-z0-9_]{1,60}$/.test(tema) && Object.hasOwn(themes, tema) ? tema : null;
  const shownTheme = override ? getTheme(override) : themeTokens;

  const initialSlide = Math.max(0, (Number.parseInt(slide ?? "", 10) || 1) - 1);
  // Linjen: scenrutan visar samma dygnshimmel som spelaren för den valda sliden.
  if (shownTheme.signature === "linjen") colorVars["--linjen-sky"] = linjenSky(extractSlideMetas(content), initialSlide);

  return (
    <div
      style={{
        ...themeToCssVars(themeTokens),
        ...colorVars,
        ...(override ? themeToCssVars(shownTheme) : {}),
        background: "var(--bg)",
        color: "var(--text)",
      } as CSSProperties}
      data-ornament={shownTheme.ornamentStyle}
      data-theme={override ?? meta.theme ?? "default"}
      className="h-screen w-screen"
    >
      <StageViewer
        initialSlide={initialSlide}
        initialStep={parseStep(step)}
        // Granskningsvyn byter slide utan övergång (?direkt=1), så att den fungerar också i en dold flik.
        instant={direkt === "1"}
        hiddenSlides={meta.hiddenSlides}
        slideGradients={meta.slideGradients}
        slideAccents={meta.slideAccents}
        slideTextColors={meta.slideTextColors}
        slideMutedColors={meta.slideMutedColors}
      >
        <MDXRemote
          source={source}
          components={wrappedMdxComponents}
          options={{ blockJS: false }}
        />
      </StageViewer>
    </div>
  );
}
