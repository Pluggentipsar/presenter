"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import {
  createInteraction,
  endInteraction,
  getActiveInteraction,
  listResponses,
  toggleFeatured,
  toggleReveal,
  type Interaction,
  type InteractionResponse,
  type InteractionType,
  type QuizOption,
} from "./interactions";

export interface PresenterInteractionsState {
  active: Interaction | null;
  responses: InteractionResponse[];
  starting: boolean;
  error: string | null;
  start: (opts: {
    type: InteractionType;
    prompt: string;
    options?: QuizOption[];
    slideIndex?: number | null;
  }) => Promise<Interaction | null>;
  end: () => Promise<void>;
  setReveal: (reveal: boolean) => Promise<void>;
  featureResponse: (responseId: string, featured: boolean) => Promise<void>;
}

/**
 * Presenter-sida: hanterar aktiv quiz/reflektion och lyssnar på svar
 * via Supabase Realtime.
 */
export function usePresenterInteractions(sessionId: string | null): PresenterInteractionsState {
  const [active, setActive] = useState<Interaction | null>(null);
  const [responses, setResponses] = useState<InteractionResponse[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sök aktiv interaktion vid mount / sessionsbyte
  useEffect(() => {
    if (!sessionId) {
      setActive(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const found = await getActiveInteraction(sessionId);
      if (!cancelled) setActive(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Lyssna på nya interaktioner för sessionen (i fall vi skapar i annat fönster)
  useEffect(() => {
    if (!sessionId) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`interactions:session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interactions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Interaction;
            if (row.active) setActive(row);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Interaction;
            setActive((prev) => {
              if (prev && prev.id === row.id) return row;
              if (!prev && row.active) return row;
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  // Ladda svar + prenumerera när aktiv interaktion ändras
  useEffect(() => {
    if (!active) {
      setResponses([]);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    (async () => {
      const existing = await listResponses(active.id);
      if (!cancelled) setResponses(existing);
    })();

    const channel = sb
      .channel(`interaction-responses:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interaction_responses",
          filter: `interaction_id=eq.${active.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setResponses((prev) => [...prev, payload.new as InteractionResponse]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as InteractionResponse;
            setResponses((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setResponses((prev) => prev.filter((r) => r.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [active]);

  const start = useCallback(
    async (opts: {
      type: InteractionType;
      prompt: string;
      options?: QuizOption[];
      slideIndex?: number | null;
    }) => {
      if (!sessionId) return null;
      setStarting(true);
      setError(null);
      try {
        const created = await createInteraction({ sessionId, ...opts });
        setActive(created);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setStarting(false);
      }
    },
    [sessionId]
  );

  const end = useCallback(async () => {
    if (!active) return;
    await endInteraction(active.id);
    setActive((prev) => (prev ? { ...prev, active: false, ended_at: new Date().toISOString() } : prev));
  }, [active]);

  const setReveal = useCallback(
    async (reveal: boolean) => {
      if (!active) return;
      await toggleReveal(active.id, reveal);
      setActive((prev) => (prev ? { ...prev, reveal_results: reveal } : prev));
    },
    [active]
  );

  const featureResponse = useCallback(async (responseId: string, featured: boolean) => {
    await toggleFeatured(responseId, featured);
    setResponses((prev) => prev.map((r) => (r.id === responseId ? { ...r, featured } : r)));
  }, []);

  return { active, responses, starting, error, start, end, setReveal, featureResponse };
}
