"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Manuset för den slide som just renderas.
 *
 * Notes ligger utanför slidekomponenten i MDX — `<Notes>` efter sluttaggen —
 * och plockas ut av extractNotes innan renderingen. De flesta templates ska
 * aldrig se dem: manus hör till talaren, inte till duken, och visas i
 * NotesOverlay med N.
 *
 * Undantaget är <Utkast>, som inte är en publikslide utan en ritning. Där ÄR
 * manuset en del av det man granskar, och att växla overlay på varje slide
 * gör en genomläsning onödigt tung. Kontexten finns för det undantaget —
 * använd den inte för att smyga in manus på slides som faktiskt visas.
 */
const SlideNotesContext = createContext<string | null>(null);

export function SlideNotesProvider({
  notes,
  children,
}: {
  notes: string | null;
  children: ReactNode;
}) {
  return (
    <SlideNotesContext.Provider value={notes}>
      {children}
    </SlideNotesContext.Provider>
  );
}

/** Manuset för aktuell slide, eller null när inget finns (t.ex. i storyboarden). */
export function useSlideNotes(): string | null {
  return useContext(SlideNotesContext);
}
