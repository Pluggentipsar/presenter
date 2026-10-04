"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from "react";
import { HorizonWave } from "../_decorations/HorizonWave";
import type { StageLayout } from "./stage-forms";
import { WorldContext } from "./world-store";
import { H0, follow, seeded } from "./sky-math";
import { STAGE_WORLDS, WorldScenery, type StageWorld } from "./worlds";
import { getTheme } from "@/themes";
import s from "./stage.module.css";

export { seeded };

export type Tone = "dark" | "light";

/* ------------------------------------------------------------------ guider */

let guideOverride: boolean | null = null;
const guideListeners = new Set<() => void>();
const subscribeGuides = (callback: () => void) => { guideListeners.add(callback); return () => { guideListeners.delete(callback); }; };
const guideSnapshot = () => guideOverride ?? new URLSearchParams(window.location.search).get("studio") === "1";

/** G visar platsen för Joel och marginalen för textning. Syns aldrig i en ren inspelning. */
export function StageGuides({ layout }: { layout: StageLayout }) {
  const visible = useSyncExternalStore(subscribeGuides, guideSnapshot, () => false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, [contenteditable=true]") || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() !== "g") return;
      guideOverride = !guideSnapshot();
      guideListeners.forEach(listener => listener());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!visible) return null;
  return <div className={s.guides} aria-label="Förhandsvisningsguider, dölj med G">
    {layout === "talare" || layout === "horn"
      ? <div className={layout === "horn" ? `${s.guidePerson} ${s.guideCorner}` : s.guidePerson}><svg viewBox="0 0 400 850" preserveAspectRatio="xMidYMax meet" aria-hidden><ellipse cx="200" cy="135" rx="79" ry="100" /><path d="M87 256 Q200 211 313 256 L363 447 L340 850 H60 L37 447 Z" /></svg><span>{layout === "horn" ? "Talare · liten i hörnet" : "Talare · greenscreen"}</span></div>
      : <div className={s.guideFull}>Helbild · voice-over</div>}
    <div className={s.guideSafe}><span>Marginal för textning och bård · G döljer guider</span></div>
  </div>;
}

/* ------------------------------------------------------------ Vätterljus */

/** Läser scenens verkliga bakgrund, så att T till ett ljust tema ger ett ljust horisontljus. */
export function useTone(ref: RefObject<HTMLElement | null>): Tone {
  const [tone, setTone] = useState<Tone>("dark");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Under Vätterresan är scenen genomskinlig (sjön ligger bakom); då läser en sond temats grund.
    const probe = element.querySelector<HTMLElement>(":scope > [data-tone-probe]") ?? element;
    const update = () => {
      const rgb = getComputedStyle(probe).backgroundColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (rgb?.length === 3) setTone(rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > 140 ? "light" : "dark");
    };
    update();
    const observer = new MutationObserver(update);
    for (let node: HTMLElement | null = element; node; node = node.parentElement) {
      observer.observe(node, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    }
    return () => observer.disconnect();
  }, [ref]);
  return tone;
}

/** Världen som ett tema väljer (stageWorld). Utan den: Vättern. */
export function worldOfTheme(name: string | null | undefined): StageWorld {
  const world = name ? getTheme(name).stageWorld : undefined;
  return world && STAGE_WORLDS.includes(world) ? world : "vattern";
}

/**
 * Världen följer temat. Spelaren skickar den med (`fixed`, efter T); annars läses
 * närmaste data-theme, som R-editorn, /scen och miniatyrerna sätter. Läses före
 * första bildrutan och igen när T byter tema.
 */
