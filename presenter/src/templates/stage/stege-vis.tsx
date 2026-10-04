"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { FormProps } from "./forms";
import { SimCanvas, clamp, ease, rng, useMotionLive, useStepClock } from "./sim";
import { createBoatsWorld } from "./sim-boats";
import { FLOOD_TIMING, createFloodWorld } from "./sim-flood";
import { WIND_TRACK, createWindWorld } from "./sim-wind";
import v from "./stege-vis.module.css";

/*
 * Skalstegens visualiseringar (visualiseringspasset 1 oktober 2026), en per exempel och tiopotens
 * (fältet vis<n>): vind, batar, flod, skanning, karta, film, lunga, rulle och molekyler. Varje lager tonar in med sitt steg och ut när
 * världen zoomar vidare. Förloppet spelar inom steget; stilla lägen och granskningen visar slutbilden.
 * Etiketter står i visText<n> (skilda med |) och tal i visData<n>. De ändras i R:s fältpanel, inte
 * direkt i sliden, eftersom en etikett bara är en del av fältets text.
 */

type VisProps = { n: number; on: boolean; still: boolean; t: FormProps["t"] };
const parts = (value: string) => value.split("|").map(part => part.trim());
const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);

/** Ett tal som går från from till to medan klockan passerar start till start + dur. */
function Tally({ from, to, clock, start, dur }: { from: number; to: number; clock: number; start: number; dur: number }) {
  return <>{Math.round(from + (to - from) * ease(prog(clock, start, dur)))}</>;
}

