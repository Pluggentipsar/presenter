"use client";

import { getSupabase } from "./supabase";

export interface AudienceSession {
  id: string;
  code: string;
  slug: string;
  theme: string | null;
  title: string | null;
  current_slide: number;
  active: boolean;
  /** Tillåt publik att navigera bakåt i presentationen (för anteckningar). Default true. */
  allow_back: boolean;
  /** Tillåt publik att navigera framåt före presentatören. Default false (spoiler-skydd). */
  allow_forward: boolean;
  created_at: string;
  expires_at: string;
}

export interface AudienceQuestion {
  id: string;
  session_id: string;
  slide_index: number | null;
  question: string;
  seen: boolean;
  created_at: string;
}

function randomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Skapar en ny session med en unik 6-siffrig kod.
 * Försöker max 5 gånger vid kollision.
 */
export async function createSession(opts: {
  slug: string;
  theme?: string;
  title?: string;
  currentSlide?: number;
}): Promise<AudienceSession> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase saknar konfiguration");

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await sb
      .from("sessions")
      .insert({
        code,
        slug: opts.slug,
        theme: opts.theme ?? null,
        title: opts.title ?? null,
        current_slide: opts.currentSlide ?? 0,
      })
      .select("*")
      .single();

    if (!error && data) return data as AudienceSession;
    lastError = error;
    // 23505 = unique_violation → försök igen med ny kod
    if (error && error.code !== "23505") break;
  }
  throw new Error(
    `Kunde inte skapa session: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

export async function getSessionByCode(code: string): Promise<AudienceSession | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as AudienceSession;
}

export async function updateCurrentSlide(sessionId: string, slideIndex: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("sessions").update({ current_slide: slideIndex }).eq("id", sessionId);
}

export async function endSession(sessionId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("sessions").update({ active: false }).eq("id", sessionId);
}

/** Uppdatera publikens navigations-tillstånd under pågående session. */
export async function updateAudienceNav(
  sessionId: string,
  flags: { allow_back?: boolean; allow_forward?: boolean }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const patch: Record<string, boolean> = {};
  if (typeof flags.allow_back === "boolean") patch.allow_back = flags.allow_back;
  if (typeof flags.allow_forward === "boolean") patch.allow_forward = flags.allow_forward;
  if (Object.keys(patch).length === 0) return;
  await sb.from("sessions").update(patch).eq("id", sessionId);
}

export async function submitQuestion(
  sessionId: string,
  question: string,
  slideIndex: number | null
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase saknar konfiguration");
  const { error } = await sb.from("audience_questions").insert({
    session_id: sessionId,
    question: question.trim(),
    slide_index: slideIndex,
  });
  if (error) throw new Error(error.message);
}

export async function listQuestions(sessionId: string): Promise<AudienceQuestion[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("audience_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as AudienceQuestion[];
}

export async function markQuestionsSeen(sessionId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from("audience_questions")
    .update({ seen: true })
    .eq("session_id", sessionId)
    .eq("seen", false);
}
