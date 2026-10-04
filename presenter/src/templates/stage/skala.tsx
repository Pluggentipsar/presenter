"use client";

/* eslint-disable @next/next/no-img-element */
import { useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { RichLines, useTone } from "./kit";
import { Kicker, type FormProps } from "./forms";
import { WorldContext, type WorldStore } from "./world-store";
import { PlanetGL } from "./planet-gl";
import s from "./stage.module.css";
import k from "./skala.module.css";

/**
 * Tiopotenser · världen som zoomar (Rädda världen med AI, 30 september 2026).
 *
 * Efter Charles och Ray Eames Powers of Ten (1977): kameran tittar rakt ned och
 * bildytan är 10^n meter bred. Varje slide har `skala=` (exponenten, per steg
 * med komma) och `vy=` (full, dov, mork). I ett deck med resa ritar spelaren
 * världen en gång bakom slidebytet (SlideViewer → SkalaWorld), och kameran glider
 * i exponent, jämnt per tiopotens. Nästa nivå växer ur mitten med mjuka kanter.
 * Skalmätaren nere till vänster visar 10ⁿ m och platsen; formen `zoom` gör den
 * stor som kapitelrubrik. Bakåt, R och reducerad rörelse hoppar direkt.
 * Utan värld (R, /scen, miniatyrer) ritar scenen sin nivå själv.
 *
 * Bilderna är genererade lokalt (Z-Image-Turbo, prompter i
 * public/bilder/skala/_prompter.md) och föreställer inga riktiga platser;
 * därför är etiketterna obestämda (En stad, inte ett ortnamn).
 */

/**
 * En nivå: bilden är 10^p meter bred. `focus` är mitten av nästa nivå inåt i den
 * här bilden (andelar av bredd och höjd); där sitter nästa bild, en tiondel stor.
 */
export type SkalaLevel = { p: number; label: string; src: string; alt: string; focus: [number, number] };

const DIR = "/bilder/skala";

/** Nivåerna, från den största till den minsta. En tom etikett är en genomfart. */
export const SKALA_LEVELS: SkalaLevel[] = [
  { p: 7, label: "En planet", src: `${DIR}/skala-p7.webp`, alt: "Jorden från rymden", focus: [.706, .192] },
  { p: 6, label: "", src: `${DIR}/skala-p6.webp`, alt: "En halvö och ett hav från omloppsbana", focus: [.36, .66] },
  { p: 5, label: "", src: `${DIR}/skala-p5.webp`, alt: "Ett landskap med en lång sjö, uppifrån", focus: [.49, .9] },
  { p: 4, label: "En stad", src: `${DIR}/skala-p4.webp`, alt: "En stad vid en sjö, rakt uppifrån", focus: [.55, .72] },
  { p: 3, label: "", src: `${DIR}/skala-p3.webp`, alt: "Ett kvarter med träd, uppifrån", focus: [.5, .5] },
  { p: 2, label: "En skola", src: `${DIR}/skala-p2.webp`, alt: "En skola med skolgård, uppifrån", focus: [.49, .47] },
  { p: 1, label: "", src: `${DIR}/skala-p1.webp`, alt: "Ett arbetsbord i en ateljé, uppifrån", focus: [.48, .55] },
  { p: 0, label: "Ett bord", src: `${DIR}/skala-p0.webp`, alt: "Ett köksbord med en telefon i mitten", focus: [.51, .6] },
  { p: -1, label: "En skärm", src: `${DIR}/skala-m1.webp`, alt: "En telefon med en tom duk", focus: [.61, .52] },
  { p: -2, label: "En duk", src: `${DIR}/skala-m2.webp`, alt: "Skärmens bildpunkter i närbild", focus: [.5, .5] },
];
const MAX_P = SKALA_LEVELS[0].p;
const MIN_P = SKALA_LEVELS[SKALA_LEVELS.length - 1].p;
/**
 * Skalmätaren kan gå djupare än världens bilder (skalstegens molekyl, 2 oktober 2026): under 10⁻² står
 * världen kvar på sin minsta nivå, mörkad av vy, medan mätaren räknar vidare ned till 10⁻¹⁰.
 */
const HUD_MIN = -10;

/** Exponenten för ett steg ur fältet skala ("7" eller "7,7,4"). NaN = ingen skala. */
export function skalaFor(value: string, step: number): number {
  const parts = value.split(",").map(part => part.trim().replace("−", "-")).filter(Boolean);
  if (!parts.length) return Number.NaN;
  const n = Number(parts[Math.min(step, parts.length - 1)]);
  return Number.isFinite(n) ? Math.min(MAX_P, Math.max(HUD_MIN, n)) : Number.NaN;
}

/** Slöjan över världen: full (bilden syns), dov (affischer), mork (läsytor). */
export const VEIL: Record<string, number> = { full: .06, dov: .52, mork: .9 };
export function veilFor(value: string, step: number, fallback: number): number {
  const parts = value.split(",").map(part => part.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return fallback;
  const pick = parts[Math.min(step, parts.length - 1)];
  const n = Number(pick.replace(",", "."));
  return VEIL[pick] ?? (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);
}

/**
 * Kameran inom en nivå (fältet kamera, rörelsepasset 1 oktober): förskjutning och
 * skala kring jordens mitt i planetbilden (1155, 450 på 1600 × 900). Kameran glider
 * dit mellan slides, tillsammans med zoomen.
 * - nara: jorden större och närmare.
 * - fjarran: jorden liten och långt bort.
 * - horisont: jordens kant som en horisont längst ned, toppen på y 640 (radien 344 px gånger två).
 */
export const KAMERA: Record<string, { x: number; y: number; s: number }> = {
  "": { x: 0, y: 0, s: 1 },
  nara: { x: -90, y: 0, s: 1.4 },
  fjarran: { x: -40, y: 0, s: .62 },
  horisont: { x: -355, y: 878, s: 2 },
};
/**
 * Platsen i skalmätaren för ett steg (fältet plats). En plats gäller alla steg; skilj med | för en per steg
 * (skalstegen 2 oktober: "||||||En människa"). Ett tomt steg visar nivåns egen etikett.
 */
export function platsFor(value: string, step: number): string {
  const parts = value.split("|").map(part => part.trim());
  return parts[Math.min(step, parts.length - 1)] ?? "";
}

export function kameraFor(value: string, step: number): string {
  const parts = value.split(",").map(part => part.trim().toLowerCase());
  const pick = parts[Math.min(step, parts.length - 1)] ?? "";
  return pick in KAMERA ? pick : "";
}
const camTransform = (cam: { x: number; y: number; s: number }) => `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(4)})`;

/**
 * Förgrundens riktning i ett zoomdeck utan uttryckligt `resa`: in när kameran zoomar
 * in (exponenten minskar), ut när den zoomar ut, annars ingen (spelarens vanliga).
 */
export function zoomMove(from: number, to: number): "in" | "ut" | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return to < from - .01 ? "in" : to > from + .01 ? "ut" : null;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const labelAt = (p: number) => SKALA_LEVELS.find(level => level.p === p)?.label ?? "";
export const EXPONENT = (n: number) => String(n).replace("-", "−");

/**
 * Var nivåerna står vid exponenten z. Referensnivån R = ⌈z⌉ fyller bildytan eller
 * mer (skala 1–10) och zoomar kring den fasta punkt som landar exakt på nästa
 * nivås ruta: P = (fokus − 0,05) / 0,9. Varje nivå inåt sitter i den yttres
 * fokusruta, en tiondel så stor. Vid heltal står nivån på (0, 0) i skala 1.
 */
export function placeLevels(z: number) {
  const top = Math.max(MIN_P, Math.min(MAX_P, Math.ceil(z - 1e-9)));
  const start = SKALA_LEVELS.findIndex(level => level.p === top);
  const placed: { level: SkalaLevel; r: number; x: number; y: number }[] = [];
  let r = 10 ** (top - z);
  const origin = SKALA_LEVELS[start].focus.map(f => (f - .05) / .9);
  let x = origin[0] * (1 - r), y = origin[1] * (1 - r);
  for (let i = start; i < SKALA_LEVELS.length && r > .085; i++) {
    const level = SKALA_LEVELS[i];
    placed.push({ level, r, x, y });
    x += (level.focus[0] - .05) * r;
    y += (level.focus[1] - .05) * r;
    r /= 10;
  }
  return placed;
}

/**
 * Själva zoomen vid exponenten z. Den nivå som fyller bildytan ritas i skala
 * 1–10; nästa inåt sitter i dess fokusruta, dold i vila och tonar in medan den
 * växer. Ramen markerar nästa nivå, som i filmen.
 */
export function SkalaSky({ z, veil, label, hud, still, moving = false, cam = KAMERA[""], dawn = 0, gl = false }: { z: number; veil: number; label: string; hud: "liten" | "stor"; still: boolean; moving?: boolean; cam?: { x: number; y: number; s: number }; dawn?: number; gl?: boolean }) {
  const sky = useRef<HTMLDivElement>(null);
  const tone = useTone(sky);
  const here = Math.round(z);
  // Under världens minsta nivå står bilden kvar och bara mätaren räknar vidare.
  const levels = placeLevels(Math.max(z, MIN_P));
  // Ramen: nästa nivå inåt. Den växer ut mot kanterna under zoomen och tonar bort.
  const next = levels[1];
  // När kameran lämnar grundläget tonar ramen bort, eftersom nästa nivå då inte är i fokus.
  const frameOpacity = next ? (1 - smooth(.55, .95, next.r)) * (1 - smooth(.2, .5, veil)) * Math.max(0, 1 - Math.abs(cam.s - 1) * 4) : 0;
  const marker = Math.min(1, (MAX_P - z) / (MAX_P - MIN_P));
  const camera = { transform: camTransform(cam) };
  // Planeten i WebGL (planet-gl.tsx) får nivå 10⁷:s placering, när den syns.
  const planet = levels.find(({ level }) => level.p === MAX_P);
  return <div ref={sky} className={k.sky} data-tone={tone} data-still={still} data-moving={moving || undefined} data-hud={hud}
    style={{ "--veil": veil, "--big": hud === "stor" ? 1 : 0, "--dawn": dawn } as CSSProperties} aria-hidden="true">
    {gl && <PlanetGL place={planet ? { x: planet.x * 1600, y: planet.y * 900, r: planet.r } : null} cam={cam} dawn={dawn} still={still} light={tone === "light"} />}
    {/* Kameran (fältet kamera) flyttar bilderna inom nivån; slöjan, mätaren och kornet står still. */}
    <div className={k.cam} data-layer="bild" style={camera}>
      {levels.map(({ level, r, x, y }, i) => {
        const innerLevel = i > 0 && r < 1;
        const opacity = innerLevel ? smooth(.1, .34, r) : 1;
        const feather = innerLevel ? 12 * (1 - smooth(.62, 1, r)) : 0;
        return <div key={level.p} className={k.level} data-inner={innerLevel} data-p={level.p}
          style={{ transform: `translate(${(x * 1600).toFixed(2)}px, ${(y * 900).toFixed(2)}px) scale(${r.toFixed(5)})`, opacity, "--feather": `${feather.toFixed(2)}%` } as CSSProperties}>
          <img src={level.src} alt="" draggable={false} decoding="async" />
        </div>;
      })}
    </div>
    <div className={k.veil} />
    <div className={k.cam} style={camera}>
      {next && frameOpacity > .01 && <div className={k.frame} style={{ left: next.x * 1600, top: next.y * 900, width: 1600 * next.r, height: 900 * next.r, opacity: frameOpacity } as CSSProperties}>
        <i /><i /><i /><i />
        <span className={k.frameLabel}>10<sup>{EXPONENT(next.level.p)}</sup> m</span>
      </div>}
      {/* Gryningen (fältet dygn): solen går upp bakom jordens kant, ovanpå slöjan. Bara på planeten. */}
      {here === MAX_P && <div className={k.dawn}><i /><i /><i /></div>}
    </div>
    <div className={s.grain} />
    <div className={k.vignette} />
    <div className={k.hudScrim} />
    <div className={k.hud}>
      <p className={k.hudTop}>
        <span className={k.hudPow}>10<sup>{EXPONENT(here)}</sup><small>m</small></span>
        <span className={k.hudPlace}>{(Math.abs(z - here) < .25 && label) || labelAt(here)}</span>
      </p>
      <div className={k.ruler}>
        {SKALA_LEVELS.map((level, i) => <i key={level.p} data-stop={Boolean(level.label)} style={{ "--x": i / (SKALA_LEVELS.length - 1) } as CSSProperties} />)}
        <b style={{ "--m": marker } as CSSProperties} />
      </div>
    </div>
  </div>;
}

/**
 * Spelarens skalvärld: ritas en gång bakom slidebytet och glider till den
 * exponent som scenen rapporterar. En tiopotens tar ungefär en halv sekund,
 * och hela resan från planeten till duken knappt fyra.
 */
export function SkalaWorld({ store }: { store: WorldStore }) {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const reduce = useReducedMotion() ?? false;
  const target = state.skala;
  const camKey = state.kamera in KAMERA ? state.kamera : "";
  const jump = state.instant || reduce;
  // Kamerans läge sätts bara i animationens bildrutor; vid hopp läses målet direkt.
  const [anim, setAnim] = useState({ z: target, cam: KAMERA[camKey], moving: false });
  const current = useRef({ z: target, cam: KAMERA[camKey] });
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const from = current.current;
    const toCam = KAMERA[camKey];
    const camMoves = Math.abs(from.cam.x - toCam.x) + Math.abs(from.cam.y - toCam.y) + Math.abs(from.cam.s - toCam.s) * 100 > .5;
    let frame = 0;
    // Första rapporten, bakåt, R och reducerad rörelse: direkt.
    if (!Number.isFinite(from.z) || jump || (Math.abs(target - from.z) < 1e-3 && !camMoves)) {
      current.current = { z: target, cam: toCam };
      frame = requestAnimationFrame(() => setAnim({ z: target, cam: toCam, moving: false }));
      return () => cancelAnimationFrame(frame);
    }
    const distance = target - from.z;
    // Zoomen tar 0,65 s plus 0,48 s per tiopotens (högst 4,2 s); en kameraflytt inom nivån 1,8 s.
    const duration = Math.max(Math.abs(distance) > 1e-3 ? Math.min(4200, 650 + 480 * Math.abs(distance)) : 0, camMoves ? 1800 : 0);
    const start = performance.now();
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const cam = { x: lerp(from.cam.x, toCam.x, eased), y: lerp(from.cam.y, toCam.y, eased), s: lerp(from.cam.s, toCam.s, eased) };
      current.current = { z: from.z + distance * eased, cam };
      setAnim({ z: current.current.z, cam, moving: t < 1 });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, camKey, jump]);
  // Förladda nivåerna, så att zoomen aldrig väntar på en bild.
  useEffect(() => { SKALA_LEVELS.forEach(level => { const img = new Image(); img.src = level.src; }); }, []);
  const z = jump ? target : anim.z;
  const cam = jump ? KAMERA[camKey] : anim.cam;
  const moving = !jump && anim.moving;
  if (!Number.isFinite(z)) return null;
  return <div className={s.world} aria-hidden="true" data-skala-world="">
    <div className={s.viewport}>
      <section className={s.canvas} data-still={jump}>
        <SkalaSky z={z} veil={state.veil} label={state.skalaLabel} hud={state.hud} still={jump} moving={moving} cam={cam} dawn={state.dawn} gl />
      </section>
    </div>
  </div>;
}

