"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { RichLines } from "./kit";
import { Kicker, type FormProps } from "./forms";
import { clamp, ease, useStepClock } from "./sim";
import { MAX_AGENTS } from "./stage-forms";
import s from "./stage.module.css";
import d from "./duken.module.css";

/*
 * Duken (visualiseringsprovet 1 oktober 2026): sex agenter bygger affischen på riktigt, var och en med
 * sin markör, och en logg visar vem som gör vad. Förloppet räknas fram ur tiden sedan läget började
 * (useStepClock), så att stilla lägen, bakåt och R visar det färdiga resultatet direkt.
 * Illustration, inspirerad av Doop. Koordinater i arbetsytan (board): 1408 × 590, under appens list.
 *
 * Läge 0: den tomma affischen. Läge 1: agenterna bygger (cirka sex sekunder). Läge 2: din kommentar.
 * Läge 3: agenterna svarar och gör om: ny rubrik, mer luft och tre varianter (prompt före svar, så
 * kommentaren och svaret har var sitt klick). Läge 4: din markör ensam och frågan.
 */

const POSTER = { x: 470, y: 46, w: 360, h: 509 };
type Point = { t: number; x: number; y: number };

/**
 * Markörernas vägar under bygget (sekunder, arbetsytans koordinater), en per roll i fältordningen.
 * Koreografin håller namnlapparna isär: ingen lapp täcker en annan lapp eller markör under bygget,
 * kommentaren eller omtaget, och de vilande lapparna står inte över tråden, flödet eller varianterna
 * till höger (x ≥ 900). Markörerna börjar ovanför eller utanför appen (y −110 döljer även lappen).
 * Den som ändrar en väg kontrollerar det igen, till exempel med stickprov via ?simtid=
 * (visualiseringspasset 1 oktober 2026).
 */
const BUILD_PATHS: Point[][] = [
  // Generalist: rutnätet längs överkanten och en bit ned längs högerkanten, vilar sedan vid vänsterkanten nedtill.
  [{ t: 0, x: 160, y: -110 }, { t: .6, x: 480, y: 52 }, { t: 1.2, x: 836, y: 52 }, { t: 1.6, x: 846, y: 180 }, { t: 2.5, x: 440, y: 450 }],
  // UX-lead: flödet till höger, ruta för ruta.
  [{ t: 0, x: 1500, y: 120 }, { t: .9, x: 920, y: 300 }, { t: 1.6, x: 1040, y: 300 }, { t: 2.3, x: 1160, y: 300 }, { t: 3, x: 1290, y: 360 }],
  // Copywriter: kommer när generalisten har lämnat överkanten. Från 1,2 s följer den skrivmarkören (WRITER nedan).
  [{ t: 0, x: 380, y: -110 }, { t: .7, x: 380, y: -110 }],
  // Varumärkesvakt: färgprover längst ned, sedan cirkeln.
  [{ t: 0, x: 300, y: 700 }, { t: 1.3, x: 500, y: 516 }, { t: 2.1, x: 640, y: 516 }, { t: 2.6, x: 730, y: 380 }],
  // Tillgänglighet: mäter rubrikens kontrast vid märket uppe till höger, kliver upp förbi märket och vilar ovanför rubriken.
  [{ t: 0, x: 1100, y: -110 }, { t: 2.1, x: 1100, y: -110 }, { t: 2.9, x: 816, y: 62 }, { t: 3.5, x: 816, y: 62 }, { t: 3.8, x: 816, y: -8 }, { t: 4.3, x: 560, y: 6 }],
  // Finputs: tar markeringens hörn och stramar upp spärrningen längs rubrikens underkant, vilar sedan i affischens tomma yta.
  [{ t: 0, x: 1500, y: 600 }, { t: 2.4, x: 1460, y: 560 }, { t: 3.7, x: 782, y: 194 }, { t: 4.6, x: 700, y: 206 }, { t: 5, x: 600, y: 212 }, { t: 5.5, x: 560, y: 300 }],
];
/** När varje roll börjar sitt arbete (loggens tid). */
const STARTS = [.7, 1.1, 1.2, 1.5, 3, 3.8];
/**
 * Svarets förlopp: vilka markörer som rör sig igen (sekunder sedan svaret började). Generalisten drar
 * marginalen inåt från hörnet nere till vänster och UX-leaden ritar varianterna. Copywritern följer
 * skrivmarkören (WRITER).
 */
