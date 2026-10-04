"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import {
  getActiveInteraction,
  getMyResponse,
  listResponses,
  submitResponse,
  type Interaction,
  type InteractionResponse,
} from "./interactions";

export interface AudienceInteractionsState {
  active: Interaction | null;
  myResponse: InteractionResponse | null;
  responses: InteractionResponse[];
  submitting: boolean;
  error: string | null;
  submit: (opts: { optionIndex?: number | null; text?: string | null }) => Promise<void>;
}

/**
 * Publik-sida: lyssnar på aktiv interaktion och den egna rösten.
 * Hämtar även alla svar när reveal_results är true.
 */
export function useAudienceInteractions(
  sessionId: string,
  audienceId: string
): AudienceInteractionsState {
  const [active, setActive] = useState<Interaction | null>(null);
  const [myResponse, setMyResponse] = useState<InteractionResponse | null>(null);
  const [responses, setResponses] = useState<InteractionResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ladda initial aktiv interaktion
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const found = await getActiveInteraction(sessionId);
      if (!cancelled) setActive(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Lyssna på nya/uppdaterade interaktioner
  useEffect(() => {
    if (!sessionId) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`audience-interactions:${sessionId}`)
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
            if (row.active) {
              setActive(row);
              setMyResponse(null);
            }
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

  // Hämta egen röst när aktiv interaktion ändras
  useEffect(() => {
    if (!active || !audienceId) {
      setMyResponse(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const mine = await getMyResponse(active.id, audienceId);
      if (!cancelled) setMyResponse(mine);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, audienceId]);

  // Ladda alla svar + prenumerera när resultaten avslöjats (för quiz) eller för reflektion alltid
  useEffect(() => {
    if (!active) {
      setResponses([]);
      return;
    }
    const shouldSubscribe = active.reveal_results || active.type === "reflection";
    if (!shouldSubscribe) {
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
      .channel(`audience-responses:${active.id}`)
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

  const submit = useCallback(
    async (opts: { optionIndex?: number | null; text?: string | null }) => {
      if (!active || !audienceId) return;
      setSubmitting(true);
      setError(null);
      try {
        await submitResponse({
          interactionId: active.id,
          audienceId,
          optionIndex: opts.optionIndex ?? null,
          text: opts.text ?? null,
        });
        // Re-fetch egen röst så UI visar senaste svaret
        const mine = await getMyResponse(active.id, audienceId);
        setMyResponse(mine);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [active, audienceId]
  );

  return { active, myResponse, responses, submitting, error, submit };
}