export function useStageWorld(ref: RefObject<HTMLElement | null>, fixed?: StageWorld): StageWorld {
  const [world, setWorld] = useState<StageWorld>(fixed ?? "vattern");
  useLayoutEffect(() => {
    if (fixed) return;
    const root = ref.current?.closest<HTMLElement>("[data-theme]");
    if (!root) return;
    const update = () => setWorld(worldOfTheme(root.getAttribute("data-theme")));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [ref, fixed]);
  return fixed ?? world;
}

/**
 * Horisonten över Vättern: himmel, ljuslinje, västra strandens kontur med
 * stadens ljus, vatten med konturer. Alla färger kommer från temats roller.
 *
 * Under Vätterresan (world-store.ts) ritar spelaren sjön en gång utanför
 * slidebytet; då rapporterar scenen bara horisont och vatten och ritar inget.
 */
export function Vatterljus({ horizon, still }: { horizon: number; still: boolean }) {
  const world = useContext(WorldContext);
  useLayoutEffect(() => { world?.report({ horizon, flow: !still }); }, [world, horizon, still]);
  if (world) return null;
  return <VatterSky horizon={horizon} still={still} />;
}

/**
 * Själva sjön. Varje del är ritad mot referenshorisonten och förskjuts med
 * --hz2-h, så att horisonten kan glida mellan två höjder (Vätterresan).
 * Vid samma höjd blir bilden densamma som förut. `paused` fryser vattnet där
 * det är i stället för att nollställa det, så att inget hoppar mellan slides.
 * Gryningen läses ur --hz2-dawn (0–1) på scenen; `pulse` spelar kapitelljuset
 * en gång per nytt värde.
 *
 * Temat väljer världen (stageWorld, worlds.tsx). Himlen, skenet, reflexen, kornet
 * och vinjetten är gemensamma och färgas per värld i stage.module.css
 * (`.sky[data-stage-world]`); stranden, stjärnorna och stadens ljus är Vätterns egna.
 */
export function VatterSky({ horizon, still, paused = false, pulse = 0, world: fixed }: { horizon: number; still: boolean; paused?: boolean; pulse?: number; world?: StageWorld }) {
  const root = useRef<HTMLDivElement>(null);
  const world = useStageWorld(root, fixed);
  const h = H0;
  const contours = Array.from({ length: 12 }, (_, i) => {
    const depth = (i + 1) / 12;
    const y = h + 5 + (900 - h) * depth ** 1.7;
    const a = 1 + depth * 7;
    return { d: `M-80 ${y.toFixed(1)} C 240 ${(y - a).toFixed(1)} 540 ${(y + a).toFixed(1)} 800 ${y.toFixed(1)} S 1360 ${(y - a).toFixed(1)} 1680 ${y.toFixed(1)}`, depth, k: 1 - depth ** 1.7 };
  });
  const shore = (x: number) => h - 52 * Math.exp(-((x / 520) ** 2)) - 10 * Math.exp(-(((x - 300) / 140) ** 2)) + 2;
  const shorePath = `M0 ${h + 1} L0 ${shore(0).toFixed(1)} ${Array.from({ length: 36 }, (_, i) => { const x = (i + 1) * 26; return `L${x} ${Math.min(h, shore(x)).toFixed(1)}`; }).join(" ")} L940 ${h + 1} Z`;
  const lights = Array.from({ length: 34 }, (_, i) => {
    const town = i < 20;
    const x = town ? 20 + seeded(i) * 640 : 700 + seeded(i) * 860;
    const top = town ? Math.min(h - 2, shore(x) + 3) : h - 2;
    const y = town ? top + seeded(i + 40) * (h - 1 - top) : h - 1.2 - seeded(i + 40) * 1.8;
    return { x: x.toFixed(1), y: y.toFixed(1), r: (.7 + seeded(i + 80) * (town ? 1.3 : .8)).toFixed(2), o: (.4 + seeded(i + 120) * .6).toFixed(2) };
  });
  const stars = Array.from({ length: 18 }, (_, i) => ({ x: (40 + seeded(i + 200) * 1520).toFixed(1), y: (26 + seeded(i + 260) * h * .58).toFixed(1), r: (.5 + seeded(i + 320) * .8).toFixed(2), k: seeded(i + 260) * .58 }));
  return <div ref={root} className={s.sky} data-stage-world={world} data-still={still} data-paused={paused || undefined} style={{ "--hz2-h": `${horizon * 900}px` } as CSSProperties} aria-hidden="true">
    <div className={s.skyFill} />
    <div className={s.dawn} />
    <div className={s.bloom} />
    {pulse > 0 && <i key={pulse} className={s.pulse} />}
    {world === "vattern" ? <svg className={s.water} viewBox="0 0 1600 900" preserveAspectRatio="none">
      <g className={s.stars}>{stars.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r} style={follow(star.k, `${-i * .9}s`)} />)}</g>
      <path className={s.shore} d={shorePath} style={follow(1)} />
      <g className={s.contours}>{contours.map((line, i) => <path key={i} d={line.d} strokeOpacity={(.21 - line.depth * .15).toFixed(3)} strokeWidth={(.8 + line.depth * .8).toFixed(2)} style={follow(line.k, `${-i * 1.3}s`)} />)}</g>
      <g className={s.lights}>{lights.map((light, i) => <circle key={i} cx={light.x} cy={light.y} r={light.r} opacity={light.o} style={follow(1, `${-i * .63}s`)} />)}</g>
    </svg> : <WorldScenery world={world} />}
    <div className={s.reflection} />
    <div className={s.horizonLine} />
    <div className={s.grain} />
    <div className={s.vignette} />
  </div>;
}