const REDO_PATHS: Partial<Record<number, Point[]>> = {
  0: [{ t: .6, x: 492, y: 533 }, { t: 1.6, x: 506, y: 519 }],
  1: [{ t: 1.9, x: 960, y: 452 }, { t: 2.4, x: 1080, y: 452 }, { t: 2.9, x: 1290, y: 470 }],
};
/** Copywritern (tredje rollen) skriver rubriken: markören följer skrivmarkören och vilar sedan här. */
const WRITER = { index: 2, rest: { x: 716, y: 262 } };
/** Din markör kommer uppifrån utanför affischens vänsterkant och glider in under rubriken till nålen, förbi de vilande lapparna. */
const YOU_PATH: Point[] = [{ t: 0, x: 420, y: -110 }, { t: .48, x: 416, y: 176 }, { t: .7, x: 512, y: 196 }];

/**
 * Teckenbredd i em för affischens rubrik (Schibsted Grotesk 900), uppmätt för versalerna i rubrikerna
 * och uppskattad för resten. Det räcker: copywriterns lapp börjar en bit till höger om skrivmarkören.
 */
function glyphEm(ch: string) {
  if (ch === " ") return .18;
  if (ch === "I") return .48;
  if ("JLEFT".includes(ch)) return ch === "T" ? .66 : .62;
  if ("MW".includes(ch)) return .96;
  if (ch === "V") return .66;
  if (ch === "?") return .59;
  if (".,:;!'’".includes(ch)) return .3;
  if (ch !== ch.toLowerCase()) return .76;
  if ("ijl".includes(ch)) return .3;
  if ("mw".includes(ch)) return .88;
  if ("frt".includes(ch)) return .42;
  return .6;
}
/**
 * Skrivmarkörens läge när count tecken syns (count får vara ett bråktal): bredden på den aktuella
 * raden i bildpunkter och radens nummer. Vid en radbrytning går markören först ned och sedan åt vänster,
 * så att lappen passerar över den tomma raden i stället för över texten.
 */
function caretAt(text: string, count: number, size: number, track: number) {
  const c = clamp(count, 0, text.length), whole = Math.floor(c), part = c - whole;
  const before = text.slice(0, whole), line = before.split("\n").length - 1;
  const advance = (ch: string) => (glyphEm(ch) + track) * size;
  const x = [...before.slice(before.lastIndexOf("\n") + 1)].reduce((sum, ch) => sum + advance(ch), 0);
  const next = text[whole];
  if (next === "\n") return { x: x * (1 - part * part), line: line + Math.sqrt(part) };
  return { x: next ? x + advance(next) * part : x, line };
}

/** Läget längs en väg vid tiden t, med mjuka övergångar mellan punkterna. */
function along(path: Point[], t: number): { x: number; y: number } {
  if (t <= path[0].t) return path[0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (t <= b.t) { const k = ease((t - a.t) / (b.t - a.t)); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
  }
  return path[path.length - 1];
}
const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);
const clockText = (t: number) => `00:${String(Math.max(0, Math.floor(t))).padStart(2, "0")}`;

/** En text som skrivs fram: radbrytningar räknas som tecken. */
function Typed({ text, count, caret }: { text: string; count: number; caret: boolean }) {
  const shown = text.slice(0, Math.max(0, Math.round(count)));
  const lines = shown.split("\n");
  return <>{lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}{caret && <i className={d.caret} />}</>;
}

type LogEntry = { t: number; who: "ai" | "du"; name: ReactNode; text: ReactNode; key: string };

