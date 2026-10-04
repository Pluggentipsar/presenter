"use client";

import { getSupabase } from "./supabase";

export type InteractionType = "quiz" | "reflection";

export interface QuizOption {
  text: string;
  correct?: boolean;
}

export interface Interaction {
  id: string;
  session_id: string;
  type: InteractionType;
  prompt: string;
  options: QuizOption[] | null;
  slide_index: number | null;
  active: boolean;
  reveal_results: boolean;
  created_at: string;
  ended_at: string | null;
}

export interface InteractionResponse {
  id: string;
  interaction_id: string;
  audience_id: string;
  option_index: number | null;
  text: string | null;
  featured: boolean;
  created_at: string;
}

export async function createInteraction(opts: {
  sessionId: string;
  type: InteractionType;
  prompt: string;
  options?: QuizOption[];
  slideIndex?: number | null;
}): Promise<Interaction> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase saknar konfiguration");

  // Avsluta ev. aktiva interaktioner först — bara en åt gången per session
  await sb
    .from("interactions")
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq("session_id", opts.sessionId)
    .eq("active", true);

  const { data, error } = await sb
    .from("interactions")
    .insert({
      session_id: opts.sessionId,
      type: opts.type,
      prompt: opts.prompt.trim(),
      options: opts.options ?? null,
      slide_index: opts.slideIndex ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Kunde inte starta interaktionen");
  return data as Interaction;
}

export async function endInteraction(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("interactions")
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq("id", id);
}

export async function toggleReveal(id: string, reveal: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("interactions").update({ reveal_results: reveal }).eq("id", id);
}

export async function getActiveInteraction(sessionId: string): Promise<Interaction | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("interactions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Interaction) ?? null;
}

export async function listResponses(interactionId: string): Promise<InteractionResponse[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("interaction_responses")
    .select("*")
    .eq("interaction_id", interactionId)
    .order("created_at", { ascending: true });
  return (data as InteractionResponse[]) ?? [];
}

export async function submitResponse(opts: {
  interactionId: string;
  audienceId: string;
  optionIndex?: number | null;
  text?: string | null;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase saknar konfiguration");
  const { error } = await sb
    .from("interaction_responses")
    .upsert(
      {
        interaction_id: opts.interactionId,
        audience_id: opts.audienceId,
        option_index: opts.optionIndex ?? null,
        text: opts.text?.trim() || null,
      },
      { onConflict: "interaction_id,audience_id" }
    );
  if (error) throw new Error(error.message);
}

export async function toggleFeatured(id: string, featured: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("interaction_responses").update({ featured }).eq("id", id);
}

export async function getMyResponse(
  interactionId: string,
  audienceId: string
): Promise<InteractionResponse | null> {
  const sb = getSupabase();
  if (!sb || !audienceId) return null;
  const { data } = await sb
    .from("interaction_responses")
    .select("*")
    .eq("interaction_id", interactionId)
    .eq("audience_id", audienceId)
    .maybeSingle();
  return (data as InteractionResponse) ?? null;
}