/**
 * Scenens del: rapportera exponent, slöja, plats och mätare till världen. Utan
 * värld (R, /scen, miniatyrer) ritar scenen sin nivå själv, stilla.
 */
export function Skala({ z, veil, label, hud, kamera = "", dawn = 0 }: { z: number; veil: number; label: string; hud: "liten" | "stor"; kamera?: string; dawn?: number }) {
  const world = useContext(WorldContext);
  const single = useSingleScene();
  useLayoutEffect(() => { world?.report({ skala: z, veil, skalaLabel: label, hud, kamera }); }, [world, z, veil, label, hud, kamera]);
  if (world) return null;
  return <SkalaSky z={z} veil={veil} label={label} hud={hud} still cam={KAMERA[kamera] ?? KAMERA[""]} dawn={dawn} gl={single} />;
}

const subscribeNever = () => () => {};
/**
 * Klotet i WebGL ritas i spelarens värld och på /scen (en slide i taget, som granskningens ramar), men
 * inte i miniatyrer och editorn, där många slides står samtidigt och var och en skulle ta en WebGL-kontext.
 */
function useSingleScene() {
  return useSyncExternalStore(subscribeNever, () => window.location.pathname.endsWith("/scen"), () => false);
}

/**
 * Inträdet genom portalen (fältet inkomst="portal", rörelsepasset): sliden öppnas
 * ur bryggans portal. Ett fönster med nivåns bild växer från portalens ruta
 * (192 × 108 kring 1110, 410) till hela bilden, med Eames-hörnen, och tonar sedan
 * bort mot världen, som redan står på samma nivå under bryggan. Bara framåt;
 * stilla lägen visar sliden direkt.
 */
export function PortalIn({ z }: { z: number }) {
  const level = SKALA_LEVELS.find(item => item.p === Math.round(z));
  return <div className={k.portalIn} aria-hidden="true">
    {level && <img src={level.src} alt="" draggable={false} />}
    <i /><i /><i /><i />
  </div>;
}

/* ------------------------------------------------------------ zoom */

/**
 * Formen zoom: ett kapitel i tiopotenserna. Världen syns (vy full), skalmätaren
 * växer till kapitelrubrik och ramen visar nästa nivå. Scenen själv bär bara en
 * kort rad och en bildtext; resten är zoomen.
 */
export function Zoom({ t, edit }: FormProps) {
  return <div className={k.zoom}>
    <div className={k.zoomScrim} aria-hidden="true" />
    <header className={k.zoomHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2 className={k.zoomTitle}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
      {t("caption") && <p className={k.zoomCaption}>{edit("caption", <RichLines text={t("caption")} />)}</p>}
    </header>
  </div>;
}
