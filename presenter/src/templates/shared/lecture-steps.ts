"use client";
import { useContext, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SlideStepsContext, useSlideSteps } from "@/lib/slide-steps";
import { useInlineEdit } from "@/lib/inline-edit";

/**
 * Klickstegen i en scen: aktuellt steg, om läget nåddes bakåt och om scenen ska stå stilla (reducerad
 * rörelse, bakåt eller redigering i R). Delas av scenfamiljerna. Flyttad ur elevföreläsningens
 * LectureShared 3 oktober 2026, så att familjerna inte drar med sig dess innehållsregister.
 */
export function useLectureSteps(count: number) {
  const { editMode } = useInlineEdit();
  const step = Math.min(useSlideSteps(count), count - 1);
  const ctx = useContext(SlideStepsContext);
  const reduced = useReducedMotion();
  const slideKey = ctx?.slideKey;
  const [entry, setEntry] = useState({ slideKey, step, backward: false });
  const sameSlide = entry.slideKey === slideKey;
  const backward = Boolean(ctx?.startAtLast || (sameSlide && (entry.step === step ? entry.backward : step < entry.step)));
  if (!sameSlide || entry.step !== step) setEntry({ slideKey, step, backward: sameSlide && step < entry.step });
  return { step, backward, still: Boolean(reduced || backward || editMode) };
}
