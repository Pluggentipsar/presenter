"use client";

import { useContext, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { StageGuides, useTone } from "./kit";
import type { StageLayout } from "./stage-forms";
import { WorldContext } from "./world-store";
import s from "./stage.module.css";

/** Rörelseriktningar för det som kommer in (fältet enter). */
const ENTER = new Set(["upp", "ner", "hoger", "vanster", "djup", "nara"]);

/**
 * Stage-motorns duk, gemensam för formerna och filmscenerna (flyttad ur Stage.tsx
 * 3 oktober 2026).
 */
export function Canvas({ scene, step, layout, still, label, light, day = false, dawn = 0, enter = "", skala, film = "", children }: { scene: string; step: number; layout: StageLayout; still: boolean; label: string; light?: number; day?: boolean; dawn?: number; enter?: string; skala?: number; film?: string; children: ReactNode }) {
  const canvas = useRef<HTMLElement>(null);
  const tone = useTone(canvas);
  // Vätterresan: sjön ligger i spelaren. Scenen berättar var ljuset ska stå och vilken tid det är.
  const world = useContext(WorldContext);
  const lightX = light !== undefined ? light * 16 : layout === "talare" ? 1312 : 800;
  useLayoutEffect(() => { world?.report({ lightX, day, dawn, instant: still, film }); }, [world, lightX, day, dawn, still, film]);
  // Fältet filmfarg: den här sliden får en egen färg på ljuset (annars deckets filmfarg via --film).
  const style = { ...(light === undefined ? {} : { "--hz2-fx": `${light * 16}px` }), ...(dawn ? { "--hz2-dawn": dawn } : {}), ...(film ? { "--film": film } : {}) } as CSSProperties;
  return <div className={s.viewport} data-day={day || undefined} data-world={world ? "" : undefined} data-no-avsandar-footer>
    <section ref={canvas} className={s.canvas} data-scene={scene} data-step={step} data-layout={layout} data-tone={tone} data-still={still} data-enter={ENTER.has(enter) ? enter : undefined} data-skala={skala === undefined ? undefined : Math.round(skala)} aria-label={label}
      style={style}>
      {world && <span className={s.toneProbe} data-tone-probe="" aria-hidden="true" />}
      {children}
      <StageGuides layout={layout} />
    </section>
  </div>;
}
