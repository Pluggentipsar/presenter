"use client";

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { RichLines, seeded } from "./kit";
import { Kicker, type FormProps } from "./forms";
import { MAX_WEEK } from "./stage-forms";
import s from "./stage.module.css";
import r from "./rektor.module.css";

const list = (value: string) => value.split("|").map(part => part.trim()).filter(Boolean);
const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1);
const px = (value: number) => `${Math.round(value)}px`;

/* ------------------------------------------- frågan → ljus på vattnet */

/** Tre rader ut från horisonten: närmast horisonten flest svar och minst text. */
const LANTERN_ROWS = [
  { dy: 86, size: 24, max: 5 },
  { dy: 196, size: 29, max: 4 },
  { dy: 314, size: 35, max: 3 },
];

type Lantern = { text: string; x: number; y: number; size: number; width: number; row: number; order: number };

function placeLanterns(answers: string[], horizonY: number): Lantern[] {
  // Ljusen tänds i en spridd ordning, inte från vänster till höger.
  const order = answers.map((_, i) => i).sort((a, b) => seeded(a + 71) - seeded(b + 71));
  const rank = new Map(order.map((index, i) => [index, i]));
  const placed: Lantern[] = [];
  let next = 0;
  LANTERN_ROWS.forEach((row, rowIndex) => {
    const inRow = answers.slice(next, next + row.max);
    const slot = 1240 / Math.max(1, inRow.length);
    inRow.forEach((text, j) => {
      const i = next + j;
      const shift = rowIndex % 2 ? slot * .14 : -slot * .1;
      const x = 180 + slot * (j + .5) + shift + (seeded(i + 11) - .5) * slot * .12;
      placed.push({ text, x: Math.min(1420, Math.max(180, x)), y: horizonY + row.dy + (seeded(i + 23) - .5) * 14, size: row.size, width: slot * .86, row: rowIndex, order: rank.get(i) ?? i });
    });
    next += inRow.length;
  });
  // Fler svar än raderna rymmer blir ljus utan text, utspridda över vattnet.
  answers.slice(next).forEach((_, j) => {
    const i = next + j;
    placed.push({ text: "", x: 110 + seeded(i + 5) * 1380, y: horizonY + 30 + seeded(i + 9) * (850 - horizonY), size: 18, width: 0, row: 3, order: rank.get(i) ?? i });
  });
  return placed;
}

export function Lyktor({ t, edit, step, still, horizonY, lightX }: FormProps) {
  const answers = list(t("answers"));
  const lanterns = placeLanterns(answers, horizonY);
  const lit = step >= 1;
  const gathered = step >= 2 && Boolean(t("title"));
  return <div className={r.lyktor} data-still={still} data-gathered={gathered} style={{ "--hy": px(horizonY), "--lx": px(lightX) } as CSSProperties}>
    <div className={r.lyHead} data-lifted={lit} data-gone={gathered} aria-hidden={gathered}>
      <Kicker t={t} edit={edit} className={r.lyKicker} />
      <h2 className={r.lyQuestion}>{edit("question", <RichLines text={t("question")} />)}</h2>
      {t("hint") && <p className={`${r.lyHint} ${s.reveal}`} data-on={!lit} aria-hidden={lit}>{edit("hint", <RichLines text={t("hint")} />)}</p>}
    </div>
    {t("answersLabel") && <p className={`${r.lyLabel} ${s.reveal}`} data-on={lit && !gathered} aria-hidden={!lit || gathered}>{edit("answersLabel")}</p>}
    <i className={r.lySun} data-on={gathered} aria-hidden="true" />
    {edit("answers", <div className={r.lyField} aria-label={answers.join(", ")} aria-hidden={!lit || gathered}>
      {lanterns.map((lantern, i) => <span key={i} className={r.lantern} data-on={lit} data-row={lantern.row} aria-hidden="true"
        style={{ "--x": px(lantern.x), "--y": px(lantern.y), "--size": px(lantern.size), "--w": px(lantern.width), "--o": lantern.order,
          "--tx": px(lightX - lantern.x), "--ty": px(horizonY - lantern.y) } as CSSProperties}>
        {lantern.text && <span className={r.lanternText}>{lantern.text}</span>}
        <i className={r.lanternLight} />
        <i className={r.lanternGlint} />
      </span>)}
    </div>)}
    {t("title") && <div className={r.lyStatement}>
      <h2 className={s.reveal} data-on={gathered} aria-hidden={!gathered}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>
      {t("after") && <p className={`${r.lyAfter} ${s.reveal}`} data-on={gathered} aria-hidden={!gathered}>{edit("after", <RichLines text={t("after")} />)}</p>}
    </div>}
  </div>;
}

