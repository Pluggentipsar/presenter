"use client";

import { useEffect, useState } from "react";

const LS_KEY = "audience-id";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "aud-" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

/**
 * Håller ett anonymt ID för en åhörar-enhet. ID:t används för att
 * en röst per enhet per interaktion + för featured-markering.
 * Ingen personlig data — bara ett slumpmässigt UUID.
 */
export function useAudienceId(): string {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let existing = localStorage.getItem(LS_KEY);
    if (!existing) {
      existing = generateId();
      localStorage.setItem(LS_KEY, existing);
    }
    setId(existing);
  }, []);

  return id;
}