function WindVis({ on, still }: VisProps) {
  const world = useCallback(() => createWindWorld(), []);
  return <div className={v.layer} data-on={on} data-still={still} aria-hidden="true">
    <SimCanvas create={world} step={0} still={still} active={on} className={v.canvas} />
    <svg className={v.full} viewBox="0 0 1600 900">
      <path className={v.windCone} d={WIND_TRACK.cone} />
      <path className={v.windLine} d={WIND_TRACK.line} />
      {WIND_TRACK.days.map(([x, y], i) => <circle key={i} className={v.windDay} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.4" />)}
      <circle className={v.windEye} cx={WIND_TRACK.eye[0].toFixed(1)} cy={WIND_TRACK.eye[1].toFixed(1)} r="6" />
    </svg>
  </div>;
}

function BoatsVis({ on, still }: VisProps) {
  const world = useCallback(() => createBoatsWorld(), []);
  return <div className={v.layer} data-on={on} data-still={still} aria-hidden="true">
    <SimCanvas create={world} step={on ? 1 : 0} still={still} active={on} className={v.canvas} />
  </div>;
}

/** Floderna, med en tidslinje som visar framförhållningen: varningen vid dag 0, vattnet vid dag 5. */
function FloodVis({ n, on, still, t }: VisProps) {
  const world = useCallback(() => createFloodWorld(), []);
  const [warn = "Varning", water = "Vatten", unit = "dygn"] = parts(t(`visText${n}`));
  const T = FLOOD_TIMING;
  return <div className={v.layer} data-on={on} data-still={still}>
    <SimCanvas create={world} step={on ? 1 : 0} still={still} active={on} className={v.canvas} />
    <div className={v.days} style={{ "--warn": `${T.warn}s`, "--water": `${T.water}s`, "--waterFor": `${T.waterFor}s` } as CSSProperties} aria-label={`${warn} 0, ${water} 5 ${unit}`}>
      <i className={v.daysAxis} />
      {[0, 1, 2, 3, 4, 5].map(d => <span key={d} className={v.daysTick} style={{ left: `${d * 20}%` }}>{d}</span>)}
      <span className={v.daysUnit}>{unit}</span>
      <span className={v.daysWarn}><i />{warn}</span>
      <span className={v.daysWater}><i />{water}</span>
    </div>
  </div>;
}

/** Mammografin som isotyp: granskningen krymper och fallen blir fler, en ruta eller prick per procent. */
const SCAN_FADE = (() => {
  const rand = rng(31);
  return Array.from({ length: 100 }, (_, i) => ({ i, r: rand() })).sort((a, b) => a.r - b.r).map(entry => entry.i);
})();

function ScanVis({ n, on, still, t }: VisProps) {
  const clock = useStepClock(on ? 1 : 0, still || !on, 6);
  const [labelA = "Att granska", labelB = "Hittade fall"] = parts(t(`visText${n}`));
  const [a = "100>56", b = "100>129"] = parts(t(`visData${n}`) || "100>56|100>129");
  const [a0, a1] = a.split(">").map(Number), [b0, b1] = b.split(">").map(Number);
  const gone = new Set(SCAN_FADE.slice(0, Math.max(0, Math.min(100, Math.round(a0 - a1)))));
  const order = new Map(SCAN_FADE.map((index, k) => [index, k]));
  const total = Math.max(b0, b1);
  return <div className={v.layer} data-on={on} data-still={still}>
    <div className={v.scan}>
      <p className={v.scanHead}><span>{labelA}</span><b><Tally from={a0} to={a1} clock={clock} start={.9} dur={1.4} /></b></p>
      <ol className={v.scanA} aria-label={`${labelA}: ${a0} till ${a1}`}>
        {Array.from({ length: 100 }, (_, i) => <li key={i} data-gone={gone.has(i) || undefined} style={{ "--d": ((order.get(i) ?? 0) / Math.max(1, gone.size)).toFixed(3) } as CSSProperties} />)}
      </ol>
      <p className={v.scanHead}><span>{labelB}</span><b><Tally from={b0} to={b1} clock={clock} start={2.6} dur={1.2} /></b></p>
      <ol className={v.scanB} aria-label={`${labelB}: ${b0} till ${b1}`}>
        {Array.from({ length: total }, (_, i) => <li key={i} data-new={i >= b0 || undefined} style={{ "--d": ((i - b0) / Math.max(1, total - b0)).toFixed(3) } as CSSProperties} />)}
      </ol>
    </div>
  </div>;
}

/** Mindmappen växer fram nod för nod medan klockan går till 35 minuter. */
const MAP = (() => {
  const rand = rng(41);
  const cx = 1400, cy = 492;
  const nodes: { x: number; y: number; r: number; delay: number; from: [number, number] }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 3 + (rand() - .5) * .3;
    const mx = cx + Math.cos(a) * 96, my = cy + Math.sin(a) * 96 * .9;
    nodes.push({ x: mx, y: my, r: 7, delay: .55 + i * .2, from: [cx, cy] });
    const kids = 2 + Math.floor(rand() * 2);
    for (let k = 0; k < kids; k++) {
      const b = a + (k - (kids - 1) / 2) * .5 + (rand() - .5) * .15;
      nodes.push({ x: mx + Math.cos(b) * 66, y: my + Math.sin(b) * 66 * .9, r: 4.5, delay: 1.7 + (i * 3 + k) * .1, from: [mx, my] });
    }
  }
  return { cx, cy, nodes };
})();

function MapVis({ n, on, still, t }: VisProps) {
  const clock = useStepClock(on ? 1 : 0, still || !on, 6);
  const [unit = "min", hand = "för hand: en vecka"] = parts(t(`visText${n}`));
  const minutes = Number(t(`visData${n}`)) || 35;
  return <div className={v.layer} data-on={on} data-still={still}>
    <p className={v.clock}><b><Tally from={0} to={minutes} clock={clock} start={.3} dur={3.6} /></b><span>{unit}</span><small>{hand}</small></p>
    <svg className={v.full} viewBox="0 0 1600 900" aria-hidden="true">
      {MAP.nodes.map((node, i) => {
        const [fx, fy] = node.from;
        const mx = (fx + node.x) / 2 + (node.y - fy) * .12, my = (fy + node.y) / 2 - (node.x - fx) * .12;
        return <path key={`e${i}`} className={v.mapEdge} d={`M ${fx.toFixed(1)} ${fy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${node.x.toFixed(1)} ${node.y.toFixed(1)}`} pathLength={1} style={{ "--d": `${node.delay - .25}s` } as CSSProperties} />;
      })}
      {MAP.nodes.map((node, i) => <circle key={`n${i}`} className={v.mapNode} cx={node.x.toFixed(1)} cy={node.y.toFixed(1)} r={node.r} style={{ "--d": `${node.delay}s` } as CSSProperties} />)}
      <circle className={v.mapRoot} cx={MAP.cx} cy={MAP.cy} r="11" />
    </svg>
  </div>;
}

/**
 * Filmen (vis=film, 2 oktober 2026): ett stående fönster med Eames-hörn, till exempel en patient som spelar
 * med tanken. Filmen (media<n>) spelas ljudlöst från starten i visData<n> (sekunder) när steget är aktivt,
 * börjar om där och stannar vid byte. Stilla lägen, reducerad rörelse och granskningen visar stillbilden
 * (poster<n>), som också ligger kvar tills filmen spelar. visText<n> = rubrik|källa.
 * Går filmen inte att ladda står stillbilden kvar (3 oktober 2026): i ett decks delade version är Neuralinks
 * film utelämnad, som manuset ber om, och då ska rutan inte bli svart.
 */
function FilmVis({ n, on, still, t }: VisProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const playing = useMotionLive(still) && on && !missing;
  const [label = "", credit = ""] = parts(t(`visText${n}`));
  const src = t(`media${n}`), poster = t(`poster${n}`);
  const start = Math.max(0, Number(t(`visData${n}`)) || 0);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) { video.currentTime = start; video.play().catch(() => { /* stillbilden står kvar */ }); }
    else video.pause();
  }, [playing, start]);
  const again = () => { const video = ref.current; if (video && playing) { video.currentTime = start; video.play().catch(() => {}); } };
  return <div className={v.layer} data-on={on} data-still={still}>
    <figure className={v.film} data-playing={playing}>
      {label && <figcaption className={v.filmLabel}>{label}</figcaption>}
      {src && !missing && <video ref={ref} src={src} muted playsInline preload={on ? "auto" : "metadata"} onEnded={again} onError={() => setMissing(true)} aria-label={t(`alt${n}`) || label} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- stillbilden ligger i public/ och ska inte optimeras om */}
      {poster && <img className={v.filmPoster} src={poster} alt="" draggable={false} />}
      <i /><i /><i /><i />
      {credit && <p className={v.filmCredit}>{credit}</p>}
    </figure>
  </div>;
}

