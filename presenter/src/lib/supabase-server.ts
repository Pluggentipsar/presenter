import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AudienceSession } from "./audience-session";

let client: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, { auth: { persistSession: false } });
  }
  return client;
}

export async function getSessionByCodeServer(code: string): Promise<AudienceSession | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("sessions")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  return (data as AudienceSession) ?? null;
}
