"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { InteractionResponse } from "./interactions";

export interface PublishedLiveConfig {
  publicUrl: string;
  run: string;
}
export const PublishedLiveContext = createContext<PublishedLiveConfig | null>(null);

/** A publication provides its session explicitly; the ordinary editor keeps Supabase. */
export function usePublishedLive(pollKey: string) {
  const config = useContext(PublishedLiveContext);
  const [result, setResult] = useState<{ responses: InteractionResponse[]; state: "searching" | "active" | "error" }>({ responses: [], state: "searching" });
  useEffect(() => {
    if (!config || !config.run) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const collection = pollKey.replace(/^uf-sthlm-/, "");
    let known: InteractionResponse[] = [];
    setResult({ responses: [], state: "searching" });
    async function refresh() {
      let delay = 3000;
      try {
        if (!document.hidden) {
          // Walk newest pages only until the previous head is found; no lost votes above 100.
          const fresh: InteractionResponse[] = [];
          let cursor: string | null = null;
          let reachedKnown = false;
          do {
            const url = new URL(`live/results/${collection}`, config!.publicUrl);
            url.searchParams.set("limit", "100");
            if (cursor) url.searchParams.set("cursor", cursor);
            const res = await fetch(url, { cache: "no-store", signal: abort.signal });
            if (!res.ok) {
              if (res.status === 429) delay = Math.max(10000, Number(res.headers.get("retry-after") || 10) * 1000);
              throw new Error(`HTTP ${res.status}`);
            }
            const body = await res.json();
            for (const row of body.records) {
              if (known.length && row.id === known[0].id) { reachedKnown = true; break; }
              fresh.push({ id: row.id, interaction_id: pollKey, audience_id: row.data.voter, option_index: row.data.run === config!.run ? row.data.option ?? null : null, text: row.data.run === config!.run ? row.data.text ?? null : null, featured: false, created_at: row.createdAt, run: row.data.run } as InteractionResponse);
            }
            cursor = body.nextCursor;
          } while (cursor && !reachedKnown);
          known = [...fresh, ...known];
          // Append-only revisions: count the newest answer per browser and event, not each retry.
          const voters = new Set<string>();
          const responses = known.filter(row => {
            if ((row as InteractionResponse & { run: string }).run !== config!.run || voters.has(row.audience_id)) return false;
            voters.add(row.audience_id);
            return true;
          });
          if (!cancelled) setResult({ responses, state: "active" });
        }
      } catch {
        if (!cancelled) setResult(prev => ({ ...prev, state: "error" }));
        delay = Math.max(delay, 10000);
      }
      if (!cancelled) timer = setTimeout(refresh, delay);
    }
    void refresh();
    return () => { cancelled = true; abort.abort(); clearTimeout(timer); };
  }, [config?.publicUrl, config?.run, pollKey, config]);
  return config ? { ...result, responses: config.run ? result.responses : [], state: config.run ? result.state : "no-session" as const, sessionCode: config.run } : null;
}
