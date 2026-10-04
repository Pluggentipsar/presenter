"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { RichLines, seeded } from "./kit";
import { Kicker, type FormProps } from "./forms";
import s from "./stage.module.css";
import n from "./nal.module.css";

/**
 * Nålen · delegeringskompetens (2 oktober 2026, Joels idé för film 3 i
 * en filmserie). En kompassnål som vrider sig i horisontens ljus, med tre
 * riktningar: åt vänster och åt höger längs horisonten, och uppåt. Den tredje
 * ligger inte mitt emellan de två andra; den lyfter ur linjen.
 *
 * Krafterna drar i nålen, en per klick. Den första drar den ned under ytan mot
 * höger (impulsen), den andra till vänster (lärandemålet), och med den tredje
 * visar sig en taggig gräns som nålen studsar mot (tekniken). Sedan lyfts
 * nålen uppåt (motståndet), och slutsatsen ersätter frågan medan nålens spår
 * under ytan står kvar streckat. En kraft utan text hoppas över.
 *
 * Nålen är en liten simulering, en fjäder med dämpning: den söker, slår över
 * och stannar, och vid gränsen studsar den. Ovanför horisonten speglas den i
 * vattnet; under ytan blir den dov. R, bakåt, miniatyrer och reducerad rörelse
 * visar läget direkt. Koordinater på 1600 × 900. Bildläget horn: Joel står
 * liten nere till höger, så att x ≥ 1200 under y 440 hålls fri.
 *
 * I ett zoomdeck (fältet skala, tiopotenserna, 2 oktober) ritas nålen som
 * en teknisk ritning på en linjalkant: fyllt norrstycke, gradskiva, centrum-
 * märke, dold kant streckad under linjen, centrumlinje vid lyftet och
 * fantomlinje för spåret. spegel="ja" vänder riktningarna, så att de ligger som
 * i ett fack där AI står till vänster (ett decks sortering).
 */

type Phase = "rest" | "drift" | "goal" | "edge" | "lift" | "land";
type Motion = { angle: number; k: number; damp: number; wobble: number; delay: number; wall?: boolean };

/** Nålens vridpunkt längs horisonten (formens ljus står där) och längd. */
const PX = 590, LENGTH = 290;
/** Gränsen: nålen stannar vid WALL grader från lodlinjen, och den taggiga linjen ritas vid RIDGE. */
const WALL = 52, RIDGE = 57;
/** Gradskivans radie i ritningen: en halvcirkel ovanför linjalkanten. Impulsen drar nålen förbi den, ned i det dolda. */
const DIAL = LENGTH + 34, DIAL_FROM = -90, DIAL_TO = 90;

/**
 * Vinkel i grader från lodlinjen (medurs), fjäderns styvhet och dämpning per
 * bildruta, darrningen och väntan innan kraften tar (så att texten hinner fram).
 * Gränsens mål ligger bortom väggen, så att nålen trycker mot den och vilar där.
 */
const MOTION: Record<Phase, Motion> = {
  rest: { angle: 0, k: .02, damp: .9, wobble: 7, delay: 0 },
  drift: { angle: 112, k: .0045, damp: .93, wobble: .6, delay: 300 },
  goal: { angle: -78, k: .028, damp: .82, wobble: .5, delay: 250 },
  edge: { angle: 62, k: .03, damp: .84, wobble: .4, delay: 700, wall: true },
  lift: { angle: 0, k: .02, damp: .86, wobble: .35, delay: 150 },
  land: { angle: 0, k: .03, damp: .8, wobble: 0, delay: 0 },
};

/** Lägena i ordning. Samma räkning som steps i stage-forms.ts: vila, krafterna med text, lyftet, slutsatsen. */
function phasesOf(t: FormProps["t"]): Phase[] {
  const has = (key: string) => t(key).trim() !== "";
  const list: Phase[] = ["rest"];
  if (has("force1")) list.push("drift");
  if (has("force2")) list.push("goal");
  if (has("force3")) list.push("edge");
  list.push("lift");
  if (has("note")) list.push("land");
  return list;
}

