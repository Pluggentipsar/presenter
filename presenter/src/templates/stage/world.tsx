"use client";

import { useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { motion, usePresence, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { SlideTargetContext } from "@/lib/slide-target";
import { SlideStepsContext } from "@/lib/slide-steps";
import { useInlineEdit } from "@/lib/inline-edit";
import { VatterSky, useTone } from "./kit";
import type { StageWorld } from "./worlds";
import { WorldContext, isTravelMove, type TravelMove, type WorldState, type WorldStore } from "./world-store";
import s from "./stage.module.css";

/**
 * Vätterresan · sjön som ligger kvar mellan slides.
 *
 * Spelaren (SlideViewer) ritar denna värld bakom slidebytet i ett deck där någon
 * Stage har `resa=`. Varje scen rapporterar horisont, ljus, dygn och
 * vatten (world-store.ts); världen glider dit. Ljuset tar 1,5 s, horisonten
 * 0,8 s och gryningen 7 s. Byts dag och natt tonar den gamla sjön bort. Ett nytt
 * kapitel (resa="in") får ljuset att svälla en gång. Bakåt, R och reducerad
 * rörelse flyttar allt direkt. Temat väljer världen (stageWorld); spelaren skickar
 * den med efter T, så att den inte blinkar till Vättern först.
 */
export function VatterWorld({ store, world }: { store: WorldStore; world?: StageWorld }) {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const reduce = useReducedMotion() ?? false;
  // Dag och natt: den förra sjön ligger kvar och tonar bort, så att bytet inte blixtrar.
  const [layers, setLayers] = useState<{ day: boolean; key: number }[]>(() => [{ day: state.day, key: 0 }]);
  const current = layers[layers.length - 1];
  if (current.day !== state.day) setLayers(state.instant || reduce ? [{ day: state.day, key: current.key + 1 }] : [...layers.slice(-1), { day: state.day, key: current.key + 1 }]);
  useEffect(() => {
    if (layers.length < 2) return;
    const done = setTimeout(() => setLayers(list => list.slice(-1)), 950);
    return () => clearTimeout(done);
  }, [layers]);
  return <div className={s.world} aria-hidden="true" data-vatter-world="">
    {layers.map((layer, i) => <WorldLayer key={layer.key} state={state} day={layer.day} still={reduce} leaving={i < layers.length - 1} world={world} />)}
  </div>;
}

function WorldLayer({ state, day, still, leaving, world }: { state: WorldState; day: boolean; still: boolean; leaving: boolean; world?: StageWorld }) {
  const canvas = useRef<HTMLElement>(null);
  const tone = useTone(canvas);
  // Den nya sjön ligger under den gamla, som tonar bort ovanpå.
  return <div className={s.worldLayer} data-leaving={leaving} style={{ zIndex: leaving ? 2 : 1 }}>
    <div className={s.viewport} data-day={day || undefined}>
      <section ref={canvas} className={s.canvas} data-tone={tone} data-still={state.instant || still} style={{ "--hz2-fx": `${state.lightX}px`, "--hz2-dawn": state.dawn, ...(state.film ? { "--film": state.film } : {}) } as CSSProperties}>
        <VatterSky horizon={state.horizon} still={still} paused={!state.flow} pulse={still ? 0 : state.pulse} world={world} />
      </section>
    </div>
  </div>;
}

const ease = [.22, 1, .36, 1] as const;
const leave = [.55, 0, 1, .45] as const;

// Kameran reser åt ett håll, så förgrunden glider åt det motsatta.
const enterFrom: Record<TravelMove, TargetAndTransition> = {
  ner: { y: 96, opacity: 0 }, upp: { y: -96, opacity: 0 },
  in: { scale: .9, opacity: 0 }, ut: { scale: 1.1, opacity: 0 },
  hoger: { x: 140, opacity: 0 }, vanster: { x: -140, opacity: 0 },
  stilla: { opacity: 0 },
};
const exitTo: Record<TravelMove, TargetAndTransition> = {
  ner: { y: -90, opacity: 0 }, upp: { y: 90, opacity: 0 },
  in: { scale: 1.14, opacity: 0 }, ut: { scale: .9, opacity: 0 },
  hoger: { x: -110, opacity: 0 }, vanster: { x: 110, opacity: 0 },
  stilla: { opacity: 0 },
};
const rest = { x: 0, y: 0, scale: 1, opacity: 1 };

/**
 * Förgrunden reser mellan slides medan sjön ligger kvar. Riktningen kommer från
 * spelaren (`move`: målslidens `resa=`, annars ner). Ett foto eller vågen
 * (`room`) tonar in och ut över sjön i stället för att resa.
 *
 * Utan värld (R, miniatyrer, /scen, andra deck) blir det exakt som förut.
 * Bakåt, hopp i menyn, R och reducerad rörelse: direkt och stilla.
 */
export function VatterTravel({ room, children }: { room?: ReactNode; children: ReactNode }) {
  const world = useContext(WorldContext);
  const target = useContext(SlideTargetContext);
  const steps = useContext(SlideStepsContext);
  const { editMode } = useInlineEdit();
  const [present, safeToRemove] = usePresence();
  const reduce = useReducedMotion() ?? false;
  const live = Boolean(world && target);
  const forward = (target?.direction ?? 1) > 0;
  const moveOf = (): TravelMove => target?.jump ? "stilla" : isTravelMove(target?.move) ? target.move : "ner";
  // Rörelsen in bestäms en gång, när sliden monteras som mål. Första sliden reser inte in.
  const [entry] = useState<TravelMove | null>(() => live && world!.shown() && forward && !reduce && !editMode && !steps?.startAtLast ? moveOf() : null);
  const leaving = live && !present && forward && !reduce && !editMode;
  const exitMove = leaving ? moveOf() : null;
  // Ett nytt kapitel reser in mot ljuset, och ljuset sväller en gång.
  useEffect(() => { if (entry === "in") world?.pulse(); }, [entry, world]);
  useEffect(() => {
    if (present) return;
    if (!leaving) { safeToRemove?.(); return; }
    const done = setTimeout(() => safeToRemove?.(), 300);
    return () => clearTimeout(done);
  }, [present, leaving, safeToRemove]);
  if (!live) return <>{room}{children}</>;
  return <>
    {room && <motion.div className={s.travelRoom}
      initial={entry ? { opacity: 0 } : false}
      animate={{ opacity: exitMove ? 0 : 1 }}
      transition={exitMove ? { duration: .26, ease: leave } : { duration: .55, ease }}>{room}</motion.div>}
    <motion.div className={s.travel} data-travel={entry ?? exitMove ?? undefined}
      initial={entry ? enterFrom[entry] : false}
      animate={exitMove ? exitTo[exitMove] : rest}
      transition={exitMove ? { duration: .26, ease: leave }
        : { default: { duration: entry === "stilla" ? .55 : .76, ease, delay: .02 }, opacity: { duration: .34, delay: .02 } }}>
      {children}
    </motion.div>
  </>;
}
