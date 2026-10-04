"use client";

/**
 * Världarna bakom Stage-scenerna utöver Vättern (kit.tsx, VatterSky). En kommuns
 * formprov 1 oktober 2026: temat väljer världen (stageWorld) och T byter den.
 *
 * Varje värld håller kontraktet som formerna står på: horisonten (--hz2-h),
 * ljuset (--hz2-fx) och vattnet under. Allt ritas mot referenshorisonten H0 och
 * följer med när horisonten glider (follow). Himlen, skenet, reflexen, kornet
 * och vinjetten är VatterSkys egna lager och färgas per värld i stage.module.css.
 *
 *   smedja   Stålstaden i natt: smedjornas och fabrikernas silhuetter vid ån,
 *            glödande fönster, rök, gnistor ur essjans sken och en ström som flyter.
 *   an       Ån i morgonljus: stenbron vars valv speglas till hela cirklar, träd
 *            och torn på andra stranden, solen lågt och en lugn ström.
 *   plattor  Kommunens tonplattor: platt himmel och vatten i plattans färg (filmens
 *            färg eller temats), solen som skiva, reflexer i band och en platt stad.
 */
import { useId, type CSSProperties } from "react";
import { H0, follow, seeded } from "./sky-math";
import s from "./stage.module.css";

export type StageWorld = "vattern" | "smedja" | "an" | "plattor";
export const STAGE_WORLDS: readonly StageWorld[] = ["vattern", "smedja", "an", "plattor"];

/* ------------------------------------------------------- staden vid ån */

type Shape = { kind: "house"; x: number; w: number; wall: number; roof: number; chimney?: number }
  | { kind: "factory"; x: number; w: number; wall: number; teeth: number; tooth: number }
  | { kind: "stack"; x: number; base: number; top: number; height: number };

/**
 * Smedjorna (låga trähus med skorsten), fabriken med sågtandstak och skorstenarna.
 * Husen står i två grupper: vid vänsterkanten, utanför textspalten (x < 96), och till
 * höger om talarens rader (x 690–990). Däremellan ligger en rad låga bodar, högst
 * 14 px, så att inget korsar rubriker, talarens namn, eftertextens rader eller pusslet,
 * inte heller när en form har högre horisont (stränderna).
 */
const NEAR: Shape[] = [
  { kind: "stack", x: 40, base: 24, top: 14, height: 156 },
  { kind: "house", x: 12, w: 74, wall: 30, roof: 16 },
  { kind: "house", x: 90, w: 96, wall: 8, roof: 6 },
  { kind: "house", x: 190, w: 120, wall: 7, roof: 5 },
  { kind: "house", x: 314, w: 104, wall: 9, roof: 5 },
  { kind: "house", x: 422, w: 132, wall: 7, roof: 4 },
  { kind: "house", x: 558, w: 128, wall: 8, roof: 5 },
  { kind: "factory", x: 690, w: 220, wall: 38, teeth: 7, tooth: 15 },
  { kind: "stack", x: 800, base: 18, top: 11, height: 86 },
  { kind: "house", x: 914, w: 76, wall: 24, roof: 18, chimney: 14 },
];
/** Bortre stranden: lägre och disigare, och nästan platt bakom Joel. */
const FAR: Shape[] = [
  { kind: "factory", x: 300, w: 300, wall: 12, teeth: 9, tooth: 7 },
  { kind: "house", x: 820, w: 160, wall: 22, roof: 14 },
  { kind: "factory", x: 960, w: 200, wall: 16, teeth: 6, tooth: 8 },
  { kind: "house", x: 1150, w: 220, wall: 9, roof: 6 },
  { kind: "house", x: 1360, w: 260, wall: 7, roof: 5 },
];

