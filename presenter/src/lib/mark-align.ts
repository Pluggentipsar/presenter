/**
 * Markordets lägen — delas av SlideMark (klient) och withSlideBg (server).
 * Ligger i lib utan "use client" så att servern får anropa normalize.
 */
export type MarkAlign = "bottom" | "top" | "center" | "right" | "left" | "stack-right" | "stack-left";

export const MARK_ALIGNS: MarkAlign[] = ["bottom", "top", "center", "right", "left", "stack-right", "stack-left"];

export function normalizeMarkAlign(value: unknown): MarkAlign {
  if (value === "tr" || value === "top") return "top";
  if (typeof value === "string" && (MARK_ALIGNS as string[]).includes(value)) return value as MarkAlign;
  return "bottom";
}
