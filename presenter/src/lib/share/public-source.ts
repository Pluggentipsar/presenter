/**
 * Publik kopia av ett deck (PRESENTER_PUBLIC=1).
 *
 * När en föreläsning exporteras för att delas publikt (scripts/dela-export.mjs)
 * får ingenting som är skrivet TILL Joel eller till en AI följa med ut:
 *
 *   - <Notes>-block: talmanus, regi, tider och proveniens. Visaren skickar dem
 *     annars till klienten (presenter-vyn behöver dem), så de skulle ligga i
 *     sidans källkod även om de aldrig syns.
 *   - claude="…": Joels instruktioner till nästa byggpass.
 *   - planeringsfält på mallar som inte själva läser dem (se kartan nedan).
 *     De blir annars props på en klientkomponent och hamnar i sidans payload.
 *
 * Rensningen sker på källtexten innan något renderas, på ETT ställe
 * (getPresentation i lib/mdx.ts), så den gäller visning, scenruta,
 * landningssida och läsläge lika. Utan miljövariabeln händer ingenting —
 * dev-servern, editorn och Vercel-bygget är opåverkade.
 */

import { AGARE } from "@/lib/agare";

/**
 * Props som är planeringsmetadata och som mallen inte renderar. "*" gäller alla
 * mallar. Lägg BARA till en mall här efter att ha kontrollerat att den inte läser
 * fälten — flera mallar har innehållsprops som råkar heta `kalla`.
 *
 * `syfte`, `tid` och `akt` skrivs av studions översikt och manusläge på
 * vilken slide som helst. Ingen mall utom `Utkast` läser dem (kontrollerat
 * 21 september 2026), så de rensas överallt utom där.
 */
const AUTHORING_PROPS: Record<string, readonly string[]> = {
  "*": ["claude", "akt", "syfte", "tid"],
  StaScene: ["visuell", "kalla", "mall"],
  BrowserError: ["visuell", "kalla", "mall"],
  ModalityCascade: ["visuell", "kalla", "mall"],
  // Kontrollerat 24 september 2026: fälten finns bara i editorns schema och PPTX-exporten.
  LectureScene: ["visuell", "kalla", "mall"],
  // Kontrollerat 26 september 2026 (två föreläsningspass): mallarna läser inte fälten.
  LectureSequence: ["visuell", "kalla", "mall"],
  KulScene: ["visuell", "kalla", "mall"],
  ElevLectureScene: ["visuell", "kalla", "mall"],
  TrustScene: ["visuell", "kalla", "mall"],
};

/** Mallar som själva visar sina planeringsfält och därför får behålla dem. */
const KEEPS_PLANNING_PROPS: Record<string, readonly string[]> = {
  Utkast: ["syfte", "tid"],
};

export function isPublicBuild(): boolean {
  return process.env.PRESENTER_PUBLIC === "1";
}

/**
 * Sidlänkar inom appen, till exempel materialsUrl="/mitt-material" eller
 * resourceUrl="/min-workshop", finns inte i den statiska kopian: den bär bara
 * ett deck. De skrivs om till appens publika adress, där sidorna finns
 * (26 september 2026). Filer har filändelse (/bilder/…/x.png) och rörs inte, och
 * länkar till decket självt stannar i kopian. Standardadressen står i lib/agare.ts; utan adress
 * stannar länkarna som de är.
 */
const PUBLIC_APP_ORIGIN = (process.env.PRESENTER_PUBLIC_ORIGIN ?? AGARE.publikAdress).replace(/\/$/, "");

function publicLink(target: string, slug?: string): string {
  const pathname = target.split(/[?#]/)[0];
  const last = pathname.split("/").pop() ?? "";
  if (pathname.startsWith("/_next/") || /\.[a-z0-9]{2,5}$/i.test(last)) return target;
  if (slug && (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`))) return target;
  return PUBLIC_APP_ORIGIN + target;
}

export function sanitizePublicSource(source: string, slug?: string): string {
  return stripAuthoring(source).replace(
    /(\s[A-Za-z0-9_]*(?:Url|url|Href|href))="(\/(?!\/)[^"]*)"/g,
    (_, name: string, target: string) => `${name}="${publicLink(target, slug)}"`,
  );
}

function stripAuthoring(source: string): string {
  const withoutNotes = source.replace(/<Notes>[\s\S]*?<\/Notes>[ \t]*\r?\n?/g, "");
  const lines = withoutNotes.split("\n");
  const starts: { tag: string; line: number }[] = [];
  lines.forEach((line, i) => {
    const match = /^<([A-Z][A-Za-z0-9]*)/.exec(line);
    if (match) starts.push({ tag: match[1], line: i });
  });
  if (starts.length === 0) return withoutNotes;

  const parts: string[] = [lines.slice(0, starts[0].line).join("\n")];
  starts.forEach((start, k) => {
    let block = lines.slice(start.line, starts[k + 1]?.line ?? lines.length).join("\n");
    const keep = KEEPS_PLANNING_PROPS[start.tag] ?? [];
    const props = [...AUTHORING_PROPS["*"], ...(AUTHORING_PROPS[start.tag] ?? [])].filter((prop) => !keep.includes(prop));
    for (const prop of props) {
      // Ett attribut per rad, som decken är formaterade. Värdet får spänna
      // över flera rader. Båda citattecknen: Joel skriver claude='…' när
      // texten själv innehåller "…".
      block = block
        .replace(new RegExp(`^[ \\t]+${prop}="[^"]*"[ \\t]*\\r?\\n`, "gm"), "")
        .replace(new RegExp(`^[ \\t]+${prop}='[^']*'[ \\t]*\\r?\\n`, "gm"), "");
      // Enradiga taggar (<VemScene scene="…" tid="…" syfte="…" />): attributet
      // står på taggens första rad. Bara där, och bara hela attribut.
      const [first, ...rest] = block.split("\n");
      const inline = first
        .replace(new RegExp(`\\s${prop}="[^"]*"`, "g"), "")
        .replace(new RegExp(`\\s${prop}='[^']*'`, "g"), "");
      if (inline !== first) block = [inline, ...rest].join("\n");
    }
    parts.push(block);
  });
  return parts.join("\n");
}