function shapePath(shape: Shape): string {
  const h = H0 + 1;
  if (shape.kind === "house") {
    const { x, w, wall, roof, chimney } = shape;
    const ridge = H0 - wall - roof;
    let d = `M${x} ${h} L${x} ${H0 - wall} L${x + w / 2} ${ridge} L${x + w} ${H0 - wall} L${x + w} ${h} Z`;
    if (chimney) {
      const cx = x + w * .7, top = H0 - wall - roof * .55 - chimney;
      d += ` M${cx - 4.5} ${H0 - wall - roof * .4} L${cx - 4.5} ${top} L${cx + 4.5} ${top} L${cx + 4.5} ${H0 - wall - roof * .7} Z`;
    }
    return d;
  }
  if (shape.kind === "factory") {
    const { x, w, wall, teeth, tooth } = shape;
    const step = w / teeth;
    let d = `M${x} ${h} L${x} ${H0 - wall}`;
    for (let i = 0; i < teeth; i++) d += ` L${x + i * step} ${H0 - wall - tooth} L${x + (i + 1) * step} ${H0 - wall}`;
    return d + ` L${x + w} ${h} Z`;
  }
  const { x, base, top, height } = shape;
  return `M${x - base / 2} ${h} L${x - top / 2} ${H0 - height} L${x - top / 2 - 2} ${H0 - height - 6} L${x + top / 2 + 2} ${H0 - height - 6} L${x + top / 2} ${H0 - height} L${x + base / 2} ${h} Z`;
}
const NEAR_PATH = NEAR.map(shapePath).join(" ");
const FAR_PATH = FAR.map(shapePath).join(" ");

/** Fönster i smedjornas väggar och fabrikens fasad. */
const WINDOWS = NEAR.flatMap((shape, n) => {
  if (shape.kind === "house" && shape.wall >= 18) {
    const count = shape.w > 90 ? 2 : 1;
    return Array.from({ length: count }, (_, i) => ({ x: shape.x + shape.w * (count === 1 ? .38 : .22 + i * .4), y: H0 - shape.wall * .62, w: 7, h: 8, k: n * 3 + i }));
  }
  if (shape.kind === "factory") {
    return Array.from({ length: 9 }, (_, i) => ({ x: shape.x + 14 + i * 24.5, y: H0 - shape.wall * .66, w: 11, h: 13, k: n * 3 + i }));
  }
  return [];
}).filter((_, i) => seeded(i + 900) > .18);

/** Strömmen: vågor med perioden P som glider en period åt höger och börjar om, utan skarv. */
const P = 420;
function riverLines(count: number, amp: number) {
  return Array.from({ length: count }, (_, i) => {
    const depth = (i + 1) / count;
    const y = H0 + 7 + (900 - H0) * depth ** 1.6;
    const a = amp * (1 + depth * 5);
    let d = `M${-2 * P} ${y.toFixed(1)} Q${(-2 * P + P / 4).toFixed(1)} ${(y - 2 * a).toFixed(1)} ${(-2 * P + P / 2).toFixed(1)} ${y.toFixed(1)}`;
    for (let x = -2 * P + P; x <= 1600 + 2 * P; x += P / 2) d += ` T${x.toFixed(1)} ${y.toFixed(1)}`;
    return { d, depth, k: 1 - depth ** 1.6, t: 46 - depth * 26 };
  });
}
const RIVER = riverLines(11, 1.1);

function River({ className }: { className: string }) {
  return <g className={className}>
    {RIVER.map((line, i) => <path key={i} d={line.d} strokeOpacity={(.2 - line.depth * .12).toFixed(3)} strokeWidth={(.8 + line.depth * .9).toFixed(2)}
      style={{ ...follow(line.k), "--flow-t": `${line.t.toFixed(1)}s` } as CSSProperties} />)}
  </g>;
}

/* -------------------------------------------------------------- smedjan */

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  x: (seeded(i + 1100) - .5) * 120, dx: (seeded(i + 1200) - .5) * 140, dy: -(120 + seeded(i + 1300) * 210),
  t: 3.2 + seeded(i + 1400) * 3.4, delay: -seeded(i + 1500) * 6.6, size: 1.6 + seeded(i + 1600) * 1.8,
}));