/**
 * Lungan (vis=lunga, 2 oktober 2026): två staplar från en nollinje, läkemedlet uppåt och placebo nedåt, med
 * talen i milliliter. visData<n> = läkemedlet|placebo (98|-20), visText<n> = rubrik|läkemedlet|placebo.
 * Exemplet: rentosertib i fas 2 (Nature Medicine 2025), lungkapaciteten efter 12 veckor.
 */
function LungVis({ n, on, still, t }: VisProps) {
  const clock = useStepClock(on ? 1 : 0, still || !on, 6);
  const [title = "Lungkapacitet", drugLabel = "Läkemedlet", placeboLabel = "Placebo"] = parts(t(`visText${n}`));
  const [drug = 98, placebo = -20] = parts(t(`visData${n}`) || "98|-20").map(Number);
  // Nollinjen står en bit ned, så att stapelns tal aldrig når rubriken ovanför.
  const zero = 540, scale = 170 / Math.max(1, Math.abs(drug), Math.abs(placebo));
  const grow = (start: number) => ease(prog(clock, start, 1.1));
  const signed = (value: number, start: number) => {
    const shown = Math.round(value * ease(prog(clock, start, 1.1)));
    return `${shown > 0 ? "+" : shown < 0 ? "−" : ""}${Math.abs(shown)}`;
  };
  const bars = [
    { key: "drug", label: drugLabel, value: drug, x: 1290, start: .5 },
    { key: "placebo", label: placeboLabel, value: placebo, x: 1430, start: 1.2 },
  ];
  return <div className={v.layer} data-on={on} data-still={still}>
    <p className={v.lungTitle}>{title}</p>
    <svg className={v.full} viewBox="0 0 1600 900" aria-label={`${title}: ${drugLabel} ${drug} ml, ${placeboLabel} ${placebo} ml`}>
      <path className={v.lungZero} d={`M 1252 ${zero} H 1550`} />
      <text className={v.lungZeroLabel} x="1252" y={zero - 10}>0 ml</text>
      {bars.map(bar => {
        const h = Math.abs(bar.value) * scale * grow(bar.start);
        const up = bar.value >= 0;
        return <g key={bar.key} data-role={bar.key}>
          <rect className={v.lungBar} x={bar.x} y={up ? zero - h : zero} width="80" height={Math.max(0, h)} />
          <text className={v.lungValue} x={bar.x + 40} y={up ? zero - Math.abs(bar.value) * scale - 16 : zero + Math.abs(bar.value) * scale + 40} textAnchor="middle">{signed(bar.value, bar.start)}<tspan className={v.lungUnit}> ml</tspan></text>
          <text className={v.lungLabel} x={bar.x + 40} y={up ? zero + 30 : zero - 14} textAnchor="middle">{bar.label}</text>
        </g>;
      })}
    </svg>
  </div>;
}

