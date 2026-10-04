import type { MediaUrl } from "./extract-media-urls";
import type { getPresentation } from "./mdx";

/** Adressens parametrar, som Next lämnar dem till sidan. */
export type DeckQuery = Record<string, string | string[] | undefined>;

/** En föreläsning som sätts ihop ur adressen, till exempel ett lektionspass ur en lektionsplan. */
export interface ComposedDeck {
  presentation: Pick<NonNullable<ReturnType<typeof getPresentation>>, "content" | "meta">;
  /** Var varje slide står i sitt eget deck, så att R redigerar källan. */
  editTargets?: { slug: string; slideIndex: number }[];
  /** Kanalen som visningen och presentatörsvyn synkar över, en per upplägg. */
  syncId?: string;
  /** Presentatörsvyns adress till visningen av samma upplägg. */
  mainUrl?: string;
}

/**
 * En familj av föreläsningar med egen logik på serversidan (3 oktober 2026): deck som sätts ihop ur
 * adressen, dolda slides som väljs i adressen och media att förladda. Familjerna står i
 * lib/deck-familjer.ts, och den publika exporten tar bort dem som inte följer med.
 */
export interface DeckFamily {
  /**
   * Ett sammansatt deck ur adressen. null: adressen gäller inte familjen. "saknas": adressen är
   * familjens men går inte att läsa, och sidan svarar 404.
   */
  compose?(slug: string, query: DeckQuery): ComposedDeck | "saknas" | null;
  /** Dolda slides som väljs i adressen. undefined: decket är inte familjens. */
  hiddenSlides?(slug: string, content: string, query: DeckQuery, hidden: number[] | undefined): number[] | undefined;
  /** Media att förladda utöver det som står i källan, till exempel bilder som en scen hämtar ur kod. */
  preload?(slug: string, source: string): MediaUrl[];
  /** Kapitelnamn för en slide utan rubrikfält, till exempel en filmscen (lib/recording/titles.server.ts). */
  slideTitle?(tag: string, props: Record<string, unknown>): string | undefined;
}
