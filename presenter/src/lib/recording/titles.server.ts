import fs from "node:fs";
import path from "node:path";
import { parseMdx } from "@/lib/mdx-parser";
import { slideTitleFor } from "@/lib/deck-familjer";

/**
 * Kapitelnamn per slide (2 oktober 2026). Spelaren loggar en titel bara för mallar den känner igen;
 * för övriga, till exempel filmdeckens scener, hämtas namnet här ur deckets egna fält via slideId.
 */

const TITLE_PROPS = ["title", "filmTitle", "rubrik", "heading", "headline", "statement", "question", "quote", "text", "name", "line1", "label", "kicker"];

function clean(text: string): string {
  // ~ är filmdeckens radbrytningsmärke.
  return text.replace(/<[^>]+>/g, " ").replace(/[*_#`>~]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** slideId → kapitelnamn, för de slides som har ett slideId. */
export function slideTitles(slug: string): Record<string, string> {
  const file = path.join(process.cwd(), "content", `${slug}.mdx`);
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  try {
    for (const slide of parseMdx(fs.readFileSync(file, "utf8")).slides) {
      const id = slide.props.slideId;
      if (typeof id !== "string" || !id) continue;
      const prop = TITLE_PROPS.map(key => slide.props[key]).find((value): value is string => typeof value === "string" && Boolean(value.trim()));
      const heading = slide.content?.match(/^#{1,3}\s+(.+)$/m)?.[1];
      // Filmscener och liknande får sitt namn av sin föreläsningsfamilj (lib/deck-familjer.ts).
      const scene = slideTitleFor(slide.tag, slide.props);
      const title = prop ?? heading ?? scene;
      if (title && clean(title)) out[id] = clean(title);
    }
  } catch {
    // Ett deck som inte går att läsa ger kapitel med slidens nummer.
  }
  return out;
}
