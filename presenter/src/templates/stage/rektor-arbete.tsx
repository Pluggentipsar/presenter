"use client";

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { Document, RichLines, seeded } from "./kit";
import { Kicker, type FormProps } from "./forms";
import s from "./stage.module.css";
import r from "./rektor-arbete.module.css";

/*
 * Rektorsinternatet · arbetets former. Varje form har sin egen rörelseriktning,
 * så att föreläsningen inte gör samma sak två gånger: emot (mot), inåt och utåt
 * (bygga), nedåt (sortera, trappa), längs en kurva (kurva) och uppåt (efter).
 */

const px = (value: number) => `${Math.round(value)}px`;
const filled = (t: FormProps["t"], prefix: string, max: number) => Array.from({ length: max }, (_, i) => i + 1).filter(n => t(`${prefix}${n}`));

/* ------------------------------------------------ MOT MIG · beslutet får motstånd */

export function Mot({ t, edit, step, still }: FormProps) {
  const moves = filled(t, "prompt", 4);
  const hasNotes = moves.some(n => t(`note${n}`));
  const notesStep = moves.length + 1;
  const finalStep = notesStep + (hasNotes ? 1 : 0);
  const notesOn = hasNotes && step >= notesStep;
  const finalOn = Boolean(t("final")) && step >= finalStep;
  // Varje nytt drag stöter till beslutet; växlande namn startar om stöten.
  const hit = !still && step >= 1 && step <= moves.length ? step % 2 : -1;
  return <div className={r.mot} data-still={still}>
    <div className={r.head}>
      <Kicker t={t} edit={edit} className={r.motKicker} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </div>
    <article className={r.motPaper} data-hit={hit} data-marked={notesOn}>
      <small>{edit("decisionLabel")}</small>
      <h3>{edit("decision", <RichLines text={t("decision")} />)}</h3>
      {t("context") && edit("context", <Document text={t("context")} className={r.motContext} />)}
      {/* Papperet växer först när motståndet kommer; tills dess är det bara beslutet. */}
      {hasNotes && <div className={r.motNotesWrap} data-open={notesOn}><div>
        <div className={`${r.motNotes} ${s.reveal}`} data-on={notesOn} aria-hidden={!notesOn}>
          {t("notesLabel") && <p className={r.motNotesLabel}><i className={s.aiDot} />{edit("notesLabel")}</p>}
          {moves.filter(n => t(`note${n}`)).map((n, i) => <p key={n} className={r.motNote} style={{ "--i": i } as CSSProperties}>
            <b>{t(`move${n}`)}</b>{edit(`note${n}`, <RichLines text={t(`note${n}`)} />)}
          </p>)}
        </div>
      </div></div>}
    </article>
    <ol className={r.motMoves} data-dim={notesOn} data-gone={finalOn} aria-label="Dragen">
      {moves.map((n, i) => <li key={n} className={r.motMove} data-on={step >= i + 1} aria-hidden={step < i + 1}>
        <span className={r.motTag}>{edit(`move${n}`)}</span>
        <p>{edit(`prompt${n}`, <RichLines text={t(`prompt${n}`)} />)}</p>
      </li>)}
    </ol>
    {t("final") && <div className={r.motFinal}>
      <h2 className={s.reveal} data-on={finalOn} aria-hidden={!finalOn}>{edit("final", <RichLines text={t("final")} emphasis={finalOn ? t("emphasis") : ""} />)}</h2>
      {t("finalNote") && <p className={s.reveal} data-on={finalOn} aria-hidden={!finalOn}>{edit("finalNote", <RichLines text={t("finalNote")} />)}</p>}
    </div>}
  </div>;
}

/* ------------------------------------- AI kan också bygga · in i skärmen, ut igen */

const icons: Record<string, ReactNode> = {
  research: <svg viewBox="0 0 48 48"><path d="M12 6h17l8 8v28H12z" /><path d="M29 6v8h8" /><path d="M17 20h14M17 26h10" /><circle cx="30" cy="33" r="5" /><path d="M34 37l5 5" /></svg>,
  analys: <svg viewBox="0 0 48 48"><path d="M8 40h32" /><path d="M13 40V27M21 40V19M29 40V24M37 40V12" /><path d="M11 22l9-8 8 5 11-10" /></svg>,
  kod: <svg viewBox="0 0 48 48"><rect x="6" y="9" width="36" height="30" rx="3" /><path d="M6 16h36" /><path d="M19 23l-5 5 5 5M29 23l5 5-5 5" /></svg>,
  agent: <svg viewBox="0 0 48 48"><path d="M24 6l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" /><path d="M37 29l1.6 4.4L43 35l-4.4 1.6L37 41l-1.6-4.4L31 35l4.4-1.6zM11 30l1.2 3.3 3.3 1.2-3.3 1.2L11 39l-1.2-3.3-3.3-1.2 3.3-1.2z" /></svg>,
};

