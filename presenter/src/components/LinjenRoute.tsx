"use client";

import { motion } from "framer-motion";
import type { SlideMeta } from "@/lib/extract-slide-types";
import s from "./LinjenRoute.module.css";

/**
 * Linjen (linjen): föreläsningens röda tråd som en busslinje längs
 * slidens underkant. Hållplatserna är akterna (`station="…"` på aktens första
 * slide, plus första sliden). Markören visar var vi är, i elevens gula eller
 * lärarens isblå färg enligt slidens perspektiv. Ingen text: linjen orienterar
 * utan att lägga ny copy på duken.
 */
export function LinjenRoute({ index, metas, still }: { index: number; metas: SlideMeta[]; still: boolean }) {
  const last = Math.max(1, metas.length - 1);
  const at = (i: number) => `${(i / last) * 100}%`;
  const stations = metas.flatMap((m, i) => (i === 0 || m.station ? [i] : []));
  let perspective: "elev" | "larare" = "larare";
  for (let i = index; i >= 0; i--) {
    const p = metas[i]?.perspective;
    if (p) { perspective = p; break; }
  }
  const transition = { duration: still ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <div className={s.route} data-perspective={perspective} aria-hidden="true">
      <div className={s.track}>
        <motion.i className={s.travelled} initial={false} animate={{ width: at(index) }} transition={transition} />
        {stations.map((i) => <b key={i} className={s.stop} data-passed={i <= index} style={{ left: at(i) }} />)}
        <motion.span className={s.here} initial={false} animate={{ left: at(index) }} transition={transition} />
      </div>
    </div>
  );
}