export function SmedjaScene() {
  const glow = useId().replace(/:/g, "");
  return <>
    <svg className={s.water} viewBox="0 0 1600 900" preserveAspectRatio="none">
      <defs>
        <filter id={`${glow}-glow`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path className={s.smFar} d={FAR_PATH} style={follow(1)} />
      <path className={s.smNear} d={NEAR_PATH} style={follow(1)} />
      <g className={s.smWindows} filter={`url(#${glow}-glow)`} style={follow(1)}>
        {WINDOWS.map((w, i) => <rect key={i} x={w.x.toFixed(1)} y={w.y.toFixed(1)} width={w.w} height={w.h} style={{ animationDelay: `${(-seeded(w.k + 700) * 5).toFixed(2)}s` }} />)}
      </g>
      <g className={s.smStreaks} style={follow(1)}>
        {WINDOWS.filter((_, i) => i % 2 === 0).map((w, i) => <rect key={i} x={(w.x + w.w / 2 - 1).toFixed(1)} y={H0 + 5} width={2} height={(16 + seeded(w.k + 800) * 34).toFixed(1)} style={{ animationDelay: `${(-seeded(w.k + 850) * 4).toFixed(2)}s` }} />)}
      </g>
      <River className={s.riverLines} />
    </svg>
    <div className={s.smSmoke} style={{ left: 40 - 24, top: H0 - 156 - 70, ...follow(1) }} />
    <div className={s.smSparks}>
      {SPARKS.map((spark, i) => <i key={i} style={{ left: spark.x, width: spark.size, height: spark.size, animationDuration: `${spark.t.toFixed(2)}s`, animationDelay: `${spark.delay.toFixed(2)}s`,
        "--dx": `${spark.dx.toFixed(0)}px`, "--dy": `${spark.dy.toFixed(0)}px` } as CSSProperties} />)}
    </div>
  </>;
}

/* ------------------------------------------------------------------ ån */

/**
 * Stenbron: ett lågt däck, landfästen och fyra valv som möter vattnet. Den är
 * högst 19 px över horisonten, så att den aldrig går in i talarens rader; det är
 * spegelbilden under horisonten som gör valven till hela cirklar.
 */
const BRIDGE_TOP = H0 - 19;
const BRIDGE = (() => {
  const left = 60, right = 860, ramp = 26, pier = 34, arches = 6;
  const span = (right - left - 2 * ramp - (arches - 1) * pier) / arches;
  let d = `M${left} ${H0} L${left + ramp} ${BRIDGE_TOP} L${right - ramp} ${BRIDGE_TOP} L${right} ${H0}`;
  for (let i = arches - 1; i >= 0; i--) {
    const x1 = left + ramp + i * (span + pier) + span, x0 = x1 - span;
    d += ` L${x1.toFixed(1)} ${H0} A${(span / 2).toFixed(1)} 12 0 0 0 ${x0.toFixed(1)} ${H0}`;
  }
  return d + " Z";
})();
const RAIL = `M${60 + 26} ${BRIDGE_TOP + 2.5} L${860 - 26} ${BRIDGE_TOP + 2.5}`;
/**
 * Trädkronor längs andra stranden i två rader, lägre bakom Joel så att ytan där är lugn.
 * Den främre raden står inte framför bron, så att den syns mot de ljusare träden bakom.
 */
const crowns = (count: number, seed: number, size: number, lift: number, skip?: [number, number]) => Array.from({ length: count }, (_, i) => {
  const x = -30 + i * (1660 / count) + seeded(i + seed) * 18;
  const calm = x > 1040 ? .5 : 1;
  const ry = (size * .55 + seeded(i + seed + 100) * size) * calm;
  return { x, y: H0 - lift - ry * .55, rx: ry * (1.25 + seeded(i + seed + 200) * .35), ry };
}).filter(c => !skip || c.x < skip[0] || c.x > skip[1]);
const CROWNS_BACK = crowns(46, 2000, 20, 6);
const CROWNS_FRONT = crowns(64, 2400, 15, 0, [30, 890]);
const ROOFS = [{ x: 960, w: 62, h: 14 }, { x: 1086, w: 54, h: 12 }];

export function AnScene() {
  return <>
    <svg className={s.water} viewBox="0 0 1600 900" preserveAspectRatio="none">
      <g className={s.anTower} style={follow(1)}>
        <path d={`M1052 ${H0 - 24} L1052 ${H0 - 96} L1062 ${H0 - 106} L1072 ${H0 - 96} L1072 ${H0 - 24} Z M1062 ${H0 - 106} L1062 ${H0 - 136}`} />
        <rect x="1057" y={H0 - 84} width="10" height="11" rx="5" />
      </g>
      <g className={s.anRoofs} style={follow(1)}>
        {ROOFS.map((roof, i) => <path key={i} d={`M${roof.x} ${H0} L${roof.x} ${H0 - roof.h} L${roof.x + roof.w / 2} ${H0 - roof.h - 12} L${roof.x + roof.w} ${H0 - roof.h} L${roof.x + roof.w} ${H0} Z`} />)}
      </g>
      <g className={s.anTreesBack} style={follow(1)}>
        {CROWNS_BACK.map((c, i) => <ellipse key={i} cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} rx={c.rx.toFixed(1)} ry={c.ry.toFixed(1)} />)}
      </g>
      <g className={s.anTrees} style={follow(1)}>
        {CROWNS_FRONT.map((c, i) => <ellipse key={i} cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} rx={c.rx.toFixed(1)} ry={c.ry.toFixed(1)} />)}
        <rect x="-20" y={H0 - 5} width="1640" height="6" />
      </g>
      <g className={s.anBridgeMirror} style={follow(1)}>
        <path d={BRIDGE} transform={`translate(0 ${2 * H0}) scale(1 -1)`} />
      </g>
      <River className={s.riverLines} />
      <g className={s.anBridge} style={follow(1)}>
        <path d={BRIDGE} />
        <path className={s.anRail} d={RAIL} />
      </g>
    </svg>
    <div className={s.anSun} />
  </>;
}