export function Bygga({ t, edit, step, still }: FormProps) {
  const tiles = filled(t, "tile", 4);
  const web = Math.min(tiles.length, Math.max(1, Number(t("webTile")) || 3));
  const promptStep = t("prompt") ? 1 : 0;
  const resultStep = t("result") ? promptStep + 1 : -1;
  const tilesStep = tiles.length ? Math.max(promptStep, resultStep) + 1 : -1;
  const finalStep = t("final") ? Math.max(promptStep, resultStep, tilesStep) + 1 : -1;
  const zoomed = resultStep >= 0 && step >= resultStep && (tilesStep < 0 || step < tilesStep);
  const tiled = tilesStep >= 0 && step >= tilesStep;
  // Webbsidan: dold bakom beställningen, sedan nära betraktaren, sedan ett av korten.
  const where = tiled ? "tile" : zoomed ? "near" : "far";
  const tileLeft = (i: number) => 96 + i * 362;
  return <div className={r.bygga} data-still={still} data-zoomed={zoomed} data-tiled={tiled}>
    <div className={r.byggaHead} data-dim={zoomed}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
      {t("final") && <p className={`${r.byggaFinal} ${s.reveal}`} data-on={step >= finalStep} aria-hidden={step < finalStep}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</p>}
    </div>
    {t("prompt") && <div className={`${r.byggaPrompt} ${s.reveal}`} data-on={step >= promptStep && !tiled} data-dim={zoomed} aria-hidden={step < promptStep || tiled}>
      <small><i className={s.humanDot} />{t("promptLabel") ? edit("promptLabel") : "Beställningen"}</small>
      <p>{edit("prompt", <RichLines text={t("prompt")} />)}</p>
      {t("attachment") && <span className={r.byggaAttach}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5l-7.8 7.8a5 5 0 01-7.1-7.1l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4L15 6.8" /></svg>{edit("attachment")}</span>}
    </div>}
    {tiles.map((n, i) => <article key={n} className={`${r.byggaTile} ${s.reveal}`} data-on={tiled} aria-hidden={!tiled}
      style={{ "--x": px(tileLeft(i)), "--i": i } as CSSProperties}>
      <div className={r.byggaIcon} data-web={i + 1 === web}>{i + 1 === web ? null : icons[t(`tileIcon${n}`)] ?? icons[["research", "analys", "kod", "agent"][i]]}</div>
      <h3>{edit(`tile${n}`)}</h3>
      <p>{edit(`tileText${n}`, <RichLines text={t(`tileText${n}`)} />)}</p>
      {t(`tileChip${n}`) && <span className={r.byggaChip}>{edit(`tileChip${n}`)}</span>}
    </article>)}
    {t("result") && <figure className={r.byggaWindow} data-where={where} style={{ "--tx": px(tileLeft(web - 1)) } as CSSProperties} aria-hidden={step < resultStep}>
      <div className={r.byggaBar}><i /><i /><i /><span className={r.byggaUrl}>{edit("url")}</span></div>
      <img src={t("result")} alt={t("resultAlt") || t("resultLabel")} />
      {t("resultLabel") && <figcaption>{edit("resultLabel")}</figcaption>}
    </figure>}
  </div>;
}

/* --------------------------------------------------- Vad får jag dela? · nedåt */

const LANE_STEP = 88;

export function Sortera({ t, edit, step, still }: FormProps) {
  const lanes = [1, 2, 3].filter(n => t(`lane${n}`));
  const docs = filled(t, "doc", 8).map(n => ({ n, lane: Math.min(lanes.length, Math.max(1, Number(t(`docLane${n}`)) || 1)) }));
  const finalStep = docs.length + 1;
  const finalOn = Boolean(t("final")) && step >= finalStep;
  const slot = new Map<number, number>();
  const placed = docs.map(doc => { const k = slot.get(doc.lane) ?? 0; slot.set(doc.lane, k + 1); return { ...doc, k }; });
  // Facken kan bära roller (human, shared, ai) i stället för trafikljusets grönt, gult och rött.
  const role = (lane: number) => t(`laneRole${lanes[lane - 1] ?? lane}`) || undefined;
  // Golvet: 820 som på internatet; en film med textning håller papperen ovanför y 765 (floor="760").
  const floor = Math.min(840, Math.max(600, Number(t("floor")) || 820));
  return <div className={r.sortera} data-still={still}>
    <div className={r.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
      {t("final") && <p className={`${r.sortFinal} ${s.reveal}`} data-on={finalOn} aria-hidden={!finalOn}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</p>}
    </div>
    {lanes.map((n, i) => <section key={n} className={r.lane} data-lane={n} data-role={t(`laneRole${n}`) || undefined} style={{ "--x": px(156 + i * 442) } as CSSProperties} aria-label={t(`lane${n}`)}>
      <header><i /><strong className={r.laneName}>{edit(`lane${n}`)}</strong><span className={r.laneRule}>{edit(`rule${n}`, <RichLines text={t(`rule${n}`)} />)}</span></header>
    </section>)}
    {placed.map((doc, i) => <p key={doc.n} className={r.doc} data-on={step >= i + 1} data-lane={doc.lane} data-role={role(doc.lane)} aria-hidden={step < i + 1}
      style={{ "--x": px(156 + (doc.lane - 1) * 442 + 25), "--y": px(floor - (doc.k + 1) * LANE_STEP), "--r": `${((seeded(doc.n + 3) - .5) * 4).toFixed(1)}deg` } as CSSProperties}>
      {edit(`doc${doc.n}`, <RichLines text={t(`doc${doc.n}`)} />)}
    </p>)}
  </div>;
}

/* ------------------------------------------------ U-kurvan · längs kurvan */

type Point = [number, number];
function bezierLength(p0: Point, p1: Point, p2: Point, p3: Point) {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= 80; i++) {
    const u = i / 80;
    const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u ** 2, d = u ** 3;
    const next: Point = [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
    length += Math.hypot(next[0] - prev[0], next[1] - prev[1]);
    prev = next;
  }
  return length;
}

const START: Point = [220, 470], VALLEY: Point = [720, 730], END: Point = [1380, 370];
const SEG_A: [Point, Point, Point, Point] = [START, [380, 600], [540, 730], VALLEY];
const SEG_B: [Point, Point, Point, Point] = [VALLEY, [930, 730], [1180, 620], END];
const CURVE = `M ${START.join(" ")} C ${SEG_A[1].join(" ")} ${SEG_A[2].join(" ")} ${VALLEY.join(" ")} C ${SEG_B[1].join(" ")} ${SEG_B[2].join(" ")} ${END.join(" ")}`;
const LEN_A = bezierLength(...SEG_A);
const VALLEY_AT = LEN_A / (LEN_A + bezierLength(...SEG_B));

export function Kurva({ t, edit, step, still }: FormProps) {
  const points = [1, 2, 3].filter(n => t(`point${n}`));
  const finalStep = points.length;
  const finalOn = Boolean(t("final")) && step >= finalStep;
  const reach = step <= 0 ? 0 : step === 1 ? VALLEY_AT : 1;
  const at: Point[] = [START, VALLEY, END];
  return <div className={r.kurva} data-still={still} data-final={finalOn}>
    <div className={r.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
      {t("final") && <p className={`${r.kurvaFinal} ${s.reveal}`} data-on={finalOn} aria-hidden={!finalOn}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</p>}
    </div>
    <svg className={r.kurvaPlot} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={r.axis} d="M 170 250 V 820 H 1470" />
      <path className={r.curveGuide} d={CURVE} />
      <path className={r.curveLit} d={CURVE} pathLength={1} style={{ strokeDashoffset: 1 - reach } as CSSProperties} />
    </svg>
    <p className={r.axisX}>{edit("xLabel")}</p>
    <p className={r.axisY}>{edit("yLabel")}</p>
    {t("note") && <p className={r.kurvaNote}>{edit("note")}</p>}
    <i className={r.kurvaLight} style={{ offsetPath: `path("${CURVE}")`, offsetDistance: `${(reach * 100).toFixed(2)}%` } as CSSProperties} aria-hidden="true" />
    {points.map((n, i) => <div key={n} className={`${r.point} ${s.reveal}`} data-point={i} data-on={step >= i} aria-hidden={step < i}
      style={{ "--x": px(at[i][0]), "--y": px(at[i][1]) } as CSSProperties}>
      <i />
      <div className={r.pointText}><strong className={r.pointName}>{edit(`point${n}`)}</strong><span className={r.pointBody}>{edit(`pointText${n}`, <RichLines text={t(`pointText${n}`)} />)}</span></div>
    </div>)}
  </div>;
}

/* --------------------------------------------------- Så jobbar jag · trappan */

export function Trappa({ t, edit, step, still }: FormProps) {
  const steps = filled(t, "stepLabel", 6);
  const imageAt = Math.min(steps.length, Math.max(1, Number(t("imageStep")) || 4));
  const finalStep = steps.length + 1;
  const finalOn = Boolean(t("final")) && step >= finalStep;
  const shift = Math.min(200, 1000 / Math.max(1, steps.length));
  // Med högst fyra steg (filmerna) får trappan större text och mer luft; internatets fem steg är oförändrade.
  const few = steps.length <= 4;
  const rise = few ? 136 : 112;
  return <div className={r.trappa} data-still={still} data-final={finalOn} data-few={few || undefined}>
    <div className={r.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </div>
    <ol className={r.stairs}>
      {steps.map((n, i) => <li key={n} className={r.stair} data-on={step >= i + 1} data-role={t(`stepRole${n}`) || "human"} aria-hidden={step < i + 1}
        style={{ "--x": px(96 + i * shift), "--y": px(196 + i * rise), "--i": i } as CSSProperties}>
        <b>{i + 1}</b>
        <div><strong className={r.stairName}>{edit(`stepLabel${n}`)}</strong><span className={r.stairText}>{edit(`stepText${n}`, <RichLines text={t(`stepText${n}`)} />)}</span></div>
        {t(`stepWho${n}`) && <em className={r.stairWho}>{edit(`stepWho${n}`)}</em>}
      </li>)}
    </ol>
    {t("image") && <figure className={`${r.trappaShot} ${s.reveal}`} data-on={step >= imageAt} aria-hidden={step < imageAt}>
      <img src={t("image")} alt={t("imageAlt")} />
      {t("imageCaption") && <figcaption>{edit("imageCaption")}</figcaption>}
    </figure>}
    {t("final") && <h2 className={`${r.trappaFinal} ${s.reveal}`} data-on={finalOn} aria-hidden={!finalOn}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ------------------------------------------------ Jag efter · ljusen stiger */

type Glow = { x: number; y: number; group: number; sky: number; size: number; delay: number };

function waterLights(horizonY: number, count: number): Glow[] {
  return Array.from({ length: count }, (_, i) => {
    const x = 110 + seeded(i + 900) * 1380;
    // Till vänster står frågorna; där stannar stjärnorna strax ovanför horisonten.
    const sky = x < 1000 ? horizonY - 150 + seeded(i + 980) * 110 : 50 + seeded(i + 980) * (horizonY - 190);
    return { x, y: horizonY + 36 + seeded(i + 940) ** 1.3 * (860 - horizonY - 36), group: i % 3, sky, size: .7 + seeded(i + 1020) * .7, delay: seeded(i + 1060) * .9 };
  });
}

export function Efter({ t, edit, step, still, horizonY, lightX }: FormProps) {
  const questions = filled(t, "question", 3);
  const finalStep = questions.length + 1;
  const finalOn = Boolean(t("final")) && step >= finalStep;
  const lights = waterLights(horizonY, Number(t("lights")) || 27);
  return <div className={r.efter} data-still={still} data-step={Math.min(step, 3)} data-final={finalOn} style={{ "--hy": px(horizonY), "--lx": px(lightX) } as CSSProperties}>
    <div className={r.efterHead} data-final={finalOn}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
      <ol>
        {questions.map((n, i) => <li key={n} className={s.reveal} data-on={step >= i + 1} aria-hidden={step < i + 1}>{edit(`question${n}`, <RichLines text={t(`question${n}`)} />)}</li>)}
      </ol>
    </div>
    <div className={r.efterLights} aria-hidden="true">
      {lights.map((light, i) => <i key={i} data-group={light.group} style={{ "--x": px(light.x), "--y": px(light.y), "--sky": px(light.sky - light.y), "--gx": px(lightX - light.x), "--gy": px(horizonY - light.y), "--s": light.size, "--d": `${light.delay.toFixed(2)}s` } as CSSProperties} />)}
    </div>
    <i className={r.efterSun} data-on={step >= 3} aria-hidden="true" />
    {t("final") && <h2 className={`${r.efterFinal} ${s.reveal}`} data-on={finalOn} aria-hidden={!finalOn}>{edit("final", <RichLines text={t("final")} emphasis={finalOn ? t("emphasis") : ""} />)}</h2>}
  </div>;
}
