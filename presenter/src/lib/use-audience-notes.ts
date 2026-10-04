"use client";

import { useCallback, useEffect, useState } from "react";

const LS_PREFIX = "audience-notes:";

export interface AudienceNotes {
  general: string;
  perSlide: Record<number, string>;
}

function emptyNotes(): AudienceNotes {
  return { general: "", perSlide: {} };
}

function readNotes(sessionId: string): AudienceNotes {
  if (typeof window === "undefined") return emptyNotes();
  try {
    const raw = localStorage.getItem(LS_PREFIX + sessionId);
    if (!raw) return emptyNotes();
    const parsed = JSON.parse(raw);
    return {
      general: typeof parsed.general === "string" ? parsed.general : "",
      perSlide:
        parsed.perSlide && typeof parsed.perSlide === "object"
          ? (parsed.perSlide as Record<number, string>)
          : {},
    };
  } catch {
    return emptyNotes();
  }
}

function writeNotes(sessionId: string, notes: AudienceNotes): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + sessionId, JSON.stringify(notes));
  } catch {
    // quota / private mode — tyst fel, anteckningar är nice-to-have
  }
}

/**
 * Håller åhörarens anteckningar i localStorage, nycklat på session-id.
 * Finns både ett "löpande" fält och en ordbok med anteckningar per slide.
 */
export function useAudienceNotes(sessionId: string) {
  const [notes, setNotes] = useState<AudienceNotes>(emptyNotes);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setNotes(readNotes(sessionId));
    setHydrated(true);
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated || !sessionId) return;
    writeNotes(sessionId, notes);
  }, [notes, sessionId, hydrated]);

  const setGeneral = useCallback((text: string) => {
    setNotes((prev) => ({ ...prev, general: text }));
  }, []);

  const setSlideNote = useCallback((slideIndex: number, text: string) => {
    setNotes((prev) => {
      const next = { ...prev.perSlide };
      if (text) next[slideIndex] = text;
      else delete next[slideIndex];
      return { ...prev, perSlide: next };
    });
  }, []);

  const clear = useCallback(() => {
    setNotes(emptyNotes());
  }, []);

  return { notes, hydrated, setGeneral, setSlideNote, clear };
}