/* --------------------------------------------------------------- veckan */

type Role = "at" | "med" | "mot" | "keep";
const ROLE_STEP: Record<Exclude<Role, "keep">, number> = { at: 1, med: 2, mot: 3 };
const ROLE_FALLBACK: Record<Exclude<Role, "keep">, string> = { at: "ÅT MIG", med: "MED MIG", mot: "MOT MIG" };

/** åt, ÅT MIG och at betyder samma sak; allt annat stannar hos rektorn. */
function roleOf(value: string): Role {
  const key = value.trim().toLowerCase().replace(/å/g, "a").replace(/\s*mig$/, "");
  return key === "at" || key === "med" || key === "mot" ? key : "keep";
}

function hourOf(value: string) {
  const match = value.match(/(\d{1,2})(?:[.:](\d{2}))?/);
  return match ? Number(match[1]) + Number(match[2] ?? 0) / 60 : NaN;
}

/** Kalendern på 1600 × 900: fem dagkolumner, 08–16. */
const CAL = { left: 156, top: 300, col: 255, gap: 18, hour: 58, card: 104, tile: 143, tileGap: 22 };
const HOURS = [8, 10, 12, 14, 16];

export function Vecka({ t, edit, step, still }: FormProps) {
  const items = range(MAX_WEEK).filter(n => t(`item${n}`)).map(n => ({
    n, day: Math.min(5, Math.max(1, Math.round(Number(t(`day${n}`)) || 1))) - 1, hour: hourOf(t(`time${n}`)), role: roleOf(t(`role${n}`)), result: t(`result${n}`),
  }));
  const phases = ["week", "at", "med", "mot"];
  if (t("keepLabel") || t("keepText")) phases.push("keep");
  if (items.some(item => item.result)) phases.push("results");
  const phase = phases[Math.min(step, phases.length - 1)];

  // Klockslaget ger höjden; krockar skjuts nedåt inom dagen. Resultaten staplas i sin dag.
  const placed = [0, 1, 2, 3, 4].flatMap(day => {
    const inDay = items.filter(item => item.day === day).sort((a, b) => (a.hour || 0) - (b.hour || 0));
    let bottom = 0;
    let tiles = 0;
    return inDay.map(item => {
      const wanted = Number.isFinite(item.hour) ? CAL.top + (item.hour - 8) * CAL.hour : bottom + 10;
      const y = Math.max(wanted, bottom ? bottom + 10 : CAL.top);
      bottom = y + CAL.card;
      return { ...item, x: CAL.left + day * (CAL.col + CAL.gap), y, tile: item.result ? tiles++ : -1 };
    });
  });
  const stacked = Math.max(1, ...[0, 1, 2, 3, 4].map(day => placed.filter(item => item.day === day && item.result).length));
  const galleryTop = CAL.top + 16 + (500 - stacked * CAL.tile - (stacked - 1) * CAL.tileGap) / 2;
  const days = list(t("days"));
  const heads = [
    { key: "week", title: "title", text: "subtitle" },
    { key: "at", title: "atLabel", text: "atText" },
    { key: "med", title: "medLabel", text: "medText" },
    { key: "mot", title: "motLabel", text: "motText" },
    { key: "keep", title: "keepLabel", text: "keepText" },
    { key: "results", title: "resultTitle", text: "resultText" },
  ].filter(head => phases.includes(head.key));
  const results = phase === "results";

  return <div className={r.vecka} data-still={still} data-phase={phase}>
    <div className={r.weekHead}>
      <Kicker t={t} edit={edit} />
      {heads.map(head => <div key={head.key} className={`${r.weekLine} ${s.reveal}`} data-on={phase === head.key} data-role={head.key} aria-hidden={phase !== head.key}>
        <h2>{edit(head.title, <RichLines text={t(head.title) || ROLE_FALLBACK[head.key as keyof typeof ROLE_FALLBACK] || ""} />)}</h2>
        {t(head.text) && <p>{edit(head.text, <RichLines text={t(head.text)} />)}</p>}
      </div>)}
    </div>
    <ol className={r.legend} aria-label="Rollerna">
      {(["at", "med", "mot"] as const).map(role => <li key={role} className={s.reveal} data-role={role} data-on={step >= ROLE_STEP[role]} aria-hidden={step < ROLE_STEP[role]}>
        <i />{t(`${role}Label`) || ROLE_FALLBACK[role]}
      </li>)}
    </ol>
    <div className={r.calendar} data-results={results} aria-hidden="true" />
    {days.slice(0, 5).map((day, i) => <p key={i} className={r.dayHead} style={{ "--x": px(CAL.left + i * (CAL.col + CAL.gap)) } as CSSProperties}>{i === 0 ? edit("days", <>{day}</>) : day}</p>)}
    {HOURS.map(hour => <div key={hour} className={r.hourLine} data-results={results} style={{ "--y": px(CAL.top + (hour - 8) * CAL.hour) } as CSSProperties} aria-hidden="true">
      <span>{String(hour).padStart(2, "0")}</span>
    </div>)}
    {/* Svepet startar om per roll; stilla (bakåt, R, reducerad rörelse) döljer det i CSS, så att server och klient ritar samma sak. */}
    {(phase === "at" || phase === "med" || phase === "mot") && <i key={phase} className={r.sweep} data-role={phase} aria-hidden="true" />}
    <section className={r.cards} aria-label="Veckans uppgifter">
      {placed.map(item => {
        const lit = item.role !== "keep" && step >= ROLE_STEP[item.role];
        const flip = results && Boolean(item.result);
        const gone = results && !item.result;
        const label = t(`resultLabel${item.n}`);
        return <article key={item.n} className={r.card} data-role={item.role} data-lit={lit} data-now={phase === item.role} data-dim={phase === "keep" && item.role !== "keep"}
          data-keep={phase === "keep" && item.role === "keep"} data-flip={flip} data-gone={gone} aria-hidden={gone}
          style={{ "--x": px(item.x), "--y": px(item.y), "--gy": px(galleryTop + Math.max(0, item.tile) * (CAL.tile + CAL.tileGap)), "--d": item.day, "--k": item.day * 2 + Math.max(0, item.tile) } as CSSProperties}>
          <div className={r.cardInner}>
            <div className={r.cardFront}>
              <time>{edit(`time${item.n}`)}</time>
              <p>{edit(`item${item.n}`, <RichLines text={t(`item${item.n}`)} />)}</p>
              {item.role === "keep" ? <i className={r.cardLight} /> : <span className={r.cardTag}>{t(`${item.role}Label`) || ROLE_FALLBACK[item.role]}</span>}
            </div>
            {item.result && <figure className={r.cardBack}>
              <img src={item.result} alt={label || t(`item${item.n}`)} />
              {label && <figcaption>{edit(`resultLabel${item.n}`)}</figcaption>}
            </figure>}
          </div>
        </article>;
      })}
    </section>
  </div>;
}

