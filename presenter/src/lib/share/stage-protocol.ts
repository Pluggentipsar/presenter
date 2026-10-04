/**
 * Protokollet mellan en sida i delningspaketet (landning/läsläge) och
 * scenrutan (`/[slug]/scen`) som ligger i en iframe.
 *
 * Scenrutan är en egen sida för att sliden ska få en egen viewport. Mallarna
 * är byggda för projektor: de använder vw/vh och brytpunkter. I en iframe med
 * fast virtuell storlek (STAGE_WIDTH × STAGE_HEIGHT) som föräldern skalar ner
 * tror sliden alltid att den är en projektorskärm — även på en telefon.
 *
 * Meddelandena går med window.postMessage mellan förälder och iframe, inte
 * via BroadcastChannel: en läsare som också har visaren öppen i en annan flik
 * ska inte få den fjärrstyrd.
 */

export const STAGE_CHANNEL = "delningspaket";
export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

/** 0-baserat klicksteg, eller "last" för slidens sista läge. */
export type StepTarget = number | "last";

/** Förälder → scenruta. */
export type StageCommand = {
  channel: typeof STAGE_CHANNEL;
  type: "show";
  slide: number;
  step: StepTarget;
  live?: boolean;
} | { channel: typeof STAGE_CHANNEL; type: "navigate"; direction: 1 | -1 }
  /** Granskningsvyn ber om en bild av det läge som visas (se docs/GRANSKA.md). */
  | { channel: typeof STAGE_CHANNEL; type: "capture"; id: string; scale?: number; format?: "image/webp" | "image/png"; quality?: number };

/** Scenruta → förälder. */
export type StageEvent =
  | { channel: typeof STAGE_CHANNEL; type: "ready" }
  | { channel: typeof STAGE_CHANNEL; type: "state"; slide: number; step: number; totalSteps: number }
  | { channel: typeof STAGE_CHANNEL; type: "key"; key: string }
  | { channel: typeof STAGE_CHANNEL; type: "captured"; id: string; blob?: Blob; error?: string };

export function isStageMessage(data: unknown): data is StageCommand | StageEvent {
  return !!data && typeof data === "object" && (data as { channel?: unknown }).channel === STAGE_CHANNEL;
}