const rad = (deg: number) => deg * Math.PI / 180;
/** En punkt på nålens linje: r pixlar från vridpunkten i vinkeln deg. */
const polar = (py: number, r: number, deg: number) => [PX + r * Math.sin(rad(deg)), py - r * Math.cos(rad(deg))] as const;
/** Samma punkt kring vridpunkten (0, 0). */
const around = (r: number, deg: number) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))] as const;

/** Den taggiga gränsen längs strålen RIDGE. Taggarna pekar bort från nålen, så att den inte skär i dem. */
function ridgePath(py: number) {
  const out = [Math.cos(rad(RIDGE)), Math.sin(rad(RIDGE))];
  const points = Array.from({ length: 15 }, (_, i) => {
    const [x, y] = polar(py, 70 + i * 21.5, RIDGE);
    const peak = i % 2 ? 7 + seeded(i + 900) * 15 : seeded(i + 950) * 3;
    return `${(x + out[0] * peak).toFixed(1)} ${(y + out[1] * peak).toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

/**
 * Riktningarnas markeringar strax bortom spetsen: åt vänster (där lärandemålet
 * lägger nålen, en aning över horisonten så att den syns mot ljuslinjen),
 * uppåt och åt höger. Impulsen drar nålen förbi den högra, ned under ytan.
 */
const DIRECTIONS = [MOTION.goal.angle, 0, -MOTION.goal.angle];
const marks = DIRECTIONS.map(deg => around(LENGTH + 16, deg));
const dialMarks = DIRECTIONS.map(deg => around(DIAL, deg));

/** Gradskivan: bågen och en markering var sjätte grad, längre var trettionde. */
const [dialX1, dialY1] = around(DIAL, DIAL_FROM), [dialX2, dialY2] = around(DIAL, DIAL_TO);
const DIAL_ARC = `M ${dialX1.toFixed(1)} ${dialY1.toFixed(1)} A ${DIAL} ${DIAL} 0 0 1 ${dialX2.toFixed(1)} ${dialY2.toFixed(1)}`;
const DIAL_TICKS = Array.from({ length: Math.floor((DIAL_TO - DIAL_FROM) / 6) + 1 }, (_, i) => DIAL_FROM + i * 6).map(deg => {
  const long = deg % 30 === 0;
  const [x1, y1] = around(DIAL, deg), [x2, y2] = around(DIAL + (long ? 12 : 6), deg);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}).join(" ");

/** Linjalkanten i ritningen: en markering var tjugonde pixel, längre var hundrade. */
const RULER = Array.from({ length: 66 }, (_, i) => 150 + i * 20).map(x => `M${x} 0 V${x % 100 === 50 ? 10 : 4}`).join(" ");

/** Kompassnålen, ritad uppåt från vridpunkten: spetsen i ljus, svansen dov. */
const FRONT = `M0 ${-LENGTH} L9 -8 L0 0 L-9 -8 Z`;
const TAIL = "M9 -8 L0 46 L-9 -8 L0 0 Z";
const OUTLINE = `M0 ${-LENGTH} L9 -8 L0 46 L-9 -8 Z`;

/**
 * Fjädern: nålen söker sitt mål i varje läge. Gnistan tänds när den slår i
 * gränsen. Nålen ritas i flera lager (spegling, under ytan, ovanför); alla
 * vrids med samma vinkel.
 */
function useNeedle(phase: Phase, still: boolean) {
  const layers = useRef<(SVGGElement | null)[]>([]);
  const spark = useRef<SVGGElement>(null);
  const sim = useRef({ angle: 0, velocity: 0, target: 0 });
  useEffect(() => {
    const motion = MOTION[phase];
    const stop = (angle: number) => motion.wall ? Math.min(angle, WALL) : angle;
    const draw = (angle: number) => {
      const value = `rotate(${angle.toFixed(2)})`;
      for (const el of layers.current) el?.setAttribute("transform", value);
    };
    const state = sim.current;
    if (still) {
      state.angle = stop(motion.angle);
      state.velocity = 0;
      state.target = motion.angle;
      draw(state.angle);
      return;
    }
    const from = state.target;
    let last = performance.now(), lastHit = 0, frame = 0;
    const start = last + motion.delay;
    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / (1000 / 60);
      last = now;
      const active = now >= start;
      if (active) state.target = motion.angle;
      const goal = (active ? motion.angle : from) + motion.wobble * (Math.sin(now / 430) + .45 * Math.sin(now / 167 + 1.3)) / 1.45;
      state.velocity = (state.velocity + (goal - state.angle) * motion.k * dt) * Math.pow(motion.damp, dt);
      state.angle += state.velocity * dt;
      if (motion.wall && active && state.angle > WALL) {
        const speed = state.velocity;
        state.angle = WALL;
        state.velocity = -speed * .35;
        const flash = spark.current;
        if (flash && speed > .8 && now - lastHit > 260) {
          lastHit = now;
          flash.classList.remove(n.sparkOn);
          void flash.getBoundingClientRect();
          flash.classList.add(n.sparkOn);
        }
      }
      draw(state.angle);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, still]);
  const layer = (i: number) => (el: SVGGElement | null) => { layers.current[i] = el; };
  return { layer, spark };
}

export function Nal({ t, edit, step, still, horizonY }: FormProps) {
  const phases = phasesOf(t);
  const phase = phases[Math.min(step, phases.length - 1)];
  const reached = (p: Phase) => phases.includes(p) && step >= phases.indexOf(p);
  const { layer, spark } = useNeedle(phase, still);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const py = horizonY;
  const land = phase === "land";
  // Zoomdecken (tiopotenserna) har ingen sjö: där blir nålen en ritning på en linjalkant.
  const drawing = t("skala").trim() !== "";
  const mirror = t("spegel").trim().toLowerCase() === "ja";
  // Den kraft som drar just nu lyser; de tidigare dämpas, och med slutsatsen går de undan.
  const forceState = (p: Phase) => !reached(p) || land ? "off" : phase === p ? "on" : "dim";
  const pull = phase === "drift" || phase === "edge" ? "right" : phase === "goal" ? "left" : phase === "lift" || phase === "land" ? "up" : "none";
  const [wx, wy] = polar(py, LENGTH, WALL);
  const force = (i: 1 | 2 | 3, p: Phase) => t(`force${i}`) ? <div className={`${n.force} ${n[`f${i}`]} ${s.reveal}`} data-on={forceState(p) !== "off"} data-state={forceState(p)} aria-hidden={forceState(p) === "off"}>
    {t(`forceLabel${i}`) && <small>{edit(`forceLabel${i}`)}</small>}
    <p>{edit(`force${i}`)}</p>
  </div> : null;
  // Ljus: speglad i vattnet, dov under ytan och skarp ovanför. Ritning: dold kant streckad under linjen, fyllt norrstycke ovanför.
  const lightShape: ReactNode = <>
    <path className={n.tail} d={TAIL} />
    <path d={FRONT} fill={`url(#${id}g)`} />
    <path className={n.axis} d={`M0 ${-LENGTH + 12} L0 -6`} />
  </>;
  const needle = drawing
    ? <>
      <g clipPath={`url(#${id}b)`} className={n.hiddenEdge}><g ref={layer(0)}><path className={n.drawTail} d={TAIL} /><path className={n.drawFront} d={FRONT} /></g></g>
      <g clipPath={`url(#${id}a)`} className={n.drawn}><g ref={layer(1)}><path className={n.drawTail} d={TAIL} /><path className={n.drawFront} d={FRONT} /></g></g>
    </>
    : <>
      <g clipPath={`url(#${id}b)`} className={n.reflection}><g transform="scale(1 -1)"><g ref={layer(0)}>{lightShape}</g></g></g>
      <g clipPath={`url(#${id}b)`} className={n.submerged}><g ref={layer(1)}>{lightShape}</g></g>
      <g clipPath={`url(#${id}a)`} className={n.needle}><g ref={layer(2)}>{lightShape}</g></g>
    </>;
  return <div className={n.nal} data-phase={phase} data-still={still} data-edge={reached("edge")} data-lifted={reached("lift")} data-land={land} data-pull={pull}
    data-drawing={drawing || undefined} data-mirror={mirror || undefined} style={{ "--py": `${py}px` } as CSSProperties}>
    <header className={n.head}>
      <Kicker t={t} edit={edit} />
      <div className={n.stack}>
        {t("title") && <h2 className={n.question}>{edit("title", <RichLines text={t("title")} />)}</h2>}
        {t("note") && <h2 className={`${n.note} ${s.reveal}`} data-on={land} aria-hidden={!land}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
      </div>
    </header>
    <svg className={n.plot} viewBox="0 0 1600 900" aria-hidden="true">
      <defs>
        <clipPath id={`${id}a`}><rect x={-PX} y={-py} width={1600} height={py} /></clipPath>
        <clipPath id={`${id}b`}><rect x={-PX} y={0} width={1600} height={900 - py} /></clipPath>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={0} y1={-LENGTH} x2={0} y2={0}>
          <stop offset="0" style={{ stopColor: "var(--nal-tip)" }} />
          <stop offset=".55" style={{ stopColor: "var(--nal-left)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--nal-left) 70%, var(--bg))" }} />
        </linearGradient>
        <linearGradient id={`${id}l`} x1={0} y1={1} x2={0} y2={0}>
          <stop offset="0" style={{ stopColor: "var(--nal-tip)", stopOpacity: .85 }} />
          <stop offset="1" style={{ stopColor: "var(--nal-tip)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {drawing && <g transform={`translate(0 ${py})`}>
        <path className={n.base} d="M150 0 H1450" />
        <path className={n.ruler} d={RULER} />
      </g>}
      <g transform={mirror ? "translate(1600 0) scale(-1 1)" : undefined}>
        <path className={n.ridge} d={ridgePath(py)} pathLength={1} />
        <g transform={`translate(${PX} ${py})`}>
          {drawing
            ? <>
              <path className={n.dial} d={DIAL_ARC} />
              <path className={n.dialTicks} d={DIAL_TICKS} />
              {dialMarks.map(([x, y], i) => <circle key={i} className={n.tick} cx={x.toFixed(1)} cy={y.toFixed(1)} r={4} />)}
              <path className={n.centerline} d={`M0 60 V${-(DIAL + 6)}`} />
            </>
            : <>
              <rect className={n.beam} x={-1.5} y={-LENGTH - 34} width={3} height={LENGTH + 34} fill={`url(#${id}l)`} />
              {marks.map(([x, y], i) => <circle key={i} className={n.tick} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.5} />)}
            </>}
          <path className={drawing ? n.phantom : n.ghost} d={OUTLINE} transform={`rotate(${MOTION.drift.angle})`} />
          {needle}
          {drawing
            ? <g className={n.centerMark}><circle r={10} /><path d="M-17 0 H17 M0 -17 V17" /></g>
            : <><circle className={n.pivotRing} r={11} /><circle className={n.pivotCore} r={4} /></>}
        </g>
        <g transform={`translate(${wx.toFixed(1)} ${wy.toFixed(1)})`}>
          <g ref={spark} className={n.spark}>
            <circle r={14} />
            <path d="M0 -26 V-18 M18 -18 L13 -13 M26 0 H18 M18 18 L13 13" />
          </g>
        </g>
      </g>
    </svg>
    <p className={`${n.dir} ${n.left}`}>{edit("left")}</p>
    <p className={`${n.dir} ${n.right}`}>{edit("right")}</p>
    <p className={`${n.dir} ${n.up}`}>{edit("up")}</p>
    {force(1, "drift")}
    {force(2, "goal")}
    {force(3, "edge")}
    {t("ghost") && <div className={`${n.force} ${n.trace} ${s.reveal}`} data-on={land} aria-hidden={!land}>
      {t("ghostLabel") && <small>{edit("ghostLabel")}</small>}
      <p>{edit("ghost")}</p>
    </div>}
  </div>;
}
