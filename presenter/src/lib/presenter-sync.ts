/**
 * Synkronisering mellan huvudfönster och presenter-fönster via BroadcastChannel.
 *
 * Huvudfönstret (SlideViewer) är "master" - det skickar slide-ändringar.
 * Presenter-fönstret lyssnar och följer med.
 * Presenter-fönstret kan också skicka navigation-kommandon tillbaka.
 */

export type PresenterMessage =
  | { type: "slide-changed"; slideIndex: number; slug: string }
  | { type: "request-current"; slug: string }
  | { type: "navigate"; direction: "next" | "prev"; slug: string }
  | { type: "goto"; slideIndex: number; slug: string }
  // Inspelningen (2 oktober 2026): spelaren skickar status varje sekund; presentatörsvyn kan
  // pausa, fortsätta, stoppa och starta en ljudinspelning.
  | { type: "rec-status"; slug: string; state: string; ms: number; mode: string }
  | { type: "rec-command"; slug: string; command: "pause" | "resume" | "stop" | "start-ljud" };

const CHANNEL_NAME = "talare-presenter";

export function getPresenterChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}
