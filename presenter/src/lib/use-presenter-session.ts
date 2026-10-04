"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import {
  createSession,
  endSession as apiEndSession,
  listQuestions,
  markQuestionsSeen,
  updateCurrentSlide,
  type AudienceQuestion,
  type AudienceSession,
} from "./audience-session";

const LS_PREFIX = "presenter-session:";
const MAX_AGE_HOURS = 23; // lite kortare än DB:s expiry

interface StoredSession {
  id: string;
  code: string;
  slug: string;
  expires_at: string;
}

function readStored(slug: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (new Date(parsed.expires_at).getTime() < Date.now()) return null;
    const maxAgeMs = MAX_AGE_HOURS * 3600 * 1000;
    const age = Date.now() - (new Date(parsed.expires_at).getTime() - 24 * 3600 * 1000);
    if (age > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(slug: string, s: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_PREFIX + slug, JSON.stringify(s));
}

function clearStored(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_PREFIX + slug);
}

export interface PresenterSessionState {
  supportsAudience: boolean;
  session: AudienceSession | null;
  starting: boolean;
  error: string | null;
  questions: AudienceQuestion[];
  unseenCount: number;
  start: (opts: { theme?: string; title?: string; currentSlide?: number }) => Promise<void>;
  end: () => Promise<void>;
  broadcastSlide: (index: number) => void;
  markAllSeen: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
}

/**
 * Hanterar presentatörens publiksession:
 * - skapar/avslutar session i Supabase
 * - broadcastar slide-ändringar
 * - prenumererar på publikfrågor (Realtime)
 * - persisterar aktiv session i localStorage per slug
 */
export function usePresenterSession(slug: string): PresenterSessionState {
  const [session, setSession] = useState<AudienceSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const pendingSlideRef = useRef<number | null>(null);
  const slideDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supportsAudience = isSupabaseConfigured();

  // Återställ session från localStorage vid mount
  useEffect(() => {
    if (!supportsAudience || !slug) return;
    const stored = readStored(slug);
    if (!stored) return;
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const { data } = await sb.from("sessions").select("*").eq("id", stored.id).maybeSingle();
      if (data && (data as AudienceSession).active) {
        setSession(data as AudienceSession);
      } else {
        clearStored(slug);
      }
    })();
  }, [slug, supportsAudience]);

  // Prenumerera på frågor när session är aktiv
  useEffect(() => {
    if (!session) {
      setQuestions([]);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    (async () => {
      const existing = await listQuestions(session.id);
      if (!cancelled) setQuestions(existing);
    })();

    const channel = sb
      .channel(`questions:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audience_questions",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [...prev, payload.new as AudienceQuestion]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as AudienceQuestion;
            setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setQuestions((prev) => prev.filter((q) => q.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [session]);

  const start = useCallback(
    async (opts: { theme?: string; title?: string; currentSlide?: number }) => {
      if (!supportsAudience) {
        setError("Supabase saknar konfiguration i .env.local");
        return;
      }
      setStarting(true);
      setError(null);
      try {
        const created = await createSession({ slug, ...opts });
        setSession(created);
        writeStored(slug, {
          id: created.id,
          code: created.code,
          slug,
          expires_at: created.expires_at,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setStarting(false);
      }
    },
    [slug, supportsAudience]
  );

  const end = useCallback(async () => {
    if (!session) return;
    await apiEndSession(session.id);
    clearStored(slug);
    setSession(null);
    setQuestions([]);
  }, [session, slug]);

  // Debouncad slide-broadcast så snabb bläddring inte spammar DB:n
  const broadcastSlide = useCallback(
    (index: number) => {
      if (!session) return;
      pendingSlideRef.current = index;
      if (slideDebounceRef.current) clearTimeout(slideDebounceRef.current);
      slideDebounceRef.current = setTimeout(() => {
        const i = pendingSlideRef.current;
        if (i != null) {
          updateCurrentSlide(session.id, i).catch(() => {});
        }
      }, 150);
    },
    [session]
  );

  useEffect(() => {
    return () => {
      if (slideDebounceRef.current) clearTimeout(slideDebounceRef.current);
    };
  }, []);

  const markAllSeen = useCallback(async () => {
    if (!session) return;
    await markQuestionsSeen(session.id);
    setQuestions((prev) => prev.map((q) => (q.seen ? q : { ...q, seen: true })));
  }, [session]);

  const refreshQuestions = useCallback(async () => {
    if (!session) return;
    const fresh = await listQuestions(session.id);
    setQuestions(fresh);
  }, [session]);

  const unseenCount = questions.filter((q) => !q.seen).length;

  return {
    supportsAudience,
    session,
    starting,
    error,
    questions,
    unseenCount,
    start,
    end,
    broadcastSlide,
    markAllSeen,
    refreshQuestions,
  };
}