/**
 * Rullen (vis=rulle, 2 oktober 2026): en förkolnad papyrusrulle rullas upp inne i datorn. Röntgensnittet
 * (poster<n>) tonar in, ett varv spåras i AI:s färg och rullas upp till en rak remsa, yttersta varvet först.
 * Sidan öppnas och ett svep gör bläcket synligt. Med en bild av den utrullade texten (media<n>, vita
 * bokstäver med genomskinlighet) syns rullens riktiga text i AI:s färg och glider sakta förbi; utan bild
 * ritas grekiska bokstäver som illustration. visText<n> = rullen|utrullad|kolumner|märkning eller källa,
 * visData<n> = antalet kolumner (22).
 */
const SCROLL = (() => {
  const cx = 1400, cy = 326, turns = 5.5, inner = 8, outer = 84, squash = .74, count = 220;
  const points: { sx: number; sy: number; s: number }[] = [];
  let length = 0, prev: [number, number] | null = null;
  for (let i = 0; i <= count; i++) {
    const a = i / count * turns * Math.PI * 2;
    const r = inner + (outer - inner) * (i / count);
    const x = cx + Math.cos(a) * r * squash, y = cy + Math.sin(a) * r;
    if (prev) length += Math.hypot(x - prev[0], y - prev[1]);
    points.push({ sx: x, sy: y, s: length });
    prev = [x, y];
  }
  const rand = rng(79);
  const greek = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";
  const letters: { x: number; y: number; ch: string; d: number }[] = [];
  for (let col = 0; col < 3; col++) for (let line = 0; line < 10; line++) for (let k = 0; k < 6; k++) {
    if (rand() < .12) continue;
    const x = 1262 + col * 100 + k * 13.5, y = 514 + line * 22.5;
    letters.push({ x, y, ch: greek[Math.floor(rand() * greek.length)], d: (x - 1252) / 300 });
  }
  return { points, length, letters, line: { x0: 1252, x1: 1552, y: 470 }, page: { y0: 470, y1: 732 } };
})();