export function Duken({ t, edit, step, still }: FormProps) {
  const agents = Array.from({ length: MAX_AGENTS }, (_, i) => i + 1).filter(n => t(`agent${n}`));
  const hasComment = Boolean(t("comment"));
  const alone = Boolean(t("question")) && step >= 2 + (hasComment ? 2 : 0);
  const clock = useStepClock(step, still, 9);
  // Sekunder in i bygget (b), kommentaren (c) och svaret (r): -1 = inte börjat, Infinity = klart.
  const b = step < 1 ? -1 : step === 1 ? clock : Infinity;
  const c = !hasComment || step < 2 ? -1 : step === 2 ? clock : Infinity;
  const r = !hasComment || step < 3 ? -1 : step === 3 ? clock : Infinity;
  const done = (k: number) => k === Infinity;

  const title1 = t("artTitle"), title2 = t("artTitle2") || title1;
  // Rubriken: skrivs i bygget; i svaret raderas den och den nya skrivs.
  const typed1 = prog(b, 1.2, 1.5) * title1.length;
  const erased = r < 0 ? 0 : prog(r, .5, .5);
  const typed2 = r < 0 ? 0 : prog(r, 1, 1.2) * title2.length;
  const showSecond = r >= 0 && erased >= 1;
  const headlineDone = showSecond ? typed2 >= title2.length : typed1 >= title1.length && erased === 0;
  const headline = showSecond
    ? (done(r) ? edit("artTitle2", <RichLines text={title2} />) : <Typed text={title2} count={typed2} caret={!headlineDone} />)
    : (done(b) && r < 0 ? edit("artTitle", <RichLines text={title1} />) : <Typed text={title1} count={typed1 * (1 - erased)} caret={b >= 1.2 && !headlineDone} />);
  // Mer luft: marginalen växer från 22 till 36 när generalisten flyttar rutnätet, och rubriken krymper.
  const air = r < 0 ? 0 : ease(prog(r, .7, .9));
  const margin = 22 + air * 14;
  const headSize = 58 - air * 10;
  const grid = prog(b, .7, 1.4);
  const swatches = [0, 1, 2, 3].map(i => ease(prog(b, 1.55 + i * .14, .35)));
  const circle = ease(prog(b, 2.45, .5));
  const chosen = b >= 3.1;
  const measure = prog(b, 3, .4);
  const select = prog(b, 3.8, .3) * (1 - prog(b, 5.2, .4));
  const tight = ease(prog(b, 4, .9));
  const track = -.03 - tight * .02;
  // Copywritern: pilen vilar på det sista skrivna tecknet och lappen börjar strax till höger om
  // skrivmarkören, ett halvt tecken före texten, så att lappen aldrig täcker det som just skrivits.
  const caretPoint = (text: string, count: number) => {
    const { x, line } = caretAt(text, count + .5, headSize, track);
    return { x: POSTER.x + margin + 4 + x + 6 - 24, y: POSTER.y + margin + 14 + line * headSize * .9 + headSize * .3 };
  };
  const writerAt = () => {
    const rest = WRITER.rest;
    let pos = b < 1.2 ? along([...BUILD_PATHS[WRITER.index], { t: 1.2, ...caretPoint(title1, 0) }], Math.max(b, 0))
      : b < 2.7 ? caretPoint(title1, typed1)
      : along([{ t: 2.7, ...caretPoint(title1, title1.length) }, { t: 3.3, ...rest }], b);
    if (r >= 0) pos = r < .5 ? along([{ t: 0, ...rest }, { t: .5, ...caretPoint(title1, title1.length) }], r)
      : r < 1 ? caretPoint(title1, title1.length * (1 - erased))
      : r < 2.2 ? caretPoint(title2, typed2)
      : along([{ t: 2.2, ...caretPoint(title2, title2.length) }, { t: 2.8, ...rest }], r);
    return pos;
  };
  const shine = b >= 4.7 && b < 6 && !done(b) ? prog(b, 4.7, 1.2) : -1;
  const flow = [0, 1, 2].map(i => ease(prog(b, 1.1 + i * .7, .45)));
  const variants = [0, 1, 2].map(i => ease(prog(r, 2 + i * .45, .5)));
  const pin = c >= 0 ? ease(prog(c, .6, .3)) : 0;
  const bubble = c >= 0 ? ease(prog(c, .8, .4)) : 0;
  const reply = r >= 0 ? ease(prog(r, 1.6, .4)) : 0;

  // Loggen: vem som gör vad, i den ordning det händer.
  const log: LogEntry[] = [];
  agents.forEach((n, i) => {
    const start = STARTS[i] ?? 0;
    if (b >= start) log.push({ t: start, who: "ai", key: `a${n}`, name: edit(`agent${n}`), text: edit(`agentDoes${n}`) });
  });
  log.sort((x, y) => x.t - y.t);
  if (hasComment && c >= .8) log.push({ t: 7, who: "du", key: "du", name: t("commentLabel") || "Du", text: <RichLines text={t("comment")} /> });
  if (t("reply") && r >= 1.6) log.push({ t: 9, who: "ai", key: "svar", name: "Agenterna", text: <RichLines text={t("reply")} /> });

  const style = (v: Record<string, string | number>) => v as CSSProperties;
  return <div className={d.duk} data-alone={alone} data-still={still}>
    <header className={d.head}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </header>
    <section className={d.app} aria-label={t("canvasTitle") || "Duken"}>
      <div className={d.bar}>
        <span className={d.dots} aria-hidden="true"><i /><i /><i /></span>
        <span className={d.name}>{edit("canvasTitle")}</span>
        {t("canvasLabel") && <span className={d.label}>{edit("canvasLabel")}</span>}
      </div>
      <div className={d.board}>
        <ol className={d.log} aria-label="Aktivitet">
          {log.slice(-8).map(entry => <li key={entry.key} data-role={entry.who}>
            <time>{clockText(entry.t)}</time>
            <span><b>{entry.name}</b> {entry.text}</span>
          </li>)}
        </ol>

        <div className={d.poster} style={style({ "--m": `${margin}px`, left: POSTER.x, top: POSTER.y, width: POSTER.w, height: POSTER.h })} aria-hidden="true">
          <svg className={d.guides} viewBox={`0 0 ${POSTER.w} ${POSTER.h}`} style={{ opacity: b < 0 ? 0 : 1 }}>
            {/* Marginalerna, sedan tre spaltlinjer: ritas i tur och ordning med rutnätets framsteg. */}
            <rect x={margin} y={margin} width={POSTER.w - margin * 2} height={POSTER.h - margin * 2} pathLength={1} style={{ strokeDashoffset: 1 - clamp(grid * 2) }} />
            {[1, 2, 3].map(k => {
              const x = margin + (POSTER.w - margin * 2) * k / 4;
              return <path key={k} d={`M ${x} ${margin} V ${POSTER.h - margin}`} pathLength={1} style={{ strokeDashoffset: 1 - clamp(grid * 2 - .4 - k * .12) }} />;
            })}
          </svg>
          <div className={d.headline} style={style({ left: margin + 4, top: margin + 14, fontSize: `${headSize}px`, letterSpacing: `${track}em` })}>{headline}</div>
          <i className={d.body} style={style({ left: margin + 4, top: 330 + air * 6, opacity: clamp(grid * 1.4 - .4) })} />
          <i className={d.circle} data-chosen={chosen} style={style({ transform: `scale(${circle})` })} />
          <div className={d.swatches} style={style({ left: margin + 4, bottom: margin + 4 })}>
            {swatches.map((k, i) => <i key={i} style={{ transform: `scale(${k})` }} />)}
          </div>
          {measure > 0 && <div className={d.measure} style={style({ left: margin - 6, top: margin + 4, right: margin - 6, opacity: measure })}>
            <span>AA ✓</span>
          </div>}
          {select > 0 && <div className={d.select} style={style({ left: margin, top: margin + 10, right: margin + 30, opacity: select })}><i /><i /><i /><i /></div>}
          {shine >= 0 && <i className={d.shine} style={style({ "--p": shine })} />}
        </div>

        <div className={d.flow} aria-hidden="true">
          {flow.map((k, i) => <i key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 12}px)` }} />)}
        </div>

        {hasComment && <>
          <i className={d.pin} style={{ transform: `scale(${pin})` }} aria-hidden="true">{(t("commentLabel") || "Du").slice(0, 2)}</i>
          <div className={d.thread} style={{ opacity: bubble, transform: `translateY(${(1 - bubble) * 10}px)` }} aria-hidden={c < .8}>
            <p className={d.human} data-who="du"><small>{t("commentLabel") || "Du"}</small>{edit("comment", <RichLines text={t("comment")} />)}</p>
            {t("reply") && <p className={d.ai} data-who="ai" style={{ opacity: reply }} aria-hidden={r < 1.6}><small>Agenterna</small>{edit("reply", <RichLines text={t("reply")} />)}</p>}
          </div>
          <div className={d.variants} aria-hidden="true">
            {variants.map((k, i) => <div key={i} className={d.variant} data-v={i + 1} style={{ opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>
              <b><RichLines text={title2} /></b><i />
            </div>)}
          </div>
        </>}

        {agents.map((n, i) => {
          const path = BUILD_PATHS[i] ?? BUILD_PATHS[0];
          let pos = i === WRITER.index ? writerAt() : along(path, b < 0 ? 0 : b);
          const again = REDO_PATHS[i];
          if (again && r >= 0) pos = along([{ t: 0, x: pos.x, y: pos.y }, ...again], r);
          const on = b >= 0 && !alone;
          return <span key={n} className={d.cursor} data-on={on} data-idle={done(b) && (r < 0 || done(r)) || undefined}
            style={style({ left: pos.x, top: pos.y, "--i": i })} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 2 L20 11 L12 13 L9 21 Z" /></svg>
            <em>{t(`agent${n}`)}</em>
          </span>;
        })}
        {hasComment && (() => {
          const pos = along(YOU_PATH, c < 0 ? 0 : c);
          return <span className={d.cursor} data-role="du" data-on={c >= 0 && c < 1.4 && !alone} style={style({ left: pos.x, top: pos.y })} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 2 L20 11 L12 13 L9 21 Z" /></svg>
            <em>{t("commentLabel") || "Du"}</em>
          </span>;
        })()}
      </div>
      <span className={d.cursor} data-role="du" data-alone="" data-on={alone} style={style({ left: 704, top: 556 })} aria-hidden={!alone}>
        <svg viewBox="0 0 24 24"><path d="M3 2 L20 11 L12 13 L9 21 Z" /></svg>
        <em>{t("you") ? edit("you") : "Du"}</em>
      </span>
    </section>
    {t("question") && <h2 className={`${d.question} ${s.reveal}`} data-on={alone} aria-hidden={!alone}>{edit("question", <RichLines text={t("question")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}