/* ------------------------------------------ två stränder · JAG → AI → JAG */

export function Strander({ t, edit, step, still, horizonY }: FormProps) {
  const h = horizonY;
  const final = Boolean(t("title")) && step >= 4;
  // Uppgiften färdas från vänstra stranden, över vattnet till den högra.
  const trail = `M 540 ${h + 22} C 630 ${h + 38} 700 ${h + 42} 800 ${h + 42} C 900 ${h + 42} 970 ${h + 38} 1060 ${h + 22}`;
  // Vätterljus ritar västra stranden; den östra är dess spegelbild, så att båda JAG står på land.
  const east = (x: number) => h + 2 - 52 * Math.exp(-(((1600 - x) / 520) ** 2)) - 10 * Math.exp(-(((1300 - x) / 140) ** 2));
  const eastShore = `M 660 ${h + 1} ${Array.from({ length: 37 }, (_, i) => { const x = 660 + i * 26; return `L ${x} ${Math.min(h, east(x)).toFixed(1)}`; }).join(" ")} L 1600 ${h + 1} Z`;
  const eastLights = Array.from({ length: 14 }, (_, i) => {
    const x = 1000 + seeded(i + 400) * 580;
    const top = Math.min(h - 2, east(x) + 3);
    return { x: x.toFixed(1), y: (top + seeded(i + 440) * (h - 1 - top)).toFixed(1), r: (.7 + seeded(i + 480) * 1.2).toFixed(2), o: (.4 + seeded(i + 520) * .6).toFixed(2) };
  });
  const at = step <= 1 ? 0 : step === 2 ? 1 : 2;
  const words = [
    { key: "left", x: 320, shore: true, active: step === 0 || step === 1 || final },
    { key: "mid", x: 800, shore: false, active: step === 0 || step === 2 },
    { key: "right", x: 1280, shore: true, active: step === 0 || step === 3 || final },
  ];
  const columns = [
    { side: "left", x: 320, label: "leftLabel", text: "leftText", from: 1, dot: s.humanDot },
    { side: "mid", x: 800, label: "midLabel", text: "midText", from: 2, dot: s.aiDot },
    { side: "right", x: 1280, label: "rightLabel", text: "rightText", from: 3, dot: s.humanDot },
  ];
  const waves = Array.from({ length: 7 }, (_, i) => {
    const y = h + 150 + i * 24;
    const half = 250 + i * 34;
    return { d: `M ${800 - half} ${y} C ${800 - half * .5} ${y - 7} ${800 - half * .2} ${y + 7} 800 ${y} S ${800 + half * .6} ${y - 7} ${800 + half} ${y}`, o: (.62 - i * .07).toFixed(2) };
  });
  return <div className={r.strander} data-still={still} data-ai={step === 2 ? "on" : step > 2 ? "after" : "off"} style={{ "--hy": px(h) } as CSSProperties}>
    <Kicker t={t} edit={edit} className={r.stKicker} />
    <svg className={r.stShore} viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
      <path d={eastShore} />
      <g>{eastLights.map((light, i) => <circle key={i} cx={light.x} cy={light.y} r={light.r} opacity={light.o} style={{ animationDelay: `${-i * .7}s` }} />)}</g>
    </svg>
    <svg className={r.stWaves} viewBox="0 0 1600 900" aria-hidden="true">
      {waves.map((wave, i) => <path key={i} d={wave.d} style={{ "--wo": wave.o, animationDelay: `${-i * .8}s` } as CSSProperties} />)}
    </svg>
    {[320, 1280].map(x => <i key={x} className={r.stGlow} data-on={final} style={{ "--x": px(x) } as CSSProperties} aria-hidden="true" />)}
    {words.map((word, i) => <div key={word.key}>
      <p className={r.stWord} data-shore={word.shore} data-active={word.active} data-glow={final && word.shore} style={{ "--x": px(word.x), "--i": i } as CSSProperties}>{edit(word.key)}</p>
      <p className={r.stEcho} data-shore={word.shore} data-active={word.active} style={{ "--x": px(word.x), "--i": i } as CSSProperties} aria-hidden="true">{t(word.key)}</p>
    </div>)}
    <svg className={r.stTrail} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={r.stGuide} d={trail} />
      <path className={r.stLit} d={trail} pathLength={1} data-at={at} />
    </svg>
    <div className={r.stPaper} data-on={step >= 1} data-at={at} style={{ offsetPath: `path("${trail}")` }} aria-hidden="true">
      <i className={`${r.stGhost} ${r.stGhostA}`} />
      <i className={`${r.stGhost} ${r.stGhostB}`} />
      <div className={r.stSheet}>
        <b data-kind="human" /><b data-kind="human" style={{ width: "62%" }} />
        {[0, 1, 2, 3].map(i => <b key={i} data-kind="ai" style={{ "--i": i, width: `${[100, 88, 94, 70][i]}%` } as CSSProperties} />)}
      </div>
      <span className={r.stCheck}><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg></span>
    </div>
    {columns.map(column => <div key={column.side} className={`${r.stCol} ${s.reveal}`} data-side={column.side} data-on={step >= column.from && !final} aria-hidden={step < column.from || final}
      style={{ "--x": px(column.x) } as CSSProperties}>
      <small><i className={column.dot} />{edit(column.label)}</small>
      <p>{edit(column.text, <RichLines text={t(column.text)} />)}</p>
    </div>)}
    {t("title") && <div className={r.stTitle}>
      <h2 className={s.reveal} data-on={final} aria-hidden={!final}>{edit("title", <RichLines text={t("title")} emphasis={final ? t("emphasis") : ""} />)}</h2>
      {t("after") && <p className={`${r.stAfter} ${s.reveal}`} data-on={final} aria-hidden={!final}>{edit("after", <RichLines text={t("after")} />)}</p>}
    </div>}
  </div>;
}
