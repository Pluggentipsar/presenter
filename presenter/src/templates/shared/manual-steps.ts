"use client";

import { useContext, useState, useSyncExternalStore } from 'react';
import { SlideStepsContext, useSlideSteps } from '@/lib/slide-steps';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

/**
 * Klickstegen för scener med ljud: bakåt återställer informationen direkt, och ljud startar bara när
 * scenen nås framåt. Flyttad ur språkföreläsningens familj 3 oktober 2026.
 */
export function useStaManualSteps(count: number) {
  const phase = Math.min(useSlideSteps(count), count - 1);
  const context = useContext(SlideStepsContext);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
  const [entry, setEntry] = useState({ phase, backward: false });
  const backward = entry.phase === phase ? entry.backward : phase < entry.phase;
  if (entry.phase !== phase) setEntry({ phase, backward });
  return {
    phase,
    still: Boolean(reduced || backward || context?.startAtLast),
    forward: phase > 0 && !backward && !context?.startAtLast,
  };
}
