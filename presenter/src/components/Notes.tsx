import type { ReactNode } from "react";

interface NotesProps {
  children?: ReactNode;
}

/**
 * Marker-komponent för speaker notes. Rendererar inget själv - notes
 * extraheras i SlideViewer och associeras med närmast föregående slide.
 *
 * Användning i MDX:
 *
 * <TitleSlide title="AI i utbildningen" />
 *
 * <Notes>
 *   Börja lugnt. Vänta in publiken. Tänk på inandning/utandning.
 * </Notes>
 *
 * <GiantText>Nästa slide...</GiantText>
 */
export function Notes(_props: NotesProps) {
  return null;
}

// displayName används för att identifiera komponenten i SlideViewer,
// vilket funkar även när komponenten serialiseras över RSC-gränsen.
Notes.displayName = "PresenterNotes";

export const NOTES_MARKER = "PresenterNotes";