/* ------------------------------------------------------------ tonplattor */

/** Solens reflex i band: få och smala, så att seriens ljus på vattnet går att läsa när ljuset står i mitten. */
const BARS = [{ w: 112, gap: 0 }, { w: 80, gap: 10 }, { w: 52, gap: 13 }, { w: 28, gap: 17 }];
const PLATE_LINES = [H0 + 38, H0 + 86, H0 + 150, H0 + 228];

export function PlattorScene() {
  return <>
    <svg className={s.water} viewBox="0 0 1600 900" preserveAspectRatio="none">
      <path className={s.plCityFar} d={FAR_PATH} style={follow(1)} />
      <path className={s.plCity} d={NEAR_PATH} style={follow(1)} />
      <g className={s.plWindows} style={follow(1)}>
        {WINDOWS.filter((_, i) => i % 3 === 0).map((w, i) => <rect key={i} x={w.x.toFixed(1)} y={w.y.toFixed(1)} width={w.w} height={w.h} />)}
      </g>
      <g className={s.plLines}>
        {PLATE_LINES.map((y, i) => <rect key={i} x="0" y={y} width="1600" height={2 + i} style={follow(1 - ((y - H0) / (900 - H0)) ** 1.6)} />)}
      </g>
    </svg>
    <div className={s.plSun} />
    <div className={s.plGlint}>
      {BARS.reduce<{ w: number; top: number }[]>((list, bar) => [...list, { w: bar.w, top: (list.at(-1)?.top ?? 0) + bar.gap + (list.length ? 8 : 0) }], [])
        .map((bar, i) => <i key={i} style={{ width: bar.w, top: bar.top, opacity: (.72 - i * .14).toFixed(2), animationDelay: `${(-i * .7).toFixed(1)}s` }} />)}
    </div>
  </>;
}

/** Världens egna lager ovanpå VatterSkys himmel. Vättern ritas av VatterSky själv. */
export function WorldScenery({ world }: { world: StageWorld }) {
  if (world === "smedja") return <SmedjaScene />;
  if (world === "an") return <AnScene />;
  if (world === "plattor") return <PlattorScene />;
  return null;
}