function ScrollVis({ n, on, still, t }: VisProps) {
  const clock = useStepClock(on ? 1 : 0, still || !on, 7);
  const [rolled = "Rullen, röntgad", flat = "Utrullad i datorn", unit = "kolumner grekiska", mark = "bokstäverna är en illustration"] = parts(t(`visText${n}`));
  const columns = Number(t(`visData${n}`)) || 22;
  const strip = t(`media${n}`), ct = t(`poster${n}`);
  const ctIn = ease(prog(clock, 0, .6));
  const draw = ease(prog(clock, .6, .8));
  const unroll = prog(clock, 1.5, 1.5);
  const open = ease(prog(clock, 3, .6));
  const sweep = prog(clock, 3.8, 1.6);
  const { points, length, letters, line, page } = SCROLL;
  // Det yttersta varvet släpper först och det innersta sist, som när en rulle vecklas ut.
  const path = points.map(({ sx, sy, s }, i) => {
    const f = s / length;
    const u = ease(clamp((unroll - (1 - f) * .45) / .55));
    const x = sx + (line.x0 + (line.x1 - line.x0) * f - sx) * u, y = sy + (line.y - sy) * u;
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const ghost = points.map(({ sx, sy }, i) => `${i ? "L" : "M"} ${sx.toFixed(1)} ${sy.toFixed(1)}`).join(" ");
  const sweepX = line.x0 + (line.x1 - line.x0) * sweep;
  return <div className={v.layer} data-on={on} data-still={still}>
    <p className={v.scrollLabel} style={{ top: 206 }}>{rolled}</p>
    {/* eslint-disable-next-line @next/next/no-img-element -- röntgenbilden ligger i public/ */}
    {ct && <img className={v.scrollCt} src={ct} alt="" draggable={false} style={{ opacity: ctIn * (1 - .5 * ease(prog(clock, 1.6, .9))) }} />}
    <svg className={v.full} viewBox="0 0 1600 900" aria-label={`${rolled} → ${flat}: ${columns} ${unit}`}>
      {!ct && <path className={v.scrollGhost} d={ghost} style={{ opacity: .22 * ease(prog(clock, 2.6, .8)) }} />}
      <path className={v.scrollPath} d={path} pathLength={1} style={{ strokeDashoffset: 1 - draw }} />
      {!strip && <rect className={v.scrollPage} x={line.x0} y={page.y0} width={line.x1 - line.x0} height={(page.y1 - page.y0) * open} />}
      {!strip && open > .99 && letters.map((letter, i) => <text key={i} className={v.scrollInk} x={letter.x} y={letter.y} style={{ opacity: clamp((sweep - letter.d) * 8) }}>{letter.ch}</text>)}
    </svg>
    {strip && <div className={v.scrollSheet} style={{ height: (page.y1 - page.y0) * open, visibility: open > .01 ? "visible" : "hidden" }}>
      <div className={v.scrollText} style={{ "--strip": `url("${strip}")`, clipPath: `inset(0 ${((1 - sweep) * 100).toFixed(2)}% 0 0)` } as CSSProperties} />
    </div>}
    <svg className={v.full} viewBox="0 0 1600 900" aria-hidden="true">
      {sweep > 0 && sweep < 1 && <path className={v.scrollSweep} d={`M ${sweepX.toFixed(1)} ${page.y0} V ${page.y1}`} />}
    </svg>
    <p className={v.scrollCount} style={{ opacity: open }}><b><Tally from={0} to={columns} clock={clock} start={3.8} dur={1.6} /></b><span>{unit}</span></p>
    <p className={v.scrollLabel} style={{ top: 440, opacity: open }}>{flat}</p>
    <p className={v.scrollMark} style={{ opacity: open }}>{mark}</p>
  </div>;
}

/**
 * Molekylerna (vis=molekyler, 2 oktober 2026): hundra nya molekyler ritas in i ett rutnät, de som dödade
 * bakterier tänds i AI:s färg och de som blev bättre än förlagan får människans färg. visData<n> =
 * nya|verksamma|bättre (100|86|72), visText<n> = tre etiketter. En ruta per molekyl; formen är en
 * illustration av en kedja, inte den verkliga molekylen.
 */
const MOLECULES = (() => {
  const rand = rng(53);
  const order = Array.from({ length: 100 }, (_, i) => ({ i, r: rand() })).sort((a, b) => a.r - b.r).map(entry => entry.i);
  // Fyra kulor i en kedja, lite olika för varje molekyl: varje ny form är en omskrivning av förlagan.
  const shapes = Array.from({ length: 100 }, () => Array.from({ length: 4 }, (_, k) => [3 + k * 5.4, 10 + (k % 2 ? -1 : 1) * (2.5 + rand() * 3.5)]));
  return { order, shapes };
})();

function MoleculeVis({ n, on, still, t }: VisProps) {
  const clock = useStepClock(on ? 1 : 0, still || !on, 6);
  const [labelAll = "Nya molekyler", labelActive = "Dödade bakterier", labelBetter = "Bättre än förlagan"] = parts(t(`visText${n}`));
  const [all, active, better] = parts(t(`visData${n}`) || "100|86|72").map(Number);
  const total = Math.max(1, Math.min(100, all || 100));
  const rank = new Map(MOLECULES.order.map((index, k) => [index, k]));
  const roleOf = (i: number) => { const k = rank.get(i) ?? 0; return k < (better || 0) ? "better" : k < (active || 0) ? "active" : "tested"; };
  return <div className={v.layer} data-on={on} data-still={still}>
    <div className={v.mol}>
      <p className={v.scanHead}><span>{labelAll}</span><b><Tally from={0} to={total} clock={clock} start={.2} dur={1.4} /></b></p>
      <ol className={v.molGrid} aria-label={`${labelAll}: ${total}, ${labelActive}: ${active}, ${labelBetter}: ${better}`}>
        {Array.from({ length: total }, (_, i) => <li key={i} data-role={roleOf(i)} style={{ "--a": (i / total).toFixed(3), "--d": ((rank.get(i) ?? 0) / total).toFixed(3) } as CSSProperties}>
          <svg viewBox="0 0 24 20" aria-hidden="true">
            <polyline points={MOLECULES.shapes[i].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} />
            {MOLECULES.shapes[i].map(([x, y], k) => <circle key={k} cx={x.toFixed(1)} cy={y.toFixed(1)} r={k === 0 ? 2.6 : 2.1} />)}
          </svg>
        </li>)}
      </ol>
      <p className={v.molKey} data-role="active"><i /><span>{labelActive}</span><b><Tally from={0} to={active || 0} clock={clock} start={1.9} dur={1.1} /></b></p>
      <p className={v.molKey} data-role="better"><i /><span>{labelBetter}</span><b><Tally from={0} to={better || 0} clock={clock} start={3.2} dur={.9} /></b></p>
    </div>
  </div>;
}

export const STEGE_VIS: Record<string, (props: VisProps) => ReactNode> = { vind: WindVis, batar: BoatsVis, flod: FloodVis, skanning: ScanVis, karta: MapVis, film: FilmVis, lunga: LungVis, rulle: ScrollVis, molekyler: MoleculeVis };