/* ---------------------------------------------------------- pusslet */

/**
 * En pusselbit med flikar, ritad medurs. Varje kant: 0 rak, 1 flik ut, -1 flik in.
 * Kanten beskrivs längs sin egen riktning (u) och utåtnormal (v).
 */
export function piecePath(w: number, h: number, [top, right, bottom, left]: number[]) {
  const corners: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
  const normals: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const dirs = [top, right, bottom, left];
  const pt = (from: [number, number], dir: [number, number], normal: [number, number], u: number, v: number) => `${(from[0] + dir[0] * u + normal[0] * v).toFixed(1)} ${(from[1] + dir[1] * u + normal[1] * v).toFixed(1)}`;
  let d = `M 0 0`;
  corners.forEach((from, k) => {
    const to = corners[(k + 1) % 4];
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const dir: [number, number] = [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
    const knob = dirs[k];
    if (!knob) { d += ` L ${to[0]} ${to[1]}`; return; }
    const p = (u: number, v: number) => pt(from, dir, normals[k], u * len, v * len * knob);
    d += ` L ${p(.37, 0)} C ${p(.41, 0)} ${p(.33, .17)} ${p(.4, .25)} C ${p(.46, .33)} ${p(.54, .33)} ${p(.6, .25)} C ${p(.67, .17)} ${p(.59, 0)} ${p(.63, 0)} L ${to[0]} ${to[1]}`;
  });
  return `${d} Z`;
}

export const PIECE_W = 190, PIECE_H = 150;

/** Kanterna i pusslet (tre gånger två bitar): rad 0:s underkant per kolumn, och högerkant per rad och kolumn. */
export function puzzleEdges() {
  const below = [1, -1, 1];
  const beside = [[1, -1], [-1, 1]];
  const edgeOf = (r: number, c: number) => [
    r === 0 ? 0 : -below[c],
    c === 2 ? 0 : beside[r][c],
    r === 1 ? 0 : below[c],
    c === 0 ? 0 : -beside[r][c - 1],
  ];
  return [0, 1].map(r => [0, 1, 2].map(c => edgeOf(r, c)));
}

/**
 * Samma pussel som i pusselformen, med den lediga platsen men utan AI-biten:
 * filmens fråga på titelrutan (fältet puzzle). Slutet av filmen besvarar den.
 */
export function PuzzleGhost({ still }: { still: boolean }) {
  const edges = puzzleEdges();
  return <svg className={s.puzzleGhost} data-still={still} viewBox="-30 -30 640 380" aria-hidden="true">
    {edges.map((row, ri) => row.map((edge, ci) => <path key={`${ri}-${ci}`} className={ri === 0 && ci === 1 ? s.ghostSlot : s.ghostPiece}
      d={piecePath(PIECE_W, PIECE_H, edge)} transform={`translate(${ci * PIECE_W} ${ri * PIECE_H})`} style={{ "--p": ri * 3 + ci } as CSSProperties} />))}
  </svg>;
}

/* ------------------------------------------------ fyra ljus på vattnet */

/** Seriens läge ur fälten film (den här filmen), films (antal, standard 4) och next (slutskylt). */
export function seriesOf(t: (key: string) => string) {
  const num = (key: string) => Math.max(0, Math.round(Number(t(key).replace(",", ".")) || 0));
  const film = num("film");
  const films = Math.min(8, num("films") || (film ? 4 : 0));
  return { film: Math.min(film, films), films, next: Math.min(num("next"), films) };
}

/**
 * Fyra ljus på vattnet, ett per film: seriens signatur i titlar, slutskyltar och
 * eftertexten. Tidigare filmer glöder lugnt, den aktuella lyser och kommande
 * väntar som en ring. Med `next` glider ljuset längs vattnet till nästa film.
 * Utan `film` lyser alla lugnt (serien är klar); `fifth` tänder ett ljus till,
 * närmare. Stilla lägen och reducerad rörelse visar slutläget direkt.
 */
export function SeriesLights({ film = 0, films, next = 0, fifth, horizonY, still }: { film?: number; films: number; next?: number; fifth?: boolean; horizonY: number; still: boolean }) {
  // Till höger om textspalten och talarens titel, på väg mot ljuset bakom Joel: x 740–1010.
  const xs = Array.from({ length: films }, (_, i) => Math.round(740 + i * (films > 1 ? 270 / (films - 1) : 0)));
  const stateOf = (n: number) => !film || n < film ? "past" : n === film ? (next ? "leaving" : "current") : n === next ? "arriving" : "future";
  return <div className={s.series} data-still={still} style={{ "--sy": `${Math.round(horizonY + 46)}px` } as CSSProperties}
    role="img" aria-label={film ? `Film ${film} av ${films}` : `${films} filmer`}>
    {xs.map((x, i) => <span key={i} className={s.seriesLight} data-state={stateOf(i + 1)} style={{ "--x": `${x}px`, "--i": i, "--series-color": `var(--series-${i + 1})` } as CSSProperties}>
      <b>{i + 1}</b><u /><i /><em />
    </span>)}
    {film > 0 && next > 0 && <i className={s.seriesTravel} style={{ "--from": `${xs[film - 1]}px`, "--to": `${xs[next - 1]}px` } as CSSProperties} />}
    {fifth !== undefined && <span className={s.seriesFifth} data-on={fifth} style={{ "--x": "875px" } as CSSProperties}><i /><em /></span>}
  </div>;
}

/** Den rörliga vågen: Vättern + AI i högra halvan, temats ljus över ytan. */
export function WaveBackdrop({ shared, still }: { shared: boolean; still: boolean }) {
  return <div className={s.waveBackdrop} aria-hidden="true">
    <div className={s.waveSky} />
    <HorizonWave mode={shared ? "shared" : "water"} paused={still} />
    <div className={s.grain} />
    <div className={s.vignette} />
  </div>;
}

/** Ett foto som bakgrund, med temats skugga där texten ska läsas. */
export function PhotoBackdrop({ src, alt, dim }: { src: string; alt: string; dim: boolean }) {
  return <>
    <div className={s.busFilm}><img src={src} alt={alt} /></div>
    <div className={s.busShade} data-step={dim ? 1 : 0} />
  </>;
}

/* ---------------------------------------------------------------- text */

export function Marked({ text, mark, className }: { text: string; mark: string; className: string }) {
  const at = mark ? text.indexOf(mark) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark className={className}>{mark}</mark>{text.slice(at + mark.length)}</>;
}

/** Rader som slutar med kolon blir rubriker, • blir punkter. */
export function Document({ text, className = s.docBody }: { text: string; className?: string }) {
  const rows = text.split("\n").map(row => row.trim()).filter(Boolean);
  return <div className={className}>{rows.map((row, i) => row.endsWith(":")
    ? <h4 key={i}>{row.slice(0, -1)}</h4>
    : row.startsWith("•") ? <p key={i} className={s.docBullet}>{row.replace(/^•\s*/, "")}</p> : <p key={i}>{row}</p>)}</div>;
}

/* ------------------------------------------------------ ord som rör sig */

/**
 * Ord som gör det de betyder: play="svårare:skaka|öppnar:oppna" gäller all
 * text på sliden. Ordet måste stå ordagrant. Rörelsen spelas en gång när
 * texten syns; bakåt, R och reducerad rörelse visar slutläget direkt.
 */
export type Play = { word: string; effect: string };
export const PlayContext = createContext<Play[]>([]);
export const PLAY_EFFECTS = ["vax", "krymp", "glid", "lyft", "sjunk", "skaka", "oppna", "stang", "samlas", "bygg", "tand", "blekna", "flimmer", "vand", "stryk", "bro"] as const;
const LETTERWISE = new Set(["bygg", "samlas", "oppna", "stang"]);

export function parsePlay(value: string): Play[] {
  return value.split("|").map(part => part.trim()).filter(Boolean).map(part => {
    const at = part.lastIndexOf(":");
    return at > 0 ? { word: part.slice(0, at).trim(), effect: part.slice(at + 1).trim().toLowerCase() } : { word: part, effect: "vax" };
  }).filter(play => play.word && (PLAY_EFFECTS as readonly string[]).includes(play.effect));
}

function PlayWord({ word, effect }: Play) {
  // Stryk på ≠: först ett likhetstecken, sedan dras strecket som gör det till ett olikhetstecken.
  if (effect === "stryk" && word.startsWith("≠")) return <span className={s.play} data-play="stryk" data-sign="">
    <span className={s.srOnly}>{word}</span><span aria-hidden="true">={word.slice(1)}</span>
  </span>;
  if (!LETTERWISE.has(effect)) return <span className={s.play} data-play={effect}>{word}</span>;
  const letters = [...word];
  return <span className={s.play} data-play={effect} style={{ "--n": letters.length } as CSSProperties}>
    <span className={s.srOnly}>{word}</span>
    <span aria-hidden="true">{letters.map((letter, i) => <span key={i} className={s.playLetter} style={{ "--l": i } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}</span>
  </span>;
}

function highlight(line: string, marks: string[], markClass: string, plays: Play[] = []): ReactNode {
  const hits = [
    ...marks.map(text => ({ text, play: plays.find(play => play.word === text), mark: true, at: line.indexOf(text) })),
    ...plays.map(play => ({ text: play.word, play, mark: false, at: line.indexOf(play.word) })),
  ].filter(hit => hit.at >= 0).sort((a, b) => a.at - b.at || Number(b.mark) - Number(a.mark) || b.text.length - a.text.length);
  const found = hits[0];
  if (!found) return line;
  // Skiljetecken direkt efter ett rörligt ord följer med ordet, så att raden aldrig bryts före kommat.
  const tail = found.play && !found.mark ? line.slice(found.at + found.text.length).match(/^[,.;:!?…»”)]+/)?.[0] ?? "" : "";
  const word = found.play ? <PlayWord word={found.text + tail} effect={found.play.effect} /> : found.text;
  return <>{line.slice(0, found.at)}{found.mark ? <mark className={markClass}>{word}</mark> : word}{highlight(line.slice(found.at + found.text.length + tail.length), marks, markClass, plays)}</>;
}

/**
 * Flerradigt fält. Ny rad bryter; en rad som börjar med ~ får den mjukare
 * färgen. Ord i emphasis (skilj med |) får ljusmarkering.
 */
export function RichLines({ text, emphasis = "", className, markClass = s.glowMark }: { text: string; emphasis?: string; className?: string; markClass?: string }) {
  const plays = useContext(PlayContext);
  const marks = emphasis.split("|").map(mark => mark.trim()).filter(Boolean);
  return <span className={className}>{text.split("\n").map((raw, i) => {
    const soft = raw.startsWith("~");
    const line = soft ? raw.replace(/^~\s?/, "") : raw;
    return <span key={i} className={soft ? s.softLine : s.line}>{line ? highlight(line, marks, markClass, plays) : " "}</span>;
  })}</span>;
}

/* --------------------------------------------------------------- media */

const kindOf = (src: string, kind?: string) => kind || (/\.(mp4|webm|mov)$/i.test(src) ? "video" : /\.(m4a|mp3|wav|ogg)$/i.test(src) ? "audio" : src ? "image" : "placeholder");

/**
 * Bild, film, ljud eller ett dokument på papper. Film och ljud spelar bara när
 * scenen står på sitt klick. Film är tyst om inte `sound` är satt.
 */
export function MediaFrame({ src, kind, alt, caption, active, still, className, doc, sound = false }: { src: string; kind?: string; alt: string; caption?: ReactNode; active: boolean; still: boolean; className?: string; doc?: ReactNode; sound?: boolean }) {
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const type = doc ? "doc" : kindOf(src, kind);
  useEffect(() => {
    const player = media.current;
    if (!player) return;
    if (active && !still) { player.currentTime = 0; void player.play().catch(() => {}); }
    else player.pause();
  }, [active, still]);
  return <figure className={`${s.mediaFrame} ${className ?? ""}`} data-kind={type}>
    {type === "image" && <img src={src} alt={alt} />}
    {type === "doc" && <div className={s.mediaDoc}>{doc}</div>}
    {type === "video" && <video ref={media} src={src} muted={!sound} playsInline preload="metadata" aria-label={alt} />}
    {type === "audio" && <div className={s.audioCard}><div className={s.audioWave} aria-hidden="true">{Array.from({ length: 44 }, (_, i) => <i key={i} style={{ height: `${Math.round(18 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .31)) * 82)}%`, animationDelay: `${(-i * .08).toFixed(2)}s` }} />)}</div><audio ref={media} src={src} preload="metadata" aria-label={alt} /></div>}
    {type === "placeholder" && <div className={s.placeholder}><span>Kommer</span><strong>{alt}</strong></div>}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
