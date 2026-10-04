/**
 * Deckets egna färger ur frontmattern. Byggt för en filmserie i fyra delar
 * (30 september 2026): samma sjö, men varje film får sin egen färg på ljuset.
 *
 *   filmfarg: aprikos
 *     Ljusets färg i Stage-scenerna (Stage) blir CSS-variabeln --film:
 *     horisontens sken, skymningsbandet, ljuspunkterna i omslaget.
 *   seriefarger: [vatterbla, aprikos, smaragdgron, syrenlila]
 *     Seriens ljus på vattnet, ett per film: --series-1, --series-2 …
 *
 * Värdena är namn ur avsändarprofilernas paletter (lib/avsandarprofiler.ts, i
 * Joels version en kommuns; med eller utan å/ä/ö: ”smaragdgrön” går bra) eller en
 * färg som #rrggbb. Utan dem blir allt som förut, eftersom Stage-scenerna då
 * faller tillbaka på temats ljus. Variablerna är inga temafärger, så de följer med
 * när T byter tema.
 */
import { avsandarprofiler } from "./avsandarprofiler";

export function resolveDeckColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  const key = raw.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  return avsandarprofiler.map((profil) => profil.palett[key]?.primary).find(Boolean);
}

export function deckColorVars(frontmatter: Record<string, unknown> | undefined | null): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!frontmatter) return vars;
  const film = resolveDeckColor(frontmatter.filmfarg);
  if (film) vars["--film"] = film;
  const raw = frontmatter.seriefarger;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  list.slice(0, 8).forEach((entry, i) => {
    const color = resolveDeckColor(entry);
    if (color) vars[`--series-${i + 1}`] = color;
  });
  return vars;
}
